import Link from 'next/link'
import Image from 'next/image'
import { GraduationCap, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service | InstituX',
  description: 'Terms of Service for InstituX tertiary institute management platform',
}

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> January 2026<br />
              <strong>Last Updated:</strong> January 2026
            </p>

            <p className="text-gray-600 mb-6">
              Welcome to InstituX. These Terms of Service (&ldquo;Terms&rdquo;) govern your use of our tertiary institute management platform. By accessing or using our services, you agree to be bound by these Terms.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Definitions</h2>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li><strong>&ldquo;Platform&rdquo;</strong> refers to the InstituX web application and related services</li>
              <li><strong>&ldquo;User&rdquo;</strong> refers to any individual or entity using the Platform</li>
              <li><strong>&ldquo;Subscriber&rdquo;</strong> refers to an institution that has subscribed to our paid services</li>
              <li><strong>&ldquo;Content&rdquo;</strong> refers to any data, information, or materials uploaded to the Platform</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Account Registration</h2>
            <p className="text-gray-600 mb-4">To use our services, you must:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li>Register for an account with accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 18 years old or have legal authority to enter into this agreement</li>
              <li>Have the authority to bind your organisation if registering on behalf of an institution</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Subscription and Payment</h2>
            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">3.1 Subscription Plans</h3>
            <p className="text-gray-600 mb-4">
              We offer various subscription plans as displayed on our pricing page. Features and pricing may vary by plan and are subject to change with notice.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">3.2 Payment</h3>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li>Subscriptions are billed monthly in Namibian Dollar (NAD)</li>
              <li>Payment is due at the start of each billing period</li>
              <li>Setup fees (where applicable) are charged once upon subscription</li>
              <li>All fees are exclusive of VAT unless otherwise stated</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">3.3 Cancellation</h3>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li>You may cancel your subscription at any time</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>No refunds are provided for partial billing periods</li>
              <li>You will retain access to your data for 30 days after cancellation</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-600 mb-4">You agree NOT to:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li>Use the Platform for any unlawful purpose</li>
              <li>Upload or transmit viruses, malware, or other harmful code</li>
              <li>Attempt to gain unauthorised access to any part of the Platform</li>
              <li>Interfere with or disrupt the Platform&apos;s operation</li>
              <li>Share your account credentials with unauthorised persons</li>
              <li>Use the Platform to store or transmit illegal content</li>
              <li>Resell or sublicense access to the Platform without permission</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Data and Content</h2>
            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">5.1 Your Data</h3>
            <p className="text-gray-600 mb-4">
              You retain ownership of all data you upload to the Platform. You grant us a limited license to use, process, and store your data solely to provide our services.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">5.2 Responsibility</h3>
            <p className="text-gray-600 mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li>The accuracy and legality of data you upload</li>
              <li>Obtaining necessary consents from students, parents, and staff</li>
              <li>Complying with applicable data protection laws</li>
              <li>Maintaining regular backups of your critical data</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">5.3 Data Export</h3>
            <p className="text-gray-600 mb-6">
              You may export your data at any time using our export features. Upon account termination, you have 30 days to export your data before it is deleted.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Service Availability</h2>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li>We strive to maintain 99.9% uptime but do not guarantee uninterrupted service</li>
              <li>We may perform scheduled maintenance with advance notice</li>
              <li>We are not liable for service interruptions due to factors beyond our control</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-600 mb-6">
              The Platform, including its design, features, and underlying technology, is owned by InstituX. You may not copy, modify, or reverse engineer any part of the Platform without our written permission.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li>We provide the Platform &ldquo;as is&rdquo; without warranties of any kind</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability shall not exceed the fees you paid in the 12 months preceding the claim</li>
              <li>We are not liable for any loss of data, business, or profits</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Indemnification</h2>
            <p className="text-gray-600 mb-6">
              You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your use of the Platform, violation of these Terms, or infringement of any third-party rights.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Termination</h2>
            <p className="text-gray-600 mb-4">We may terminate or suspend your account if you:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
              <li>Violate these Terms</li>
              <li>Fail to pay subscription fees</li>
              <li>Engage in fraudulent or illegal activity</li>
              <li>Pose a security risk to the Platform or other users</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-600 mb-6">
              We may modify these Terms at any time. We will notify you of material changes via email or through the Platform. Continued use after changes constitutes acceptance of the new Terms.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">12. Governing Law</h2>
            <p className="text-gray-600 mb-6">
              These Terms are governed by the laws of Namibia. Any disputes shall be resolved in the courts of Namibia.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">13. Contact Information</h2>
            <p className="text-gray-600 mb-4">
              For questions about these Terms, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-600">
                <strong>Email:</strong> legal@institux.com<br />
                <strong>Support:</strong> support@institux.com
              </p>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">14. Severability</h2>
            <p className="text-gray-600 mb-6">
              If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.
            </p>

            <div className="border-t border-gray-200 pt-8 mt-8">
              <p className="text-gray-500 text-sm">
                By using InstituX, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
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
              <Link href="/privacy" className="text-gray-500 hover:text-gray-700 text-sm">
                Privacy Policy
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
