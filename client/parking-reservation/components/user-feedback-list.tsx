"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

const mockFeedback = [
  { id: 1, user: "Alice Johnson", date: "2025-03-10", comment: "The new parking system is great!" },
  { id: 2, user: "Bob Williams", date: "2025-03-12", comment: "I'm having trouble finding spots in Lot A." },
]

export default function UserFeedbackList() {
  const [feedback, setFeedback] = useState(mockFeedback)
  const [responses, setResponses] = useState<Record<number, string>>({})

  const handleRespond = (id: number) => {
    // In a real app, you would send this response to an API
    console.log(`Responding to feedback ${id}: ${responses[id]}`)
    setResponses((prev) => ({ ...prev, [id]: "" }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Feedback</CardTitle>
        <CardDescription>Review and respond to user comments</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Response</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedback.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.user}</TableCell>
                <TableCell>{item.date}</TableCell>
                <TableCell>{item.comment}</TableCell>
                <TableCell>
                  <Textarea
                    value={responses[item.id] || ""}
                    onChange={(e) => setResponses((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="Type your response..."
                  />
                  <Button onClick={() => handleRespond(item.id)} className="mt-2" size="sm">
                    Send Response
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

