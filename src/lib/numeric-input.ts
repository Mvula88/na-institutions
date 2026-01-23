/**
 * Utility functions for handling numeric inputs without leading zeros
 * Use these to prevent UX issues where users see "0500" instead of "500"
 */

/**
 * Parse numeric input string, removing leading zeros
 * @param value - The input value string
 * @returns Parsed number (0 if invalid)
 */
export function parseNumericInput(value: string): number {
  // Remove any non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '')
  // Remove leading zeros but keep "0" as valid
  const withoutLeadingZeros = cleaned.replace(/^0+(?=\d)/, '')
  const parsed = parseFloat(withoutLeadingZeros)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format number for display in input field (removes leading zeros)
 * Returns empty string for 0 to show placeholder
 * @param value - The number value
 * @returns Formatted string for input display
 */
export function formatNumericValue(value: number): string {
  return value === 0 ? '' : value.toString()
}

/**
 * Format number for display, keeping 0 visible
 * @param value - The number value
 * @returns Formatted string with 0 shown
 */
export function formatNumericValueWithZero(value: number): string {
  return value.toString()
}

/**
 * Parse integer input, removing leading zeros
 * @param value - The input value string
 * @returns Parsed integer (0 if invalid)
 */
export function parseIntegerInput(value: string): number {
  // Remove any non-numeric characters
  const cleaned = value.replace(/\D/g, '')
  // Remove leading zeros but keep "0" as valid
  const withoutLeadingZeros = cleaned.replace(/^0+(?=\d)/, '')
  const parsed = parseInt(withoutLeadingZeros, 10)
  return isNaN(parsed) ? 0 : parsed
}
