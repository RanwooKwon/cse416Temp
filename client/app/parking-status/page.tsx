"use client";

import { useState, useEffect } from "react";
import {
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ParkingAnalytics } from "@/components/parking-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface ParkingLot {
  parkingLotID: number;
  name: string;
  location: string;
  totalSpots: number;
  occupiedSpots: number;
  availableSpots: number;
  occupancyPercentage: number;
  status: "Available" | "Moderate" | "Busy";
  lastUpdated: string;
}

export default function ParkingStatusPage() {
  const [campuses, setCampuses] = useState<string[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>("");
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch list of campuses
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "https://p4sbu-yu75.onrender.com/parking/campus/list"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch campus list");
        }
        const data = await response.json();
        setCampuses(data);
        if (data.length > 0) {
          setSelectedCampus(data[0]);
        }
      } catch (err) {
        console.error("Error fetching campuses:", err);
        setError("Failed to load campus list. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchCampuses();
  }, []);

  // Fetch parking lots for selected campus
  useEffect(() => {
    const fetchParkingLots = async () => {
      if (!selectedCampus) return;

      try {
        setLoading(true);
        const encodedCampus = encodeURIComponent(selectedCampus);
        const response = await fetch(
          `https://p4sbu-yu75.onrender.com/parking/live-status/campus/${encodedCampus}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch parking lots");
        }
        const data = await response.json();
        setParkingLots(data);
        if (data.length > 0) {
          setSelectedLot(data[0]);
        } else {
          setSelectedLot(null);
        }
      } catch (err) {
        console.error("Error fetching parking lots:", err);
        setError("Failed to load parking lots. Please try again later.");
        setParkingLots([]);
        setSelectedLot(null);
      } finally {
        setLoading(false);
      }
    };

    fetchParkingLots();
  }, [selectedCampus]);

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Available":
        return "success";
      case "Moderate":
        return "default";
      case "Busy":
        return "destructive";
      default:
        return "default";
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Parking Lot Status</h1>
          <p className="text-muted-foreground">
            View real-time parking availability and forecasts
          </p>
        </div>

        {/* Campus Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Campus</CardTitle>
            <CardDescription>
              Choose a campus to view available parking lots
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && campuses.length === 0 ? (
              <Skeleton className="h-10 w-full" />
            ) : error && campuses.length === 0 ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            ) : (
              <Select
                value={selectedCampus}
                onValueChange={setSelectedCampus}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a campus" />
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((campus) => (
                    <SelectItem key={campus} value={campus}>
                      {campus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Parking Lots Dropdown */}
        <Card>
          <CardHeader>
            <CardTitle>Parking Lots in {selectedCampus}</CardTitle>
            <CardDescription>
              Select a parking lot to view detailed information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && parkingLots.length === 0 ? (
              <Skeleton className="h-10 w-full" />
            ) : error && parkingLots.length === 0 ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            ) : parkingLots.length === 0 ? (
              <p className="text-muted-foreground">
                No parking lots found for this campus.
              </p>
            ) : (
              <Select
                value={selectedLot ? selectedLot.parkingLotID.toString() : ""}
                onValueChange={(value) => {
                  const lot = parkingLots.find(
                    (l) => l.parkingLotID.toString() === value
                  );
                  if (lot) setSelectedLot(lot);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a parking lot" />
                </SelectTrigger>
                <SelectContent>
                  {parkingLots.map((lot) => (
                    <SelectItem
                      key={lot.parkingLotID}
                      value={lot.parkingLotID.toString()}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{lot.name}</span>
                        <Badge
                          variant={getStatusVariant(lot.status)}
                          className="ml-2"
                        >
                          {lot.availableSpots} spots
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Selected Lot Details */}
        {selectedLot && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedLot.name}</CardTitle>
              <CardDescription>
                {selectedLot.location} • Last updated:{" "}
                {formatDate(selectedLot.lastUpdated)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* Keep the forecast and typical occupancy sections */}
                <ParkingAnalytics
                  lotId={selectedLot.parkingLotID.toString()}
                  lotName={selectedLot.name}
                  currentCapacity={selectedLot.occupancyPercentage}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
