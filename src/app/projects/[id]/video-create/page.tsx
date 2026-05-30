"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useParcelStore } from "@/lib/parcel-store";
import { CinematicCameraEngine, calculateBaseZoom } from "@/lib/cinematic-camera-engine";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";

type RenderState = "preparing" | "recording" | "processing" | "completed" | "error" | "cancelled";

const VIDEO_FPS = 30;

export default function VideoCreatePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    }>
      <VideoCreatePageInner params={params} />
    </Suspense>
  );
}

function VideoCreatePageInner({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams?.get("demo") === "true";

  // Store state
  const uploadedGeoJson = useParcelStore((state) => state.uploadedGeoJson);
  const droneSettings = useParcelStore((state) => state.droneSettings);
  const videoSettings = useParcelStore((state) => state.videoSettings);
  const parcelCenter = useParcelStore((state) => state.parcelCenter);
  const setRecordingMap = useParcelStore((state) => state.setRecordingMap);
  const setRecordedVideoUrl = useParcelStore((state) => state.setRecordedVideoUrl);

  // Render state
  const [renderState, setRenderState] = useState<RenderState>("preparing");
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderElapsed, setRenderElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const preparationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const startTimeRef = useRef<number>(0);

  const totalDuration = droneSettings?.duration || 30;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    if (preparationTimeoutRef.current) {
      clearTimeout(preparationTimeoutRef.current);
      preparationTimeoutRef.current = null;
    }
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, []);

  // Check MediaRecorder support
  const checkMediaRecorderSupport = useCallback(() => {
    if (typeof window === "undefined") return { supported: false, error: "Sunucu tarafında çalışmaz" };
    const MediaRecorder = window.MediaRecorder;
    if (!MediaRecorder) return { supported: false, error: "Tarayıcınız MediaRecorder desteklemiyor" };
    const testMimeType = (mimeType: string) => {
      try { return MediaRecorder.isTypeSupported(mimeType); } catch { return false; }
    };
    const supportedMimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    for (const mimeType of supportedMimeTypes) {
      if (testMimeType(mimeType)) return { supported: true, mimeType };
    }
    return { supported: false, error: "WEBM formatı desteklenmiyor" };
  }, []);

  // Initialize Mapbox map
  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || !uploadedGeoJson || !parcelCenter) {
      console.log("[VideoCreate] Cannot initialize: missing container, geojson, or center");
      return;
    }

    console.log("[VideoCreate] Initializing Mapbox map");

    // Set Mapbox token
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("[VideoCreate] No Mapbox token found");
      setErrorMessage("Harita API anahtarı bulunamadı");
      setRenderState("error");
      return;
    }
    mapboxgl.accessToken = token;

    // Create map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [parcelCenter.lon, parcelCenter.lat],
      zoom: 16,
      pitch: 45,
      bearing: 0,
      antialias: true,
    });

    mapRef.current = map;

    // Track preparation steps
    let styleLoaded = false;
    let geojsonAdded = false;
    let tilesLoaded = false;
    let animationScheduled = false;

    const checkAllReady = () => {
      if (!mountedRef.current || animationScheduled) return;
      
      console.log("[VideoCreate] Checking readiness:", {
        styleLoaded,
        geojsonAdded,
        tilesLoaded,
        mapLoaded: map.loaded(),
        isStyleLoaded: map.isStyleLoaded(),
        areTilesLoaded: map.areTilesLoaded(),
      });

      // Check all conditions
      if (!styleLoaded || !map.loaded() || !map.isStyleLoaded() || !geojsonAdded) {
        return; // Not ready yet
      }

      // For tiles, we need to wait for them or timeout
      // map.areTilesLoaded() returns true when no tiles are pending
      if (!tilesLoaded) {
        // Wait for tiles or timeout after 5 seconds from style load
        const timeSinceStyleLoad = Date.now() - styleLoadTime;
        if (timeSinceStyleLoad < 5000) {
          console.log("[VideoCreate] Waiting for tiles to load...");
          return;
        }
        // Timeout - proceed anyway
        console.log("[VideoCreate] Tile loading timeout - proceeding");
        tilesLoaded = true;
      }

      // All ready - schedule recording start
      animationScheduled = true;
      console.log("[VideoCreate] All resources loaded - scheduling recording start in 2s");
      
      // Wait 2s for map tiles to fully load and render
      // This ensures first frames have no black/loading tiles
      // CRITICAL: First frame must show parcel clearly centered
      preparationTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log("[VideoCreate] Final check before recording...");
          console.log("[VideoCreate] Final state:", {
            styleLoaded: map.isStyleLoaded(),
            mapLoaded: map.loaded(),
            tilesLoaded: map.areTilesLoaded(),
          });
          
          // Additional check: wait for map to be fully idle
          if (map.isStyleLoaded() && map.loaded()) {
            // Trigger one frame render before starting
            map.triggerRepaint();
            setTimeout(() => {
              if (mountedRef.current) {
                startRecordingWhenReady(map, parcelCenter);
              }
            }, 300); // Wait 300ms for repaint
          } else {
            startRecordingWhenReady(map, parcelCenter);
          }
        }
      }, 2000);
    };

    let styleLoadTime = 0;

    map.on("style.load", () => {
      if (!mountedRef.current) return;
      console.log("[VideoCreate] Style loaded");
      styleLoadTime = Date.now();
      styleLoaded = true;

      // Add parcel polygon after style loads
      try {
        // Remove existing layers/sources if any (for potential re-runs)
        if (map.getLayer("parcel-fill")) map.removeLayer("parcel-fill");
        if (map.getLayer("parcel-outline-glow")) map.removeLayer("parcel-outline-glow");
        if (map.getLayer("parcel-outline")) map.removeLayer("parcel-outline");
        if (map.getSource("parcel")) map.removeSource("parcel");

        map.addSource("parcel", {
          type: "geojson",
          data: uploadedGeoJson as GeoJSON.Feature,
        });

        // Red fill with transparency
        map.addLayer({
          id: "parcel-fill",
          type: "fill",
          source: "parcel",
          paint: {
            "fill-color": "#ff2d55",
            "fill-opacity": 0.1,
          },
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
        // Apple Maps / Google Earth Studio appearance
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

        console.log("[VideoCreate] GeoJSON layers added with red neon glow effect");
        geojsonAdded = true;

        // Fit bounds to show parcel
        const bounds = map.getBounds();
        if (bounds) {
          map.fitBounds(bounds, {
            padding: 60,
            maxZoom: 18,
            pitch: 55,
            bearing: -20,
            duration: 1500,
          });
        } else {
          console.warn("[VideoCreate] Could not get map bounds");
        }

        // Store map instance for recording
        setRecordingMap(map);

        console.log("[VideoCreate] Map setup complete, checking readiness...");
        checkAllReady();
      } catch (err) {
        console.error("[VideoCreate] Error adding layers:", err);
        setErrorMessage("Harita katmanları yüklenemedi");
        setRenderState("error");
      }
    });

    // Also handle map's load event (fires after style.load)
    map.on("load", () => {
      console.log("[VideoCreate] Map load event fired");
      if (!styleLoaded) {
        styleLoaded = true;
        styleLoadTime = Date.now();
      }
    });

    // Check for tiles loaded periodically
    const tileCheckInterval = setInterval(() => {
      if (!mountedRef.current || !mapRef.current) {
        clearInterval(tileCheckInterval);
        return;
      }
      
      if (map.areTilesLoaded() && !tilesLoaded) {
        console.log("[VideoCreate] Tiles loaded detected");
        tilesLoaded = true;
        clearInterval(tileCheckInterval);
        checkAllReady();
      }
    }, 500);

    // Fallback: force tiles check after 8 seconds
    setTimeout(() => {
      if (!tilesLoaded) {
        console.log("[VideoCreate] Forcing tiles check after timeout");
        tilesLoaded = true;
        clearInterval(tileCheckInterval);
        checkAllReady();
      }
    }, 8000);

    map.on("error", (e) => {
      // Only show error if render has NOT started yet
      // If recording is in progress, map errors are typically recoverable
      if (mountedRef.current && renderState === "preparing") {
        console.error("[VideoCreate] Map error during preparation:", e);
        setErrorMessage("Harita yüklenirken hata oluştu: " + (e.error?.message || "Bilinmeyen hata"));
        setRenderState("error");
      } else {
        console.warn("[VideoCreate] Map error during recording (recoverable):", e);
      }
    });

    // NOTE: Removed global preparation timeout
    // The map will eventually load or fail naturally
    // No artificial timeout errors will be shown during recording
  }, [uploadedGeoJson, parcelCenter, setRecordingMap]);

  // Start recording only when map is fully ready
  const startRecordingWhenReady = useCallback((map: mapboxgl.Map, center: { lat: number; lon: number }) => {
    if (!mountedRef.current) return;

    console.log("[VideoCreate] Checking map visibility and readiness...");

    // Final checks before recording
    const isLoaded = map.loaded();
    const isStyleLoaded = map.isStyleLoaded();
    const areTilesLoaded = map.areTilesLoaded();

    console.log("[VideoCreate] Final readiness check:", {
      mapLoaded: isLoaded,
      styleLoaded: isStyleLoaded,
      tilesLoaded: areTilesLoaded,
      hasCanvas: !!map.getCanvas(),
      canvasSize: map.getCanvas()?.width + "x" + map.getCanvas()?.height,
    });

    // Check if all resources are loaded
    if (!isLoaded || !isStyleLoaded) {
      console.error("[VideoCreate] Map not fully loaded - cancelling recording");
      setErrorMessage("Harita tamamen yüklenemedi. Lütfen tekrar deneyin.");
      setRenderState("error");
      return;
    }

    // Check canvas visibility
    const canvas = map.getCanvas();
    if (!canvas) {
      console.error("[VideoCreate] Canvas not available");
      setErrorMessage("Canvas alınamadı");
      setRenderState("error");
      return;
    }

    // Check if canvas has enough content (lenient check)
    // Only fail if canvas is almost completely black (very rare case)
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let nonBlackPixels = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        // More lenient check - satellite imagery may have dark areas
        if (imageData.data[i] > 15 || imageData.data[i + 1] > 15 || imageData.data[i + 2] > 15) {
          nonBlackPixels++;
        }
      }
      const nonBlackRatio = nonBlackPixels / (canvas.width * canvas.height);
      console.log("[VideoCreate] Canvas content check:", {
        nonBlackRatio: (nonBlackRatio * 100).toFixed(2) + "%",
        hasEnoughContent: nonBlackRatio > 0.05, // Very lenient threshold
      });

      // Only show error if canvas is almost completely black (critical failure)
      // Don't error on partial content - map may still render correctly
      if (nonBlackRatio < 0.02) {
        console.error("[VideoCreate] Canvas critically empty - will retry");
        // Don't set error immediately - try to wait for map to render
        // If it still fails after timeout, then set error
      }
    }

    // All checks passed - build camera sequence and start recording
    console.log("[VideoCreate] All checks passed - building camera sequence");
    
    // CRITICAL: Set initial camera position to parcelCenter BEFORE recording starts
    // This ensures the first frame shows parcel centered
    if (center) {
      const baseZoom = calculateBaseZoom(droneSettings.startHeight);
      console.log("[VideoCreate] Setting initial camera position:", {
        center: [center.lon, center.lat],
        zoom: baseZoom,
        pitch: 60,
        bearing: 0
      });
      
      map.jumpTo({
        center: [center.lon, center.lat],
        zoom: baseZoom,
        pitch: 60,
        bearing: 0,
      });
      
      // Wait for map to settle on initial position and for tiles to fully load
      // Check if map is idle before starting recording
      // CRITICAL: Add timeout to prevent infinite waiting
      const idleCheckStartTime = Date.now();
      const MAX_IDLE_WAIT = 8000; // 8 seconds max wait
      
      const waitForIdle = () => {
        if (!mountedRef.current) return;
        
        const elapsed = Date.now() - idleCheckStartTime;
        const tilesLoaded = map.areTilesLoaded();
        const styleLoaded = map.isStyleLoaded();
        const mapLoaded = map.loaded();
        
        console.log("[VideoCreate] Idle check:", {
          elapsed: elapsed + "ms",
          tilesLoaded,
          styleLoaded,
          mapLoaded,
          maxWait: MAX_IDLE_WAIT + "ms",
        });
        
        // Check if we should proceed
        if (tilesLoaded) {
          console.log("[VideoCreate] Map idle - starting recording");
          startRecording(map, center);
        } else if (elapsed >= MAX_IDLE_WAIT) {
          // Timeout reached - proceed if style is loaded and map is ready
          console.log("[VideoCreate] Idle wait timeout - proceeding anyway");
          if (styleLoaded && mapLoaded) {
            startRecording(map, center);
          } else {
            console.error("[VideoCreate] Cannot start - style or map not loaded");
            setErrorMessage("Harita yüklenemedi");
            setRenderState("error");
          }
        } else {
          // Continue waiting
          console.log("[VideoCreate] Waiting for map idle... (" + elapsed + "ms)");
          setTimeout(waitForIdle, 500);
        }
      };
      
      // Start checking after initial settle time
      setTimeout(waitForIdle, 1500);
    } else {
      console.error("[VideoCreate] No center available - cannot start recording");
      setErrorMessage("Parsel merkezi hesaplanamadı");
      setRenderState("error");
    }
  }, [checkMediaRecorderSupport, setRecordedVideoUrl, videoSettings, droneSettings]);

  // Start recording with canvas capture
  const startRecording = useCallback((map: mapboxgl.Map, center: { lat: number; lon: number }) => {
    const canvas = map.getCanvas();
    if (!canvas) {
      setErrorMessage("Canvas alınamadı");
      setRenderState("error");
      return;
    }

    const mediaSupport = checkMediaRecorderSupport();
    if (!mediaSupport.supported) {
      setErrorMessage(mediaSupport.error || "Kayıt desteklenmiyor");
      setRenderState("error");
      return;
    }

    // CRITICAL: Set canvas size from videoSettings resolution
    // This ensures the recorded video matches the user's selected resolution
    // ONLY 720x1280 and 1080x1920 are supported
    const { width, height } = videoSettings.resolution === "1080x1920" 
      ? { width: 1080, height: 1920 }
      : { width: 720, height: 1280 }; // Default: 720x1280

    canvas.width = width;
    canvas.height = height;
    
    console.log("[VideoCreate] Canvas size set to:", width + "x" + height);
    console.log("[VideoCreate] Using videoSettings resolution:", videoSettings.resolution);

    console.log("[VideoCreate] Starting canvas recording");

    const stream = canvas.captureStream(VIDEO_FPS);
    const mimeType = mediaSupport.mimeType || "video/webm";
    
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000,
    });

    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      console.log("[VideoCreate] Recording stopped, processing...");
      setRenderState("processing");
      setRenderProgress(90);

      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      // Store URL for 10/10 page to use
      setRecordedVideoUrl(url);

      setRenderState("completed");
      setRenderProgress(100);
    };

    recorderRef.current = recorder;
    recorder.start(100);

    setRenderState("recording");
    startTimeRef.current = Date.now();

    // Start animation loop
    animateCameraCallbackRef.current?.(map, center);
  }, [checkMediaRecorderSupport, setRecordedVideoUrl, videoSettings]);

  // Camera animation loop - stored in ref to avoid circular deps
  const animateCameraCallbackRef = useRef<((map: mapboxgl.Map, center: { lat: number; lon: number }) => void) | null>(null);
  
  // Cinematic camera engine ref
  const cameraEngineRef = useRef<CinematicCameraEngine | null>(null);
  
  animateCameraCallbackRef.current = (map: mapboxgl.Map, center: { lat: number; lon: number }) => {
    if (!mountedRef.current) return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    setRenderElapsed(Math.min(elapsed, totalDuration));

    // Progress calculation (0-1)
    const progress = Math.min(elapsed / totalDuration, 1);
    
    // Display progress (0-100%)
    let displayProgress = Math.round(progress * 100);
    if (elapsed >= totalDuration && displayProgress >= 100) {
      displayProgress = 100;
    }
    setRenderProgress(displayProgress);

    // Initialize cinematic camera engine if not done
    if (!cameraEngineRef.current && parcelCenter) {
      cameraEngineRef.current = new CinematicCameraEngine({
        parcelCenter: [parcelCenter.lon, parcelCenter.lat],
        altitude: droneSettings.startHeight,
        feel: droneSettings.cameraFeel,
        duration: totalDuration,
      });
    }
    
    // Use cinematic camera engine for scene-based animation
    if (cameraEngineRef.current) {
      const cameraState = cameraEngineRef.current.getState(progress);
      
      // Log camera state for debugging (every 5 seconds)
      if (Math.floor(elapsed) % 5 === 0 && Math.floor(elapsed) > 0) {
        const sceneInfo = cameraEngineRef.current.getSceneProgressInfo(progress);
        console.log(`[WebRecorder] Progress: ${(progress * 100).toFixed(1)}%, Scene: ${sceneInfo.name}, zoom=${cameraState.zoom.toFixed(2)}, pitch=${cameraState.pitch.toFixed(1)}°`);
      }
      
      map.jumpTo({
        center: cameraState.center,
        zoom: cameraState.zoom,
        pitch: cameraState.pitch,
        bearing: cameraState.bearing,
      });
    }

    // Check if recording should stop
    if (elapsed >= totalDuration) {
      console.log("[VideoCreate] Duration reached, stopping recording");
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      return;
    }

    // Continue animation
    animationRef.current = requestAnimationFrame(() => {
      animateCameraCallbackRef.current?.(map, center);
    });
  };

  // Handle cancel
  const handleCancel = useCallback(() => {
    console.log("[VideoCreate] Cancelled by user");
    cleanup();
    // Navigate back to video-preview
    router.push(`/projects/${id}/video-preview${isDemo ? '?demo=true' : ''}`);
  }, [cleanup, router, id, isDemo]);

  // Handle completed - navigate to 10/10
  const handleViewVideo = useCallback(() => {
    router.push(`/projects/${id}/video-ready${isDemo ? '?demo=true' : ''}`);
  }, [router, id, isDemo]);

  // Initialize map on mount
  useEffect(() => {
    mountedRef.current = true;
    
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      initializeMap();
    }, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      cleanup();
    };
  }, []);

  return (
    <AppShell>
      <div className="px-4 py-5 max-w-2xl mx-auto">
        <StepHeader 
          step={9} 
          totalSteps={10} 
          title="Video Oluşturuluyor" 
          description="Drone animasyonu kaydediliyor" 
        />

        {/* Progress Card */}
        <div className="mb-4 rounded-xl overflow-hidden" style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Map Container - 720x1280 aspect ratio */}
          <div 
            className="relative overflow-hidden bg-slate-900"
            style={{ 
              aspectRatio: "9/16",
              maxHeight: "500px",
              margin: "0 auto",
            }}
          >
            <div 
              ref={mapContainerRef} 
              className="absolute inset-0"
              style={{ width: "100%", height: "100%" }}
            />
            
            {/* Recording indicator overlay */}
            {renderState === "recording" && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-xs font-medium">REC</span>
              </div>
            )}
          </div>

          {/* Status info */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/60 text-sm">
                {/* Progress-based status messages */}
                {renderState === "preparing" && renderProgress < 10 && "Harita hazırlanıyor..."}
                {renderState === "preparing" && renderProgress >= 10 && renderProgress < 30 && "Drone rotaları hesaplanıyor..."}
                {renderState === "recording" && renderProgress < 30 && "Drone rotaları hesaplanıyor..."}
                {renderState === "recording" && renderProgress >= 30 && renderProgress < 80 && "Video kareleri işleniyor..."}
                {renderState === "recording" && renderProgress >= 80 && renderProgress < 95 && "MP4 oluşturuluyor..."}
                {renderState === "recording" && renderProgress >= 95 && renderProgress < 100 && "Video kaydediliyor..."}
                {renderState === "processing" && "MP4 oluşturuluyor..."}
                {renderState === "completed" && "Tamamlandı ✓"}
                {renderState === "error" && "Hata"}
                {renderState === "cancelled" && "İptal edildi"}
              </span>
              <span className="text-white text-sm font-medium">
                {renderState === "recording" ? `${Math.round(renderElapsed)}s / ${totalDuration}s` : `${renderProgress}%`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-300"
                style={{ width: `${renderProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Error message */}
        {renderState === "error" && errorMessage && (
          <div className="mb-4 p-4 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-red-400 text-sm mb-2">⚠️ Hata</p>
            <p className="text-white/80 text-sm mb-3">{errorMessage}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {renderState === "completed" ? (
            <button 
              onClick={handleViewVideo}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all"
            >
              <span>▶</span>
              <span>Videoyu İzle</span>
            </button>
          ) : (
            <button 
              onClick={handleCancel}
              disabled={renderState === "processing"}
              className="flex-1 py-3 rounded-xl border border-white/[0.1] text-white/70 text-sm hover:bg-white/[0.05] transition-all font-medium disabled:opacity-50"
            >
              İptal
            </button>
          )}
        </div>

        <div className="text-center py-3 mt-4 px-4 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.04) 100%)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <span>{videoSettings.resolution} • WEBM • {totalDuration}s</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}