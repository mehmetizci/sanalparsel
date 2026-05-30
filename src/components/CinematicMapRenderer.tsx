/**
 * CinematicMapRenderer - High-quality satellite video renderer component
 * 
 * Features:
 * - MapLibre GL JS with Esri World Imagery
 * - Antialiasing enabled
 * - 512px tile size for high resolution
 * - maxZoom 22 for maximum detail
 * - Cinematic pitch (55-65°) and smooth flyTo animations
 * - Contrast/saturation enhancement
 * - Atmospheric fog for depth
 * - Frame-by-frame capture for video export
 * - Progress-based camera blending (no camera mode jumps)
 */

"use client";

import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CINEMATIC_PITCH,
  CINEMATIC_EASING,
  buildCinematicStyle,
} from "@/lib/cinematic-renderer";
import { 
  CameraBlendingEngine, 
  calculateBaseZoom, 
  type CameraState 
} from "@/lib/camera-blending-engine";
import { useParcelStore } from "@/lib/parcel-store";
import type { Feature, Polygon, MultiPolygon, Position } from "geojson";
import type { LngLatLike } from "maplibre-gl";

export interface CinematicMapRendererProps {
  /** GeoJSON parcel feature */
  parcel: Feature<Polygon | MultiPolygon>;
  /** Video duration in seconds */
  duration?: number;
  /** Video FPS */
  fps?: number;
  /** Initial zoom level */
  zoom?: number;
  /** Drone height offset */
  droneHeight?: number;
  /** Callback for frame capture */
  onFrameCapture?: (frame: ImageData, timestamp: number) => void;
  /** Callback when render is complete */
  onRenderComplete?: (frames: ImageData[]) => void;
  /** Callback for progress updates */
  onProgress?: (progress: number, phase: string) => void;
  /** Show loading state */
  showLoading?: boolean;
  /** Auto-start render when map is ready */
  autoStart?: boolean;
}

export interface CinematicMapRendererRef {
  startRender: () => void;
  cancel: () => void;
  getProgress: () => { phase: string; progress: number; frames: number };
}

interface RenderState {
  phase: "idle" | "preloading" | "animating" | "capturing" | "complete" | "error" | "cancelled";
  progress: number;
  frames: ImageData[];
  currentFrame: number;
  totalFrames: number;
}

function flattenRings(geometry: Polygon | MultiPolygon): Position[] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] || [];
  }
  return (geometry.coordinates[0]?.[0] as Position[]) || [];
}

function computeBounds(positions: Position[]): { minLon: number; minLat: number; maxLon: number; maxLat: number } | null {
  if (!positions.length) return null;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const p of positions) {
    if (!Array.isArray(p) || typeof p[0] !== "number" || typeof p[1] !== "number") continue;
    if (p[0] < minLon) minLon = p[0];
    if (p[0] > maxLon) maxLon = p[0];
    if (p[1] < minLat) minLat = p[1];
    if (p[1] > maxLat) maxLat = p[1];
  }
  if (!Number.isFinite(minLon)) return null;
  return { minLon, minLat, maxLon, maxLat };
}

function computeCenter(positions: Position[]): { lat: number; lon: number } | null {
  if (!positions.length) return null;
  let lon = 0, lat = 0, count = 0;
  for (const p of positions) {
    if (Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number") {
      lon += p[0];
      lat += p[1];
      count += 1;
    }
  }
  if (!count) return null;
  return { lat: lat / count, lon: lon / count };
}

const CinematicMapRenderer = forwardRef<CinematicMapRendererRef, CinematicMapRendererProps>(({
  parcel,
  duration = 30,
  fps = 30,
  zoom = 16,
// droneHeight,
  onFrameCapture,
  onRenderComplete,
  onProgress,
  showLoading = true,
  autoStart = false,
}, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const animationRef = useRef<{ cancel: () => void } | null>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleHandledRef = useRef(false);
  const isCancelledRef = useRef(false);
  const framesRef = useRef<ImageData[]>([]);
  
  const [renderState, setRenderState] = useState<RenderState>({
    phase: "idle",
    progress: 0,
    frames: [],
    currentFrame: 0,
    totalFrames: duration * fps,
  });
  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store callbacks in refs to avoid stale closures
  const onProgressRef = useRef(onProgress);
  const onFrameCaptureRef = useRef(onFrameCapture);
  const onRenderCompleteRef = useRef(onRenderComplete);
  
  useEffect(() => {
    onProgressRef.current = onProgress;
    onFrameCaptureRef.current = onFrameCapture;
    onRenderCompleteRef.current = onRenderComplete;
  }, [onProgress, onFrameCapture, onRenderComplete]);

  // Start frame capture with camera blending
  const startCapture = useCallback(() => {
    const map = mapRef.current;
    if (!map || isCancelledRef.current) return;

    framesRef.current = [];
    const totalFrames = duration * fps;
    let frameCount = 0;
    const frameInterval = 1000 / fps;

    setRenderState(prev => ({ ...prev, phase: "capturing", progress: 0, currentFrame: 0 }));
    onProgressRef.current?.(0, "capturing_frames");

    // Create Camera Blending Engine for the capture phase
    const positions = flattenRings(parcel.geometry);
    const parcelCenter = computeCenter(positions);
    const droneSettings = useParcelStore.getState().droneSettings;
    const baseZoom = calculateBaseZoom(droneSettings.startHeight);
    const startBearing = Math.random() * 360;

    let blendingEngine: CameraBlendingEngine | null = null;
    if (parcelCenter) {
      blendingEngine = new CameraBlendingEngine({
        parcelCenter: [parcelCenter.lon, parcelCenter.lat],
        baseZoom,
        startBearing,
        altitude: droneSettings.startHeight,
        feel: droneSettings.cameraFeel,
      });
    }

    const captureFrame = () => {
      if (isCancelledRef.current) {
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }
        return;
      }

      // Update camera using blending engine during capture
      if (blendingEngine) {
        const progress = frameCount / totalFrames;
        const cameraState = blendingEngine.getState(progress);
        map.jumpTo({
          center: cameraState.center as LngLatLike,
          zoom: cameraState.zoom,
          pitch: cameraState.pitch,
          bearing: cameraState.bearing,
        });
      }

      const canvas = map.getCanvas();
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx && !isCancelledRef.current) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        framesRef.current.push(imageData);
        onFrameCaptureRef.current?.(imageData, frameCount * frameInterval);
        
        frameCount++;
        const progress = (frameCount / totalFrames) * 100;
        
        setRenderState(prev => ({
          ...prev,
          currentFrame: frameCount,
          progress: Math.round(progress),
        }));
        onProgressRef.current?.(Math.round(progress), "capturing_frames");

        if (frameCount >= totalFrames) {
          if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
          }
          
          if (!isCancelledRef.current) {
            setRenderState(prev => ({
              ...prev,
              phase: "complete",
              progress: 100,
              frames: [...framesRef.current],
            }));
            onProgressRef.current?.(100, "capture_complete");
            onRenderCompleteRef.current?.([...framesRef.current]);
          }
        }
      }
    };

    captureIntervalRef.current = setInterval(captureFrame, frameInterval);
  }, [duration, fps, parcel]);

  // Start render sequence
  const startRenderInternal = useCallback(() => {
    if (!isMapReady || isCancelledRef.current) return;

    isIdleHandledRef.current = false;
    framesRef.current = [];
    
    setRenderState(prev => ({ 
      ...prev, 
      phase: "preloading", 
      progress: 0, 
      currentFrame: 0,
      frames: [],
    }));
    onProgressRef.current?.(0, "preparing");

    const map = mapRef.current;
    if (!map) return;

    const positions = flattenRings(parcel.geometry);
    const bounds = computeBounds(positions);
    const center = computeCenter(positions);

    // Clear any existing timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }

    // Track if we've already started the next phase
    let hasStartedNextPhase = false;

    const handleIdle = () => {
      if (isIdleHandledRef.current || isCancelledRef.current || hasStartedNextPhase) return;
      isIdleHandledRef.current = true;
      hasStartedNextPhase = true;
      
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }

      if (isCancelledRef.current) return;

      // Transition to animating
      setRenderState(prev => ({ ...prev, phase: "animating", progress: 5 }));
      onProgressRef.current?.(10, "animating");

      // Skip if bounds/center are invalid
      if (!bounds || !center) {
        startCapture();
        return;
      }

      // Create Camera Blending Engine
      const droneSettings = useParcelStore.getState().droneSettings;
      const baseZoom = calculateBaseZoom(droneSettings.startHeight);
      const startBearing = Math.random() * 360;
      
      const blendingEngine = new CameraBlendingEngine({
        parcelCenter: [center.lon, center.lat],
        baseZoom,
        startBearing,
        altitude: droneSettings.startHeight,
        feel: droneSettings.cameraFeel,
      });

      // Initial camera state
      const initialState = blendingEngine.getState(0);
      map.jumpTo({
        center: initialState.center as LngLatLike,
        zoom: initialState.zoom,
        pitch: initialState.pitch,
        bearing: initialState.bearing,
      });

      // Progress-based animation
      const totalFrames = duration * fps;
      let currentFrame = 0;
      const animationDuration = Math.min(duration * 1000, 15000); // max 15s for intro
      const animationStartTime = performance.now();

      const animate = (timestamp: number) => {
        if (isCancelledRef.current) return;

        const elapsed = timestamp - animationStartTime;
        const progress = Math.min(elapsed / animationDuration, 1);

        // Get blended camera state
        const cameraState = blendingEngine.getState(progress);

        // Apply to map (smooth via jumpTo)
        map.jumpTo({
          center: cameraState.center as LngLatLike,
          zoom: cameraState.zoom,
          pitch: cameraState.pitch,
          bearing: cameraState.bearing,
        });

        // Update progress
        const frameProgress = Math.min(10 + progress * 40, 50);
        onProgressRef.current?.(Math.round(frameProgress), "animating");
        setRenderState(prev => ({ ...prev, progress: Math.round(frameProgress) }));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Animation complete, start capture
          startCapture();
        }
      };

      requestAnimationFrame(animate);
    };

    // Listen for idle event
    map.once("idle", handleIdle);
    
    // Fallback timeout - proceed even if map doesn't become fully idle
    idleTimeoutRef.current = setTimeout(() => {
      if (!isIdleHandledRef.current && !isCancelledRef.current) {
        handleIdle();
      }
    }, 6000);
  }, [isMapReady, parcel, duration, fps, startCapture]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    startRender: () => {
      isCancelledRef.current = false;
      startRenderInternal();
    },
    cancel: () => {
      isCancelledRef.current = true;
      
      if (animationRef.current) {
        animationRef.current.cancel();
        animationRef.current = null;
      }
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
      
      setRenderState(prev => ({ ...prev, phase: "cancelled" }));
      onProgressRef.current?.(0, "cancelled");
    },
    getProgress: () => ({
      phase: renderState.phase,
      progress: renderState.progress,
      frames: renderState.frames.length,
    }),
  }), [startRenderInternal, renderState]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && isMapReady) {
      const timer = setTimeout(() => {
        isCancelledRef.current = false;
        startRenderInternal();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isMapReady, startRenderInternal]);

  // Initialize map
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const positions = flattenRings(parcel.geometry);
    const center = computeCenter(positions);
    const bounds = computeBounds(positions);

    if (!center && !bounds) {
      setError("Invalid parcel geometry");
      return;
    }

    const mapCenter: [number, number] = center 
      ? [center.lon, center.lat]
      : [(bounds!.minLon + bounds!.maxLon) / 2, (bounds!.minLat + bounds!.maxLat) / 2];

    // Build cinematic style with high-quality settings
    const style = buildCinematicStyle({
      contrast: 1.15,
      saturation: 1.2,
      fogColor: [0.78, 0.85, 0.94, 0.3],
      fogAttenuation: 0.15,
      antialias: true,
    });

    const map = new maplibregl.Map({
      container: containerRef.current,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: style as any,
      center: mapCenter,
      zoom,
      pitch: 60,
      bearing: -20,
      maxZoom: 22,
      antialias: true,
      renderWorldCopies: false,
      preserveDrawingBuffer: true, // Required for frame capture
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add parcel polygon
      map.addSource("parcel", { type: "geojson", data: parcel });
      
      // Red fill with transparency
      map.addLayer({
        id: "parcel-fill",
        type: "fill",
        source: "parcel",
        paint: { "fill-color": "#ff2d55", "fill-opacity": 0.1 },
      });

      // Outer glow (wide, faint) - enhanced for video visibility
      map.addLayer({
        id: "parcel-outline-glow-outer",
        type: "line",
        source: "parcel",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ff2d55",
          "line-width": 20,
          "line-opacity": 0.3,
          "line-blur": 10,
        },
      });

      // Inner glow (medium) - enhanced
      map.addLayer({
        id: "parcel-outline-glow",
        type: "line",
        source: "parcel",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ff2d55",
          "line-width": 12,
          "line-opacity": 0.6,
          "line-blur": 5,
        },
      });

      // Main red outline (sharp, bright) - enhanced
      map.addLayer({
        id: "parcel-outline",
        type: "line",
        source: "parcel",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ff2d55",
          "line-width": 5,
          "line-opacity": 1,
        },
      });

      // Hide ALL map labels for clean professional video
      const hideLayer = (layerId: string) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      };
      
      // Settlement labels
      hideLayer('settlement-major-label');
      hideLayer('settlement-minor-label');
      hideLayer('settlement-sublabel');
      
      // Road labels
      hideLayer('road-number-shield');
      hideLayer('road-label');
      hideLayer('road-label-small');
      hideLayer('road-label-medium');
      hideLayer('road-label-large');
      hideLayer('highway-shield');
      
      // POI labels
      hideLayer('poi-label');
      hideLayer('poi-big-label');
      
      // Water labels
      hideLayer('waterway-label');
      hideLayer('water-label');
      
      // Admin boundaries
      hideLayer('state-label');
      hideLayer('country-label');
      hideLayer('district-label');
      hideLayer('municipality-label');
      
      // Airport labels
      hideLayer('airport-label');
      hideLayer('airport-iki-label');
      
      // Other labels
      hideLayer('mountain-peak-label');
      hideLayer('glacier-label');
      hideLayer('landform-label');
      hideLayer('biological-corridor-label');

      // Cinematic fly-in animation
      const cinematicPitch = CINEMATIC_PITCH.min + Math.random() * (CINEMATIC_PITCH.max - CINEMATIC_PITCH.min);
      
      if (bounds) {
        map.fitBounds(
          [[bounds.minLon, bounds.minLat], [bounds.maxLon, bounds.maxLat]],
          {
            padding: 80,
            maxZoom: 19,
            pitch: cinematicPitch,
            bearing: -20,
            duration: 3000,
            easing: CINEMATIC_EASING.flyTo,
          }
        );
      }

      setIsMapReady(true);
    });

    map.on("error", (e) => {
      console.error("Map error:", e);
      setError("Map rendering failed");
    });

    return () => {
      isCancelledRef.current = true;
      if (animationRef.current) {
        animationRef.current.cancel();
        animationRef.current = null;
      }
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [parcel, zoom]);

  // Determine display phase for loading overlay
  const displayPhase = renderState.phase === "cancelled" ? "idle" : renderState.phase as string;

  return (
    <div className="relative w-full h-full bg-[#0a1f3d] rounded-2xl overflow-hidden">
      {/* Map container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Loading overlay */}
      {showLoading && displayPhase !== "idle" && displayPhase !== "complete" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center">
            {displayPhase === "preloading" && (
              <>
                <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-white/80 text-sm">Yüksek çözünürlüklü harita hazırlanıyor...</p>
                <p className="text-white/50 text-xs mt-2">Kareler yükleniyor...</p>
              </>
            )}
            {displayPhase === "animating" && (
              <>
                <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-white/80 text-sm">Sinematik kamera animasyonu...</p>
                <p className="text-white/50 text-xs mt-2">%{renderState.progress}</p>
              </>
            )}
            {displayPhase === "capturing" && (
              <>
                <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden mx-auto mb-4">
                  <div 
                    className="h-full bg-primary transition-all duration-100"
                    style={{ width: `${renderState.progress}%` }}
                  />
                </div>
                <p className="text-white/80 text-sm">
                  Kare yakalanıyor... {renderState.currentFrame}/{renderState.totalFrames}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  %{renderState.progress}
                </p>
              </>
            )}
            {displayPhase === "error" && (
              <>
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-400 text-sm">{error || "Render failed"}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Success overlay */}
      {displayPhase === "complete" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-medium">Render Tamamlandı!</p>
            <p className="text-white/60 text-sm mt-1">
              {renderState.frames.length} kare yakalandı
            </p>
          </div>
        </div>
      )}

      {/* Cancelled overlay */}
      {renderState.phase === "cancelled" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-yellow-400 font-medium">Render İptal Edildi</p>
          </div>
        </div>
      )}

      {/* Debug info */}
      <div className="absolute bottom-3 left-3 z-10 bg-black/50 backdrop-blur-md rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-white/70 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${isMapReady ? 'bg-green-400' : 'bg-primary animate-pulse'}`} />
          <span>MapLibre</span>
          <span>|</span>
          <span>{fps} FPS</span>
          <span>|</span>
          <span>{displayPhase}</span>
        </div>
      </div>
    </div>
  );
});

CinematicMapRenderer.displayName = "CinematicMapRenderer";

export default CinematicMapRenderer;