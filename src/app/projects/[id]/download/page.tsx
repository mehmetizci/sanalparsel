"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Project, Video } from "@/types";
import { useAppLoadingStore } from "@/lib/loading-states";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import LoadingRenderState from "@/components/LoadingRenderState";

interface DownloadPageProps {
  params: { id: string };
}

export default function DownloadPage({ params }: DownloadPageProps) {
  const { id } = params;
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Reset video render state when entering download page
  const setVideoRenderState = useAppLoadingStore((state) => state.setVideoRenderState);
  const setVideoRenderStartedByUser = useAppLoadingStore((state) => state.setVideoRenderStartedByUser);
  
  // Mounted guard to prevent SSR/hydration issues
  const [mounted, setMounted] = useState(false);
  
  const [project, setProject] = useState<Project | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Set mounted guard and reset video state
  useEffect(() => {
    setMounted(true);
    // Reset video render state on page mount to clear from previous sessions
    setVideoRenderState("idle");
    setVideoRenderStartedByUser(false);
  }, [setVideoRenderState, setVideoRenderStartedByUser]);

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

      const { data: videoData } = await supabase
        .from("videos")
        .select("*")
        .eq("project_id", id)
        .single();

      if (videoData) {
        setVideo(videoData as Video);
      }

      const { data: creditsData } = await supabase
        .from("credits")
        .select("amount")
        .eq("user_id", user.id);

      if (creditsData) {
        const total = creditsData.reduce((sum, c) => sum + c.amount, 0);
        setCredits(total);
      }

      setLoading(false);
    };

    fetchData();
  }, [id, router]);

  // Store video URL for localStorage cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Load video from project data or localStorage (only after mounted)
  useEffect(() => {
    if (!mounted) return;
    
    // Check localStorage for rendered video
    const localVideoUrl = localStorage.getItem(`video_${id}`);
    if (localVideoUrl) {
      setVideoUrl(localVideoUrl);
    }
  }, [id, mounted]);

  const handleDownload = async () => {
    if (credits < 1 && video?.status !== "completed") {
      router.push("/billing");
      return;
    }

    setDownloading(true);
    try {
      const supabase = createClient();

      // Deduct credit
      if (video?.status !== "completed") {
        await supabase.from("credits").insert({
          user_id: project?.user_id,
          amount: -1,
          source: "video_download",
        });
      }

      // Update video status
      if (video) {
        await supabase
          .from("videos")
          .update({ status: "completed" })
          .eq("id", video.id);
      }

      // Update project status
      await supabase
        .from("projects")
        .update({ status: "completed" })
        .eq("id", id);

      // Trigger actual download
      if (videoUrl) {
        const a = document.createElement("a");
        a.href = videoUrl;
        a.download = `${project?.short_title || "video"}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloading(false);
    }
  };

  const handlePlayPreview = () => {
    if (videoRef.current && videoUrl) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  if (loading || !mounted) {
    return (
      <AppShell>
        <LoadingRenderState status="preparing" progress={10} customMessage="Sayfa hazırlanıyor..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <StepHeader
          step={10}
          totalSteps={10}
          title="Video Hazır!"
          description="Videonuzu indirebilirsiniz"
        />

        <GlassCard className="text-center bg-gradient-to-r from-success/10 to-primary/10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Video Hazır!</h2>
          <p className="text-muted mb-6">
            Projeniz başarıyla tamamlandı
          </p>
        </GlassCard>

        {/* Video Preview */}
        {videoUrl && (
          <GlassCard className="mt-4 overflow-hidden">
            <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover"
                controls
                onEnded={() => setIsPlaying(false)}
              />
              {!isPlaying && (
                <button
                  onClick={handlePlayPreview}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              )}
            </div>
          </GlassCard>
        )}

        <GlassCard className="mt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-card flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold">{project?.short_title || project?.title}</h3>
              <p className="text-muted text-sm">{video?.duration || 30} sn · Reels 720x1280</p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Format</span>
              <span className="text-white">MP4 / WebM</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Çözünürlük</span>
              <span className="text-white">720 x 1280</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Süre</span>
              <span className="text-white">{video?.duration || 30} saniye</span>
            </div>
          </div>
        </GlassCard>

        {credits < 1 && video?.status !== "completed" ? (
          <div className="mt-6">
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-center mb-4">
              <p className="text-warning">Bu videoyu indirmek için 1 video kredisi gerekir.</p>
              <p className="text-muted text-sm mt-1">Mevcut kredi: {credits}</p>
            </div>
            <Link href="/billing">
              <PrimaryButton fullWidth size="lg">
                Kredi Satın Al
              </PrimaryButton>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 mt-6">
            <PrimaryButton
              onClick={handleDownload}
              loading={downloading}
              fullWidth
              size="lg"
              className="glow-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Video İndir
            </PrimaryButton>
            
            <button className="w-full py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp ile Paylaş
            </button>

            <Link href="/projects/new">
              <button className="w-full py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium">
                Yeni Proje Oluştur
              </button>
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}