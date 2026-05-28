/**
 * MapCanvas - Cinematic map rendering with camera animations
 * 
 * Features:
 * - Frame-by-frame map rendering
 * - 5 camera modes: orbit360, spiralDescend, topView, lowPass, fourCorners
 * - Smooth easing and cinematic camera movement
 * - Audio-reactive camera movements
 */

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VideoCompositionProps } from "../VideoComposition";

interface MapCanvasProps extends VideoCompositionProps {}

interface CameraKeyframe {
  time: number;
  lat: number;
  lon: number;
  zoom: number;
  pitch: number;
  bearing: number;
  duration: number;
}

// Cinematic easing
const cinematicEase = (t: number): number => {
  return t * t * (3 - 2 * t);
};

export const MapCanvas: React.FC<MapCanvasProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const {
    parcelCenter,
    duration,
    cameraModes,
    cameraFeel,
    wordTimings,
  } = props;

  // Calculate camera feel multipliers
  const feelMultiplier = useMemo(() => {
    switch (cameraFeel) {
      case "soft":
        return { speed: 0.7, intensity: 0.6 };
      case "cinematic":
        return { speed: 1.0, intensity: 1.0 };
      case "dynamic":
        return { speed: 1.4, intensity: 1.3 };
      default:
        return { speed: 1.0, intensity: 1.0 };
    }
  }, [cameraFeel]);

  // Parse parcel center
  const [centerLat, centerLon] = parcelCenter;

  // Generate camera keyframes based on modes
  const keyframes = useMemo((): CameraKeyframe[] => {
    const kfs: CameraKeyframe[] = [];
    const totalDuration = duration * fps;
    
    // Calculate durations for each mode
    const modeDuration = Math.floor(totalDuration / cameraModes.length);
    
    let currentTime = 0;
    
    cameraModes.forEach((mode, modeIndex) => {
      const startTime = currentTime;
      const endTime = startTime + modeDuration - 1;
      
      switch (mode) {
        case "orbit360": {
          // Circular orbit around the parcel
          const orbitRadius = 0.002; // ~200m
          const steps = 36;
          const angleStep = (360 / steps) * (Math.PI / 180);
          
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = t * 2 * Math.PI;
            
            kfs.push({
              time: startTime + t * modeDuration,
              lat: centerLat + Math.sin(angle) * orbitRadius,
              lon: centerLon + Math.cos(angle) * orbitRadius * 1.3,
              zoom: 16 - t * 0.5,
              pitch: 55 + Math.sin(t * Math.PI) * 5,
              bearing: t * 360,
              duration: modeDuration / steps,
            });
          }
          break;
        }
        
        case "spiralDescend": {
          // High to low spiral descent
          const startZoom = 13;
          const endZoom = 17;
          const startPitch = 70;
          const endPitch = 45;
          const steps = 24;
          
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const spiralAngle = t * 180 * (Math.PI / 180);
            
            kfs.push({
              time: startTime + t * modeDuration,
              lat: centerLat + Math.sin(spiralAngle) * 0.001 * t,
              lon: centerLon + Math.cos(spiralAngle) * 0.001 * t,
              zoom: startZoom + (endZoom - startZoom) * t,
              pitch: startPitch + (endPitch - startPitch) * t,
              bearing: -30 + t * 60,
              duration: modeDuration / steps,
            });
          }
          break;
        }
        
        case "topView": {
          // Top-down view with gentle drift
          const steps = 12;
          const driftRadius = 0.0005;
          
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            
            kfs.push({
              time: startTime + t * modeDuration,
              lat: centerLat + Math.sin(t * Math.PI * 2) * driftRadius,
              lon: centerLon + Math.cos(t * Math.PI * 2) * driftRadius,
              zoom: 17 + Math.sin(t * Math.PI) * 0.3,
              pitch: 89,
              bearing: 0,
              duration: modeDuration / steps,
            });
          }
          break;
        }
        
        case "lowPass": {
          // Low altitude fly-through
          const startBearing = -60;
          const endBearing = 120;
          
          for (let i = 0; i <= 18; i++) {
            const t = i / 18;
            const curve = Math.sin(t * Math.PI);
            
            kfs.push({
              time: startTime + t * modeDuration,
              lat: centerLat + (t - 0.5) * 0.003 * curve,
              lon: centerLon + (t - 0.3) * 0.002,
              zoom: 17.5 - curve * 1.5,
              pitch: 35 + curve * 15,
              bearing: startBearing + (endBearing - startBearing) * t,
              duration: modeDuration / 18,
            });
          }
          break;
        }
        
        case "fourCorners": {
          // View from 4 corners
          const corners = [
            { bearing: -45, zoom: 15 },
            { bearing: 45, zoom: 15.5 },
            { bearing: 135, zoom: 15 },
            { bearing: 225, zoom: 15.5 },
          ];
          
          corners.forEach((corner, idx) => {
            const cornerStart = startTime + (idx * modeDuration) / 4;
            const cornerEnd = cornerStart + modeDuration / 4 - 1;
            const cornerCenter = (cornerStart + cornerEnd) / 2;
            
            kfs.push({
              time: cornerCenter,
              lat: centerLat,
              lon: centerLon,
              zoom: corner.zoom,
              pitch: 50,
              bearing: corner.bearing,
              duration: modeDuration / 4,
            });
          });
          break;
        }
      }
      
      currentTime = endTime + 1;
    });
    
    return kfs;
  }, [cameraModes, duration, fps, centerLat, centerLon]);

  // Interpolate camera position from keyframes
  const camera = useMemo(() => {
    if (keyframes.length === 0) {
      return { lat: centerLat, lon: centerLon, zoom: 16, pitch: 55, bearing: 0 };
    }

    // Find surrounding keyframes
    let prevKf = keyframes[0];
    let nextKf = keyframes[0];

    for (let i = 0; i < keyframes.length; i++) {
      if (keyframes[i].time >= frame) {
        nextKf = keyframes[i];
        prevKf = keyframes[i - 1] || keyframes[i];
        break;
      }
      prevKf = keyframes[i];
      nextKf = keyframes[i];
    }

    // Calculate interpolation factor
    const duration = nextKf.time - prevKf.time;
    const t = duration > 0 ? (frame - prevKf.time) / duration : 0;

    // Apply cinematic easing based on feel
    const easedT = cinematicEase(
      Math.min(1, Math.max(0, t)) * feelMultiplier.speed
    );

    return {
      lat: prevKf.lat + (nextKf.lat - prevKf.lat) * easedT,
      lon: prevKf.lon + (nextKf.lon - prevKf.lon) * easedT,
      zoom: prevKf.zoom + (nextKf.zoom - prevKf.zoom) * easedT,
      pitch: prevKf.pitch + (nextKf.pitch - prevKf.pitch) * easedT,
      bearing: prevKf.bearing + (nextKf.bearing - prevKf.bearing) * easedT,
    };
  }, [keyframes, frame, centerLat, centerLon, feelMultiplier]);

  // Audio-reactive zoom based on word timings
  const audioZoomBoost = useMemo(() => {
    if (!wordTimings || wordTimings.length === 0) return 0;
    
    for (const timing of wordTimings) {
      const wordStart = timing.start * fps;
      const wordEnd = timing.end * fps;
      
      // Add zoom boost when word is spoken
      if (frame >= wordStart && frame <= wordEnd) {
        return 0.3 * feelMultiplier.intensity;
      }
    }
    return 0;
  }, [frame, wordTimings, fps, feelMultiplier]);

  // Calculate map transform
  const mapTransform = useMemo(() => {
    // Convert lat/lon to screen-space offset
    const latDiff = camera.lat - centerLat;
    const lonDiff = camera.lon - centerLon;
    
    // Scale factor for visual effect
    const scale = Math.pow(2, camera.zoom);
    
    // Translate in pixels (simplified mercator)
    const xOffset = -lonDiff * scale * 100;
    const yOffset = -latDiff * scale * 100;
    
    return {
      transform: `scale(${1 + audioZoomBoost})`,
      offset: { x: xOffset, y: yOffset },
      pitch: camera.pitch,
      bearing: camera.bearing,
      zoom: camera.zoom,
    };
  }, [camera, centerLat, centerLon, audioZoomBoost]);

  return (
    <AbsoluteFill>
      {/* Dark base */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, #0a1f3d 0%, #071429 100%)",
        }}
      />

      {/* Simulated satellite imagery using gradient pattern */}
      {/* In production, this would be replaced with actual map tiles */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 40% 30%, rgba(34, 90, 60, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 60% 70%, rgba(40, 80, 50, 0.3) 0%, transparent 40%),
            radial-gradient(ellipse at 30% 60%, rgba(45, 85, 55, 0.35) 0%, transparent 45%),
            linear-gradient(180deg, #1a3a2a 0%, #0f2a1a 50%, #0a1f15 100%)
          `,
          transform: `
            perspective(1000px)
            rotateX(${camera.pitch}deg)
            scale(${1 + audioZoomBoost * 0.5})
          `,
          transformOrigin: "center center",
          filter: `
            contrast(1.15)
            saturate(1.2)
            brightness(0.95)
          `,
        }}
      >
        {/* Parcel highlight overlay */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 150,
            height: 120,
            transform: `translate(-50%, -50%) rotate(${camera.bearing}deg)`,
            background: "transparent",
            border: "3px solid rgba(239, 68, 68, 0.8)",
            boxShadow: "0 0 30px rgba(239, 68, 68, 0.5), inset 0 0 20px rgba(239, 68, 68, 0.2)",
            borderRadius: 4,
          }}
        />
        
        {/* Parcel fill */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 150,
            height: 120,
            transform: `translate(-50%, -50%) rotate(${camera.bearing}deg)`,
            background: "rgba(239, 68, 68, 0.2)",
            borderRadius: 4,
          }}
        />
      </div>

      {/* Atmospheric fog effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(122, 162, 240, 0.15) 0%, transparent 30%, transparent 70%, rgba(10, 31, 61, 0.4) 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Cinematic vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 50%, rgba(7, 20, 41, 0.7) 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Motion blur effect for dynamic scenes */}
      {cameraFeel === "dynamic" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backdropFilter: "blur(1px)",
            opacity: 0.3,
          }}
        />
      )}
    </AbsoluteFill>
  );
};