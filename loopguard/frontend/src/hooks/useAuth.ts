/**
 * Auth Hook
 * 
 * Provides authentication state and methods using Supabase.
 * Fetches user role from LoopGuard backend for proper access control.
 */

import { useEffect, useState } from 'react'
import { supabase, type User, type Session } from '../supabase/client'
import { api } from '../api/client'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  role: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    role: null,
  })

  // Fetch user role from backend
  const fetchUserRole = async () => {
    try {
      const data = await api.get<{ role: string }>('/auth/me')
      setState(prev => ({ ...prev, role: data.role }))
    } catch {
      // Role fetch failed - will use default
      setState(prev => ({ ...prev, role: null }))
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
      }))
      
      // Fetch role from backend if logged in
      if (session?.user) {
        fetchUserRole()
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
        role: session ? prev.role : null,
      }))
      
      // Fetch role on login
      if (session?.user) {
        fetchUserRole()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    getAccessToken,
  }
}
