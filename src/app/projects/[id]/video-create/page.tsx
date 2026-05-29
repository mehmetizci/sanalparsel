"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useParcelStore } from "@/lib/parcel-store";
import { interpolateCameraStep } from "@/lib/camera-sequence";
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
  const cameraSequence = useParcelStore((state) => state.cameraSequence);
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
    if (!mapContainerRef.current || !uploadedGeoJson || !parcelCenter) return;

    console.log("[VideoCreate] Initializing Mapbox map");

    // Set Mapbox token
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
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

    map.on("load", () => {
      if (!mountedRef.current) return;

      // Add parcel polygon
      map.addSource("parcel", {
        type: "geojson",
        data: uploadedGeoJson as GeoJSON.Feature,
      });

      map.addLayer({
        id: "parcel-fill",
        type: "fill",
        source: "parcel",
        paint: {
          "fill-color": "#3B82F6",
          "fill-opacity": 0.3,
        },
      });

      map.addLayer({
        id: "parcel-outline",
        type: "line",
        source: "parcel",
        paint: {
          "line-color": "#3B82F6",
          "line-width": 3,
        },
      });

      // Store map instance for recording
      setRecordingMap(map);

      console.log("[VideoCreate] Map loaded and ready");

      // Start recording after short delay
      preparationTimeoutRef.current = setTimeout(() => {
        startRecording(map, parcelCenter);
      }, 1000);
    });

    map.on("error", (e) => {
      console.error("[VideoCreate] Map error:", e);
      if (mountedRef.current) {
        setErrorMessage("Harita yüklenirken hata oluştu");
        setRenderState("error");
      }
    });
  }, [uploadedGeoJson, parcelCenter, setRecordingMap]);

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
  }, [checkMediaRecorderSupport, setRecordedVideoUrl]);

  // Camera animation loop - stored in ref to avoid circular deps
  const animateCameraCallbackRef = useRef<((map: mapboxgl.Map, center: { lat: number; lon: number }) => void) | null>(null);
  
  animateCameraCallbackRef.current = (map: mapboxgl.Map, center: { lat: number; lon: number }) => {
    if (!mountedRef.current) return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    setRenderElapsed(Math.min(elapsed, totalDuration));

    // Progress calculation
    const progress = Math.min(elapsed / totalDuration, 1);
    setRenderProgress(Math.round(progress * 80));

    // Get current step and interpolation
    if (cameraSequence && cameraSequence.steps.length > 0) {
      let accumulatedTime = 0;
      
      for (const step of cameraSequence.steps) {
        if (elapsed < accumulatedTime + step.duration) {
          const stepProgress = (elapsed - accumulatedTime) / step.duration;
          const camera = interpolateCameraStep(step, stepProgress, center);
          
          map.jumpTo({
            center: camera.center,
            zoom: camera.zoom,
            pitch: camera.pitch,
            bearing: camera.bearing,
          });
          break;
        }
        accumulatedTime += step.duration;
      }
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
                {renderState === "preparing" && "Harita hazırlanıyor..."}
                {renderState === "recording" && "Kayıt"}
                {renderState === "processing" && "Video işleniyor..."}
                {renderState === "completed" && "Tamamlandı!"}
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
            <span>720×1280 • WEBM • {totalDuration}s</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}