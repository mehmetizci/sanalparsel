"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, Narration, Video, VoiceType } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import VoiceSelector from "@/components/VoiceSelector";

export default function VideoPreviewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [voiceType, setVoiceType] = useState<VoiceType>("female");
  const [loading, setLoading] = useState(true);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [creatingVideo, setCreatingVideo] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);

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
        .eq("id", id)
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
        .eq("project_id", id)
        .single();

      if (narData) {
        setNarration(narData as Narration);
        setVoiceType((narData as Narration).voice_type || "female");
      }

      const { data: videoData } = await supabase
        .from("videos")
        .select("*")
        .eq("project_id", id)
        .single();

      if (videoData) {
        setVideo(videoData as Video);
      }

      setLoading(false);
    };

    fetchData();
  }, [id, router]);

  const handleGenerateVoice = async () => {
    if (!narration?.text) return;

    setGeneratingVoice(true);
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: narration.text,
          voice_type: voiceType,
        }),
      });

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
        setNarration((prev) => prev ? { ...prev, audio_url: data.audio_url } : null);
      }
    } catch (error) {
      console.error("Voice generation error:", error);
    } finally {
      setGeneratingVoice(false);
    }
  };

  const handleCreateVideo = async () => {
    setCreatingVideo(true);
    try {
      const supabase = createClient();
      
      const { data: videoData } = await supabase
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

      if (videoData) {
        setVideo(videoData as Video);
        setTimeout(() => {
          router.push(`/projects/${id}/download`);
        }, 3000);
      }
    } catch (error) {
      console.error("Video creation error:", error);
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

  const videoStatus = video?.status || "preparing";
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

        {video && videoStatus !== "completed" ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white/60 text-sm">Video hazırlanıyor...</p>
          </div>
        ) : (
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
                onClick={() => router.push(`/projects/${id}/narration`)}
                className="flex-1 py-3 rounded-xl border border-white/[0.1] text-white/70 text-sm hover:bg-white/[0.05] transition-all font-medium"
              >
                Geri
              </button>
              <button
                disabled={!hasAudio || creatingVideo}
                onClick={handleCreateVideo}
                className={`
                  flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
                  ${hasAudio 
                    ? "bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30" 
                    : "bg-white/[0.05] text-white/30 border border-white/[0.05]"
                }
                ${creatingVideo ? "opacity-70" : ""}
              `}
              >
                {creatingVideo ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Hazırlanıyor...
                  </>
                ) : (
                  <>
                    <span>🎬</span>
                    <span>Sinematik Video Oluştur</span>
                  </>
                )}
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