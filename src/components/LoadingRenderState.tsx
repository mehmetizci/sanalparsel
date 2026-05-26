"use client";

import { useAppLoadingStore, shouldShowVideoOverlay } from "@/lib/loading-states";

interface VideoPreparingOverlayProps {
  videoRenderState: "idle" | "preparing" | "recording" | "uploading" | "generating_audio" | "merging" | "completed" | "error";
}

const statusLabels: Record<string, { label: string; description: string }> = {
  preparing: { label: "Video Hazırlanıyor", description: "Video oluşturuluyor, lütfen bekleyin..." },
  map_init: { label: "Harita Hazırlanıyor", description: "Uydu görüntüsü yükleniyor..." },
  recording: { label: "Kayıt Yapılıyor", description: "Kamera hareketi kaydediliyor..." },
  audio: { label: "Ses Oluşturuluyor", description: "Seslendirme sentezleniyor..." },
  audio_creating: { label: "Ses Oluşturuluyor", description: "Ses sentezleniyor..." },
  generating_audio: { label: "Ses Oluşturuluyor", description: "Seslendirme sentezleniyor..." },
  merging: { label: "Birleştiriliyor", description: "Video ve ses birleştiriliyor..." },
  rendering: { label: "Video Render Ediliyor", description: "Video kodlanıyor..." },
  finalizing: { label: "Tamamlanıyor", description: "Son rötuşlar yapılıyor..." },
  exporting: { label: "Dışa Aktarılıyor", description: "Video formatı düzenleniyor..." },
  completed: { label: "Tamamlandı", description: "Video hazır!" },
  uploading: { label: "Yükleniyor", description: "Video sunucuya yükleniyor..." },
};

/**
 * Video Preparing Overlay - Global overlay for video rendering
 * 
 * IMPORTANT: This overlay ONLY shows when:
 * 1. videoRenderState !== "idle"
 * 2. videoRenderState !== "completed" 
 * 3. videoRenderStartedByUser === true (user clicked "Video Oluştur")
 * 
 * This prevents the overlay from appearing on:
 * - GeoJSON upload pages
 * - Wizard step changes
 * - TTS generation
 * - AI text generation
 * - Any other unrelated actions
 */
export function VideoPreparingOverlay() {
  const videoRenderState = useAppLoadingStore((state) => state.videoRenderState);
  const videoRenderStartedByUser = useAppLoadingStore((state) => state.videoRenderStartedByUser);

  // Don't show overlay unless conditions are met
  const shouldShow = shouldShowVideoOverlay(videoRenderState, videoRenderStartedByUser);

  const { label, description } = statusLabels[videoRenderState] || statusLabels.preparing;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass rounded-2xl p-8 text-center max-w-md mx-4">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-white/10"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * 50) / 100}
              strokeLinecap="round"
              className="text-primary transition-all duration-500 animate-pulse"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">{label}</h3>
        <p className="text-muted">{description}</p>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Lütfen bekleyin...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * LoadingRenderState - Local loading indicator for pages
 * 
 * Use this for page-level loading (not video rendering).
 * For video rendering overlay, use VideoPreparingOverlay instead.
 */
export default function LoadingRenderState({ status, progress = 0, customMessage }: { 
  status: "preparing" | "map_init" | "recording" | "audio" | "merging" | "exporting" | "completed" | "preparing" | "audio_creating" | "rendering" | "finalizing";
  progress?: number;
  customMessage?: string;
}) {
  const { label, description } = statusLabels[status] || statusLabels.preparing;

  return (
    <div className="glass rounded-2xl p-8 text-center">
      <div className="relative w-24 h-24 mx-auto mb-6">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-white/10"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray="251.2"
            strokeDashoffset={251.2 - (251.2 * progress) / 100}
            strokeLinecap="round"
            className="text-primary transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(progress)}%</span>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">{label}</h3>
      <p className="text-muted">{customMessage || description}</p>

      {status !== "completed" && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Lütfen bekleyin...</span>
        </div>
      )}
    </div>
  );
}