"use client"

import { useState, useEffect, useRef } from "react"
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

const containerStyle = {
  width: "100%",
  height: "80vh",
}

export default function RecommendationPage() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [parkingLots, setParkingLots] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState<number>(5)
  const [preferEv, setPreferEv] = useState<boolean>(false)
  const [selectedParkingLot, setSelectedParkingLot] = useState<any>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const router = useRouter()
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  })

  const getCurrentLocation = () => {
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."))
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          resolve({ latitude, longitude })
        },
        (err) => reject(err)
      )
    })
  }

  useEffect(() => {
    getCurrentLocation()
      .then(({ latitude, longitude }) => setLocation({ latitude, longitude }))
      .catch(console.error)
  }, [])

  const handleGetLocationAndFetchLots = async () => {
    try {
      const { latitude, longitude } = await getCurrentLocation()
      setLocation({ latitude, longitude })
      setError(null)
      const lots = await findNearestParkingLots(latitude, longitude, limit, preferEv)
      setParkingLots(lots)
      setSelectedParkingLot(null)
      clearPolyline()
    } catch (err) {
      console.error(err)
      setError("Failed to retrieve location or fetch lots.")
    }
  }

  const findNearestParkingLots = async (latitude: number, longitude: number, limit: number, preferEv: boolean) => {
    const params = new URLSearchParams({
      start_lat: latitude.toString(),
      start_lng: longitude.toString(),
      limit: limit.toString(),
      min_available: "1",
      prefer_ev: preferEv ? "true" : "false",
    });
  
    const response = await fetch(`https://cse416temp.onrender.com/parking/nearest?${params.toString()}`)
    if (!response.ok) throw new Error("Failed to fetch nearest parking lots");
    const data = await response.json();
    return data.sort((a: any, b: any) => a.distance - b.distance);
  }

  const drawPolyline = (coords: any[]) => {
    if (!mapRef.current) return
    clearPolyline()
    const polyline = new window.google.maps.Polyline({
      path: coords,
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 4,
    })
    polyline.setMap(mapRef.current)
    polylineRef.current = polyline
  }

  const clearPolyline = () => {
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }
  }

  const handleLotClick = (lot: any) => {
    setSelectedParkingLot(lot)
    if (lot.path && Array.isArray(lot.path)) {
      drawPolyline(lot.path)
    } else {
      clearPolyline()
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen text-xl font-bold">
        Loading Map...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">

        {/* Top Filter Section */}
        <div className="flex flex-wrap justify-center items-center gap-4 mb-8 p-4 bg-gray-100 rounded-lg">
          <select className="border rounded p-2" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>{num} Lots</option>
            ))}
          </select>
          <select className="border rounded p-2" value={preferEv ? "yes" : "no"} onChange={(e) => setPreferEv(e.target.value === "yes")}> 
            <option value="no">EV Slot Not Needed</option>
            <option value="yes">Prefer EV Slots</option>
          </select>
          <Button size="lg" className="font-bold" onClick={handleGetLocationAndFetchLots}>Search</Button>
        </div>

        {/* Main Layout */}
        <div className="flex gap-10">
          {/* Recommended Lots List */}
          <div className="w-1/3 overflow-y-auto max-h-[80vh]">
            <h2 className="text-3xl font-extrabold mb-6">Nearest Parking Lots</h2>
            {parkingLots.map((lot, idx) => {
              const isSelected = selectedParkingLot && selectedParkingLot.id === lot.id
              return (
                <div
                  key={idx}
                  className={`p-4 mb-4 border rounded-lg cursor-pointer shadow-sm hover:bg-gray-100 
                    ${isSelected ? "bg-blue-100 border-blue-400" : ""}`}
                  onClick={() => handleLotClick(lot)}
                >
                  <h3 className="font-bold text-xl mb-1">{lot.name}</h3>
                  <p className="text-sm text-gray-600">{(lot.distance / 1000).toFixed(2)} km away</p>
                  <p className="text-sm text-gray-600">Available: {lot.available} / {lot.capacity}</p>
                </div>
              )
            })}
          </div>

          {/* Google Map Section */}
          <div className="w-2/3">
            {location && (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={{ lat: location.latitude, lng: location.longitude }}
                zoom={15}
                onLoad={(map) => { mapRef.current = map }}
              >
                <Marker
                  position={{ lat: location.latitude, lng: location.longitude }}
                  title="You"
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                    scale: 12,
                  }}
                />
                {parkingLots.map((lot, idx) => (
                  lot.coords && typeof lot.coords.lat === "number" && typeof lot.coords.lng === "number" && (
                    <Marker
                      key={idx}
                      position={{ lat: lot.coords.lat, lng: lot.coords.lng }}
                      label={lot.name}
                    />
                  )
                ))}
              </GoogleMap>
            )}
            {selectedParkingLot && (
              <div className="mt-4">
                <Button
                  size="lg"
                  className="w-full font-bold"
                  onClick={() => {
                    router.push(`/reservations?lotId=${selectedParkingLot.id}&lotName=${encodeURIComponent(selectedParkingLot.name)}&location=${encodeURIComponent(selectedParkingLot.location)}`)
                  }}
                >
                  Make a Reservation
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}