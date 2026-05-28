"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, Narration, Video, TTSProvider, OpenAIVoice } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import VoiceSelector from "@/components/VoiceSelector";
import type { VoiceState } from "@/components/VoiceSelector";

type RenderState = "idle" | "preparing" | "generating" | "completed" | "error" | "cancelled";

export default function VideoPreviewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  
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
  
  // Refs for cleanup
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const renderStateRef = useRef<RenderState>("idle");

  // Helper to check render state (uses ref to avoid type narrowing issues)
  const isRenderActive = () => renderStateRef.current === "generating" || renderStateRef.current === "preparing";


  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      // Reset states on unmount
      setRenderState("idle");
      setRenderProgress(0);
    };
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
      const { error: dbError } = await supabase.from("narrations").upsert({
        project_id: id,
        text: narration.text,
        voice_type: voiceType,
        audio_url: data.audioUrl,
        duration: data.duration || null,
      }, {
        onConflict: "project_id",
      });
      
      if (dbError) {
        console.error("[TTS] Database error:", dbError);
      } else {
        console.log("[TTS] Database saved successfully");
      }
      
      if (mountedRef.current) {
        console.log("[TTS] Setting state to ready");
        setNarration((prev) => prev ? { ...prev, audio_url: data.audioUrl } : null);
        setVoiceState("ready");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        console.log("[TTS] Request aborted");
        if (mountedRef.current) setVoiceState("idle");
      } else if (mountedRef.current) {
        console.error("[TTS] Voice generation error:", err);
        setVoiceState("error");
      }
    }
  }, [narration?.text, voiceType, id, project?.user_id, ttsProvider, ttsSpeed]);

  const handleVoiceRetry = useCallback(() => {
    setVoiceState("idle");
    // Trigger regenerate after state reset
    setTimeout(() => {
      handleGenerateVoice();
    }, 50);
  }, [handleGenerateVoice]);

  // Video creation with cancellation support
  const handleCreateVideo = useCallback(async () => {
    if (!mountedRef.current) return;
    if (renderStateRef.current === "generating") return;

    abortControllerRef.current = new AbortController();
    setRenderState("preparing");
    renderStateRef.current = "preparing";
    setRenderProgress(0);
    
    console.log("[Render] === Starting real video render ===");
    
    try {
      // Step 1: Create video record in database
      console.log("[Render] Creating video record in database...");
      const supabase = createClient();
      
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .insert({
          project_id: id,
          user_id: project?.user_id,
          status: "preparing",
          format: "reels",
          duration: 30,
        })
        .select()
        .single();

      if (videoError || !videoData) {
        throw new Error(videoError?.message || "Video record oluşturulamadı");
      }

      console.log("[Render] Video record created:", videoData.id);
      setVideo(videoData as Video);

      // Step 2: Call real render API
      console.log("[Render] Calling /api/render...");
      
      const renderResponse = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          compositionProps: {
            projectId: id,
            parcelName: project?.short_title || "Parsel",
            parcelArea: "0",
            parcelCenter: [38.4237, 27.1428], // Placeholder - should come from parcel
            parcelBounds: [[27.1400, 38.4200], [27.1450, 38.4250]],
            duration: 30,
            cameraModes: ["orbit360"],
            cameraFeel: "cinematic",
            startHeight: 300,
            narrationAudioUrl: narration?.audio_url || "",
            consultantName: "Danışman",
            consultantPhone: "+90 555 123 4567",
            width: 1080,
            height: 1920,
            fps: 30,
            quality: "premium",
            primaryColor: "#3b82f6",
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!mountedRef.current) return;
      
      const renderData = await renderResponse.json();
      
      console.log("[Render] API Response:", JSON.stringify(renderData, null, 2));
      
      if (!renderResponse.ok || renderData.error) {
        throw new Error(renderData.error || "Render başlatılamadı");
      }

      const renderId = renderData.renderId;
      console.log("[Render] Render job started:", renderId);
      console.log("[Render] Estimated time:", renderData.estimatedTime, "seconds");
      
      // Update render state
      setRenderState("generating");
      renderStateRef.current = "generating";

      // Step 3: Poll for render status
      console.log("[Render] Starting poll for render status...");
      
      let pollCount = 0;
      const maxPolls = 300; // 5 minutes max
      const pollInterval = setInterval(async () => {
        if (!mountedRef.current || abortControllerRef.current?.signal.aborted) {
          clearInterval(pollInterval);
          return;
        }
        
        pollCount++;
        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          setRenderState("error");
          console.error("[Render] Poll timeout exceeded");
          return;
        }
        
        try {
          const statusResponse = await fetch(`/api/render?id=${renderId}`);
          const statusData = await statusResponse.json();
          
          console.log(`[Render] Poll #${pollCount}:`, {
            status: statusData.status,
            progress: statusData.progress,
            phase: statusData.phase,
            message: statusData.message,
            frameCount: statusData.frameCount,
          });
          
          if (!mountedRef.current) {
            clearInterval(pollInterval);
            return;
          }
          
          // Update progress
          setRenderProgress(statusData.progress || 0);
          
          // Handle status
          if (statusData.status === "completed") {
            clearInterval(pollInterval);
            console.log("[Render] ✅ Render completed!");
            console.log("[Render] Output URL:", statusData.outputUrl);
            
            // Update video record in database
            await supabase
              .from("videos")
              .update({
                status: "completed",
                output_url: statusData.outputUrl,
                metadata: { renderId, ...statusData },
              })
              .eq("id", videoData.id);
            
            setRenderProgress(100);
            setRenderState("completed");
            
            // Navigate to download after short delay
            if (mountedRef.current) {
              setTimeout(() => {
                router.push(`/projects/${id}/download`);
              }, 1500);
            }
            
          } else if (statusData.status === "failed") {
            clearInterval(pollInterval);
            console.error("[Render] ❌ Render failed:", statusData.error);
            
            await supabase
              .from("videos")
              .update({
                status: "failed",
                metadata: { renderId, error: statusData.error, logs: statusData.logs },
              })
              .eq("id", videoData.id);
            
            setRenderState("error");
            
          } else if (statusData.status === "rendering" || statusData.status === "encoding" || statusData.status === "uploading") {
            // Keep rendering state
            setRenderState("generating");
            renderStateRef.current = "generating";
          }
          
        } catch (pollError) {
          console.error("[Render] Poll error:", pollError);
        }
        
      }, 1000); // Poll every second
      
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        console.log("[Render] Render cancelled by user");
        if (mountedRef.current) setRenderState("cancelled");
      } else if (mountedRef.current) {
        console.error("[Render] ❌ Error:", err);
        setRenderState("error");
      }
    }
  }, [id, project?.user_id, narration, router]);

  // Cancel render
  const handleCancelRender = () => {
    abortControllerRef.current?.abort();
    setRenderState("idle");
    setRenderProgress(0);
    // Optionally delete the video record
    if (video) {
      const supabase = createClient();
      supabase.from("videos").delete().eq("id", video.id);
      setVideo(null);
    }
  };

  // Reset to idle
  const handleResetRender = () => {
    setRenderState("idle");
    setRenderProgress(0);
    setVideo(null);
  };

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

        {/* Render Progress State */}
        {(renderState === "generating" || renderState === "preparing") && (
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
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-primary/50" />
                <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white/60">
                    {renderState === "preparing" ? "Hazırlanıyor..." : "Video oluşturuluyor..."}
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
                {["Hazırlık", "İşleme", "Bitirme"].map((step, i) => {
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

        {/* Cancelled/Resumable State - Only show if we were actively rendering */}
        {(renderState === "cancelled" || renderState === "error") && (
          <div className="mb-4 p-4 rounded-xl text-center" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/60 text-sm mb-3">
              {renderState === "cancelled" ? "Video oluşturma iptal edildi" : "Video oluşturma hatası"}
            </p>
            <button
              onClick={handleResetRender}
              className="px-4 py-2 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
            >
              ▶ Yeni Video Oluştur
            </button>
          </div>
        )}

        {/* Main Content - Only show when not rendering */}
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
                <span>{project?.short_title || "Proje"} • 30 sn • Reels 1080×1920</span>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}