/**
 * CinematicVideoPlayer - Remotion-based video player and preview
 * 
 * Features:
 * - Real-time preview using Remotion Player
 * - Frame-accurate seeking
 * - Audio playback with word highlighting
 * - Camera mode visualization
 * - Quality settings
 */

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { useParcelStore, POI } from "@/lib/parcel-store";
import { RenderProgressUI } from "./RenderProgressUI";
import { generateCompositionProps, type RenderConfig } from "@/lib/cinematic-video-render";
import { generateMockWordTimings } from "@/lib/tts-timing";

interface CinematicVideoPlayerProps {
  projectId: string;
  onRenderComplete?: (outputUrl: string) => void;
  className?: string;
}

export default function CinematicVideoPlayer({ projectId, onRenderComplete, className }: CinematicVideoPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  
  // Store state
  const parcelCenter = useParcelStore((state) => state.parcelCenter);
  const parcelBounds = useParcelStore((state) => state.parcelBounds);
  const parcelMetadata = useParcelStore((state) => state.parcelMetadata);
  const uploadedGeoJson = useParcelStore((state) => state.uploadedGeoJson);
  const droneSettings = useParcelStore((state) => state.droneSettings);
  const pois = useParcelStore((state) => state.pois);
  const ttsAudio = useParcelStore((state) => state.ttsAudio);
  const videoSettings = useParcelStore((state) => state.videoSettings);
  
  // Render state
  const [renderId, setRenderId] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [previewMode, setPreviewMode] = useState<"player" | "loading" | "rendering">("loading");
  
  // Audio state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Word timings (from TTS or mock)
  const wordTimings = useMemo(() => {
    // Use real timings if available, otherwise generate mock
    if (ttsAudio.audioUrl && ttsAudio.status === "ready") {
      // In production, parse from TTS response
      return generateMockWordTimings("Demo metin", droneSettings.duration);
    }
    return generateMockWordTimings(
      `${parcelMetadata?.Il || ""} ${parcelMetadata?.Ilce || ""} ${parcelMetadata?.Mahalle || ""} bölgesinde bulunan parsel.`,
      droneSettings.duration
    );
  }, [ttsAudio, droneSettings.duration, parcelMetadata]);

  // Generate composition props
  const compositionProps = useMemo(() => {
    if (!parcelCenter) return null;

    const config: RenderConfig = {
      projectId,
      parcelName: `${parcelMetadata?.Ada || ""} Ada / ${parcelMetadata?.ParselNo || ""} Parsel`,
      parcelArea: parcelMetadata?.Alan || "",
      parcelCenter: [parcelCenter.lat, parcelCenter.lon],
      parcelBounds: parcelBounds
        ? [[parcelBounds.minLon, parcelBounds.minLat], [parcelBounds.maxLon, parcelBounds.maxLat]]
        : [[0, 0], [0, 0]],
      geoJson: uploadedGeoJson!,
      duration: droneSettings.duration,
      cameraModes: droneSettings.cameraModes,
      cameraFeel: droneSettings.cameraFeel,
      startHeight: droneSettings.startHeight,
      pois: pois
        .filter((p) => p.selected)
        .map((p) => ({
          id: p.id,
          name: p.name,
          type: p.label || p.category,
          coordinates: [p.lat, p.lng] as [number, number],
          distance: p.distanceText,
          category: p.category,
        })),
      narrationText: ttsAudio.audioUrl ? "Anlatım mevcut" : "Henüz ses oluşturulmadı",
      narrationAudioUrl: ttsAudio.audioUrl || "",
      wordTimings,
      consultantName: "Danışman Adı",
      consultantPhone: "+90 555 123 4567",
      consultantLogoUrl: "",
      consultantAvatarUrl: "",
      width: videoSettings.width,
      height: videoSettings.height,
      fps: 30,
      quality: videoSettings.resolution === "1080x1920" ? "premium" : "fast",
      primaryColor: "#3b82f6",
    };

    return generateCompositionProps(config);
  }, [
    parcelCenter,
    parcelBounds,
    parcelMetadata,
    uploadedGeoJson,
    droneSettings,
    pois,
    ttsAudio,
    videoSettings,
    projectId,
    wordTimings,
  ]);

  // Handle render start
  const handleStartRender = useCallback(async () => {
    if (!compositionProps) return;

    setIsRendering(true);

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          compositionProps,
        }),
      });

      const data = await response.json();

      if (data.renderId) {
        setRenderId(data.renderId);
        setPreviewMode("rendering");
      }
    } catch (error) {
      console.error("[CinematicVideoPlayer] Render start failed:", error);
      setIsRendering(false);
    }
  }, [compositionProps, projectId]);

  // Handle render complete
  const handleRenderComplete = useCallback(
    (outputUrl: string) => {
      setIsRendering(false);
      onRenderComplete?.(outputUrl);
    },
    [onRenderComplete]
  );

  // Handle render cancel
  const handleCancelRender = useCallback(() => {
    setIsRendering(false);
    setRenderId(null);
    setPreviewMode("player");
  }, []);

  // Update current time from player
  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Show loading state
  if (previewMode === "loading" || !compositionProps) {
    return (
      <div className={`relative bg-[#0a1f3d] rounded-2xl overflow-hidden ${className || ""}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white/60 text-sm">Video hazırlanıyor...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show render progress UI
  if (previewMode === "rendering" && renderId) {
    return (
      <div className={`relative bg-[#0a1f3d] rounded-2xl overflow-hidden p-8 ${className || ""}`}>
        <RenderProgressUI
          renderId={renderId}
          onComplete={handleRenderComplete}
          onCancel={handleCancelRender}
        />
      </div>
    );
  }

  return (
    <div className={`relative bg-[#0a1f3d] rounded-2xl overflow-hidden ${className || ""}`}>
      {/* Remotion Player - Using placeholder for actual component */}
      {/* In production, this would load the actual Remotion composition */}
      <div className="relative aspect-[9/16] max-h-[600px] mx-auto">
        {/* Simulated map canvas preview */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a2a] via-[#0f2a1a] to-[#0a1f15]">
          {/* Simulated parcel */}
          <div
            className="absolute top-1/2 left-1/2 w-32 h-24 bg-red-500/20 border-2 border-red-500/80 rounded transform -translate-x-1/2 -translate-y-1/2"
            style={{
              boxShadow: "0 0 40px rgba(239, 68, 68, 0.4)",
            }}
          />
          
          {/* Simulated POIs */}
          {pois.filter((p) => p.selected).map((poi, idx) => {
            const angle = (idx / pois.filter((p) => p.selected).length) * 2 * Math.PI;
            const x = 50 + Math.cos(angle) * 20;
            const y = 50 + Math.sin(angle) * 20;
            
            return (
              <div
                key={poi.id}
                className="absolute transform -translate-x-1/2 -translate-y-full"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="w-10 h-10 bg-blue-500/80 rounded-lg border-2 border-blue-400 flex items-center justify-center text-white text-lg">
                  📍
                </div>
                <p className="text-white text-xs text-center mt-1 bg-black/50 px-2 py-0.5 rounded">
                  {poi.name}
                </p>
              </div>
            );
          })}
          
          {/* Cinematic vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 40%, rgba(7, 20, 41, 0.7) 100%)",
            }}
          />
          
          {/* Camera info overlay */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md rounded-lg px-3 py-2">
            <p className="text-white text-xs font-mono">
              {droneSettings.cameraModes.join(" + ")} • {droneSettings.cameraFeel}
            </p>
          </div>
        </div>

        {/* Playback controls */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={togglePlayback}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          
          {/* Time display */}
          <div className="bg-black/50 backdrop-blur-md rounded-lg px-3 py-1.5">
            <span className="text-white text-sm font-mono">
              {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, "0")} / {Math.floor(droneSettings.duration / 60)}:{(droneSettings.duration % 60).toString().padStart(2, "0")}
            </span>
          </div>
          
          {/* Quality badge */}
          <div className="bg-primary/80 backdrop-blur-md rounded-lg px-3 py-1.5">
            <span className="text-white text-xs font-medium">
              {videoSettings.resolution}
            </span>
          </div>
        </div>

        {/* Word highlight indicator */}
        <div className="absolute bottom-20 left-4 right-4">
          <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-2">
            <p className="text-white/80 text-sm text-center">
              {wordTimings.find((w) => currentTime >= w.start && currentTime <= w.end)?.word || "..."}
            </p>
          </div>
        </div>
      </div>

      {/* Render button */}
      <div className="p-4">
        <button
          onClick={handleStartRender}
          disabled={isRendering}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
        >
          {isRendering ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              <span>Render Ediliyor...</span>
            </>
          ) : (
            <>
              <span>🎬</span>
              <span>Sinematik Video Oluştur</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}