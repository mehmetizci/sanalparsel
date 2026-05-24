/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

// Load MapLibre CSS from CDN
function loadMapLibreCSS() {
  if (typeof document !== "undefined") {
    const existingLink = document.querySelector('link[href*="maplibre-gl"]');
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@4.1.0/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }
  }
}

interface MapLibreMapProps {
  centerLat: number;
  centerLon: number;
  polygonCoordinates: number[][];
  pois?: Array<{
    id: string;
    name: string;
    type: string;
    lat: number;
    lon: number;
    distance?: string;
  }>;
  height?: number;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export default function MapLibreMap({
  centerLat,
  centerLon,
  polygonCoordinates,
  pois = [],
  height = 300,
  onLoad,
  onError
}: MapLibreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(15);

  const targetZoom = (() => {
    const map: Record<number, number> = { 100: 18, 200: 17, 300: 16, 400: 15, 500: 14 };
    return map[height] || 15;
  })();

  useEffect(() => {
    // Load CSS
    loadMapLibreCSS();

    if (typeof window === "undefined" || !mapContainerRef.current || mapRef.current) {
      return;
    }

    let mounted = true;
    let animationFrameId: number | null = null;

    const initMap = async () => {
      try {
        console.log("MapLibreMap: Loading maplibre-gl...");
        
        // Load maplibre
        const maplibreglModule = await import("maplibre-gl");
        console.log("MapLibreMap: Module loaded:", maplibreglModule);
        const MapLibre = maplibreglModule.default;
        console.log("MapLibreMap: MapLibre constructor:", MapLibre);

        if (!mounted || !mapContainerRef.current) {
          console.log("MapLibreMap: Skipping - not mounted or no container");
          return;
        }

        console.log("MapLibreMap: Creating map at center:", centerLon, centerLat);
        
        const map = new MapLibre.Map({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {
              "esri-satellite": {
                type: "raster",
                tiles: [
                  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                ],
                tileSize: 256,
                attribution: "© Esri"
              }
            },
            layers: [{
              id: "esri-satellite-layer",
              type: "raster",
              source: "esri-satellite"
            }]
          },
          center: [centerLon, centerLat],
          zoom: targetZoom,
          pitch: 55,
          bearing: 0,
          attributionControl: false,
        });

        mapRef.current = map;

        map.on("load", () => {
          if (!mounted) return;

          // Add parcel
          if (polygonCoordinates && polygonCoordinates.length > 0) {
            const coords = [...polygonCoordinates];
            if (coords.length > 2) {
              const first = coords[0];
              const last = coords[coords.length - 1];
              if (first[0] !== last[0] || first[1] !== last[1]) {
                coords.push([...first]);
              }
            }

            if (!map.getSource("parcel-fill")) {
              map.addSource("parcel-fill", {
                type: "geojson",
                data: {
                  type: "Feature",
                  geometry: { type: "Polygon", coordinates: [coords] },
                  properties: {}
                }
              });
              map.addLayer({
                id: "parcel-fill-layer",
                type: "fill",
                source: "parcel-fill",
                paint: { "fill-color": "#dc2626", "fill-opacity": 0.3 }
              });
            }

            if (!map.getSource("parcel-outline")) {
              map.addSource("parcel-outline", {
                type: "geojson",
                data: {
                  type: "Feature",
                  geometry: { type: "Polygon", coordinates: [coords] },
                  properties: {}
                }
              });
              map.addLayer({
                id: "parcel-outline-layer",
                type: "line",
                source: "parcel-outline",
                paint: { "line-color": "#dc2626", "line-width": 3, "line-opacity": 0.9 }
              });
            }

            // Safe fitBounds
            if (coords.length >= 3) {
              let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
              for (const coord of coords) {
                if (Array.isArray(coord) && coord.length >= 2) {
                  const lng = coord[0], lat = coord[1];
                  if (typeof lng === 'number' && typeof lat === 'number' && isFinite(lng) && isFinite(lat)) {
                    minLng = Math.min(minLng, lng);
                    minLat = Math.min(minLat, lat);
                    maxLng = Math.max(maxLng, lng);
                    maxLat = Math.max(maxLat, lat);
                  }
                }
              }
              if (isFinite(minLng) && isFinite(maxLng)) {
                map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50, duration: 1500 });
              }
            }
          }

          // Add POIs
          if (pois && pois.length > 0) {
            const poiFeatures = pois
              .filter(p => typeof p.lat === 'number' && typeof p.lon === 'number')
              .map(p => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: [p.lon, p.lat] },
                properties: { name: p.name, type: p.type, id: p.id }
              }));

            if (!map.getSource("pois")) {
              map.addSource("pois", {
                type: "geojson",
                data: { type: "FeatureCollection" as const, features: poiFeatures as any[] }
              });
              map.addLayer({
                id: "poi-circles",
                type: "circle",
                source: "pois",
                paint: { "circle-color": "#06b6d4", "circle-radius": 6, "circle-stroke-width": 2, "circle-stroke-color": "#fff" }
              });
            }
          }

          // Bearing animation
          let bearing = 0;
          const animateBearing = () => {
            if (!mounted || !mapRef.current) return;
            bearing = (bearing + 0.3) % 360;
            mapRef.current.setBearing(bearing);
            animationFrameId = requestAnimationFrame(animateBearing);
          };

          setTimeout(() => {
            animateBearing();
            setTimeout(() => {
              if (animationFrameId) cancelAnimationFrame(animationFrameId);
              mapRef.current?.setBearing(0);
            }, 4000);
          }, 1500);

          setIsLoaded(true);
          onLoad?.();
        });

        map.on("error", (e: any) => {
          console.error("MapLibre error:", e);
          onError?.("Harita yüklenemedi");
        });

        map.on("zoom", () => setCurrentZoom(Math.round(map.getZoom())));

      } catch (error) {
        console.error("Map initialization error:", error);
        onError?.("Harita başlatılamadı: " + String(error));
      }
    };

    const timer = setTimeout(initMap, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* ignore */ }
        mapRef.current = null;
      }
    };
  }, [centerLat, centerLon, polygonCoordinates, pois, targetZoom, onLoad, onError]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white text-sm">Harita yükleniyor...</p>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => mapRef.current?.flyTo({ zoom: Math.max(10, currentZoom + 1), pitch: 55, duration: 1000 })}
          className="bg-black/50 backdrop-blur-sm p-2 rounded-lg hover:bg-black/70 transition-colors"
          title="Yakınlaştır"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
        <button
          onClick={() => mapRef.current?.flyTo({ zoom: Math.min(20, currentZoom - 1), pitch: 55, duration: 1000 })}
          className="bg-black/50 backdrop-blur-sm p-2 rounded-lg hover:bg-black/70 transition-colors"
          title="Uzaklaştır"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
      </div>
    </div>
  );
}