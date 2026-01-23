import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from './(marketing)/landing/page'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Show landing page for unauthenticated users
  if (!user) {
    return <LandingPage />
  }

  // Check user role and redirect accordingly
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const typedProfile = profile as { role: string } | null

  if (typedProfile?.role === 'super_admin') {
    redirect('/admin')
  } else {
    redirect('/dashboard')
  }
}
