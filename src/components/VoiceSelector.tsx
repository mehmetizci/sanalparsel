"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParcelStore } from "@/lib/parcel-store";
import { EDGE_VOICE_CONFIGS, type VoiceType } from "@/lib/project-config";
import { generateTTS } from "@/lib/ttsClient";

interface VoiceSelectorProps {
  narrationText: string;
  onTextChange?: (text: string) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  onGenerateStart?: () => void;
  onGenerateComplete?: (blob: Blob, duration: number) => void;
  onGenerateError?: (error: string, debug?: string) => void;
}

export default function VoiceSelector({
  narrationText,
  disabled,
  isGenerating,
  onGenerateStart,
  onGenerateComplete,
  onGenerateError,
}: VoiceSelectorProps) {
  const {
    voiceSettings,
    cachedAudioUrl,
    cachedNarrationHash,
    setVoiceType,
    setGeneratedAudio,
    invalidateAudioCache,
  } = useParcelStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasGeneratedAudio = !!cachedAudioUrl && !!voiceSettings.audioDuration;

  // Create audio element on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      });
      audioRef.current.addEventListener("loadedmetadata", () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      });
      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Set audio source when URL changes
  useEffect(() => {
    if (audioRef.current && cachedAudioUrl) {
      audioRef.current.src = cachedAudioUrl;
    }
  }, [cachedAudioUrl]);

  // Check if narration text changed and invalidate cache
  useEffect(() => {
    if (narrationText && cachedNarrationHash && cachedNarrationHash !== hashText(narrationText)) {
      invalidateAudioCache(hashText(narrationText));
    }
  }, [narrationText, cachedNarrationHash, invalidateAudioCache]);

  const handleVoiceChange = (type: VoiceType) => {
    const config = EDGE_VOICE_CONFIGS[type];
    setVoiceType(type);
    // Update edge voice and settings
    useParcelStore.setState((state) => ({
      voiceSettings: {
        ...state.voiceSettings,
        selectedVoice: type,
        edgeVoice: config.voice,
        rate: config.rate,
        pitch: config.pitch,
      },
    }));
  };

  const handlePlay = useCallback(() => {
    if (!audioRef.current || !cachedAudioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, cachedAudioUrl]);

  // Test function to verify POST endpoint works
  const testEndpoint = async () => {
    console.log("=== TEST ENDPOINT ===");
    setDebugInfo("Test başlatılıyor...");
    
    try {
      const response = await fetch("/api/generate-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test: true,
          text: "Test mesajı",
          voice: "tr-TR-AhmetNeural",
          rate: "0%",
          pitch: "0Hz"
        })
      });

      const status = response.status;
      const contentType = response.headers.get("Content-Type") || "";
      let bodyText = "";
      
      try {
        const json = await response.json();
        bodyText = JSON.stringify(json);
      } catch {
        bodyText = await response.text();
      }

      const debug = `
=== TEST RESPONSE ===
Status: ${status}
Content-Type: ${contentType}
Body: ${bodyText}
=====================`;

      console.log(debug);
      setDebugInfo(debug);

      if (status === 200 && bodyText.includes("ok")) {
        setDebugInfo(debug + "\n\n✓ Test başarılı! Endpoint çalışıyor.");
      } else {
        setDebugInfo(debug + "\n\n✗ Test başarısız!");
      }
    } catch (err) {
      const debug = `=== TEST ERROR ===\n${err instanceof Error ? err.message : String(err)}`;
      console.error(debug);
      setDebugInfo(debug);
    }
  };

  const handleGenerate = async () => {
    if (!narrationText || narrationText.trim().length === 0) {
      onGenerateError?.("Önce AI tanıtım metni oluşturmalısınız.");
      return;
    }

    onGenerateStart?.();
    setDebugInfo("Ses oluşturuluyor...");
    
    try {
      console.log("[VoiceSelector] Starting TTS generation...");
      
      const result = await generateTTS({
        text: narrationText,
        voice: voiceSettings.edgeVoice,
        rate: voiceSettings.rate,
        pitch: voiceSettings.pitch,
      });
      
      console.log("[VoiceSelector] TTS generation successful, duration:", result.duration);
      setDebugInfo(null);
      
      setGeneratedAudio(result.audioBlob, result.duration);
      invalidateAudioCache(hashText(narrationText));
      onGenerateComplete?.(result.audioBlob, result.duration);
    } catch (err: unknown) {
      console.error("[VoiceSelector] TTS generation failed:", err);
      
      const errObj = err as { error?: string; details?: string };
      const userMessage = errObj?.error || "Ses oluşturulurken bir hata oluştu.";
      const errorMessage = err instanceof Error ? err.message : String(err);
      const debugDetails = errObj?.details || errorMessage;
      
      const fullDebug = `=== DEBUG BILGI ===\n${debugDetails}\n\nSes ayarları:\n- Voice: ${voiceSettings.edgeVoice}\n- Rate: ${voiceSettings.rate}\n- Pitch: ${voiceSettings.pitch}\n=================`;
      
      console.error(fullDebug);
      setDebugInfo(fullDebug);
      
      onGenerateError?.(userMessage, debugDetails);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const voiceOptions: { type: VoiceType; label: string; description: string }[] = [
    { type: "female", label: "Kadın", description: "Sıcak ve profesyonel" },
    { type: "male", label: "Erkek", description: "Güvenilir ve dinamik" },
    { type: "corporate", label: "Kurumsal", description: "Formal ve ciddi" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <label className="text-white font-semibold mb-3 block">Ses Seçimi</label>
        <div className="grid grid-cols-3 gap-3">
          {voiceOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => handleVoiceChange(option.type)}
              disabled={disabled}
              className={`glass rounded-xl p-4 text-center transition-all duration-200 ${
                voiceSettings.selectedVoice === option.type
                  ? "border-primary bg-primary/10 ring-2 ring-primary/50"
                  : "border-white/10 hover:border-white/20"
              } ${disabled ? "opacity-50" : ""}`}
            >
              <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                voiceSettings.selectedVoice === option.type
                  ? "bg-primary/20"
                  : "bg-primary/10"
              }`}>
                <svg className={`w-6 h-6 ${voiceSettings.selectedVoice === option.type ? "text-primary" : "text-primary/70"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          onClick={handleGenerate}
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

        {hasGeneratedAudio && (
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlay}
                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors flex-shrink-0"
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
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">Seslendirme Hazır</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted text-sm">
                    {formatTime(currentTime)} / {formatTime(voiceSettings.audioDuration || duration)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-100"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={disabled || isGenerating}
                className="p-2 text-muted hover:text-white transition-colors flex-shrink-0"
                title="Tekrar oluştur"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {cachedNarrationHash && narrationText && narrationText !== cachedNarrationHash && !hasGeneratedAudio && (
          <div className="glass rounded-xl p-4 border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-yellow-200 text-sm">Metin değişti, seslendirmeyi yeniden oluşturmalısınız.</p>
            </div>
          </div>
        )}

        {/* Debug Info Display */}
        {debugInfo && (
          <div className="glass rounded-xl p-4 border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-200 font-medium text-sm mb-1">Debug Bilgi:</p>
                <pre className="text-red-300 text-xs whitespace-pre-wrap font-mono bg-black/20 rounded p-2 max-h-48 overflow-auto">
                  {debugInfo}
                </pre>
              </div>
              <button
                onClick={() => setDebugInfo(null)}
                className="text-red-400 hover:text-red-300 p-1"
                title="Kapat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Test Button - Debug */}
        <button
          onClick={testEndpoint}
          className="w-full py-2 rounded-xl border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/5 transition-colors text-sm font-medium"
        >
          🔧 Endpoint Test Et (Debug)
        </button>
      </div>
    </div>
  );
}

// Simple hash function for narration text
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}