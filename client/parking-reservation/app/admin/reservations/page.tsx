"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ReservationManagementPage() {
  const [reservations, setReservations] = useState([
    { id: 1, user: "John Doe", date: "2025-03-15", spaces: 3, reason: "Department event", status: "Pending" },
    { id: 2, user: "Jane Smith", date: "2025-03-20", spaces: 2, reason: "Guest lecture", status: "Approved" },
  ])

  const handleApproveReservation = (id: number) => {
    setReservations(reservations.map((res) => (res.id === id ? { ...res, status: "Approved" } : res)))
  }

  const handleRejectReservation = (id: number) => {
    setReservations(reservations.map((res) => (res.id === id ? { ...res, status: "Rejected" } : res)))
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Reservation Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage Reservations</CardTitle>
          <CardDescription>Review and approve multi-space reservations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Spaces</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
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
                  <TableCell>{res.status}</TableCell>
                  <TableCell>
                    {res.status === "Pending" && (
                      <>
                        <Button onClick={() => handleApproveReservation(res.id)} size="sm" className="mr-2">
                          Approve
                        </Button>
                        <Button onClick={() => handleRejectReservation(res.id)} variant="destructive" size="sm">
                          Reject
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

