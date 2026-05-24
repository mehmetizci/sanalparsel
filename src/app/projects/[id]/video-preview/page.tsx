"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, Narration, Video, VoiceType } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import VoiceSelector from "@/components/VoiceSelector";
import LoadingRenderState from "@/components/LoadingRenderState";
import PrimaryButton from "@/components/PrimaryButton";

export default function VideoPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [voiceType, setVoiceType] = useState<VoiceType>("female");
  const [loading, setLoading] = useState(true);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [creatingVideo, setCreatingVideo] = useState(false);

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
      
      // Create video record
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
        
        // Trigger render (in production, this would call a render worker)
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

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <StepHeader
          step={7}
          totalSteps={10}
          title="Video Önizleme"
          description="Seslendirme ve video önizleme"
        />

        {video && videoStatus !== "completed" ? (
          <LoadingRenderState status={videoStatus as "preparing" | "audio_creating" | "rendering" | "finalizing" | "completed"} progress={videoStatus === "rendering" ? 50 : 20} />
        ) : (
          <>
            <GlassCard className="mb-4">
              <VoiceSelector
                voiceType={voiceType}
                onChange={setVoiceType}
                onGenerate={handleGenerateVoice}
                disabled={generatingVoice}
                isGenerating={generatingVoice}
                audioUrl={narration?.audio_url}
              />
            </GlassCard>

            {narration?.audio_url && (
              <GlassCard className="mb-4">
                <h4 className="text-white font-semibold mb-3">Tanıtım Metni Önizleme</h4>
                <p className="text-muted leading-relaxed">{narration.text}</p>
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
                  <p className="text-muted text-sm">30 sn · Reels 1080x1920</p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/projects/${id}/narration`)}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
          >
            Geri
          </button>
          <PrimaryButton
            onClick={handleCreateVideo}
            loading={creatingVideo}
            className="flex-1"
          >
            Video Oluştur
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}