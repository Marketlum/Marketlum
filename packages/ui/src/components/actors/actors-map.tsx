'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { ActorResponse } from '@marketlum/shared';
import { ActorType } from '@marketlum/shared';

interface ActorsMapProps {
  actors: ActorResponse[];
  viewActorLabel: string;
}

// CARTO basemaps in both schemes so the map matches the app theme instead
// of clashing bright-blue OSM tiles against the dark UI.
const TILES = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
} as const;

interface PlottableActor {
  actor: ActorResponse;
  lat: number;
  lng: number;
}

function plottable(actors: ActorResponse[]): PlottableActor[] {
  const out: PlottableActor[] = [];
  for (const a of actors) {
    const primary = (a.addresses ?? []).find((addr) => addr.isPrimary);
    if (!primary || !primary.latitude || !primary.longitude) continue;
    const lat = Number(primary.latitude);
    const lng = Number(primary.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ actor: a, lat, lng });
  }
  return out;
}

function typeClass(type: string): string {
  switch (type) {
    case ActorType.ORGANIZATION: return 'organization';
    case ActorType.INDIVIDUAL: return 'individual';
    case ActorType.VIRTUAL: return 'virtual';
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

function popupHtml(actor: ActorResponse, viewActorLabel: string): string {
  const primary = (actor.addresses ?? []).find((a) => a.isPrimary);
  const cls = typeClass(actor.type);
  const addressLines: string[] = [];
  if (primary) {
    addressLines.push(escapeHtml(primary.line1));
    if (primary.line2) addressLines.push(escapeHtml(primary.line2));
    addressLines.push(escapeHtml(`${primary.postalCode} ${primary.city}`));
    if (primary.region) addressLines.push(escapeHtml(primary.region));
    addressLines.push(escapeHtml(primary.country.name));
  }
  return `
    <div class="actor-map-popup">
      <p class="actor-name">${escapeHtml(actor.name)}</p>
      <span class="actor-type-badge ${cls}">${escapeHtml(actor.type)}</span>
      <div class="actor-address">${addressLines.join('<br/>')}</div>
      <a class="actor-link" href="/admin/actors/${escapeHtml(actor.id)}">${escapeHtml(viewActorLabel)} →</a>
    </div>
  `;
}

function divIconForType(type: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="actor-map-marker type-${typeClass(type)}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function MarkerCluster({ actors, viewActorLabel }: ActorsMapProps) {
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

    const pins = plottable(actors);
    for (const { actor, lat, lng } of pins) {
      const marker = L.marker([lat, lng], { icon: divIconForType(actor.type) });
      marker.bindPopup(popupHtml(actor, viewActorLabel));
      cluster.addLayer(marker);
    }

    if (pins.length > 0) {
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [actors, viewActorLabel, map]);

  return null;
}

export function ActorsMap({ actors, viewActorLabel }: ActorsMapProps) {
  const { resolvedTheme } = useTheme();
  const t = useTranslations('actors');
  const tm = useTranslations('actorsMap');
  const tiles = resolvedTheme === 'dark' ? TILES.dark : TILES.light;

  const initialCenter = useMemo(() => {
    const pins = plottable(actors);
    if (pins.length === 0) return [20, 0] as [number, number];
    return [pins[0].lat, pins[0].lng] as [number, number];
  }, [actors]);

  return (
    <div className="relative">
      <MapContainer
        center={initialCenter}
        zoom={2}
        scrollWheelZoom
        className="actors-map-container"
      >
        <TileLayer
          key={resolvedTheme}
          attribution={tiles.attribution}
          url={tiles.url}
        />
        <MarkerCluster actors={actors} viewActorLabel={viewActorLabel} />
      </MapContainer>
      <div className="absolute bottom-3 left-3 z-[1000] space-y-1 rounded-md border bg-background/90 px-3 py-2 text-xs backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="actor-map-marker type-organization inline-block shrink-0 !h-3.5 !w-3.5" />
          <span>{t('typeOrganization')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="actor-map-marker type-individual inline-block shrink-0 !h-3.5 !w-3.5" />
          <span>{t('typeIndividual')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="actor-map-marker type-virtual inline-block shrink-0 !h-3.5 !w-3.5" />
          <span>{t('typeVirtual')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/80 text-[9px] font-semibold text-white">
            n
          </span>
          <span>{tm('legendCluster')}</span>
        </div>
      </div>
    </div>
  );
}
