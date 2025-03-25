"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

type FeedbackType = "comment" | "ticket"

interface Feedback {
  id: number
  user: string
  date: string
  type: FeedbackType
  content: string
  status: "Unread" | "Read" | "Responded"
}

export default function FeedbackManagementPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([
    {
      id: 1,
      user: "Alice Johnson",
      date: "2025-03-10",
      type: "comment",
      content: "The new parking system is great!",
      status: "Unread",
    },
    {
      id: 2,
      user: "Bob Williams",
      date: "2025-03-12",
      type: "ticket",
      content: "I'm having trouble finding spots in Lot A.",
      status: "Read",
    },
    {
      id: 3,
      user: "Charlie Brown",
      date: "2025-03-15",
      type: "comment",
      content: "Can we have more EV charging stations?",
      status: "Unread",
    },
  ])
  const [responses, setResponses] = useState<Record<number, string>>({})
  const [respondingTo, setRespondingTo] = useState<number | null>(null)

  const handleRespond = (id: number) => {
    if (respondingTo === id) {
      // Send the response
      console.log(`Responding to feedback ${id}: ${responses[id]}`)
      setFeedback(feedback.map((item) => (item.id === id ? { ...item, status: "Responded" } : item)))
      setResponses((prev) => ({ ...prev, [id]: "" }))
      setRespondingTo(null)
    } else {
      // Open response field
      setRespondingTo(id)
    }
  }

  const handleCancel = (id: number) => {
    setResponses((prev) => ({ ...prev, [id]: "" }))
    setRespondingTo(null)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Feedback Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>User Feedback</CardTitle>
          <CardDescription>Review and respond to user comments and tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedback.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.user}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>
                    <Badge variant={item.type === "comment" ? "secondary" : "destructive"}>{item.type}</Badge>
                  </TableCell>
                  <TableCell>{item.content}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "Unread" ? "destructive" : item.status === "Read" ? "default" : "success"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => handleRespond(item.id)} size="sm">
                      {respondingTo === item.id ? "Send Response" : "Respond"}
                    </Button>
                    {respondingTo === item.id && (
                      <Button onClick={() => handleCancel(item.id)} size="sm" variant="outline" className="ml-2">
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {respondingTo !== null && (
            <div className="mt-4">
              <Textarea
                value={responses[respondingTo] || ""}
                onChange={(e) => setResponses((prev) => ({ ...prev, [respondingTo]: e.target.value }))}
                placeholder="Type your response..."
                className="mb-2"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

