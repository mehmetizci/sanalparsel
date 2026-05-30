"use client";

import { useEffect, useState } from "react";
import { useParcelStore } from "@/lib/parcel-store";

interface VideoOverlayProps {
  progress: number; // 0-1
  isVisible: boolean;
}

export default function VideoOverlay({ progress, isVisible }: VideoOverlayProps) {
  const parcelMetadata = useParcelStore((state) => state.parcelMetadata);
  const videoSettings = useParcelStore((state) => state.videoSettings);

  const [showParcelInfo, setShowParcelInfo] = useState(true);
  const [fadeOpacity, setFadeOpacity] = useState(1);

  // Get overlay settings from videoSettings
  const overlays = videoSettings.overlays;

  // Hide parcel info after 5 seconds
  useEffect(() => {
    if (progress > 0.08) { // After ~5 seconds for 60s video
      setShowParcelInfo(false);
    }
  }, [progress]);

  // Fade in/out animation
  useEffect(() => {
    if (!isVisible) {
      setFadeOpacity(0);
      return;
    }

    // Fade in at start
    if (progress < 0.02) {
      setFadeOpacity(progress / 0.02);
    }
    // Fade out at end
    else if (progress > 0.95) {
      setFadeOpacity((1 - progress) / 0.05);
    }
    // Full opacity in between
    else {
      setFadeOpacity(1);
    }
  }, [progress, isVisible]);

  if (!isVisible || fadeOpacity <= 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: fadeOpacity }}
    >
      {/* SAFE AREA: Top 15% reserved for overlays, parcel stays in bottom 85% */}
      
      {/* Location Info - Top Left (with safe area) */}
      {parcelMetadata && (
        <div className="absolute top-6 left-4 md:top-8 md:left-6">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 md:px-4 md:py-3">
            <p className="text-white text-xs md:text-sm font-bold tracking-wider">
              {parcelMetadata.Il?.toUpperCase() || "İL"}
            </p>
            <p className="text-white text-xs md:text-sm font-medium">
              {parcelMetadata.Ilce?.toUpperCase() || "İLÇE"}
            </p>
            <p className="text-gray-300 text-xs">
              {parcelMetadata.Mahalle?.toUpperCase() || "MAHALLE"}
            </p>
          </div>
        </div>
      )}

      {/* Featured Info - Left Side (below location) */}
      {parcelMetadata && (
        <div className="absolute top-32 left-4 md:top-36 md:left-6">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 md:px-4 md:py-3 space-y-1">
            {parcelMetadata.Alan && (
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">📐</span>
                <span className="text-white text-xs md:text-sm">
                  {parcelMetadata.Alan} m² Arsa
                </span>
              </div>
            )}
            {parcelMetadata.Mevkii && (
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">🛣</span>
                <span className="text-white text-xs md:text-sm">
                  Ana Yola 300 m
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parcel Info - First 5 seconds (centered, with safe area margin) */}
      {showParcelInfo && overlays.parcelInfo && parcelMetadata && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3 md:px-6 md:py-4 text-center">
            {parcelMetadata.Ada && (
              <p className="text-white text-sm md:text-base">
                <span className="text-gray-400">Ada:</span> {parcelMetadata.Ada}
              </p>
            )}
            {parcelMetadata.ParselNo && (
              <p className="text-white text-sm md:text-base">
                <span className="text-gray-400">Parsel:</span> {parcelMetadata.ParselNo}
              </p>
            )}
            {parcelMetadata.Alan && (
              <p className="text-white text-sm md:text-base">
                <span className="text-gray-400">Alan:</span> {parcelMetadata.Alan} m²
              </p>
            )}
          </div>
        </div>
      )}

      {/* Nearby Info - Middle scenes (40-60% progress, top right with safe area) */}
      {overlays.nearbyPlaces && progress >= 0.40 && progress <= 0.60 && (
        <div className="absolute top-6 right-4 md:top-8 md:right-6">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 md:px-4 md:py-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">🏥</span>
              <span className="text-white text-xs">Hastane 1.2 km</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">🏫</span>
              <span className="text-white text-xs">Okul 850 m</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">🛒</span>
              <span className="text-white text-xs">Market 650 m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
