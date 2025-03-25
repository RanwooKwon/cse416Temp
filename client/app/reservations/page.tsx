"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParkingLot {
  parkingLotID: number;
  name: string;
  capacity: number;
  reserved_slots: number;
  available?: number;
}

export default function ReservationsPage() {
  // State for form data
  const [selectedCampus, setSelectedCampus] = useState<string>("");
  const [selectedParkingLot, setSelectedParkingLot] = useState<number | null>(
    null
  );
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [openStartCalendar, setOpenStartCalendar] = useState(false);
  const [openEndCalendar, setOpenEndCalendar] = useState(false);

  // State for API data
  const [campuses, setCampuses] = useState<string[]>([]);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);

  // Loading and error states
  const [isLoadingCampuses, setIsLoadingCampuses] = useState(false);
  const [isLoadingParkingLots, setIsLoadingParkingLots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Generate time options (30-minute intervals)
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    const ampm = hour < 12 ? "AM" : "PM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return {
      value: `${displayHour}:${minute} ${ampm}`,
      hour: hour.toString().padStart(2, "0"),
      minute,
      period: ampm,
    };
  });

  // Fetch campuses on component mount
  useEffect(() => {
    const fetchCampuses = async () => {
      setIsLoadingCampuses(true);
      setError(null);
      try {
        const response = await fetch("http://0.0.0.0:8000/parking/campus/list");
        if (!response.ok) throw new Error("Failed to fetch campuses");
        const data = await response.json();
        setCampuses(data);
      } catch (err) {
        setError("Error loading campuses. Please try again later.");
        console.error(err);
      } finally {
        setIsLoadingCampuses(false);
      }
    };
    fetchCampuses();
  }, []);

  // Fetch parking lots when campus is selected
  useEffect(() => {
    if (!selectedCampus) return;

    const fetchParkingLots = async () => {
      setIsLoadingParkingLots(true);
      setError(null);
      try {
        const response = await fetch(
          `http://0.0.0.0:8000/parking/campus/${encodeURIComponent(
            selectedCampus
          )}`
        );
        if (!response.ok) throw new Error("Failed to fetch parking lots");
        const data: ParkingLot[] = await response.json();

        const lotsWithAvailability = data.map((lot) => ({
          ...lot,
          available: lot.capacity - lot.reserved_slots,
        }));

        setParkingLots(lotsWithAvailability);
      } catch (err) {
        setError("Error loading parking lots. Please try again later.");
        console.error(err);
      } finally {
        setIsLoadingParkingLots(false);
      }
    };

    fetchParkingLots();
  }, [selectedCampus]);

  // Time validation
  useEffect(() => {
    if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
      const startIndex = timeOptions.findIndex(
        (opt) => opt.value === startTime
      );
      const endIndex = timeOptions.findIndex((opt) => opt.value === endTime);

      if (startIndex >= endIndex) {
        setError("End time must be after start time on the same day");
      } else {
        setError(null);
      }
    }
  }, [startDate, endDate, startTime, endTime]);

  const timeStringToISOPart = (time: string, date: Date | undefined) => {
    if (!date || !time) return null;

    const [timePart, period] = time.split(" ");
    const [hour, minute] = timePart.split(":");

    let hours = parseInt(hour);
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    const newDate = new Date(date);
    newDate.setHours(hours, parseInt(minute), 0, 0);
    return newDate.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (
      !selectedParkingLot ||
      !startDate ||
      !endDate ||
      !startTime ||
      !endTime
    ) {
      setError("Please complete all required fields");
      return;
    }

    const startTimeISO = timeStringToISOPart(startTime, startDate);
    const endTimeISO = timeStringToISOPart(endTime, endDate);

    if (!startTimeISO || !endTimeISO) {
      setError("Invalid date or time selection");
      return;
    }

    // Prepare reservation data
    const reservationData = {
      userID: 0,
      parkingLotID: selectedParkingLot,
      startTime: startTimeISO,
      endTime: endTimeISO,
    };

    // Submit reservation
    setIsSubmitting(true);
    setError(null);

    try {
      console.log(JSON.stringify(reservationData));
      const response = await fetch("/reservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        throw new Error("Failed to create reservation");
      }

      setSuccessMessage("Reservation created successfully!");
      // Reset form
      setSelectedParkingLot(null);
      setStartDate(undefined);
      setEndDate(undefined);
      setStartTime("");
      setEndTime("");
    } catch (err) {
      setError("Error creating reservation. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Make a Reservation</CardTitle>
          <CardDescription>
            Select your preferred location and time for parking
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {/* Campus Selection */}
            <div className="space-y-2">
              <Label>Campus</Label>
              <Select
                value={selectedCampus}
                onValueChange={(value) => {
                  setSelectedCampus(value);
                  setSelectedParkingLot(null);
                }}
                disabled={isLoadingCampuses}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select campus" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCampuses ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : (
                    campuses.map((campus) => (
                      <SelectItem key={campus} value={campus}>
                        {campus}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Parking Lot Selection */}
            {selectedCampus && (
              <div className="space-y-2">
                <Label>Parking Lot</Label>
                <Select
                  value={selectedParkingLot?.toString() || ""}
                  onValueChange={(value) =>
                    setSelectedParkingLot(Number(value))
                  }
                  disabled={isLoadingParkingLots}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parking lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingParkingLots ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </div>
                    ) : (
                      parkingLots.map((lot) => (
                        <SelectItem
                          key={lot.parkingLotID}
                          value={lot.parkingLotID.toString()}
                        >
                          {lot.name} ({lot.available}/{lot.capacity} available)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Start Date Selection */}
            {selectedParkingLot && (
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover
                  open={openStartCalendar}
                  onOpenChange={setOpenStartCalendar}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (date && endDate && date > endDate) {
                          setEndDate(undefined);
                        }
                        setOpenStartCalendar(false);
                      }}
                      disabled={(date) => date < addDays(new Date(), -1)}
                      className="rounded-md border"
                      classNames={{
                        head_cell: "w-10 h-10 text-[0.8rem]",
                        cell: "p-0",
                        day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-accent",
                        day_selected:
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                        day_disabled: "text-muted-foreground opacity-50",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Start Time Selection */}
            {startDate && (
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* End Date Selection */}
            {startDate && (
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover
                  open={openEndCalendar}
                  onOpenChange={setOpenEndCalendar}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                      disabled={!startDate}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        setOpenEndCalendar(false);
                      }}
                      disabled={(date) => date < (startDate || new Date())}
                      className="rounded-md border"
                      classNames={{
                        head_cell: "w-10 h-10 text-[0.8rem]",
                        cell: "p-0",
                        day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-accent",
                        day_selected:
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                        day_disabled: "text-muted-foreground opacity-50",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* End Time Selection */}
            {endDate && (
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={
                          startDate?.getTime() === endDate?.getTime() &&
                          timeOptions.findIndex(
                            (opt) => opt.value === option.value
                          ) <=
                            timeOptions.findIndex(
                              (opt) => opt.value === startTime
                            )
                        }
                      >
                        {option.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={
                isSubmitting ||
                !selectedParkingLot ||
                !startDate ||
                !endDate ||
                !startTime ||
                !endTime ||
                !!error
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Confirm Reservation"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
