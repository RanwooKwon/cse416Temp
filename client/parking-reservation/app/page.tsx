import { Navbar } from "@/components/navbar"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold mb-6">Welcome to SBU Parking</h1>
          <p className="text-xl mb-8 text-muted-foreground">
            Easy and convenient parking reservations for Stony Brook University.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/reservations">
              <Button size="lg">Make a Reservation</Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

