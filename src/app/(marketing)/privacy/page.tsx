import Link from 'next/link'
import Image from 'next/image'
import { GraduationCap, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy | InstituX',
  description: 'Privacy Policy and data protection information for InstituX',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/institux-logo.png"
                alt="InstituX Logo"
                width={200}
                height={55}
                className="h-12 w-auto"
              />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 2026<br />
              <strong>Last Updated:</strong> January 2026
            </p>

            <p className="text-gray-600 mb-6">
              InstituX (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information in accordance with applicable data protection laws.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-gray-600 mb-4">We collect the following types of personal information:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, phone number, and password when you register</li>
              <li><strong>Institution Information:</strong> Institution name, address, contact details, and banking information for payment processing</li>
              <li><strong>Student Information:</strong> Names, contact details, parent/guardian information, grade levels, and academic records as entered by institutions</li>
              <li><strong>Payment Information:</strong> Payment records, fee information, and transaction history</li>
              <li><strong>Usage Data:</strong> Information about how you use our platform, including access logs and feature usage</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Purpose of Processing</h2>
            <p className="text-gray-600 mb-4">We process your personal information for the following purposes:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li>Providing and maintaining our school management services</li>
              <li>Processing subscription payments and generating invoices</li>
              <li>Communicating with you about your account and our services</li>
              <li>Improving our platform and developing new features</li>
              <li>Complying with legal obligations</li>
              <li>Preventing fraud and ensuring security</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Legal Basis for Processing</h2>
            <p className="text-gray-600 mb-6">
              We process your personal information based on:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li><strong>Consent:</strong> When you register and agree to our terms</li>
              <li><strong>Contractual Necessity:</strong> To provide the services you have subscribed to</li>
              <li><strong>Legal Obligation:</strong> When required by law</li>
              <li><strong>Legitimate Interest:</strong> For improving our services and ensuring security</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li><strong>Service Providers:</strong> Payment processors (Stripe), hosting providers (Vercel, Supabase), and communication services</li>
              <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="text-gray-600 mb-6">
              We do not sell your personal information to third parties for marketing purposes.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-6">
              We implement appropriate technical and organisational measures to protect your personal information, including:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security assessments and updates</li>
              <li>Employee training on data protection</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-6">
              We retain your personal information for as long as necessary to provide our services and comply with legal obligations. When you close your account, we will delete or anonymise your data within 90 days, except where retention is required by law.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Your Data Protection Rights</h2>
            <p className="text-gray-600 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your information (subject to legal requirements)</li>
              <li><strong>Object:</strong> Object to the processing of your information</li>
              <li><strong>Restriction:</strong> Request restriction of processing</li>
              <li><strong>Data Portability:</strong> Request transfer of your data in a structured format</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Children&apos;s Privacy</h2>
            <p className="text-gray-600 mb-6">
              Our platform may store information about students as entered by institutions. Institutions are responsible for obtaining appropriate consent from parents or guardians before entering student information. We do not knowingly collect personal information directly from minors.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Cross-Border Data Transfers</h2>
            <p className="text-gray-600 mb-6">
              Your data may be transferred to and processed in countries outside Namibia (including the United States for our cloud service providers). We ensure appropriate safeguards are in place for such transfers in compliance with data protection requirements.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Cookies and Tracking</h2>
            <p className="text-gray-600 mb-6">
              We use essential cookies to provide our services and ensure security. We do not use tracking cookies for advertising purposes. You can manage cookie preferences through your browser settings.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Information Officer</h2>
            <p className="text-gray-600 mb-6">
              For any privacy-related inquiries or to exercise your rights, please contact our Information Officer:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-600">
                <strong>Email:</strong> privacy@institux.com<br />
                <strong>Address:</strong> Namibia
              </p>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">12. Complaints</h2>
            <p className="text-gray-600 mb-6">
              If you are not satisfied with how we handle your personal information, you have the right to lodge a complaint with the relevant data protection authority in your jurisdiction.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">13. Changes to This Policy</h2>
            <p className="text-gray-600 mb-6">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a notice on our platform. Continued use of our services after changes constitutes acceptance of the updated policy.
            </p>

            <div className="border-t border-gray-200 pt-8 mt-8">
              <p className="text-gray-500 text-sm">
                This Privacy Policy complies with applicable data protection laws and regulations.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} InstituX. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-gray-500 hover:text-gray-700 text-sm">
                Terms of Service
              </Link>
              <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
                Home
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
