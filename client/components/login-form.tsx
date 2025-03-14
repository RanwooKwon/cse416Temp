"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginForm() {
  const [loginMethod, setLoginMethod] = useState<"email" | "google">("email")
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isCodeSent, setIsCodeSent] = useState(false)

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would send the verification code to the email
    setIsCodeSent(true)
  }

  const handleGoogleLogin = () => {
    // Here you would implement Google login logic
    setLoginMethod("google")
    setIsCodeSent(true)
  }

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would verify the code and log the user in
    console.log("Verifying code:", verificationCode)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Choose your sign in method</CardDescription>
      </CardHeader>
      <CardContent>
        {!isCodeSent ? (
          <>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">SBU Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.name@stonybrook.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Sign in with SBU Email
              </Button>
            </form>
            <div className="mt-4">
              <Button onClick={handleGoogleLogin} variant="outline" className="w-full">
                Sign in with Google
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Verify Code
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

