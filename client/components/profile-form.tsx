"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface UserProfile {
  userId: number
  userName: string
  email: string
  phone: string
  userType: string
}

export default function ProfileForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userId = localStorage.getItem("userId")
        if (!userId) {
          throw new Error("User ID not found")
        }

        const token = localStorage.getItem("token")
        const response = await fetch(`http://localhost:8000/user/${userId}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error("Failed to fetch profile")
        }

        const data = await response.json()
        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Your personal information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input 
            value={profile?.userName || ""} 
            readOnly 
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input 
            value={profile?.email || ""} 
            readOnly 
          />
        </div>
        <div className="space-y-2">
          <Label>User Category</Label>
          <Input 
            value={profile?.userType || ""} 
            readOnly 
          />
        </div>
      </CardContent>
    </Card>
  )
}

