"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface User {
  userID: number
  userName: string
  email: string
  phone: string
  userType: string
  status: string
  sbuID?: number
  licenseInfo?: string
}

interface NewUserForm {
  userName: string
  email: string
  password: string
  userType: string
}

interface EditUserForm {
  userID: number
  userName: string
  email: string
  phone: string
  userType: string
  status: string
  sbuID: number | string
  licenseInfo: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [newUser, setNewUser] = useState<NewUserForm>({
    userName: "",
    email: "",
    password: "",
    userType: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Edit user state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<EditUserForm | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Track which user is being approved/removed
  const [approvingUserId, setApprovingUserId] = useState<number | null>(null)
  const [removingUserId, setRemovingUserId] = useState<number | null>(null)

  // Confirmation dialogs
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [userToConfirm, setUserToConfirm] = useState<User | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchUsers()
  }, [])

  // Calculate total pages whenever users array changes
  useEffect(() => {
    setTotalPages(Math.ceil(users.length / pageSize))
  }, [users])

  const fetchUsers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("http://localhost:8000/admin/users")

      if (!response.ok) {
        throw new Error(`Error fetching users: ${response.status}`)
      }

      const data = await response.json()
      setUsers(data)
    } catch (err) {
      console.error("Failed to fetch users:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Prepare request body
      const requestBody = {
        email: newUser.email,
        userName: newUser.userName,
        password: newUser.password,
        userType: newUser.userType,
        phone: null,
        sbuID: null,
        licenseInfo: null,
        status: "pending",
      }

      // Send POST request to register endpoint
      const response = await fetch("http://localhost:8000/user/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Registration failed with status: ${response.status}`)
      }

      // Reset form
      setNewUser({
        userName: "",
        email: "",
        password: "",
        userType: "",
      })

      // Show success message
      toast({
        title: "User added successfully",
        description: "The new user has been registered with pending status.",
      })

      // Refresh user list
      fetchUsers()
    } catch (err) {
      console.error("Failed to add user:", err)
      toast({
        title: "Failed to add user",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show approve confirmation dialog
  const confirmApprove = (user: User) => {
    setUserToConfirm(user)
    setShowApproveConfirm(true)
  }

  // Show remove confirmation dialog
  const confirmRemove = (user: User) => {
    setUserToConfirm(user)
    setShowRemoveConfirm(true)
  }

  const handleApproveUser = async () => {
    if (!userToConfirm) return

    const id = userToConfirm.userID
    setApprovingUserId(id)
    setShowApproveConfirm(false)

    try {
      // Prepare request body with current user data but updated status
      const requestBody = {
        userName: userToConfirm.userName,
        email: userToConfirm.email,
        phone: userToConfirm.phone || "",
        userType: userToConfirm.userType,
        sbuID: userToConfirm.sbuID || 0,
        licenseInfo: userToConfirm.licenseInfo || "",
        status: "approved", // Change status to approved
      }

      // Send PUT request to update user status
      const response = await fetch(`http://localhost:8000/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Failed to approve user: ${response.status}`)
      }

      // Update the user in the local state
      setUsers(users.map((user) => (user.userID === id ? { ...user, status: "approved" } : user)))

      // Show success message
      toast({
        title: "User approved",
        description: "The user has been approved successfully.",
      })
    } catch (err) {
      console.error("Failed to approve user:", err)
      toast({
        title: "Approval failed",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setApprovingUserId(null)
      setUserToConfirm(null)
    }
  }

  const handleRemoveUser = async () => {
    if (!userToConfirm) return

    const id = userToConfirm.userID
    setRemovingUserId(id)
    setShowRemoveConfirm(false)

    try {
      // Send DELETE request to remove the user
      const response = await fetch(`http://localhost:8000/admin/users/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to remove user: ${response.status}`)
      }

      // Remove the user from the local state
      setUsers(users.filter((user) => user.userID !== id))

      // Show success message
      toast({
        title: "User removed",
        description: "The user has been removed successfully.",
      })
    } catch (err) {
      console.error("Failed to remove user:", err)
      toast({
        title: "Removal failed",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setRemovingUserId(null)
      setUserToConfirm(null)
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser({
      userID: user.userID,
      userName: user.userName,
      email: user.email,
      phone: user.phone || "",
      userType: user.userType,
      status: user.status,
      sbuID: user.sbuID || 0,
      licenseInfo: user.licenseInfo || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsUpdating(true)

    try {
      // Format the request body according to the API requirements
      const requestBody = {
        userName: editingUser.userName,
        email: editingUser.email,
        phone: editingUser.phone,
        userType: editingUser.userType,
        sbuID: typeof editingUser.sbuID === "string" ? Number.parseInt(editingUser.sbuID) || 0 : editingUser.sbuID,
        licenseInfo: editingUser.licenseInfo,
        status: editingUser.status,
      }

      const response = await fetch(`http://localhost:8000/admin/users/${editingUser.userID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Failed to update user: ${response.status}`)
      }

      // Update the user in the local state
      setUsers(
          users.map((user) =>
              user.userID === editingUser.userID
                  ? {
                    ...user,
                    userName: editingUser.userName,
                    email: editingUser.email,
                    phone: editingUser.phone,
                    userType: editingUser.userType,
                    sbuID:
                        typeof editingUser.sbuID === "string" ? Number.parseInt(editingUser.sbuID) || 0 : editingUser.sbuID,
                    licenseInfo: editingUser.licenseInfo,
                    status: editingUser.status,
                  }
                  : user,
          ),
      )

      // Close the dialog
      setIsEditDialogOpen(false)
      setEditingUser(null)

      // Show success message
      toast({
        title: "User updated",
        description: "The user profile has been updated successfully.",
      })
    } catch (err) {
      console.error("Failed to update user:", err)
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
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

  // Get current page's users
  const getCurrentPageUsers = () => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return users.slice(startIndex, endIndex)
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
              {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
              ) : error ? (
                  <div className="text-destructive p-4 border border-destructive/20 rounded-md">
                    {error}
                    <Button onClick={fetchUsers} className="mt-2">
                      Retry
                    </Button>
                  </div>
              ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>User Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCurrentPageUsers().map((user) => (
                          <TableRow key={user.userID}>
                            <TableCell>{user.userID}</TableCell>
                            <TableCell>{user.userName}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.phone || "N/A"}</TableCell>
                            <TableCell>{user.userType}</TableCell>
                            <TableCell>{user.status}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                    onClick={() => handleEditUser(user)}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>

                                {user.status === "pending" ? (
                                    <>
                                      <Button
                                          onClick={() => confirmApprove(user)}
                                          size="sm"
                                          disabled={approvingUserId === user.userID}
                                      >
                                        {approvingUserId === user.userID ? "Approving..." : "Approve"}
                                      </Button>
                                      <Button
                                          onClick={() => confirmRemove(user)}
                                          variant="destructive"
                                          size="sm"
                                          disabled={removingUserId === user.userID}
                                      >
                                        {removingUserId === user.userID ? "Removing..." : "Remove"}
                                      </Button>
                                    </>
                                ) : (
                                    <Button
                                        onClick={() => confirmRemove(user)}
                                        variant="destructive"
                                        size="sm"
                                        disabled={removingUserId === user.userID}
                                    >
                                      {removingUserId === user.userID ? "Removing..." : "Remove"}
                                    </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              )}
            </CardContent>
            {!isLoading && !error && users.length > 0 && (
                <CardFooter className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, users.length)} of{" "}
                    {users.length} users
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

          <Card>
            <CardHeader>
              <CardTitle>Add New User</CardTitle>
              <CardDescription>Create a new user account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                      id="username"
                      value={newUser.userName}
                      onChange={(e) => setNewUser({ ...newUser, userName: e.target.value })}
                      required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userType">User Type</Label>
                  <Select onValueChange={(value) => setNewUser({ ...newUser, userType: value })} required>
                    <SelectTrigger id="userType">
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Faculty member">Faculty Member</SelectItem>
                      <SelectItem value="Non-resident student">Non-Resident Student</SelectItem>
                      <SelectItem value="Resident student">Resident Student</SelectItem>
                      <SelectItem value="Visitor">Visitor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding User..." : "Add User"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit User Profile</DialogTitle>
              <DialogDescription>Update user information. Click save when you're done.</DialogDescription>
            </DialogHeader>
            {editingUser && (
                <form onSubmit={handleUpdateUser}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-username" className="text-right">
                        Username
                      </Label>
                      <Input
                          id="edit-username"
                          value={editingUser.userName}
                          onChange={(e) => setEditingUser({ ...editingUser, userName: e.target.value })}
                          className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-email" className="text-right">
                        Email
                      </Label>
                      <Input
                          id="edit-email"
                          type="email"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-phone" className="text-right">
                        Phone
                      </Label>
                      <Input
                          id="edit-phone"
                          value={editingUser.phone}
                          onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                          className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-sbuID" className="text-right">
                        SBU ID
                      </Label>
                      <Input
                          id="edit-sbuID"
                          type="number"
                          value={editingUser.sbuID}
                          onChange={(e) => setEditingUser({ ...editingUser, sbuID: e.target.value })}
                          className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-license" className="text-right">
                        License Info
                      </Label>
                      <Input
                          id="edit-license"
                          value={editingUser.licenseInfo}
                          onChange={(e) => setEditingUser({ ...editingUser, licenseInfo: e.target.value })}
                          className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-userType" className="text-right">
                        User Type
                      </Label>
                      <Select
                          value={editingUser.userType}
                          onValueChange={(value) => setEditingUser({ ...editingUser, userType: value })}
                      >
                        <SelectTrigger id="edit-userType" className="col-span-3">
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Faculty member">Faculty Member</SelectItem>
                          <SelectItem value="Non-resident student">Non-Resident Student</SelectItem>
                          <SelectItem value="Resident student">Resident Student</SelectItem>
                          <SelectItem value="Visitor">Visitor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-status" className="text-right">
                        Status
                      </Label>
                      <Select
                          value={editingUser.status}
                          onValueChange={(value) => setEditingUser({ ...editingUser, status: value })}
                      >
                        <SelectTrigger id="edit-status" className="col-span-3">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? "Saving..." : "Save changes"}
                    </Button>
                  </DialogFooter>
                </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Confirmation Dialog */}
        <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve User Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve the account for {userToConfirm?.userName} ({userToConfirm?.email})? This
                action will grant the user access to the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToConfirm(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApproveUser}>Approve</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Confirmation Dialog */}
        <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove User Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the account for {userToConfirm?.userName} ({userToConfirm?.email})? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToConfirm(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                  onClick={handleRemoveUser}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  )
}
