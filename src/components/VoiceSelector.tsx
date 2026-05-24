"use client";

import { useState } from "react";
import { VoiceType } from "@/types";

interface VoiceSelectorProps {
  voiceType: VoiceType;
  onChange: (type: VoiceType) => void;
  onGenerate: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  audioUrl?: string | null;
}

export default function VoiceSelector({
  voiceType,
  onChange,
  onGenerate,
  disabled,
  isGenerating,
  audioUrl,
}: VoiceSelectorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = typeof window !== "undefined" ? new Audio() : null;

  const voiceOptions: { type: VoiceType; label: string; description: string }[] = [
    { type: "female", label: "Kadın", description: "Sıcak ve profesyonel" },
    { type: "male", label: "Erkek", description: "Güvenilir ve dinamik" },
    { type: "corporate", label: "Kurumsal", description: "Formal ve ciddi" },
  ];

  const handlePlay = () => {
    if (!audioUrl || !audioRef) return;
    
    audioRef.src = audioUrl;
    if (isPlaying) {
      audioRef.pause();
      setIsPlaying(false);
    } else {
      audioRef.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-white font-semibold mb-3 block">Ses Seçimi</label>
        <div className="grid grid-cols-3 gap-3">
          {voiceOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => onChange(option.type)}
              disabled={disabled}
              className={`glass rounded-xl p-4 text-center transition-all duration-200 ${
                voiceType === option.type
                  ? "border-primary bg-primary/10"
                  : "border-white/10 hover:border-white/20"
              } ${disabled ? "opacity-50" : ""}`}
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p className="text-white font-medium">{option.label}</p>
              <p className="text-muted text-xs mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={onGenerate}
          disabled={disabled || isGenerating}
          className="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 disabled:opacity-50 hover:from-blue-600 hover:to-primary transition-all"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Ses Oluşturuluyor...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828-2.828" />
              </svg>
              <span>Seslendirme Oluştur</span>
            </>
          )}
        </button>

        {audioUrl && (
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <button
              onClick={handlePlay}
              className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors"
            >
              {isPlaying ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <p className="text-white font-medium">Seslendirme Hazır</p>
              <p className="text-muted text-sm">Dinlemek için tıkla</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onGenerate}
                disabled={disabled || isGenerating}
                className="p-2 text-muted hover:text-white transition-colors"
                title="Tekrar oluştur"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}