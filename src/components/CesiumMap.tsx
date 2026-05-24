"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface PoiItem {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  distance?: string;
}

interface ParcelMapProps {
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
  pois?: PoiItem[];
  height?: number;
  onLoad?: () => void;
}

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

export default function ParcelMap({ 
  centerLat, 
  centerLon, 
  polygonCoordinates, 
  properties,
  pois = [],
  height = 300,
  onLoad 
}: ParcelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(15);

  // Calculate target zoom based on drone height
  const targetZoom = HEIGHT_TO_ZOOM[height] || 15;

  const initMap = useCallback(() => {
    if (typeof window === "undefined" || !mapContainerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: ESRI_SATELLITE_STYLE,
        center: [centerLon, centerLat],
        zoom: targetZoom,
        pitch: 55,
        bearing: 0,
        attributionControl: false,
      });

      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

      map.on("load", () => {
        // Add parcel polygon
        if (polygonCoordinates.length > 0) {
          // Ensure polygon is closed
          const coords = [...polygonCoordinates];
          if (coords.length > 0 && 
              (coords[0][0] !== coords[coords.length - 1][0] || 
               coords[0][1] !== coords[coords.length - 1][1])) {
            coords.push(coords[0]);
          }

          // Add fill layer
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
            paint: {
              "fill-color": "#dc2626",
              "fill-opacity": 0.3
            }
          });

          // Add outline layer
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
            paint: {
              "line-color": "#dc2626",
              "line-width": 3,
              "line-opacity": 0.9
            }
          });

          // Fit bounds to parcel
          const bounds = coords.reduce(
            (bounds, coord) => bounds.extend([coord[0], coord[1]] as [number, number]),
            new maplibregl.LngLatBounds([coords[0][0], coords[0][1]], [coords[0][0], coords[0][1]])
          );

          map.fitBounds(bounds, {
            padding: 50,
            duration: 1500,
            essential: true
          });
        }

        // Add POI markers
        if (pois.length > 0) {
          const poiGeoJson = {
            type: "FeatureCollection" as const,
            features: pois.map(poi => ({
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: [poi.lon, poi.lat] },
              properties: { name: poi.name, type: poi.type, id: poi.id }
            }))
          };

          map.addSource("pois", { type: "geojson", data: poiGeoJson });

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

        // Animate bearing
        let bearingAnimation: number | null = null;
        let bearing = 0;
        const animateBearing = () => {
          bearing += 0.5;
          if (bearing > 360) bearing = 0;
          map.setBearing(bearing);
          bearingAnimation = requestAnimationFrame(animateBearing);
        };
        
        setTimeout(() => {
          animateBearing();
          setTimeout(() => {
            if (bearingAnimation) cancelAnimationFrame(bearingAnimation);
            map.setBearing(0);
          }, 5000);
        }, 2000);

        setIsLoaded(true);
        if (onLoad) onLoad();
      });

      map.on("error", (e) => {
        console.error("Map error:", e);
        setMapError("Harita yüklenemedi.");
      });

      map.on("zoom", () => {
        setCurrentZoom(Math.round(map.getZoom()));
      });

      mapRef.current = map;

    } catch (error) {
      console.error("Map initialization error:", error);
      setMapError("Harita başlatılamadı.");
    }
  }, [centerLat, centerLon, polygonCoordinates, pois, targetZoom, onLoad]);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(initMap, 100);
    
    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  const handleFlyTo = (zoom: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        zoom,
        pitch: 55,
        duration: 1500
      });
    }
  };

  if (mapError) {
    return (
      <div className="relative w-full h-full min-h-[300px] bg-card rounded-2xl overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-white font-bold mb-2">Harita Hatası</h3>
          <p className="text-muted text-sm">{mapError}</p>
          <button 
            onClick={() => { setMapError(null); initMap(); }}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full min-h-[300px] bg-card rounded-2xl overflow-hidden ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-sm z-10">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white text-sm">Harita yükleniyor...</p>
          </div>
        </div>
      )}

      {/* Top info bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium text-sm">
                {properties?.Il} {properties?.Ilce} {properties?.Mahalle}
              </p>
              <p className="text-white/60 text-xs">
                {properties?.Ada && `${properties.Ada} Ada`} {properties?.ParselNo && `${properties.ParselNo} Parsel`}
              </p>
            </div>
            {properties?.Alan && (
              <div className="text-right">
                <p className="text-primary text-xs">Alan</p>
                <p className="text-white text-sm font-mono">{parseFloat(properties.Alan).toLocaleString("tr-TR")} m²</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="bg-black/50 backdrop-blur-sm p-2 rounded-lg hover:bg-black/70 transition-colors"
          title="Tam ekran"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          onClick={() => handleFlyTo(Math.max(10, currentZoom + 1))}
          className="bg-black/50 backdrop-blur-sm p-2 rounded-lg hover:bg-black/70 transition-colors"
          title="Yakınlaştır"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
        <button
          onClick={() => handleFlyTo(Math.min(20, currentZoom - 1))}
          className="bg-black/50 backdrop-blur-sm p-2 rounded-lg hover:bg-black/70 transition-colors"
          title="Uzaklaştır"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-white text-xs">Parsel Aktif</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs">Zoom: {currentZoom}</span>
            {pois.length > 0 && (
              <>
                <span className="text-white/30">|</span>
                <span className="text-cyan-400 text-xs">{pois.length} POI</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}