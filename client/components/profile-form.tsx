"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons"

interface UserProfile {
  userId: number
  userName: string
  email: string
  phone: string
  userType: string
}

interface UserFeedback {
  feedbackID: number
  userID: number
  date: string
  message: string
  rating: number
  reply: string | null
  type: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [feedbackList, setFeedbackList] = useState<UserFeedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("profile")

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true)

        // Get user ID and token from localStorage
        const userId = localStorage.getItem("userId")
        const token = localStorage.getItem("token")

        if (!userId || !token) {
          throw new Error("Authentication information not found. Please log in again.")
        }

        // Fetch user profile data
        const profileResponse = await fetch(`http://localhost:8000/user/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!profileResponse.ok) {
          throw new Error("Failed to fetch profile data")
        }

        const profileData = await profileResponse.json()
        setProfile(profileData)

        // Fetch user feedback data
        const feedbackResponse = await fetch(`http://localhost:8000/user/${userId}/feedback`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!feedbackResponse.ok) {
          throw new Error("Failed to fetch feedback data")
        }

        const feedbackData = await feedbackResponse.json()
        setFeedbackList(feedbackData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile data")
        console.error("Error fetching profile data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [])

  // Function to get badge variant based on feedback type
  const getTypeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case "general":
        return "default"
      case "feature request":
        return "secondary"
      case "bug report":
        return "destructive"
      case "support":
        return "outline"
      case "complaint":
        return "destructive"
      default:
        return "default"
    }
  }

  // Render star rating
  const renderRating = (rating: number) => {
    return (
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
              <span key={star}>
            {star <= rating ? (
                <StarFilledIcon className="h-4 w-4 text-yellow-500" />
            ) : (
                <StarIcon className="h-4 w-4 text-gray-300" />
            )}
          </span>
          ))}
        </div>
    )
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
            <TabsTrigger value="comments">My Feedback</TabsTrigger>
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
                <CardTitle>My Feedback</CardTitle>
                <CardDescription>View your submitted feedback and responses</CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackList.length === 0 ? (
                    <p className="text-muted-foreground">You haven't submitted any feedback yet.</p>
                ) : (
                    <div className="space-y-6">
                      {feedbackList.map((feedback) => (
                          <div key={feedback.feedbackID} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={getTypeVariant(feedback.type)} className="capitalize">
                                  {feedback.type}
                                </Badge>
                                {renderRating(feedback.rating)}
                              </div>
                              <span className="text-sm text-muted-foreground">{feedback.date}</span>
                            </div>
                            <p className="mb-4">{feedback.message}</p>

                            {feedback.reply && (
                                <div className="bg-muted p-4 rounded-md mt-3 border-l-4 border-primary">
                                  <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-semibold text-primary">Admin Response</h4>
                                    <span className="text-xs text-muted-foreground">Responded on {feedback.date}</span>
                                  </div>
                                  <p className="text-sm">{feedback.reply}</p>
                                </div>
                            )}

                            <div className="mt-3 flex items-center">
                              <div
                                  className={`w-2 h-2 rounded-full mr-2 ${
                                      feedback.reply ? "bg-green-500" : "bg-amber-500"
                                  }`}
                              ></div>
                              <span className="text-sm text-muted-foreground">
                          Status:{" "}
                                <span className="font-medium capitalize">
                            {feedback.reply ? "responded" : "pending"}
                          </span>
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
