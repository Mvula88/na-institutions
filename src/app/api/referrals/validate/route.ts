import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ReferralCodeResult {
  id: string
  code: string
  is_active: boolean
  center: { name: string } | null
}

// POST - Validate a referral code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'No code provided' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Look up the referral code
    const { data: referralCodeData, error } = await supabase
      .from('referral_codes')
      .select(`
        id,
        code,
        is_active,
        institution:institutions(name)
      `)
      .eq('code', code.toUpperCase())
      .single()

    const referralCode = referralCodeData as ReferralCodeResult | null

    if (error || !referralCode) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid referral code',
      })
    }

    if (!referralCode.is_active) {
      return NextResponse.json({
        valid: false,
        error: 'This referral code is no longer active',
      })
    }

    const centerName = referralCode.center?.name || 'A tutorial center'

    return NextResponse.json({
      valid: true,
      code: referralCode.code,
      referrerName: centerName,
      discount: '30-day free trial (instead of 14 days)!',
    })
  } catch (error) {
    console.error('Error validating referral code:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate code' },
      { status: 500 }
    )
  }
}
