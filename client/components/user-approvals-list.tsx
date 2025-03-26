"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock data for pending user approvals
const mockPendingUsers = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Student", requestDate: "2025-03-01" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Faculty", requestDate: "2025-03-02" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "Staff", requestDate: "2025-03-03" },
]

export default function UserApprovalsList() {
  const [pendingUsers, setPendingUsers] = useState(mockPendingUsers)

  const handleApprove = (userId: number) => {
    // In a real application, you would call an API to approve the user
    console.log(`Approving user with ID: ${userId}`)
    setPendingUsers(pendingUsers.filter((user) => user.id !== userId))
  }

  const handleReject = (userId: number) => {
    // In a real application, you would call an API to reject the user
    console.log(`Rejecting user with ID: ${userId}`)
    setPendingUsers(pendingUsers.filter((user) => user.id !== userId))
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pending Approvals</h3>
      {pendingUsers.length === 0 ? (
        <p>No pending user approvals.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Request Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.requestDate}</TableCell>
                <TableCell>
                  <div className="space-x-2">
                    <Button onClick={() => handleApprove(user.id)} size="sm">
                      Approve
                    </Button>
                    <Button onClick={() => handleReject(user.id)} variant="destructive" size="sm">
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

