/**
 * RenderProgressUI - Real-time render progress display
 * 
 * Features:
 * - Phase-based progress tracking
 * - Animated progress bar
 * - Estimated time remaining
 * - Cancel button
 * - Success/failure states
 */

"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface RenderProgress {
  phase: string;
  progress: number;
  phaseLabel: string;
  estimatedTime?: number;
}

interface RenderProgressUIProps {
  renderId: string;
  onComplete?: (outputUrl: string) => void;
  onCancel?: () => void;
}

// Phase definitions with labels and icons
const PHASES = {
  idle: { label: "Hazırlanıyor", icon: "⚙️" },
  preparing: { label: "Kompozisyon hazırlanıyor", icon: "🔧" },
  bundling: { label: "Remotion paketleniyor", icon: "📦" },
  capturing: { label: "Harita kareleri yakalanıyor", icon: "📷" },
  rendering: { label: "Video render ediliyor", icon: "🎬" },
  encoding: { label: "MP4 kodlanıyor", icon: "⚡" },
  uploading: { label: "Depolama yükleniyor", icon: "☁️" },
  finalizing: { label: "Finalize ediliyor", icon: "✨" },
  completed: { label: "Tamamlandı!", icon: "✅" },
  failed: { label: "Hata oluştu", icon: "❌" },
  cancelled: { label: "İptal edildi", icon: "🚫" },
} as const;

export function RenderProgressUI({ renderId, onComplete, onCancel }: RenderProgressUIProps) {
  const [progress, setProgress] = useState<RenderProgress>({
    phase: "idle",
    progress: 0,
    phaseLabel: "Hazırlanıyor...",
  });
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for render status
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/render/status?id=${renderId}`);
        if (!response.ok) throw new Error("Failed to fetch status");
        
        const data = await response.json();
        
        setProgress({
          phase: data.status,
          progress: data.progress,
          phaseLabel: PHASES[data.status as keyof typeof PHASES]?.label || data.status,
        });

        if (data.status === "completed") {
          setOutputUrl(data.outputUrl);
          clearInterval(pollInterval);
          onComplete?.(data.outputUrl);
        } else if (data.status === "failed") {
          setError(data.error);
          clearInterval(pollInterval);
        } else if (data.status === "cancelled") {
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error polling render status:", err);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [renderId, onComplete]);

  const isActive = ["pending", "preparing", "bundling", "capturing", "rendering", "encoding", "uploading", "finalizing"].includes(progress.phase);
  const isComplete = progress.phase === "completed";
  const isFailed = progress.phase === "failed";
  const isCancelled = progress.phase === "cancelled";

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-[#0a1f3d] to-[#071429] rounded-2xl p-6 border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Background glow */}
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent animate-pulse" />
        )}

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center text-lg
                  ${isActive ? "bg-primary/20" : isComplete ? "bg-green-500/20" : isFailed ? "bg-red-500/20" : "bg-white/10"}
                `}
              >
                {PHASES[progress.phase as keyof typeof PHASES]?.icon || "⚙️"}
              </div>
              <div>
                <h3 className="text-white font-semibold">Video Render</h3>
                <p className="text-white/60 text-sm">{progress.phaseLabel}</p>
              </div>
            </div>

            {/* Cancel button */}
            {isActive && onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
              >
                İptal
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  isComplete ? "bg-gradient-to-r from-green-400 to-emerald-500" :
                  isFailed ? "bg-gradient-to-r from-red-400 to-rose-500" :
                  "bg-gradient-to-r from-primary to-blue-400"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-white/40 text-xs">{progress.progress}%</span>
              {progress.estimatedTime && (
                <span className="text-white/40 text-xs">
                  ~{Math.ceil(progress.estimatedTime / 60)} dk kaldı
                </span>
              )}
            </div>
          </div>

          {/* Phase steps */}
          <div className="space-y-2">
            {Object.entries(PHASES).filter(([key]) => 
              ["preparing", "bundling", "rendering", "encoding", "uploading", "finalizing"].includes(key)
            ).map(([key, phase]) => {
              const phaseProgress = getPhaseProgress(key, progress.progress);
              const isCurrentPhase = progress.phase === key;
              
              return (
                <div key={key} className="flex items-center gap-3">
                  <div
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs
                      ${phaseProgress > 100 ? "bg-green-500 text-white" :
                        isCurrentPhase ? "bg-primary text-white" :
                        "bg-white/10 text-white/40"}
                    `}
                  >
                    {phaseProgress >= 100 ? "✓" : phase.icon}
                  </div>
                  <div className="flex-1">
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      {isCurrentPhase && (
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          animate={{ width: `${phaseProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </div>
                  </div>
                  <span className={`text-xs ${isCurrentPhase ? "text-white" : "text-white/40"}`}>
                    {phase.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Success state */}
          <AnimatePresence>
            {isComplete && outputUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-green-500/10 rounded-xl border border-green-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-green-400 font-medium">Render tamamlandı!</p>
                    <p className="text-white/60 text-sm">Videonuz hazır</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <a
                    href={outputUrl}
                    download
                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium text-center transition-colors"
                  >
                    İndir
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(outputUrl)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
                  >
                    Kopyala
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error state */}
          <AnimatePresence>
            {isFailed && error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-red-500/10 rounded-xl border border-red-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-red-400 font-medium">Render başarısız</p>
                    <p className="text-white/60 text-sm">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cancelled state */}
          <AnimatePresence>
            {isCancelled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-yellow-400 font-medium">Render iptal edildi</p>
                    <p className="text-white/60 text-sm">İşlem kullanıcı tarafından durduruldu</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// Calculate progress for each phase
function getPhaseProgress(phase: string, totalProgress: number): number {
  const phaseThresholds: Record<string, [number, number]> = {
    preparing: [0, 10],
    bundling: [10, 40],
    capturing: [40, 90],
    encoding: [90, 95],
    uploading: [95, 98],
    finalizing: [98, 100],
  };

  const [start, end] = phaseThresholds[phase] || [0, 100];
  
  if (totalProgress < start) return 0;
  if (totalProgress >= end) return 100;
  
  return ((totalProgress - start) / (end - start)) * 100;
}