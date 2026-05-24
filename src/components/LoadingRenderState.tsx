"use client";

interface LoadingRenderStateProps {
  status: "preparing" | "audio_creating" | "rendering" | "finalizing" | "completed";
  progress?: number;
}

const statusLabels: Record<string, { label: string; description: string }> = {
  preparing: { label: "Hazırlanıyor", description: "Proje ayarları hazırlanıyor..." },
  audio_creating: { label: "Ses Oluşturuluyor", description: "ElevenLabs ile ses sentezleniyor..." },
  rendering: { label: "Video Render Ediliyor", description: "Remotion ile video oluşturuluyor..." },
  finalizing: { label: "Tamamlanıyor", description: "Son rötuşlar yapılıyor..." },
  completed: { label: "Tamamlandı", description: "Video hazır!" },
};

export default function LoadingRenderState({ status, progress = 0 }: LoadingRenderStateProps) {
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
      <p className="text-muted">{description}</p>

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