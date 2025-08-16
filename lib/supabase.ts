import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if environment variables are properly set
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "undefined" &&
  supabaseAnonKey !== "undefined"
)

// Create client only if properly configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        timeout: 30000, // Increase timeout for realtime connections
      },
    })
  : null

// Dynamic client creation for manual configuration
export function createSupabaseClient(url: string, key: string): SupabaseClient {
  try {
    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        timeout: 30000, // Increase timeout for realtime connections
      },
    })
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    throw error
  }
}

// Get client from localStorage if available
export function getStoredSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null

  try {
    const storedUrl = localStorage.getItem("supabase_url")
    const storedKey = localStorage.getItem("supabase_key")

    if (storedUrl && storedKey) {
      return createSupabaseClient(storedUrl, storedKey)
    }
  } catch (error) {
    console.error("Error getting stored Supabase client:", error)
  }

  return null
}

export type Todo = {
  id: number
  text: string
  completed: boolean
  created_at: string
  user_id: string
}
