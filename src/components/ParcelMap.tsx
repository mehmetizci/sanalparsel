"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  type Map as MapLibreMap,
  type GeoJSONSource,
  type LngLatBoundsLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
  Position,
} from "geojson";

export interface ParcelMapProperties {
  Il?: string;
  Ilce?: string;
  Mahalle?: string;
  Mevkii?: string;
  Ada?: string;
  ParselNo?: string;
  Alan?: string;
  Nitelik?: string;
}

export interface ParcelMapPoi {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  distance?: string;
}

export interface ParcelMapProps {
  /** GeoJSON Polygon or MultiPolygon feature representing the parcel. */
  parcel?: Feature<Polygon | MultiPolygon> | null;
  /** Optional fallback for legacy callers: a single outer ring [[lon,lat], ...]. */
  polygonCoordinates?: Position[];
  /** Optional fallback center. */
  centerLat?: number;
  centerLon?: number;
  /** Parcel properties for the top info card. */
  properties?: ParcelMapProperties;
  /** POI markers rendered through a GeoJSON layer (no DOM). */
  pois?: ParcelMapPoi[];
  /**
   * Drone elevation in metres (100–500). Mapped onto a zoom offset so a higher
   * drone selection feels farther away, while a lower one feels closer.
   */
  droneHeight?: number;
  /** When true, applies continuous slow bearing rotation for a cinematic feel. */
  cinematic?: boolean;
  /** Show floating overlay UI (project header, parcel card, controls). */
  showOverlays?: boolean;
  /** Called once after the map style + parcel layers are ready. */
  onReady?: (map: MapLibreMap) => void;
  className?: string;
}

const ESRI_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics';

const POI_PALETTE: Record<string, { color: string; emoji: string; label: string }> = {
  hospital: { color: "#ef4444", emoji: "🏥", label: "Hastane" },
  school: { color: "#f97316", emoji: "🏫", label: "Okul" },
  university: { color: "#f59e0b", emoji: "🎓", label: "Üniversite" },
  market: { color: "#22c55e", emoji: "🛒", label: "Market" },
  pharmacy: { color: "#06b6d4", emoji: "💊", label: "Eczane" },
  transport: { color: "#3b82f6", emoji: "🚌", label: "Toplu Taşıma" },
  highway: { color: "#a855f7", emoji: "🛣️", label: "Ana Yol" },
  marketplace: { color: "#ec4899", emoji: "🛍️", label: "Pazar" },
  park: { color: "#10b981", emoji: "🌳", label: "Park" },
  mosque: { color: "#8b5cf6", emoji: "🕌", label: "Cami" },
  restaurant: { color: "#facc15", emoji: "🍽️", label: "Restoran" },
};

function getPoiVisual(type: string) {
  return POI_PALETTE[type] || { color: "#ffffff", emoji: "📍", label: type };
}

/**
 * Map a drone elevation in metres onto a zoom offset relative to the
 * automatic `fitBounds` result. Lower altitude → zoom in, higher → zoom out.
 */
function heightToZoomOffset(height?: number): number {
  if (!height || height <= 0) return 0;
  // 100m -> +1.0 (closer)  300m -> 0 (baseline)  500m -> -1.0 (farther)
  return Math.max(-1.4, Math.min(1.4, (300 - height) / 200));
}

function isValidCoord(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Quick capability check; falls back to a static panel when WebGL is missing. */
function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const ctx =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return !!ctx;
  } catch {
    return false;
  }
}

function flattenRings(geometry: Polygon | MultiPolygon): Position[] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] || [];
  }
  return (geometry.coordinates[0]?.[0] as Position[]) || [];
}

function computeCenter(positions: Position[]): { lat: number; lon: number } | null {
  if (!positions.length) return null;
  let lon = 0;
  let lat = 0;
  let count = 0;
  for (const p of positions) {
    if (Array.isArray(p) && isValidCoord(p[0]) && isValidCoord(p[1])) {
      lon += p[0];
      lat += p[1];
      count += 1;
    }
  }
  if (!count) return null;
  return { lat: lat / count, lon: lon / count };
}

function computeBounds(positions: Position[]): LngLatBoundsLike | null {
  if (!positions.length) return null;
  let minLon = Infinity,
    minLat = Infinity,
    maxLon = -Infinity,
    maxLat = -Infinity;
  for (const p of positions) {
    if (!Array.isArray(p) || !isValidCoord(p[0]) || !isValidCoord(p[1])) continue;
    if (p[0] < minLon) minLon = p[0];
    if (p[0] > maxLon) maxLon = p[0];
    if (p[1] < minLat) minLat = p[1];
    if (p[1] > maxLat) maxLat = p[1];
  }
  if (!Number.isFinite(minLon)) return null;
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

/**
 * Premium MapLibre GL map with Esri World Imagery satellite tiles.
 * Render-only client component; safe to dynamic-import with `ssr: false`.
 */
export default function ParcelMap({
  parcel,
  polygonCoordinates,
  centerLat,
  centerLon,
  properties,
  pois = [],
  droneHeight,
  cinematic = true,
  showOverlays = true,
  onReady,
  className,
}: ParcelMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const rotationRafRef = useRef<number | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  // Run the WebGL probe once on mount, before any map state is initialised.
  useEffect(() => {
    setWebglOk(isWebGLAvailable());
  }, []);

  // Normalise input into a single GeoJSON feature so the rest of the component
  // can treat both legacy (`polygonCoordinates`) and modern (`parcel`) callers
  // identically.
  const parcelFeature = useMemo<Feature<Polygon | MultiPolygon> | null>(() => {
    if (parcel?.geometry?.type === "Polygon" || parcel?.geometry?.type === "MultiPolygon") {
      return parcel;
    }
    if (polygonCoordinates && polygonCoordinates.length >= 3) {
      const ring = [...polygonCoordinates];
      const [firstLon, firstLat] = ring[0] || [];
      const [lastLon, lastLat] = ring[ring.length - 1] || [];
      if (firstLon !== lastLon || firstLat !== lastLat) {
        ring.push(ring[0]);
      }
      return {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [ring] },
      };
    }
    return null;
  }, [parcel, polygonCoordinates]);

  const outerRing = useMemo<Position[]>(
    () => (parcelFeature ? flattenRings(parcelFeature.geometry) : []),
    [parcelFeature]
  );

  const fallbackCenter = useMemo(() => {
    const fromRing = computeCenter(outerRing);
    if (fromRing) return fromRing;
    if (isValidCoord(centerLat) && isValidCoord(centerLon)) {
      return { lat: centerLat as number, lon: centerLon as number };
    }
    return null;
  }, [outerRing, centerLat, centerLon]);

  const poiCollection = useMemo<FeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: pois
        .filter((p) => isValidCoord(p.lat) && isValidCoord(p.lon))
        .map((p) => {
          const visual = getPoiVisual(p.type);
          return {
            type: "Feature",
            geometry: { type: "Point", coordinates: [p.lon, p.lat] },
            properties: {
              id: p.id,
              name: p.name,
              type: p.type,
              color: visual.color,
              emoji: visual.emoji,
              distance: p.distance || "",
            },
          };
        }),
    };
  }, [pois]);

  // ---- Map lifecycle (mount/unmount only) -----------------------------------
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    if (webglOk === false) return; // graceful static fallback below
    if (webglOk !== true) return; // still probing

    if (!fallbackCenter) {
      setMapError("Geçerli koordinat bulunamadı.");
      return;
    }

    let cancelled = false;

    try {
      // High-quality cinematic map style with Esri World Imagery
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const style: any = {
        version: 8,
        sources: {
          esriSatellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            // 512px tiles for higher quality (upscaled from 256 source)
            tileSize: 512,
            // Allow zoom up to 22 for maximum detail
            maxzoom: 22,
            attribution: ESRI_ATTRIBUTION,
          },
        },
        layers: [
          {
            id: "esri-satellite",
            type: "raster",
            source: "esriSatellite",
            paint: {
              // Contrast boost for sharper imagery
              "raster-contrast": 1.15,
              // Slight saturation boost for cinematic warmth
              "raster-saturation": 1.2,
              // Smooth fade to prevent harsh transitions
              "raster-fade-duration": 300,
            },
          },
        ],
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        // Atmospheric fog for depth and cinematic quality
        fog: {
          color: "#c8d3e6",
          "high-color": "#d8e3f0",
          "horizon-blend": 0.08,
          "space-color": "#0a1628",
          "star-intensity": 0.0,
        },
      };

      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [fallbackCenter.lon, fallbackCenter.lat],
        zoom: 16,
        // Cinematic pitch (55-65 degrees) for dramatic aerial view
        pitch: 60,
        bearing: -15,
        maxZoom: 22,
        // Enable antialiasing for crisp edges
        antialias: true,
        attributionControl: { compact: true },
        maxPitch: 75,
        // Smooth fade duration for cinematic feel
        fadeDuration: 300,
      });

      mapRef.current = map;
      map.addControl(
        new maplibregl.NavigationControl({ visualizePitch: true }),
        "top-right"
      );
      map.addControl(
        new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }),
        "bottom-left"
      );

      map.on("error", (event) => {
        // Tile load failures shouldn't tear the map down – just log.
        if (event && event.error) {
          console.warn("[ParcelMap] MapLibre error:", event.error.message);
        }
      });

      map.on("load", () => {
        if (cancelled) return;

        // --- Parcel polygon -----------------------------------------------
        if (parcelFeature) {
          map.addSource("parcel", {
            type: "geojson",
            data: parcelFeature,
          });

          map.addLayer({
            id: "parcel-fill",
            type: "fill",
            source: "parcel",
            paint: {
              "fill-color": "#ef4444",
              "fill-opacity": 0.28,
            },
          });

          map.addLayer({
            id: "parcel-outline",
            type: "line",
            source: "parcel",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#ef4444",
              "line-width": 3,
              "line-opacity": 0.95,
            },
          });

          // Subtle outer glow.
          map.addLayer(
            {
              id: "parcel-glow",
              type: "line",
              source: "parcel",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": "#fda4af",
                "line-width": 8,
                "line-opacity": 0.35,
                "line-blur": 6,
              },
            },
            "parcel-outline"
          );
        }

        // --- POI layer ----------------------------------------------------
        map.addSource("pois", { type: "geojson", data: poiCollection });

        map.addLayer({
          id: "poi-halo",
          type: "circle",
          source: "pois",
          paint: {
            "circle-radius": 12,
            "circle-color": ["get", "color"],
            "circle-opacity": 0.18,
          },
        });

        map.addLayer({
          id: "poi-dot",
          type: "circle",
          source: "pois",
          paint: {
            "circle-radius": 6,
            "circle-color": ["get", "color"],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });

        map.addLayer({
          id: "poi-label",
          type: "symbol",
          source: "pois",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "text-allow-overlap": false,
            "text-optional": true,
            "text-font": ["Open Sans Regular"],
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "rgba(0,0,0,0.7)",
            "text-halo-width": 1.4,
          },
        });

        // --- Cinematic fly-in --------------------------------------------
        const bounds = computeBounds(outerRing);
        const baseCamera = {
          pitch: 55,
          bearing: -25,
          duration: 2400,
          essential: true,
        } as const;

        if (bounds) {
          map.fitBounds(bounds, {
            padding: 80,
            maxZoom: 19,
            ...baseCamera,
          });
          map.once("moveend", () => {
            if (cancelled) return;
            const offset = heightToZoomOffset(droneHeight);
            if (offset !== 0) {
              map.easeTo({
                zoom: map.getZoom() + offset,
                pitch: 60,
                bearing: -10,
                duration: 1600,
              });
            }
          });
        } else if (fallbackCenter) {
          map.flyTo({
            center: [fallbackCenter.lon, fallbackCenter.lat],
            zoom: 16 + heightToZoomOffset(droneHeight),
            ...baseCamera,
          });
        }

        // --- Continuous slow rotation (optional) -------------------------
        if (cinematic) {
          let lastTs = 0;
          const rotate = (ts: number) => {
            if (cancelled || !mapRef.current) return;
            if (!lastTs) lastTs = ts;
            const delta = ts - lastTs;
            lastTs = ts;
            // ~3 degrees per second.
            const dBearing = (delta / 1000) * 3;
            map.setBearing(map.getBearing() + dBearing);
            rotationRafRef.current = requestAnimationFrame(rotate);
          };
          // Kick off rotation only after the initial fly-in finishes.
          setTimeout(() => {
            if (!cancelled) {
              rotationRafRef.current = requestAnimationFrame(rotate);
            }
          }, 3000);

          const pause = () => {
            if (rotationRafRef.current) {
              cancelAnimationFrame(rotationRafRef.current);
              rotationRafRef.current = null;
            }
          };
          map.on("mousedown", pause);
          map.on("touchstart", pause);
          map.on("wheel", pause);
        }

        setIsReady(true);
        onReady?.(map);
      });
    } catch (err) {
      console.error("[ParcelMap] initialization failed:", err);
      setMapError("Harita başlatılamadı.");
    }

    return () => {
      cancelled = true;
      if (rotationRafRef.current) {
        cancelAnimationFrame(rotationRafRef.current);
        rotationRafRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setIsReady(false);
    };
    // We intentionally re-initialise the map only when the parcel geometry,
    // initial center, or WebGL availability changes; runtime updates to POIs /
    // drone height are handled by the dedicated effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelFeature, fallbackCenter?.lat, fallbackCenter?.lon, webglOk]);

  // ---- Live POI updates (no remount) ----------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    const source = map.getSource("pois") as GeoJSONSource | undefined;
    if (source) source.setData(poiCollection);
  }, [poiCollection, isReady]);

  // ---- Live drone-height adjustments ----------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    const bounds = computeBounds(outerRing);
    if (!bounds) return;
    map.fitBounds(bounds, {
      padding: 80,
      maxZoom: 19,
      pitch: 60,
      bearing: map.getBearing(),
      duration: 1400,
    });
    map.once("moveend", () => {
      const offset = heightToZoomOffset(droneHeight);
      if (offset !== 0 && mapRef.current) {
        mapRef.current.easeTo({
          zoom: mapRef.current.getZoom() + offset,
          duration: 900,
        });
      }
    });
  }, [droneHeight, outerRing, isReady]);

  // Friendly fallback while we have no useful geometry yet.
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

  // Graceful WebGL fallback: keep all useful info but skip the GL canvas.
  if (webglOk === false) {
    return (
      <div
        className={`relative w-full h-full min-h-[420px] bg-gradient-to-br from-[#0f2a4f] via-[#0a1f3d] to-[#07182f] rounded-2xl overflow-hidden flex flex-col ${
          className || ""
        }`}
      >
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,_rgba(37,99,235,0.4)_0%,_transparent_60%),radial-gradient(circle_at_70%_70%,_rgba(124,58,237,0.3)_0%,_transparent_60%)]" />
        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <p className="text-white font-semibold text-sm mb-1">
            {[properties?.Il, properties?.Ilce, properties?.Mahalle]
              .filter(Boolean)
              .join(" · ") || "Parsel Konumu"}
          </p>
          <p className="text-white/60 text-xs mb-3">
            {[
              properties?.Ada && `${properties.Ada} Ada`,
              properties?.ParselNo && `${properties.ParselNo} Parsel`,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          <p className="text-white/50 text-[11px] font-mono">
            {fallbackCenter.lat.toFixed(5)}, {fallbackCenter.lon.toFixed(5)}
          </p>
          <p className="text-white/40 text-[11px] mt-4 max-w-xs">
            Tarayıcınız WebGL desteklemiyor; sinematik harita yerine özet
            görünüm gösteriliyor.
          </p>
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
      <div ref={containerRef} className="absolute inset-0" />

      {/* Cinematic glow overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_55%,_rgba(7,24,47,0.55)_100%)]" />

      {!isReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/40 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-white/80 text-sm">Harita yükleniyor…</p>
          </div>
        </div>
      )}

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

      {showOverlays && properties && (
        <div className="absolute top-3 left-3 right-16 z-10">
          <div className="bg-black/55 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {[properties.Il, properties.Ilce, properties.Mahalle]
                    .filter(Boolean)
                    .join(" · ") || "Parsel"}
                </p>
                <p className="text-white/60 text-xs truncate">
                  {[
                    properties.Ada && `${properties.Ada} Ada`,
                    properties.ParselNo && `${properties.ParselNo} Parsel`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              {properties.Alan && (
                <div className="text-right shrink-0">
                  <p className="text-primary text-[10px] uppercase tracking-wider">Alan</p>
                  <p className="text-white text-xs font-mono">
                    {parseFloat(properties.Alan).toLocaleString("tr-TR")} m²
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {showOverlays && (
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <div className="bg-black/55 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-white text-xs">Parsel Aktif</span>
              {droneHeight ? (
                <span className="text-white/50 text-[11px]">· {droneHeight} m drone</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/60 text-[11px] font-mono">
                {fallbackCenter.lat.toFixed(4)}, {fallbackCenter.lon.toFixed(4)}
              </span>
              {pois.length > 0 && (
                <>
                  <span className="text-white/30">|</span>
                  <span className="text-cyan-400 text-[11px]">{pois.length} POI</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
