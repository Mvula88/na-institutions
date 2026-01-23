'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  Building2,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Bus,
  Library,
  Sparkles,
  History,
  Lock,
  Gift,
  UserCog,
  ClipboardCheck,
  Award,
  School,
  MessageSquare,
  Calendar,
  ChevronDown,
  ChevronRight,
  UserPlus,
  ScrollText,
  Briefcase,
  Mail,
  FolderOpen,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  module?: 'hostel' | 'transport' | 'library' | 'sms'
  adminOnly?: boolean
  requiresTier?: 'standard' | 'premium'
  tourId?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
  defaultOpen?: boolean
}

// Organized navigation groups
const institutionNavGroups: NavGroup[] = [
  {
    label: 'Overview',
    defaultOpen: true,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, tourId: 'sidebar-dashboard' },
    ]
  },
  {
    label: 'People',
    defaultOpen: false,
    items: [
      { label: 'Students', href: '/dashboard/students', icon: <GraduationCap className="w-5 h-5" />, tourId: 'sidebar-students' },
      { label: 'Re-Registration', href: '/dashboard/re-registration', icon: <UserPlus className="w-5 h-5" />, adminOnly: true },
      { label: 'Cohorts', href: '/dashboard/cohorts', icon: <Users className="w-5 h-5" />, adminOnly: true },
      { label: 'Lecturers', href: '/dashboard/lecturers', icon: <Users className="w-5 h-5" />, adminOnly: true },
      { label: 'Staff', href: '/dashboard/staff', icon: <UserCog className="w-5 h-5" />, adminOnly: true },
    ]
  },
  {
    label: 'Academic',
    defaultOpen: false,
    items: [
      { label: 'Courses', href: '/dashboard/courses', icon: <BookOpen className="w-5 h-5" />, tourId: 'sidebar-courses' },
      { label: 'Programs', href: '/dashboard/programs', icon: <School className="w-5 h-5" /> },
      { label: 'Attendance', href: '/dashboard/attendance', icon: <ClipboardCheck className="w-5 h-5" /> },
      { label: 'Assessments', href: '/dashboard/assessments', icon: <Award className="w-5 h-5" /> },
      { label: 'Transcripts', href: '/dashboard/transcripts', icon: <FileText className="w-5 h-5" /> },
      { label: 'Timetable', href: '/dashboard/timetable', icon: <Calendar className="w-5 h-5" /> },
      { label: 'Certificates', href: '/dashboard/certificates', icon: <ScrollText className="w-5 h-5" /> },
      { label: 'Internships', href: '/dashboard/internships', icon: <Briefcase className="w-5 h-5" /> },
      { label: 'Graduation', href: '/dashboard/graduation', icon: <GraduationCap className="w-5 h-5" /> },
    ]
  },
  {
    label: 'Financial',
    defaultOpen: false,
    items: [
      { label: 'Payments', href: '/dashboard/payments', icon: <CreditCard className="w-5 h-5" />, tourId: 'sidebar-payments' },
    ]
  },
  {
    label: 'Modules',
    defaultOpen: false,
    items: [
      { label: 'SMS Campaigns', href: '/dashboard/sms', icon: <MessageSquare className="w-5 h-5" />, module: 'sms', requiresTier: 'standard' },
      { label: 'Email', href: '/dashboard/email', icon: <Mail className="w-5 h-5" />, requiresTier: 'standard' },
      { label: 'Hostel', href: '/dashboard/hostel', icon: <Home className="w-5 h-5" />, module: 'hostel', requiresTier: 'premium' },
      { label: 'Transport', href: '/dashboard/transport', icon: <Bus className="w-5 h-5" />, module: 'transport', requiresTier: 'premium' },
      { label: 'Library', href: '/dashboard/library', icon: <Library className="w-5 h-5" />, module: 'library', requiresTier: 'standard' },
    ]
  },
  {
    label: 'Administration',
    defaultOpen: false,
    items: [
      { label: 'Documents', href: '/dashboard/documents', icon: <FolderOpen className="w-5 h-5" />, adminOnly: true },
      { label: 'Reports', href: '/dashboard/reports', icon: <FileText className="w-5 h-5" />, adminOnly: true, tourId: 'sidebar-reports' },
      { label: 'Audit Logs', href: '/dashboard/audit-logs', icon: <History className="w-5 h-5" />, adminOnly: true },
      { label: 'Referrals', href: '/dashboard/referrals', icon: <Gift className="w-5 h-5" />, adminOnly: true },
      { label: 'Subscription', href: '/dashboard/subscription', icon: <Sparkles className="w-5 h-5" />, adminOnly: true },
      { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" />, adminOnly: true, tourId: 'sidebar-settings' },
    ]
  },
]

// Mobile Header Component
export function MobileHeader({ onMenuClick, title }: { onMenuClick: () => void; title?: string }) {
  const { user } = useAuthStore()
  const primaryColor = user?.institution?.primary_color || '#1E40AF'
  const institutionName = user?.institution?.name || title || 'Institution Management'
  const logoUrl = user?.institution?.logo_url

  return (
    <header
      className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-40"
    >
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600"
      >
        <Menu className="w-6 h-6" />
      </button>
      <div className="flex items-center gap-3 ml-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={institutionName}
            className="w-8 h-8 rounded-lg bg-gray-100 p-0.5 object-contain"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {institutionName.charAt(0)}
          </div>
        )}
        <span className="font-semibold text-gray-900 truncate">{institutionName}</span>
      </div>
    </header>
  )
}

// Collapsible Nav Group Component
function NavGroupSection({
  group,
  isOpen,
  onToggle,
  pathname,
  primaryColor,
  canAccessModule,
  isInstitutionAdmin,
  currentTierLevel,
  tierHierarchy,
  onLockedClick,
}: {
  group: NavGroup
  isOpen: boolean
  onToggle: () => void
  pathname: string
  primaryColor: string
  canAccessModule: (module: string) => boolean
  isInstitutionAdmin: () => boolean
  currentTierLevel: number
  tierHierarchy: Record<string, number>
  onLockedClick: (module: string, tier: 'standard' | 'premium') => void
}) {
  // Filter items based on permissions
  const filteredItems = group.items.filter(item => {
    if (item.adminOnly && !isInstitutionAdmin()) return false
    return true
  }).map(item => {
    if (item.module && item.requiresTier) {
      const requiredLevel = tierHierarchy[item.requiresTier] || 4
      const isLocked = currentTierLevel < requiredLevel
      const hasAccess = canAccessModule(item.module)
      return { ...item, isLocked: isLocked || !hasAccess }
    }
    return { ...item, isLocked: false }
  })

  // Don't render empty groups
  if (filteredItems.length === 0) return null

  // Check if any item in this group is active
  const hasActiveItem = filteredItems.some(item =>
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
      >
        <span>{group.label}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-0.5 mt-1">
          {filteredItems.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/')

            if (item.isLocked) {
              return (
                <button
                  key={item.href}
                  onClick={() => onLockedClick(item.label, item.requiresTier || 'premium')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-50 cursor-pointer group"
                >
                  <span className="text-gray-300 group-hover:text-gray-400 transition-colors">
                    {item.icon}
                  </span>
                  <span className="text-sm flex-1 text-left">{item.label}</span>
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tourId}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                style={isActive ? { backgroundColor: primaryColor } : undefined}
              >
                <span className={isActive ? 'text-white/90' : ''}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut, canAccessModule, isInstitutionAdmin, getSubscriptionTier } = useAuthStore()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [lockedModule, setLockedModule] = useState<{ module: string; tier: 'standard' | 'premium' } | null>(null)

  // Track which groups are open - initialize from localStorage or defaults
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpenGroups')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // If parse fails, use defaults
        }
      }
    }
    // Default: use defaultOpen from group definitions
    return institutionNavGroups.reduce((acc, group) => {
      acc[group.label] = group.defaultOpen ?? true
      return acc
    }, {} as Record<string, boolean>)
  })

  // Save open groups to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpenGroups', JSON.stringify(openGroups))
    }
  }, [openGroups])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  // Auto-expand group containing active item
  useEffect(() => {
    institutionNavGroups.forEach(group => {
      const hasActiveItem = group.items.some(item =>
        item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname === item.href || pathname.startsWith(item.href + '/')
      )
      if (hasActiveItem && !openGroups[group.label]) {
        setOpenGroups(prev => ({ ...prev, [group.label]: true }))
      }
    })
  }, [pathname])

  const currentTier = getSubscriptionTier()
  const tierHierarchy = { micro: 1, starter: 2, standard: 3, premium: 4 }
  const currentTierLevel = tierHierarchy[currentTier] || 2

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }))
  }

  const primaryColor = user?.institution?.primary_color || '#1E40AF'
  const institutionName = user?.institution?.name || 'Institution'
  const logoUrl = user?.institution?.logo_url

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Logo Area */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            logoUrl.includes('127.0.0.1') || logoUrl.includes('localhost') ? (
              <img
                src={logoUrl}
                alt={institutionName}
                className="rounded-xl bg-gray-50 p-1 object-contain w-10 h-10 flex-shrink-0"
              />
            ) : (
              <Image
                src={logoUrl}
                alt={institutionName}
                width={40}
                height={40}
                className="rounded-xl bg-gray-50 p-1 object-contain flex-shrink-0"
              />
            )
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {institutionName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
              {institutionName}
            </h2>
          </div>
          {mobile && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {institutionNavGroups.map((group) => (
          <NavGroupSection
            key={group.label}
            group={group}
            isOpen={openGroups[group.label] ?? true}
            onToggle={() => toggleGroup(group.label)}
            pathname={pathname}
            primaryColor={primaryColor}
            canAccessModule={canAccessModule as (module: string) => boolean}
            isInstitutionAdmin={isInstitutionAdmin}
            currentTierLevel={currentTierLevel}
            tierHierarchy={tierHierarchy}
            onLockedClick={(module, tier) => setLockedModule({ module, tier })}
          />
        ))}
      </nav>

      {/* Locked Module Modal */}
      {lockedModule && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              lockedModule.tier === 'premium' ? 'bg-purple-100' : 'bg-blue-100'
            }`}>
              <Lock className={`w-7 h-7 ${
                lockedModule.tier === 'premium' ? 'text-purple-600' : 'text-blue-600'
              }`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {lockedModule.module} is Locked
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              This feature requires the{' '}
              <span className={`font-semibold ${
                lockedModule.tier === 'premium' ? 'text-purple-600' : 'text-blue-600'
              }`}>
                {lockedModule.tier.charAt(0).toUpperCase() + lockedModule.tier.slice(1)}
              </span>{' '}
              plan or higher.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setLockedModule(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Maybe Later
              </button>
              <Link
                href="/dashboard/subscription"
                onClick={() => setLockedModule(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* User section */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: primaryColor }}
          >
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 text-sm truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full border border-gray-200 hover:border-red-200"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <MobileHeader onMenuClick={() => setIsMobileOpen(true)} />

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <NavContent mobile />
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-100 flex-col z-30">
        <NavContent />
      </aside>
    </>
  )
}

// Super Admin Sidebar
const adminNavGroups: NavGroup[] = [
  {
    label: 'Overview',
    defaultOpen: true,
    items: [
      { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
    ]
  },
  {
    label: 'Management',
    defaultOpen: true,
    items: [
      { label: 'Clients', href: '/admin/clients', icon: <FileText className="w-5 h-5" /> },
      { label: 'Institutions', href: '/admin/institutions', icon: <Building2 className="w-5 h-5" /> },
      { label: 'All Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
    ]
  },
  {
    label: 'System',
    defaultOpen: true,
    items: [
      { label: 'Reports', href: '/admin/reports', icon: <FileText className="w-5 h-5" /> },
      { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
    ]
  },
]

// Mobile Header for Admin
export function AdminMobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 z-40">
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 rounded-lg hover:bg-gray-800 text-gray-400"
      >
        <Menu className="w-6 h-6" />
      </button>
      <div className="flex items-center gap-3 ml-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
          SA
        </div>
        <span className="font-semibold text-white">Super Admin</span>
      </div>
    </header>
  )
}

// Admin Nav Group Component
function AdminNavGroupSection({
  group,
  isOpen,
  onToggle,
  pathname,
}: {
  group: NavGroup
  isOpen: boolean
  onToggle: () => void
  pathname: string
}) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
      >
        <span>{group.label}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-0.5 mt-1">
          {group.items.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-white/90' : ''}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuthStore()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    return adminNavGroups.reduce((acc, group) => {
      acc[group.label] = group.defaultOpen ?? true
      return acc
    }, {} as Record<string, boolean>)
  })

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }))
  }

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold shadow-lg">
            SA
          </div>
          <span className="font-semibold text-white">Super Admin</span>
        </div>
        {mobile && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {adminNavGroups.map((group) => (
          <AdminNavGroupSection
            key={group.label}
            group={group}
            isOpen={openGroups[group.label] ?? true}
            onToggle={() => toggleGroup(group.label)}
            pathname={pathname}
          />
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-medium">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-white text-sm truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-red-600/20 hover:text-red-400 transition-colors w-full border border-gray-700 hover:border-red-600/50"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <AdminMobileHeader onMenuClick={() => setIsMobileOpen(true)} />

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-gray-900 z-50 transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <NavContent mobile />
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 bg-gray-900 flex-col z-30">
        <NavContent />
      </aside>
    </>
  )
}
