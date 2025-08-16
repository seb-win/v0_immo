"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [supabaseConfigured, setSupabaseConfigured] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      if (!isSupabaseConfigured) {
        setSupabaseConfigured(false)
        setIsLoading(false)
        return
      }

      try {
        const { data: { session }, error } = await supabase!.auth.getSession()

        if (error || !session) {
          setIsAuthenticated(false)
          router.replace("/") // Redirect to login or home
          return
        }

        setIsAuthenticated(true)
      } catch (error) {
        console.error("Auth check failed:", error)
        setIsAuthenticated(false)
        router.replace("/")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setIsAuthenticated(false)
        router.replace("/")
      } else if (event === "SIGNED_IN") {
        setIsAuthenticated(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Supabase is not configured</p>
              <p>Please add the required environment variables:</p>
              <div className="bg-muted p-3 rounded-md font-mono text-sm">
                <div>NEXT_PUBLIC_SUPABASE_URL=your_supabase_url</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key</div>
              </div>
              <p className="text-sm mt-2">
                Set them in your Vercel project settings or a local `.env.local` file if running locally.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        <span className="ml-4 text-sm text-gray-600">Checking session...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // fallback while redirecting
  }

  return <>{children}</>
}
