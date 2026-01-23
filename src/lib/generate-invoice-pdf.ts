import { jsPDF } from 'jspdf'
import { formatCurrency, formatDate as formatCurrencyDate, CURRENCY_CONFIG } from './currency'

interface ClientData {
  business_name: string
  trading_as: string | null
  contact_person: string
  email: string | null
  phone: string
  physical_address: string | null
  city: string | null
}

interface PaymentData {
  id: string
  payment_type: string
  amount: number
  period_month: number | null
  period_year: number | null
  payment_date: string
  payment_method: string | null
  reference_number: string | null
  notes: string | null
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  setup_fee: 'Setup Fee - System Configuration & Training',
  monthly_sms: 'Monthly School Management System Subscription',
  website_renewal: 'Annual Website Domain & Hosting Renewal',
  other: 'Other Services',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer / EFT',
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  card: 'Card Payment',
  other: 'Other',
}

export function generateInvoicePDF(client: ClientData, payment: PaymentData, invoiceNumber?: string) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  // Use the centralized currency formatting
  const formatAmount = (amount: number) => formatCurrency(amount)
  const formatPaymentDate = (date: string) => formatCurrencyDate(date)

  const getMonthName = (month: number) => {
    return new Date(2024, month - 1).toLocaleString('en', { month: 'long' })
  }

  // Generate invoice number if not provided
  const invNumber = invoiceNumber || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

  // === HEADER ===
  doc.setFillColor(30, 64, 175) // Blue color
  doc.rect(0, 0, pageWidth, 50, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('RECEIPT', margin, 30)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('SA Tutorial Centres', pageWidth - margin, 20, { align: 'right' })
  doc.text('support@satutorialcentres.co.za', pageWidth - margin, 27, { align: 'right' })
  doc.text('VAT: 123456789', pageWidth - margin, 34, { align: 'right' })
  doc.text('South Africa', pageWidth - margin, 41, { align: 'right' })

  // Reset text color
  doc.setTextColor(0, 0, 0)
  y = 65

  // === RECEIPT INFO ===
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Receipt Number:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(invNumber, margin + 40, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Date:', pageWidth / 2 + 20, y)
  doc.setFont('helvetica', 'normal')
  doc.text(formatPaymentDate(payment.payment_date), pageWidth / 2 + 40, y)

  y += 15

  // === BILL TO ===
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y - 5, pageWidth - 2 * margin, 40, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('BILLED TO:', margin + 5, y + 5)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.text(client.business_name, margin + 5, y)
  y += 6
  if (client.trading_as) {
    doc.text(`t/a ${client.trading_as}`, margin + 5, y)
    y += 6
  }
  doc.text(`Attn: ${client.contact_person}`, margin + 5, y)
  y += 6
  if (client.physical_address) {
    doc.text(client.physical_address + (client.city ? `, ${client.city}` : ''), margin + 5, y)
    y += 6
  }
  if (client.phone) {
    doc.text(`Tel: ${client.phone}`, margin + 5, y)
  }

  y += 20

  // === PAYMENT DETAILS TABLE ===
  // Table Header
  doc.setFillColor(30, 64, 175)
  doc.rect(margin, y, pageWidth - 2 * margin, 10, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Description', margin + 5, y + 7)
  doc.text('Amount', pageWidth - margin - 5, y + 7, { align: 'right' })

  doc.setTextColor(0, 0, 0)
  y += 15

  // Table Row
  doc.setFont('helvetica', 'normal')
  let description = PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type

  // Add period info for monthly payments
  if (payment.payment_type === 'monthly_sms' && payment.period_month && payment.period_year) {
    description += `\n${getMonthName(payment.period_month)} ${payment.period_year}`
  }

  const descLines = doc.splitTextToSize(description, 120)
  descLines.forEach((line: string, index: number) => {
    if (index === 0) {
      doc.setFont('helvetica', 'bold')
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
    }
    doc.text(line, margin + 5, y)
    if (index < descLines.length - 1) y += 5
  })

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(formatAmount(payment.amount), pageWidth - margin - 5, y, { align: 'right' })

  y += 10

  // Divider line
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)

  y += 10

  // === TOTAL ===
  doc.setFillColor(245, 245, 245)
  doc.rect(pageWidth / 2, y - 5, pageWidth / 2 - margin, 20, 'F')

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL PAID:', pageWidth / 2 + 10, y + 7)
  doc.setTextColor(30, 64, 175)
  doc.text(formatAmount(payment.amount), pageWidth - margin - 5, y + 7, { align: 'right' })

  doc.setTextColor(0, 0, 0)
  y += 30

  // === PAYMENT INFO ===
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Payment Information:', margin, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.text(`Payment Method: ${PAYMENT_METHOD_LABELS[payment.payment_method || 'other'] || payment.payment_method || 'Not specified'}`, margin, y)
  y += 6

  if (payment.reference_number) {
    doc.text(`Reference Number: ${payment.reference_number}`, margin, y)
    y += 6
  }

  if (payment.notes) {
    doc.text(`Notes: ${payment.notes}`, margin, y)
    y += 6
  }

  y += 15

  // === THANK YOU MESSAGE ===
  doc.setFillColor(240, 253, 244) // Light green
  doc.rect(margin, y - 5, pageWidth - 2 * margin, 25, 'F')

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 163, 74) // Green
  doc.text('Thank you for your payment!', pageWidth / 2, y + 5, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('We appreciate your business and look forward to serving you.', pageWidth / 2, y + 15, { align: 'center' })

  doc.setTextColor(0, 0, 0)

  // === FOOTER ===
  const footerY = doc.internal.pageSize.getHeight() - 30

  doc.setDrawColor(200, 200, 200)
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10)

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('SA Tutorial Centres', pageWidth / 2, footerY, { align: 'center' })
  doc.text('Empowering Education Through Technology', pageWidth / 2, footerY + 6, { align: 'center' })
  doc.text(`Generated on ${formatPaymentDate(new Date().toISOString())}`, pageWidth / 2, footerY + 12, { align: 'center' })

  return doc
}

export function downloadInvoicePDF(client: ClientData, payment: PaymentData, invoiceNumber?: string) {
  const doc = generateInvoicePDF(client, payment, invoiceNumber)
  const fileName = `Receipt_${client.business_name.replace(/\s+/g, '_')}_${payment.payment_date}.pdf`
  doc.save(fileName)
}

export function printInvoicePDF(client: ClientData, payment: PaymentData, invoiceNumber?: string) {
  const doc = generateInvoicePDF(client, payment, invoiceNumber)
  doc.autoPrint()
  window.open(doc.output('bloburl'), '_blank')
}
