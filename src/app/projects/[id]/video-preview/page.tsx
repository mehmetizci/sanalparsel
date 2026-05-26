"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, Narration, Video, VoiceType } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import VoiceSelector from "@/components/VoiceSelector";

type RenderState = "idle" | "preparing" | "generating" | "completed" | "error" | "cancelled";

export default function VideoPreviewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  
  // State
  const [project, setProject] = useState<Project | null>(null);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [voiceType, setVoiceType] = useState<VoiceType>("female");
  const [loading, setLoading] = useState(true);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  
  // Render state management
  const [renderState, setRenderState] = useState<RenderState>("idle");
  const [renderProgress, setRenderProgress] = useState(0);
  
  // Refs for cleanup
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        setVoiceType((narData as Narration).voice_type || "female");
      }

      const { data: videoData } = await supabase
        .from("videos")
        .select("*")
        .eq("project_id", id)
        .single();

      if (!cancelled && videoData) {
        setVideo(videoData as Video);
        // If there's an active render, show appropriate state
        if (videoData.status === "preparing" || videoData.status === "rendering") {
          setRenderState("preparing");
        }
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

  // Voice generation with cancellation support
  const handleGenerateVoice = async () => {
    if (!narration?.text || !mountedRef.current) return;

    abortControllerRef.current = new AbortController();
    setGeneratingVoice(true);
    
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: narration.text,
          voice_type: voiceType,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!mountedRef.current) return;
      
      const data = await response.json();
      if (data.audio_url) {
        const supabase = createClient();
        await supabase.from("narrations").upsert({
          project_id: id,
          text: narration.text,
          voice_type: voiceType,
          audio_url: data.audio_url,
        }, {
          onConflict: "project_id",
        });
        
        if (mountedRef.current) {
          setNarration((prev) => prev ? { ...prev, audio_url: data.audio_url } : null);
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        // Cancelled - do nothing
      } else if (mountedRef.current) {
        console.error("Voice generation error:", error);
      }
    } finally {
      if (mountedRef.current) {
        setGeneratingVoice(false);
      }
    }
  };

  // Video creation with cancellation support
  const handleCreateVideo = useCallback(async () => {
    if (!mountedRef.current || renderState === "generating") return;

    abortControllerRef.current = new AbortController();
    setRenderState("generating");
    setRenderProgress(0);
    
    try {
      const supabase = createClient();
      
      // Check for existing video first
      const { data: existingVideo } = await supabase
        .from("videos")
        .select("*")
        .eq("project_id", id)
        .single();

      let videoData;
      
      if (existingVideo && existingVideo.status !== "completed") {
        // Resume existing render
        videoData = existingVideo;
      } else {
        // Create new video
        const { data } = await supabase
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
        videoData = data;
      }

      if (videoData && mountedRef.current) {
        setVideo(videoData as Video);
        
        // Simulate render progress with cleanup support
        const progressSteps = [
          { progress: 10, state: "preparing" as RenderState, delay: 500 },
          { progress: 30, state: "generating" as RenderState, delay: 1000 },
          { progress: 60, state: "generating" as RenderState, delay: 1500 },
          { progress: 85, state: "generating" as RenderState, delay: 2000 },
          { progress: 100, state: "completed" as RenderState, delay: 2500 },
        ];

        for (const step of progressSteps) {
          if (!mountedRef.current || abortControllerRef.current?.signal.aborted) {
            setRenderState("cancelled");
            return;
          }
          await new Promise(resolve => setTimeout(resolve, step.delay));
          if (mountedRef.current) {
            setRenderProgress(step.progress);
            setRenderState(step.state);
          }
        }

        // Navigate to download if completed
        if (mountedRef.current && renderState === "completed") {
          router.push(`/projects/${id}/download`);
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        if (mountedRef.current) setRenderState("cancelled");
      } else if (mountedRef.current) {
        console.error("Video creation error:", error);
        setRenderState("error");
      }
    }
  }, [id, project?.user_id, router, renderState]);

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

        {/* Cancelled/Resumable State */}
        {(renderState === "cancelled" || (renderState === "idle" && video)) && (
          <div className="mb-4 p-4 rounded-xl text-center" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/60 text-sm mb-3">Video oluşturma {renderState === "cancelled" ? "iptal edildi" : "yarıda kaldı"}</p>
            <button
              onClick={handleCreateVideo}
              className="px-4 py-2 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
            >
              ▶ Kaldığı Yerden Devam Et
            </button>
          </div>
        )}

        {/* Main Content - Only show when not rendering */}
        {renderState === "idle" && (
          <>
            {/* Voice Selector Card */}
            <GlassCard className="mb-4 p-4">
              <VoiceSelector
                voiceType={voiceType}
                onChange={setVoiceType}
                onGenerate={handleGenerateVoice}
                disabled={generatingVoice}
                isGenerating={generatingVoice}
                audioUrl={narration?.audio_url}
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
                disabled={!hasAudio || renderState === "generating"}
                onClick={handleCreateVideo}
                className={`
                  flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
                  ${hasAudio && renderState !== "generating"
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