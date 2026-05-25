/**
 * MapboxMap - Cinematic satellite map component using Mapbox GL JS
 * 
 * Features:
 * - Mapbox Satellite Streets style for high-quality satellite imagery
 * - GeoJSON parcel visualization with global state (Zustand)
 * - Cinematic camera with pitch 60° and bearing animation
 * - Smooth flyTo transitions
 * - Frame capture for video rendering
 * - localStorage persistence
 */

"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import { useParcelStore } from "@/lib/parcel-store";

// Environment variable for Mapbox token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export interface MapboxMapProps {
  /** Initial zoom level */
  zoom?: number;
  /** Drone height in meters for zoom offset */
  droneHeight?: number;
  /** Enable cinematic camera animations */
  cinematic?: boolean;
  /** Show UI overlays */
  showOverlays?: boolean;
  /** Callback when map is ready */
  onReady?: (map: mapboxgl.Map) => void;
  className?: string;
}

function heightToZoomOffset(height?: number): number {
  if (!height || height <= 0) return 0;
  return Math.max(-1.4, Math.min(1.4, (300 - height) / 200));
}

/**
 * Missing Mapbox Token Warning Screen
 */
function TokenMissingWarning() {
  return (
    <div className="w-full h-full min-h-[420px] bg-gradient-to-br from-[#0f2a4f] via-[#0a1f3d] to-[#07182f] rounded-2xl overflow-hidden flex flex-col">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,_rgba(234,179,8,0.4)_0%,_transparent_60%),radial-gradient(circle_at_70%_70%,_rgba(239,68,68,0.3)_0%,_transparent_60%)]" />
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-8">
        <div className="w-14 h-14 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-yellow-400 font-semibold text-sm mb-2">
          Mapbox Token Eksik
        </p>
        <p className="text-white/60 text-sm mb-4">
          Uydu haritasını görüntülemek için Mapbox erişim token&apos;ı gereklidir.
        </p>
        <div className="bg-black/30 rounded-lg p-3 text-left max-w-sm">
          <p className="text-white/40 text-[11px] mb-2">Environment değişkeni ekleyin:</p>
          <code className="text-primary text-xs font-mono">
            NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
          </code>
        </div>
      </div>
    </div>
  );
}

/**
 * GeoJSON File Upload Handler
 */
function GeoJsonUploader({ onUpload }: { onUpload: (feature: Feature<Polygon | MultiPolygon>) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target?.result as string);
        
        // Handle FeatureCollection
        if (geojson.type === "FeatureCollection" && geojson.features?.[0]) {
          onUpload(geojson.features[0] as Feature<Polygon | MultiPolygon>);
        }
        // Handle single Feature
        else if (geojson.type === "Feature") {
          onUpload(geojson as Feature<Polygon | MultiPolygon>);
        }
        // Handle raw geometry
        else if (geojson.type === "Polygon" || geojson.type === "MultiPolygon") {
          onUpload({
            type: "Feature",
            properties: {},
            geometry: geojson,
          });
        }
      } catch (err) {
        console.error("GeoJSON parsing error:", err);
        alert("Geçersiz GeoJSON dosyası");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="absolute top-3 left-3 z-10">
      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json"
        onChange={handleFileChange}
        className="hidden"
        id="geojson-upload"
      />
      <label
        htmlFor="geojson-upload"
        className="flex items-center gap-2 px-3 py-2 bg-black/55 backdrop-blur-md rounded-lg border border-white/10 hover:bg-black/70 transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="text-white text-xs">GeoJSON Yükle</span>
      </label>
    </div>
  );
}

/**
 * Main MapboxMap Component
 */
export default function MapboxMap({
  zoom = 16,
  droneHeight,
  cinematic = true,
  showOverlays = true,
  onReady,
  className,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const bearingRafRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get data from global store
  const uploadedGeoJson = useParcelStore((state) => state.uploadedGeoJson);
  const parcelMetadata = useParcelStore((state) => state.parcelMetadata);
  const parcelCenter = useParcelStore((state) => state.parcelCenter);
  const parcelBounds = useParcelStore((state) => state.parcelBounds);
  const setParcelData = useParcelStore((state) => state.setParcelData);

  // Fallback center from store
  const fallbackCenter = parcelCenter;

  // Handle GeoJSON upload - save to global store
  const handleGeoJsonUpload = (feature: Feature<Polygon | MultiPolygon>) => {
    setParcelData({
      geoJson: feature,
      metadata: feature.properties as Record<string, unknown>,
      source: "upload",
    });
  };

  // Initialize Mapbox map
  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      console.log("[MapboxMap] No token, skipping init");
      return;
    }
    if (typeof window === "undefined" || !containerRef.current) return;
    if (!fallbackCenter) return;

    // Cleanup previous map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    if (bearingRafRef.current) {
      cancelAnimationFrame(bearingRafRef.current);
      bearingRafRef.current = null;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    console.log("[MapboxMap] Creating map with token length:", MAPBOX_TOKEN.length);

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [fallbackCenter.lon, fallbackCenter.lat],
        zoom,
        pitch: 60,
        bearing: -15,
        antialias: true,
        preserveDrawingBuffer: true,
        attributionControl: false,
      });
    } catch (err) {
      console.error("[MapboxMap] Map constructor error:", err);
      setMapError("Harita başlatılamadı");
      return;
    }

    console.log("[MapboxMap] Map instance created");

    mapRef.current = map;

    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    map.addControl(
      new mapboxgl.ScaleControl({ maxWidth: 120, unit: "metric" }),
      "bottom-left"
    );

    map.on("error", (e) => {
      console.error("[MapboxMap] Error:", e);
      const err = e.error as { status?: number; message?: string; url?: string } | undefined;
      if (err) {
        console.error("[MapboxMap] Error details:", {
          status: err.status,
          message: err.message,
          url: err.url,
        });
      }
      setMapError(err?.message || "Harita başlatılamadı");
    });

    map.on("load", () => {
      if (!mapRef.current) return;

      console.log("[MapboxMap] Map loaded, setting up layers...");
      console.log("[MapboxMap] Token:", MAPBOX_TOKEN ? "set" : "not set");
      console.log("[MapboxMap] uploadedGeoJson:", uploadedGeoJson ? "present" : "null");

      // Use GeoJSON from store or create default polygon
      const currentParcel = uploadedGeoJson;
      
      const defaultPolygon = {
        type: "Feature" as const,
        properties: {},
        geometry: { 
          type: "Polygon" as const, 
          coordinates: [[[fallbackCenter.lon, fallbackCenter.lat], [fallbackCenter.lon + 0.001, fallbackCenter.lat], [fallbackCenter.lon + 0.001, fallbackCenter.lat + 0.001], [fallbackCenter.lon, fallbackCenter.lat + 0.001], [fallbackCenter.lon, fallbackCenter.lat]]] 
        },
      };

      const featureData = currentParcel || defaultPolygon;
      console.log("[MapboxMap] Using parcel:", JSON.stringify(featureData).substring(0, 200));
      
      mapRef.current.addSource("parcel", {
        type: "geojson",
        data: featureData,
      });

      mapRef.current.addLayer({
        id: "parcel-fill",
        type: "fill",
        source: "parcel",
        paint: {
          "fill-color": "#ef4444",
          "fill-opacity": 0.25,
        },
      });

      mapRef.current.addLayer({
        id: "parcel-outline",
        type: "line",
        source: "parcel",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#ef4444",
          "line-width": 3,
          "line-opacity": 0.95,
        },
      });

      mapRef.current.addLayer({
        id: "parcel-glow",
        type: "line",
        source: "parcel",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#fda4af",
          "line-width": 8,
          "line-opacity": 0.3,
        },
      }, "parcel-outline");

      // Fit to parcel bounds if available
      if (parcelBounds && currentParcel) {
        mapRef.current.fitBounds(
          [[parcelBounds.minLon, parcelBounds.minLat], [parcelBounds.maxLon, parcelBounds.maxLat]] as [[number, number], [number, number]],
          {
            padding: 80,
            maxZoom: 19,
            pitch: 60,
            bearing: -15,
            duration: 3000,
            essential: true,
          }
        );
      }

      if (cinematic) {
        let bearing = -15;
        const animateBearing = () => {
          if (!mapRef.current) return;
          bearing += 0.05;
          mapRef.current.setBearing(bearing);
          bearingRafRef.current = requestAnimationFrame(animateBearing);
        };
        bearingRafRef.current = requestAnimationFrame(animateBearing);
      }

      setIsReady(true);
      setMapError(null);
      onReady?.(mapRef.current);
    });

    return () => {
      if (bearingRafRef.current) {
        cancelAnimationFrame(bearingRafRef.current);
        bearingRafRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackCenter?.lon, fallbackCenter?.lat, zoom, cinematic, onReady]);

  // Update parcel source when store data changes
  useEffect(() => {
    if (!mapRef.current || !isReady) return;
    
    const source = mapRef.current.getSource("parcel") as mapboxgl.GeoJSONSource;
    if (source && uploadedGeoJson) {
      source.setData(uploadedGeoJson);
      
      // Fit to new parcel bounds
      if (parcelBounds) {
        mapRef.current.fitBounds(
          [[parcelBounds.minLon, parcelBounds.minLat], [parcelBounds.maxLon, parcelBounds.maxLat]] as [[number, number], [number, number]],
          {
            padding: 80,
            maxZoom: 19,
            pitch: 60,
            bearing: -15,
            duration: 2000,
          }
        );
      }
    }
  }, [uploadedGeoJson, parcelBounds, isReady]);

  // Drone height zoom adjustment
  useEffect(() => {
    if (!mapRef.current || !isReady) return;

    const offset = heightToZoomOffset(droneHeight);
    if (offset !== 0) {
      mapRef.current.easeTo({
        zoom: mapRef.current.getZoom() + offset,
        duration: 900,
      });
    }
  }, [droneHeight, isReady]);

  // Show token missing warning
  if (!MAPBOX_TOKEN) {
    return (
      <div className={className}>
        <TokenMissingWarning />
      </div>
    );
  }

  // Show waiting for coordinates
  if (!fallbackCenter) {
    return (
      <div className={`w-full h-full min-h-[300px] bg-card rounded-2xl flex items-center justify-center ${className || ""}`}>
        <div className="text-center p-4">
          <p className="text-white font-semibold mb-1">Parsel verisi bekleniyor</p>
          <p className="text-muted text-sm">Geçerli koordinat bulunamadı.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full min-h-[420px] bg-card rounded-2xl overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      } ${className || ""}`}
    >
      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Cinematic overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_55%,_rgba(7,24,47,0.55)_100%)]" />

      {/* Loading state */}
      {!isReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/40 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-white/80 text-sm">Uydu haritası yükleniyor…</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-sm z-20">
          <div className="text-center p-4 max-w-sm">
            <p className="text-white font-bold mb-2">Harita Hatası</p>
            <p className="text-muted text-sm mb-4">{mapError}</p>
            <button
              onClick={() => setMapError(null)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* GeoJSON upload button - only show if no GeoJSON uploaded */}
      {showOverlays && !uploadedGeoJson && (
        <GeoJsonUploader onUpload={handleGeoJsonUpload} />
      )}

      {/* Top-left info card */}
      {showOverlays && parcelMetadata && (
        <div className="absolute top-3 left-3 right-16 z-10">
          <div className="bg-black/55 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {[parcelMetadata.Il, parcelMetadata.Ilce, parcelMetadata.Mahalle]
                    .filter(Boolean)
                    .join(" · ") || "Parsel"}
                </p>
                <p className="text-white/60 text-xs truncate">
                  {[
                    parcelMetadata.Ada && `${parcelMetadata.Ada} Ada`,
                    parcelMetadata.ParselNo && `${parcelMetadata.ParselNo} Parsel`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              {parcelMetadata.Alan && (
                <div className="text-right shrink-0">
                  <p className="text-primary text-[10px] uppercase tracking-wider">Alan</p>
                  <p className="text-white text-xs font-mono">
                    {parseFloat(parcelMetadata.Alan).toLocaleString("tr-TR")} m²
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen button */}
      {showOverlays && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            aria-label="Tam ekran"
            className="bg-black/55 backdrop-blur-md p-2 rounded-lg border border-white/10 hover:bg-black/70 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isFullscreen
                    ? "M9 9V4M9 9H4m11 0V4m0 5h5M9 15v5m0-5H4m11 0v5m0-5h5"
                    : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                }
              />
            </svg>
          </button>
        </div>
      )}

      {/* Bottom status bar */}
      {showOverlays && (
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <div className="bg-black/55 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-white text-xs">Mapbox</span>
              {droneHeight ? (
                <span className="text-white/50 text-[11px]">· {droneHeight} m drone</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {fallbackCenter ? (
                <span className="text-white/60 text-[11px] font-mono">
                  {fallbackCenter.lat.toFixed(4)}, {fallbackCenter.lon.toFixed(4)}
                </span>
              ) : null}
              {uploadedGeoJson ? (
                <>
                  <span className="text-white/30">|</span>
                  <span className="text-green-400 text-[11px]">GeoJSON ✓</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}