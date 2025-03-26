"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegistrationForm() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [userCategory, setUserCategory] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [step, setStep] = useState(1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      // Validate password
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{10,}$/
      if (!passwordRegex.test(password)) {
        alert(
          "Password must be at least 10 characters long and include at least one uppercase letter, one number, and one special character.",
        )
        return
      }
      if (password !== confirmPassword) {
        alert("Passwords do not match.")
        return
      }
      // Move to next step
      setStep(2)
    } else if (step === 2) {
      // Here you would send the verification code to the email
      setStep(3)
    } else {
      // Here you would verify the code and create the account
      console.log("Account created:", { email, username, password, userCategory, verificationCode })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your details to create an account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
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
                    <SelectItem value="faculty">Faculty Member</SelectItem>
                    <SelectItem value="nonResident">Non-Resident Student</SelectItem>
                    <SelectItem value="resident">Resident Student</SelectItem>
                    <SelectItem value="visitor">Visitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {step === 2 && (
            <div className="text-center">
              <p>A verification code has been sent to your email.</p>
              <p>Please check your inbox and enter the code below.</p>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full">
            {step === 1 ? "Next" : step === 2 ? "Send Verification Code" : "Create Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

