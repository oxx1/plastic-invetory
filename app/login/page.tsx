"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const { login, isLoading } = useAuth()
  const [logo, setLogo] = useState<string | null>(null)

  // Load logo from Supabase on mount
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const { data: logoData } = await supabase.from("settings").select("value").eq("key", "company_logo").single()
        if (logoData) {
          setLogo(logoData.value)
        }
      } catch (error) {
        console.error("Error fetching logo:", error)
      }
    }
    fetchLogo()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const success = await login(username, password)
      if (success) {
        router.push("/dashboard")
      } else {
        setError("Invalid username or password")
      }
    } catch (err) {
      setError("An error occurred during login")
      console.error(err)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-32 h-32 rounded-lg overflow-hidden shadow-lg bg-white border-2 border-gray-200 mb-4">
            <img src={logo || "/placeholder.svg"} alt="Company Logo" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Plastic Is Fantastic
          </CardTitle>
          <CardDescription>Enter your credentials to access the inventory system</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin or production"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
            </div>
            <Button type="submit" className="mt-6 w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">Inventory Management System</p>
        </CardFooter>
      </Card>
    </div>
  )
}
