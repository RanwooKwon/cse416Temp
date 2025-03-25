"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminDashboard() {
  const adminSections = [
    {
      title: "User Management",
      description: "Manage user accounts and approvals",
      link: "/admin/users",
      buttonText: "Manage Users",
    },
    {
      title: "Parking Lot Management",
      description: "Manage parking lots and rates",
      link: "/admin/parking-lots",
      buttonText: "Manage Parking Lots",
    },
    {
      title: "User Feedback",
      description: "Review and respond to user comments",
      link: "/admin/feedback",
      buttonText: "Manage Feedback",
    },
    {
      title: "Data Analysis",
      description: "View and analyze parking data",
      link: "/admin/data-analysis",
      buttonText: "View Analytics",
    },
  ]

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section, index) => (
          <Card key={index} className="flex flex-col">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Link href={section.link} className="w-full mt-4">
                <Button className="w-full">{section.buttonText}</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

