import { jsPDF } from 'jspdf'

interface ClientData {
  business_name: string
  trading_as: string | null
  contact_person: string
  email: string | null
  phone: string
  physical_address: string | null
  city: string | null
  has_website: boolean
  has_school_management: boolean
  website_domain: string | null
  contract_start_date: string
  setup_fee: number
  monthly_sms_fee: number
  annual_website_fee: number
}

export function generateContractPDF(client: ClientData) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = 20

  const formatCurrency = (amount: number) => `R ${amount.toFixed(2)}`
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Helper functions
  const addTitle = (text: string, size = 16) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'bold')
    doc.text(text, pageWidth / 2, y, { align: 'center' })
    y += size * 0.5
  }

  const addSubtitle = (text: string, size = 12) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'bold')
    doc.text(text, pageWidth / 2, y, { align: 'center' })
    y += size * 0.4
  }

  const addSectionHeader = (text: string) => {
    checkPageBreak(15)
    y += 5
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += 7
  }

  const addParagraph = (text: string, indent = 0) => {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(text, contentWidth - indent)
    lines.forEach((line: string) => {
      checkPageBreak(6)
      doc.text(line, margin + indent, y)
      y += 5
    })
  }

  const addBullet = (text: string, indent = 5) => {
    checkPageBreak(6)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('•', margin + indent, y)
    const lines = doc.splitTextToSize(text, contentWidth - indent - 8)
    lines.forEach((line: string, index: number) => {
      if (index > 0) checkPageBreak(5)
      doc.text(line, margin + indent + 8, y)
      if (index < lines.length - 1) y += 5
    })
    y += 5
  }

  const addFieldLine = (label: string, value: string) => {
    checkPageBreak(8)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value || '_'.repeat(40), margin + 50, y)
    y += 7
  }

  const addLine = () => {
    y += 2
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5
  }

  const checkPageBreak = (neededSpace: number) => {
    if (y + neededSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      y = 20
    }
  }

  // === PAGE 1: HEADER & PARTIES ===
  addTitle('SERVICE AGREEMENT')
  y += 3
  addSubtitle('SCHOOL MANAGEMENT SYSTEM & WEBSITE SERVICES')
  y += 5
  addLine()
  y += 5

  // BETWEEN Section
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('BETWEEN:', margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('SA Tutorial Centres (Pty) Ltd', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text('(hereinafter referred to as "the Service Provider")', margin + 55, y)
  y += 6
  doc.text('Contact: support@satutorialcentres.co.za', margin, y)
  y += 5
  doc.text('South Africa', margin, y)
  y += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('AND:', margin, y)
  y += 8

  addFieldLine('Client Name:', client.business_name)
  addFieldLine('Trading As:', client.trading_as || 'N/A')
  addFieldLine('Physical Address:', `${client.physical_address || ''}${client.city ? ', ' + client.city : ''}`)
  addFieldLine('Contact Person:', client.contact_person)
  addFieldLine('Phone Number:', client.phone)
  addFieldLine('Email Address:', client.email || 'N/A')

  y += 3
  doc.setFont('helvetica', 'normal')
  doc.text('(hereinafter referred to as "the Client")', margin, y)
  y += 5

  addLine()

  // === SECTION 1: SERVICES PROVIDED ===
  addSectionHeader('1. SERVICES PROVIDED')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('1.1 School Management System', margin, y)
  y += 6

  if (client.has_school_management) {
    doc.setFont('helvetica', 'normal')
    doc.text('[X] Selected', margin + 5, y)
    y += 6
    addParagraph('The Service Provider agrees to provide the Client with access to a cloud-based School Management System which includes:')
    y += 2
    addBullet('Student registration and management')
    addBullet('Teacher/staff management')
    addBullet('Subject and enrollment management')
    addBullet('Fee tracking and payment recording')
    addBullet('Financial reports and analytics')
    addBullet('Hostel management module (if applicable)')
    addBullet("Custom branding with Client's logo and colors")
    addBullet('Role-based user access (Admin and Staff accounts)')
  } else {
    doc.setFont('helvetica', 'normal')
    doc.text('[ ] Not Selected', margin + 5, y)
    y += 6
  }

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.text('1.2 Website Development', margin, y)
  y += 6

  if (client.has_website) {
    doc.setFont('helvetica', 'normal')
    doc.text('[X] Yes, include website', margin + 5, y)
    if (client.website_domain) {
      doc.text(`Domain: ${client.website_domain}`, margin + 60, y)
    }
    y += 6
    addParagraph('The Service Provider will develop and host a professional website for the Client including:')
    y += 2
    addBullet('Responsive design (mobile-friendly)')
    addBullet('Up to 5 pages (Home, About, Programs, Contact, Gallery)')
    addBullet('Contact form')
    addBullet('Social media integration')
    addBullet('Domain registration and hosting')
  } else {
    doc.setFont('helvetica', 'normal')
    doc.text('[X] No, School Management System only', margin + 5, y)
    y += 6
  }

  // === SECTION 2: FEES AND PAYMENT ===
  addSectionHeader('2. FEES AND PAYMENT TERMS')

  doc.setFont('helvetica', 'bold')
  doc.text('2.1 Setup Fee (Once-Off)', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(`System setup, configuration, branding & training: ${formatCurrency(client.setup_fee)}`, margin + 5, y)
  y += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.text('This fee is payable before system activation and is non-refundable.', margin + 5, y)
  y += 8

  if (client.has_school_management) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('2.2 Monthly Subscription Fee', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`School Management System monthly access: ${formatCurrency(client.monthly_sms_fee)}`, margin + 5, y)
    y += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Payable on or before the 1st of each month.', margin + 5, y)
    y += 8
  }

  if (client.has_website) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('2.3 Website Annual Renewal', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`Domain renewal and hosting (annually): ${formatCurrency(client.annual_website_fee)}`, margin + 5, y)
    y += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Payable annually on the anniversary of the website launch date.', margin + 5, y)
    y += 8
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('2.4 Payment Methods', margin, y)
  y += 6
  addBullet('Bank Transfer / EFT')
  addBullet('Cash')
  addBullet('Mobile Money')

  y += 2
  doc.setFont('helvetica', 'bold')
  doc.text('2.5 Late Payment', margin, y)
  y += 6
  addBullet('Invoices not paid within 7 days of the due date will incur a 10% late fee.')
  addBullet('Access to the system may be suspended after 14 days of non-payment.')
  addBullet('Access will be restored within 24 hours upon receipt of outstanding payment.')

  // === SECTION 3: WHAT'S INCLUDED ===
  addSectionHeader("3. WHAT'S INCLUDED IN YOUR MONTHLY FEE")

  if (client.has_school_management) {
    addParagraph(`The monthly subscription fee of ${formatCurrency(client.monthly_sms_fee)} includes:`)
    y += 3

    doc.setFont('helvetica', 'bold')
    doc.text('3.1 Technical Support', margin, y)
    y += 6
    addBullet('Phone support (Monday to Friday, 8:00 AM - 5:00 PM)')
    addBullet('WhatsApp support for quick queries')
    addBullet('Email support with 24-hour response time')
    addBullet('Remote assistance when needed')

    y += 2
    doc.setFont('helvetica', 'bold')
    doc.text('3.2 System Updates', margin, y)
    y += 6
    addBullet('Free access to all new features and improvements')
    addBullet('Security updates and patches')
    addBullet('Performance optimizations')
    addBullet('No additional charges for upgrades')

    y += 2
    doc.setFont('helvetica', 'bold')
    doc.text('3.3 Data Security & Backups', margin, y)
    y += 6
    addBullet('Daily automated backups of all your data')
    addBullet('Secure cloud storage with encryption')
    addBullet('99.9% uptime guarantee')
    addBullet('Protection against data loss')

    y += 2
    doc.setFont('helvetica', 'bold')
    doc.text('3.4 Training', margin, y)
    y += 6
    addBullet('Initial training session upon setup (included in setup fee)')
    addBullet('Training for new staff members at no additional cost')
    addBullet('Access to user guides and video tutorials')
    addBullet('Refresher training upon request')
  }

  // === SECTION 4: DATA OWNERSHIP ===
  addSectionHeader('4. DATA OWNERSHIP AND PRIVACY')

  doc.setFont('helvetica', 'bold')
  doc.text('4.1 Your Data Belongs to You', margin, y)
  y += 6
  addParagraph('All data entered into the School Management System by the Client, including but not limited to student records, financial information, staff details, and any other information, remains the sole property of the Client.')

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.text('4.2 Data Protection', margin, y)
  y += 6
  addParagraph('The Service Provider agrees to:')
  addBullet('Keep all Client data strictly confidential')
  addBullet('Not share, sell, or disclose Client data to any third party')
  addBullet('Implement reasonable security measures to protect Client data')
  addBullet('Comply with applicable data protection laws')

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.text('4.3 Data Access', margin, y)
  y += 6
  addParagraph('The Service Provider may access Client data only for:')
  addBullet('Providing technical support requested by the Client')
  addBullet('System maintenance and troubleshooting')
  addBullet('Improving system performance')

  // === SECTION 5: TERMINATION ===
  addSectionHeader('5. TERMINATION AND CANCELLATION')

  doc.setFont('helvetica', 'bold')
  doc.text('5.1 Cancellation by Client', margin, y)
  y += 6
  addParagraph('The Client may cancel this agreement at any time by providing 30 days written notice via email or WhatsApp.')

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.text('5.2 Cancellation by Service Provider', margin, y)
  y += 6
  addParagraph('The Service Provider may terminate this agreement with 30 days notice if:')
  addBullet('The Client fails to pay fees for more than 60 days')
  addBullet('The Client violates the terms of this agreement')
  addBullet('The Client uses the system for illegal activities')

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.text('5.3 What Happens to Your Data Upon Termination', margin, y)
  y += 6
  addParagraph('Upon termination of this agreement:')
  addBullet('Data Export: The Client will have 30 days to request an export of all their data. The Service Provider will provide data in a standard format (Excel/CSV) at no additional charge.')
  addBullet('Data Retention: After the 30-day period, the Service Provider will securely delete all Client data from the system, unless legally required to retain it.')
  addBullet('No Data Hostage: The Service Provider will never withhold Client data as leverage for unpaid fees. Data export will be provided regardless of payment disputes.')

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.text('5.4 Refunds', margin, y)
  y += 6
  addBullet('Setup fees are non-refundable')
  addBullet('Monthly fees paid in advance will not be refunded upon cancellation')
  addBullet('Annual website renewal fees are non-refundable')

  // === SECTION 6: SERVICE LEVEL ===
  addSectionHeader('6. SERVICE LEVEL AGREEMENT')

  doc.setFont('helvetica', 'bold')
  doc.text('6.1 System Availability', margin, y)
  y += 6
  addParagraph('The Service Provider aims to maintain 99.9% uptime for the School Management System.')

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.text('6.2 Scheduled Maintenance', margin, y)
  y += 6
  addBullet('Scheduled maintenance will occur during off-peak hours (typically 10 PM - 6 AM)')
  addBullet('The Client will be notified at least 24 hours in advance of scheduled maintenance')
  addBullet('Emergency maintenance may occur without notice to address critical issues')

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.text('6.3 Support Response Times', margin, y)
  y += 6
  addBullet('Critical (System completely down): Within 4 hours')
  addBullet('High (Major feature not working): Within 8 hours')
  addBullet('Medium (Minor issues): Within 24 hours')
  addBullet('Low (Questions, training requests): Within 48 hours')

  // === SECTION 7: CLIENT RESPONSIBILITIES ===
  addSectionHeader('7. CLIENT RESPONSIBILITIES')

  addParagraph('The Client agrees to:')
  y += 2
  addBullet('7.1 Provide accurate information for system setup and configuration')
  addBullet('7.2 Keep login credentials secure and not share them with unauthorized persons')
  addBullet('7.3 Notify the Service Provider immediately of any security concerns')
  addBullet('7.4 Pay all fees on time as per the agreed schedule')
  addBullet('7.5 Use the system in compliance with applicable laws')
  addBullet('7.6 Not attempt to reverse engineer, copy, or redistribute the system')

  // === SECTION 8: LIABILITY ===
  addSectionHeader('8. LIMITATION OF LIABILITY')

  addBullet('8.1 The Service Provider shall not be liable for any indirect, incidental, or consequential damages arising from the use of the system.')
  addBullet('8.2 The Service Provider\'s total liability shall not exceed the total fees paid by the Client in the 3 months preceding any claim.')
  y += 2
  addParagraph('8.3 The Service Provider is not responsible for:')
  addBullet('Data loss due to Client actions')
  addBullet("Internet connectivity issues on the Client's side")
  addBullet('Issues caused by unauthorized modifications')
  addBullet('Third-party service outages (e.g., payment gateways)')

  // === SECTION 9: INTELLECTUAL PROPERTY ===
  addSectionHeader('9. INTELLECTUAL PROPERTY')

  addBullet('9.1 The School Management System software remains the intellectual property of SA Tutorial Centres (Pty) Ltd.')
  addBullet('9.2 The Client is granted a non-exclusive, non-transferable license to use the system for the duration of this agreement.')
  addBullet("9.3 Custom branding elements (logos, colors) provided by the Client remain the Client's property.")
  addBullet("9.4 Website content provided by the Client remains the Client's property.")

  // === SECTION 10: AMENDMENTS ===
  addSectionHeader('10. AMENDMENTS')

  addBullet('10.1 The Service Provider may update the system features and pricing with 30 days notice.')
  addBullet('10.2 Price increases will not exceed 10% per year and will be communicated in writing.')
  addBullet('10.3 The Client may choose to terminate without penalty if they do not accept price increases.')

  // === SECTION 11: DISPUTE RESOLUTION ===
  addSectionHeader('11. DISPUTE RESOLUTION')

  addBullet('11.1 Any disputes arising from this agreement shall first be addressed through good-faith negotiation.')
  addBullet('11.2 If negotiation fails, disputes shall be resolved through mediation in Johannesburg, South Africa.')
  addBullet('11.3 This agreement is governed by the laws of the Republic of South Africa.')

  // === SECTION 12: ENTIRE AGREEMENT ===
  addSectionHeader('12. ENTIRE AGREEMENT')

  addParagraph('This document constitutes the entire agreement between the parties and supersedes any prior discussions or agreements.')

  // === SIGNATURES ===
  checkPageBreak(80)
  addLine()
  y += 5

  addSectionHeader('SIGNATURES')

  addParagraph('By signing below, both parties agree to the terms and conditions outlined in this Service Agreement.')

  y += 8
  doc.setFont('helvetica', 'bold')
  doc.text('Service Provider', margin, y)
  doc.text('Client', pageWidth / 2 + 10, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.text('SA Tutorial Centres (Pty) Ltd', margin, y)
  doc.text(client.business_name, pageWidth / 2 + 10, y)
  y += 15

  doc.text('Signature: _______________________', margin, y)
  doc.text('Signature: _______________________', pageWidth / 2 + 10, y)
  y += 10

  doc.text('Name: ___________________________', margin, y)
  doc.text('Name: ___________________________', pageWidth / 2 + 10, y)
  y += 10

  doc.text('Date: ____________________________', margin, y)
  doc.text('Title: ____________________________', pageWidth / 2 + 10, y)
  y += 10

  doc.text('', margin, y)
  doc.text('Date: ____________________________', pageWidth / 2 + 10, y)

  // === ANNEXURE A ===
  doc.addPage()
  y = 20

  addTitle('ANNEXURE A: SERVICE ACTIVATION DETAILS', 14)
  y += 5
  doc.setFontSize(10)
  doc.setFont('helvetica', 'italic')
  doc.text('(To be completed upon setup)', pageWidth / 2, y, { align: 'center' })
  y += 10

  const tableData = [
    ['System URL', ''],
    ['Admin Username', ''],
    ['Initial Password', ''],
    ['Website URL (if applicable)', client.has_website && client.website_domain ? `https://${client.website_domain}` : 'N/A'],
    ['Activation Date', formatDate(client.contract_start_date)],
    ['First Payment Due', ''],
    ['Monthly Payment Due Date', '1st of each month'],
  ]

  doc.setFont('helvetica', 'normal')
  tableData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value || '_'.repeat(30), margin + 70, y)
    y += 8
  })

  // === ANNEXURE B ===
  y += 15
  addTitle('ANNEXURE B: BANKING DETAILS', 14)
  y += 5

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('SA Tutorial Centres (Pty) Ltd', margin, y)
  y += 10

  const bankData = [
    ['Bank', ''],
    ['Account Name', ''],
    ['Account Number', ''],
    ['Branch Code', ''],
    ['Reference', client.business_name],
  ]

  doc.setFontSize(10)
  bankData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value || '_'.repeat(30), margin + 50, y)
    y += 8
  })

  // Footer
  y += 20
  addLine()
  y += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.text('Document Version 1.0 - January 2026', pageWidth / 2, y, { align: 'center' })
  y += 5
  doc.text('SA Tutorial Centres (Pty) Ltd - Empowering Education Through Technology', pageWidth / 2, y, { align: 'center' })

  return doc
}

export function downloadContractPDF(client: ClientData) {
  const doc = generateContractPDF(client)
  const fileName = `Service_Agreement_${client.business_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

export function printContractPDF(client: ClientData) {
  const doc = generateContractPDF(client)
  doc.autoPrint()
  window.open(doc.output('bloburl'), '_blank')
}
