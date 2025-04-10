"use client";

// Import necessary React hooks and types
import type React from "react";
import { useState, useEffect, Suspense } from "react";

// Import date utility functions from date-fns for date manipulation and formatting
import { format, addDays } from "date-fns";

// Import UI components from your project’s library
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

// Utility function for conditional classNames
import { cn } from "@/lib/utils";

// Import icons from lucide-react for visual indicators (calendar, loading, navigation)
import { CalendarIcon, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

// Import Alert components to display error or success messages to the user
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define a TypeScript interface to represent the shape of a parking lot object.
// The interface includes the parking lot's ID, name, capacity, reserved slots, and an optional available property.
interface ParkingLot {
  parkingLotID: number;
  name: string;
  capacity: number;
  reserved_slots: number;
  available?: number;
}

// Import hooks for URL search parameter parsing
import { useSearchParams } from "next/navigation"

// Main component for the reservations page.
function ReservationsPageContent() {
  // --- State variables for form data ---
  // Campus selected by the user (a string identifier).
  const [selectedCampus, setSelectedCampus] = useState<string>("");
  // Parking lot selected by the user; it can be a number (ID) or null if not selected.
  const [selectedParkingLot, setSelectedParkingLot] = useState<number | null>(
    null
  );
  // Start date for the reservation; undefined means not yet selected.
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  // End date for the reservation; undefined means not yet selected.
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  // Start time in a string format (e.g., "8:00 AM").
  const [startTime, setStartTime] = useState<string>("");
  // End time in a string format.
  const [endTime, setEndTime] = useState<string>("");
  // Boolean to control the visibility of the start date calendar popup.
  const [openStartCalendar, setOpenStartCalendar] = useState(false);
  // Boolean to control the visibility of the end date calendar popup.
  const [openEndCalendar, setOpenEndCalendar] = useState(false);

  // --- State variables for data fetched from the API ---
  // List of campus names fetched from the backend.
  const [campuses, setCampuses] = useState<string[]>([]);
  // List of parking lots fetched from the backend (filtered by campus).
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);

  // --- State variables for handling loading and error states ---
  // Loading flag when fetching campuses.
  const [isLoadingCampuses, setIsLoadingCampuses] = useState(false);
  // Loading flag when fetching parking lots.
  const [isLoadingParkingLots, setIsLoadingParkingLots] = useState(false);
  // Loading flag when submitting the reservation.
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Error message string if any error occurs during fetch or submission.
  const [error, setError] = useState<string | null>(null);
  // Success message to display after a successful reservation.
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Time options generation ---
  // Generate an array of time options at 30-minute intervals (24 hours * 2 = 48 options)
  // Each option includes a formatted display value (e.g., "1:30 PM") and additional data for parsing.
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    // Calculate hour by dividing the index by 2
    const hour = Math.floor(i / 2);
    // Determine minutes: 00 for even indexes, 30 for odd indexes
    const minute = i % 2 === 0 ? "00" : "30";
    // Determine the period (AM/PM) based on the hour
    const ampm = hour < 12 ? "AM" : "PM";
    // Format hour for display in 12-hour format (special case for midnight and afternoon hours)
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return {
      value: `${displayHour}:${minute} ${ampm}`, // Display string
      hour: hour.toString().padStart(2, "0"), // Hour in two-digit 24-hour format
      minute, // Minute string ("00" or "30")
      period: ampm, // Period ("AM" or "PM")
    };
  });

  // --- Effect to fetch campuses on component mount ---
  useEffect(() => {
    const fetchCampuses = async () => {
      // Set loading state to true before the fetch
      setIsLoadingCampuses(true);
      // Reset any previous errors
      setError(null);
      try {
        // Fetch campus data from the backend API
        const response = await fetch(
          "http://127.0.0.1:8000/parking/campus/list"
        );
        // Check if response is OK; if not, throw an error
        if (!response.ok) throw new Error("Failed to fetch campuses");
        // Parse JSON data from the response
        const data = await response.json();
        // Update state with fetched campus names
        setCampuses(data);
      } catch (err) {
        // Set an error message in case of failure
        setError("Error loading campuses. Please try again later.");
        console.error(err);
      } finally {
        // Always turn off the loading state after the operation completes
        setIsLoadingCampuses(false);
      }
    };
    // Call the asynchronous fetch function
    fetchCampuses();
  }, []); // Empty dependency array means this runs once on mount

  // --- Effect to fetch parking lots whenever a campus is selected ---
  useEffect(() => {
    // Only proceed if a campus has been selected
    if (!selectedCampus) return;

    const fetchParkingLots = async () => {
      setIsLoadingParkingLots(true);
      setError(null);
      try {
        // Encode the campus name to safely include it in the URL
        const response = await fetch(
          `http://127.0.0.1:8000/parking/campus/${encodeURIComponent(
            selectedCampus
          )}`
        );
        if (!response.ok) throw new Error("Failed to fetch parking lots");
        // Parse the JSON response as an array of ParkingLot objects
        const data: ParkingLot[] = await response.json();

        // Calculate available slots for each parking lot (capacity minus reserved slots)
        const lotsWithAvailability = data.map((lot) => ({
          ...lot,
          available: lot.capacity - lot.reserved_slots,
        }));

        // Update the state with parking lots including availability
        setParkingLots(lotsWithAvailability);
      } catch (err) {
        setError("Error loading parking lots. Please try again later.");
        console.error(err);
      } finally {
        setIsLoadingParkingLots(false);
      }
    };

    fetchParkingLots();
  }, [selectedCampus]); // Runs whenever selectedCampus changes

  // --- Effect for time validation ---
  // This ensures that on the same day, the start time is earlier than the end time.
  useEffect(() => {
    // Check if both dates are selected and if they are the same day
    if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
      // Find indexes for the selected start and end times in the time options array
      const startIndex = timeOptions.findIndex(
        (opt) => opt.value === startTime
      );
      const endIndex = timeOptions.findIndex((opt) => opt.value === endTime);

      // If start time index is not before end time index, then show an error message
      if (startIndex >= endIndex) {
        setError("End time must be after start time on the same day");
      } else {
        // Clear any error if times are valid
        setError(null);
      }
    }
  }, [startDate, endDate, startTime, endTime]); // Dependency array triggers validation when any time or date changes

  // --- Effect for parsing URL search parameters ---
  const searchParams = useSearchParams()
  const [initialCampus, setInitialCampus] = useState<string | null>(null)

  // Read lotId and lotLocation from URL params on mount
  useEffect(() => {
    const lotId = searchParams.get("lotId")
    const lotLocation = searchParams.get("location")

    if (lotId) {
      setSelectedParkingLot(Number(lotId))
    }

    if (lotLocation) {
      const parts = lotLocation.split(",")
      const campus = parts.length > 1 ? parts[1].trim() : ""
      setInitialCampus(campus)
    }
  }, [])

  // After campuses are loaded, match and set the initial selected campus
  useEffect(() => {
    if (initialCampus && campuses.length > 0) {
      const matched = campuses.find(c => c.trim() === initialCampus.trim())
      if (matched) {
        setSelectedCampus(matched)
      } else {
        console.warn("No matched campus found for", initialCampus)
      }
    }
  }, [campuses, initialCampus])


  // --- Helper function to convert time string to an ISO string based on a given date ---
  // This function splits the time string, converts it to 24-hour format, then applies it to the date.
  const timeStringToISOPart = (time: string, date: Date | undefined) => {
    // Return null if date or time is missing
    if (!date || !time) return null;

    // Split the time string (e.g., "1:30 PM") into the numeric part and the period
    const [timePart, period] = time.split(" ");
    // Split the numeric part into hour and minute
    const [hour, minute] = timePart.split(":");

    // Convert the hour to an integer and adjust for 24-hour time format
    let hours = parseInt(hour);
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    // Create a new date based on the provided date and set its hours, minutes, and seconds
    const newDate = new Date(date);
    newDate.setHours(hours, parseInt(minute), 0, 0);
    // Return the ISO string representation of the date and time
    return newDate.toISOString();
  };

  // --- Form submission handler ---
  // This function validates the form, converts time inputs, prepares the reservation data,
  // and then sends it to the backend via a POST request.
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent the default form submission behavior
    e.preventDefault();

    // Validate that all required fields have been provided by the user
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

    // Convert the provided start and end times to ISO string format using the helper function
    const startTimeISO = timeStringToISOPart(startTime, startDate);
    const endTimeISO = timeStringToISOPart(endTime, endDate);

    // Check if the conversion was successful; if not, display an error
    if (!startTimeISO || !endTimeISO) {
      setError("Invalid date or time selection");
      return;
    }

    // Prepare the reservation data object to be sent to the backend.
    // In this example, userID is hardcoded as 0.
    const reservationData = {
      userID: 0,
      parkingLotID: selectedParkingLot,
      startTime: startTimeISO,
      endTime: endTimeISO,
    };

    // Set the submitting state to true and reset any previous errors
    setIsSubmitting(true);
    setError(null);

    try {
      // Log the reservation data (for debugging purposes)
      console.log(JSON.stringify(reservationData));
      // Make a POST request to the reservation endpoint with the prepared data
      const response = await fetch("/reservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationData),
      });

      // If the response is not ok, throw an error to be caught below
      if (!response.ok) {
        throw new Error("Failed to create reservation");
      }

      // Display a success message on successful reservation creation
      setSuccessMessage("Reservation created successfully!");
      // Reset the form fields to their initial states
      setSelectedParkingLot(null);
      setStartDate(undefined);
      setEndDate(undefined);
      setStartTime("");
      setEndTime("");
    } catch (err) {
      // Set an error message if there was a problem during submission
      setError("Error creating reservation. Please try again.");
      console.error(err);
    } finally {
      // Always turn off the submitting state after the process
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

        {/* The form element wrapping the entire reservation form */}
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

            {/* Campus Selection Section */}
            <div className="space-y-2">
              <Label>Campus</Label>
              <Select
                // Set the current selected campus value
                value={selectedCampus}
                // When a campus is selected, update the state and reset the parking lot selection
                onValueChange={(value) => {
                  setSelectedCampus(value);
                  setSelectedParkingLot(null);
                }}
                // Disable selection if campuses are still loading from the API
                disabled={isLoadingCampuses}
              >
                <SelectTrigger>
                  {/* Placeholder shown when no campus is selected */}
                  <SelectValue placeholder="Select campus" />
                </SelectTrigger>
                <SelectContent>
                  {/* If campuses are loading, show a loading indicator */}
                  {isLoadingCampuses ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : (
                    // Map through the campuses array to render each campus as a selectable item
                    campuses.map((campus) => (
                      <SelectItem key={campus} value={campus}>
                        {campus}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Parking Lot Selection Section */}
            {selectedCampus && (
              // Only render parking lot selection if a campus has been chosen
              <div className="space-y-2">
                <Label>Parking Lot</Label>
                <Select
                  // Convert selectedParkingLot to string for the select value,
                  // or set it to an empty string if not selected
                  value={selectedParkingLot?.toString() || ""}
                  // Update the selected parking lot state by converting the selected value to a number
                  onValueChange={(value) =>
                    setSelectedParkingLot(Number(value))
                  }
                  // Disable selection if parking lots are still loading from the API
                  disabled={isLoadingParkingLots}
                >
                  <SelectTrigger>
                    {/* Placeholder shown when no parking lot is selected */}
                    <SelectValue placeholder="Select parking lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* If parking lots are loading, show a loading indicator */}
                    {isLoadingParkingLots ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </div>
                    ) : (
                      // Map through the parkingLots array to render each lot with name and available spots
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
                {/* Label for the start date picker */}
                <Label>Start Date</Label>
                {/* Popover wraps the calendar to allow for date selection in a popup */}
                <Popover
                  open={openStartCalendar} // Controls whether the start date calendar is visible
                  onOpenChange={setOpenStartCalendar} // Updates the visibility state of the calendar
                >
                  {/* PopoverTrigger renders the button that toggles the calendar */}
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        // If no start date is selected, apply muted text style
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      {/* Calendar icon inside the button */}
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {/* Display the selected start date in a formatted style; if not selected, show a placeholder */}
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  {/* PopoverContent contains the actual Calendar component */}
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single" // Allows selecting a single date
                      selected={startDate} // The currently selected start date
                      onSelect={(date) => {
                        // Update start date state on date selection
                        setStartDate(date);
                        // If the new start date is after the already selected end date, reset the end date
                        if (date && endDate && date > endDate) {
                          setEndDate(undefined);
                        }
                        // Close the calendar popup after selection
                        setOpenStartCalendar(false);
                      }}
                      // Disable dates before yesterday to prevent selecting past dates
                      disabled={(date) => date < addDays(new Date(), -1)}
                      className="rounded-md border"
                      // Custom CSS classes for various parts of the calendar
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
                {/* Label for start time dropdown */}
                <Label>Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    {/* Placeholder when no start time is selected */}
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Map over the timeOptions array to render each time option */}
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
                {/* Label for end date picker */}
                <Label>End Date</Label>
                <Popover
                  open={openEndCalendar} // Controls whether the end date calendar is visible
                  onOpenChange={setOpenEndCalendar} // Updates the visibility state for the end date calendar
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        // If no end date is selected, use muted text style
                        !endDate && "text-muted-foreground"
                      )}
                      // Disable the button if start date is not selected (shouldn't happen here because of the conditional rendering)
                      disabled={!startDate}
                    >
                      {/* Calendar icon inside the button */}
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {/* Display formatted end date or a placeholder if not selected */}
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single" // Allows single date selection
                      selected={endDate} // The currently selected end date
                      onSelect={(date) => {
                        // Update the end date state when a date is selected
                        setEndDate(date);
                        // Close the end calendar popup after selection
                        setOpenEndCalendar(false);
                      }}
                      // Disable dates earlier than the start date to ensure valid range
                      disabled={(date) => date < (startDate || new Date())}
                      className="rounded-md border"
                      // Custom CSS classes for the calendar display
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
                {/* Label for end time dropdown */}
                <Label>End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    {/* Placeholder when no end time is selected */}
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Map over timeOptions to generate each time option */}
                    {timeOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        // Disable the time option if the selected start and end date are the same and the option's time
                        // is not after the selected start time.
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
            {/* Submit button for the reservation form */}
            <Button
              type="submit" // Sets the button as a submit type for form submission
              className="w-full" // Button spans the full width of the container
              // Disable the button if any of these conditions are met:
              // - The form is currently submitting
              // - Any required field (selectedParkingLot, startDate, endDate, startTime, or endTime) is missing
              // - There is an existing error message
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
                // If the form is being submitted, show a loading spinner with text "Submitting..."
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                // Otherwise, display the button text for confirming the reservation
                "Confirm Reservation"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={<div>Loading reservation page...</div>}>
      <ReservationsPageContent />
    </Suspense>
  );
}