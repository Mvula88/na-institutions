import { createClient } from '@/lib/supabase/client'
import { AcademicYear, AcademicYearInsert, AcademicYearUpdate } from '@/types/database'

/**
 * Fetch all academic years for an institution
 */
export async function getAcademicYears(institutionId: string): Promise<AcademicYear[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .eq('institution_id', institutionId)
    .order('year', { ascending: false })

  if (error) {
    console.error('Error fetching academic years:', error)
    throw error
  }

  return data as AcademicYear[]
}

/**
 * Get the current academic year for an institution
 */
export async function getCurrentAcademicYear(institutionId: string): Promise<AcademicYear | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('is_current', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No current academic year found
      return null
    }
    console.error('Error fetching current academic year:', error)
    throw error
  }

  return data as AcademicYear
}

/**
 * Get academic year by ID
 */
export async function getAcademicYearById(id: string): Promise<AcademicYear | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching academic year:', error)
    return null
  }

  return data as AcademicYear
}

/**
 * Create a new academic year
 */
export async function createAcademicYear(academicYear: AcademicYearInsert): Promise<AcademicYear> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('academic_years')
    .insert(academicYear as never)
    .select()
    .single()

  if (error) {
    console.error('Error creating academic year:', error)
    throw error
  }

  return data as AcademicYear
}

/**
 * Update an academic year
 */
export async function updateAcademicYear(id: string, updates: AcademicYearUpdate): Promise<AcademicYear> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('academic_years')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating academic year:', error)
    throw error
  }

  return data as AcademicYear
}

/**
 * Delete an academic year
 */
export async function deleteAcademicYear(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('academic_years')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting academic year:', error)
    throw error
  }
}

/**
 * Set an academic year as current (will unset others via trigger)
 */
export async function setCurrentAcademicYear(id: string): Promise<AcademicYear> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('academic_years')
    .update({
      is_current: true,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error setting current academic year:', error)
    throw error
  }

  return data as AcademicYear
}

/**
 * Check if registration is open for an academic year
 */
export function isRegistrationOpen(academicYear: AcademicYear): boolean {
  if (!academicYear.registration_open_date || !academicYear.registration_close_date) {
    return false
  }

  const today = new Date()
  const openDate = new Date(academicYear.registration_open_date)
  const closeDate = new Date(academicYear.registration_close_date)

  return today >= openDate && today <= closeDate
}

/**
 * Get registration status label
 */
export function getRegistrationStatus(academicYear: AcademicYear): {
  status: 'not_set' | 'upcoming' | 'open' | 'closed'
  label: string
  color: string
} {
  if (!academicYear.registration_open_date || !academicYear.registration_close_date) {
    return { status: 'not_set', label: 'Not Configured', color: 'gray' }
  }

  const today = new Date()
  const openDate = new Date(academicYear.registration_open_date)
  const closeDate = new Date(academicYear.registration_close_date)

  if (today < openDate) {
    return { status: 'upcoming', label: 'Upcoming', color: 'blue' }
  } else if (today >= openDate && today <= closeDate) {
    return { status: 'open', label: 'Open', color: 'green' }
  } else {
    return { status: 'closed', label: 'Closed', color: 'red' }
  }
}

/**
 * Format academic year display name
 */
export function formatAcademicYearName(year: number, format: 'single' | 'range' = 'single'): string {
  if (format === 'range') {
    return `${year}/${year + 1}`
  }
  return year.toString()
}

/**
 * Generate default dates for a new academic year
 */
export function generateDefaultDates(year: number): {
  start_date: string
  end_date: string
  registration_open_date: string
  registration_close_date: string
} {
  return {
    start_date: `${year}-01-15`, // Mid-January start
    end_date: `${year}-12-15`, // Mid-December end
    registration_open_date: `${year - 1}-11-01`, // November previous year
    registration_close_date: `${year}-02-28`, // End of February
  }
}

/**
 * Check if an academic year overlaps with existing years
 */
export async function checkYearExists(institutionId: string, year: number, excludeId?: string): Promise<boolean> {
  const supabase = createClient()

  let query = supabase
    .from('academic_years')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('year', year)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error checking year exists:', error)
    return false
  }

  return (data?.length ?? 0) > 0
}
