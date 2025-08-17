"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AgentPage() {
  const [fullName, setFullName] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session) {
        router.push("/") // Not logged in
        return
      }

      const user = sessionData.session.user

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        setFullName(null)
        setRole(null)
      } else {
        setFullName(profile.full_name ?? "User")
        setRole(profile.role)
      }

      setLoading(false)
    }

    fetchProfile()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear() // optional: ensure stale data is removed
    //router.push("/") // go to login
    window.location.href = "/"; 
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading profile...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 space-y-4">
      <h1 className="text-2xl font-bold">Hello, Agent {fullName ?? "User"}!</h1>

      {role === "agent" && (
        <Button onClick={() => router.push("/leads")}>
          View Leads
        </Button>
      )}

      <Button onClick={handleLogout} variant="secondary">
        <LogOut className="w-4 h-4 mr-2" />
        Logout
      </Button>
    </div>
  )
}
