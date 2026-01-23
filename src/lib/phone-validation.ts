/**
 * South African phone number validation utilities
 */

// South African phone number regex patterns
const SA_PHONE_PATTERNS = {
  // Mobile: 060-089 (various networks)
  mobile: /^(\+?27|0)(6[0-9]|7[0-9]|8[0-9])[0-9]{7}$/,
  // Landline: Geographic codes
  landline: /^(\+?27|0)(1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])[0-9]{7}$/,
  // Generic SA number (any valid format)
  any: /^(\+?27|0)[0-9]{9}$/,
}

/**
 * Normalize a phone number by removing spaces, dashes, and other formatting
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, '')
}

/**
 * Validate a South African phone number
 * @param phone - The phone number to validate
 * @param strict - If true, only accepts mobile numbers (06x, 07x, 08x)
 * @returns True if valid, false otherwise
 */
export function isValidSAPhoneNumber(phone: string, strict = false): boolean {
  if (!phone) return true // Empty is valid (optional field)

  const normalized = normalizePhoneNumber(phone)

  if (strict) {
    return SA_PHONE_PATTERNS.mobile.test(normalized)
  }

  return SA_PHONE_PATTERNS.any.test(normalized)
}

/**
 * Format a phone number to the standard SA format
 * @param phone - The phone number to format
 * @param international - If true, use +27 format, otherwise use 0 format
 * @returns Formatted phone number or original if invalid
 */
export function formatSAPhoneNumber(phone: string, international = false): string {
  if (!phone) return ''

  const normalized = normalizePhoneNumber(phone)

  if (!SA_PHONE_PATTERNS.any.test(normalized)) {
    return phone // Return original if invalid
  }

  // Extract the 9-digit number part
  let digits: string
  if (normalized.startsWith('+27')) {
    digits = normalized.slice(3)
  } else if (normalized.startsWith('27') && normalized.length === 11) {
    digits = normalized.slice(2)
  } else if (normalized.startsWith('0')) {
    digits = normalized.slice(1)
  } else {
    digits = normalized
  }

  if (international) {
    return `+27 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  }

  return `0${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
}

/**
 * Get validation error message for phone number
 */
export function getPhoneValidationError(phone: string, fieldName = 'Phone number'): string | null {
  if (!phone) return null // Empty is valid

  const normalized = normalizePhoneNumber(phone)

  if (!SA_PHONE_PATTERNS.any.test(normalized)) {
    return `${fieldName} must be a valid South African number (e.g., 082 123 4567 or +27 82 123 4567)`
  }

  return null
}

/**
 * Validate multiple phone fields and return all errors
 */
export function validatePhoneFields(
  fields: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const [fieldName, value] of Object.entries(fields)) {
    const error = getPhoneValidationError(value, fieldName)
    if (error) {
      errors[fieldName] = error
    }
  }

  return errors
}
