"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Car, Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Check login status on component mount and when localStorage changes
  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem("token")
      const storedUserId = localStorage.getItem("userId")
      setIsLoggedIn(!!token)
      setUserId(storedUserId)
    }

    // Check on mount
    checkLoginStatus()

    // Set up event listener for storage changes (in case another tab logs in/out)
    window.addEventListener("storage", checkLoginStatus)

    return () => {
      window.removeEventListener("storage", checkLoginStatus)
    }
  }, [])

  const handleLogout = () => {
    // Clear authentication data from localStorage
    localStorage.removeItem("token")
    localStorage.removeItem("userId")

    setIsLoggedIn(false)
    setIsAdminMode(false)

    // Force a page refresh to update all components
    window.location.href = "/"
  }

  const handleAdminClick = () => {
    setIsAdminMode(true)
  }

  const handleExitAdminClick = () => {
    setIsAdminMode(false)
  }

  const NavItems = () => (
      <>
        {!isAdminMode ? (
            <>
              <Link href="/" className="text-sm font-medium hover:text-primary-foreground/80">
                Home
              </Link>
              <Link href="/search" className="text-sm font-medium hover:text-primary-foreground/80">
                Find Parking
              </Link>
              <Link href="/parking-status" className="text-sm font-medium hover:text-primary-foreground/80">
                Live Status
              </Link>
              <Link href="/recommendation" className="text-sm font-medium hover:text-primary-foreground/80">
                Parking Recommendation
              </Link>
              <Link href="/feedback" className="text-sm font-medium hover:text-primary-foreground/80">
                Feedback
              </Link>
              <Link href="/reservations" className="text-sm font-medium hover:text-primary-foreground/80">
                Make a Reservation
              </Link>
              <Link href="/about" className="text-sm font-medium hover:text-primary-foreground/80">
                About
              </Link>
            </>
        ) : null}
      </>
  )

  return (
      <nav className="bg-primary text-primary-foreground">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <Car className="h-8 w-8 mr-2" />
            <span className="font-bold text-xl">SBU Parking</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <NavItems />
            {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full bg-white text-primary hover:bg-white/90">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Link href="/profile" className="w-full">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/reservations" className="w-full">
                        Make a Reservation
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Link href="/login">
                  <Button variant="outline" className="bg-white text-primary hover:bg-white/90">
                    Sign In
                  </Button>
                </Link>
            )}
          </div>
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col space-y-4 mt-4">
                  <NavItems />
                  {isLoggedIn ? (
                      <>
                        <Link href="/profile">
                          <Button variant="outline" className="w-full">
                            Profile
                          </Button>
                        </Link>
                        <Link href="/reservations">
                          <Button variant="outline" className="w-full">
                            Make a Reservation
                          </Button>
                        </Link>
                        <Button onClick={handleLogout} className="w-full">
                          Logout
                        </Button>
                      </>
                  ) : (
                      <Link href="/login">
                        <Button className="w-full">Sign In</Button>
                      </Link>
                  )}
                  {!isLoggedIn && (
                      <Link href="/admin" onClick={handleAdminClick}>
                        <Button variant="outline" className="w-full">
                          Admin
                        </Button>
                      </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
  )
}
