import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validatePasswordForAPI } from '@/lib/password-validation'
import { sanitizeText, sanitizeEmail } from '@/lib/sanitize'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Lazy initialization of service role client
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    // Apply rate limiting (5 requests per minute)
    const rateLimitResponse = await rateLimit(request, {
      ...RATE_LIMITS.signup,
      keyPrefix: 'signup',
    })
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    let { institutionName, institutionPhone, institutionCity, institutionType, fullName, email, phone, password, referralCode } = body

    // Support legacy field names for backward compatibility
    institutionName = institutionName || body.centerName
    institutionPhone = institutionPhone || body.centerPhone
    institutionCity = institutionCity || body.centerCity

    // Sanitize text inputs
    institutionName = sanitizeText(institutionName || '')
    institutionCity = sanitizeText(institutionCity || '')
    fullName = sanitizeText(fullName || '')
    email = sanitizeEmail(email || '')

    // Validate required fields
    if (!institutionName || !institutionCity || !fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password with strong policy
    const passwordError = validatePasswordForAPI(password)
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 }
      )
    }

    // Validate Namibian phone number if provided
    if (phone && !/^(\+?264|0)[0-9]{7,9}$/.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid Namibian phone number format' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Generate unique slug
    let slug = generateSlug(institutionName)
    let slugExists = true
    let slugSuffix = 0

    while (slugExists) {
      const checkSlug = slugSuffix === 0 ? slug : `${slug}-${slugSuffix}`
      const { data: existingInstitution } = await supabase
        .from('institutions')
        .select('id')
        .eq('slug', checkSlug)
        .single()

      if (!existingInstitution) {
        slug = checkSlug
        slugExists = false
      } else {
        slugSuffix++
      }
    }

    // Validate referral code if provided (do this first to determine trial length)
    let validReferralCode: { id: string; institution_id: string } | null = null
    if (referralCode) {
      const { data: refCode } = await supabase
        .from('referral_codes')
        .select('id, institution_id, is_active')
        .eq('code', referralCode.toUpperCase())
        .single()

      if (refCode && refCode.is_active) {
        validReferralCode = refCode as { id: string; institution_id: string }
      }
    }

    // Calculate trial end date (28 days if referred, 14 days otherwise)
    const trialDays = validReferralCode ? 28 : 14
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays)

    // Step 1: Create institution with trial status
    const { data: institution, error: institutionError } = await supabase
      .from('institutions')
      .insert({
        name: institutionName,
        slug,
        phone: institutionPhone || null,
        city: institutionCity,
        email: email,
        institution_type: institutionType || 'vtc',
        status: 'active',
        subscription_status: 'trialing',
        subscription_tier: 'trial', // Full access during trial, then user picks a plan
        trial_ends_at: trialEndsAt.toISOString(),
        payment_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Full year for institutions
        default_registration_fee: 500,
        referred_by_code: validReferralCode ? referralCode.toUpperCase() : null,
        level_terminology: 'level', // Default to 'level' for VTCs
      })
      .select()
      .single()

    if (institutionError) {
      console.error('Error creating institution:', {
        message: institutionError.message,
        details: institutionError.details,
        hint: institutionError.hint,
        code: institutionError.code,
        full: institutionError
      })
      return NextResponse.json(
        { error: 'Failed to create institution' },
        { status: 500 }
      )
    }

    // Step 2: Create auth user (auto-confirm for immediate access to trial)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for trial signup - no email verification needed
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError) {
      // Rollback: delete the institution if user creation failed
      await supabase.from('institutions').delete().eq('id', institution.id)

      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Step 3: Create user profile as institution_admin
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
        role: 'institution_admin',
        institution_id: institution.id,
        is_active: true,
      })

    if (userError) {
      // Rollback: delete auth user and institution
      await supabase.auth.admin.deleteUser(authData.user.id)
      await supabase.from('institutions').delete().eq('id', institution.id)

      console.error('Error creating user profile:', userError)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Step 4: Create default courses for the institution (vocational training courses)
    const defaultCourses = [
      { name: 'Welding and Metal Fabrication', code: 'WMF', nqf_level: 3, credits: 120 },
      { name: 'Electrical Installation', code: 'ELC', nqf_level: 3, credits: 120 },
      { name: 'Automotive Mechanics', code: 'AUT', nqf_level: 3, credits: 120 },
      { name: 'Plumbing', code: 'PLB', nqf_level: 3, credits: 120 },
      { name: 'Carpentry and Joinery', code: 'CRP', nqf_level: 3, credits: 120 },
    ]

    const { error: coursesError } = await supabase
      .from('courses')
      .insert(
        defaultCourses.map((course) => ({
          institution_id: institution.id,
          name: course.name,
          course_code: course.code,
          nqf_level: course.nqf_level,
          credits: course.credits,
          is_active: true,
        }))
      )

    if (coursesError) {
      // Log but don't fail the signup - courses can be added manually
      console.error('Error creating default courses:', coursesError)
    }

    // Step 5: Create referral tracking if valid referral code was used
    if (validReferralCode) {
      // Create the referral record
      await supabase
        .from('referrals')
        .insert({
          referral_code_id: validReferralCode.id,
          referrer_institution_id: validReferralCode.institution_id,
          referred_institution_id: institution.id,
          referred_email: email.toLowerCase(),
          status: 'pending',
          referrer_reward_months: 1,
          referred_extra_trial_days: 14,
        })

      // Update total referrals count on the referral code
      // First get current count, then increment
      const { data: currentCode } = await supabase
        .from('referral_codes')
        .select('total_referrals')
        .eq('id', validReferralCode.id)
        .single()

      await supabase
        .from('referral_codes')
        .update({
          total_referrals: ((currentCode as { total_referrals: number } | null)?.total_referrals || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', validReferralCode.id)

      // Note: Rewards are granted automatically when subscription becomes active
      // via the database trigger (complete_referral_on_subscription)
    }

    return NextResponse.json({
      success: true,
      message: validReferralCode
        ? `Account created successfully! You have a ${trialDays}-day free trial. Sign in to get started!`
        : 'Account created successfully! You can now sign in.',
      institutionId: institution.id,
      userId: authData.user.id,
      referralApplied: !!validReferralCode,
      trialDays,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
