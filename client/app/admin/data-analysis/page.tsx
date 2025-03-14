"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const capacityData = [
  { category: "Students", capacity: 75 },
  { category: "Faculty", capacity: 90 },
  { category: "Staff", capacity: 60 },
  { category: "Visitors", capacity: 40 },
]

const revenueData = [
  { lot: "Lot A", revenue: 5000 },
  { lot: "Lot B", revenue: 7500 },
  { lot: "Lot C", revenue: 6200 },
  { lot: "Garage 1", revenue: 9000 },
]

const userAnalysisData = [
  { category: "Students", occupancy: 80, revenue: 4000, fines: 500, tickets: 50 },
  { category: "Faculty", occupancy: 70, revenue: 6000, fines: 200, tickets: 20 },
  { category: "Staff", occupancy: 65, revenue: 5500, fines: 300, tickets: 30 },
  { category: "Visitors", occupancy: 50, revenue: 3000, fines: 1000, tickets: 100 },
]

export default function DataAnalysisPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Data Analysis</h1>
      <Card>
        <CardHeader>
          <CardTitle>Parking Analytics</CardTitle>
          <CardDescription>View capacity, revenue, and user analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="capacity">
            <TabsList>
              <TabsTrigger value="capacity">Capacity Analysis</TabsTrigger>
              <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
              <TabsTrigger value="user">User Analysis</TabsTrigger>
            </TabsList>
            <TabsContent value="capacity">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={capacityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="capacity" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="revenue">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="lot" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="user">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="occupancy" fill="#8884d8" />
                  <Bar dataKey="revenue" fill="#82ca9d" />
                  <Bar dataKey="fines" fill="#ffc658" />
                  <Bar dataKey="tickets" fill="#ff8042" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

