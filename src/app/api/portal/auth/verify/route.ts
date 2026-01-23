import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface VerifyRequest {
  portalType: 'student' | 'teacher' | 'parent'
  authUserId: string
}

interface StudentData {
  id: string
  full_name: string
  email: string | null
  institution_id: string
  status: string
}

interface TeacherData {
  id: string
  full_name: string
  email: string | null
  institution_id: string
  is_active: boolean
}

interface ParentData {
  id: string
  full_name: string
  email: string | null
  is_active: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json()
    const { portalType, authUserId } = body

    if (!portalType || !authUserId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Check the appropriate table based on portal type
    if (portalType === 'student') {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, email, institution_id, status')
        .eq('auth_user_id', authUserId)
        .single()

      const student = data as StudentData | null

      if (error || !student) {
        return NextResponse.json({
          success: false,
          error: 'No student account linked to this email. Please contact your school administrator.'
        })
      }

      if (student.status !== 'active') {
        return NextResponse.json({
          success: false,
          error: 'Your student account is not active. Please contact your school administrator.'
        })
      }

      return NextResponse.json({
        success: true,
        entityId: student.id,
        entityType: 'student',
        institutionId: student.institution_id,
        name: student.full_name,
      })
    }

    if (portalType === 'teacher') {
      const { data, error } = await supabase
        .from('lecturers')
        .select('id, full_name, email, institution_id, is_active')
        .eq('auth_user_id', authUserId)
        .single()

      const teacher = data as TeacherData | null

      if (error || !teacher) {
        return NextResponse.json({
          success: false,
          error: 'No teacher account linked to this email. Please contact your school administrator.'
        })
      }

      if (!teacher.is_active) {
        return NextResponse.json({
          success: false,
          error: 'Your teacher account is not active. Please contact your school administrator.'
        })
      }

      return NextResponse.json({
        success: true,
        entityId: teacher.id,
        entityType: 'teacher',
        institutionId: teacher.institution_id,
        name: teacher.full_name,
      })
    }

    if (portalType === 'parent') {
      const { data, error } = await supabase
        .from('parents')
        .select('id, full_name, email, is_active')
        .eq('auth_user_id', authUserId)
        .single()

      const parent = data as ParentData | null

      if (error || !parent) {
        return NextResponse.json({
          success: false,
          error: 'No parent account found. Please register first.'
        })
      }

      if (!parent.is_active) {
        return NextResponse.json({
          success: false,
          error: 'Your parent account is not active. Please contact support.'
        })
      }

      return NextResponse.json({
        success: true,
        entityId: parent.id,
        entityType: 'parent',
        name: parent.full_name,
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid portal type'
    }, { status: 400 })

  } catch (error) {
    console.error('Portal auth verify error:', error)
    return NextResponse.json({
      success: false,
      error: 'Verification failed'
    }, { status: 500 })
  }
}
