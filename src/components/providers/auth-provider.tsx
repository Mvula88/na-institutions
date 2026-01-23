'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const { setUser, clearAuth, isInitialized } = useAuthStore()
  const isCheckingRef = useRef(false)

  // Function to check and set auth state with timeout
  const checkAuth = useCallback(async () => {
    // Prevent concurrent checks
    if (isCheckingRef.current) return
    isCheckingRef.current = true

    const supabase = createClient()

    // Create a timeout promise
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 5000) // 5 second timeout
    })

    try {
      // Race between auth check and timeout
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ])

      // Timeout occurred
      if (sessionResult === null) {
        clearAuth()
        isCheckingRef.current = false
        return
      }

      const { data: { session }, error: sessionError } = sessionResult

      if (sessionError || !session) {
        clearAuth()
        isCheckingRef.current = false
        return
      }

      // We have a session, now fetch the user profile with timeout
      const profileResult = await Promise.race([
        supabase
          .from('users')
          .select(`
            *,
            institution:institutions (
              id,
              name,
              slug,
              logo_url,
              primary_color,
              secondary_color,
              status,
              subscription_tier,
              subscription_status,
              hostel_module_enabled,
              transport_module_enabled,
              library_module_enabled,
              sms_module_enabled
            )
          `)
          .eq('id', session.user.id)
          .single(),
        timeoutPromise
      ])

      // Timeout occurred
      if (profileResult === null) {
        clearAuth()
        isCheckingRef.current = false
        return
      }

      const { data: profile, error: profileError } = profileResult

      if (profileError) {
        console.error('Profile fetch error:', {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code
        })
      }

      if (profileError || !profile) {
        clearAuth()
        isCheckingRef.current = false
        return
      }

      setUser(profile)
    } catch (error) {
      console.error('Auth check error:', error)
      clearAuth()
    } finally {
      isCheckingRef.current = false
    }
  }, [setUser, clearAuth])

  useEffect(() => {
    // Check auth immediately on mount
    checkAuth()

    // CRITICAL: Guarantee initialization within 3 seconds no matter what
    const guaranteedInit = setTimeout(() => {
      if (!useAuthStore.getState().isInitialized) {
        clearAuth()
      }
    }, 3000)

    const supabase = createClient()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await checkAuth()
          if (event === 'SIGNED_IN') {
            router.refresh()
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuth()
          router.push('/login')
        }
      }
    )

    // Handle tab visibility changes - re-check auth when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Handle window focus - re-check auth when window gains focus
    const handleFocus = () => {
      checkAuth()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearTimeout(guaranteedInit)
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkAuth, clearAuth, router])

  return <>{children}</>
}
