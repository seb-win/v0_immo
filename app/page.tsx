"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Auth from "@/components/auth"
import CustomerPage from "@/components/customer-page"
import AgentPage from "@/components/agent-page"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import type { User } from "@supabase/supabase-js"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const debug = (message: string) => {
    console.log(`[DEBUG] ${message}`)
  }

  useEffect(() => {
    debug("App mounted, initializing Supabase")
    initializeSupabase()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      debug(`Auth event: ${event}`)
      const newUser = session?.user ?? null
      setUser(newUser)

      if (newUser) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", newUser.id)
            .single()

          if (profileError) {
            debug(`Auth change profile fetch error: ${profileError.message}`)
            setRole(null)
            setFullName(null)
          } else {
            setRole(profileData?.role ?? null)
            setFullName(profileData?.full_name ?? null)
          }
        } catch (e) {
          debug("Unexpected error fetching profile on auth change")
          setRole(null)
          setFullName(null)
        }
      } else {
        // Fully reset state on logout
        setUser(null)
        setRole(null)
        setFullName(null)
      }
    })

    return () => {
      debug("Cleaning up auth subscription")
      subscription.unsubscribe()
    }
  }, [])

  const initializeSupabase = async () => {
    setError(null)

    try {
      if (!supabase) throw new Error("Supabase client is not configured")

      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw new Error(`Authentication error: ${sessionError.message}`)

      const currentUser = data.session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", currentUser.id)
          .single()

        if (profileError) throw new Error(`Profile fetch error: ${profileError.message}`)

        setRole(profileData?.role ?? null)
        setFullName(profileData?.full_name ?? null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      debug(`Init error: ${errorMessage}`)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    debug("Manual retry")
    setUser(null)
    setRole(null)
    setFullName(null)
    setLoading(true)
    setError(null)
    initializeSupabase()
  }

  // === Render Logic ===

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Connection Error</h2>
          </div>
          <p className="mb-4 text-gray-700">{error}</p>
          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (loading && user) {
    // User is known but profile is still loading — don't flash UI
    return null
  }

  if (!user && loading) {
    // Still figuring out if a session exists
    return null
  }

  if (!user && !loading) {
    // Finished checking, user is not signed in
    return <Auth supabaseClient={supabase} />
  }

  if (!user) return <Auth supabaseClient={supabase} />
  if (role === "agent") return <AgentPage fullName={fullName} />
  if (role === "customer") return <CustomerPage fullName={fullName} />

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">User has no assigned role.</p>
    </div>
  )
}
