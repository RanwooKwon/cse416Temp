"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Dummy comment data
const dummyComments = [
    {
        id: 1,
        type: "feedback",
        content: "The new parking reservation system is very intuitive and easy to use!",
        date: "2025-03-15",
        status: "pending",
        adminResponse: null,
    },
    {
        id: 2,
        type: "issue",
        content: "I'm having trouble finding available spots in the North Lot during peak hours.",
        date: "2025-03-10",
        status: "responded",
        adminResponse:
            "Thank you for reporting this issue. We're working on optimizing the allocation of parking spots during peak hours.",
    },
    {
        id: 3,
        type: "suggestion",
        content: "It would be great if we could see a heat map of parking availability throughout the day.",
        date: "2025-03-05",
        status: "pending",
        adminResponse: null,
    },
]

export default function UserCommentsList() {
    const [comments] = useState(dummyComments)

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

    return (
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
                                {comment.adminResponse && (
                                    <div className="bg-muted p-3 rounded-md mt-2">
                                        <p className="text-sm font-medium mb-1">Admin Response:</p>
                                        <p className="text-sm">{comment.adminResponse}</p>
                                    </div>
                                )}
                                <div className="mt-2 text-sm text-muted-foreground">
                                    Status: <span className="font-medium capitalize">{comment.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
