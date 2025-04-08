"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface UserProfile {
  userId: number
  userName: string
  email: string
  phone: string
  userType: string
}

interface UserComment {
  id: number
  type: string
  content: string
  date: string
  status: string
  adminResponse: string | null
}

export default function ProfileForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [comments, setComments] = useState<UserComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("profile")

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true)

        // In a real application, this would be an API call
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Mock profile data
        setProfile({
          userId: 101,
          userName: "John Doe",
          email: "john.doe@stonybrook.edu",
          phone: "555-123-4567",
          userType: "Faculty member",
        })

        // Mock comments data
        setComments([
          {
            id: 1,
            type: "feedback",
            content: "The new parking reservation system is very intuitive and easy to use!",
            date: "2025-03-15",
            status: "responded",
            adminResponse: "Thank you for your positive feedback! We're glad you're enjoying the new system.",
          },
          {
            id: 2,
            type: "issue",
            content: "I'm having trouble finding available spots in the North Lot during peak hours.",
            date: "2025-03-10",
            status: "responded",
            adminResponse:
                "Thank you for reporting this issue. We're working on optimizing the allocation of parking spots during peak hours. We've added additional monitoring to the North Lot and will be adjusting availability based on usage patterns.",
          },
          {
            id: 3,
            type: "suggestion",
            content: "It would be great if we could see a heat map of parking availability throughout the day.",
            date: "2025-03-05",
            status: "pending",
            adminResponse: null,
          },
          {
            id: 4,
            type: "question",
            content: "Is there a way to set up recurring reservations for the same time slot each week?",
            date: "2025-03-02",
            status: "responded",
            adminResponse:
                "Yes! We've recently added this feature. Go to 'Make a Reservation' and look for the 'Recurring' option when selecting your time slot. You can set up weekly or monthly recurring reservations.",
          },
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [])

  // Function to get badge variant based on comment type
  const getTypeVariant = (type: string) => {
    switch (type) {
      case "feedback":
        return "default"
      case "suggestion":
        return "secondary"
      case "issue":
        return "destructive"
      case "question":
        return "outline"
      default:
        return "default"
    }
  }

  if (isLoading) {
    return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
    )
  }

  if (error) {
    return (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>There was a problem loading your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
    )
  }

  return (
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile Information</TabsTrigger>
            <TabsTrigger value="comments">My Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={profile?.userName || ""} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile?.email || ""} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={profile?.phone || ""} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>User Category</Label>
                  <Input value={profile?.userType || ""} readOnly />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card>
              <CardHeader>
                <CardTitle>My Comments</CardTitle>
                <CardDescription>View your submitted feedback and comments</CardDescription>
              </CardHeader>
              <CardContent>
                {comments.length === 0 ? (
                    <p className="text-muted-foreground">You haven't submitted any comments yet.</p>
                ) : (
                    <div className="space-y-6">
                      {comments.map((comment) => (
                          <div key={comment.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <Badge variant={getTypeVariant(comment.type)} className="capitalize">
                                {comment.type}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{comment.date}</span>
                            </div>
                            <p className="mb-4">{comment.content}</p>

                            {comment.status === "responded" && (
                                <div className="bg-muted p-4 rounded-md mt-3 border-l-4 border-primary">
                                  <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-semibold text-primary">Admin Response</h4>
                                    <span className="text-xs text-muted-foreground">Responded on {comment.date}</span>
                                  </div>
                                  <p className="text-sm">{comment.adminResponse}</p>
                                </div>
                            )}

                            <div className="mt-3 flex items-center">
                              <div
                                  className={`w-2 h-2 rounded-full mr-2 ${
                                      comment.status === "responded" ? "bg-green-500" : "bg-amber-500"
                                  }`}
                              ></div>
                              <span className="text-sm text-muted-foreground">
                          Status: <span className="font-medium capitalize">{comment.status}</span>
                        </span>
                            </div>
                          </div>
                      ))}
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}
