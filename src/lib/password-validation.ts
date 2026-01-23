/**
 * Password Validation Utility
 * Enforces strong password policy for all user accounts
 */

export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Optional: can enable later
}

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

/**
 * Validates a password against the security policy
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  // Check minimum length
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`)
  }

  // Check for uppercase letter
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  // Check for lowercase letter
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  // Check for number
  if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  // Check for special character (if enabled)
  if (PASSWORD_POLICY.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Calculate password strength
  let strengthScore = 0
  if (password.length >= 8) strengthScore++
  if (password.length >= 12) strengthScore++
  if (/[A-Z]/.test(password)) strengthScore++
  if (/[a-z]/.test(password)) strengthScore++
  if (/[0-9]/.test(password)) strengthScore++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strengthScore++

  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (strengthScore >= 5) strength = 'strong'
  else if (strengthScore >= 3) strength = 'medium'

  return {
    valid: errors.length === 0,
    errors,
    strength,
  }
}

/**
 * Returns a user-friendly password requirements message
 */
export function getPasswordRequirements(): string[] {
  const requirements: string[] = []

  requirements.push(`At least ${PASSWORD_POLICY.minLength} characters`)

  if (PASSWORD_POLICY.requireUppercase) {
    requirements.push('At least one uppercase letter (A-Z)')
  }

  if (PASSWORD_POLICY.requireLowercase) {
    requirements.push('At least one lowercase letter (a-z)')
  }

  if (PASSWORD_POLICY.requireNumber) {
    requirements.push('At least one number (0-9)')
  }

  if (PASSWORD_POLICY.requireSpecialChar) {
    requirements.push('At least one special character (!@#$%^&*)')
  }

  return requirements
}

/**
 * Validates password for API responses
 * Returns error message string or null if valid
 */
export function validatePasswordForAPI(password: string): string | null {
  const result = validatePassword(password)

  if (!result.valid) {
    return result.errors.join('. ')
  }

  return null
}
