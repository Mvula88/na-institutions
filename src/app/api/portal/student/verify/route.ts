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

    // Search for student by name (case-insensitive partial match)
    const { data: studentsData, error: searchError } = await supabase
      .from('students')
      .select('id, full_name, phone, email, auth_user_id, status')
      .ilike('full_name', `%${fullName.trim()}%`)
      .limit(10)

    if (searchError) {
      console.error('Student search error:', searchError)
      return NextResponse.json({
        success: false,
        error: 'Error searching for student record'
      }, { status: 500 })
    }

    type StudentRecord = { id: string; full_name: string; phone: string | null; email: string | null; auth_user_id: string | null; status: string }
    const students = studentsData as StudentRecord[] | null

    // Find a matching student (case-insensitive name match and phone match)
    const cleanPhone = phone.replace(/\D/g, '')
    const matchingStudent = students?.find(s => {
      const nameMatch = s.full_name.toLowerCase().includes(fullName.toLowerCase().trim())
      const phoneMatch = s.phone && cleanPhone && s.phone.replace(/\D/g, '').includes(cleanPhone)
      return nameMatch && phoneMatch
    })

    if (!matchingStudent) {
      return NextResponse.json({
        success: false,
        error: 'No matching student record found. Please check your name and phone number, or contact your tutorial center.'
      })
    }

    if (matchingStudent.auth_user_id) {
      return NextResponse.json({
        success: false,
        error: 'This student already has an account. Please login instead.',
        hasAccount: true
      })
    }

    if (matchingStudent.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Your student record is not active. Please contact your tutorial center.'
      })
    }

    return NextResponse.json({
      success: true,
      student: {
        id: matchingStudent.id,
        name: matchingStudent.full_name,
        email: matchingStudent.email
      }
    })

  } catch (error) {
    console.error('Student verify error:', error)
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred'
    }, { status: 500 })
  }
}
