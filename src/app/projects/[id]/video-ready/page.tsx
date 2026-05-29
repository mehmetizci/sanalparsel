"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useParcelStore } from "@/lib/parcel-store";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";

export default function VideoReadyPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    }>
      <VideoReadyPageInner params={params} />
    </Suspense>
  );
}

function VideoReadyPageInner({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams?.get("demo") === "true";

  // Store state
  const recordedVideoUrl = useParcelStore((state) => state.recordedVideoUrl);
  const droneSettings = useParcelStore((state) => state.droneSettings);
  const clearRecordedVideo = useParcelStore((state) => state.clearRecordedVideo);

  const [videoReady, setVideoReady] = useState(false);

  // Check for video URL on mount
  useEffect(() => {
    if (recordedVideoUrl) {
      setVideoReady(true);
    } else {
      // No video - redirect to preview
      router.replace(`/projects/${id}/video-preview${isDemo ? '?demo=true' : ''}`);
    }
  }, [recordedVideoUrl, router, id, isDemo]);

  // Download handler
  const handleDownload = useCallback(() => {
    if (!recordedVideoUrl) return;
    
    const a = document.createElement("a");
    a.href = recordedVideoUrl;
    a.download = `sanalparsel-${id}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [recordedVideoUrl, id]);

  // Recreate video handler
  const handleRecreate = useCallback(() => {
    // Clear current video URL
    clearRecordedVideo();
    // Navigate back to recording page
    router.push(`/projects/${id}/video-create${isDemo ? '?demo=true' : ''}`);
  }, [clearRecordedVideo, router, id, isDemo]);

  // Go to dashboard
  const handleGoToDashboard = useCallback(() => {
    router.push(`/projects/${id}/video-preview${isDemo ? '?demo=true' : ''}`);
  }, [router, id, isDemo]);

  if (!videoReady) {
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
      <div className="px-4 py-5 max-w-2xl mx-auto">
        <StepHeader 
          step={10} 
          totalSteps={10} 
          title="Video Hazır" 
          description="Sinematik drone videosu oluşturuldu" 
        />

        {/* Success indicator */}
        <div className="mb-4 p-4 rounded-xl text-center" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div className="text-green-400 text-4xl mb-2">✓</div>
          <p className="text-white font-medium">Video başarıyla oluşturuldu!</p>
        </div>

        {/* Video Player Card */}
        <div className="mb-4 rounded-xl overflow-hidden" style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Video element */}
          <video 
            src={recordedVideoUrl || ""} 
            controls 
            autoPlay 
            className="w-full aspect-[9/16] bg-black"
            style={{ maxHeight: "450px" }}
          />
          
          {/* Action buttons */}
          <div className="p-4 flex flex-col gap-3">
            {/* Download button */}
            <button 
              onClick={handleDownload}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>WEBM İndir</span>
            </button>

            {/* Recreate button */}
            <button 
              onClick={handleRecreate}
              className="w-full py-3 rounded-xl border border-white/[0.1] text-white/70 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/[0.05] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Yeniden Oluştur</span>
            </button>

            {/* Back to preview */}
            <button 
              onClick={handleGoToDashboard}
              className="w-full py-3 rounded-xl text-white/50 text-sm hover:text-white/70 transition-colors"
            >
              ← Video Önizleme&apos;ye Dön
            </button>
          </div>

          {/* Footer info */}
          <div className="px-4 pb-4 text-center">
            <p className="text-white/50 text-xs">720×1280 • WEBM • {(droneSettings?.duration || 30)}s</p>
          </div>
        </div>

        {/* Info card */}
        <div className="text-center py-3 px-4 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(16,185,129,0.04) 100%)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Video dosyasını indirdikten sonra istediğiniz gibi kullanabilirsiniz</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}