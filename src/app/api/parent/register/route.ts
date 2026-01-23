import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RegisterRequest {
  authUserId: string
  fullName: string
  email: string
  phone?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()
    const { authUserId, fullName, email, phone } = body

    if (!authUserId || !fullName || !email) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if parent already exists with this email
    const { data: existingParentData } = await supabase
      .from('parents')
      .select('id')
      .eq('email', email)
      .single()

    const existingParent = existingParentData as { id: string } | null
    if (existingParent) {
      // Link the auth user to existing parent account
      await supabase
        .from('parents')
        .update({ auth_user_id: authUserId } as never)
        .eq('id', existingParent.id)

      return NextResponse.json({
        success: true,
        parentId: existingParent.id,
        message: 'Existing account linked'
      })
    }

    // Create new parent record
    const { data: newParentData, error: insertError } = await supabase
      .from('parents')
      .insert({
        auth_user_id: authUserId,
        full_name: fullName,
        email: email,
        phone: phone || null,
        notification_attendance: 'daily',
        notification_grades: true,
        notification_fees: true,
        notification_sms: true,
        notification_email: true,
        is_active: true,
        email_verified: false,
      } as never)
      .select('id')
      .single()

    const newParent = newParentData as { id: string } | null
    if (insertError || !newParent) {
      console.error('Error creating parent:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create parent account'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      parentId: newParent.id,
      message: 'Parent account created successfully'
    })

  } catch (error) {
    console.error('Parent registration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Registration failed'
    }, { status: 500 })
  }
}
