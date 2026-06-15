"use client";

import type { EventItem } from "@/lib/types";
import maplibregl, {
  type MapMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useRef } from "react";


interface Props {
  events: EventItem[];
  onSelect?: (event: EventItem) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  pickedLocation?: { lat: number; lng: number } | null;
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

export function EventMap({
  events,
  onSelect,
  onMapClick,
  pickedLocation,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const pickedMarkerRef = useRef<maplibregl.Marker | null>(null);

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
      const el = document.createElement("button");
      el.className = "h-4 w-4 rounded-full border-2 border-white bg-red-500";
      el.title = event.name;

      el.addEventListener("click", () => onSelect?.(event));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([event.longitude, event.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [events, onSelect]);

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