"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ParkingAnalytics } from "@/components/parking-analytics"

// Mock parking lots data
const parkingLots = [
  {
    id: "1",
    name: "North P Lot",
    capacity: 80,
    totalSpots: 200,
    location: "North Campus",
  },
  {
    id: "2",
    name: "Library Lot",
    capacity: 30,
    totalSpots: 150,
    location: "Central Campus",
  },
  {
    id: "3",
    name: "Engineering Garage",
    capacity: 95,
    totalSpots: 300,
    location: "South Campus",
  },
  {
    id: "4",
    name: "Student Union Lot",
    capacity: 60,
    totalSpots: 250,
    location: "Central Campus",
  },
]

// Group parking lots by location
const locationGroups = parkingLots.reduce(
  (acc, lot) => {
    if (!acc[lot.location]) {
      acc[lot.location] = []
    }
    acc[lot.location].push(lot)
    return acc
  },
  {} as Record<string, typeof parkingLots>,
)

export default function ParkingStatusPage() {
  const [selectedLot, setSelectedLot] = useState(parkingLots[0])

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Parking Lot Status</h1>
          <p className="text-muted-foreground">View real-time parking availability and forecasts</p>
        </div>

        {/* Lot Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Parking Lot</CardTitle>
            <CardDescription>Choose a parking lot to view detailed information</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedLot.id}
              onValueChange={(value) => {
                const lot = parkingLots.find((l) => l.id === value)
                if (lot) setSelectedLot(lot)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a parking lot" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(locationGroups).map(([location, lots]) => (
                  <div key={location}>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">{location}</div>
                    {lots.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.name} ({lot.capacity}% full)
                      </SelectItem>
                    ))}
                    {location !== Object.keys(locationGroups).slice(-1)[0] && (
                      <div className="px-2 py-1.5">
                        <div className="h-px bg-muted" />
                      </div>
                    )}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Lot Information and Analytics */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedLot.name}</CardTitle>
              <CardDescription>
                Located in {selectedLot.location} • Total Spots: {selectedLot.totalSpots}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <ParkingAnalytics
                  lotId={selectedLot.id}
                  lotName={selectedLot.name}
                  currentCapacity={selectedLot.capacity}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

