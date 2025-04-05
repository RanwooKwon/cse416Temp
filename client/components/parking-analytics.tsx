"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface DailyPatternData {
  day: number;
  day_name: string;
  hours: string[];
  historical: number[];
  forecast: number[];
}

interface WeeklyPatternData {
  days: string[];
  morning: number[];
  afternoon: number[];
  evening: number[];
}

interface TimeBreakdownData {
  day: number;
  day_name: string;
  periods: {
    time: string;
    occupancy: number;
  }[];
}

interface ParkingAnalyticsProps {
  lotId: string;
  lotName: string;
  currentCapacity: number;
}

export function ParkingAnalytics({
  lotId,
  lotName,
  currentCapacity,
}: ParkingAnalyticsProps) {
  const [dailyPattern, setDailyPattern] = useState<DailyPatternData | null>(
    null
  );
  const [weeklyPattern, setWeeklyPattern] = useState<WeeklyPatternData | null>(
    null
  );
  const [timeBreakdown, setTimeBreakdown] = useState<TimeBreakdownData | null>(
    null
  );
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({
    daily: false,
    weekly: false,
    breakdown: false,
  });
  const [error, setError] = useState<{ [key: string]: string | null }>({
    daily: null,
    weekly: null,
    breakdown: null,
  });
  const [activeTab, setActiveTab] = useState<string>("daily");

  // Fetch daily pattern data
  useEffect(() => {
    const fetchDailyPattern = async () => {
      if (!lotId) return;

      try {
        setLoading((prev) => ({ ...prev, daily: true }));
        const response = await fetch(
          `http://localhost:8000/parking/daily-pattern/${lotId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch daily pattern data");
        }
        const data = await response.json();
        setDailyPattern(data);
        setError((prev) => ({ ...prev, daily: null }));
      } catch (err) {
        console.error("Error fetching daily pattern:", err);
        setError((prev) => ({
          ...prev,
          daily: "Failed to load forecast data. Please try again later.",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, daily: false }));
      }
    };

    fetchDailyPattern();
  }, [lotId]);

  // Fetch weekly pattern data when tab changes
  useEffect(() => {
    const fetchWeeklyPattern = async () => {
      if (!lotId || activeTab !== "weekly") return;

      try {
        setLoading((prev) => ({ ...prev, weekly: true }));
        const response = await fetch(
          `http://localhost:8000/parking/weekly-pattern/${lotId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch weekly pattern data");
        }
        const data = await response.json();
        setWeeklyPattern(data);
        setError((prev) => ({ ...prev, weekly: null }));
      } catch (err) {
        console.error("Error fetching weekly pattern:", err);
        setError((prev) => ({
          ...prev,
          weekly:
            "Failed to load weekly forecast data. Please try again later.",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, weekly: false }));
      }
    };

    fetchWeeklyPattern();
  }, [lotId, activeTab]);

  // Fetch time breakdown data
  useEffect(() => {
    const fetchTimeBreakdown = async () => {
      if (!lotId) return;

      try {
        setLoading((prev) => ({ ...prev, breakdown: true }));
        const response = await fetch(
          `http://localhost:8000/parking/time-breakdown/${lotId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch time breakdown data");
        }
        const data = await response.json();
        setTimeBreakdown(data);
        setError((prev) => ({ ...prev, breakdown: null }));
      } catch (err) {
        console.error("Error fetching time breakdown:", err);
        setError((prev) => ({
          ...prev,
          breakdown:
            "Failed to load time breakdown data. Please try again later.",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, breakdown: false }));
      }
    };

    fetchTimeBreakdown();
  }, [lotId]);

  // Get status based on capacity
  const getStatus = (capacity: number) => {
    if (capacity > 80)
      return { label: "Busy", variant: "destructive" as const };
    if (capacity > 50)
      return { label: "Moderate", variant: "default" as const };
    return { label: "Available", variant: "success" as const };
  };

  const status = getStatus(currentCapacity);

  // Format daily data for chart
  const formatDailyData = () => {
    if (!dailyPattern) return [];

    return dailyPattern.hours.map((hour, index) => ({
      time: hour,
      historical: dailyPattern.historical[index],
      forecast: dailyPattern.forecast[index],
    }));
  };

  // Format weekly data for chart
  const formatWeeklyData = () => {
    if (!weeklyPattern) return [];

    return weeklyPattern.days.map((day, index) => ({
      day,
      morning: weeklyPattern.morning[index],
      afternoon: weeklyPattern.afternoon[index],
      evening: weeklyPattern.evening[index],
    }));
  };

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
          <CardDescription>
            View current and predicted parking patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="daily"
            className="space-y-4"
            onValueChange={setActiveTab}
          >
            <TabsList>
              <TabsTrigger value="daily">Daily Pattern</TabsTrigger>
              <TabsTrigger value="weekly">Weekly Pattern</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              {loading.daily ? (
                <Skeleton className="h-[300px] w-full" />
              ) : error.daily ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error.daily}</span>
                </div>
              ) : dailyPattern ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Showing data for {dailyPattern.day_name}
                    </p>
                  </div>

                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={formatDailyData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="historical"
                          stroke="hsl(var(--primary))"
                          name="Historical"
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
                </>
              ) : (
                <p className="text-muted-foreground">
                  No forecast data available
                </p>
              )}
            </TabsContent>

            <TabsContent value="weekly">
              {loading.weekly ? (
                <Skeleton className="h-[300px] w-full" />
              ) : error.weekly ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error.weekly}</span>
                </div>
              ) : weeklyPattern ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatWeeklyData()}>
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
              ) : (
                <p className="text-muted-foreground">
                  No weekly forecast data available
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Time Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Typical Occupancy by Time</CardTitle>
          <CardDescription>
            Historical patterns for{" "}
            {timeBreakdown?.day_name || dailyPattern?.day_name || "today"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading.breakdown ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : error.breakdown ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error.breakdown}</span>
            </div>
          ) : timeBreakdown ? (
            <div className="grid gap-4">
              {timeBreakdown.periods.map((period) => {
                const status = getStatus(period.occupancy);

                return (
                  <div
                    key={period.time}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{period.time}</p>
                      <Badge variant={status.variant} className="mt-1">
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold">
                      {Math.round(period.occupancy)}%
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No historical data available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
