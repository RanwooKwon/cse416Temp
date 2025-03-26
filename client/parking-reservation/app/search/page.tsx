"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Car, Umbrella } from "lucide-react"
import { SimpleParkingGrid } from "@/components/simple-parking-grid" // Updated import
import { ParkingAnalytics } from "@/components/parking-analytics"

// Mock data
const buildings = [
  "Student Activities Center",
  "Library",
  "Engineering Building",
  "Chemistry Building",
  "Physics Building",
  "Computer Science Building",
]

const parkingSpots = [
  {
    id: "1",
    name: "North P Lot",
    distance: 1,
    capacity: 80,
    covered: true,
    available: true,
    rates: {
      monthly: 50,
      semester: 200,
      yearly: 500,
    },
  },
  {
    id: "2",
    name: "Library Lot",
    distance: 2,
    capacity: 30,
    covered: false,
    available: false,
    rates: {
      monthly: 60,
      semester: 240,
      yearly: 600,
    },
  },
  {
    id: "3",
    name: "Engineering Garage",
    distance: 3,
    capacity: 95,
    covered: true,
    available: true,
    rates: {
      monthly: 70,
      semester: 280,
      yearly: 700,
    },
  },
]

export default function SearchPage() {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("")
  const [maxDistance, setMaxDistance] = useState(5)
  const [minCapacity, setMinCapacity] = useState(0)
  const [parkingType, setParkingType] = useState<"all" | "covered" | "uncovered">("all")
  const [rateType, setRateType] = useState<"monthly" | "semester" | "yearly">("monthly")
  const [selectedSpot, setSelectedSpot] = useState<(typeof parkingSpots)[0] | null>(null)

  // Filter parking spots based on criteria
  const filteredSpots = parkingSpots.filter((spot) => {
    if (spot.distance > maxDistance) return false
    if (spot.capacity < minCapacity) return false
    if (parkingType !== "all" && spot.covered !== (parkingType === "covered")) return false
    return true
  })

  return (
    <div className="container mx-auto py-6">
      <div className="grid lg:grid-cols-[350px_1fr] gap-6">
        {/* Filters */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Find Parking</CardTitle>
              <CardDescription>Select your destination and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Building</Label>
                <Select onValueChange={setSelectedBuilding} value={selectedBuilding}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building} value={building}>
                        {building}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Maximum Distance ({maxDistance} blocks)</Label>
                <Slider value={[maxDistance]} onValueChange={(value) => setMaxDistance(value[0])} max={5} step={1} />
              </div>

              <div className="space-y-2">
                <Label>Minimum Capacity ({minCapacity}%)</Label>
                <Slider value={[minCapacity]} onValueChange={(value) => setMinCapacity(value[0])} max={100} step={5} />
              </div>

              <div className="space-y-2">
                <Label>Parking Type</Label>
                <Select
                  onValueChange={(value: "all" | "covered" | "uncovered") => setParkingType(value)}
                  value={parkingType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="covered">Covered Only</SelectItem>
                    <SelectItem value="uncovered">Uncovered Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rate Type</Label>
                <Select
                  onValueChange={(value: "monthly" | "semester" | "yearly") => setRateType(value)}
                  value={rateType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rate type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="semester">Semester</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grid and Results */}
        <div className="space-y-6">
          <SimpleParkingGrid
            selectedBuilding={selectedBuilding}
            parkingSpots={filteredSpots}
            onSelectSpot={setSelectedSpot}
            selectedRate={rateType}
          />

          {selectedSpot && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Selected Parking Space</CardTitle>
                  <CardDescription>Review details and reserve</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{selectedSpot.name}</h3>
                    <Badge variant={selectedSpot.available ? "success" : "destructive"}>
                      {selectedSpot.available ? "Available" : "Full"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{selectedSpot.distance * 2} min walk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span>
                        ${selectedSpot.rates[rateType]}/{rateType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Umbrella className="h-4 w-4" />
                      <span>{selectedSpot.covered ? "Covered" : "Uncovered"}</span>
                    </div>
                  </div>
                  <Button className="w-full" disabled={!selectedSpot.available}>
                    {selectedSpot.available ? "Reserve This Space" : "Space Unavailable"}
                  </Button>
                </CardContent>
              </Card>

              {/* Add the analytics component */}
              <ParkingAnalytics
                lotId={selectedSpot.id}
                lotName={selectedSpot.name}
                currentCapacity={selectedSpot.capacity}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

