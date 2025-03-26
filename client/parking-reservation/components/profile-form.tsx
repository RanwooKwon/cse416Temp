"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// This would typically come from your API or auth context
const mockUserData = {
  id: "12345",
  firstName: "John",
  lastName: "Doe",
  sbuId: "123456789",
  driverLicense: "NY1234567",
  vehicleId: "ABC-1234",
  address: "123 Campus Drive, Stony Brook, NY 11790",
}

export default function ProfileForm() {
  const [isEditing, setIsEditing] = useState(false)
  const [userData, setUserData] = useState(mockUserData)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUserData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send the updated data to your API
    console.log("Updated user data:", userData)
    setIsEditing(false)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>View and edit your profile information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="id">User ID (Read-only)</Label>
            <Input id="id" value={userData.id} readOnly disabled />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={userData.firstName}
                onChange={handleInputChange}
                readOnly={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={userData.lastName}
                onChange={handleInputChange}
                readOnly={!isEditing}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sbuId">SBU ID</Label>
            <Input id="sbuId" name="sbuId" value={userData.sbuId} onChange={handleInputChange} readOnly={!isEditing} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverLicense">Driver License Information</Label>
            <Input
              id="driverLicense"
              name="driverLicense"
              value={userData.driverLicense}
              onChange={handleInputChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle ID (Plate Number)</Label>
            <Input
              id="vehicleId"
              name="vehicleId"
              value={userData.vehicleId}
              onChange={handleInputChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              value={userData.address}
              onChange={handleInputChange}
              readOnly={!isEditing}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        {isEditing ? (
          <>
            <Button type="submit" onClick={handleSubmit}>
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        )}
      </CardFooter>
    </Card>
  )
}

