"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

export default function RegistrationForm() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [userCategory, setUserCategory] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // 간단한 검증
    if (!email || !username || !password || !userCategory) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    // Validate password
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{10,}$/
    if (!passwordRegex.test(password)) {
      toast({
        title: "Password Error",
        description:
          "Password must be at least 10 characters long and include at least one uppercase letter, one number, and one special character.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password Error",
        description: "Passwords do not match.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      // 직접 백엔드 서버로 요청
      const response = await fetch("http://localhost:8000/user/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          userName: username,
          password,
          userType: userCategory,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Registration failed")
      }

      const data = await response.json()

      // Show success message
      setShowSuccess(true)

      // Show toast notification
      toast({
        title: "Account created!",
        description: "Your account has been created successfully.",
        variant: "default",
      })

      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Failed to create account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your details to create an account</CardDescription>
      </CardHeader>
      <CardContent>
        {showSuccess ? (
          <Alert className="bg-green-50 border-green-200 mb-4">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success!</AlertTitle>
            <AlertDescription className="text-green-700">
              Your account has been created successfully. Redirecting to home page...
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userCategory">User Category</Label>
              <Select onValueChange={setUserCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select user category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Faculty member">Faculty Member</SelectItem>
                  <SelectItem value="Non-resident student">Non-Resident Student</SelectItem>
                  <SelectItem value="Resident student">Resident Student</SelectItem>
                  <SelectItem value="Visitor">Visitor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

