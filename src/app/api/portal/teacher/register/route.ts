import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validatePasswordForAPI } from '@/lib/password-validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

interface RegisterRequest {
  teacherId: string
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting to prevent abuse
    const rateLimitResponse = await rateLimit(request, {
      ...RATE_LIMITS.signup,
      keyPrefix: 'portal-teacher-register',
    })
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body: RegisterRequest = await request.json()
    const { teacherId, email, password } = body

    if (!teacherId || !email || !password) {
      return NextResponse.json(
        { error: 'Teacher ID, email, and password are required' },
        { status: 400 }
      )
    }

    // Use strong password validation (same as main signup)
    const passwordError = validatePasswordForAPI(password)
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 }
      )
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('NEXT_PUBLIC_SUPABASE_URL is not set')
      return NextResponse.json(
        { error: 'Server configuration error (URL)' },
        { status: 500 }
      )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json(
        { error: 'Server configuration error (Service Key). Please contact administrator.' },
        { status: 500 }
      )
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the teacher exists and doesn't already have an auth account
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from('lecturers')
      .select('id, full_name, email, auth_user_id, status, institution_id')
      .eq('id', teacherId)
      .single()

    if (teacherError) {
      console.error('Teacher lookup error:', teacherError)
      return NextResponse.json(
        { error: 'Teacher not found. Please verify your Teacher ID.' },
        { status: 404 }
      )
    }

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher record not found in database' },
        { status: 404 }
      )
    }

    if (teacher.auth_user_id) {
      return NextResponse.json(
        { error: 'This teacher already has an account. Please login instead.' },
        { status: 400 }
      )
    }

    if (teacher.status !== 'active') {
      return NextResponse.json(
        { error: 'Teacher account is not active. Please contact your institution.' },
        { status: 400 }
      )
    }

    // Check if email is already in use by querying the users table
    // This is much more efficient than listUsers() which fetches ALL users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    // Also check teachers table for existing email
    const { data: existingTeacher } = await supabaseAdmin
      .from('lecturers')
      .select('id, auth_user_id')
      .eq('email', email.toLowerCase())
      .neq('id', teacherId) // Exclude the current teacher
      .maybeSingle()

    if (existingUser || (existingTeacher && existingTeacher.auth_user_id)) {
      return NextResponse.json(
        { error: 'This email is already registered. Please use a different email or login.' },
        { status: 400 }
      )
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for now, or set to false to require email verification
      user_metadata: {
        full_name: teacher.full_name,
        role: 'lecturer',
        lecturer_id: teacherId,
        institution_id: teacher.institution_id,
      },
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Link the auth user to the teacher record
    const { error: updateError } = await supabaseAdmin
      .from('lecturers')
      .update({
        auth_user_id: authData.user.id,
        email: email, // Update email if different
      })
      .eq('id', teacherId)

    if (updateError) {
      console.error('Error linking auth user to teacher:', updateError)
      // Try to clean up the created auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to link account. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now login.',
    })
  } catch (error) {
    console.error('Teacher registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
