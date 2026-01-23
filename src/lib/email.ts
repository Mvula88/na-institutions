/**
 * Email Service with Resend
 * Handles all transactional emails for the application
 */

import { Resend } from 'resend'

// Lazy initialize Resend to avoid build errors when env vars not set
let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'InstituX <noreply@institux.com>'

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(
  to: string,
  data: {
    userName: string
    institutionName: string
    loginUrl?: string
  }
): Promise<SendEmailResult> {
  try {
    const resend = getResend()

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Welcome to InstituX - ${data.institutionName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to InstituX</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1E40AF; margin: 0;">InstituX</h1>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #1E40AF;">Welcome, ${data.userName}!</h2>
            <p>Thank you for registering <strong>${data.institutionName}</strong> with InstituX.</p>
            <p>Your 14-day free trial has started. You can now:</p>
            <ul style="padding-left: 20px;">
              <li>Add and manage students</li>
              <li>Track fees and payments</li>
              <li>Generate invoices and receipts</li>
              <li>Access reports and analytics</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl || process.env.NEXT_PUBLIC_APP_URL + '/login'}"
               style="display: inline-block; background: #1E40AF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Go to Dashboard
            </a>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 14px;">
            <p>If you have any questions, reply to this email or contact us at support@institux.com</p>
            <p style="margin-bottom: 0;">&copy; ${new Date().getFullYear()} InstituX. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Error sending welcome email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: result?.id }
  } catch (error) {
    console.error('Exception sending welcome email:', error)
    return { success: false, error: 'Failed to send welcome email' }
  }
}

/**
 * Send a payment receipt email
 */
export async function sendPaymentReceiptEmail(
  to: string,
  data: {
    studentName: string
    amount: number
    paymentDate: string
    paymentMethod: string
    referenceNumber?: string
    institutionName: string
    institutionPhone?: string
    institutionEmail?: string
  }
): Promise<SendEmailResult> {
  try {
    const resend = getResend()

    const formattedAmount = new Intl.NumberFormat('en-NA', {
      style: 'currency',
      currency: 'NAD',
    }).format(data.amount)

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Payment Receipt - ${data.studentName} - ${formattedAmount}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Receipt</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1E40AF; margin: 0;">${data.institutionName}</h1>
            <p style="color: #64748b; margin: 5px 0;">Payment Receipt</p>
          </div>

          <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
            <p style="margin: 0; color: #166534; font-size: 14px;">Payment Received</p>
            <p style="margin: 10px 0 0; font-size: 32px; font-weight: bold; color: #166534;">${formattedAmount}</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Student</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${data.studentName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Date</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${data.paymentDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Method</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${data.paymentMethod}</td>
              </tr>
              ${data.referenceNumber ? `
              <tr>
                <td style="padding: 10px 0; color: #64748b;">Reference</td>
                <td style="padding: 10px 0; text-align: right; font-family: monospace;">${data.referenceNumber}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 14px;">
            <p><strong>${data.institutionName}</strong></p>
            ${data.institutionPhone ? `<p style="margin: 5px 0;">Phone: ${data.institutionPhone}</p>` : ''}
            ${data.institutionEmail ? `<p style="margin: 5px 0;">Email: ${data.institutionEmail}</p>` : ''}
            <p style="margin-top: 20px; font-size: 12px;">This is an automated receipt. Please keep it for your records.</p>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Error sending payment receipt:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: result?.id }
  } catch (error) {
    console.error('Exception sending payment receipt:', error)
    return { success: false, error: 'Failed to send payment receipt' }
  }
}

/**
 * Send a fee reminder email
 */
export async function sendFeeReminderEmail(
  to: string,
  data: {
    parentName: string
    studentName: string
    totalOutstanding: number
    fees: {
      description: string
      amount: number
      dueDate: string
    }[]
    institutionName: string
    institutionPhone?: string
    institutionEmail?: string
    paymentUrl?: string
  }
): Promise<SendEmailResult> {
  try {
    const resend = getResend()

    const formattedTotal = new Intl.NumberFormat('en-NA', {
      style: 'currency',
      currency: 'NAD',
    }).format(data.totalOutstanding)

    const feeRows = data.fees
      .map(
        (fee) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${fee.description}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${fee.dueDate}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">N$${fee.amount.toFixed(2)}</td>
        </tr>
      `
      )
      .join('')

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Fee Reminder - ${data.studentName} - ${formattedTotal} Outstanding`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fee Reminder</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1E40AF; margin: 0;">${data.institutionName}</h1>
            <p style="color: #64748b; margin: 5px 0;">Fee Reminder</p>
          </div>

          <p>Dear ${data.parentName},</p>

          <p>This is a friendly reminder that there are outstanding fees for <strong>${data.studentName}</strong>.</p>

          <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #dc2626; font-size: 14px;">Total Outstanding</p>
            <p style="margin: 10px 0 0; font-size: 32px; font-weight: bold; color: #dc2626;">${formattedTotal}</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #e2e8f0;">
                  <th style="padding: 12px 10px; text-align: left; font-weight: 600;">Description</th>
                  <th style="padding: 12px 10px; text-align: left; font-weight: 600;">Due Date</th>
                  <th style="padding: 12px 10px; text-align: right; font-weight: 600;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${feeRows}
              </tbody>
            </table>
          </div>

          <p>Please make payment at your earliest convenience to avoid any disruption to ${data.studentName}'s courses.</p>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 14px;">
            <p><strong>${data.institutionName}</strong></p>
            ${data.institutionPhone ? `<p style="margin: 5px 0;">Phone: ${data.institutionPhone}</p>` : ''}
            ${data.institutionEmail ? `<p style="margin: 5px 0;">Email: ${data.institutionEmail}</p>` : ''}
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Error sending fee reminder:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: result?.id }
  } catch (error) {
    console.error('Exception sending fee reminder:', error)
    return { success: false, error: 'Failed to send fee reminder' }
  }
}

/**
 * Send a generic email
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<SendEmailResult> {
  try {
    const resend = getResend()

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Error sending email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: result?.id }
  } catch (error) {
    console.error('Exception sending email:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}
