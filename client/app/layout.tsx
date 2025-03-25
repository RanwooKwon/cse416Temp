import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar" // Updated to use named import

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SBU Parking",
  description: "Parking management system for Stony Brook University",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow py-8">{children}</main>
          <footer className="bg-primary text-primary-foreground py-4">
            <div className="container text-center">© 2024 SBU Parking. All rights reserved.</div>
          </footer>
        </div>
      </body>
    </html>
  )
}



import './globals.css'