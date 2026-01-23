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

    // Search for teacher by name (case-insensitive partial match)
    const { data: teachersData, error: searchError } = await supabase
      .from('lecturers')
      .select('id, full_name, phone, email, auth_user_id, status')
      .ilike('full_name', `%${fullName.trim()}%`)
      .limit(10)

    if (searchError) {
      console.error('Teacher search error:', searchError)
      return NextResponse.json({
        success: false,
        error: 'Error searching for teacher record'
      }, { status: 500 })
    }

    type TeacherRecord = { id: string; full_name: string; phone: string | null; email: string | null; auth_user_id: string | null; status: string }
    const teachers = teachersData as TeacherRecord[] | null

    // Find a matching teacher (case-insensitive name match and phone match)
    const cleanPhone = phone.replace(/\D/g, '')
    const matchingTeacher = teachers?.find(t => {
      const nameMatch = t.full_name.toLowerCase().includes(fullName.toLowerCase().trim())
      const phoneMatch = t.phone && cleanPhone && t.phone.replace(/\D/g, '').includes(cleanPhone)
      return nameMatch && phoneMatch
    })

    if (!matchingTeacher) {
      return NextResponse.json({
        success: false,
        error: 'No matching teacher record found. Please check your name and phone number, or contact your tutorial center.'
      })
    }

    if (matchingTeacher.auth_user_id) {
      return NextResponse.json({
        success: false,
        error: 'This teacher already has an account. Please login instead.',
        hasAccount: true
      })
    }

    if (matchingTeacher.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Your teacher record is not active. Please contact your tutorial center.'
      })
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: matchingTeacher.id,
        name: matchingTeacher.full_name,
        email: matchingTeacher.email
      }
    })

  } catch (error) {
    console.error('Teacher verify error:', error)
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred'
    }, { status: 500 })
  }
}
