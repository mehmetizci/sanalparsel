"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createClient } from "@/lib/supabase";
import { Project, Narration, Video, TTSProvider, OpenAIVoice } from "@/types";
import { useParcelStore, CameraSequenceStep } from "@/lib/parcel-store";
import { buildCinematicStyle, CINEMATIC_EASING } from "@/lib/cinematic-renderer";
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

export default function VideoPreviewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  // Store state
  const uploadedGeoJson = useParcelStore((state) => state.uploadedGeoJson);
  const droneSettings = useParcelStore((state) => state.droneSettings);
  const cameraSequence = useParcelStore((state) => state.cameraSequence);
  const parcelCenter = useParcelStore((state) => state.parcelCenter);
  const parcelBounds = useParcelStore((state) => state.parcelBounds);

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [voiceType, setVoiceType] = useState<OpenAIVoice>("nova");
  const [loading, setLoading] = useState(true);
  const [textExpanded, setTextExpanded] = useState(false);

  // TTS settings state
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>("openai");
  const [ttsSpeed, setTtsSpeed] = useState(1.55);

  // TTS metadata from backend response (the actual used provider)
  const [ttsUsedProvider, setTtsUsedProvider] = useState<string | null>(null);
  const [ttsUsedVoice, setTtsUsedVoice] = useState<string | null>(null);
  const [showFallbackWarning, setShowFallbackWarning] = useState(false);

  // SEPRATED voiceState - completely independent from renderState
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");

  // Render state management - completely separate from voice
  const [renderState, setRenderState] = useState<RenderState>("idle");
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderElapsed, setRenderElapsed] = useState(0);

  // Video output state
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Map refs for recording
  const recordingContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);

  // Refs for cleanup
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const renderStateRef = useRef<RenderState>("idle");
  const isRecordingRef = useRef(false);

  // Helper to check render state (uses ref to avoid type narrowing issues)
  const isRenderActive = () => renderStateRef.current === "recording" || renderStateRef.current === "preparing" || renderStateRef.current === "processing";

  // Clean up video URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Cleanup on unmount
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

  // Cleanup recording resources
  const cleanupRecording = useCallback(() => {
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
  }, []);

  // Fetch data with proper cleanup
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !mountedRef.current) {
        router.push("/login");
        return;
      }

      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!projectData || cancelled) return;
      setProject(projectData as Project);

      const { data: narData } = await supabase
        .from("narrations")
        .select("*")
        .eq("project_id", id)
        .single();

      if (!cancelled && narData) {
        setNarration(narData as Narration);
        // Set voice type from narration (or project)
        setVoiceType((narData as Narration).voice_type as OpenAIVoice || "nova");
        // If there's existing audio, set voice state to ready
        if ((narData as Narration).audio_url) {
          setVoiceState("ready");
        }
      }

      // Load TTS settings from project if available
      if (projectData.tts_provider) {
        setTtsProvider(projectData.tts_provider as TTSProvider);
      }
      if (projectData.tts_voice) {
        setVoiceType(projectData.tts_voice as OpenAIVoice);
      }
      if (projectData.tts_speed) {
        setTtsSpeed(projectData.tts_speed);
      }

      const { data: videoData } = await supabase
        .from("videos")
        .select("*")
        .eq("project_id", id)
        .single();

      if (!cancelled && videoData) {
        setVideo(videoData as Video);
        // Only show preparing state if there's a COMPLETED render to resume
        // Not just any video record - this prevents stale state from showing
        if (videoData.status === "completed") {
          setRenderState("idle"); // Ready to create new video
        }
        // If actively rendering in DB, we'll start fresh (don't resume)
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  // Voice generation with cancellation support - COMPLETELY SEPARATE from render state
  const handleGenerateVoice = useCallback(async () => {
    // Safety check - ensure we have text to generate
    if (!mountedRef.current) return;
    if (!narration?.text) {
      console.warn("[TTS] No narration text available");
      setVoiceState("error");
      return;
    }
    if (!project?.user_id) {
      console.warn("[TTS] No user_id available");
      setVoiceState("error");
      return;
    }

    abortControllerRef.current = new AbortController();
    setVoiceState("generating");

    try {
      console.log("[TTS] === Starting voice generation ===");
      console.log("[TTS] Selected provider:", ttsProvider);
      console.log("[TTS] Selected voice:", voiceType);
      console.log("[TTS] Selected speed:", ttsSpeed);

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: narration.text,
          voice: voiceType,
          userId: project.user_id,
          projectId: id,
          provider: ttsProvider,
          speed: ttsSpeed,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!mountedRef.current) {
        console.log("[TTS] Component unmounted, aborting");
        return;
      }

      console.log("[TTS] Response status:", response.status);

      // Always parse response - even on error
      const data = await response.json().catch(() => null);

      console.log("[TTS] Response data:", JSON.stringify(data, null, 2));

      // Check if OpenAI failed and fallback was used
      if (data?.fallbackUsed && data?.provider !== "openai") {
        console.warn("[TTS] ⚠️ OpenAI failed, fallback was used!");
        console.warn(`[TTS] Requested: openai, Actual: ${data?.provider}`);
      }

      if (!response.ok || !data?.success || !data?.audioUrl) {
        console.error("[TTS] API error:", data);
        const errorMsg = data?.error || "Ses oluşturulamadı";
        throw new Error(errorMsg);
      }

      console.log("[TTS] ✓ Audio generation successful");
      console.log(`[TTS] Provider: ${data?.provider}, Voice: ${data?.voice}, Speed: ${data?.speed}`);
      console.log("[TTS] Audio URL:", data?.audioUrl);

      // Use the provider from backend response (not local state)
      // This ensures the UI shows exactly what was used
      if (data?.provider) {
        console.log("[TTS] Updating provider state from response:", data.provider);
        setTtsUsedProvider(data.provider);
        setTtsUsedVoice(data.voice);
      }

      // Show fallback warning if OpenAI failed
      if (data?.fallbackUsed && data?.provider !== "openai") {
        console.warn("[TTS] ⚠️ Showing fallback warning to user");
        setShowFallbackWarning(true);
      } else {
        setShowFallbackWarning(false);
      }

      console.log("[TTS] Saving to database...");
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from("narrations")
        .update({
          audio_url: data.audioUrl,
          audio_status: "ready",
          voice_type: data.voice,
          tts_provider: data.provider,
          tts_speed: data.speed,
        })
        .eq("project_id", id);

      if (dbError) {
        console.error("[TTS] DB save error:", dbError);
      }

      // Update local narration state
      if (mountedRef.current) {
        setNarration(prev => prev ? {
          ...prev,
          audio_url: data.audioUrl,
          audio_status: "ready",
        } : null);
        setVoiceState("ready");
      }

    } catch (err) {
      if ((err as Error).name === "AbortError") {
        console.log("[TTS] Generation cancelled by user");
        if (mountedRef.current) setVoiceState("idle");
      } else if (mountedRef.current) {
        console.error("[TTS] Generation error:", err);
        setVoiceState("error");
      }
    }
  }, [narration?.text, project?.user_id, id, ttsProvider, voiceType, ttsSpeed]);

  // Retry voice generation
  const handleVoiceRetry = useCallback(() => {
    setVoiceState("idle");
    setTimeout(() => handleGenerateVoice(), 100);
  }, [handleGenerateVoice]);

  // Easing function for camera animation
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Interpolate camera for a single step
  const interpolateCameraStep = useCallback((
    step: CameraSequenceStep,
    t: number,
    center: { lat: number; lon: number }
  ): { center: [number, number]; zoom: number; pitch: number; bearing: number } => {
    const ease = easeInOutCubic(t);

    // Calculate zoom based on height
    const baseZoom = 16 - Math.log2(step.startHeight / 100);
    const heightRange = step.startHeight - step.endHeight;
    const zoomOffset = (heightRange / 500) * 0.5;
    const zoom = baseZoom + zoomOffset * ease;

    // Interpolate pitch
    const pitch = step.pitch;

    // Interpolate bearing (handle circular wraparound)
    let bearingDiff = step.bearingTo - step.bearingFrom;
    if (bearingDiff > 180) bearingDiff -= 360;
    if (bearingDiff < -180) bearingDiff += 360;
    const bearing = step.bearingFrom + bearingDiff * ease;

    // Slight offset from center based on bearing
    const offsetFactor = 0.0005 * (1 - Math.abs(t - 0.5) * 2);
    const offsetLon = Math.sin(bearing * Math.PI / 180) * offsetFactor * step.startHeight / 100;
    const offsetLat = Math.cos(bearing * Math.PI / 180) * offsetFactor * step.startHeight / 100;

    return {
      center: [center.lon + offsetLon, center.lat + offsetLat] as [number, number],
      zoom: Math.min(18, Math.max(14, zoom)),
      pitch,
      bearing: (bearing + 360) % 360,
    };
  }, []);

  // Initialize recording map
  const initializeRecordingMap = useCallback(() => {
    if (!recordingContainerRef.current || !uploadedGeoJson) return null;

    const positions = uploadedGeoJson.geometry.coordinates[0] || [];
    if (!positions.length) return null;

    // Compute center from coordinates
    let lon = 0, lat = 0, count = 0;
    for (const p of positions) {
      if (Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number") {
        lon += p[0];
        lat += p[1];
        count += 1;
      }
    }
    if (!count) return null;
    const center = { lat: lat / count, lon: lon / count };

    // Compute bounds
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (const p of positions) {
      if (!Array.isArray(p) || typeof p[0] !== "number" || typeof p[1] !== "number") continue;
      if (p[0] < minLon) minLon = p[0];
      if (p[0] > maxLon) maxLon = p[0];
      if (p[1] < minLat) minLat = p[1];
      if (p[1] > maxLat) maxLat = p[1];
    }
    if (!Number.isFinite(minLon)) return null;

    console.log("[WebRecorder] Initializing map with center:", center);

    // Build cinematic style
    const style = buildCinematicStyle({
      contrast: 1.15,
      saturation: 1.2,
      fogColor: [0.78, 0.85, 0.94, 0.3],
      fogAttenuation: 0.15,
      antialias: true,
    });

    // Create map with 720x1280 container dimensions
    const map = new maplibregl.Map({
      container: recordingContainerRef.current,
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
      map.addSource("parcel", { type: "geojson", data: uploadedGeoJson });

      map.addLayer({
        id: "parcel-fill",
        type: "fill",
        source: "parcel",
        paint: { "fill-color": "#ef4444", "fill-opacity": 0.28 },
      });

      map.addLayer({
        id: "parcel-outline",
        type: "line",
        source: "parcel",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ef4444", "line-width": 3, "line-opacity": 0.95 },
      });

      // Initial fly-in animation
      const cinematicPitch = 55 + Math.random() * 10;
      map.fitBounds(
        [[minLon, minLat], [maxLon, maxLat]],
        {
          padding: 60,
          maxZoom: 18,
          pitch: cinematicPitch,
          bearing: -20,
          duration: 2000,
          easing: CINEMATIC_EASING.flyTo,
        }
      );
    });

    return map;
  }, [uploadedGeoJson]);

  // Start client-side video recording
  const startRecording = useCallback(async () => {
    if (!mountedRef.current) return;
    if (isRecordingRef.current) return;
    if (!uploadedGeoJson) {
      console.error("[VideoPreview] No GeoJSON available for recording");
      return;
    }

    console.log("[VideoPreview] Starting client-side recording");
    console.log("[VideoPreview] Drone settings:", droneSettings);
    console.log("[VideoPreview] Camera sequence:", cameraSequence);

    // Initialize map
    const map = initializeRecordingMap();
    if (!map) {
      console.error("[VideoPreview] Failed to initialize map");
      return;
    }

    // Wait for map to be ready
    const waitForMapReady = new Promise<void>((resolve) => {
      const checkReady = () => {
        if (mapRef.current?.loaded()) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });

    setRenderState("preparing");
    renderStateRef.current = "preparing";
    setRenderProgress(10);
    setRenderElapsed(0);

    await waitForMapReady;

    // Check if map is ready
    if (!mapRef.current) {
      console.error("[VideoPreview] Map not initialized");
      return;
    }

    // Clear previous chunks
    chunksRef.current = [];

    // Start recording from map canvas
    const canvas = mapRef.current.getCanvas();
    const stream = canvas.captureStream(VIDEO_FPS);

    // Determine mime type
    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm;codecs=vp8";
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
    }

    console.log("[VideoPreview] Using mime type:", mimeType);

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8000000, // 8 Mbps
    });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      console.log("[VideoPreview] Recording stopped, processing...");

      // Combine chunks
      const blob = new Blob(chunksRef.current, { type: mimeType });
      console.log("[VideoPreview] Final blob size:", blob.size);

      // Create URL for preview
      const url = URL.createObjectURL(blob);
      setVideoBlob(blob);
      setVideoUrl(url);
      setRenderState("completed");
      renderStateRef.current = "completed";
    };

    // Start recording
    recorder.start(100); // Collect data every 100ms
    isRecordingRef.current = true;

    setRenderState("recording");
    renderStateRef.current = "recording";
    setRenderProgress(15);
    setRenderElapsed(0);

    // Calculate duration from drone settings
    const duration = (droneSettings?.duration || 30) * 1000; // Convert to ms
    const startTime = performance.now();

    // Calculate parcel center for animation
    const positions = uploadedGeoJson.geometry.coordinates[0] || [];
    let lon = 0, lat = 0, count = 0;
    for (const p of positions) {
      if (Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number") {
        lon += p[0];
        lat += p[1];
        count += 1;
      }
    }
    const center = count > 0 ? { lat: lat / count, lon: lon / count } : parcelCenter;
    if (!center) {
      console.error("[VideoPreview] No center available");
      return;
    }

    // Animation loop
    const animate = (now: number) => {
      if (!isRecordingRef.current) return;

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Update UI
      setRenderElapsed(Math.floor(elapsed / 1000));
      setRenderProgress(Math.round(15 + progress * 75));

      if (progress >= 1) {
        // Stop recording
        recorderRef.current?.stop();
        isRecordingRef.current = false;
        return;
      }

      // Calculate which step we're in
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

      if (currentStep && mapRef.current) {
        const camera = interpolateCameraStep(currentStep, stepProgress, center);
        mapRef.current.jumpTo({
          center: camera.center,
          zoom: camera.zoom,
          pitch: camera.pitch,
          bearing: camera.bearing,
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation after initial fly-in (2 seconds)
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 2000);

  }, [uploadedGeoJson, droneSettings, cameraSequence, parcelCenter, initializeRecordingMap, interpolateCameraStep]);

  // Cancel render
  const handleCancelRender = useCallback(() => {
    console.log("[VideoPreview] Cancelling recording");
    cleanupRecording();
    setRenderState("cancelled");
    renderStateRef.current = "cancelled";
    setRenderProgress(0);
    setRenderElapsed(0);
  }, [cleanupRecording]);

  // Reset to idle
  const handleResetRender = useCallback(() => {
    cleanupRecording();
    setRenderState("idle");
    renderStateRef.current = "idle";
    setRenderProgress(0);
    setRenderElapsed(0);
    setVideoBlob(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
  }, [cleanupRecording, videoUrl]);

  // Download video
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

  // Handle create video button
  const handleCreateVideo = useCallback(async () => {
    if (!mountedRef.current) return;
    if (isRenderActive()) return;

    // Clean up any previous recording
    cleanupRecording();

    // Start client-side recording
    await startRecording();
  }, [mountedRef, isRenderActive, cleanupRecording, startRecording]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

  const hasAudio = !!narration?.audio_url;
  const textPreview = narration?.text || "";

  return (
    <AppShell>
      <div className="px-4 py-5 max-w-2xl mx-auto">
        <StepHeader
          step={7}
          totalSteps={10}
          title="Video Önizleme"
          description="Seslendirme ve video önizleme"
        />

        {/* Hidden recording container */}
        <div
          className="fixed opacity-0 pointer-events-none"
          style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, overflow: "hidden" }}
        >
          <div
            ref={recordingContainerRef}
            className="w-full h-full"
            style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT }}
          />
        </div>

        {/* Render/Recording Progress State */}
        {(renderState === "preparing" || renderState === "recording" || renderState === "processing") && (
          <div className="mb-4">
            <div
              className="rounded-xl p-5 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(124,58,237,0.08) 100%)",
                border: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              {/* Animated icon */}
              <div className="w-14 h-14 mx-auto mb-4 relative">
                {renderState === "recording" ? (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-red-500/50" />
                    <div className="absolute inset-4 rounded-full bg-red-500 flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-primary/50" />
                    <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  </>
                )}
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white/60">
                    {renderState === "preparing" && "Hazırlanıyor..."}
                    {renderState === "recording" && "Video oluşturuluyor..."}
                    {renderState === "processing" && "Video işleniyor..."}
                  </span>
                  <span className="text-primary font-medium">{renderProgress}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
              </div>

              {/* Render steps */}
              <div className="flex justify-center gap-6 text-xs">
                {["Hazırlık", "Kayıt", "İşleme"].map((step, i) => {
                  const stepProgress = i === 0 ? 33 : i === 1 ? 66 : 100;
                  const isActive = renderProgress >= stepProgress;
                  return (
                    <div key={step} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-primary" : "bg-white/20"}`} />
                      <span className={isActive ? "text-primary" : "text-white/40"}>{step}</span>
                    </div>
                  );
                })}
              </div>

              {/* Time display for recording */}
              {renderState === "recording" && (
                <p className="text-white/60 text-xs mt-3">
                  {renderElapsed}s / {droneSettings?.duration || 30}s
                </p>
              )}

              {/* Cancel button */}
              <button
                onClick={handleCancelRender}
                className="mt-4 px-4 py-2 text-xs text-white/50 hover:text-white/70 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {renderState === "error" && (
          <div className="mb-4 p-4 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-red-400 text-sm mb-3">Video oluşturma hatası</p>
            <button
              onClick={handleResetRender}
              className="px-4 py-2 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Cancelled State */}
        {renderState === "cancelled" && (
          <div className="mb-4 p-4 rounded-xl text-center" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/60 text-sm mb-3">
              Video oluşturma iptal edildi
            </p>
            <button
              onClick={handleResetRender}
              className="px-4 py-2 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
            >
              ▶ Yeni Video Oluştur
            </button>
          </div>
        )}

        {/* Completed State - Video Player */}
        {renderState === "completed" && videoUrl && (
          <div className="mb-4">
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "rgba(15,23,42,0.8)",
                border: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              {/* Video player */}
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full aspect-[9/16] bg-black"
                style={{ maxHeight: "400px" }}
              />

              {/* Action buttons */}
              <div className="p-4 flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  WEBM İndir
                </button>
                <button
                  onClick={handleResetRender}
                  className="flex-1 py-3 rounded-xl border border-white/[0.1] text-white/70 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/[0.05] transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Yeniden Oluştur
                </button>
              </div>

              {/* Video info */}
              <div className="px-4 pb-4 text-center">
                <p className="text-white/50 text-xs">
                  720×1280 • WEBM • {(droneSettings?.duration || 30)}s
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Only show when idle */}
        {renderState === "idle" && (
          <>
            {/* Fallback Warning */}
            {showFallbackWarning && (
              <div className="mb-4 p-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <svg className="w-5 h-5 text-warning shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-warning text-sm font-medium">OpenAI TTS başarısız oldu</p>
                  <p className="text-white/60 text-xs">Edge TTS kullanıldı. Lütfen tekrar deneyin veya API anahtarınızı kontrol edin.</p>
                </div>
              </div>
            )}

            {/* Voice Selector Card */}
            <GlassCard className="mb-4 p-4">
              <VoiceSelector
                voiceType={voiceType}
                onChange={setVoiceType}
                onGenerate={handleGenerateVoice}
                disabled={voiceState === "generating" || isRenderActive()}
                voiceState={voiceState}
                audioUrl={narration?.audio_url}
                onRetry={handleVoiceRetry}
                provider={ttsProvider}
                onProviderChange={setTtsProvider}
                speed={ttsSpeed}
                onSpeedChange={setTtsSpeed}
                usedProvider={ttsUsedProvider}
                usedVoice={ttsUsedVoice}
              />
            </GlassCard>

            {/* Collapsible Text Preview */}
            {textPreview && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-xs">Metin Önizleme</span>
                  <span className="text-white/30 text-xs">{textPreview.length} karakter</span>
                </div>
                <div className="relative rounded-xl overflow-hidden" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className={`p-4 ${!textExpanded && "line-clamp-4"}`}>
                    <p className="text-white/70 text-sm leading-relaxed">{textPreview}</p>
                  </div>
                  {textPreview.length > 200 && (
                    <button
                      onClick={() => setTextExpanded(!textExpanded)}
                      className="w-full py-2 text-center text-primary/80 text-xs hover:text-primary transition-colors border-t border-white/[0.05]"
                    >
                      {textExpanded ? "▲ Daha Az" : "▼ Devamını Gör"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => {
                  // Cleanup before navigating
                  abortControllerRef.current?.abort();
                  cleanupRecording();
                  setRenderState("idle");
                  router.push(`/projects/${id}/narration`);
                }}
                className="flex-1 py-3 rounded-xl border border-white/[0.1] text-white/70 text-sm hover:bg-white/[0.05] transition-all font-medium"
              >
                Geri
              </button>
              <button
                disabled={!hasAudio || isRenderActive()}
                onClick={handleCreateVideo}
                className={`
                  flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
                  ${hasAudio && !isRenderActive()
                    ? "bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                    : "bg-white/[0.05] text-white/30 border border-white/[0.05]"
                  }
                `}
              >
                <span>🎬</span>
                <span>Sinematik Video Oluştur</span>
              </button>
            </div>

            {/* Video Format Info */}
            <div className="text-center py-3 px-4 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.04) 100%)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{project?.short_title || "Proje"} • {droneSettings?.duration || 30} sn • WEBM 720×1280</span>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}