import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { fullName, phone } = await request.json()

    if (!fullName || !phone) {
      return NextResponse.json({
        success: false,
        error: 'Full name and phone number are required'
      }, { status: 400 })
    }

    // Create admin client to bypass RLS (same pattern as register routes)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Search for lecturer by name (case-insensitive partial match)
    const { data: lecturersData, error: searchError } = await supabase
      .from('lecturers')
      .select('id, full_name, phone, email, auth_user_id, status')
      .ilike('full_name', `%${fullName.trim()}%`)
      .limit(10)

    if (searchError) {
      console.error('Lecturer search error:', searchError)
      return NextResponse.json({
        success: false,
        error: 'Error searching for lecturer record'
      }, { status: 500 })
    }

    type LecturerRecord = { id: string; full_name: string; phone: string | null; email: string | null; auth_user_id: string | null; status: string }
    const lecturers = lecturersData as LecturerRecord[] | null

    // Find a matching lecturer (case-insensitive name match and phone match)
    const cleanPhone = phone.replace(/\D/g, '')
    const matchingLecturer = lecturers?.find(l => {
      const nameMatch = l.full_name.toLowerCase().includes(fullName.toLowerCase().trim())
      const phoneMatch = l.phone && cleanPhone && l.phone.replace(/\D/g, '').includes(cleanPhone)
      return nameMatch && phoneMatch
    })

    if (!matchingLecturer) {
      return NextResponse.json({
        success: false,
        error: 'No matching lecturer record found. Please check your name and phone number, or contact your institution.'
      })
    }

    if (matchingLecturer.auth_user_id) {
      return NextResponse.json({
        success: false,
        error: 'This lecturer already has an account. Please login instead.',
        hasAccount: true
      })
    }

    if (matchingLecturer.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Your lecturer record is not active. Please contact your institution.'
      })
    }

    return NextResponse.json({
      success: true,
      lecturer: {
        id: matchingLecturer.id,
        name: matchingLecturer.full_name,
        email: matchingLecturer.email
      }
    })

  } catch (error) {
    console.error('Lecturer verify error:', error)
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred'
    }, { status: 500 })
  }
}
