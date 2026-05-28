"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { deductCredit } from "@/lib/credits";
import { Project, Video } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import Toast, { ToastType } from "@/components/Toast";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

export default function DownloadPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [credits, setCredits] = useState(5);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "", type: "success" });
  const [userId, setUserId] = useState<string | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

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

      // Fetch credits from user_profiles
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setCredits(profileData.credits ?? 5);
      }

      setLoading(false);
    };

    fetchData();
  }, [id, router]);

  const handleDownload = async () => {
    if (!userId || !project) {
      showToast("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.", "error");
      return;
    }

    // Check credits first
    if (credits < 1) {
      setShowInsufficientModal(true);
      return;
    }

    setDownloading(true);
    try {
      // Deduct credit using the helper function
      const result = await deductCredit(userId, 1);
      
      if (!result.success) {
        setShowInsufficientModal(true);
        setDownloading(false);
        return;
      }

      const supabase = createClient();
      
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

      // Update local credits state
      setCredits(result.remaining);
      
      showToast("Video indirme başlatılıyor...", "success");
      
      // In production, this would trigger actual video download
      // For now, show download started
      setTimeout(() => {
        alert("Video indirme başlatılıyor...");
      }, 500);
    } catch (error) {
      console.error("Download error:", error);
      showToast("İndirme sırasında hata oluştu", "error");
    } finally {
      setDownloading(false);
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

        <GlassCard className="mt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-card flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold">{project?.short_title || project?.title}</h3>
              <p className="text-muted text-sm">30 sn · Reels 1080x1920</p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Format</span>
              <span className="text-white">MP4 / Reels</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Çözünürlük</span>
              <span className="text-white">1080 x 1920</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Süre</span>
              <span className="text-white">30 saniye</span>
            </div>
          </div>
        </GlassCard>

        {credits < 1 ? (
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
              MP4 İndir
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

      {/* Insufficient Credits Modal */}
      {showInsufficientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">Yetersiz Kredi</h3>
            <p className="text-muted text-center mb-6">
              Bu videoyu indirmek için yeterli krediniz yok. Lütfen kredi satın alın.
            </p>
            <div className="space-y-3">
              <Link href="/billing">
                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all">
                  Kredi Satın Al
                </button>
              </Link>
              <button
                onClick={() => setShowInsufficientModal(false)}
                className="w-full py-3 rounded-xl border border-white/10 text-muted hover:text-white hover:bg-white/5 transition-colors font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </AppShell>
  );
}