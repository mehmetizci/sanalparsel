/**
 * RenderProgressUI - Real-time render progress display with debug panel
 * 
 * Features:
 * - Phase-based progress tracking
 * - Real frame count display
 * - Live log viewer
 * - FFmpeg output display
 * - Success/failure states with real errors
 */

"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface RenderProgress {
  phase: string;
  progress: number;
  phaseLabel: string;
  estimatedTime?: number;
}

interface RenderStatus {
  renderId: string;
  status: string;
  progress: number;
  phase: string;
  message: string;
  frameCount: number;
  totalFrames: number;
  outputUrl?: string;
  error?: string;
  logs: string[];
  startedAt?: string;
  completedAt?: string;
}

interface RenderProgressUIProps {
  renderId: string;
  onComplete?: (outputUrl: string) => void;
  onCancel?: () => void;
  showDebugPanel?: boolean;
}

// Phase definitions with labels and icons
const PHASES = {
  idle: { label: "Hazırlanıyor", icon: "⚙️" },
  initializing: { label: "Başlatılıyor", icon: "🚀" },
  preparing: { label: "Hazırlanıyor", icon: "🔧" },
  rendering: { label: "Kareler yakalanıyor", icon: "📷" },
  encoding: { label: "FFmpeg kodlama", icon: "⚡" },
  uploading: { label: "Yükleniyor", icon: "☁️" },
  completed: { label: "Tamamlandı!", icon: "✅" },
  failed: { label: "Hata", icon: "❌" },
  cancelled: { label: "İptal", icon: "🚫" },
} as const;

export function RenderProgressUI({ renderId, onComplete, onCancel, showDebugPanel = true }: RenderProgressUIProps) {
  const [status, setStatus] = useState<RenderStatus | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Scroll logs to bottom when new logs arrive
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [status?.logs?.length, showLogs]);

  // Poll for render status
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/render?id=${renderId}`);
        if (!response.ok) throw new Error("Failed to fetch status");
        
        const data: RenderStatus = await response.json();
        setStatus(data);

        if (data.status === "completed") {
          setOutputUrl(data.outputUrl || null);
          clearInterval(pollInterval);
          onComplete?.(data.outputUrl || "");
        } else if (data.status === "failed") {
          setError(data.error || "Unknown error");
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error polling render status:", err);
      }
    }, 500); // Poll every 500ms for real-time updates

    return () => clearInterval(pollInterval);
  }, [renderId, onComplete]);

  const isActive = ["pending", "initializing", "preparing", "rendering", "encoding", "uploading"].includes(status?.status || "");
  const isComplete = status?.status === "completed";
  const isFailed = status?.status === "failed";
  const isCancelled = status?.status === "cancelled";

  // Calculate FPS
  const elapsedSeconds = status?.startedAt 
    ? Math.floor((Date.now() - new Date(status.startedAt).getTime()) / 1000)
    : 0;
  const currentFps = elapsedSeconds > 0 && status?.frameCount 
    ? (status.frameCount / elapsedSeconds).toFixed(1) 
    : "0";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Main progress card */}
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`
                  w-12 h-12 rounded-xl flex items-center justify-center text-xl
                  ${isActive ? "bg-primary/20 animate-pulse" : isComplete ? "bg-green-500/20" : isFailed ? "bg-red-500/20" : "bg-white/10"}
                `}
              >
                {PHASES[status?.status as keyof typeof PHASES]?.icon || "⚙️"}
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Cinematic Video Render</h3>
                <p className="text-white/60 text-sm">{status?.message || "Hazırlanıyor..."}</p>
              </div>
            </div>

            {/* Cancel button */}
            {isActive && onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors"
              >
                İptal
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  isComplete ? "bg-gradient-to-r from-green-400 to-emerald-500" :
                  isFailed ? "bg-gradient-to-r from-red-400 to-rose-500" :
                  "bg-gradient-to-r from-primary to-blue-400"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${status?.progress || 0}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-white/40 text-sm font-mono">{status?.progress || 0}%</span>
              {isActive && (
                <span className="text-white/40 text-sm">
                  Frame {status?.frameCount || 0} / {status?.totalFrames || "?"} ({currentFps} fps)
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{status?.frameCount || 0}</div>
              <div className="text-xs text-white/40">Kare</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{status?.totalFrames || "?"}</div>
              <div className="text-xs text-white/40">Hedef</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{currentFps}</div>
              <div className="text-xs text-white/40">FPS</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{elapsedSeconds}s</div>
              <div className="text-xs text-white/40">Geçen</div>
            </div>
          </div>

          {/* Phase indicator */}
          <div className="flex gap-2 flex-wrap">
            {["preparing", "rendering", "encoding", "uploading"].map((phase) => {
              const phaseIndex = ["preparing", "rendering", "encoding", "uploading"].indexOf(phase);
              const currentIndex = ["preparing", "rendering", "encoding", "uploading"].indexOf(status?.phase || "");
              const isDone = phaseIndex < currentIndex;
              const isCurrent = phase === status?.phase;

              return (
                <div
                  key={phase}
                  className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${isDone ? "bg-green-500/20 text-green-400" :
                      isCurrent ? "bg-primary/30 text-primary" :
                      "bg-white/5 text-white/30"}
                  `}
                >
                  {PHASES[phase as keyof typeof PHASES]?.label || phase}
                  {isCurrent && "..."}
                </div>
              );
            })}
          </div>

          {/* Toggle logs button */}
          {showDebugPanel && status?.logs && status.logs.length > 0 && (
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {showLogs ? "Logları Gizle" : "Logları Göster"} ({status.logs.length})
            </button>
          )}
        </div>
      </motion.div>

      {/* Debug log panel */}
      <AnimatePresence>
        {showLogs && status?.logs && status.logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#0a0f1a] rounded-xl border border-white/10 overflow-hidden"
          >
            <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-white/60 text-sm font-mono">Render Logs</span>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs">
              {status.logs.map((log, i) => (
                <div key={i} className={`py-0.5 ${
                  log.includes("ERROR") ? "text-red-400" :
                  log.includes("COMPLETED") ? "text-green-400" :
                  log.includes("Warning") ? "text-yellow-400" :
                  "text-white/60"
                }`}>
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success state */}
      <AnimatePresence>
        {isComplete && outputUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-2xl p-6 border border-green-500/20"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-green-400 font-semibold text-lg">Render Tamamlandı!</p>
                <p className="text-white/60 text-sm">Videonuz hazır ve indirilmeye uygun</p>
              </div>
            </div>

            {/* Video preview */}
            <div className="bg-white/5 rounded-xl overflow-hidden mb-4">
              <video 
                src={outputUrl} 
                controls 
                className="w-full max-h-64"
                poster={outputUrl.replace('.mp4', '_preview.jpg')}
              />
            </div>

            <div className="flex gap-3">
              <a
                href={outputUrl}
                download={`sanalparsel_${renderId}.mp4`}
                className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-center transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Video İndir (MP4)
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(outputUrl)}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                title="URL'yi kopyala"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {isFailed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-red-500/10 to-rose-500/5 rounded-2xl p-6 border border-red-500/20"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-red-400 font-semibold text-lg">Render Başarısız</p>
                <p className="text-white/60 text-sm">Aşağıdaki hata oluştu:</p>
              </div>
            </div>

            {/* Error details */}
            <div className="bg-red-500/10 rounded-xl p-4 mb-4">
              <div className="text-red-400 font-mono text-sm">{error || status?.error}</div>
            </div>

            {/* Last logs */}
            {status?.logs && status.logs.length > 0 && (
              <details className="bg-white/5 rounded-xl overflow-hidden">
                <summary className="px-4 py-2 bg-white/5 text-white/60 text-sm cursor-pointer hover:bg-white/10">
                  Hata Logları ({status.logs.filter(l => l.includes("ERROR")).length})
                </summary>
                <div className="p-4 max-h-32 overflow-y-auto font-mono text-xs text-red-300/70">
                  {status.logs
                    .filter(l => l.includes("ERROR") || l.includes("error") || l.includes("Warning"))
                    .map((log, i) => <div key={i} className="py-0.5">{log}</div>)}
                </div>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            >
              Tekrar Dene
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}