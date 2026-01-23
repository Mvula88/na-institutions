import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireInstitutionAdmin, verifyInstitutionAccess } from '@/lib/api-auth'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Lazy initialization of service role client
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(request, {
      ...RATE_LIMITS.api,
      maxRequests: 20, // 20 reversals per minute max
      keyPrefix: 'payment-reverse',
    })
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Require authentication - must be institution_admin or super_admin
    const authResult = await requireInstitutionAdmin(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user: authenticatedUser } = authResult

    const body = await request.json()
    const { payment_id, reason } = body

    if (!payment_id) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Reversal reason is required' },
        { status: 400 }
      )
    }

    // Use authenticated user ID instead of trusting client-provided value
    const reversed_by = authenticatedUser.id

    // Get the original payment
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select(`
        *,
        student:students(id, full_name, student_number),
        payment_allocations(id, fee_id, amount)
      `)
      .eq('id', payment_id)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this institution's payment
    if (!verifyInstitutionAccess(authenticatedUser, payment.institution_id)) {
      return NextResponse.json(
        { error: 'You do not have access to this payment' },
        { status: 403 }
      )
    }

    // Check if payment is already reversed
    if (payment.status === 'reversed') {
      return NextResponse.json(
        { error: 'Payment has already been reversed' },
        { status: 400 }
      )
    }

    // Start transaction-like operations
    // 1. Update the original payment status to 'reversed'
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'reversed',
        notes: `${payment.notes || ''}\n\n[REVERSED] ${new Date().toISOString()}: ${reason}`.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment_id)

    if (updateError) {
      console.error('Failed to update payment status:', updateError)
      return NextResponse.json(
        { error: 'Failed to reverse payment' },
        { status: 500 }
      )
    }

    // 2. Reverse the fee allocations - update fee paid amounts
    const allocations = payment.payment_allocations || []
    for (const allocation of allocations) {
      // Get current fee
      const { data: fee } = await supabase
        .from('student_fees')
        .select('id, amount_paid')
        .eq('id', allocation.fee_id)
        .single()

      if (fee) {
        // Reduce the amount_paid by the allocation amount
        const newAmountPaid = Math.max(0, (fee.amount_paid || 0) - allocation.amount)

        // Determine new status based on amount paid
        let newStatus = 'unpaid'
        const { data: feeDetails } = await supabase
          .from('student_fees')
          .select('amount')
          .eq('id', fee.id)
          .single()

        if (feeDetails && newAmountPaid > 0) {
          newStatus = newAmountPaid >= feeDetails.amount ? 'paid' : 'partial'
        }

        await supabase
          .from('student_fees')
          .update({
            amount_paid: newAmountPaid,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', allocation.fee_id)
      }
    }

    // 3. Create a reversal record for audit trail
    const { data: reversal, error: reversalError } = await supabase
      .from('payment_reversals')
      .insert({
        original_payment_id: payment_id,
        institution_id: payment.institution_id,
        student_id: payment.student_id,
        amount: payment.amount,
        reason,
        reversed_by,
        reversed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (reversalError) {
      // The reversal record table might not exist, but the reversal still happened
      console.warn('Could not create reversal record (table may not exist):', reversalError)
    }

    return NextResponse.json({
      success: true,
      message: 'Payment reversed successfully',
      payment_id,
      reversal_id: reversal?.id,
    })
  } catch (error) {
    console.error('Payment reversal error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
