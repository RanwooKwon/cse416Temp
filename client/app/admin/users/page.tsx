"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function UserManagementPage() {
  const [users, setUsers] = useState([
    { id: 1, name: "John Doe", username: "john123", role: "Student", status: "Approved" },
    { id: 2, name: "Jane Smith", username: "jane246", role: "Faculty", status: "Pending" },
  ])
  const [newUser, setNewUser] = useState({ name: "", username: "", role: "" })

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()
    setUsers([...users, { ...newUser, id: users.length + 1, status: "Pending" }])
    setNewUser({ name: "", username: "", role: "" })
  }

  const handleApproveUser = (id: number) => {
    setUsers(users.map((user) => (user.id === id ? { ...user, status: "Approved" } : user)))
  }

  const handleRemoveUser = (id: number) => {
    setUsers(users.filter((user) => user.id !== id))
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>View and Edit Users</CardTitle>
            <CardDescription>Manage existing user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell>
                      {user.status === "Pending" && (
                        <Button onClick={() => handleApproveUser(user.id)} size="sm" className="mr-2">
                          Approve
                        </Button>
                      )}
                      <Button onClick={() => handleRemoveUser(user.id)} variant="destructive" size="sm">
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
            <CardDescription>Create a new user account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">username</Label>
                <Input
                  id="username"
                  type="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select onValueChange={(value) => setNewUser({ ...newUser, role: value })} required>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select user role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">Add User</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

