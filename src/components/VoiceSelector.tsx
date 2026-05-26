"use client";

import { useState, useRef, useEffect } from "react";
import { VoiceType } from "@/types";

interface VoiceSelectorProps {
  voiceType: VoiceType;
  onChange: (type: VoiceType) => void;
  onGenerate: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  audioUrl?: string | null;
}

const voiceLabels: Record<VoiceType, string> = {
  female: "Kadın",
  male: "Erkek",
  corporate: "Kurumsal",
};

export default function VoiceSelector({
  voiceType,
  onChange,
  onGenerate,
  disabled,
  isGenerating,
  audioUrl,
}: VoiceSelectorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("timeupdate", () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });
      audioRef.current.addEventListener("loadedmetadata", () => {
        setDuration(audioRef.current?.duration || 0);
      });
      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }
    return () => {
      audioRef.current?.removeEventListener("timeupdate", () => {});
      audioRef.current?.removeEventListener("loadedmetadata", () => {});
      audioRef.current?.removeEventListener("ended", () => {});
    };
  }, []);

  const handlePlay = () => {
    if (!audioUrl || !audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Voice Selection - Horizontal scroll chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {(Object.keys(voiceLabels) as VoiceType[]).map((type) => {
          const isActive = voiceType === type;
          return (
            <button
              key={type}
              onClick={() => onChange(type)}
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
              {voiceLabels[type]}
            </button>
          );
        })}
      </div>

      {/* Generate Button - Changes after generation */}
      {!audioUrl ? (
        <button
          onClick={onGenerate}
          disabled={disabled || isGenerating}
          className="w-full bg-gradient-to-r from-primary to-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Oluşturuluyor...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>🎙 Seslendirme Oluştur</span>
            </>
          )}
        </button>
      ) : (
        <button
          onClick={onGenerate}
          disabled={disabled || isGenerating}
          className="w-full bg-white/[0.05] border border-white/[0.1] text-white/60 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/[0.08] transition-all"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Yeniden oluşturuluyor...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>✨ Yeniden Oluştur</span>
            </>
          )}
        </button>
      )}

      {/* Audio Player - Mini cinematic card */}
      {audioUrl && (
        <div 
          className="relative rounded-xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(124,58,237,0.05) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Waveform background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <div className="flex gap-0.5 items-end h-12">
              {[...Array(40)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-primary rounded-full"
                  style={{ height: `${Math.random() * 100}%` }}
                />
              ))}
            </div>
          </div>
          
          <div className="relative p-4">
            <div className="flex items-center gap-3">
              {/* Play button - smaller */}
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
                  <span className="text-white/60">{formatTime(currentTime)}</span>
                  <span className="text-white/40">{formatTime(duration)}</span>
                </div>
                <div className="h-1 bg-white/[0.1] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/20 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-primary text-[10px] font-medium">✓ Ses Hazır</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}