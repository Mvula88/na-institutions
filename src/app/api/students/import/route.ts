import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { checkStudentLimit } from '@/lib/subscription-limits'
import { createAuditLog } from '@/lib/audit-log'
import { StudentImportRow } from '@/lib/csv-parser'

// Lazy initialization of service role client
function getSupabaseAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: userProfileData } = await supabase
      .from('users')
      .select('id, institution_id, role')
      .eq('id', authUser.id)
      .single()

    const userProfile = userProfileData as { id: string; institution_id: string | null; role: string } | null

    if (!userProfile?.institution_id) {
      return NextResponse.json({ error: 'User not associated with an institution' }, { status: 400 })
    }

    // Check if user has permission to import (institution_admin or admin)
    if (!['institution_admin', 'admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { students } = body as { students: StudentImportRow[] }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'No students to import' }, { status: 400 })
    }

    // Check student limit
    const limitCheck = await checkStudentLimit(userProfile.institution_id)
    const availableSlots = limitCheck.limit === -1 ? Infinity : limitCheck.limit - limitCheck.current

    if (limitCheck.limit !== -1 && students.length > availableSlots) {
      return NextResponse.json({
        error: `Cannot import ${students.length} students. You have ${availableSlots} student slots available. Please upgrade your subscription for more capacity.`,
        availableSlots,
        requestedCount: students.length,
      }, { status: 400 })
    }

    // Prepare student records for insert
    const studentRecords = students.map((student) => {
      // Create full_name from first_name and last_name (which maps to surname)
      const full_name = `${student.last_name} ${student.first_name}`.trim()

      return {
        institution_id: userProfile.institution_id,
        full_name,
        first_name: student.first_name,
        surname: student.last_name, // CSV last_name maps to database surname
        email: student.email || null,
        phone: student.phone || null,
        date_of_birth: student.date_of_birth || null,
        gender: student.gender || null,
        grade: student.grade || null,
        parent_name: student.parent_name || null,
        parent_phone: student.parent_phone || null,
        parent_email: student.parent_email || null,
        address: student.address || null,
        status: 'active',
      }
    })

    // Bulk insert students
    const { data: insertedStudents, error: insertError } = await getSupabaseAdmin()
      .from('students')
      .insert(studentRecords)
      .select('id, first_name, surname')

    if (insertError) {
      console.error('Error importing students:', insertError)
      return NextResponse.json({ error: 'Failed to import students' }, { status: 500 })
    }

    // Create audit log entry for the import
    await createAuditLog({
      action: 'create',
      entityType: 'student',
      entityId: 'bulk-import',
      newValues: {
        count: insertedStudents.length,
        students: insertedStudents.map((s) => `${s.surname} ${s.first_name}`).join(', '),
      },
      userId: userProfile.id,
      institutionId: userProfile.institution_id,
    })

    return NextResponse.json({
      success: true,
      imported: insertedStudents.length,
      students: insertedStudents,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
