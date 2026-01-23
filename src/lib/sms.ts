/**
 * SMS Service with Clickatell
 * Handles SMS notifications for payment receipts and fee reminders
 */

const CLICKATELL_API_URL = 'https://platform.clickatell.com/messages/http/send'

export interface SendSMSResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Format South African phone number to international format
 */
function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, and other characters
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')

  // Convert local format to international
  if (cleaned.startsWith('0')) {
    cleaned = '27' + cleaned.substring(1)
  } else if (cleaned.startsWith('+27')) {
    cleaned = cleaned.substring(1)
  } else if (!cleaned.startsWith('27')) {
    cleaned = '27' + cleaned
  }

  return cleaned
}

/**
 * Send an SMS via Clickatell
 */
export async function sendSMS(to: string, message: string): Promise<SendSMSResult> {
  try {
    const apiKey = process.env.CLICKATELL_API_KEY

    if (!apiKey) {
      console.warn('CLICKATELL_API_KEY is not configured')
      return { success: false, error: 'SMS service not configured' }
    }

    const formattedPhone = formatPhoneNumber(to)

    // Truncate message to SMS limit (160 chars for single SMS)
    const truncatedMessage = message.length > 160 ? message.substring(0, 157) + '...' : message

    const params = new URLSearchParams({
      apiKey,
      to: formattedPhone,
      content: truncatedMessage,
    })

    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch(`${CLICKATELL_API_URL}?${params.toString()}`, {
        method: 'GET',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const responseText = await response.text()

      if (!response.ok) {
        console.error('Clickatell API error:', responseText)
        return { success: false, error: `SMS API error: ${response.status}` }
      }

      // Clickatell returns "ID: xxx" on success or "ERR: xxx" on failure
      if (responseText.startsWith('ID:')) {
        const messageId = responseText.replace('ID:', '').trim()
        return { success: true, messageId }
      } else if (responseText.startsWith('ERR:')) {
        const errorCode = responseText.replace('ERR:', '').trim()
        return { success: false, error: `Clickatell error: ${errorCode}` }
      }

      // Handle JSON response format (newer API version)
      try {
        const jsonResponse = JSON.parse(responseText)
        if (jsonResponse.messages?.[0]?.apiMessageId) {
          return { success: true, messageId: jsonResponse.messages[0].apiMessageId }
        }
        if (jsonResponse.error) {
          return { success: false, error: jsonResponse.error }
        }
      } catch {
        // Not JSON, continue with text handling
      }

      return { success: true }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('SMS request timed out')
        return { success: false, error: 'SMS request timed out' }
      }
      throw fetchError // Re-throw other errors to be caught by outer catch
    }
  } catch (error) {
    console.error('Exception sending SMS:', error)
    return { success: false, error: 'Failed to send SMS' }
  }
}

/**
 * Send payment received SMS notification
 */
export async function sendPaymentReceivedSMS(
  phone: string,
  data: {
    studentName: string
    amount: number
    institutionName: string
  }
): Promise<SendSMSResult> {
  const formattedAmount = `N$${data.amount.toFixed(2)}`
  const message = `${data.institutionName}: Payment of ${formattedAmount} received for ${data.studentName}. Thank you!`

  return sendSMS(phone, message)
}

/**
 * Send fee reminder SMS notification
 */
export async function sendFeeReminderSMS(
  phone: string,
  data: {
    studentName: string
    amount: number
    institutionName: string
    dueDate?: string
  }
): Promise<SendSMSResult> {
  const formattedAmount = `N$${data.amount.toFixed(2)}`
  const dueDateText = data.dueDate ? ` due ${data.dueDate}` : ''
  const message = `${data.institutionName}: Reminder - ${formattedAmount} outstanding${dueDateText} for ${data.studentName}. Please pay to avoid disruption.`

  return sendSMS(phone, message)
}

/**
 * Send room allocation SMS notification
 */
export async function sendRoomAllocationSMS(
  phone: string,
  data: {
    studentName: string
    roomNumber: string
    blockName: string
    institutionName: string
  }
): Promise<SendSMSResult> {
  const message = `${data.institutionName}: ${data.studentName} has been allocated to Room ${data.roomNumber} in ${data.blockName}.`

  return sendSMS(phone, message)
}

/**
 * Send generic notification SMS
 */
export async function sendNotificationSMS(
  phone: string,
  institutionName: string,
  message: string
): Promise<SendSMSResult> {
  const fullMessage = `${institutionName}: ${message}`
  return sendSMS(phone, fullMessage)
}

/**
 * Check if SMS service is configured
 */
export function isSMSConfigured(): boolean {
  return !!process.env.CLICKATELL_API_KEY
}

/**
 * Validate phone number format
 */
export function isValidSAPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  // Match South African mobile numbers
  return /^(\+?27|0)(6[0-9]|7[0-9]|8[0-9])[0-9]{7}$/.test(cleaned)
}
