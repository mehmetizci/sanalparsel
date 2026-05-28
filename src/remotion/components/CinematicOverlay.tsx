/**
 * CinematicOverlay - Dynamic UI overlay for video
 * 
 * Features:
 * - Parcel information display
 * - Narration text with word highlighting
 * - Cinematic glassmorphism design
 * - Audio-reactive animations
 * - Premium typography
 */

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";

interface CinematicOverlayProps {
  parcelName: string;
  parcelArea: string;
  narrationText: string;
  wordTimings: Array<{ word: string; start: number; end: number }>;
  narrationEnd: number;
  primaryColor: string;
  width: number;
  height: number;
}

export const CinematicOverlay: React.FC<CinematicOverlayProps> = ({
  parcelName,
  parcelArea,
  narrationText,
  wordTimings,
  narrationEnd,
  primaryColor,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate current spoken word
  const currentWordIndex = useMemo(() => {
    const currentSeconds = frame / fps;
    for (let i = 0; i < wordTimings.length; i++) {
      if (currentSeconds >= wordTimings[i].start && currentSeconds <= wordTimings[i].end) {
        return i;
      }
    }
    return -1;
  }, [frame, wordTimings, fps]);

  // Parse narration into words with timing
  const words = useMemo(() => {
    return narrationText.split(/\s+/).filter(Boolean);
  }, [narrationText]);

  // Determine visibility based on narration phase
  const showOverlay = frame < narrationEnd * fps;
  const overlayOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: "clamp" });

  // Fade out near narration end
  const fadeOut = interpolate(frame, [(narrationEnd - 3) * fps, narrationEnd * fps], [1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {showOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: overlayOpacity * fadeOut,
            pointerEvents: "none",
          }}
        >
          {/* Top-left: Parcel info */}
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 40,
              background: "rgba(10, 31, 61, 0.85)",
              backdropFilter: "blur(20px)",
              borderRadius: 16,
              padding: "16px 24px",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            }}
          >
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily: "sans-serif",
                margin: 0,
              }}
            >
              Parsel Bilgisi
            </p>
            <p
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: 600,
                fontFamily: "sans-serif",
                margin: "4px 0 0",
                textShadow: "0 2px 10px rgba(0,0,0,0.5)",
              }}
            >
              {parcelName}
            </p>
            {parcelArea && (
              <p
                style={{
                  color: primaryColor,
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "sans-serif",
                  margin: "4px 0 0",
                }}
              >
                {parcelArea} m²
              </p>
            )}
          </div>

          {/* Bottom: Narration text with word highlighting */}
          <div
            style={{
              position: "absolute",
              bottom: 60,
              left: 40,
              right: 40,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "rgba(10, 31, 61, 0.8)",
                backdropFilter: "blur(20px)",
                borderRadius: 12,
                padding: "16px 32px",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
                maxWidth: width * 0.7,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  justifyContent: "center",
                }}
              >
                {words.map((word, index) => {
                  const isCurrentWord = index === currentWordIndex;
                  const isPastWord = index < currentWordIndex;

                  return (
                    <span
                      key={index}
                      style={{
                        color: isCurrentWord
                          ? "#fff"
                          : isPastWord
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(255,255,255,0.4)",
                        fontSize: 16,
                        fontWeight: isCurrentWord ? 700 : 400,
                        fontFamily: "sans-serif",
                        textShadow: isCurrentWord
                          ? "0 0 20px rgba(255,255,255,0.5)"
                          : "none",
                        transform: isCurrentWord ? "scale(1.1)" : "scale(1)",
                        transition: "all 0.15s ease-out",
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div
            style={{
              position: "absolute",
              bottom: 30,
              left: 40,
              right: 40,
              height: 2,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 1,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(frame / (narrationEnd * fps)) * 100}%`,
                background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}aa)`,
                borderRadius: 1,
                transition: "width 0.1s linear",
                boxShadow: `0 0 10px ${primaryColor}`,
              }}
            />
          </div>

          {/* Audio visualizer bars (simplified) */}
          <div
            style={{
              position: "absolute",
              right: 40,
              bottom: 150,
              display: "flex",
              gap: 3,
              alignItems: "flex-end",
              height: 40,
            }}
          >
            {[...Array(8)].map((_, i) => {
              const barHeight = interpolate(
                Math.sin(frame * 0.2 + i * 0.5),
                [-1, 1],
                [10, 40]
              );
              const isCenter = i === 3 || i === 4;
              
              return (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: barHeight,
                    background: isCenter
                      ? primaryColor
                      : "rgba(255,255,255,0.3)",
                    borderRadius: 2,
                    boxShadow: isCenter
                      ? `0 0 10px ${primaryColor}`
                      : "none",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};