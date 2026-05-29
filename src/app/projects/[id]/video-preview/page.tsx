"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createClient } from "@/lib/supabase";
import { Project, Narration, ParcelGeoJson, TTSProvider, OpenAIVoice } from "@/types";
import { useParcelStore, CameraSequenceStep, ParcelMetadata } from "@/lib/parcel-store";
import { buildCinematicStyle } from "@/lib/cinematic-renderer";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import VoiceSelector from "@/components/VoiceSelector";
import type { VoiceState } from "@/components/VoiceSelector";

type RenderState = "idle" | "preparing" | "recording" | "processing" | "completed" | "error" | "cancelled";

// Video output settings
const VIDEO_WIDTH = 720;
const VIDEO_HEIGHT = 1280;
const VIDEO_FPS = 30;
const PREPARATION_TIMEOUT_MS = 10000;

// Helper to wait for style to be fully loaded
async function waitForStyleReady(map: maplibregl.Map, timeoutMs = 10000): Promise<void> {
  const start = Date.now();
  
  return new Promise<void>((resolve, reject) => {
    const check = () => {
      try {
        if (map.isStyleLoaded()) {
          console.log("[WebRecorder] style ready (isStyleLoaded)");
          resolve();
          return;
        }
      } catch (err) {
        console.warn("[WebRecorder] style check failed", err);
      }
      
      if (Date.now() - start > timeoutMs) {
        console.error("[WebRecorder] style loading timeout after", timeoutMs, "ms");
        reject(new Error("Mapbox style loading timeout"));
        return;
      }
      
      setTimeout(check, 100);
    };
    
    map.once("style.load", () => {
      console.log("[WebRecorder] style.load event fired");
      setTimeout(() => {
        if (map.isStyleLoaded()) {
          console.log("[WebRecorder] style ready after event");
          resolve();
        } else {
          console.log("[WebRecorder] style still loading after event, checking...");
          check();
        }
      }, 500);
    });
    
    // Also check immediately
    check();
  });
}

export default function VideoPreviewPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    }>
      <VideoPreviewPageInner params={params} />
    </Suspense>
  );
}

function VideoPreviewPageInner({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  // Demo mode: Check URL params for demo mode
  const searchParams = useSearchParams();
  const isDemo = searchParams?.get("demo") === "true";

  // Store state
  const uploadedGeoJson = useParcelStore((state) => state.uploadedGeoJson);
  const droneSettings = useParcelStore((state) => state.droneSettings);
  const cameraSequence = useParcelStore((state) => state.cameraSequence);

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [voiceType, setVoiceType] = useState<OpenAIVoice>("nova");
  const [loading, setLoading] = useState(true);
  const [textExpanded, setTextExpanded] = useState(false);

  // TTS settings state
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>("openai");
  const [ttsSpeed, setTtsSpeed] = useState(1.55);
  const [ttsUsedProvider, setTtsUsedProvider] = useState<string | null>(null);
  const [ttsUsedVoice, setTtsUsedVoice] = useState<string | null>(null);
  const [showFallbackWarning, setShowFallbackWarning] = useState(false);

  // SEPRATED voiceState - completely independent from renderState
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");

  // Render state management
  const [renderState, setRenderState] = useState<RenderState>("idle");
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderElapsed, setRenderElapsed] = useState(0);

  // Error message
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Video output state
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Map refs for recording
  const recordingContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const preparationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for cleanup
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const renderStateRef = useRef<RenderState>("idle");
  const isRecordingRef = useRef(false);

  const isRenderActive = () => renderStateRef.current === "recording" || renderStateRef.current === "preparing" || renderStateRef.current === "processing";

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      cleanupRecording();
      setRenderState("idle");
      setRenderProgress(0);
    };
  }, []);

  const cleanupRecording = useCallback(() => {
    isRecordingRef.current = false;
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

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Demo mode: Skip auth check if demo=true in URL
      if (isDemo) {
        console.log("[WebRecorder] Demo mode - skipping auth");
        
        // Initialize demo store data if not set
        if (!uploadedGeoJson) {
          const demoGeoJson: ParcelGeoJson = {
            type: "Feature",
            properties: {
              Il: "İzmir",
              Ilce: "Çiğli",
              Mahalle: "Harmandalı",
              Ada: "2406",
              ParselNo: "9",
              Alan: "1234",
              Nitelik: "Arsa",
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [27.1418, 38.4228],
                  [27.1438, 38.4228],
                  [27.1438, 38.4248],
                  [27.1418, 38.4248],
                  [27.1418, 38.4228],
                ],
              ],
            },
          };
          useParcelStore.getState().setFromParsed({
            geoJson: demoGeoJson,
            metadata: demoGeoJson.properties as ParcelMetadata,
          });
        }
        
        // Set demo narration with audio URL (simulated for testing)
        const demoNarration: Narration = {
          id: "demo-narration",
          project_id: id,
          text: "İzmir Çiğli ilçesinde, Harmandalı mahallesinde yer alan bu 1234 metrekarelik arsa, konut yapılaşması için ideal bir lokasyonda bulunmaktadır. Çevresinde cadde ve sokak yolları mevcut olup, altyapı hizmetlerine yakın mesafededir.",
          tone: "premium",
          voice_type: "nova",
          audio_url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
          duration: 15,
          tts_provider: "openai",
          tts_voice: "nova",
          tts_speed: 1.55,
        };
        
        setNarration(demoNarration);
        setVoiceState("ready");

        // Set minimal demo project
        setProject({
          id,
          user_id: "demo",
          title: searchParams.get("title") || "Demo Proje",
          short_title: (searchParams.get("title") || "Demo").substring(0, 20),
          geojson: null,
          properties: {
            Il: "İzmir",
            Ilce: "Çiğli",
            Mahalle: "Harmandalı",
            Ada: "2406",
            ParselNo: "9",
            Alan: "1234",
            Nitelik: "Arsa",
          },
          city: "İzmir",
          district: "Çiğli",
          neighborhood: "Harmandalı",
          block_no: "2406",
          parcel_no: "9",
          area: "1234",
          property_type: "Arsa",
          center_lat: 38.4238,
          center_lon: 27.1428,
          custom_note: null,
          status: "draft",
          created_at: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }
      
      if (!user || !mountedRef.current) { router.push("/login"); return; }

      const { data: projectData } = await supabase.from("projects").select("*").eq("id", id).eq("user_id", user.id).single();
      if (!projectData || cancelled) return;
      setProject(projectData as Project);

      const { data: narData } = await supabase.from("narrations").select("*").eq("project_id", id).single();
      if (!cancelled && narData) {
        setNarration(narData as Narration);
        setVoiceType((narData as Narration).voice_type as OpenAIVoice || "nova");
        if ((narData as Narration).audio_url) setVoiceState("ready");
      }

      if (projectData.tts_provider) setTtsProvider(projectData.tts_provider as TTSProvider);
      if (projectData.tts_voice) setVoiceType(projectData.tts_voice as OpenAIVoice);
      if (projectData.tts_speed) setTtsSpeed(projectData.tts_speed);

      if (!cancelled) setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [id, router, isDemo, searchParams]);

  const handleGenerateVoice = useCallback(async () => {
    if (!mountedRef.current) return;
    if (!narration?.text) { setVoiceState("error"); return; }
    if (!project?.user_id) { setVoiceState("error"); return; }

    abortControllerRef.current = new AbortController();
    setVoiceState("generating");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: narration.text, voice: voiceType, userId: project.user_id, projectId: id, provider: ttsProvider, speed: ttsSpeed }),
        signal: abortControllerRef.current.signal,
      });

      if (!mountedRef.current) return;
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data?.audioUrl) throw new Error(data?.error || "Ses oluşturulamadı");

      if (data?.provider) { setTtsUsedProvider(data.provider); setTtsUsedVoice(data.voice); }
      if (data?.fallbackUsed && data?.provider !== "openai") setShowFallbackWarning(true);
      else setShowFallbackWarning(false);

      const supabase = createClient();
      await supabase.from("narrations").update({ audio_url: data.audioUrl, audio_status: "ready", voice_type: data.voice, tts_provider: data.provider, tts_speed: data.speed }).eq("project_id", id);

      if (mountedRef.current) {
        setNarration(prev => prev ? { ...prev, audio_url: data.audioUrl, audio_status: "ready" } : null);
        setVoiceState("ready");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") { if (mountedRef.current) setVoiceState("idle"); }
      else if (mountedRef.current) { setVoiceState("error"); }
    }
  }, [narration?.text, project?.user_id, id, ttsProvider, voiceType, ttsSpeed]);

  const handleVoiceRetry = useCallback(() => { setVoiceState("idle"); setTimeout(() => handleGenerateVoice(), 100); }, [handleGenerateVoice]);

  const easeInOutCubic = (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const interpolateCameraStep = useCallback((step: CameraSequenceStep, t: number, center: { lat: number; lon: number }) => {
    const ease = easeInOutCubic(t);
    const heightRange = step.startHeight - step.endHeight;
    const baseZoom = 16 - Math.log2(step.startHeight / 100);
    const zoomOffset = heightRange / 500 * 0.5;
    const zoom = baseZoom + zoomOffset * ease;
    const pitch = step.pitch;
    let bearingDiff = step.bearingTo - step.bearingFrom;
    if (bearingDiff > 180) bearingDiff -= 360;
    if (bearingDiff < -180) bearingDiff += 360;
    const bearing = step.bearingFrom + bearingDiff * ease;
    const offsetFactor = 0.0005 * (1 - Math.abs(t - 0.5) * 2);
    const offsetLon = Math.sin(bearing * Math.PI / 180) * offsetFactor * step.startHeight / 100;
    const offsetLat = Math.cos(bearing * Math.PI / 180) * offsetFactor * step.startHeight / 100;
    return { center: [center.lon + offsetLon, center.lat + offsetLat] as [number, number], zoom: Math.min(18, Math.max(14, zoom)), pitch, bearing: (bearing + 360) % 360 };
  }, []);

  // Define checkMediaRecorderSupport first since it's needed by other functions
  const checkMediaRecorderSupport = useCallback((): { supported: boolean; mimeType: string; error?: string } => {
    console.log("[WebRecorder] Checking MediaRecorder support...");
    if (typeof MediaRecorder === "undefined") { console.log("[WebRecorder] MediaRecorder not supported"); return { supported: false, mimeType: "", error: "Tarayıcınız video kaydını desteklemiyor. Chrome veya Edge ile deneyin." }; }
    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) { mimeType = "video/webm;codecs=vp8"; if (!MediaRecorder.isTypeSupported(mimeType)) { mimeType = "video/webm"; if (!MediaRecorder.isTypeSupported(mimeType)) { console.log("[WebRecorder] MediaRecorder not supported"); return { supported: false, mimeType: "", error: "Tarayıcınız video kaydını desteklemiyor. Chrome veya Edge ile deneyin." }; } } }
    console.log("[WebRecorder] MediaRecorder supported - mime type:", mimeType);
    return { supported: true, mimeType };
  }, []);

  const startRecordingAfterMapReady = useCallback(async (map: maplibregl.Map, center: { lat: number; lon: number }) => {
    setRenderProgress(10);

    console.log("[WebRecorder] Starting recording setup after map ready");
    
    preparationTimeoutRef.current = setTimeout(() => {
      if (renderStateRef.current === "preparing") { console.log("[WebRecorder] Preparation timeout reached"); setErrorMessage("Harita hazırlanması çok uzun sürüyor. Lütfen tekrar deneyin."); setRenderState("error"); }
    }, PREPARATION_TIMEOUT_MS);

    if (!mapRef.current) { console.log("[WebRecorder] Map not ready"); setErrorMessage("Harita hazırlanması tamamlanamadı. Lütfen tekrar deneyin."); setRenderState("error"); return; }

    const canvas = mapRef.current.getCanvas();
    console.log("[WebRecorder] canvas found, size:", canvas?.width + "x" + canvas?.height);
    if (!canvas) { setErrorMessage("Canvas alınamadı. Lütfen tarayıcınızı yenileyin."); setRenderState("error"); return; }

    if (typeof canvas.captureStream !== "function") { console.log("[WebRecorder] captureStream not supported"); setErrorMessage("Tarayıcınız video kaydını desteklemiyor. Chrome veya Edge ile deneyin."); setRenderState("error"); return; }
    console.log("[WebRecorder] captureStream supported");

    const stream = canvas.captureStream(VIDEO_FPS);
    console.log("[WebRecorder] stream created from canvas");
    const mimeType = checkMediaRecorderSupport().mimeType;
    console.log("[WebRecorder] Using mime type:", mimeType);

    try {
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = () => {
        console.log("[WebRecorder] recorder stopped");
        console.log("[WebRecorder] chunks collected:", chunksRef.current.length);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log("[WebRecorder] blob size:", blob.size);
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setVideoUrl(url);
        setRenderState("completed");
        renderStateRef.current = "completed";
      };

      recorder.onerror = (e) => { console.error("[WebRecorder] Recorder error:", e); setErrorMessage("Video kaydı sırasında bir hata oluştu. Lütfen tekrar deneyin."); setRenderState("error"); };

      recorder.start(100);
      console.log("[WebRecorder] recorder started", { 
        fps: VIDEO_FPS,
        dimensions: `${VIDEO_WIDTH}x${VIDEO_HEIGHT}`,
        duration: (droneSettings?.duration || 30) * 1000,
        quality: "8Mbps"
      });

      isRecordingRef.current = true;
      setRenderState("recording");
      renderStateRef.current = "recording";
      setRenderProgress(15);
      setRenderElapsed(0);

      const duration = (droneSettings?.duration || 30) * 1000;
      const startTime = performance.now();

      console.log("[WebRecorder] drone settings loaded", {
        duration: droneSettings?.duration || 30,
        cameraMode: droneSettings?.cameraModes?.[0] || "orbit",
        startHeight: droneSettings?.startHeight || 100,
        steps: cameraSequence?.steps?.length || 0
      });

      const geoJson = useParcelStore.getState().uploadedGeoJson;
      if (!geoJson) { console.error("[WebRecorder] No GeoJSON for animation"); setErrorMessage("Parsel geometrisi bulunamadı."); setRenderState("error"); return; }
      
      const recordingCenter = center;

      const animate = (now: number) => {
        if (!isRecordingRef.current) return;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setRenderElapsed(Math.floor(elapsed / 1000));
        setRenderProgress(Math.round(15 + progress * 75));

        if (progress >= 1) { recorderRef.current?.stop(); isRecordingRef.current = false; return; }

        const steps = cameraSequence?.steps || [];
        let accumulatedTime = 0;
        let currentStep: CameraSequenceStep | null = null;
        let stepProgress = 0;

        for (let i = 0; i < steps.length; i++) {
          if (elapsed * 1000 < accumulatedTime + steps[i].duration * 1000) { currentStep = steps[i]; stepProgress = (elapsed * 1000 - accumulatedTime) / (steps[i].duration * 1000); break; }
          accumulatedTime += steps[i].duration * 1000;
        }

        if (currentStep && mapRef.current) {
          const camera = interpolateCameraStep(currentStep, stepProgress, recordingCenter);
          mapRef.current.jumpTo({ center: camera.center, zoom: camera.zoom, pitch: camera.pitch, bearing: camera.bearing });
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      setTimeout(() => { animationRef.current = requestAnimationFrame(animate); }, 2000);

    } catch (err) {
      console.error("[WebRecorder] Recording initialization error:", err, "Error name:", (err as Error)?.name, "Error message:", (err as Error)?.message);
      setErrorMessage("Video kaydı başlatılamadı. Lütfen tekrar deneyin.");
      setRenderState("error");
    }

  }, [droneSettings, cameraSequence, interpolateCameraStep, checkMediaRecorderSupport]);

  const initializeRecordingMap = useCallback(() => {
    // Read directly from store to get the latest value
    const uploadedGeoJson = useParcelStore.getState().uploadedGeoJson;
    
    console.log("[VIDEO]", {
      projectId: "current-project",
      uploadedGeoJson,
      geojsonExists: !!uploadedGeoJson,
      type: uploadedGeoJson?.type,
      hasGeometry: !!uploadedGeoJson?.geometry,
      geometryType: uploadedGeoJson?.geometry?.type,
      coordinatesCount: uploadedGeoJson?.geometry?.coordinates?.[0]?.length
    });
    
    console.log("[WebRecorder] start");
    console.log("[WebRecorder] creating capture container");
    
    // Validation checks
    if (!uploadedGeoJson) {
      console.error("[VIDEO RECORD ERROR] uploadedGeoJson is null/undefined - GeoJSON not in Zustand store");
      setErrorMessage("Parsel geometrisi bulunamadı. Lütfen önce parsel seçin veya sayfayı yenileyin."); 
      setRenderState("error"); 
      return; 
    }
    
    if (!uploadedGeoJson.geometry) {
      console.error("[VIDEO RECORD ERROR] uploadedGeoJson.geometry is missing");
      setErrorMessage("Parsel geometrisi geçersiz veya boş."); 
      setRenderState("error"); 
      return; 
    }
    
    if (!recordingContainerRef.current) { 
      console.error("[WebRecorder] CATASTROPHIC: Container ref not attached!");
      setErrorMessage("Harita container bulunamadı."); 
      setRenderState("error"); 
      return; 
    }
    
    // Use geometry directly (not .features)
    const geometry = uploadedGeoJson.geometry;
    const positions = geometry.coordinates?.[0] || [];
    if (!positions.length) { 
      console.error("[WebRecorder] FAIL: No positions in geometry"); 
      setErrorMessage("Parsel geometrisi geçersiz."); 
      setRenderState("error"); 
      return; 
    }
    
    let lon = 0, lat = 0, count = 0;
    for (const p of positions) { if (Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number") { lon += p[0]; lat += p[1]; count += 1; } }
    if (!count) { console.error("[WebRecorder] FAIL: No valid coordinates"); setErrorMessage("Parsel koordinatları geçersiz."); setRenderState("error"); return; }
    
    const center = { lat: lat / count, lon: lon / count };
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (const p of positions) { if (!Array.isArray(p) || typeof p[0] !== "number" || typeof p[1] !== "number") continue; if (p[0] < minLon) minLon = p[0]; if (p[0] > maxLon) maxLon = p[0]; if (p[1] < minLat) minLat = p[1]; if (p[1] > maxLat) maxLat = p[1]; }
    if (!Number.isFinite(minLon)) { console.error("[WebRecorder] FAIL: Invalid bounds"); setErrorMessage("Parsel sınırları geçersiz."); setRenderState("error"); return; }
    
    console.log("[WebRecorder] creating map instance");
    console.log("[WebRecorder] Container size:", recordingContainerRef.current.offsetWidth + "x" + recordingContainerRef.current.offsetHeight);
    
    let style;
    try {
      style = buildCinematicStyle({ contrast: 1.15, saturation: 1.2, fogColor: [0.78, 0.85, 0.94, 0.3], fogAttenuation: 0.15, antialias: true });
    } catch (e) {
      console.error("[WebRecorder] FAIL: Style build failed:", e);
      setErrorMessage("Harita stili oluşturulamadı."); 
      setRenderState("error"); 
      return;
    }

    let map: maplibregl.Map | null = null;
    let mapLoadTimeout: ReturnType<typeof setTimeout> | null = null;
    let mapLoadResolved = false;
    
    try {
      map = new maplibregl.Map({
        container: recordingContainerRef.current,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style: style as any,
        center: [center.lon, center.lat],
        zoom: 15, pitch: 60, bearing: -20, maxZoom: 22, antialias: true, renderWorldCopies: false, preserveDrawingBuffer: true, attributionControl: false,
      });
    } catch (e) {
      const errorMsg = (e as Error)?.message || "";
      console.error("[WebRecorder] FAIL: Map creation failed:", errorMsg);
      
      if (errorMsg.includes("WebGL") || errorMsg.includes("webgl")) {
        setErrorMessage("Tarayıcınızda WebGL desteklenmiyor. Lütfen Chrome, Firefox veya Edge kullanın."); 
      } else {
        setErrorMessage("Harita oluşturulamadı. Lütfen tekrar deneyin."); 
      }
      setRenderState("error"); 
      return;
    }

    mapRef.current = map;
    const recordingCenter = center;
    
    // 10 second overall timeout for preparation
    const preparationTimeout = setTimeout(() => {
      if (!mapLoadResolved && mapRef.current) {
        console.error("[WebRecorder] PREPARATION TIMEOUT: Map didn't load in 10 seconds");
        mapLoadResolved = true;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        setErrorMessage("Video haritası hazırlanamadı. Lütfen tekrar deneyin."); 
        setRenderState("error");
      }
    }, 10000);

    // Helper to resolve map load
    const resolveMapLoad = async () => {
      if (mapLoadResolved || !mapRef.current) return;
      mapLoadResolved = true;
      if (preparationTimeout) clearTimeout(preparationTimeout);
      
      console.log("[WebRecorder] map load event");
      
      // Wait for style to be fully ready using robust helper
      try {
        await waitForStyleReady(mapRef.current, 15000);
      } catch (err) {
        console.error("[WebRecorder] Style never became ready:", err);
        setErrorMessage("Harita stili yüklenemedi. Lütfen tekrar deneyin."); 
        setRenderState("error"); 
        return;
      }
      
      // Add GeoJSON source
      const geoJsonForLayer = useParcelStore.getState().uploadedGeoJson;
      console.log("[LAYER DATA]", {
        geoJson: geoJsonForLayer,
        type: geoJsonForLayer?.type,
        geometry: geoJsonForLayer?.geometry,
        coordinates: geoJsonForLayer?.geometry?.coordinates
      });
      
      if (!geoJsonForLayer) { 
        console.error("[WebRecorder] FAIL: GeoJSON not found in store at load time"); 
        setErrorMessage("Parsel geometrisi bulunamadı."); 
        setRenderState("error"); 
        return; 
      }
      
      try {
        // Remove any existing layers/sources first (duplicate protection)
        if (mapRef.current.getLayer("parcel-fill")) { mapRef.current.removeLayer("parcel-fill"); console.log("[WebRecorder] removed existing parcel-fill layer"); }
        if (mapRef.current.getLayer("parcel-outline")) { mapRef.current.removeLayer("parcel-outline"); console.log("[WebRecorder] removed existing parcel-outline layer"); }
        if (mapRef.current.getSource("parcel-source")) { mapRef.current.removeSource("parcel-source"); console.log("[WebRecorder] removed existing parcel-source source"); }
        
        console.log("[WebRecorder] adding source...");
        console.log("[WebRecorder] GeoJSON preview:", JSON.stringify(geoJsonForLayer).substring(0, 200));
        mapRef.current.addSource("parcel-source", { type: "geojson", data: geoJsonForLayer });
        console.log("[WebRecorder] source added");
        
        console.log("[WebRecorder] adding parcel-fill layer...");
        mapRef.current.addLayer({ id: "parcel-fill", type: "fill", source: "parcel-source", paint: { "fill-color": "#ef4444", "fill-opacity": 0.28 } });
        console.log("[WebRecorder] parcel-fill layer added");
        
        console.log("[WebRecorder] adding parcel-outline layer...");
        mapRef.current.addLayer({ id: "parcel-outline", type: "line", source: "parcel-source", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#ef4444", "line-width": 3, "line-opacity": 0.95 } });
        console.log("[WebRecorder] parcel-outline layer added");
        
        // Fit bounds to parcel
        console.log("[WebRecorder] fitting bounds...");
        const cinematicPitch = 55 + Math.random() * 10;
        mapRef.current.fitBounds([[minLon, minLat], [maxLon, maxLat]], {
          padding: 60,
          maxZoom: 18,
          pitch: cinematicPitch,
          bearing: -20,
          duration: 2000,
        });
        console.log("[WebRecorder] bounds fitted");
        
        // Proceed to recording setup after fitBounds animation
        setTimeout(() => {
          console.log("[WebRecorder] starting recording...");
          startRecordingAfterMapReady(mapRef.current!, recordingCenter);
        }, 2200);
      } catch (e) {
        const err = e as Error;
        console.error("[VIDEO RECORD ERROR]", err?.message || err);
        setErrorMessage(err?.message || "Harita katmanları oluşturulamadı."); 
        setRenderState("error"); 
        return;
      }
    };

    // Set up map load handler - use setTimeout fallback
    mapLoadTimeout = setTimeout(() => {
      if (!mapLoadResolved && mapRef.current) {
        console.log("[WebRecorder] Map load timeout fallback - assuming map is ready");
        resolveMapLoad();
      }
    }, 2000);
    
    if (map.loaded()) {
      console.log("[WebRecorder] Map already loaded immediately");
      if (mapLoadTimeout) clearTimeout(mapLoadTimeout);
      resolveMapLoad();
    } else {
      map.once("load", () => {
        console.log("[WebRecorder] Map 'load' event fired");
        if (mapLoadTimeout) clearTimeout(mapLoadTimeout);
        resolveMapLoad();
      });
    }

    map.on("error", (e) => console.error("[WebRecorder] Map error event:", e));
  }, [startRecordingAfterMapReady]);

  const startRecording = useCallback(async () => {
    if (!mountedRef.current) return;
    if (isRecordingRef.current) return;

    console.log("[WebRecorder] start clicked");

    // Read directly from store to get latest value (important for demo mode)
    const geoJson = useParcelStore.getState().uploadedGeoJson;
    if (!geoJson) { console.error("[WebRecorder] No GeoJSON available"); setErrorMessage("Parsel geometrisi bulunamadı. Lütfen sayfayı yenileyin veya parsel seçimini kontrol edin."); setRenderState("error"); return; }

    const mediaSupport = checkMediaRecorderSupport();
    if (!mediaSupport.supported) { setErrorMessage(mediaSupport.error || "Tarayıcınız video kaydını desteklemiyor."); setRenderState("error"); return; }

    setRenderState("preparing");
    renderStateRef.current = "preparing";
    setRenderProgress(5);
    setRenderElapsed(0);
    setErrorMessage(null);

    // Defer map initialization to after React renders
    // This is necessary because the container ref won't be attached until after the render
    console.log("[WebRecorder] Scheduling map initialization after render...");
    
    // Use setTimeout(0) to defer to next tick after React renders
    setTimeout(() => {
      console.log("[WebRecorder] Deferred callback - initializing map");
      initializeRecordingMap();
    }, 0);
  }, [initializeRecordingMap]);

  const handleCancelRender = useCallback(() => {
    console.log("[WebRecorder] Cancelling recording");
    cleanupRecording();
    setRenderState("cancelled");
    renderStateRef.current = "cancelled";
    setRenderProgress(0);
    setRenderElapsed(0);
    setErrorMessage(null);
  }, [cleanupRecording]);

  const handleResetRender = useCallback(() => {
    cleanupRecording();
    setRenderState("idle");
    renderStateRef.current = "idle";
    setRenderProgress(0);
    setRenderElapsed(0);
    setVideoBlob(null);
    setErrorMessage(null);
    if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(null); }
  }, [cleanupRecording, videoUrl]);

  const handleDownload = useCallback(() => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sanalparsel-${id}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [videoBlob, id]);

  const handleCreateVideo = useCallback(async () => {
    if (!mountedRef.current) return;
    if (isRenderActive()) return;
    cleanupRecording();
    await startRecording();
  }, [mountedRef, isRenderActive, cleanupRecording, startRecording]);

  if (loading) {
    return <AppShell><div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div></AppShell>;
  }

  const hasAudio = !!narration?.audio_url;
  const textPreview = narration?.text || "";

  // Show capture-only view during recording process
  if (renderState === "preparing" || renderState === "recording" || renderState === "processing") {
    return (
      <AppShell>
        <div className="px-4 py-5 max-w-2xl mx-auto">
          <StepHeader step={8} totalSteps={10} title="Video Oluşturuluyor" description="Drone görüntüleri ve seslendirme" />
          
          {/* Full capture preview */}
          <div className="mb-6">
            <div className="text-sm text-white/60 mb-2">Önizleme</div>
            <div 
              className="rounded-lg overflow-hidden border border-white/20 bg-black/50 mx-auto"
              style={{ width: 180, height: 320 }}
            >
              <div 
                ref={recordingContainerRef} 
                style={{ width: "100%", height: "100%" }} 
              />
            </div>
          </div>

          {/* Progress UI */}
          <div className="mb-4">
            <div className="rounded-xl p-5 text-center" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(124,58,237,0.08) 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-14 h-14 mx-auto mb-4 relative">
                {renderState === "recording" ? (
                  <><div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" /><div className="absolute inset-2 rounded-full border-2 border-red-500/50" /><div className="absolute inset-4 rounded-full bg-red-500 flex items-center justify-center"><div className="w-3 h-3 bg-white rounded-full" /></div></>
                ) : (
                  <><div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" /><div className="absolute inset-2 rounded-full border-2 border-primary/50" /><div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center"><svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div></>
                )}
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white/60">{renderState === "preparing" && "Hazırlanıyor..."}{renderState === "recording" && "Video oluşturuluyor..."}{renderState === "processing" && "Video işleniyor..."}</span>
                  <span className="text-primary font-medium">{renderProgress}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.1] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500" style={{ width: `${renderProgress}%` }} /></div>
              </div>
              <div className="flex justify-center gap-6 text-xs">
                {["Hazırlık", "Kayıt", "İşleme"].map((step, i) => {
                  const stepProgress = i === 0 ? 33 : i === 1 ? 66 : 100;
                  const isActive = renderProgress >= stepProgress;
                  return <div key={step} className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-primary" : "bg-white/20"}`} /><span className={isActive ? "text-primary" : "text-white/40"}>{step}</span></div>;
                })}
              </div>
              {renderState === "recording" && <p className="text-white/60 text-xs mt-3">{renderElapsed}s / {droneSettings?.duration || 30}s</p>}
              <button onClick={handleCancelRender} className="mt-4 px-4 py-2 text-xs text-white/50 hover:text-white/70 transition-colors">İptal</button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-5 max-w-2xl mx-auto">
        <StepHeader step={7} totalSteps={10} title="Video Önizleme" description="Seslendirme ve video önizleme" />

        {/* Error State */}
        {renderState === "error" && (
          <div className="mb-4 p-4 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-red-400 text-sm mb-2">⚠️ Hata</p>
            <p className="text-white/80 text-sm mb-3">{errorMessage || "Video oluşturma sırasında bir hata oluştu."}</p>
            <button onClick={() => { setRenderState("idle"); setErrorMessage(null); }} className="px-4 py-2 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">Tekrar Dene</button>
          </div>
        )}

        {/* Cancelled State */}
        {renderState === "cancelled" && (
          <div className="mb-4 p-4 rounded-xl text-center" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/60 text-sm mb-3">Video oluşturma iptal edildi</p>
            <button onClick={handleResetRender} className="px-4 py-2 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors">▶ Yeni Video Oluştur</button>
          </div>
        )}

        {/* Completed State - Video Player */}
        {renderState === "completed" && videoUrl && (
          <div className="mb-4">
            <div className="rounded-xl overflow-hidden" style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <video src={videoUrl} controls autoPlay className="w-full aspect-[9/16] bg-black" style={{ maxHeight: "400px" }} />
              <div className="p-4 flex gap-3">
                <button onClick={handleDownload} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  WEBM İndir
                </button>
                <button onClick={handleResetRender} className="flex-1 py-3 rounded-xl border border-white/[0.1] text-white/70 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/[0.05] transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Yeniden Oluştur
                </button>
              </div>
              <div className="px-4 pb-4 text-center"><p className="text-white/50 text-xs">720×1280 • WEBM • {(droneSettings?.duration || 30)}s</p></div>
            </div>
          </div>
        )}

        {/* Main Content - Only show when idle */}
        {renderState === "idle" && (
          <>
            {showFallbackWarning && (
              <div className="mb-4 p-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <svg className="w-5 h-5 text-warning shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div><p className="text-warning text-sm font-medium">OpenAI TTS başarısız oldu</p><p className="text-white/60 text-xs">Edge TTS kullanıldı. Lütfen tekrar deneyin veya API anahtarınızı kontrol edin.</p></div>
              </div>
            )}

            <GlassCard className="mb-4 p-4">
              <VoiceSelector voiceType={voiceType} onChange={setVoiceType} onGenerate={handleGenerateVoice} disabled={voiceState === "generating" || isRenderActive()} voiceState={voiceState} audioUrl={narration?.audio_url} onRetry={handleVoiceRetry} provider={ttsProvider} onProviderChange={setTtsProvider} speed={ttsSpeed} onSpeedChange={setTtsSpeed} usedProvider={ttsUsedProvider} usedVoice={ttsUsedVoice} />
            </GlassCard>

            {textPreview && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2"><span className="text-white/50 text-xs">Metin Önizleme</span><span className="text-white/30 text-xs">{textPreview.length} karakter</span></div>
                <div className="relative rounded-xl overflow-hidden" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className={`p-4 ${!textExpanded && "line-clamp-4"}`}><p className="text-white/70 text-sm leading-relaxed">{textPreview}</p></div>
                  {textPreview.length > 200 && <button onClick={() => setTextExpanded(!textExpanded)} className="w-full py-2 text-center text-primary/80 text-xs hover:text-primary transition-colors border-t border-white/[0.05]">{textExpanded ? "▲ Daha Az" : "▼ Devamını Gör"}</button>}
                </div>
              </div>
            )}

            <div className="flex gap-3 mb-4">
              <button onClick={() => { abortControllerRef.current?.abort(); cleanupRecording(); setRenderState("idle"); router.push(`/projects/${id}/preview${isDemo ? '?demo=true' : ''}`); }} className="flex-1 py-3 rounded-xl border border-white/[0.1] text-white/70 text-sm hover:bg-white/[0.05] transition-all font-medium">Geri</button>
              <button disabled={!hasAudio || isRenderActive()} onClick={handleCreateVideo} className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${hasAudio && !isRenderActive() ? "bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30" : "bg-white/[0.05] text-white/30 border border-white/[0.05]"}`}>
                <span>🎬</span><span>Sinematik Video Oluştur</span>
              </button>
            </div>

            <div className="text-center py-3 px-4 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.04) 100%)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                <span>{project?.short_title || "Proje"} • {droneSettings?.duration || 30} sn • WEBM 720×1280</span>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}