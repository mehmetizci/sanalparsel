"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TTSProvider, OpenAIVoice } from "@/types";

export type VoiceState = "idle" | "generating" | "ready" | "error";

// OpenAI TTS voice options
export const OPENAI_VOICES: { id: OpenAIVoice; name: string; description: string }[] = [
  { id: "nova", name: "Nova", description: "Hızlı ve canlı" },
  { id: "onyx", name: "Onyx", description: "Premium ve güçlü" },
  { id: "shimmer", name: "Shimmer", description: "Yumuşak premium" },
  { id: "coral", name: "Coral", description: "Sıcak ve doğal" },
];

// Speed options
export const SPEED_OPTIONS: { id: string; label: string; value: number; description: string }[] = [
  { id: "1.25", label: "1.25x", value: 1.25, description: "Normal canlı" },
  { id: "1.45", label: "1.45x", value: 1.45, description: "Hızlı" },
  { id: "1.55", label: "1.55x", value: 1.55, description: "Reels hızlı" },
  { id: "1.75", label: "1.75x", value: 1.75, description: "Çok hızlı" },
];

// Provider options
export const PROVIDER_OPTIONS: { id: TTSProvider; name: string; description: string }[] = [
  { id: "openai", name: "OpenAI TTS", description: "Premium AI ses" },
  { id: "edge-tts", name: "Edge TTS", description: "Microsoft Edge (Yedek)" },
];

interface VoiceSelectorProps {
  voiceType?: OpenAIVoice;
  onChange?: (type: OpenAIVoice) => void;
  onGenerate: () => Promise<void>;
  disabled?: boolean;
  voiceState?: VoiceState;
  audioUrl?: string | null;
  onRetry?: () => void;
  provider?: TTSProvider;
  onProviderChange?: (provider: TTSProvider) => void;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
}

const defaultVoice: OpenAIVoice = "nova";
const defaultSpeed = 1.55;
const defaultProvider: TTSProvider = "openai";

export default function VoiceSelector({
  voiceType = defaultVoice,
  onChange,
  onGenerate,
  disabled,
  voiceState = "idle",
  audioUrl,
  onRetry,
  provider = defaultProvider,
  onProviderChange,
  speed = defaultSpeed,
  onSpeedChange,
}: VoiceSelectorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  // Log provider info for debugging
  useEffect(() => {
    if (provider) {
      console.log(`[VoiceSelector] TTS provider: ${provider}`);
    }
  }, [provider]);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Handle audio URL changes - load the new audio
  useEffect(() => {
    if (audioUrl && audioRef.current && audioUrl !== currentUrlRef.current) {
      currentUrlRef.current = audioUrl;
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      setDuration(0);
      setCurrentTime(0);
    }
  }, [audioUrl]);

  // Reset when audioUrl becomes null or empty - for retry
  useEffect(() => {
    if (!audioUrl && audioRef.current) {
      currentUrlRef.current = null;
      audioRef.current.src = "";
      audioRef.current.load();
      setDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [audioUrl]);

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsPlaying(false);
      setErrorMessage("Ses dosyası yüklenemedi");
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  const handlePlay = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, audioUrl]);

  const handleGenerateClick = useCallback(async () => {
    setErrorMessage(null);
    try {
      await onGenerate();
    } catch (err) {
      // Show user-friendly message, hide technical details
      const errorMsg = err instanceof Error ? err.message : "Ses oluşturulamadı";
      // Map technical errors to user-friendly messages
      if (errorMsg.includes("403") || errorMsg.includes("edge-tts")) {
        setErrorMessage("Ses servisi şu anda kullanılamıyor. Lütfen tekrar deneyin.");
      } else if (errorMsg.includes("timeout") || errorMsg.includes("network")) {
        setErrorMessage("Bağlantı hatası. İnternet bağlantınızı kontrol edin.");
      } else {
        setErrorMessage("Ses oluşturulamadı. Lütfen tekrar deneyin.");
      }
    }
  }, [onGenerate]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    onRetry?.();
  }, [onRetry]);

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isGenerating = voiceState === "generating";

  // Determine button text based on state
  const getButtonContent = () => {
    if (isGenerating) {
      return (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>🎙 AI ses oluşturuluyor...</span>
        </>
      );
    }
    
    if (audioUrl) {
      return (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>✨ Yeniden Oluştur</span>
        </>
      );
    }
    
    return (
      <>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <span>🎙 Seslendirme Oluştur</span>
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Error Toast */}
      {errorMessage && (
        <div 
          className="p-3 rounded-xl flex items-center justify-between"
          style={{ 
            background: "rgba(239,68,68,0.15)", 
            border: "1px solid rgba(239,68,68,0.3)" 
          }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-300 text-sm">{errorMessage}</span>
          </div>
          <button
            onClick={handleRetry}
            className="text-red-400 text-xs hover:text-red-300"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* Provider Selection */}
      {onProviderChange && (
        <div className="space-y-2">
          <label className="text-white/50 text-xs font-medium">Seslendirme Servisi</label>
          <div className="flex gap-2">
            {PROVIDER_OPTIONS.map((opt) => {
              const isActive = provider === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onProviderChange(opt.id)}
                  disabled={disabled || isGenerating}
                  className={`
                    flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200
                    ${disabled || isGenerating ? "opacity-50" : ""}
                    ${isActive 
                      ? "bg-primary text-white" 
                      : "bg-white/[0.05] text-white/50 border border-white/[0.08]"
                    }
                  `}
                >
                  <div className="font-medium">{opt.name}</div>
                  <div className="text-white/40 text-[10px] mt-0.5">{opt.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Voice Selection - OpenAI TTS Voices */}
      <div className="space-y-2">
        <label className="text-white/50 text-xs font-medium">Ses Karakteri</label>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          {OPENAI_VOICES.map((voice) => {
            const isActive = voiceType === voice.id;
            return (
              <button
                key={voice.id}
                onClick={() => onChange?.(voice.id)}
                disabled={disabled || isGenerating}
                className={`
                  shrink-0 px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap flex items-center gap-1.5
                  ${disabled || isGenerating ? "opacity-50" : ""}
                  ${isActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/30" 
                    : "bg-white/[0.05] text-white/50 border border-white/[0.08]"
                  }
                `}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {voice.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Speed Selection */}
      {onSpeedChange && (
        <div className="space-y-2">
          <label className="text-white/50 text-xs font-medium">Hız</label>
          <div className="flex gap-1.5">
            {SPEED_OPTIONS.map((opt) => {
              const isActive = speed === opt.value;
              return (
                <button
                  key={opt.id}
                  onClick={() => onSpeedChange(opt.value)}
                  disabled={disabled || isGenerating}
                  className={`
                    flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
                    ${disabled || isGenerating ? "opacity-50" : ""}
                    ${isActive 
                      ? "bg-primary/20 text-primary border border-primary/30" 
                      : "bg-white/[0.03] text-white/40 border border-transparent"
                    }
                  `}
                  title={opt.description}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerateClick}
        disabled={disabled || isGenerating}
        className={`
          w-full font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all
          ${audioUrl 
            ? "bg-white/[0.05] border border-white/[0.1] text-white/60 hover:bg-white/[0.08]" 
            : "bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/30"
          }
          ${disabled || isGenerating ? "opacity-50" : ""}
        `}
      >
        {getButtonContent()}
      </button>

      {/* Audio Player - Only show when audio is ready */}
      {audioUrl && voiceState === "ready" && audioUrl.startsWith("http") && (
        <div 
          className="relative rounded-xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(124,58,237,0.05) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Animated waveform background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <div className="flex gap-0.5 items-end h-12">
              {[...Array(40)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{ 
                    height: `${20 + Math.sin(i * 0.5) * 30 + Math.random() * 20}%`,
                    animationDelay: `${i * 50}ms`
                  }}
                />
              ))}
            </div>
          </div>
          
          <div className="relative p-4">
            <div className="flex items-center gap-3">
              {/* Play/Pause button */}
              <button
                onClick={handlePlay}
                className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center hover:bg-primary/30 transition-colors shrink-0"
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-primary ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Progress bar */}
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/60 font-mono">{formatTime(currentTime)}</span>
                  <span className="text-white/40 font-mono">{formatTime(duration)}</span>
                </div>
                <div 
                  className="h-1.5 bg-white/[0.1] rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    if (!audioRef.current || !duration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    audioRef.current.currentTime = pos * duration;
                  }}
                >
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-100 relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary shadow-lg" />
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/20 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-primary text-[10px] font-medium">✓ Ses Hazır</span>
              </div>
            </div>
            {/* Provider/Voice info */}
            <div className="mt-2 flex items-center gap-2 text-[10px] text-white/40">
              <span className="px-1.5 py-0.5 rounded bg-white/5">{provider === "openai" ? "OpenAI" : "Edge TTS"}</span>
              <span>{voiceType}</span>
              <span>{speed}x</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading State - Shows during generation */}
      {isGenerating && (
        <div 
          className="rounded-xl p-4 animate-pulse"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.04) 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
            <div className="flex-1">
              <div className="h-2 w-24 rounded bg-white/10 mb-2" />
              <div className="h-1.5 w-full rounded bg-white/5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}