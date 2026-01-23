import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface LinkChildRequest {
  studentNumber?: string
  studentEmail?: string
  relationship?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Get parent record
    const { data: parentData, error: parentError } = await supabase
      .from('parents')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const parent = parentData as { id: string } | null
    if (parentError || !parent) {
      return NextResponse.json({
        success: false,
        error: 'Parent account not found'
      }, { status: 404 })
    }

    const body: LinkChildRequest = await request.json()
    const { studentNumber, studentEmail, relationship = 'parent' } = body

    if (!studentNumber && !studentEmail) {
      return NextResponse.json({
        success: false,
        error: 'Please provide student number or email'
      }, { status: 400 })
    }

    // Find student by number or email
    let query = supabase
      .from('students')
      .select('id, full_name, student_number, email, center_id, status')

    if (studentNumber) {
      query = query.eq('student_number', studentNumber)
    } else if (studentEmail) {
      query = query.eq('email', studentEmail)
    }

    const { data: studentData, error: studentError } = await query.single()

    type StudentData = { id: string; full_name: string; student_number: string | null; email: string | null; center_id: string; status: string }
    const student = studentData as StudentData | null

    if (studentError || !student) {
      return NextResponse.json({
        success: false,
        error: 'Student not found. Please check the student number or email and try again.'
      }, { status: 404 })
    }

    if (student.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'This student account is not active. Please contact the school administrator.'
      }, { status: 400 })
    }

    // Check if already linked
    const { data: existingLinkData } = await supabase
      .from('parent_students')
      .select('id, verified_at')
      .eq('parent_id', parent.id)
      .eq('student_id', student.id)
      .single()

    const existingLink = existingLinkData as { id: string; verified_at: string | null } | null
    if (existingLink) {
      return NextResponse.json({
        success: false,
        error: 'This child is already linked to your account',
        isVerified: existingLink.verified_at !== null
      }, { status: 400 })
    }

    // Create the link (unverified)
    const { error: linkError } = await supabase
      .from('parent_students')
      .insert({
        parent_id: parent.id,
        student_id: student.id,
        relationship: relationship,
        is_primary: false,
        can_view_grades: true,
        can_view_attendance: true,
        can_view_fees: true,
        can_receive_notifications: true,
        verified_at: null, // Requires admin verification
      } as never)

    if (linkError) {
      console.error('Error linking child:', linkError)
      return NextResponse.json({
        success: false,
        error: 'Failed to link child'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Child linked successfully. The school administrator will verify the relationship.',
      student: {
        id: student.id,
        name: student.full_name,
        studentNumber: student.student_number,
      }
    })

  } catch (error) {
    console.error('Link child error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to link child'
    }, { status: 500 })
  }
}

// GET - Get all linked children for current parent
export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Get parent record
    const { data: parentDataGet } = await supabase
      .from('parents')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const parentRecord = parentDataGet as { id: string } | null
    if (!parentRecord) {
      return NextResponse.json({
        success: false,
        error: 'Parent account not found'
      }, { status: 404 })
    }

    // Get linked children
    const { data: children, error } = await supabase
      .rpc('get_parent_children' as never, { p_parent_id: parentRecord.id } as never)

    if (error) {
      console.error('Error fetching children:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch children'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      children: children || []
    })

  } catch (error) {
    console.error('Get children error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch children'
    }, { status: 500 })
  }
}

// DELETE - Unlink a child
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Get parent record
    const { data: parentDataDel } = await supabase
      .from('parents')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const parentDel = parentDataDel as { id: string } | null
    if (!parentDel) {
      return NextResponse.json({
        success: false,
        error: 'Parent account not found'
      }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json({
        success: false,
        error: 'Student ID is required'
      }, { status: 400 })
    }

    // Delete the link
    const { error } = await supabase
      .from('parent_students')
      .delete()
      .eq('parent_id', parentDel.id)
      .eq('student_id', studentId)

    if (error) {
      console.error('Error unlinking child:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to unlink child'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Child unlinked successfully'
    })

  } catch (error) {
    console.error('Unlink child error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to unlink child'
    }, { status: 500 })
  }
}
