"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons"
import { ChevronLeft, ChevronRight, Send } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Feedback {
  feedbackID: number
  userID: number
  userName?: string // This might be added by joining user data
  date: string
  message: string
  rating: number
  reply: string | null
  type: string
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [responses, setResponses] = useState<Record<number, string>>({})
  const [respondingTo, setRespondingTo] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [totalPages, setTotalPages] = useState(1)

  // Dialog state for response
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)

  useEffect(() => {
    fetchFeedback()
  }, [])

  // Calculate total pages whenever feedback array changes
  useEffect(() => {
    setTotalPages(Math.ceil(feedback.length / itemsPerPage))
  }, [feedback])

  const fetchFeedback = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get token from localStorage
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      const response = await fetch("http://localhost:8000/admin/feedback", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch feedback: ${response.status}`)
      }

      const data = await response.json()

      // Sort by date (newest first)
      const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setFeedback(sortedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch feedback")
      console.error("Error fetching feedback:", err)
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleRespond = (item: Feedback) => {
    setSelectedFeedback(item)
    setResponses((prev) => ({ ...prev, [item.feedbackID]: item.reply || "" }))
    setIsResponseDialogOpen(true)
  }

  const submitResponse = async () => {
    if (!selectedFeedback) return

    const id = selectedFeedback.feedbackID
    const responseText = responses[id] || ""

    if (!responseText.trim()) {
      toast({
        title: "Error",
        description: "Response cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Prepare the updated feedback with the response
      const updatedFeedback = {
        ...selectedFeedback,
        reply: responseText,
      }

      // Send the update to the API using the correct endpoint
      const response = await fetch(`http://localhost:8000/feedback/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedFeedback),
      })

      if (!response.ok) {
        throw new Error(`Failed to update feedback: ${response.status}`)
      }

      // Update the local state
      setFeedback(feedback.map((f) => (f.feedbackID === id ? { ...f, reply: responseText } : f)))

      // Close dialog and reset state
      setIsResponseDialogOpen(false)
      setSelectedFeedback(null)

      // Show success message
      toast({
        title: "Response sent",
        description: "Your response has been sent to the user.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send response",
        variant: "destructive",
      })
      console.error("Error sending response:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Pagination functions
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Get current page's feedback items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return feedback.slice(startIndex, endIndex)
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxPageButtons = 5 // Maximum number of page buttons to show

    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2))
    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1)

    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return pageNumbers
  }

  if (isLoading) {
    return (
        <div className="container mx-auto py-10">
          <h1 className="text-3xl font-bold mb-6">User Feedback</h1>
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
        <div className="container mx-auto py-10">
          <h1 className="text-3xl font-bold mb-6">User Feedback</h1>
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>There was a problem loading feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error}</p>
              <Button onClick={fetchFeedback} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
    )
  }

  return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">User Feedback</h1>
        <Card>
          <CardHeader>
            <CardTitle>Review Feedback</CardTitle>
            <CardDescription>Respond to user feedback and questions</CardDescription>
          </CardHeader>
          <CardContent>
            {feedback.length === 0 ? (
                <p className="text-muted-foreground py-4">No feedback has been submitted yet.</p>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getCurrentPageItems().map((item) => (
                        <TableRow key={item.feedbackID}>
                          <TableCell>{item.userID}</TableCell>
                          <TableCell>
                            <Badge variant={getTypeVariant(item.type)} className="capitalize">
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{renderRating(item.rating)}</TableCell>
                          <TableCell className="max-w-md">
                            <div className="line-clamp-2">{item.message}</div>
                            {item.reply && (
                                <div className="mt-2 text-sm text-muted-foreground line-clamp-1">
                                  <span className="font-medium">Response:</span> {item.reply}
                                </div>
                            )}
                          </TableCell>
                          <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={item.reply ? "success" : "secondary"} className="capitalize">
                              {item.reply ? "responded" : "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => handleRespond(item)}>
                              {item.reply ? "Edit Response" : "Respond"}
                            </Button>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </CardContent>
          {feedback.length > 0 && (
              <CardFooter className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, feedback.length)}{" "}
                  of {feedback.length} items
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {getPageNumbers().map((page) => (
                      <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                      >
                        {page}
                      </Button>
                  ))}

                  <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
          )}
        </Card>

        {/* Response Dialog */}
        <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{selectedFeedback?.reply ? "Edit Response" : "Respond to Feedback"}</DialogTitle>
              <DialogDescription>
                {selectedFeedback?.reply
                    ? "Update your response to this feedback"
                    : "Provide a helpful response to the user's feedback"}
              </DialogDescription>
            </DialogHeader>

            {selectedFeedback && (
                <div className="space-y-4 py-4">
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge variant={getTypeVariant(selectedFeedback.type)} className="capitalize">
                        {selectedFeedback.type}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {new Date(selectedFeedback.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm mr-2">Rating:</span>
                      {renderRating(selectedFeedback.rating)}
                    </div>
                    <p className="text-sm mt-2">{selectedFeedback.message}</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="response" className="text-sm font-medium">
                      Your Response
                    </label>
                    <Textarea
                        id="response"
                        placeholder="Type your response here..."
                        value={responses[selectedFeedback.feedbackID] || ""}
                        onChange={(e) =>
                            setResponses((prev) => ({
                              ...prev,
                              [selectedFeedback.feedbackID]: e.target.value,
                            }))
                        }
                        rows={5}
                        className="resize-none"
                    />
                  </div>
                </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResponseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitResponse} disabled={isSubmitting} className="gap-2">
                {isSubmitting ? "Sending..." : "Send Response"}
                {!isSubmitting && <Send className="h-4 w-4" />}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}
