"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, Narration, Video } from "@/types";
import { useParcelStore } from "@/lib/parcel-store";
import {
  ProjectConfig,
  loadProjectConfig,
  createDefaultProjectConfig,
} from "@/lib/project-config";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import VoiceSelector from "@/components/VoiceSelector";
import LoadingRenderState from "@/components/LoadingRenderState";
import PrimaryButton from "@/components/PrimaryButton";
import ErrorBoundary from "@/components/ErrorBoundary";

interface ValidationError {
  field: string;
  message: string;
}

export default function VideoPreviewPage({ params }: { params: { id: string } }) {
  const { id: projectId } = params;
  const router = useRouter();
  
  // Voice settings from parcel store - with safe defaults
  const voiceSettings = useParcelStore((state) => state.voiceSettings) || {
    selectedVoice: "male",
    provider: "edge-tts" as const,
    edgeVoice: "tr-TR-AhmetNeural",
    rate: "0%",
    pitch: "0Hz",
    generatedAudioUrl: null,
    generatedAudioBlob: null,
    audioDuration: 0,
  };
  const cachedAudioUrl = useParcelStore((state) => state.cachedAudioUrl) || null;
  
  // Project config state - with safe default
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [projectConfigLoaded, setProjectConfigLoaded] = useState(false);
  
  const [project, setProject] = useState<Project | null>(null);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [localNarrationText, setLocalNarrationText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [creatingVideo, setCreatingVideo] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Load project config from localStorage
  useEffect(() => {
    const loadConfig = () => {
      try {
        const stored = loadProjectConfig(projectId);
        if (stored) {
          setProjectConfig(stored);
        } else {
          // Create default config if none exists
          const newConfig = createDefaultProjectConfig(projectId);
          setProjectConfig(newConfig);
        }
      } catch (error) {
        console.error("Failed to load project config:", error);
        // Still create a default config to prevent crashes
        const newConfig = createDefaultProjectConfig(projectId);
        setProjectConfig(newConfig);
      }
      setProjectConfigLoaded(true);
    };
    loadConfig();
  }, [projectId]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (!projectData) {
        router.push("/dashboard");
        return;
      }

      setProject(projectData as Project);

      const { data: narData } = await supabase
        .from("narrations")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (narData) {
        setNarration(narData as Narration);
        setLocalNarrationText((narData as Narration).text || "");
      }

      const { data: videoData } = await supabase
        .from("videos")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (videoData) {
        setVideo(videoData as Video);
      }

      setLoading(false);
    };

    fetchData();
  }, [projectId, router]);

  const handleGenerateVoiceStart = useCallback(() => {
    setGeneratingVoice(true);
    setErrorMessage(null);
  }, []);

  const handleGenerateVoiceComplete = useCallback(() => {
    setGeneratingVoice(false);
  }, []);

  const handleGenerateVoiceError = useCallback((error: string, debug?: string) => {
    setGeneratingVoice(false);
    setErrorMessage(error);
    if (debug) {
      setDebugInfo(debug);
    }
  }, []);

  const handleCreateVideo = async () => {
    setCreatingVideo(true);
    setValidationErrors([]);

    // Validate all requirements
    const errors: ValidationError[] = [];

    // Check AI narration text
    if (!localNarrationText && !narration?.text) {
      errors.push({
        field: "aiNarration",
        message: "AI tanıtım metni oluşturulmamış. Lütfen önce metin oluşturun.",
      });
    }

    // Check voice audio
    if (!voiceSettings.generatedAudioBlob && !cachedAudioUrl) {
      errors.push({
        field: "voiceAudio",
        message: "Seslendirme oluşturulmamış. Lütfen önce sesi oluşturun.",
      });
    }

    // Check drone settings (basic check)
    if (!voiceSettings.selectedVoice) {
      errors.push({
        field: "voiceType",
        message: "Ses tipi seçilmemiş.",
      });
    }

    // If there are errors, show them and don't proceed
    if (errors.length > 0) {
      setValidationErrors(errors);
      setCreatingVideo(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // Create video record
      const { data: videoData } = await supabase
        .from("videos")
        .insert({
          project_id: projectId,
          user_id: project?.user_id,
          status: "preparing",
          format: "reels",
          duration: 30,
        })
        .select()
        .single();

      if (videoData) {
        setVideo(videoData as Video);
        
        // Log project config for next steps
        console.log("=== PROJECT CONFIG FOR RENDERING ===");
        console.log("Project ID:", projectId);
        console.log("Voice Settings:", {
          selectedVoice: voiceSettings.selectedVoice,
          edgeVoice: voiceSettings.edgeVoice,
          rate: voiceSettings.rate,
          pitch: voiceSettings.pitch,
          audioDuration: voiceSettings.audioDuration,
        });
        console.log("Narration Text:", localNarrationText || narration?.text);
        console.log("Render State: ready_for_recording");
        console.log("=====================================");

        // Navigate to download page (for now, until render pipeline is ready)
        setTimeout(() => {
          router.push(`/projects/${projectId}/download`);
        }, 2000);
      }
    } catch (error) {
      console.error("Video creation error:", error);
      setErrorMessage("Video oluşturulurken bir hata oluştu.");
    } finally {
      setCreatingVideo(false);
    }
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

  // Show message if project config couldn't be loaded
  const showProjectNotFound = !projectConfig && projectConfigLoaded;
  const narrationText = localNarrationText || narration?.text || "";

  if (showProjectNotFound) {
    return (
      <AppShell>
        <div className="px-4 py-8 max-w-2xl mx-auto">
          <GlassCard className="border-yellow-500/30 bg-yellow-500/5">
            <div className="flex flex-col items-center text-center py-8">
              <svg className="w-16 h-16 text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-yellow-400 font-bold text-lg mb-2">Proje Verisi Bulunamadı</h3>
              <p className="text-yellow-200/80 text-sm mb-6">
                Lütfen proje adımlarına geri dönün ve tekrar deneyin.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-xl transition-colors"
              >
                Projeye Geri Dön
              </button>
            </div>
          </GlassCard>
        </div>
      </AppShell>
    );
  }

  const videoStatus = video?.status || "preparing";
  const hasGeneratedAudio = !!(voiceSettings.generatedAudioBlob || cachedAudioUrl);

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <StepHeader
          step={7}
          totalSteps={10}
          title="Video Önizleme"
          description="Seslendirme ve video önizleme"
        />

        {/* Error Message with Debug */}
        {(errorMessage || debugInfo) && (
          <GlassCard className="mb-4 border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-200 text-sm">{errorMessage}</p>
                {debugInfo && (
                  <div className="mt-3">
                    <p className="text-red-400 text-xs font-mono font-bold mb-1">Debug Bilgi:</p>
                    <pre className="text-red-300 text-xs whitespace-pre-wrap font-mono bg-black/30 rounded p-2 max-h-64 overflow-auto">
                      {debugInfo}
                    </pre>
                  </div>
                )}
              </div>
              {debugInfo && (
                <button
                  onClick={() => { setErrorMessage(null); setDebugInfo(null); }}
                  className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                  title="Kapat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </GlassCard>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <GlassCard className="mb-4 border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-yellow-200 font-medium text-sm mb-2">Eksik adımlar var:</p>
                <ul className="space-y-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx} className="text-yellow-200/80 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </GlassCard>
        )}

        {video && videoStatus !== "completed" ? (
          <LoadingRenderState status={videoStatus as "preparing" | "audio_creating" | "rendering" | "finalizing" | "completed"} progress={videoStatus === "rendering" ? 50 : 20} />
        ) : (
          <>
            <ErrorBoundary
              fallback={
                <GlassCard className="mb-4 border-red-500/30 bg-red-500/5">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-red-400 font-medium">Seslendirme ekranı yüklenirken hata oluştu</h3>
                      <p className="text-red-300 text-sm mt-1">
                        Ses oluşturma özelliği şu anda kullanılamıyor. Lütfen sayfayı yenileyin.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              }
            >
              <GlassCard className="mb-4">
                <VoiceSelector
                  narrationText={narrationText}
                  disabled={generatingVoice}
                  isGenerating={generatingVoice}
                  onGenerateStart={handleGenerateVoiceStart}
                  onGenerateComplete={handleGenerateVoiceComplete}
                  onGenerateError={handleGenerateVoiceError}
                />
              </GlassCard>
            </ErrorBoundary>

            {hasGeneratedAudio && (
              <GlassCard className="mb-4">
                <h4 className="text-white font-semibold mb-3">Tanıtım Metni Önizleme</h4>
                <p className="text-muted leading-relaxed">{narrationText}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Ses süresi: ~{voiceSettings.audioDuration} saniye</span>
                </div>
              </GlassCard>
            )}

            <div className="glass rounded-2xl p-6 mb-6 bg-gradient-to-r from-primary/20 to-accent/20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold">{project?.short_title || "Proje Videosu"}</h3>
                  <p className="text-muted text-sm">30 sn · Reels 720x1280</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${hasGeneratedAudio ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {hasGeneratedAudio ? "✓ Ses Hazır" : "○ Ses Bekliyor"}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${narrationText ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {narrationText ? "✓ Metin Var" : "○ Metin Yok"}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/projects/${projectId}/narration`)}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
          >
            Geri
          </button>
          <PrimaryButton
            onClick={handleCreateVideo}
            loading={creatingVideo}
            className="flex-1"
            disabled={!hasGeneratedAudio || !narrationText}
          >
            Video Oluştur
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}