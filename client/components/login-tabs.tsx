"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LoginForm from "@/components/login-form"
import RegistrationForm from "@/components/registration-form"
import PasswordResetForm from "@/components/password-reset-form"

export default function LoginTabs() {
  const [activeTab, setActiveTab] = useState("login")
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "register") {
      setActiveTab("register")
    }
  }, [searchParams])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md mx-auto">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
        <TabsTrigger value="reset">Reset Password</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <LoginForm />
      </TabsContent>
      <TabsContent value="register">
        <RegistrationForm />
      </TabsContent>
      <TabsContent value="reset">
        <PasswordResetForm />
      </TabsContent>
    </Tabs>
  )
}

