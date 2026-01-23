/**
 * CSV Parser Utility
 * Parses and validates CSV files for student bulk import
 */

import Papa from 'papaparse'

export interface StudentImportRow {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  date_of_birth?: string
  gender?: 'male' | 'female' | 'other'
  grade?: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
  address?: string
}

export interface ParsedCSV {
  data: StudentImportRow[]
  errors: { row: number; message: string }[]
  headers: string[]
}

// Required fields for student import
const REQUIRED_FIELDS = ['first_name', 'last_name']

// Field mapping (alternate names -> standard name)
const FIELD_MAPPING: Record<string, string> = {
  // First name variations
  first_name: 'first_name',
  firstname: 'first_name',
  'first name': 'first_name',
  name: 'first_name',
  'given name': 'first_name',

  // Last name variations
  last_name: 'last_name',
  lastname: 'last_name',
  'last name': 'last_name',
  surname: 'last_name',
  'family name': 'last_name',

  // Email variations
  email: 'email',
  'e-mail': 'email',
  'email address': 'email',

  // Phone variations
  phone: 'phone',
  telephone: 'phone',
  mobile: 'phone',
  'phone number': 'phone',
  cell: 'phone',
  cellphone: 'phone',

  // Date of birth variations
  date_of_birth: 'date_of_birth',
  dob: 'date_of_birth',
  'date of birth': 'date_of_birth',
  birthday: 'date_of_birth',
  birthdate: 'date_of_birth',

  // Gender variations
  gender: 'gender',
  sex: 'gender',

  // Grade variations
  grade: 'grade',
  class: 'grade',
  year: 'grade',
  level: 'grade',

  // Parent name variations
  parent_name: 'parent_name',
  'parent name': 'parent_name',
  guardian: 'parent_name',
  'guardian name': 'parent_name',
  'parent/guardian': 'parent_name',

  // Parent phone variations
  parent_phone: 'parent_phone',
  'parent phone': 'parent_phone',
  'guardian phone': 'parent_phone',
  'parent mobile': 'parent_phone',

  // Parent email variations
  parent_email: 'parent_email',
  'parent email': 'parent_email',
  'guardian email': 'parent_email',

  // Address variations
  address: 'address',
  location: 'address',
  'home address': 'address',
  'street address': 'address',
}

/**
 * Normalize header names to standard field names
 */
function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim()
  return FIELD_MAPPING[normalized] || normalized
}

/**
 * Parse a date string to ISO format
 */
function parseDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined

  // Try various date formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // DD/MM/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    // MM/DD/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/,
  ]

  // Try ISO format first
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return dateStr
  }

  // Try DD/MM/YYYY (common in South Africa)
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Try DD-MM-YYYY
  const dmyDashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmyDashMatch) {
    const [, day, month, year] = dmyDashMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return undefined
}

/**
 * Normalize gender value
 */
function normalizeGender(gender: string): 'male' | 'female' | 'other' | undefined {
  if (!gender) return undefined

  const normalized = gender.toLowerCase().trim()
  if (['male', 'm', 'boy'].includes(normalized)) return 'male'
  if (['female', 'f', 'girl'].includes(normalized)) return 'female'
  if (normalized) return 'other'

  return undefined
}

/**
 * Validate a single row of student data
 */
function validateRow(row: Record<string, string>, rowIndex: number): { data: StudentImportRow | null; errors: string[] } {
  const errors: string[] = []

  // Check required fields
  if (!row.first_name?.trim()) {
    errors.push('First name is required')
  }
  if (!row.last_name?.trim()) {
    errors.push('Last name is required')
  }

  // Validate email format if provided
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
    errors.push('Invalid email format')
  }

  // Validate phone format if provided (SA phone numbers)
  if (row.phone) {
    const cleanPhone = row.phone.replace(/[\s\-\(\)]/g, '')
    if (!/^(\+?27|0)?[0-9]{9,10}$/.test(cleanPhone)) {
      errors.push('Invalid phone number format')
    }
  }

  // Validate parent phone if provided
  if (row.parent_phone) {
    const cleanPhone = row.parent_phone.replace(/[\s\-\(\)]/g, '')
    if (!/^(\+?27|0)?[0-9]{9,10}$/.test(cleanPhone)) {
      errors.push('Invalid parent phone format')
    }
  }

  // Validate parent email if provided
  if (row.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.parent_email.trim())) {
    errors.push('Invalid parent email format')
  }

  if (errors.length > 0) {
    return { data: null, errors }
  }

  const studentData: StudentImportRow = {
    first_name: row.first_name.trim(),
    last_name: row.last_name.trim(),
    email: row.email?.trim() || undefined,
    phone: row.phone?.trim() || undefined,
    date_of_birth: parseDate(row.date_of_birth),
    gender: normalizeGender(row.gender),
    grade: row.grade?.trim() || undefined,
    parent_name: row.parent_name?.trim() || undefined,
    parent_phone: row.parent_phone?.trim() || undefined,
    parent_email: row.parent_email?.trim() || undefined,
    address: row.address?.trim() || undefined,
  }

  return { data: studentData, errors: [] }
}

/**
 * Parse CSV file content
 */
export function parseCSV(content: string): Promise<ParsedCSV> {
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: (results) => {
        const parsedData: StudentImportRow[] = []
        const errors: { row: number; message: string }[] = []
        const headers = results.meta.fields || []

        // Check for required headers
        const normalizedHeaders = headers.map((h) => h.toLowerCase())
        const missingRequired = REQUIRED_FIELDS.filter(
          (field) => !normalizedHeaders.includes(field)
        )

        if (missingRequired.length > 0) {
          errors.push({
            row: 0,
            message: `Missing required columns: ${missingRequired.join(', ')}`,
          })
          resolve({ data: [], errors, headers })
          return
        }

        // Validate each row
        results.data.forEach((row: unknown, index: number) => {
          const typedRow = row as Record<string, string>
          const { data, errors: rowErrors } = validateRow(typedRow, index + 2)

          if (data) {
            parsedData.push(data)
          }

          rowErrors.forEach((error) => {
            errors.push({ row: index + 2, message: error }) // +2 for header row and 0-indexing
          })
        })

        resolve({
          data: parsedData,
          errors,
          headers,
        })
      },
      error: (error: Error) => {
        resolve({
          data: [],
          errors: [{ row: 0, message: `Failed to parse CSV: ${error.message}` }],
          headers: [],
        })
      },
    })
  })
}

/**
 * Generate a sample CSV template
 */
export function generateCSVTemplate(): string {
  const headers = [
    'first_name',
    'last_name',
    'email',
    'phone',
    'date_of_birth',
    'gender',
    'grade',
    'parent_name',
    'parent_phone',
    'parent_email',
    'address',
  ]

  const sampleRow = [
    'John',
    'Doe',
    'john.doe@example.com',
    '0821234567',
    '2010-05-15',
    'male',
    'Grade 8',
    'Jane Doe',
    '0829876543',
    'jane.doe@example.com',
    '123 Main Street, Johannesburg',
  ]

  return headers.join(',') + '\n' + sampleRow.join(',')
}

/**
 * Download CSV template
 */
export function downloadCSVTemplate() {
  const content = generateCSVTemplate()
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'student_import_template.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
