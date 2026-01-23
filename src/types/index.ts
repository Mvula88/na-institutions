// Re-export all database types
export * from './database'

// Extended types with relations
export interface UserWithInstitution {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: 'super_admin' | 'institution_admin' | 'institution_staff'
  institution_id: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
  institution?: {
    id: string
    name: string
    slug: string
    code: string | null
    logo_url: string | null
    primary_color: string
    secondary_color: string
    status: 'active' | 'inactive' | 'suspended'
    subscription_tier: 'micro' | 'starter' | 'standard' | 'premium' | null
    subscription_status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'inactive' | null
    hostel_module_enabled: boolean
    transport_module_enabled: boolean
    library_module_enabled: boolean
    sms_module_enabled: boolean
    // New institution fields
    institution_type: 'vtc' | 'nursing_college' | 'university' | 'private_college' | 'polytechnic' | 'other'
    nqa_accreditation_number: string | null
    level_terminology: 'level' | 'year'
    student_number_prefix: string | null
    student_number_format: string
  } | null
}

// Legacy alias for backward compatibility
export type UserWithCenter = UserWithInstitution

export interface StudentWithCourses {
  id: string
  institution_id: string
  student_number: string | null
  full_name: string
  email: string | null
  phone: string | null
  gender: 'male' | 'female' | 'other' | null
  date_of_birth: string | null
  grade: string | null
  school_name: string | null
  address: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  parent_address: string | null
  relationship: string | null
  status: 'active' | 'inactive' | 'graduated' | 'withdrawn'
  registration_date: string
  created_at: string
  updated_at: string
  courses?: {
    id: string
    name: string
    code: string | null
    course_code: string | null
    monthly_fee: number
    nqf_level: number | null
    credits: number | null
  }[]
  fees?: {
    id: string
    fee_month: string
    amount_due: number
    amount_paid: number
    balance: number
    status: 'paid' | 'partial' | 'unpaid'
  }[]
}

// Legacy alias
export type StudentWithSubjects = StudentWithCourses

export interface DashboardStats {
  totalStudents: number
  activeStudents: number
  totalLecturers: number
  totalCourses: number
  totalPrograms: number
  totalFeesCollected: number
  totalOutstanding: number
  recentPayments: {
    id: string
    student_name: string
    amount: number
    payment_date: string
  }[]
  studentsByGender: {
    male: number
    female: number
    other: number
  }
  paymentStatusBreakdown: {
    paid: number
    partial: number
    unpaid: number
  }
}

export interface HostelStats {
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  totalCapacity: number
  currentOccupancy: number
  hostelStudents: number
  hostelFeesCollected: number
  hostelOutstanding: number
}

// Form types
export interface StudentFormData {
  full_name: string
  email?: string
  phone?: string
  gender?: 'male' | 'female' | 'other'
  date_of_birth?: string
  grade?: string
  school_name?: string
  address?: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
  parent_address?: string
  relationship?: string
  course_ids?: string[]
  // Legacy alias
  subject_ids?: string[]
}

export interface LecturerFormData {
  full_name: string
  email?: string
  phone?: string
  gender?: 'male' | 'female' | 'other'
  date_of_birth?: string
  address?: string
  employee_number?: string
  qualification?: string
  qualifications?: string[]
  specialization?: string
  specializations?: string[]
  date_joined?: string
  course_ids?: string[]
  // Legacy alias
  subject_ids?: string[]
}

// Legacy alias
export type TeacherFormData = LecturerFormData

export interface InstitutionFormData {
  name: string
  slug: string
  code?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  bank_name?: string
  account_number?: string
  branch_code?: string
  subscription_tier?: string
  hostel_module_enabled?: boolean
  transport_module_enabled?: boolean
  library_module_enabled?: boolean
  sms_module_enabled?: boolean
  // New institution fields
  institution_type?: 'vtc' | 'nursing_college' | 'university' | 'private_college' | 'polytechnic' | 'other'
  nqa_accreditation_number?: string
  nqa_accreditation_expiry?: string
  level_terminology?: 'level' | 'year'
  student_number_prefix?: string
  student_number_format?: string
  student_number_separator?: string
}

// Legacy alias
export type CenterFormData = InstitutionFormData

export interface CourseFormData {
  name: string
  code?: string
  course_code?: string
  description?: string
  monthly_fee?: number
  nqf_level?: number
  credits?: number
  duration_months?: number
  prerequisite_course_id?: string
}

export interface ProgramFormData {
  name: string
  description?: string
  program_code?: string
  qualification_type?: 'certificate' | 'higher_certificate' | 'diploma' | 'advanced_diploma' | 'bachelors_degree' | 'honours_degree' | 'masters_degree' | 'doctorate' | 'other'
  nqf_level?: number
  total_credits?: number
  duration_years?: number
}

export interface PaymentFormData {
  student_id: string
  student_fee_id?: string
  amount: number
  payment_method?: string
  reference_number?: string
  notes?: string
}
