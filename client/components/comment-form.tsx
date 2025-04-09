"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons"

export default function CommentForm() {
    const [message, setMessage] = useState("")
    const [type, setType] = useState<string>("General")
    const [rating, setRating] = useState<number>(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    // Available feedback types
    const feedbackTypes = ["General", "Bug Report", "Feature Request", "Support", "Complaint"]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // Prepare the request payload
            const payload = {
                message,
                rating,
                reply: "", // Empty string as per the required format
                type,
            }
            const token = localStorage.getItem("token")

            // Send POST request to the feedback endpoint
            const response = await fetch("https://p4sbu-yu75.onrender.com/feedback", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || "Failed to submit feedback")
            }

            // Show success message
            toast({
                title: "Feedback submitted",
                description: "Thank you for your feedback!",
            })

            // Reset form
            setMessage("")
            setRating(0)
            setType("General")
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to submit your feedback. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Render stars for rating
    const renderStars = () => {
        return (
            <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                        {star <= rating ? (
                            <StarFilledIcon className="h-6 w-6 text-yellow-500" />
                        ) : (
                            <StarIcon className="h-6 w-6 text-gray-300 hover:text-yellow-500" />
                        )}
                    </button>
                ))}
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Submit Feedback</CardTitle>
                <CardDescription>Share your thoughts or report issues with the parking system</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="feedbackType">Feedback Type</Label>
                        <ToggleGroup
                            type="single"
                            value={type}
                            onValueChange={(value) => value && setType(value)}
                            className="flex flex-wrap gap-2"
                        >
                            {feedbackTypes.map((feedbackType) => (
                                <ToggleGroupItem key={feedbackType} value={feedbackType} className="px-3 py-2 text-sm">
                                    {feedbackType}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rating">Rating</Label>
                        {renderStars()}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Your Message</Label>
                        <Textarea
                            id="message"
                            placeholder="Type your feedback here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={5}
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit Feedback"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
