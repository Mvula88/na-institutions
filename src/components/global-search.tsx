'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import {
  Search,
  X,
  User,
  Users,
  GraduationCap,
  CreditCard,
  BookOpen,
  Settings,
  Loader2,
  Command,
  ArrowRight,
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'student' | 'teacher' | 'payment' | 'subject' | 'page'
  title: string
  subtitle?: string
  href: string
}

// Quick navigation pages
const PAGES: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', href: '/dashboard' },
  { id: 'students', type: 'page', title: 'Students', subtitle: 'Manage students', href: '/dashboard/students' },
  { id: 'teachers', type: 'page', title: 'Teachers', subtitle: 'Manage teachers', href: '/dashboard/teachers' },
  { id: 'payments', type: 'page', title: 'Payments', subtitle: 'View payments', href: '/dashboard/payments' },
  { id: 'subjects', type: 'page', title: 'Subjects', subtitle: 'Manage subjects', href: '/dashboard/subjects' },
  { id: 'reports', type: 'page', title: 'Reports', subtitle: 'View reports', href: '/dashboard/reports' },
  { id: 'settings', type: 'page', title: 'Settings', subtitle: 'Center settings', href: '/dashboard/settings' },
  { id: 'subscription', type: 'page', title: 'Subscription', subtitle: 'Manage subscription', href: '/dashboard/subscription' },
]

function getIcon(type: string) {
  switch (type) {
    case 'student':
      return GraduationCap
    case 'teacher':
      return Users
    case 'payment':
      return CreditCard
    case 'subject':
      return BookOpen
    case 'page':
      return ArrowRight
    default:
      return User
  }
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { user } = useAuthStore()

  // Handle keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Search function
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !user?.institution_id) {
      setResults(PAGES.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      ))
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const searchTerm = `%${searchQuery}%`

      // Search students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id')
        .eq('institution_id', user.institution_id)
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},student_id.ilike.${searchTerm}`)
        .limit(5)

      const students = studentsData as { id: string; first_name: string; last_name: string; student_id: string | null }[] | null

      // Search teachers
      const { data: teachersData } = await supabase
        .from('lecturers')
        .select('id, first_name, last_name')
        .eq('institution_id', user.institution_id)
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
        .limit(5)

      const teachers = teachersData as { id: string; first_name: string; last_name: string }[] | null

      // Search subjects
      const { data: subjectsData } = await supabase
        .from('courses')
        .select('id, name')
        .eq('institution_id', user.institution_id)
        .ilike('name', searchTerm)
        .limit(5)

      const subjects = subjectsData as { id: string; name: string }[] | null

      const searchResults: SearchResult[] = []

      // Add students
      students?.forEach((s) => {
        searchResults.push({
          id: s.id,
          type: 'student',
          title: `${s.first_name} ${s.last_name}`,
          subtitle: s.student_id || undefined,
          href: `/dashboard/students/${s.id}`,
        })
      })

      // Add teachers
      teachers?.forEach((t) => {
        searchResults.push({
          id: t.id,
          type: 'teacher',
          title: `${t.first_name} ${t.last_name}`,
          subtitle: 'Teacher',
          href: `/dashboard/teachers/${t.id}`,
        })
      })

      // Add subjects
      subjects?.forEach((s) => {
        searchResults.push({
          id: s.id,
          type: 'subject',
          title: s.name,
          subtitle: 'Subject',
          href: `/dashboard/subjects`,
        })
      })

      // Add matching pages
      const matchingPages = PAGES.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      searchResults.push(...matchingPages)

      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.institution_id])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 200)

    return () => clearTimeout(timer)
  }, [query, search])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          navigateTo(results[selectedIndex].href)
        }
        break
    }
  }

  const navigateTo = (href: string) => {
    setIsOpen(false)
    router.push(href)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Search...</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded font-mono">
          <Command className="w-3 h-3 inline-block" />K
        </kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative min-h-full flex items-start justify-center p-4 pt-[15vh]">
        <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200">
            <Search className="w-5 h-5 text-gray-400 ml-4" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search students, teachers, or navigate..."
              className="flex-1 px-4 py-4 text-base focus:outline-none"
            />
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-gray-400 mr-4 animate-spin" />
            ) : query ? (
              <button
                onClick={() => setQuery('')}
                className="p-2 mr-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <kbd className="mr-4 px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded font-mono text-gray-500">
                ESC
              </kbd>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {results.length === 0 && query ? (
              <div className="p-8 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No results found for &ldquo;{query}&rdquo;</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Quick Navigation</p>
                {PAGES.slice(0, 6).map((page, index) => {
                  const Icon = getIcon(page.type)
                  return (
                    <button
                      key={page.id}
                      onClick={() => navigateTo(page.href)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedIndex === index ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium">{page.title}</p>
                        {page.subtitle && (
                          <p className="text-sm text-gray-500">{page.subtitle}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-2">
                {results.map((result, index) => {
                  const Icon = getIcon(result.type)
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => navigateTo(result.href)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedIndex === index ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedIndex === index ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          selectedIndex === index ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                        result.type === 'student' ? 'bg-green-100 text-green-700' :
                        result.type === 'teacher' ? 'bg-blue-100 text-blue-700' :
                        result.type === 'subject' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {result.type}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">↵</kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">esc</kbd>
              to close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
