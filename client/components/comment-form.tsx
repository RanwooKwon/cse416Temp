"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export default function CommentForm() {
    const [comment, setComment] = useState("")
    const [commentType, setCommentType] = useState<string>("feedback")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // In a real application, this would be an API call
            // await fetch("/api/comments", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify({ comment, commentType }),
            // })

            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, 1000))

            // Show success message
            toast({
                title: "Comment submitted",
                description: "Thank you for your feedback!",
            })

            // Reset form
            setComment("")
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to submit your comment. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
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
                        <Label htmlFor="commentType">Feedback Type</Label>
                        <Select value={commentType} onValueChange={setCommentType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select feedback type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="feedback">General Feedback</SelectItem>
                                <SelectItem value="suggestion">Suggestion</SelectItem>
                                <SelectItem value="issue">Report Issue</SelectItem>
                                <SelectItem value="question">Question</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="comment">Your Comment</Label>
                        <Textarea
                            id="comment"
                            placeholder="Type your feedback here..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
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
