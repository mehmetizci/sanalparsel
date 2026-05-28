/**
 * CinematicIntro - Opening animation sequence
 * 
 * Features:
 * - Logo reveal with cinematic zoom
 * - High-altitude drone shot feel
 * - Smooth fade transitions
 * - Premium typography reveal
 */

import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";

interface CinematicIntroProps {
  consultantName: string;
  consultantLogoUrl: string;
  primaryColor: string;
  width: number;
  height: number;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({
  consultantName,
  consultantLogoUrl,
  primaryColor,
  width,
  height,
}) => {
  const frame = useCurrentFrame();

  // Logo entrance animation (0-1.5s)
  const logoScale = interpolate(frame, [0, 30], [0.3, 1], {
    extrapolateRight: "clamp",
  });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Text reveal (1-2.5s)
  const textOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: "clamp",
  });
  const textY = interpolate(frame, [30, 60], [20, 0], {
    extrapolateRight: "clamp",
  });

  // Fade out (2.5-3s)
  const fadeOpacity = interpolate(frame, [70, 90], [1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "transparent",
        opacity: fadeOpacity,
      }}
    >
      {/* Cinematic vignette effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(10, 31, 61, 0.8) 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          top: height * 0.35,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        {consultantLogoUrl ? (
          <img
            src={consultantLogoUrl}
            alt="Logo"
            style={{
              width: Math.min(width * 0.25, 200),
              height: "auto",
              filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.5))",
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 24,
              background: `linear-gradient(135deg, ${primaryColor}, #1a3a5c)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: 48,
                fontWeight: 700,
                fontFamily: "sans-serif",
              }}
            >
              {consultantName.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Consultant name text */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.35,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
        }}
      >
        <p
          style={{
            color: "#fff",
            fontSize: Math.min(width * 0.035, 28),
            fontWeight: 600,
            letterSpacing: "0.05em",
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
            fontFamily: "sans-serif",
            margin: 0,
          }}
        >
          {consultantName}
        </p>
      </div>
    </AbsoluteFill>
  );
};