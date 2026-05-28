/**
 * Outro - Closing animation with CTA and branding
 * 
 * Features:
 * - Cinematic zoom out
 * - Consultant branding reveal
 * - Contact information
 * - Social media links
 * - Professional closing animation
 */

import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
  Img,
} from "remotion";

interface OutroProps {
  consultantName: string;
  consultantPhone: string;
  consultantLogoUrl: string;
  consultantAvatarUrl: string;
  primaryColor: string;
  width: number;
  height: number;
}

export const Outro: React.FC<OutroProps> = ({
  consultantName,
  consultantPhone,
  consultantLogoUrl,
  consultantAvatarUrl,
  primaryColor,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = 5 * fps; // 5 seconds outro

  // Parallax zoom out effect
  const zoomScale = interpolate(frame, [0, durationFrames], [0.95, 1.1], {
    extrapolateRight: "clamp",
  });

  // Fade in elements with stagger
  const avatarOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const nameOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const phoneOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: "clamp",
  });
  const logoOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Slide up animations
  const avatarY = interpolate(frame, [0, 30], [30, 0], {
    extrapolateRight: "clamp",
  });
  const nameY = interpolate(frame, [10, 40], [20, 0], {
    extrapolateRight: "clamp",
  });
  const phoneY = interpolate(frame, [20, 50], [20, 0], {
    extrapolateRight: "clamp",
  });

  // Overall fade out at end
  const fadeOut = interpolate(frame, [durationFrames - 30, durationFrames], [1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #0a1f3d 0%, #071429 50%, #050f1a 100%)",
        opacity: fadeOut,
      }}
    >
      {/* Background blur effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle at 30% 40%, ${primaryColor}15 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, ${primaryColor}10 0%, transparent 40%)
          `,
          filter: "blur(60px)",
        }}
      />

      {/* Cinematic vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(5, 15, 26, 0.8) 100%)`,
        }}
      />

      {/* Center content container */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `
            translate(-50%, -50%)
            scale(${zoomScale})
          `,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: primaryColor,
            border: "3px solid rgba(255,255,255,0.2)",
            boxShadow: `
              0 0 40px ${primaryColor}40,
              0 8px 40px rgba(0,0,0,0.5)
            `,
            overflow: "hidden",
            opacity: avatarOpacity,
            transform: `translateY(${avatarY}px)`,
          }}
        >
          {consultantAvatarUrl ? (
            <img
              src={consultantAvatarUrl}
              alt={consultantName}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)`,
              }}
            >
              <span
                style={{
                  color: "#fff",
                  fontSize: 40,
                  fontWeight: 700,
                  fontFamily: "sans-serif",
                }}
              >
                {consultantName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Consultant name */}
        <div
          style={{
            textAlign: "center",
            opacity: nameOpacity,
            transform: `translateY(${nameY}px)`,
          }}
        >
          <p
            style={{
              color: "#fff",
              fontSize: 28,
              fontWeight: 600,
              fontFamily: "sans-serif",
              margin: 0,
              letterSpacing: "0.02em",
              textShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            {consultantName}
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 14,
              fontFamily: "sans-serif",
              margin: "8px 0 0",
              letterSpacing: "0.05em",
            }}
          >
            Gayrimenkul Danışmanı
          </p>
        </div>

        {/* Phone number with CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(10px)",
            borderRadius: 100,
            padding: "12px 24px",
            border: "1px solid rgba(255,255,255,0.1)",
            opacity: phoneOpacity,
            transform: `translateY(${phoneY}px)`,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: primaryColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <span
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: 600,
              fontFamily: "sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            {consultantPhone}
          </span>
        </div>

        {/* Logo */}
        {consultantLogoUrl && (
          <div
            style={{
              marginTop: 16,
              opacity: logoOpacity,
            }}
          >
            <img
              src={consultantLogoUrl}
              alt="Logo"
              style={{
                height: 40,
                width: "auto",
                objectFit: "contain",
                filter: "brightness(0) invert(1)",
                opacity: 0.8,
              }}
            />
          </div>
        )}
      </div>

      {/* SanalParsel branding (small) */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: 0.4,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: primaryColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>S</span>
        </div>
        <span
          style={{
            color: "#fff",
            fontSize: 12,
            fontFamily: "sans-serif",
          }}
        >
          SanalParsel
        </span>
      </div>
    </AbsoluteFill>
  );
};