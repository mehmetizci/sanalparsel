"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ESRI World Imagery style
const ESRI_SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    "esri-satellite": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      ],
      tileSize: 256,
      attribution: "© Esri"
    }
  },
  layers: [
    {
      id: "esri-satellite-layer",
      type: "raster" as const,
      source: "esri-satellite"
    }
  ]
};

// Height to zoom mapping (approximate)
const HEIGHT_TO_ZOOM: Record<number, number> = {
  100: 18,
  200: 17,
  300: 16,
  400: 15,
  500: 14,
};

interface MapLibreMapProps {
  centerLat: number;
  centerLon: number;
  polygonCoordinates: number[][];
  properties?: {
    Il?: string;
    Ilce?: string;
    Mahalle?: string;
    Ada?: string;
    ParselNo?: string;
    Alan?: string;
    Nitelik?: string;
  };
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
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(15);

  const targetZoom = HEIGHT_TO_ZOOM[height] || 15;

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined" || !mapContainerRef.current || mapRef.current) {
      return;
    }

    let mounted = true;
    let animationFrameId: number | null = null;

    const initMap = async () => {
      try {
        // Import maplibre-gl dynamically
        const maplibreglModule = await import("maplibre-gl");
        const MapLibre = maplibreglModule.default || maplibreglModule;

        if (!mounted || !mapContainerRef.current) return;

        const map = new MapLibre.Map({
          container: mapContainerRef.current,
          style: ESRI_SATELLITE_STYLE,
          center: [centerLon, centerLat],
          zoom: targetZoom,
          pitch: 55,
          bearing: 0,
          attributionControl: false,
        });

        mapRef.current = map;

        map.on("load", () => {
          if (!mounted) return;

          // Add parcel polygon
          if (polygonCoordinates && polygonCoordinates.length > 0) {
            // Ensure polygon is closed
            const coords = [...polygonCoordinates];
            if (coords.length > 2 && 
                (coords[0][0] !== coords[coords.length - 1][0] || 
                 coords[0][1] !== coords[coords.length - 1][1])) {
              coords.push([...coords[0]]);
            }

            // Create GeoJSON
            const geoJsonData = {
              type: "Feature" as const,
              geometry: { type: "Polygon" as const, coordinates: [coords] },
              properties: {}
            };

            // Check if source already exists
            if (!map.getSource("parcel-fill")) {
              map.addSource("parcel-fill", {
                type: "geojson",
                data: geoJsonData
              });
            }

            // Check if layer already exists
            if (!map.getLayer("parcel-fill-layer")) {
              map.addLayer({
                id: "parcel-fill-layer",
                type: "fill",
                source: "parcel-fill",
                paint: {
                  "fill-color": "#dc2626",
                  "fill-opacity": 0.3
                }
              });
            }

            // Check if outline source exists
            if (!map.getSource("parcel-outline")) {
              map.addSource("parcel-outline", {
                type: "geojson",
                data: geoJsonData
              });
            }

            // Check if outline layer exists
            if (!map.getLayer("parcel-outline-layer")) {
              map.addLayer({
                id: "parcel-outline-layer",
                type: "line",
                source: "parcel-outline",
                paint: {
                  "line-color": "#dc2626",
                  "line-width": 3,
                  "line-opacity": 0.9
                }
              });
            }

            // Fit bounds to parcel with bounds validation
            if (coords.length >= 3) {
              let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
              
              for (const coord of coords) {
                if (Array.isArray(coord) && coord.length >= 2) {
                  const lng = coord[0];
                  const lat = coord[1];
                  if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
                    minLng = Math.min(minLng, lng);
                    minLat = Math.min(minLat, lat);
                    maxLng = Math.max(maxLng, lng);
                    maxLat = Math.max(maxLat, lat);
                  }
                }
              }

              // Only fit bounds if we have valid bounds
              if (isFinite(minLng) && isFinite(minLat) && isFinite(maxLng) && isFinite(maxLat)) {
                const bounds: maplibregl.LngLatBoundsLike = [[minLng, minLat], [maxLng, maxLat]];
                
                map.fitBounds(bounds, {
                  padding: 50,
                  duration: 1500,
                  essential: true
                });
              }
            }
          }

          // Add POI markers
          if (pois && pois.length > 0) {
            const poiGeoJson = {
              type: "FeatureCollection" as const,
              features: pois
                .filter(poi => typeof poi.lat === 'number' && typeof poi.lon === 'number')
                .map(poi => ({
                  type: "Feature" as const,
                  geometry: { type: "Point" as const, coordinates: [poi.lon, poi.lat] },
                  properties: { name: poi.name, type: poi.type, id: poi.id }
                }))
            };

            if (!map.getSource("pois")) {
              map.addSource("pois", { type: "geojson", data: poiGeoJson });
            }

            if (!map.getLayer("poi-circles")) {
              map.addLayer({
                id: "poi-circles",
                type: "circle",
                source: "pois",
                paint: {
                  "circle-color": "#06b6d4",
                  "circle-radius": 6,
                  "circle-stroke-width": 2,
                  "circle-stroke-color": "#ffffff"
                }
              });
            }
          }

          // Animate bearing for cinematic effect
          let bearing = 0;
          const animateBearing = () => {
            if (!mounted || !mapRef.current) return;
            bearing += 0.3;
            if (bearing > 360) bearing = 0;
            mapRef.current.setBearing(bearing);
            animationFrameId = requestAnimationFrame(animateBearing);
          };
          
          setTimeout(() => {
            animateBearing();
            setTimeout(() => {
              if (animationFrameId) cancelAnimationFrame(animationFrameId);
              if (mapRef.current) mapRef.current.setBearing(0);
            }, 4000);
          }, 1500);

          setIsLoaded(true);
          if (onLoad) onLoad();
        });

        map.on("error", (e) => {
          console.error("MapLibre error:", e);
          if (onError) onError("Harita yüklenemedi: " + (e.error?.message || "Bilinmeyen hata"));
        });

        map.on("zoom", () => {
          setCurrentZoom(Math.round(map.getZoom()));
        });

      } catch (error) {
        console.error("Map initialization error:", error);
        if (onError) onError("Harita başlatılamadı");
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initMap, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // Ignore cleanup errors
        }
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

      {/* Zoom controls */}
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