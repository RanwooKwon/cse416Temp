"use client"

import { Card } from "@/components/ui/card"
import { Building2, Car } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ParkingSpot {
  id: string
  name: string
  distance: number
  capacity: number
  covered: boolean
  available: boolean
  rates: {
    monthly: number
    semester: number
    yearly: number
  }
}

interface SimpleParkingGridProps {
  selectedBuilding: string | null
  parkingSpots: ParkingSpot[]
  onSelectSpot: (spot: ParkingSpot) => void
  selectedRate: "monthly" | "semester" | "yearly"
}

export function SimpleParkingGrid({
  // Changed to named export
  selectedBuilding,
  parkingSpots,
  onSelectSpot,
  selectedRate,
}: SimpleParkingGridProps) {
  const gridWidth = 7
  const gridHeight = 3
  const centerX = Math.floor(gridWidth / 2)
  const centerY = Math.floor(gridHeight / 2)

  // Create mock parking spots for each cell
  const createMockSpot = (x: number, y: number): ParkingSpot => {
    const distance = Math.abs(x - centerX) + Math.abs(y - centerY)
    return {
      id: `${x}-${y}`,
      name: `Parking Spot ${x}-${y}`,
      distance,
      capacity: Math.random() > 0.5 ? 80 : 20,
      covered: Math.random() > 0.5,
      available: Math.random() > 0.3,
      rates: {
        monthly: 50 + distance * 10,
        semester: 200 + distance * 40,
        yearly: 500 + distance * 100,
      },
    }
  }

  // Generate grid cells
  const grid = Array.from({ length: gridHeight }).map((_, y) =>
    Array.from({ length: gridWidth }).map((_, x) => {
      // Use provided parking spots if available, otherwise create mock spots
      const existingSpot = parkingSpots.find(
        (p) => Math.round(p.distance) === Math.abs(x - centerX) + Math.abs(y - centerY),
      )
      return existingSpot || createMockSpot(x, y)
    }),
  )

  return (
    <Card className="p-4">
      <div className="grid grid-rows-3 gap-2">
        {grid.map((row, y) => (
          <div key={y} className="grid grid-cols-7 gap-2">
            {row.map((spot, x) => {
              const isCenter = x === centerX && y === centerY

              return (
                <button
                  key={`${x}-${y}`}
                  onClick={() => !isCenter && onSelectSpot(spot)}
                  disabled={isCenter}
                  className={`
                    aspect-square rounded-lg border p-2
                    ${isCenter ? "bg-primary/10" : "hover:bg-accent"}
                    ${!isCenter && "cursor-pointer"}
                    transition-colors
                  `}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    {isCenter ? (
                      <>
                        <Building2 className="h-6 w-6 text-primary" />
                        <span className="text-[10px] text-center mt-1 font-medium">
                          {selectedBuilding || "Select Building"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Car className={`h-5 w-5 ${spot.covered ? "text-primary" : "text-muted-foreground"}`} />
                        <Badge variant={spot.available ? "success" : "destructive"} className="mt-1 text-[10px] px-1">
                          {spot.available ? "Available" : "Full"}
                        </Badge>
                        <div className="text-[10px] mt-1">${spot.rates[selectedRate]}</div>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-primary" /> Covered
        </div>
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground" /> Uncovered
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-[10px]">
            Available
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-[10px]">
            Full
          </Badge>
        </div>
      </div>
    </Card>
  )
}

