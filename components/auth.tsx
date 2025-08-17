"use client"

import type React from "react"
import type { SupabaseClient } from "@supabase/supabase-js"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"

interface AuthProps {
  supabaseClient: SupabaseClient | null
}

export default function Auth({ supabaseClient }: AuthProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabaseClient) {
      alert("Supabase is not configured. Please check your environment variables.")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
      })
      if (error) {
        alert(`Sign up error: ${error.message}`)
      } else {
        alert("Bitte bestätige deine E-Mail. Danach kannst du dich einloggen.")
      }
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  // --- SIGN IN WITH ROLE-BASED REDIRECT (profiles table) ---
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabaseClient) {
      alert("Supabase is not configured. Please check your environment variables.")
      return
    }

    setLoading(true)
    try {
      // 1) Sign in
      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        alert(`Sign in error: ${signInError.message}`)
        return
      }

      // 2) Grab the user
      const { data: userData, error: userErr } = await supabaseClient.auth.getUser()
      if (userErr) {
        alert(`Could not load user: ${userErr.message}`)
        return
      }
      const userId = userData.user?.id
      if (!userId) {
        alert("No user id returned after login.")
        return
      }

      // 3) Load role from profiles
      const { data: profile, error: profileErr } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      if (profileErr) {
        // If profile missing or RLS prevents it, default to customer-page
        // (You can log profileErr.message in dev if needed)
        window.location.href = "/customer-page"
        return
      }

      const role = (profile?.role || "").toLowerCase()

      // 4) Redirect by role (adjust routes if yours differ)
      if (role === "agent") {
        window.location.href = "/agent-page"
      } else {
        window.location.href = "/customer-page"
      }
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Bitte melde dich an oder registriere dich.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Anmelden…" : "Anmelden"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email_signup">Email</Label>
                  <Input
                    id="email_signup"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_signup">Passwort</Label>
                  <Input
                    id="password_signup"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Registrieren…" : "Registrieren"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
