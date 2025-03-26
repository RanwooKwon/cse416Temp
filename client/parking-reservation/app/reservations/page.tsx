"use client"

import type React from "react"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"

type DurationType = "hourly" | "daily" | "semester" | "monthly" | "yearly"

interface ReservationFormData {
  date: Date | undefined
  startTime?: string
  endTime?: string
  durationType: DurationType | ""
  durationValue: string
  numberOfSlots: number
  justification: string
}

export default function ReservationsPage() {
  const [formData, setFormData] = useState<ReservationFormData>({
    date: undefined,
    startTime: "",
    endTime: "",
    durationType: "",
    durationValue: "",
    numberOfSlots: 1,
    justification: "",
  })

  const [showEventForm, setShowEventForm] = useState(false)

  // Generate time options (30-minute intervals)
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2)
    const minute = i % 2 === 0 ? "00" : "30"
    const ampm = hour < 12 ? "AM" : "PM"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute} ${ampm}`
  })

  // Generate semester options
  const getSemesterOptions = () => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const semesters = []

    for (let year = currentYear; year <= currentYear + 1; year++) {
      semesters.push(
        { value: `${year}-spring`, label: `Spring ${year}` },
        { value: `${year}-summer`, label: `Summer ${year}` },
        { value: `${year}-fall`, label: `Fall ${year}` },
      )
    }
    return semesters
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.date) {
      alert("Please select a date")
      return
    }

    if (formData.durationType === "hourly" && (!formData.startTime || !formData.endTime)) {
      alert("Please select both start and end times")
      return
    }

    if (formData.numberOfSlots > 1 && !formData.justification) {
      alert("Please provide justification for multiple parking slots")
      return
    }

    // Here you would typically send the data to your backend
    console.log("Reservation data:", formData)

    if (formData.numberOfSlots > 1) {
      alert("Your reservation request has been submitted for admin approval")
    } else {
      alert("Reservation submitted successfully!")
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Make a Reservation</CardTitle>
          <CardDescription>Select your preferred date and duration for parking</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Reservation Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => setFormData((prev) => ({ ...prev, date }))}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Duration Type Selection */}
            <div className="space-y-2">
              <Label>Duration Type</Label>
              <Select
                value={formData.durationType}
                onValueChange={(value: DurationType) =>
                  setFormData((prev) => ({
                    ...prev,
                    durationType: value,
                    durationValue: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Per Hour</SelectItem>
                  <SelectItem value="daily">Per Day</SelectItem>
                  <SelectItem value="semester">Per Semester</SelectItem>
                  <SelectItem value="monthly">Per Month</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration Value Selection */}
            {formData.durationType === "hourly" && (
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Select
                    value={formData.startTime}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, startTime: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Select
                    value={formData.endTime}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, endTime: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {formData.durationType === "semester" && (
              <div className="space-y-2">
                <Label>Select Semester</Label>
                <Select
                  value={formData.durationValue}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, durationValue: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSemesterOptions().map((semester) => (
                      <SelectItem key={semester.value} value={semester.value}>
                        {semester.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Multiple Slots Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label>Number of Parking Slots</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.numberOfSlots}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value)
                    setFormData((prev) => ({
                      ...prev,
                      numberOfSlots: value,
                    }))
                    setShowEventForm(value > 1)
                  }}
                  className="w-24"
                />
              </div>

              {showEventForm && (
                <div className="space-y-2">
                  <Label>Event Justification</Label>
                  <Textarea
                    placeholder="Please explain why you need multiple parking slots..."
                    value={formData.justification}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        justification: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    Note: Reservations for multiple slots require administrator approval
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              {formData.numberOfSlots > 1 ? "Submit for Approval" : "Confirm Reservation"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

