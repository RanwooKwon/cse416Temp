"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ParkingLotManagementPage() {
  const [parkingLots, setParkingLots] = useState([
    { id: 1, name: "Lot A", capacity: 100, type: "Covered", hourlyRate: 2, dailyRate: 15 },
    { id: 2, name: "Lot B", capacity: 150, type: "Uncovered", hourlyRate: 1.5, dailyRate: 12 },
  ])
  const [newLot, setNewLot] = useState({ name: "", capacity: "", type: "", hourlyRate: "", dailyRate: "" })

  const handleAddLot = (e: React.FormEvent) => {
    e.preventDefault()
    setParkingLots([
      ...parkingLots,
      {
        ...newLot,
        id: parkingLots.length + 1,
        capacity: Number(newLot.capacity),
        hourlyRate: Number(newLot.hourlyRate),
        dailyRate: Number(newLot.dailyRate),
      },
    ])
    setNewLot({ name: "", capacity: "", type: "", hourlyRate: "", dailyRate: "" })
  }

  const handleUpdateCapacity = (id: number, newCapacity: number) => {
    setParkingLots(parkingLots.map((lot) => (lot.id === id ? { ...lot, capacity: newCapacity } : lot)))
  }

  const handleUpdateRates = (id: number, hourlyRate: number, dailyRate: number) => {
    setParkingLots(parkingLots.map((lot) => (lot.id === id ? { ...lot, hourlyRate, dailyRate } : lot)))
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Parking Lot Management</h1>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>View and Edit Parking Lots</CardTitle>
            <CardDescription>Manage existing parking lots</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Daily Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parkingLots.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell>{lot.name}</TableCell>
                    <TableCell>{lot.capacity}</TableCell>
                    <TableCell>{lot.type}</TableCell>
                    <TableCell>${lot.hourlyRate}</TableCell>
                    <TableCell>${lot.dailyRate}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleUpdateCapacity(lot.id, lot.capacity + 10)}
                        size="sm"
                        className="mr-2"
                      >
                        Increase Capacity
                      </Button>
                      <Button
                        onClick={() => handleUpdateRates(lot.id, lot.hourlyRate + 0.5, lot.dailyRate + 2)}
                        size="sm"
                      >
                        Update Rates
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
            <CardTitle>Add New Parking Lot</CardTitle>
            <CardDescription>Create a new parking lot</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddLot} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newLot.name}
                  onChange={(e) => setNewLot({ ...newLot, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={newLot.capacity}
                  onChange={(e) => setNewLot({ ...newLot, capacity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select onValueChange={(value) => setNewLot({ ...newLot, type: value })} required>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select lot type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Covered">Covered</SelectItem>
                    <SelectItem value="Uncovered">Uncovered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={newLot.hourlyRate}
                  onChange={(e) => setNewLot({ ...newLot, hourlyRate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyRate">Daily Rate</Label>
                <Input
                  id="dailyRate"
                  type="number"
                  step="0.01"
                  value={newLot.dailyRate}
                  onChange={(e) => setNewLot({ ...newLot, dailyRate: e.target.value })}
                  required
                />
              </div>
              <Button type="submit">Add Parking Lot</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

