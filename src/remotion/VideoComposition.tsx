/**
 * SanalParsel - Cinematic Drone Video Renderer
 * 
 * Root component for Remotion video composition.
 * This renders inside the Remotion Player and controls
 * the entire cinematic video timeline.
 */

import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { CinematicIntro } from "./components/CinematicIntro";
import { MapCanvas } from "./components/MapCanvas";
import { CinematicOverlay } from "./components/CinematicOverlay";
import { POILayer } from "./components/POILayer";
import { Outro } from "./components/Outro";

export interface VideoCompositionProps {
  // Project metadata
  projectId: string;
  parcelName: string;
  parcelArea: string;
  
  // Parcel geometry
  parcelCenter: [number, number];
  parcelBounds: [[number, number], [number, number]];
  geoJson: object;
  
  // Drone settings
  duration: number;
  cameraModes: string[];
  cameraFeel: "soft" | "cinematic" | "dynamic";
  startHeight: number;
  
  // Environment (POI)
  pois: Array<{
    id: string;
    name: string;
    type: string;
    coordinates: [number, number];
    distance: string;
    category: string;
  }>;
  
  // Narration
  narrationText: string;
  narrationAudioUrl: string;
  wordTimings: Array<{ word: string; start: number; end: number }>;
  
  // Branding
  consultantName: string;
  consultantPhone: string;
  consultantLogoUrl: string;
  consultantAvatarUrl: string;
  
  // Video settings
  width: number;
  height: number;
  fps: number;
  quality: "premium" | "fast";
  
  // Style
  primaryColor: string;
}

export const VideoComposition: React.FC<VideoCompositionProps> = (props) => {
  const { 
    duration,
    narrationAudioUrl,
    quality
  } = props;

  // Timeline structure (in seconds)
  const introEnd = 3;
  const narrationEnd = duration - 5; // 5 seconds for outro
  const outroStart = narrationEnd;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a1f3d" }}>
      {/* Map Canvas - Base layer */}
      <Sequence from={0} durationInFrames={Math.ceil(duration * 30)}>
        <MapCanvas {...props} />
      </Sequence>

      {/* POI Layer - Over the map */}
      <Sequence from={Math.ceil(introEnd * 30)} durationInFrames={Math.ceil((narrationEnd - introEnd) * 30)}>
        <POILayer {...props} />
      </Sequence>

      {/* Cinematic Overlay - Text, branding */}
      <Sequence from={0} durationInFrames={Math.ceil(duration * 30)}>
        <CinematicOverlay 
          {...props}
          narrationEnd={narrationEnd}
        />
      </Sequence>

      {/* Intro animation */}
      <Sequence from={0} durationInFrames={Math.ceil(introEnd * 30)}>
        <CinematicIntro {...props} />
      </Sequence>

      {/* Outro with CTA */}
      <Sequence from={Math.ceil(outroStart * 30)} durationInFrames={Math.ceil((duration - outroStart) * 30)}>
        <Outro {...props} />
      </Sequence>
    </AbsoluteFill>
  );
};

export default VideoComposition;