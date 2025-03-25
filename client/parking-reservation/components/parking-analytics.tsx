"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "@/components/ui/chart"

// Mock data - In a real application, this would come from your backend
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`)

// Generate mock occupancy data
const generateOccupancyData = () => {
  return HOURS.map((hour) => ({
    time: hour,
    occupancy: Math.floor(Math.random() * 40 + 60), // Random between 60-100
    forecast: Math.floor(Math.random() * 40 + 60),
  }))
}

// Generate weekly pattern data
const generateWeeklyData = () => {
  return DAYS.map((day) => ({
    day,
    morning: Math.floor(Math.random() * 40 + 60),
    afternoon: Math.floor(Math.random() * 40 + 60),
    evening: Math.floor(Math.random() * 40 + 60),
  }))
}

interface ParkingAnalyticsProps {
  lotId: string
  lotName: string
  currentCapacity: number
}

export function ParkingAnalytics({ lotId, lotName, currentCapacity }: ParkingAnalyticsProps) {
  const [selectedDay, setSelectedDay] = useState(DAYS[0])
  const occupancyData = generateOccupancyData()
  const weeklyData = generateWeeklyData()

  // Get status based on capacity
  const getStatus = (capacity: number) => {
    if (capacity > 80) return { label: "Busy", variant: "destructive" as const }
    if (capacity > 50) return { label: "Moderate", variant: "default" as const }
    return { label: "Available", variant: "success" as const }
  }

  const status = getStatus(currentCapacity)

  return (
    <div className="space-y-6">
      {/* Real-time Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
          <CardDescription>Real-time parking lot occupancy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-bold">{currentCapacity}% Occupied</p>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Updated just now</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Occupancy Forecast</CardTitle>
          <CardDescription>View current and predicted parking patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList>
              <TabsTrigger value="daily">Daily Pattern</TabsTrigger>
              <TabsTrigger value="weekly">Weekly Pattern</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              <div className="space-y-2">
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={occupancyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="occupancy"
                      stroke="hsl(var(--primary))"
                      name="Current"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="hsl(var(--muted-foreground))"
                      name="Forecast"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="weekly">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="morning"
                      stroke="hsl(var(--primary))"
                      name="Morning"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="afternoon"
                      stroke="hsl(var(--destructive))"
                      name="Afternoon"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="evening"
                      stroke="hsl(var(--muted-foreground))"
                      name="Evening"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Time Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Typical Occupancy by Time</CardTitle>
          <CardDescription>Historical patterns for {selectedDay}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {[
              { time: "Morning (6AM-12PM)", occupancy: 75 },
              { time: "Afternoon (12PM-6PM)", occupancy: 90 },
              { time: "Evening (6PM-12AM)", occupancy: 60 },
              { time: "Night (12AM-6AM)", occupancy: 30 },
            ].map((period) => {
              const status = getStatus(period.occupancy)
              return (
                <div key={period.time} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{period.time}</p>
                    <Badge variant={status.variant} className="mt-1">
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{period.occupancy}%</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

