"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapLibreMapProps {
  centerLat: number;
  centerLon: number;
  polygonCoordinates: number[][];
  accessToken?: string;
}

const MAPTILER_TOKEN = process.env.NEXT_PUBLIC_MAP_TILER_TOKEN || "";

export default function MapLibreMap({
  centerLat,
  centerLon,
  polygonCoordinates,
  accessToken = MAPTILER_TOKEN,
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!containerRef.current) return;

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/hybrid/style.json?key=${accessToken}`,
      center: [centerLon, centerLat],
      zoom: 16,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add polygon source
      if (polygonCoordinates.length > 0) {
        const feature = {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [polygonCoordinates],
          },
          properties: {},
        };

        map.addSource("parcel-polygon", {
          type: "geojson",
          data: feature,
        });

        // Add fill layer
        map.addLayer({
          id: "parcel-fill",
          type: "fill",
          source: "parcel-polygon",
          paint: {
            "fill-color": "#ef4444",
            "fill-opacity": 0.3,
          },
        });

        // Add outline layer
        map.addLayer({
          id: "parcel-outline",
          type: "line",
          source: "parcel-polygon",
          paint: {
            "line-color": "#ef4444",
            "line-width": 3,
          },
        });

        // Add center marker
        new maplibregl.Marker({ color: "#06b6d4" })
          .setLngLat([centerLon, centerLat])
          .addTo(map);

        // Fit bounds to polygon
        const bounds = new maplibregl.LngLatBounds();
        polygonCoordinates.forEach(([lon, lat]) => {
          bounds.extend([lon, lat]);
        });
        map.fitBounds(bounds, { padding: 50 });
      }
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [centerLat, centerLon, polygonCoordinates, accessToken]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full" 
      style={{ minHeight: "400px" }} 
    />
  );
}
