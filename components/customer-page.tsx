"use client"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

interface CustomerPageProps {
  fullName: string | null
}

export default function CustomerPage({ fullName }: CustomerPageProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear() // optional: ensure stale data is removed
    //router.push("/") // go to login
    window.location.href = "/"; 
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Hello, Customer {fullName ?? "User"}!</h1>
      <Button onClick={handleLogout}>
        <LogOut className="w-4 h-4 mr-2" />
        Logout
      </Button>
    </div>
  )
}
