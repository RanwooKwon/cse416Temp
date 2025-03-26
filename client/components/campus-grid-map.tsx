"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Building2, Car, Trees } from "lucide-react"

// Define the types of cells in our grid
type CellType = "empty" | "building" | "parking" | "path" | "grass"
type BuildingInfo = { name: string; location: [number, number] }
type ParkingInfo = {
  name: string
  location: [number, number]
  capacity: number
  covered: boolean
}

// Mock data for buildings and parking lots
const buildings: BuildingInfo[] = [
  { name: "Student Activities Center", location: [3, 5] },
  { name: "Library", location: [5, 5] },
  { name: "Engineering", location: [7, 3] },
  { name: "Chemistry", location: [3, 7] },
  { name: "Physics", location: [5, 7] },
  { name: "Computer Science", location: [7, 7] },
]

const parkingLots: ParkingInfo[] = [
  { name: "North P Lot", location: [2, 4], capacity: 80, covered: true },
  { name: "Library Lot", location: [4, 4], capacity: 30, covered: false },
  { name: "Engineering Garage", location: [8, 4], capacity: 95, covered: true },
  { name: "South Lot", location: [2, 8], capacity: 60, covered: false },
  { name: "Central Garage", location: [5, 8], capacity: 75, covered: true },
]

// Calculate Manhattan distance between two points
const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
  return Math.abs(point1[0] - point2[0]) + Math.abs(point1[1] - point2[1])
}

interface CampusGridMapProps {
  selectedBuilding: string
  onSelectBuilding: (building: string) => void
}

export default function CampusGridMap({ selectedBuilding, onSelectBuilding }: CampusGridMapProps) {
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null)
  const gridSize = 10 // 10x10 grid

  // Find the selected building's location
  const selectedBuildingInfo = buildings.find((b) => b.name === selectedBuilding)

  // Create the grid
  const grid: CellType[][] = Array(gridSize)
    .fill("empty")
    .map(() => Array(gridSize).fill("empty"))

  // Add grass patches
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (Math.random() < 0.2) {
        grid[i][j] = "grass"
      }
    }
  }

  // Place buildings and parking lots
  buildings.forEach(({ location }) => {
    grid[location[0]][location[1]] = "building"
  })
  parkingLots.forEach(({ location }) => {
    grid[location[0]][location[1]] = "parking"
  })

  // Add paths if a building is selected
  if (selectedBuildingInfo) {
    parkingLots.forEach((parking) => {
      const path = getPath(selectedBuildingInfo.location, parking.location)
      path.forEach(([x, y]) => {
        if (grid[x][y] === "empty" || grid[x][y] === "grass") {
          grid[x][y] = "path"
        }
      })
    })
  }

  // Get path between two points (simple implementation)
  function getPath(start: [number, number], end: [number, number]): [number, number][] {
    const path: [number, number][] = []
    let [x, y] = start
    while (x !== end[0]) {
      x += x < end[0] ? 1 : -1
      path.push([x, y])
    }
    while (y !== end[1]) {
      y += y < end[1] ? 1 : -1
      path.push([x, y])
    }
    return path
  }

  // Get cell content
  const getCellContent = (type: CellType, position: [number, number]): JSX.Element | null => {
    const building = buildings.find((b) => b.location[0] === position[0] && b.location[1] === position[1])
    const parking = parkingLots.find((p) => p.location[0] === position[0] && p.location[1] === position[1])

    switch (type) {
      case "building":
        return (
          <Building2
            className={`h-6 w-6 ${building?.name === selectedBuilding ? "text-primary" : "text-muted-foreground"}`}
          />
        )
      case "parking":
        return <Car className="h-6 w-6 text-muted-foreground" />
      case "grass":
        return <Trees className="h-4 w-4 text-green-500 opacity-50" />
      default:
        return null
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Campus Map</div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Buildings
            </div>
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4" /> Parking
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-primary/20" /> Path
            </div>
          </div>
        </div>
        <div className="grid aspect-square w-full gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
          {grid.map((row, i) =>
            row.map((cell, j) => {
              const building = buildings.find((b) => b.location[0] === i && b.location[1] === j)
              const parking = parkingLots.find((p) => p.location[0] === i && p.location[1] === j)
              const isHovered = hoveredCell?.[0] === i && hoveredCell?.[1] === j
              const isPath = cell === "path"

              return (
                <TooltipProvider key={`${i}-${j}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`aspect-square flex items-center justify-center rounded border ${
                          isHovered ? "border-primary" : "border-border"
                        } ${isPath ? "bg-primary/20" : ""} ${
                          building?.name === selectedBuilding ? "bg-primary/10" : ""
                        }`}
                        onMouseEnter={() => setHoveredCell([i, j])}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => {
                          if (building) {
                            onSelectBuilding(building.name)
                          }
                        }}
                        style={{
                          cursor: building ? "pointer" : "default",
                        }}
                      >
                        {getCellContent(cell, [i, j])}
                      </div>
                    </TooltipTrigger>
                    {(building || parking) && (
                      <TooltipContent>
                        <div className="space-y-2">
                          <div className="font-medium">{building?.name || parking?.name}</div>
                          {parking && (
                            <div className="text-sm">
                              Capacity: {parking.capacity}
                              %
                              <br />
                              {parking.covered ? "Covered" : "Uncovered"}
                              {selectedBuildingInfo && (
                                <>
                                  <br />
                                  Distance: {calculateDistance(selectedBuildingInfo.location, parking.location)} blocks
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )
            }),
          )}
        </div>
      </div>
    </Card>
  )
}

