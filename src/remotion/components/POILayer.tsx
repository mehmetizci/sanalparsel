/**
 * POILayer - Points of Interest visualization
 * 
 * Features:
 * - World-locked markers that move with the map
 * - Pulse animation for active POIs
 * - Distance labels
 * - Category-based styling
 * - Audio-reactive highlighting
 */

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";

interface POILayerProps {
  pois: Array<{
    id: string;
    name: string;
    type: string;
    coordinates: [number, number];
    distance: string;
    category: string;
  }>;
  parcelCenter: [number, number];
  wordTimings: Array<{ word: string; start: number; end: number }>;
  width: number;
  height: number;
}

// POI category colors
const categoryColors: Record<string, { bg: string; border: string; icon: string }> = {
  market: { bg: "rgba(34, 197, 94, 0.9)", border: "#22c55e", icon: "🛒" },
  health: { bg: "rgba(239, 68, 68, 0.9)", border: "#ef4444", icon: "🏥" },
  school: { bg: "rgba(59, 130, 246, 0.9)", border: "#3b82f6", icon: "🏫" },
  transport: { bg: "rgba(234, 179, 8, 0.9)", border: "#eab308", icon: "🚌" },
  shopping: { bg: "rgba(168, 85, 247, 0.9)", border: "#a855f7", icon: "🏬" },
  restaurant: { bg: "rgba(249, 115, 22, 0.9)", border: "#f97316", icon: "🍽️" },
  default: { bg: "rgba(99, 102, 241, 0.9)", border: "#6366f1", icon: "📍" },
};

export const POILayer: React.FC<POILayerProps> = ({
  pois,
  parcelCenter,
  wordTimings,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Find currently spoken word for audio-reactive effects
  const activeWord = useMemo(() => {
    const currentSeconds = frame / fps;
    for (const timing of wordTimings) {
      if (currentSeconds >= timing.start && currentSeconds <= timing.end) {
        return timing.word.toLowerCase();
      }
    }
    return null;
  }, [frame, wordTimings, fps]);

  // Calculate POI positions (relative to parcel center)
  const poiPositions = useMemo(() => {
    return pois.map((poi, index) => {
      // Distribute POIs around the parcel
      const angle = (index / pois.length) * 2 * Math.PI - Math.PI / 2;
      const radius = 0.004 + Math.random() * 0.002; // 400-600m radius

      // Convert to screen coordinates
      const x = width / 2 + Math.cos(angle) * radius * 80000;
      const y = height / 2 + Math.sin(angle) * radius * 80000;

      return {
        ...poi,
        x,
        y,
        angle,
        color: categoryColors[poi.category] || categoryColors.default,
        // Stagger entrance timing
        entranceStart: 90 + index * 15, // frames
      };
    });
  }, [pois, width, height]);

  return (
    <AbsoluteFill>
      {poiPositions.map((poi, index) => {
        // Entrance animation
        const entranceProgress = interpolate(
          frame,
          [poi.entranceStart, poi.entranceStart + 30],
          [0, 1],
          { extrapolateRight: "clamp" }
        );

        // Pulse animation for active POI
        const isActive = activeWord && poi.name.toLowerCase().includes(activeWord);
        const pulseScale = isActive
          ? interpolate(Math.sin(frame * 0.1), [-1, 1], [1, 1.3])
          : 1;

        // Glow effect for active POI
        const glowOpacity = isActive
          ? interpolate(Math.sin(frame * 0.15), [-1, 1], [0.3, 0.7])
          : 0;

        return (
          <div
            key={poi.id}
            style={{
              position: "absolute",
              left: poi.x,
              top: poi.y,
              transform: `
                translate(-50%, -50%)
                scale(${entranceProgress * pulseScale})
                rotate(${entranceProgress * -10}deg)
              `,
              opacity: entranceProgress,
              transition: "transform 0.3s ease-out",
            }}
          >
            {/* Glow effect */}
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  inset: -20,
                  background: `radial-gradient(circle, ${poi.color.border}40 0%, transparent 70%)`,
                  borderRadius: "50%",
                  opacity: glowOpacity,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            )}

            {/* POI marker */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              {/* Pin icon */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: poi.color.bg,
                  border: `2px solid ${poi.color.border}`,
                  boxShadow: `
                    0 4px 20px rgba(0,0,0,0.4),
                    0 0 ${isActive ? 30 : 15}px ${poi.color.border}${isActive ? "80" : "40"}
                  `,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(10px)",
                }}
              >
                <span style={{ fontSize: 20 }}>{poi.color.icon}</span>
              </div>

              {/* Pin tail */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderTop: `12px solid ${poi.color.border}`,
                  transform: "translateY(-6px)",
                }}
              />

              {/* Label */}
              <div
                style={{
                  background: "rgba(10, 31, 61, 0.9)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  minWidth: 80,
                }}
              >
                <p
                  style={{
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "sans-serif",
                    margin: 0,
                    textAlign: "center",
                    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  {poi.name}
                </p>
                {poi.distance && (
                  <p
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 10,
                      fontFamily: "sans-serif",
                      margin: "2px 0 0",
                      textAlign: "center",
                    }}
                  >
                    {poi.distance}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};