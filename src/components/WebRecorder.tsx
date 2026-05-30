"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, Polygon, MultiPolygon, Position } from "geojson";
import type { CameraSequence, CameraSequenceStep } from "@/lib/parcel-store";
import { buildCinematicStyle, CINEMATIC_EASING } from "@/lib/cinematic-renderer";
import { interpolateCameraStep as interpolateFromLibrary } from "@/lib/camera-sequence";

export interface WebRecorderProps {
  /** GeoJSON parcel feature */
  parcel: Feature<Polygon | MultiPolygon>;
  /** Camera sequence for animation */
  cameraSequence: CameraSequence;
  /** Output width */
  width?: number;
  /** Output height */
  height?: number;
  /** FPS for recording */
  fps?: number;
  /** Callback for recording progress */
  onProgress?: (progress: number, phase: string) => void;
  /** Callback when recording is complete */
  onComplete?: (blob: Blob) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface WebRecorderRef {
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: () => boolean;
}

interface RecordingState {
  phase: "idle" | "preparing" | "recording" | "processing" | "complete" | "error";
  progress: number;
  elapsed: number;
  duration: number;
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

export default function WebRecorder({
  parcel,
  cameraSequence,
  width = 720,
  height = 1280,
  fps = 30,
  onProgress,
  onComplete,
  onError,
}: WebRecorderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isRecordingRef = useRef(false);

  const [state, setState] = useState<RecordingState>({
    phase: "idle",
    progress: 0,
    elapsed: 0,
    duration: cameraSequence?.totalDuration || 30,
  });

  const updateState = useCallback((updates: Partial<RecordingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Use the enhanced interpolation from camera-sequence library
  // This includes proper Hero Zoom (parcel locked, only zoom changes)
  const interpolateCameraStep = useCallback((
    step: CameraSequenceStep,
    t: number,
    center: { lat: number; lon: number }
  ): { center: [number, number]; zoom: number; pitch: number; bearing: number } => {
    // Delegate to the library function which has all mode implementations
    return interpolateFromLibrary(step, t, center);
  }, []);

  // Helper to wait for map to be fully loaded before recording
  const waitForMapReady = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const map = mapRef.current;
      if (!map) {
        console.log("[WebRecorder] No map instance");
        resolve(false);
        return;
      }

      // Check if map is already loaded
      if (map.loaded() && map.isStyleLoaded()) {
        console.log("[WebRecorder] Map style loaded, checking resources...");
        
        // Check if parcel source and layers are ready
        const sourceReady = map.getSource("parcel") !== undefined;
        const layerReady = map.getLayer("parcel-fill") !== undefined;
        const tilesReady = map.areTilesLoaded();
        
        console.log("[WebRecorder] Readiness check:", { sourceReady, layerReady, tilesReady });
        
        if (sourceReady && layerReady && tilesReady) {
          console.log("[WebRecorder] All resources ready");
          resolve(true);
          return;
        }
        
        // Wait for source/layer to be added + tiles
        const resourceChecker = setInterval(() => {
          const srcReady = map.getSource("parcel") !== undefined;
          const lyrReady = map.getLayer("parcel-fill") !== undefined;
          const tReady = map.areTilesLoaded();
          
          if (srcReady && lyrReady && tReady) {
            clearInterval(resourceChecker);
            console.log("[WebRecorder] All resources ready (via checker)");
            resolve(true);
          }
        }, 100);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(resourceChecker);
          console.log("[WebRecorder] Resource load timeout, proceeding anyway");
          resolve(true);
        }, 30000);
      } else {
        // Wait for map to load
        const loadHandler = () => {
          map.off("load", loadHandler);
          console.log("[WebRecorder] Map style loaded, waiting for resources...");
          
          // Wait for source/layer/tiles
          const resourceChecker = setInterval(() => {
            const srcReady = map.getSource("parcel") !== undefined;
            const lyrReady = map.getLayer("parcel-fill") !== undefined;
            const tReady = map.areTilesLoaded();
            
            if (srcReady && lyrReady && tReady) {
              clearInterval(resourceChecker);
              console.log("[WebRecorder] All resources ready (after load)");
              resolve(true);
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(resourceChecker);
            console.log("[WebRecorder] Resource load timeout, proceeding anyway");
            resolve(true);
          }, 30000);
        };

        map.on("load", loadHandler);
      }
    });
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || !mapRef.current) return;

    // Log selected camera modes and settings
    console.log("[WebRecorder] selected camera modes:", cameraSequence?.steps.map(s => s.mode) || []);
    console.log("[WebRecorder] camera feeling:", cameraSequence?.steps[0]?.easing || "unknown");
    console.log("[WebRecorder] scene count:", cameraSequence?.steps.length || 0);

    // Wait for map to be fully ready
    console.log("[WebRecorder] Waiting for map to be ready...");
    const isMapReady = await waitForMapReady();
    if (!isMapReady) {
      console.error("[WebRecorder] Map not ready");
      onError?.(new Error("Map not ready"));
      return;
    }
    console.log("[WebRecorder] Map ready, waiting 1.5s extra for tiles to fully load...");
    
    // Extra delay for tiles to fully load (prevents tile loading artifacts in video)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log("[WebRecorder] Map ready, starting recording");
    console.log("[WebRecorder] recording started");
    
    isRecordingRef.current = true;
    chunksRef.current = [];
    startTimeRef.current = performance.now();

    const map = mapRef.current;
    const canvas = map.getCanvas();
    
    // Create MediaRecorder
    const stream = canvas.captureStream(fps);
    
    // Try VP9 first, fallback to VP8
    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm;codecs=vp8";
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
    }

    console.log("[WebRecorder] Using mime type:", mimeType);

    try {
      const recorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: 8000000 // 8 Mbps for high quality
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        console.log("[WebRecorder] Recording stopped, processing...");
        updateState({ phase: "processing", progress: 95 });

        // Combine chunks into final blob
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log("[WebRecorder] Final blob size:", blob.size);
        
        onComplete?.(blob);
        updateState({ phase: "complete", progress: 100 });
      };

      recorder.start(100); // Collect data every 100ms
      updateState({ phase: "recording", progress: 0, elapsed: 0 });

      // Start animation loop
      const duration = cameraSequence?.totalDuration || 30000;
      const startTime = performance.now();
      const positions = flattenRings(parcel.geometry);
      const center = computeCenter(positions);
      const bounds = computeBounds(positions);

      if (!center || !bounds) {
        console.error("[WebRecorder] No valid parcel geometry");
        onError?.(new Error("Invalid parcel geometry"));
        return;
      }

      // Initial fly-in animation
      const cinematicPitch = 55 + Math.random() * 10;
      map.fitBounds(
        [[bounds.minLon, bounds.minLat], [bounds.maxLon, bounds.maxLat]],
        {
          padding: 60,
          maxZoom: 18,
          pitch: cinematicPitch,
          bearing: -20,
          duration: 2000,
          easing: CINEMATIC_EASING.flyTo,
        }
      );

      // Animation loop
      const animate = (now: number) => {
        if (!isRecordingRef.current) return;

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Update state every frame
        updateState({ 
          elapsed: Math.floor(elapsed / 1000), 
          progress: Math.round(progress * 90) 
        });
        onProgress?.(Math.round(progress * 90), "recording");

        if (progress >= 1) {
          // Stop recording
          recorderRef.current?.stop();
          isRecordingRef.current = false;
          return;
        }

        // Calculate which step we're in based on elapsed time
        const steps = cameraSequence?.steps || [];
        let accumulatedTime = 0;
        let currentStep: CameraSequenceStep | null = null;
        let stepProgress = 0;

        for (let i = 0; i < steps.length; i++) {
          if (elapsed * 1000 < accumulatedTime + steps[i].duration * 1000) {
            currentStep = steps[i];
            stepProgress = (elapsed * 1000 - accumulatedTime) / (steps[i].duration * 1000);
            break;
          }
          accumulatedTime += steps[i].duration * 1000;
        }

        if (currentStep && map) {
          const camera = interpolateCameraStep(currentStep, stepProgress, center);
          map.jumpTo({
            center: camera.center,
            zoom: camera.zoom,
            pitch: camera.pitch,
            bearing: camera.bearing,
          });
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      // Start animation after initial fly-in + tile loading delay (3.5 seconds total)
      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 3500);

    } catch (err) {
      console.error("[WebRecorder] Recording error:", err);
      isRecordingRef.current = false;
      onError?.(err as Error);
    }
  }, [parcel, cameraSequence, fps, onProgress, onComplete, onError, updateState, waitForMapReady]);

  const stopRecording = useCallback(() => {
    console.log("[WebRecorder] Stopping recording");
    isRecordingRef.current = false;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const initializeMap = useCallback(() => {
    if (!containerRef.current) return;

    const positions = flattenRings(parcel.geometry);
    const center = computeCenter(positions);
    const bounds = computeBounds(positions);

    if (!center || !bounds) {
      console.error("[WebRecorder] No valid parcel geometry");
      return;
    }

    console.log("[WebRecorder] Initializing map with center:", center);
    console.log("[WebRecorder] Parcel bounds:", bounds);
    console.log("[WebRecorder] Camera sequence:", JSON.stringify(cameraSequence, null, 2));

    // Build cinematic style
    const style = buildCinematicStyle({
      contrast: 1.15,
      saturation: 1.2,
      fogColor: [0.78, 0.85, 0.94, 0.3],
      fogAttenuation: 0.15,
      antialias: true,
    });

    // Create map
    const map = new maplibregl.Map({
      container: containerRef.current,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: style as any,
      center: [center.lon, center.lat],
      zoom: 15,
      pitch: 60,
      bearing: -20,
      maxZoom: 22,
      antialias: true,
      renderWorldCopies: false,
      preserveDrawingBuffer: true,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      console.log("[WebRecorder] Map loaded, adding parcel layer");
      
      // Add parcel source and layers
      map.addSource("parcel", { type: "geojson", data: parcel });
      
      // Red fill with transparency
      map.addLayer({
        id: "parcel-fill",
        type: "fill",
        source: "parcel",
        paint: { "fill-color": "#ff2d55", "fill-opacity": 0.1 },
      });

      // Outer glow (wide, faint)
      map.addLayer({
        id: "parcel-outline-glow-outer",
        type: "line",
        source: "parcel",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ff2d55",
          "line-width": 16,
          "line-opacity": 0.2,
          "line-blur": 8,
        },
      });

      // Inner glow (medium)
      map.addLayer({
        id: "parcel-outline-glow",
        type: "line",
        source: "parcel",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ff2d55",
          "line-width": 10,
          "line-opacity": 0.5,
          "line-blur": 4,
        },
      });

      // Main red outline (sharp, bright)
      map.addLayer({
        id: "parcel-outline",
        type: "line",
        source: "parcel",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ff2d55",
          "line-width": 4,
          "line-opacity": 1,
        },
      });

      // Initial fly-in
      const cinematicPitch = 55 + Math.random() * 10;
      map.fitBounds(
        [[bounds.minLon, bounds.minLat], [bounds.maxLon, bounds.maxLat]],
        {
          padding: 60,
          maxZoom: 18,
          pitch: cinematicPitch,
          bearing: -20,
          duration: 2000,
          easing: CINEMATIC_EASING.flyTo,
        }
      );

      updateState({ phase: "preparing", progress: 10 });
      onProgress?.(10, "preparing");
    });

    map.on("error", (e) => {
      console.error("[WebRecorder] Map error:", e);
    });

    return () => {
      isRecordingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [parcel, cameraSequence, onProgress, updateState]);

  // Initialize map on mount
  useEffect(() => {
    const cleanup = initializeMap();
    return () => {
      cleanup?.();
    };
  }, [initializeMap]);

  // Expose start/stop methods via ref-like pattern
  useEffect(() => {
    // This component can be controlled via callbacks
    // Parent can call startRecording() and stopRecording() via refs if needed
  }, [startRecording, stopRecording]);

  return (
    <div className="relative" style={{ width, height }}>
      {/* Hidden map container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />
      
      {/* Canvas ref for reference (not visible) */}
      <canvas 
        ref={canvasRef} 
        style={{ display: "none" }}
        width={width}
        height={height}
      />

      {/* Progress overlay */}
      {state.phase !== "idle" && state.phase !== "complete" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center p-6">
            {/* Spinner for preparing/processing */}
            {(state.phase === "preparing" || state.phase === "processing") && (
              <div className="mb-4">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            )}

            {/* Recording indicator */}
            {state.phase === "recording" && (
              <div className="mb-4 flex items-center justify-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-medium">Video Oluşturuluyor</span>
              </div>
            )}

            {/* Progress bar */}
            <div className="w-64 mx-auto mb-4">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-300"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
            </div>

            {/* Status text */}
            <p className="text-white text-lg font-medium mb-2">
              {state.phase === "preparing" && "Harita hazırlanıyor..."}
              {state.phase === "recording" && "Video oluşturuluyor..."}
              {state.phase === "processing" && "Video işleniyor..."}
            </p>

            {/* Time and progress */}
            <p className="text-white/60 text-sm">
              {state.phase === "recording" && `${state.elapsed}/${Math.floor(state.duration / 1000)} sn`}
              {state.phase === "preparing" && `Yükleniyor`}
              {state.phase === "processing" && "Video hazırlanıyor..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the control functions
export const createWebRecorderControls = (component: {
  startRecording: () => void;
  stopRecording: () => void;
}) => ({
  start: component.startRecording,
  stop: component.stopRecording,
});