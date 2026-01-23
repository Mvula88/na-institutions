export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types
export type UserRole = 'super_admin' | 'institution_admin' | 'institution_staff'
export type InstitutionStatus = 'active' | 'inactive' | 'suspended'
export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'withdrawn'
export type LecturerStatus = 'active' | 'inactive' | 'terminated'
export type PaymentStatus = 'paid' | 'partial' | 'unpaid'
export type Gender = 'male' | 'female' | 'other'
export type RoomType = 'single' | 'shared'
export type HostelStudentStatus = 'checked_in' | 'checked_out'
export type RefundReason = 'relocation' | 'medical' | 'financial_hardship' | 'schedule_conflicts' | 'dissatisfaction' | 'other'
export type FeeModelType = 'monthly_per_course' | 'per_course_lumpsum' | 'per_semester'
export type FeeStatus = 'unpaid' | 'partial' | 'paid'

// Multi-Year Student Journey Types
export type ProgramEnrollmentStatus = 'enrolled' | 'deferred' | 'suspended' | 'completed' | 'withdrawn'
export type YearRegistrationStatus = 'pending' | 'registered' | 'confirmed' | 'cancelled'
export type YearCompletionStatus = 'in_progress' | 'passed' | 'failed' | 'incomplete' | 'deferred'

// New enum types for institutions
export type InstitutionType = 'vtc' | 'nursing_college' | 'university' | 'private_college' | 'polytechnic' | 'other'
export type QualificationType = 'certificate' | 'higher_certificate' | 'diploma' | 'advanced_diploma' | 'bachelors_degree' | 'honours_degree' | 'masters_degree' | 'doctorate' | 'other'
export type LevelTerminology = 'level' | 'year'

// Legacy aliases for backward compatibility
export type CenterStatus = InstitutionStatus
export type TeacherStatus = LecturerStatus

export interface Database {
  public: {
    Tables: {
      institutions: {
        Row: {
          id: string
          name: string
          slug: string
          code: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          bank_name: string | null
          account_number: string | null
          branch_code: string | null
          status: InstitutionStatus
          subscription_tier: string
          subscription_start_date: string | null
          subscription_end_date: string | null
          hostel_module_enabled: boolean
          transport_module_enabled: boolean
          library_module_enabled: boolean
          sms_module_enabled: boolean
          payment_months: number[]
          academic_year_start_month: number
          academic_year_end_month: number
          default_registration_fee: number
          initial_setup_completed: boolean
          // New institution fields
          institution_type: InstitutionType
          nqa_accreditation_number: string | null
          nqa_accreditation_expiry: string | null
          // Student number customization
          student_number_prefix: string | null
          student_number_format: string
          student_number_separator: string
          student_number_year_format: string
          student_number_sequence_padding: number
          // Level terminology preference
          level_terminology: LevelTerminology
          // Fee model
          fee_model: FeeModelType
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          code?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          bank_name?: string | null
          account_number?: string | null
          branch_code?: string | null
          status?: InstitutionStatus
          subscription_tier?: string
          subscription_start_date?: string | null
          subscription_end_date?: string | null
          hostel_module_enabled?: boolean
          transport_module_enabled?: boolean
          library_module_enabled?: boolean
          sms_module_enabled?: boolean
          payment_months?: number[]
          academic_year_start_month?: number
          academic_year_end_month?: number
          default_registration_fee?: number
          initial_setup_completed?: boolean
          institution_type?: InstitutionType
          nqa_accreditation_number?: string | null
          nqa_accreditation_expiry?: string | null
          student_number_prefix?: string | null
          student_number_format?: string
          student_number_separator?: string
          student_number_year_format?: string
          student_number_sequence_padding?: number
          level_terminology?: LevelTerminology
          fee_model?: FeeModelType
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          code?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          bank_name?: string | null
          account_number?: string | null
          branch_code?: string | null
          status?: InstitutionStatus
          subscription_tier?: string
          subscription_start_date?: string | null
          subscription_end_date?: string | null
          hostel_module_enabled?: boolean
          transport_module_enabled?: boolean
          library_module_enabled?: boolean
          sms_module_enabled?: boolean
          payment_months?: number[]
          academic_year_start_month?: number
          academic_year_end_month?: number
          default_registration_fee?: number
          initial_setup_completed?: boolean
          institution_type?: InstitutionType
          nqa_accreditation_number?: string | null
          nqa_accreditation_expiry?: string | null
          student_number_prefix?: string | null
          student_number_format?: string
          student_number_separator?: string
          student_number_year_format?: string
          student_number_sequence_padding?: number
          level_terminology?: LevelTerminology
          fee_model?: FeeModelType
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: UserRole
          institution_id: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          role?: UserRole
          institution_id?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: UserRole
          institution_id?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
      }
      courses: {
        Row: {
          id: string
          institution_id: string
          name: string
          code: string | null
          course_code: string | null
          description: string | null
          monthly_fee: number
          is_active: boolean
          // New NQF fields
          nqf_level: number | null
          credits: number | null
          duration_months: number | null
          prerequisite_course_id: string | null
          // Lump sum fee fields
          total_course_fee: number
          allow_installments: boolean
          default_installments: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          name: string
          code?: string | null
          course_code?: string | null
          description?: string | null
          monthly_fee?: number
          is_active?: boolean
          nqf_level?: number | null
          credits?: number | null
          duration_months?: number | null
          prerequisite_course_id?: string | null
          total_course_fee?: number
          allow_installments?: boolean
          default_installments?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          name?: string
          code?: string | null
          course_code?: string | null
          description?: string | null
          monthly_fee?: number
          is_active?: boolean
          nqf_level?: number | null
          credits?: number | null
          duration_months?: number | null
          prerequisite_course_id?: string | null
          total_course_fee?: number
          allow_installments?: boolean
          default_installments?: number
          created_at?: string
          updated_at?: string
        }
      }
      lecturers: {
        Row: {
          id: string
          institution_id: string
          full_name: string
          email: string | null
          phone: string | null
          gender: Gender | null
          date_of_birth: string | null
          address: string | null
          employee_id: string | null
          employee_number: string | null
          qualification: string | null
          qualifications: string[] | null
          specialization: string | null
          specializations: string[] | null
          date_joined: string | null
          status: LecturerStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          full_name: string
          email?: string | null
          phone?: string | null
          gender?: Gender | null
          date_of_birth?: string | null
          address?: string | null
          employee_id?: string | null
          employee_number?: string | null
          qualification?: string | null
          qualifications?: string[] | null
          specialization?: string | null
          specializations?: string[] | null
          date_joined?: string | null
          status?: LecturerStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          gender?: Gender | null
          date_of_birth?: string | null
          address?: string | null
          employee_id?: string | null
          employee_number?: string | null
          qualification?: string | null
          qualifications?: string[] | null
          specialization?: string | null
          specializations?: string[] | null
          date_joined?: string | null
          status?: LecturerStatus
          created_at?: string
          updated_at?: string
        }
      }
      lecturer_courses: {
        Row: {
          id: string
          lecturer_id: string
          course_id: string
          created_at: string
        }
        Insert: {
          id?: string
          lecturer_id: string
          course_id: string
          created_at?: string
        }
        Update: {
          id?: string
          lecturer_id?: string
          course_id?: string
          created_at?: string
        }
      }
      programs: {
        Row: {
          id: string
          institution_id: string
          name: string
          description: string | null
          is_active: boolean
          // New program fields
          program_code: string | null
          qualification_type: QualificationType | null
          nqf_level: number | null
          total_credits: number | null
          duration_years: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          name: string
          description?: string | null
          is_active?: boolean
          program_code?: string | null
          qualification_type?: QualificationType | null
          nqf_level?: number | null
          total_credits?: number | null
          duration_years?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          program_code?: string | null
          qualification_type?: QualificationType | null
          nqf_level?: number | null
          total_credits?: number | null
          duration_years?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          institution_id: string
          student_number: string | null
          full_name: string
          surname: string | null
          first_name: string | null
          email: string | null
          phone: string | null
          gender: Gender | null
          date_of_birth: string | null
          id_number: string | null
          grade: string | null
          school_name: string | null
          address: string | null
          health_conditions: string | null
          photo_url: string | null
          // Parent/Guardian
          parent_name: string | null
          parent_phone: string | null
          parent_email: string | null
          parent_address: string | null
          relationship: string | null
          // Person responsible for payment
          payer_name: string | null
          payer_id_number: string | null
          payer_phone: string | null
          payer_relationship: string | null
          // Registration fee
          registration_fee_paid: boolean
          registration_fee_amount: number
          registration_fee_paid_date: string | null
          // Terms
          terms_accepted: boolean
          terms_accepted_date: string | null
          // Credit balance for overpayments
          credit_balance: number
          status: StudentStatus
          registration_date: string
          // Multi-year tracking
          current_year_of_study: number
          intake_year: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          student_number?: string | null
          full_name: string
          surname?: string | null
          first_name?: string | null
          email?: string | null
          phone?: string | null
          gender?: Gender | null
          date_of_birth?: string | null
          id_number?: string | null
          grade?: string | null
          school_name?: string | null
          address?: string | null
          health_conditions?: string | null
          photo_url?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_email?: string | null
          parent_address?: string | null
          relationship?: string | null
          payer_name?: string | null
          payer_id_number?: string | null
          payer_phone?: string | null
          payer_relationship?: string | null
          registration_fee_paid?: boolean
          registration_fee_amount?: number
          registration_fee_paid_date?: string | null
          terms_accepted?: boolean
          terms_accepted_date?: string | null
          credit_balance?: number
          status?: StudentStatus
          registration_date?: string
          current_year_of_study?: number
          intake_year?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          student_number?: string | null
          full_name?: string
          surname?: string | null
          first_name?: string | null
          email?: string | null
          phone?: string | null
          gender?: Gender | null
          date_of_birth?: string | null
          id_number?: string | null
          grade?: string | null
          school_name?: string | null
          address?: string | null
          health_conditions?: string | null
          photo_url?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_email?: string | null
          parent_address?: string | null
          relationship?: string | null
          payer_name?: string | null
          payer_id_number?: string | null
          payer_phone?: string | null
          payer_relationship?: string | null
          registration_fee_paid?: boolean
          registration_fee_amount?: number
          registration_fee_paid_date?: string | null
          terms_accepted?: boolean
          terms_accepted_date?: string | null
          credit_balance?: number
          status?: StudentStatus
          registration_date?: string
          current_year_of_study?: number
          intake_year?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      student_enrollments: {
        Row: {
          id: string
          student_id: string
          course_id: string
          enrolled_date: string
          is_active: boolean
          // Multi-year tracking
          academic_year_id: string | null
          year_of_study: number
          program_year_registration_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          course_id: string
          enrolled_date?: string
          is_active?: boolean
          academic_year_id?: string | null
          year_of_study?: number
          program_year_registration_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          course_id?: string
          enrolled_date?: string
          is_active?: boolean
          academic_year_id?: string | null
          year_of_study?: number
          program_year_registration_id?: string | null
          created_at?: string
        }
      }
      student_number_sequences: {
        Row: {
          id: string
          institution_id: string
          year: number
          department_code: string | null
          current_sequence: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          year: number
          department_code?: string | null
          current_sequence?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          year?: number
          department_code?: string | null
          current_sequence?: number
          created_at?: string
          updated_at?: string
        }
      }
      fee_structures: {
        Row: {
          id: string
          institution_id: string
          name: string
          description: string | null
          amount: number
          fee_type: string
          is_recurring: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          name: string
          description?: string | null
          amount: number
          fee_type: string
          is_recurring?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          name?: string
          description?: string | null
          amount?: number
          fee_type?: string
          is_recurring?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      student_fees: {
        Row: {
          id: string
          institution_id: string
          student_id: string
          fee_month: string
          fee_type: string
          amount_due: number
          amount_paid: number
          balance: number
          status: PaymentStatus
          due_date: string | null
          // Source tracking for unified fee management
          source_type: string | null  // 'monthly', 'course_installment', 'semester'
          source_id: string | null  // Reference to student_course_fees or student_semester_fees
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          student_id: string
          fee_month: string
          fee_type: string
          amount_due: number
          amount_paid?: number
          status?: PaymentStatus
          due_date?: string | null
          source_type?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          student_id?: string
          fee_month?: string
          fee_type?: string
          amount_due?: number
          amount_paid?: number
          status?: PaymentStatus
          due_date?: string | null
          source_type?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          institution_id: string
          student_id: string
          student_fee_id: string | null
          amount: number
          payment_method: string | null
          reference_number: string | null
          notes: string | null
          recorded_by: string | null
          payment_date: string
          created_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          student_id: string
          student_fee_id?: string | null
          amount: number
          payment_method?: string | null
          reference_number?: string | null
          notes?: string | null
          recorded_by?: string | null
          payment_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          student_id?: string
          student_fee_id?: string | null
          amount?: number
          payment_method?: string | null
          reference_number?: string | null
          notes?: string | null
          recorded_by?: string | null
          payment_date?: string
          created_at?: string
        }
      }
      hostel_blocks: {
        Row: {
          id: string
          institution_id: string
          name: string
          description: string | null
          gender_restriction: Gender | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          name: string
          description?: string | null
          gender_restriction?: Gender | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          name?: string
          description?: string | null
          gender_restriction?: Gender | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      hostel_rooms: {
        Row: {
          id: string
          institution_id: string
          block_id: string | null
          room_number: string
          room_type: RoomType
          capacity: number
          current_occupancy: number
          monthly_fee: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          block_id?: string | null
          room_number: string
          room_type?: RoomType
          capacity?: number
          current_occupancy?: number
          monthly_fee?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          block_id?: string | null
          room_number?: string
          room_type?: RoomType
          capacity?: number
          current_occupancy?: number
          monthly_fee?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      hostel_allocations: {
        Row: {
          id: string
          institution_id: string
          room_id: string
          student_id: string
          check_in_date: string
          check_out_date: string | null
          status: HostelStudentStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          room_id: string
          student_id: string
          check_in_date?: string
          check_out_date?: string | null
          status?: HostelStudentStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          room_id?: string
          student_id?: string
          check_in_date?: string
          check_out_date?: string | null
          status?: HostelStudentStatus
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          institution_id: string | null
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          institution_id?: string | null
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          institution_id?: string | null
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      refunds: {
        Row: {
          id: string
          institution_id: string
          student_id: string
          original_payment_id: string
          amount: number
          reason: RefundReason
          reason_notes: string | null
          student_status_updated: boolean
          processed_by: string
          refund_date: string
          created_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          student_id: string
          original_payment_id: string
          amount: number
          reason: RefundReason
          reason_notes?: string | null
          student_status_updated?: boolean
          processed_by: string
          refund_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          student_id?: string
          original_payment_id?: string
          amount?: number
          reason?: RefundReason
          reason_notes?: string | null
          student_status_updated?: boolean
          processed_by?: string
          refund_date?: string
          created_at?: string
        }
      }
      grades: {
        Row: {
          id: string
          institution_id: string
          student_id: string
          course_id: string
          assessment_type: string
          score: number
          max_score: number
          percentage: number
          grade_letter: string | null
          comments: string | null
          recorded_by: string | null
          assessment_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          student_id: string
          course_id: string
          assessment_type: string
          score: number
          max_score: number
          percentage?: number
          grade_letter?: string | null
          comments?: string | null
          recorded_by?: string | null
          assessment_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          student_id?: string
          course_id?: string
          assessment_type?: string
          score?: number
          max_score?: number
          percentage?: number
          grade_letter?: string | null
          comments?: string | null
          recorded_by?: string | null
          assessment_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      report_cards: {
        Row: {
          id: string
          institution_id: string
          student_id: string
          term: string
          year: number
          overall_average: number | null
          overall_grade: string | null
          comments: string | null
          generated_by: string | null
          generated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          student_id: string
          term: string
          year: number
          overall_average?: number | null
          overall_grade?: string | null
          comments?: string | null
          generated_by?: string | null
          generated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          student_id?: string
          term?: string
          year?: number
          overall_average?: number | null
          overall_grade?: string | null
          comments?: string | null
          generated_by?: string | null
          generated_at?: string
          created_at?: string
        }
      }
      // Fee Model Tables
      semesters: {
        Row: {
          id: string
          institution_id: string
          name: string
          year: number
          semester_number: number
          start_date: string
          end_date: string
          fee_amount: number
          registration_deadline: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          name: string
          year: number
          semester_number: number
          start_date: string
          end_date: string
          fee_amount?: number
          registration_deadline?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          name?: string
          year?: number
          semester_number?: number
          start_date?: string
          end_date?: string
          fee_amount?: number
          registration_deadline?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      course_installment_plans: {
        Row: {
          id: string
          institution_id: string
          course_id: string | null
          name: string
          description: string | null
          num_installments: number
          installment_percentages: number[]
          is_template: boolean
          is_default: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          course_id?: string | null
          name: string
          description?: string | null
          num_installments: number
          installment_percentages: number[]
          is_template?: boolean
          is_default?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          course_id?: string | null
          name?: string
          description?: string | null
          num_installments?: number
          installment_percentages?: number[]
          is_template?: boolean
          is_default?: boolean
          is_active?: boolean
          created_at?: string
        }
      }
      student_course_fees: {
        Row: {
          id: string
          institution_id: string
          student_id: string
          enrollment_id: string
          course_id: string
          installment_plan_id: string | null
          total_course_fee: number
          installment_number: number
          installment_amount: number
          amount_paid: number
          balance: number
          due_date: string
          paid_date: string | null
          status: FeeStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          student_id: string
          enrollment_id: string
          course_id: string
          installment_plan_id?: string | null
          total_course_fee: number
          installment_number: number
          installment_amount: number
          amount_paid?: number
          due_date: string
          paid_date?: string | null
          status?: FeeStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          student_id?: string
          enrollment_id?: string
          course_id?: string
          installment_plan_id?: string | null
          total_course_fee?: number
          installment_number?: number
          installment_amount?: number
          amount_paid?: number
          due_date?: string
          paid_date?: string | null
          status?: FeeStatus
          created_at?: string
          updated_at?: string
        }
      }
      student_semester_fees: {
        Row: {
          id: string
          institution_id: string
          student_id: string
          semester_id: string
          amount_due: number
          amount_paid: number
          balance: number
          due_date: string
          paid_date: string | null
          status: FeeStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          student_id: string
          semester_id: string
          amount_due: number
          amount_paid?: number
          due_date: string
          paid_date?: string | null
          status?: FeeStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          student_id?: string
          semester_id?: string
          amount_due?: number
          amount_paid?: number
          due_date?: string
          paid_date?: string | null
          status?: FeeStatus
          created_at?: string
          updated_at?: string
        }
      }
      // Multi-Year Student Journey Tables
      academic_years: {
        Row: {
          id: string
          institution_id: string
          name: string
          year: number
          start_date: string
          end_date: string
          is_current: boolean
          registration_open_date: string | null
          registration_close_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          name: string
          year: number
          start_date: string
          end_date: string
          is_current?: boolean
          registration_open_date?: string | null
          registration_close_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          name?: string
          year?: number
          start_date?: string
          end_date?: string
          is_current?: boolean
          registration_open_date?: string | null
          registration_close_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      program_enrollments: {
        Row: {
          id: string
          institution_id: string
          student_id: string
          program_id: string
          intake_year: number
          cohort_name: string | null
          current_year: number
          status: ProgramEnrollmentStatus
          enrollment_date: string
          expected_completion_date: string | null
          actual_completion_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          student_id: string
          program_id: string
          intake_year: number
          cohort_name?: string | null
          current_year?: number
          status?: ProgramEnrollmentStatus
          enrollment_date?: string
          expected_completion_date?: string | null
          actual_completion_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          student_id?: string
          program_id?: string
          intake_year?: number
          cohort_name?: string | null
          current_year?: number
          status?: ProgramEnrollmentStatus
          enrollment_date?: string
          expected_completion_date?: string | null
          actual_completion_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      program_year_registrations: {
        Row: {
          id: string
          institution_id: string
          program_enrollment_id: string
          academic_year_id: string
          student_id: string
          year_of_study: number
          registration_status: YearRegistrationStatus
          year_status: YearCompletionStatus
          year_average: number | null
          credits_earned: number
          registration_fee_paid: boolean
          tuition_fee_generated: boolean
          registered_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          program_enrollment_id: string
          academic_year_id: string
          student_id: string
          year_of_study: number
          registration_status?: YearRegistrationStatus
          year_status?: YearCompletionStatus
          year_average?: number | null
          credits_earned?: number
          registration_fee_paid?: boolean
          tuition_fee_generated?: boolean
          registered_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          program_enrollment_id?: string
          academic_year_id?: string
          student_id?: string
          year_of_study?: number
          registration_status?: YearRegistrationStatus
          year_status?: YearCompletionStatus
          year_average?: number | null
          credits_earned?: number
          registration_fee_paid?: boolean
          tuition_fee_generated?: boolean
          registered_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      program_courses: {
        Row: {
          id: string
          institution_id: string
          program_id: string
          course_id: string
          year_of_study: number
          semester: number
          is_compulsory: boolean
          created_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          program_id: string
          course_id: string
          year_of_study: number
          semester?: number
          is_compulsory?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          program_id?: string
          course_id?: string
          year_of_study?: number
          semester?: number
          is_compulsory?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_institution_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_center_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      preview_student_number_format: {
        Args: { p_institution_id: string; p_format?: string }
        Returns: string
      }
      get_institution_stats: {
        Args: { p_institution_id: string }
        Returns: {
          total_students: number
          active_students: number
          total_lecturers: number
          active_lecturers: number
          total_courses: number
          active_courses: number
          total_programs: number
        }
      }
      get_nqf_level_name: {
        Args: { p_level: number }
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      institution_status: InstitutionStatus
      student_status: StudentStatus
      lecturer_status: LecturerStatus
      payment_status: PaymentStatus
      gender: Gender
      room_type: RoomType
      hostel_student_status: HostelStudentStatus
      institution_type: InstitutionType
      qualification_type: QualificationType
      fee_model_type: FeeModelType
      fee_status: FeeStatus
      program_enrollment_status: ProgramEnrollmentStatus
      year_registration_status: YearRegistrationStatus
      year_completion_status: YearCompletionStatus
    }
  }
}

// Helper types for easier usage - Updated names
export type Institution = Database['public']['Tables']['institutions']['Row']
export type InstitutionInsert = Database['public']['Tables']['institutions']['Insert']
export type InstitutionUpdate = Database['public']['Tables']['institutions']['Update']

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Student = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']

export type Lecturer = Database['public']['Tables']['lecturers']['Row']
export type LecturerInsert = Database['public']['Tables']['lecturers']['Insert']
export type LecturerUpdate = Database['public']['Tables']['lecturers']['Update']

export type Course = Database['public']['Tables']['courses']['Row']
export type CourseInsert = Database['public']['Tables']['courses']['Insert']
export type CourseUpdate = Database['public']['Tables']['courses']['Update']

export type Program = Database['public']['Tables']['programs']['Row']
export type ProgramInsert = Database['public']['Tables']['programs']['Insert']
export type ProgramUpdate = Database['public']['Tables']['programs']['Update']

export type StudentEnrollment = Database['public']['Tables']['student_enrollments']['Row']
export type StudentEnrollmentInsert = Database['public']['Tables']['student_enrollments']['Insert']
export type StudentEnrollmentUpdate = Database['public']['Tables']['student_enrollments']['Update']

export type LecturerCourse = Database['public']['Tables']['lecturer_courses']['Row']
export type LecturerCourseInsert = Database['public']['Tables']['lecturer_courses']['Insert']
export type LecturerCourseUpdate = Database['public']['Tables']['lecturer_courses']['Update']

export type StudentNumberSequence = Database['public']['Tables']['student_number_sequences']['Row']
export type StudentNumberSequenceInsert = Database['public']['Tables']['student_number_sequences']['Insert']
export type StudentNumberSequenceUpdate = Database['public']['Tables']['student_number_sequences']['Update']

export type FeeStructure = Database['public']['Tables']['fee_structures']['Row']
export type FeeStructureInsert = Database['public']['Tables']['fee_structures']['Insert']
export type FeeStructureUpdate = Database['public']['Tables']['fee_structures']['Update']

export type StudentFee = Database['public']['Tables']['student_fees']['Row']
export type StudentFeeInsert = Database['public']['Tables']['student_fees']['Insert']
export type StudentFeeUpdate = Database['public']['Tables']['student_fees']['Update']

export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']

export type HostelBlock = Database['public']['Tables']['hostel_blocks']['Row']
export type HostelBlockInsert = Database['public']['Tables']['hostel_blocks']['Insert']
export type HostelBlockUpdate = Database['public']['Tables']['hostel_blocks']['Update']

export type HostelRoom = Database['public']['Tables']['hostel_rooms']['Row']
export type HostelRoomInsert = Database['public']['Tables']['hostel_rooms']['Insert']
export type HostelRoomUpdate = Database['public']['Tables']['hostel_rooms']['Update']

export type HostelAllocation = Database['public']['Tables']['hostel_allocations']['Row']
export type HostelAllocationInsert = Database['public']['Tables']['hostel_allocations']['Insert']
export type HostelAllocationUpdate = Database['public']['Tables']['hostel_allocations']['Update']

export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']
export type AuditLogUpdate = Database['public']['Tables']['audit_logs']['Update']

export type Refund = Database['public']['Tables']['refunds']['Row']
export type RefundInsert = Database['public']['Tables']['refunds']['Insert']
export type RefundUpdate = Database['public']['Tables']['refunds']['Update']

export type Grade = Database['public']['Tables']['grades']['Row']
export type GradeInsert = Database['public']['Tables']['grades']['Insert']
export type GradeUpdate = Database['public']['Tables']['grades']['Update']

export type Transcript = Database['public']['Tables']['report_cards']['Row']
export type TranscriptInsert = Database['public']['Tables']['report_cards']['Insert']
export type TranscriptUpdate = Database['public']['Tables']['report_cards']['Update']

// Fee Model Types
export type Semester = Database['public']['Tables']['semesters']['Row']
export type SemesterInsert = Database['public']['Tables']['semesters']['Insert']
export type SemesterUpdate = Database['public']['Tables']['semesters']['Update']

export type CourseInstallmentPlan = Database['public']['Tables']['course_installment_plans']['Row']
export type CourseInstallmentPlanInsert = Database['public']['Tables']['course_installment_plans']['Insert']
export type CourseInstallmentPlanUpdate = Database['public']['Tables']['course_installment_plans']['Update']

export type StudentCourseFee = Database['public']['Tables']['student_course_fees']['Row']
export type StudentCourseFeeInsert = Database['public']['Tables']['student_course_fees']['Insert']
export type StudentCourseFeeUpdate = Database['public']['Tables']['student_course_fees']['Update']

export type StudentSemesterFee = Database['public']['Tables']['student_semester_fees']['Row']
export type StudentSemesterFeeInsert = Database['public']['Tables']['student_semester_fees']['Insert']
export type StudentSemesterFeeUpdate = Database['public']['Tables']['student_semester_fees']['Update']

// Multi-Year Student Journey Types
export type AcademicYear = Database['public']['Tables']['academic_years']['Row']
export type AcademicYearInsert = Database['public']['Tables']['academic_years']['Insert']
export type AcademicYearUpdate = Database['public']['Tables']['academic_years']['Update']

export type ProgramEnrollment = Database['public']['Tables']['program_enrollments']['Row']
export type ProgramEnrollmentInsert = Database['public']['Tables']['program_enrollments']['Insert']
export type ProgramEnrollmentUpdate = Database['public']['Tables']['program_enrollments']['Update']

export type ProgramYearRegistration = Database['public']['Tables']['program_year_registrations']['Row']
export type ProgramYearRegistrationInsert = Database['public']['Tables']['program_year_registrations']['Insert']
export type ProgramYearRegistrationUpdate = Database['public']['Tables']['program_year_registrations']['Update']

export type ProgramCourse = Database['public']['Tables']['program_courses']['Row']
export type ProgramCourseInsert = Database['public']['Tables']['program_courses']['Insert']
export type ProgramCourseUpdate = Database['public']['Tables']['program_courses']['Update']

// Extended types with relations for multi-year journey
export interface ProgramEnrollmentWithRelations extends ProgramEnrollment {
  student?: Student
  program?: Program
  year_registrations?: ProgramYearRegistration[]
}

export interface ProgramYearRegistrationWithRelations extends ProgramYearRegistration {
  academic_year?: AcademicYear
  program_enrollment?: ProgramEnrollment
  student?: Student
  enrollments?: StudentEnrollment[]
}

export interface StudentTranscriptYear {
  year_of_study: number
  academic_year: AcademicYear
  year_registration: ProgramYearRegistration
  courses: Array<{
    course: Course
    grades: Grade[]
    final_grade?: string
    final_percentage?: number
  }>
  year_average?: number
  credits_earned: number
  year_status: YearCompletionStatus
}

export interface StudentTranscript {
  student: Student
  program: Program
  program_enrollment: ProgramEnrollment
  years: StudentTranscriptYear[]
  cumulative_average?: number
  total_credits_earned: number
  total_credits_required?: number
  completion_status: ProgramEnrollmentStatus
}

// Legacy type aliases for backward compatibility
export type TutorialCenter = Institution
export type TutorialCenterInsert = InstitutionInsert
export type TutorialCenterUpdate = InstitutionUpdate

export type Teacher = Lecturer
export type TeacherInsert = LecturerInsert
export type TeacherUpdate = LecturerUpdate

export type Subject = Course
export type SubjectInsert = CourseInsert
export type SubjectUpdate = CourseUpdate
