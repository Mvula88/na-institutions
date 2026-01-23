'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Sidebar } from '@/components/layout/sidebar'
import { Loader2 } from 'lucide-react'
import { ProductTour } from '@/components/onboarding'
import { SetupWizard } from '@/components/onboarding/setup-wizard'
import { TrialExpiredModal } from '@/components/subscription/trial-expired-modal'
import { dashboardTourSteps } from '@/config/tour-steps'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, isInitialized } = useAuthStore()

  useEffect(() => {
    // Only redirect after auth state is fully initialized
    if (isInitialized && !isAuthenticated) {
      router.push('/login')
    }
    // Redirect super admin to admin dashboard
    if (isInitialized && user?.role === 'super_admin') {
      router.push('/admin')
    }
  }, [isInitialized, isAuthenticated, user, router])

  // Show loading only while not initialized (brief moment on first load)
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Not authenticated - will redirect via useEffect
  if (!isAuthenticated || user?.role === 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex flex-col min-h-screen lg:ml-64 pt-14 lg:pt-0">
        <div className="flex-1">
          {children}
        </div>
        <footer className="py-4 px-6 text-center text-xs text-gray-500 border-t border-gray-200 bg-white">
          &copy; {new Date().getFullYear()} Digital Wave Technologies School Management System. All rights reserved.
        </footer>
      </main>

      {/* Onboarding Product Tour */}
      <ProductTour steps={dashboardTourSteps} />

      {/* Setup Wizard for first-time center admins */}
      <SetupWizard />

      {/* Trial Expired Modal - blocks access when trial ends */}
      <TrialExpiredModal />
    </div>
  )
}
