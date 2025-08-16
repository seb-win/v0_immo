import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SupabaseConfig() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <CardTitle>Supabase Configuration Required</CardTitle>
          </div>
          <CardDescription>
            Your Supabase environment variables are not configured. Follow these steps to set up your project:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-lg">Step 1: Get Your Supabase Credentials</h3>
              <ol className="list-decimal list-inside space-y-2 mt-2 text-sm text-gray-600">
                <li>Go to your Supabase dashboard</li>
                <li>Navigate to Settings → API</li>
                <li>Copy your Project URL and anon/public key</li>
              </ol>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-lg">Step 2: Set Environment Variables</h3>
              <div className="mt-2 p-3 bg-gray-100 rounded-md font-mono text-sm">
                <div>NEXT_PUBLIC_SUPABASE_URL=your_project_url</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key</div>
              </div>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-lg">Step 3: Run the Database Setup</h3>
              <p className="text-sm text-gray-600 mt-2">
                Make sure you've run the SQL script in your Supabase SQL editor to create the todos table.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button asChild>
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Supabase Dashboard
              </a>
            </Button>
          </div>

          <div className="text-sm text-gray-500">
            <p>
              <strong>Current values:</strong>
            </p>
            <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || "Not set"}</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
