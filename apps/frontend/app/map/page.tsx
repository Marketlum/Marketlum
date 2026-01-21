"use client"

import { MapPin } from "lucide-react"
import { AgentMap } from "@/components/map/agent-map"

const MapPage = () => {
  return (
    <div className="flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          AGENT MAP
        </h1>
      </header>
      <p className="text-muted-foreground">
        View all agents with geographic coordinates on an interactive map.
      </p>
      <AgentMap />
    </div>
  )
}

export default MapPage
