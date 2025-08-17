"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Lead = {
  id: string
  full_name: string
  email: string
  phone: string
  status: string
  source: string
  notes: string
  created_at: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingRole, setCheckingRole] = useState(true)
  const [isAgent, setIsAgent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !sessionData.session) {
          router.push("/") // Not logged in
          return
        }

        const user = sessionData.session.user

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        if (profileError || !profile || profile.role !== "agent") {
          setIsAgent(false)
          setCheckingRole(false)
          return
        }

        setIsAgent(true)
        setCheckingRole(false)

        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          setLeads(data as Lead[])
        }
      } catch (err) {
        setError("An unexpected error occurred.")
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [router])

  if (checkingRole || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Loading leads...</p>
      </div>
    )
  }

  if (!isAgent) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>You are not authorized to view this page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Leads</h1>
      {error && (
        <div className="mb-4 text-red-500 bg-red-100 p-2 rounded">{error}</div>
      )}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Created At</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t">
                <td className="px-4 py-2">{lead.full_name}</td>
                <td className="px-4 py-2">{lead.email}</td>
                <td className="px-4 py-2">{lead.phone}</td>
                <td className="px-4 py-2">{lead.status}</td>
                <td className="px-4 py-2">{lead.source}</td>
                <td className="px-4 py-2">
                  {new Date(lead.created_at).toLocaleDateString("de-DE")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
