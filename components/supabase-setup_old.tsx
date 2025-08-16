"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ExternalLink } from "lucide-react"

interface SupabaseSetupProps {
  onConfigured: (url: string, key: string) => void
}

export function SupabaseSetup({ onConfigured }: SupabaseSetupProps) {
  const [url, setUrl] = useState("")
  const [key, setKey] = useState("")
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Try to load from localStorage
    const savedUrl = localStorage.getItem("supabase_url")
    const savedKey = localStorage.getItem("supabase_key")

    if (savedUrl && savedKey) {
      setUrl(savedUrl)
      setKey(savedKey)
    }
  }, [])

  const testConnection = async () => {
    if (!url || !key) {
      setError("Please enter both URL and API key")
      return
    }

    setTesting(true)
    setError("")

    try {
      // Test the connection by creating a temporary client
      const { createClient } = await import("@supabase/supabase-js")
      const testClient = createClient(url, key)

      // Try to get the current user (this will test the connection)
      const { error: authError } = await testClient.auth.getSession()

      if (authError && authError.message.includes("Invalid API key")) {
        throw new Error("Invalid API key")
      }

      // Save to localStorage
      localStorage.setItem("supabase_url", url)
      localStorage.setItem("supabase_key", key)

      // Call the callback
      onConfigured(url, key)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed")
    }

    setTesting(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <CardTitle>Configure Supabase Connection</CardTitle>
          </div>
          <CardDescription>
            Enter your Supabase project credentials to get started. These will be saved locally for future use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="supabase-url">Supabase URL</Label>
              <Input
                id="supabase-url"
                type="url"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">Found in Settings → API in your Supabase dashboard</p>
            </div>

            <div>
              <Label htmlFor="supabase-key">Anon/Public Key</Label>
              <Input
                id="supabase-key"
                type="password"
                placeholder="eyJ..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">Your anon/public key from Settings → API</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
            )}

            <Button onClick={testConnection} disabled={testing || !url || !key} className="w-full">
              {testing ? "Testing Connection..." : "Save & Test Connection"}
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">How to find your credentials:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Go to your Supabase dashboard</li>
              <li>Navigate to Settings → API</li>
              <li>Copy the Project URL and anon/public key</li>
              <li>Paste them above and click "Save & Test Connection"</li>
            </ol>

            <Button asChild variant="outline" className="mt-3">
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Supabase Dashboard
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
