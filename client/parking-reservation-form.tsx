"use client"

import type React from "react"
import { useState } from "react"
import DatePicker from "react-datepicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import "react-datepicker/dist/react-datepicker.css"

export default function ParkingReservationForm() {
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [duration, setDuration] = useState("")
  const [slots, setSlots] = useState(1)
  const [justification, setJustification] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log({ startDate, duration, slots, justification })
    alert("Reservation submitted successfully!")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-card text-card-foreground shadow-lg rounded-lg p-6">
      <div className="space-y-2">
        <Label htmlFor="date-time">Date and Time of Reservation</Label>
        <DatePicker
          id="date-time"
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          showTimeSelect
          dateFormat="MMMM d, yyyy h:mm aa"
          minDate={new Date()}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="space-y-2">
        <Label>Duration of Reservation</Label>
        <RadioGroup onValueChange={setDuration} className="flex flex-col space-y-1">
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

