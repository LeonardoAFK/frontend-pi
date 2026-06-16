"use client";

import type { EventItem } from "@/lib/types";
import maplibregl, {
  type MapMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";

interface Props {
  events: EventItem[];
  onSelect?: (event: EventItem) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  pickedLocation?: { lat: number; lng: number } | null;
  selectedEventId?: number | null;
  registeredEventIds?: number[];
}

const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

function getMarkerColor({
  isSelected,
  isRegistered,
}: {
  isSelected: boolean;
  isRegistered: boolean;
}) {
  if (isSelected) return "#9333ea"; // Morado
  if (isRegistered) return "#2563eb"; // Azul
  return "#22a06b"; // Verde
}

export function EventMap({
  events,
  onSelect,
  onMapClick,
  pickedLocation,
  selectedEventId,
  registeredEventIds = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const pickedMarkerRef = useRef<maplibregl.Marker | null>(null);

  const registeredIdsSet = useMemo(
    () => new Set(registeredEventIds),
    [registeredEventIds]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [-75.5636, 6.2518],
      zoom: 12,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onMapClick) return;

    const handler = (e: MapMouseEvent) => {
      onMapClick({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      });
    };

    map.on("click", handler);

    return () => {
      map.off("click", handler);
    };
  }, [onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    events.forEach((event) => {
      const isSelected = selectedEventId === event.id;
      const isRegistered = registeredIdsSet.has(event.id);
      const color = getMarkerColor({ isSelected, isRegistered });

      const markerWrapper = document.createElement("div");
      markerWrapper.className =
        "flex h-8 w-8 items-center justify-center rounded-full";

      const markerButton = document.createElement("button");
      markerButton.type = "button";
      markerButton.title = event.name;
      markerButton.style.backgroundColor = color;
      markerButton.className =
        "h-5 w-5 rounded-full border-[3px] border-white shadow-lg shadow-slate-900/30 transition hover:h-6 hover:w-6";

      if (isSelected) {
        markerWrapper.className += " bg-purple-200/80";
        markerButton.className += " h-6 w-6";
      }

      markerButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(event);
      });

      markerWrapper.appendChild(markerButton);

      const marker = new maplibregl.Marker({
        element: markerWrapper,
        anchor: "center",
      })
        .setLngLat([event.longitude, event.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [events, onSelect, selectedEventId, registeredIdsSet]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    pickedMarkerRef.current?.remove();
    pickedMarkerRef.current = null;

    if (!pickedLocation) return;

    pickedMarkerRef.current = new maplibregl.Marker({ color: "#2563eb" })
      .setLngLat([pickedLocation.lng, pickedLocation.lat])
      .addTo(map);

    map.flyTo({
      center: [pickedLocation.lng, pickedLocation.lat],
      zoom: 14,
    });
  }, [pickedLocation]);

  return <div ref={containerRef} className="h-[70vh] w-full rounded-xl" />;
}