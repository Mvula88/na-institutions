import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSMS, isValidSAPhoneNumber } from '@/lib/sms'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting to prevent SMS abuse
    const rateLimitResponse = await rateLimit(request, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 SMS per minute max
      keyPrefix: 'sms-send',
    })
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's center and role
    const { data: userDataRaw } = await supabase
      .from('users')
      .select('center_id, role')
      .eq('id', user.id)
      .single()

    const userData = userDataRaw as { center_id: string | null; role: string } | null

    if (!userData?.center_id) {
      return NextResponse.json({ error: 'No center associated' }, { status: 400 })
    }

    // Only institution_admin and institution_staff can send SMS
    if (!['institution_admin', 'institution_staff', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to send SMS' }, { status: 403 })
    }

    const body = await request.json()
    const { to, message, campaignId, studentId } = body

    if (!to || !message) {
      return NextResponse.json({ error: 'Phone number and message are required' }, { status: 400 })
    }

    // Validate phone number format
    if (!isValidSAPhoneNumber(to)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid South African phone number'
      }, { status: 400 })
    }

    // SECURITY: Verify the phone number belongs to a student/parent in this center
    // This prevents using the SMS endpoint to send to arbitrary numbers
    const normalizedPhone = to.replace(/[\s\-\(\)]/g, '')

    // Check if phone belongs to a student in this center
    const { data: studentMatch } = await supabase
      .from('students')
      .select('id')
      .eq('institution_id', userData.center_id)
      .or(`phone.ilike.%${normalizedPhone.slice(-9)}%,parent_phone.ilike.%${normalizedPhone.slice(-9)}%`)
      .limit(1)
      .maybeSingle()

    // Check if phone belongs to a teacher in this center
    const { data: teacherMatch } = await supabase
      .from('lecturers')
      .select('id')
      .eq('institution_id', userData.center_id)
      .ilike('phone', `%${normalizedPhone.slice(-9)}%`)
      .limit(1)
      .maybeSingle()

    if (!studentMatch && !teacherMatch) {
      return NextResponse.json({
        success: false,
        error: 'Phone number not found in your center\'s records'
      }, { status: 400 })
    }

    // Send SMS
    const result = await sendSMS(to, message)

    // Log the SMS
    await supabase.from('sms_logs').insert({
      center_id: userData.center_id,
      phone_number: to,
      message: message,
      message_type: campaignId ? 'campaign' : 'notification',
      campaign_id: campaignId || null,
      student_id: studentId || null,
      status: result.success ? 'sent' : 'failed',
      message_id: result.messageId || null,
      error_message: result.error || null,
      sent_by: user.id,
    } as never)

    return NextResponse.json(result)
  } catch (error) {
    console.error('SMS API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send SMS'
    }, { status: 500 })
  }
}
