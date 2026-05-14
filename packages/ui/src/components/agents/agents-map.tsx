'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { AgentResponse } from '@marketlum/shared';
import { AgentType } from '@marketlum/shared';
import './agents-map.css';

interface AgentsMapProps {
  agents: AgentResponse[];
  viewAgentLabel: string;
}

interface PlottableAgent {
  agent: AgentResponse;
  lat: number;
  lng: number;
}

function plottable(agents: AgentResponse[]): PlottableAgent[] {
  const out: PlottableAgent[] = [];
  for (const a of agents) {
    const primary = (a.addresses ?? []).find((addr) => addr.isPrimary);
    if (!primary || !primary.latitude || !primary.longitude) continue;
    const lat = Number(primary.latitude);
    const lng = Number(primary.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ agent: a, lat, lng });
  }
  return out;
}

function typeClass(type: string): string {
  switch (type) {
    case AgentType.ORGANIZATION: return 'organization';
    case AgentType.INDIVIDUAL: return 'individual';
    case AgentType.VIRTUAL: return 'virtual';
    default: return 'organization';
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function popupHtml(agent: AgentResponse, viewAgentLabel: string): string {
  const primary = (agent.addresses ?? []).find((a) => a.isPrimary);
  const cls = typeClass(agent.type);
  const addressLines: string[] = [];
  if (primary) {
    addressLines.push(escapeHtml(primary.line1));
    if (primary.line2) addressLines.push(escapeHtml(primary.line2));
    addressLines.push(escapeHtml(`${primary.postalCode} ${primary.city}`));
    if (primary.region) addressLines.push(escapeHtml(primary.region));
    addressLines.push(escapeHtml(primary.country.name));
  }
  return `
    <div class="agent-map-popup">
      <p class="agent-name">${escapeHtml(agent.name)}</p>
      <span class="agent-type-badge ${cls}">${escapeHtml(agent.type)}</span>
      <div class="agent-address">${addressLines.join('<br/>')}</div>
      <a class="agent-link" href="/admin/agents/${escapeHtml(agent.id)}">${escapeHtml(viewAgentLabel)} →</a>
    </div>
  `;
}

function divIconForType(type: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="agent-map-marker type-${typeClass(type)}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function MarkerCluster({ agents, viewAgentLabel }: AgentsMapProps) {
  const map = useMap();
  const layerRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const cluster = L.markerClusterGroup();
    layerRef.current = cluster;
    map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
      layerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const cluster = layerRef.current;
    if (!cluster) return;
    cluster.clearLayers();

    const pins = plottable(agents);
    for (const { agent, lat, lng } of pins) {
      const marker = L.marker([lat, lng], { icon: divIconForType(agent.type) });
      marker.bindPopup(popupHtml(agent, viewAgentLabel));
      cluster.addLayer(marker);
    }

    if (pins.length > 0) {
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [agents, viewAgentLabel, map]);

  return null;
}

export function AgentsMap({ agents, viewAgentLabel }: AgentsMapProps) {
  const initialCenter = useMemo(() => {
    const pins = plottable(agents);
    if (pins.length === 0) return [20, 0] as [number, number];
    return [pins[0].lat, pins[0].lng] as [number, number];
  }, [agents]);

  return (
    <MapContainer
      center={initialCenter}
      zoom={2}
      scrollWheelZoom
      className="agents-map-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerCluster agents={agents} viewAgentLabel={viewAgentLabel} />
    </MapContainer>
  );
}
