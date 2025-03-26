"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const mockReservations = [
  { id: 1, user: "John Doe", date: "2025-03-15", spaces: 3, reason: "Department event" },
  { id: 2, user: "Jane Smith", date: "2025-03-20", spaces: 2, reason: "Guest lecture" },
]

export default function ReservationApprovalsList() {
  const [reservations, setReservations] = useState(mockReservations)

  const handleApprove = (id: number) => {
    setReservations(reservations.filter((res) => res.id !== id))
    // In a real app, you would call an API to approve the reservation
  }

  const handleReject = (id: number) => {
    setReservations(reservations.filter((res) => res.id !== id))
    // In a real app, you would call an API to reject the reservation
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Space Reservation Approvals</CardTitle>
        <CardDescription>Review and approve reservations for multiple parking spaces</CardDescription>
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <p>No pending multi-space reservations.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Spaces</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((res) => (
                <TableRow key={res.id}>
                  <TableCell>{res.user}</TableCell>
                  <TableCell>{res.date}</TableCell>
                  <TableCell>{res.spaces}</TableCell>
                  <TableCell>{res.reason}</TableCell>
                  <TableCell>
                    <div className="space-x-2">
                      <Button onClick={() => handleApprove(res.id)} size="sm">
                        Approve
                      </Button>
                      <Button onClick={() => handleReject(res.id)} variant="destructive" size="sm">
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

