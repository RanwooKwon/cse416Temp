"use client"

import Link from "next/link"
import { useState } from "react"
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

  const handleLogout = () => {
    setIsLoggedIn(false)
    setIsAdminMode(false)
  }

  const handleAdminClick = () => {
    setIsAdminMode(true)
  }

  const handleExitAdminClick = () => {
    setIsAdminMode(false)
    // Redirect to home page
    window.location.href = "/"
  }

  // Update the NavItems component to only include Home and Make a Reservation
  const NavItems = () => (
    <>
      {!isAdminMode ? (
        <>
          <Link href="/" className="text-sm font-medium hover:text-primary-foreground/80">
            Home
          </Link>
          <Link href="/reservations" className="text-sm font-medium hover:text-primary-foreground/80">
            Make a Reservation
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full bg-white text-primary hover:bg-white/90">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isLoggedIn ? (
                <>
                  <DropdownMenuItem>
                    <Link href="/profile" className="w-full">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/my-reservations" className="w-full">
                      My Reservations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem>
                    <Link href="/login" className="w-full">
                      Login
                    </Link>
                  </DropdownMenuItem>
                  {isAdminMode ? (
                    <DropdownMenuItem onClick={handleExitAdminClick}>Exit Admin Mode</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleAdminClick}>
                      <Link href="/admin" className="w-full" onClick={handleAdminClick}>
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
                    <Link href="/my-reservations">
                      <Button variant="outline" className="w-full">
                        My Reservations
                      </Button>
                    </Link>
                    <Button onClick={handleLogout} className="w-full">
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button className="w-full">Login</Button>
                    </Link>
                    {isAdminMode ? (
                      <Button variant="outline" className="w-full" onClick={handleExitAdminClick}>
                        Exit Admin Mode
                      </Button>
                    ) : (
                      <Link href="/admin" onClick={handleAdminClick}>
                        <Button variant="outline" className="w-full">
                          Admin
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}

