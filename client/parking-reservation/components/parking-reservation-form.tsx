"use client"

import type React from "react"
import { useState, useEffect } from "react"
import DatePicker from "react-datepicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import "react-datepicker/dist/react-datepicker.css"

type DurationType = "hourly" | "daily" | "semester" | "monthly" | "yearly"

export default function ParkingReservationForm() {
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [duration, setDuration] = useState<DurationType | "">("")
  const [durationValue, setDurationValue] = useState("")
  const [slots, setSlots] = useState(1)
  const [justification, setJustification] = useState("")
  const [parkingSection, setParkingSection] = useState("")

  // Generate hours options (1-24)
  const hoursOptions = Array.from({ length: 24 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1} ${i + 1 === 1 ? "hour" : "hours"}`,
  }))

  // Generate days options (1-30)
  const daysOptions = Array.from({ length: 30 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1} ${i + 1 === 1 ? "day" : "days"}`,
  }))

  // Generate semester options (next 4 semesters)
  const semesterOptions = (() => {
    const currentYear = new Date().getFullYear()
    const semesters = []
    for (let year = currentYear; year <= currentYear + 2; year++) {
      semesters.push(
        { value: `${year}-spring`, label: `${year} Spring` },
        { value: `${year}-summer`, label: `${year} Summer` },
        { value: `${year}-fall`, label: `${year} Fall` },
      )
    }
    return semesters
  })()

  // Generate month options (next 24 months)
  const monthOptions = (() => {
    const months = []
    const currentDate = new Date()
    for (let i = 0; i < 24; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
      months.push({
        value: date.toISOString(),
        label: date.toLocaleDateString("en-US", { year: "numeric", month: "long" }),
      })
    }
    return months
  })()

  // Generate year options (next 5 years)
  const yearOptions = (() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => ({
      value: `${currentYear + i}`,
      label: `${currentYear + i}`,
    }))
  })()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log({ startDate, endDate, duration, durationValue, slots, justification, parkingSection })
    alert("Reservation submitted successfully!")
  }

  // Reset duration value when duration type changes
  useEffect(() => {
    setDurationValue("")
    setStartDate(null)
    setEndDate(null)
  }, [duration])

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-card text-card-foreground shadow-lg rounded-lg p-6">
      <div className="space-y-2">
        <Label htmlFor="parkingSection">Parking Section</Label>
        <Select value={parkingSection} onValueChange={setParkingSection} required>
          <SelectTrigger>
            <SelectValue placeholder="Select parking section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="faculty">Faculty/Staff Permits</SelectItem>
            <SelectItem value="zone1">Resident Zone 1 Permits</SelectItem>
            <SelectItem value="zone2">Resident Zone 2 Permits</SelectItem>
            <SelectItem value="zone3">Resident Zone 3 Permits</SelectItem>
            <SelectItem value="zone4">Resident Zone 4 Permits</SelectItem>
            <SelectItem value="zone5">Resident Zone 5 Permits</SelectItem>
            <SelectItem value="zone6">Resident Zone 6 Permits</SelectItem>
            <SelectItem value="commuter-satellite">Commuter and Residential Satellite</SelectItem>
            <SelectItem value="commuter-perimeter">Commuter Perimeter</SelectItem>
            <SelectItem value="commuter-core">Commuter Core</SelectItem>
            <SelectItem value="premium">Premium Parking Lots</SelectItem>
            <SelectItem value="meter">Paid Meter Lots</SelectItem>
            <SelectItem value="garage">Paid Parking Garages</SelectItem>
            <SelectItem value="monthly">Paid Monthly Parking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Duration of Reservation</Label>
          <RadioGroup
            value={duration}
            onValueChange={(value: DurationType) => setDuration(value)}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hourly" id="hourly" />
              <Label htmlFor="hourly">Per Hourly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="daily" id="daily" />
              <Label htmlFor="daily">Per Day</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="semester" id="semester" />
              <Label htmlFor="semester">Per Semester</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monthly" id="monthly" />
              <Label htmlFor="monthly">Per Month</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yearly" id="yearly" />
              <Label htmlFor="yearly">Yearly</Label>
            </div>
          </RadioGroup>
        </div>

        {duration && (
          <div className="space-y-2">
            <Label htmlFor="durationValue">Select {duration} Duration</Label>
            {duration === "hourly" ? (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Label htmlFor="startTime">Start Time</Label>
                    <DatePicker
                      id="startTime"
                      selected={startDate}
                      onChange={(date) => setStartDate(date)}
                      showTimeSelect
                      dateFormat="MMMM d, yyyy h:mm aa"
                      minDate={new Date()}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="endTime">End Time</Label>
                    <DatePicker
                      id="endTime"
                      selected={endDate}
                      onChange={(date) => setEndDate(date)}
                      showTimeSelect
                      dateFormat="MMMM d, yyyy h:mm aa"
                      minDate={startDate || new Date()}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Select value={durationValue} onValueChange={setDurationValue} required>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${duration} duration`} />
                </SelectTrigger>
                <SelectContent position="popper">
                  {duration === "daily" &&
                    daysOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  {duration === "semester" &&
                    semesterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  {duration === "monthly" &&
                    monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  {duration === "yearly" &&
                    yearOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slots">Number of Parking Slots</Label>
        <Input
          id="slots"
          type="number"
          min={1}
          value={slots}
          onChange={(e) => setSlots(Number.parseInt(e.target.value))}
        />
      </div>

      {slots > 1 && (
        <div className="space-y-2">
          <Label htmlFor="justification">Event Justification</Label>
          <Textarea
            id="justification"
            placeholder="Please provide a justification for reserving multiple parking slots"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
        </div>
      )}

      <Button type="submit" className="w-full">
        Submit Reservation
      </Button>
    </form>
  )
}

