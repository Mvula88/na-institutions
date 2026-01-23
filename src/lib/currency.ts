// Currency configuration for Namibian market
// This centralizes all currency-related formatting and settings

export interface CurrencyConfig {
  code: string
  symbol: string
  locale: string
  name: string
}

// Namibian Dollar configuration
export const CURRENCY_CONFIG: CurrencyConfig = {
  code: 'NAD',
  symbol: 'N$',
  locale: 'en-NA',
  name: 'Namibian Dollar',
}

/**
 * Format a number as currency using the configured currency settings
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "N$ 1,234.56")
 */
export function formatCurrency(
  amount: number,
  options?: {
    showDecimals?: boolean
    compact?: boolean
  }
): string {
  const { showDecimals = true, compact = false } = options || {}

  if (compact && amount >= 1000) {
    const formatted = new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(amount)
    return `${CURRENCY_CONFIG.symbol} ${formatted}`
  }

  const formatted = amount.toLocaleString(CURRENCY_CONFIG.locale, {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })

  return `${CURRENCY_CONFIG.symbol} ${formatted}`
}

/**
 * Parse a currency string back to a number
 * @param value - The currency string to parse
 * @returns The numeric value
 */
export function parseCurrency(value: string): number {
  // Remove currency symbol, spaces, and thousand separators
  const cleanValue = value
    .replace(CURRENCY_CONFIG.symbol, '')
    .replace(/\s/g, '')
    .replace(/,/g, '')
  const parsed = parseFloat(cleanValue)
  if (!Number.isFinite(parsed)) return 0
  return roundCurrency(parsed)
}

/**
 * Round a number to 2 decimal places for currency precision
 * This avoids JavaScript floating point arithmetic errors (e.g., 0.1 + 0.2 != 0.3)
 * @param amount - The amount to round
 * @returns The amount rounded to 2 decimal places
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Add two currency amounts with proper precision
 * @param a - First amount
 * @param b - Second amount
 * @returns Sum rounded to 2 decimal places
 */
export function addCurrency(a: number, b: number): number {
  return roundCurrency(a + b)
}

/**
 * Subtract two currency amounts with proper precision
 * @param a - Amount to subtract from
 * @param b - Amount to subtract
 * @returns Difference rounded to 2 decimal places
 */
export function subtractCurrency(a: number, b: number): number {
  return roundCurrency(a - b)
}

/**
 * Multiply a currency amount with proper precision
 * @param amount - The amount
 * @param multiplier - The multiplier
 * @returns Product rounded to 2 decimal places
 */
export function multiplyCurrency(amount: number, multiplier: number): number {
  return roundCurrency(amount * multiplier)
}

/**
 * Format a date using Namibian locale
 * @param date - The date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  return dateObj.toLocaleDateString(CURRENCY_CONFIG.locale, options || defaultOptions)
}

/**
 * Get current UTC timestamp as ISO string
 * Use this instead of new Date().toISOString() for consistency
 * @returns ISO 8601 formatted UTC timestamp
 */
export function getUTCTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Get a UTC date with added days
 * @param days - Number of days to add (can be negative)
 * @returns ISO 8601 formatted UTC timestamp
 */
export function getUTCDateWithOffset(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

/**
 * Get a UTC date with added minutes
 * @param minutes - Number of minutes to add (can be negative)
 * @returns ISO 8601 formatted UTC timestamp
 */
export function getUTCDateWithMinutes(minutes: number): string {
  const date = new Date()
  date.setUTCMinutes(date.getUTCMinutes() + minutes)
  return date.toISOString()
}

/**
 * Get VAT amount (15% standard rate)
 * @param amount - The base amount
 * @returns The VAT amount rounded to 2 decimal places
 */
export function getVATAmount(amount: number): number {
  return roundCurrency(amount * 0.15)
}

/**
 * Get amount including VAT (15% standard rate)
 * @param amount - The base amount (excluding VAT)
 * @returns The total amount including VAT rounded to 2 decimal places
 */
export function getAmountWithVAT(amount: number): number {
  return roundCurrency(amount * 1.15)
}

/**
 * Get amount excluding VAT from a VAT-inclusive amount
 * @param amountWithVAT - The amount including VAT
 * @returns The base amount excluding VAT rounded to 2 decimal places
 */
export function getAmountExcludingVAT(amountWithVAT: number): number {
  return roundCurrency(amountWithVAT / 1.15)
}

// VAT rate (15%)
export const VAT_RATE = 0.15
export const VAT_PERCENTAGE = 15
