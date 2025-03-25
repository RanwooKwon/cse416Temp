import type { Metadata } from "next"
import AdminPage from "./AdminPage"

export const metadata: Metadata = {
  title: "Admin Dashboard | SBU Parking",
  description: "Manage users, parking lots, reservations, and more.",
}

export default function AdminDashboardPage() {
  return <AdminPage />
}

