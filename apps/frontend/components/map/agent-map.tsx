"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import api from "@/lib/api-sdk"
import { setupLeafletIcons } from "@/lib/leaflet-setup"

interface Agent {
  id: string
  name: string
  type: string
  street?: string
  city?: string
  postalCode?: string
  country?: string
  latitude: number
  longitude: number
  geography?: {
    id: string
    name: string
    code: string
  }
}

// Dynamic imports for react-leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

export function AgentMap() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setupLeafletIcons()

    api.getAgentsForMap()
      .then((data) => {
        setAgents(data)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching agents for map:", err)
        setError("Failed to load agents for map")
        setIsLoading(false)
      })
  }, [])

  if (!isClient) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading agents...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-muted rounded-lg">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  // Calculate center based on agents, or default to Europe
  const defaultCenter: [number, number] = [50.0, 10.0] // Central Europe
  const center: [number, number] = agents.length > 0
    ? [
        agents.reduce((sum, a) => sum + Number(a.latitude), 0) / agents.length,
        agents.reduce((sum, a) => sum + Number(a.longitude), 0) / agents.length,
      ]
    : defaultCenter

  const formatAddress = (agent: Agent): string => {
    const parts = []
    if (agent.street) parts.push(agent.street)
    if (agent.city) parts.push(agent.city)
    if (agent.postalCode) parts.push(agent.postalCode)
    if (agent.country) parts.push(agent.country)
    return parts.join(", ") || "No address"
  }

  const formatType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border">
      <MapContainer
        center={center}
        zoom={agents.length > 0 ? 5 : 4}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {agents.map((agent) => (
          <Marker
            key={agent.id}
            position={[Number(agent.latitude), Number(agent.longitude)]}
          >
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="font-semibold text-base mb-1">{agent.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {formatType(agent.type)}
                </p>
                <p className="text-sm mb-1">{formatAddress(agent)}</p>
                {agent.geography && (
                  <p className="text-sm text-muted-foreground">
                    Region: {agent.geography.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Coords: {Number(agent.latitude).toFixed(6)}, {Number(agent.longitude).toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {agents.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg">
            <p className="text-muted-foreground text-sm">No agents with coordinates found</p>
          </div>
        </div>
      )}
    </div>
  )
}
