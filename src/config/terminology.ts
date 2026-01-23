/**
 * Terminology configuration for NamInstitutions
 * Maps educational terminology used across the platform
 */

// Core entity terminology
export const terminology = {
  institution: {
    singular: 'Institution',
    plural: 'Institutions',
    description: 'Educational institutions (VTCs, universities, colleges, etc.)',
  },
  lecturer: {
    singular: 'Lecturer',
    plural: 'Lecturers',
    description: 'Teaching staff at the institution',
  },
  course: {
    singular: 'Course',
    plural: 'Courses',
    description: 'Academic courses offered by the institution',
  },
  program: {
    singular: 'Program',
    plural: 'Programs',
    description: 'Academic programs/qualifications (e.g., Diploma in Engineering)',
  },
  student: {
    singular: 'Student',
    plural: 'Students',
    description: 'Enrolled students at the institution',
  },
  enrollment: {
    singular: 'Enrollment',
    plural: 'Enrollments',
    description: 'Student course enrollments',
  },
  transcript: {
    singular: 'Transcript',
    plural: 'Transcripts',
    description: 'Academic transcripts/records',
  },
  assessment: {
    singular: 'Assessment',
    plural: 'Assessments',
    description: 'Tests, exams, and evaluations',
  },
} as const

// Institution types
export const institutionTypes = [
  { value: 'vtc', label: 'Vocational Training Centre', shortLabel: 'VTC' },
  { value: 'nursing_college', label: 'Nursing Training College', shortLabel: 'NTC' },
  { value: 'university', label: 'University', shortLabel: 'Univ' },
  { value: 'private_college', label: 'Private College', shortLabel: 'College' },
  { value: 'polytechnic', label: 'Polytechnic', shortLabel: 'Poly' },
  { value: 'other', label: 'Other Institution', shortLabel: 'Other' },
] as const

// Qualification types (NQF aligned)
export const qualificationTypes = [
  { value: 'certificate', label: 'Certificate', nqfLevelRange: '1-3' },
  { value: 'higher_certificate', label: 'Higher Certificate', nqfLevelRange: '4' },
  { value: 'diploma', label: 'Diploma', nqfLevelRange: '5' },
  { value: 'advanced_diploma', label: 'Advanced Diploma', nqfLevelRange: '6' },
  { value: 'bachelors_degree', label: 'Bachelor\'s Degree', nqfLevelRange: '7' },
  { value: 'honours_degree', label: 'Honours Degree', nqfLevelRange: '8' },
  { value: 'masters_degree', label: 'Master\'s Degree', nqfLevelRange: '9' },
  { value: 'doctorate', label: 'Doctorate', nqfLevelRange: '10' },
  { value: 'other', label: 'Other', nqfLevelRange: 'N/A' },
] as const

// Namibian National Qualifications Framework (NQF) Levels
export const nqfLevels = [
  { level: 1, name: 'Level 1', description: 'Grade 9 / ABET Level 4', example: 'Basic vocational skills' },
  { level: 2, name: 'Level 2', description: 'Grade 10 / NSSCO', example: 'Entry-level vocational' },
  { level: 3, name: 'Level 3', description: 'Grade 12 / NSSCAS', example: 'Certificate' },
  { level: 4, name: 'Level 4', description: 'Higher Certificate', example: 'Post-matric certificate' },
  { level: 5, name: 'Level 5', description: 'Diploma', example: 'National Diploma' },
  { level: 6, name: 'Level 6', description: 'Advanced Diploma / Bachelor\'s Degree', example: '3-year degree' },
  { level: 7, name: 'Level 7', description: 'Bachelor\'s Honours Degree', example: '4-year degree' },
  { level: 8, name: 'Level 8', description: 'Postgraduate Diploma / Master\'s Degree', example: 'PGDip / Master\'s' },
  { level: 9, name: 'Level 9', description: 'Master\'s Degree (Research)', example: 'Research Master\'s' },
  { level: 10, name: 'Level 10', description: 'Doctoral Degree', example: 'PhD / DPhil' },
] as const

// Level vs Year terminology options
export const levelTerminologyOptions = [
  { value: 'level', label: 'Level', example: 'Level 1, Level 2, Level 3' },
  { value: 'year', label: 'Year', example: 'Year 1, Year 2, Year 3' },
] as const

// Student number format tokens
export const studentNumberTokens = [
  { token: '{PREFIX}', description: 'Institution prefix (e.g., IUM, NUST)', example: 'IUM' },
  { token: '{CODE}', description: 'Institution code', example: 'NTC' },
  { token: '{YEAR:2}', description: '2-digit year', example: '26' },
  { token: '{YEAR:4}', description: '4-digit year', example: '2026' },
  { token: '{SEQ:3}', description: 'Sequence number (3 digits)', example: '001' },
  { token: '{SEQ:4}', description: 'Sequence number (4 digits)', example: '0001' },
  { token: '{SEQ:5}', description: 'Sequence number (5 digits)', example: '00001' },
  { token: '{SEQ:6}', description: 'Sequence number (6 digits)', example: '000001' },
  { token: '{DEPT}', description: 'Department code (optional)', example: 'ENG' },
  { token: '{SEP}', description: 'Custom separator', example: '-' },
] as const

// Common student number format presets
export const studentNumberFormatPresets = [
  {
    name: 'Simple',
    format: '{PREFIX}{YEAR:2}{SEQ:4}',
    example: 'IUM260001',
    description: 'Prefix + 2-digit year + 4-digit sequence'
  },
  {
    name: 'With Separator',
    format: '{PREFIX}-{YEAR:4}-{SEQ:5}',
    example: 'NUST-2026-00001',
    description: 'Prefix - 4-digit year - 5-digit sequence'
  },
  {
    name: 'Full Format',
    format: '{CODE}/{DEPT}/{YEAR:4}/{SEQ:4}',
    example: 'VVTC/ENG/2026/0001',
    description: 'Code/Department/Year/Sequence'
  },
  {
    name: 'University Style',
    format: '{YEAR:4}{SEQ:6}',
    example: '2026000001',
    description: '4-digit year + 6-digit sequence'
  },
] as const

// Helper function to get NQF level details
export function getNqfLevelDetails(level: number) {
  return nqfLevels.find(l => l.level === level) || null
}

// Helper function to get institution type label
export function getInstitutionTypeLabel(type: string) {
  const found = institutionTypes.find(t => t.value === type)
  return found?.label || type
}

// Helper function to get qualification type label
export function getQualificationTypeLabel(type: string) {
  const found = qualificationTypes.find(t => t.value === type)
  return found?.label || type
}

// Helper to format level/year based on institution preference
export function formatLevelYear(num: number, terminology: 'level' | 'year' = 'level') {
  return terminology === 'year' ? `Year ${num}` : `Level ${num}`
}
