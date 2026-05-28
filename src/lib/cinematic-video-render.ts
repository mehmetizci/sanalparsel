/**
 * CinematicVideoRenderService
 * 
 * Real MP4 video render pipeline using Remotion.
 * Handles:
 * - Composition building from project data
 * - Server-side render execution
 * - Progress tracking
 * - Supabase Storage upload
 */

import type { Feature, Polygon, MultiPolygon } from "geojson";

export interface RenderConfig {
  // Project info
  projectId: string;
  parcelName: string;
  parcelArea: string;
  
  // Parcel geometry
  parcelCenter: [number, number];
  parcelBounds: [[number, number], [number, number]];
  geoJson: Feature<Polygon | MultiPolygon>;
  
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

export interface RenderProgress {
  phase: "idle" | "preparing" | "bundling" | "capturing" | "rendering" | "encoding" | "uploading" | "finalizing" | "completed" | "failed";
  progress: number;
  message: string;
}

export interface RenderResult {
  success: boolean;
  outputUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
}

// Video quality presets
export const VIDEO_QUALITY_PRESETS = {
  premium: {
    width: 1080,
    height: 1920,
    fps: 30,
    bitrate: 20, // Mbps
    crf: 18,
  },
  fast: {
    width: 720,
    height: 1280,
    fps: 24,
    bitrate: 10,
    crf: 24,
  },
} as const;

// Camera modes configuration
export const CAMERA_MODE_CONFIG = {
  orbit360: {
    name: "Orbit 360",
    description: "360° circular orbit",
    icon: "🔄",
    keyframes: 36,
    defaultPitch: 55,
    defaultBearingRange: 360,
  },
  spiralDescend: {
    name: "Spiral Descent",
    description: "High to low spiral",
    icon: "🌀",
    keyframes: 24,
    defaultPitch: { min: 45, max: 70 },
    zoomRange: { start: 13, end: 17 },
  },
  topView: {
    name: "Top View",
    description: "Bird's eye view",
    icon: "👁️",
    keyframes: 12,
    defaultPitch: 89,
  },
  lowPass: {
    name: "Low Pass",
    description: "Low altitude fly-through",
    icon: "✈️",
    keyframes: 18,
    defaultPitch: { min: 30, max: 50 },
  },
  fourCorners: {
    name: "4 Corners",
    description: "View from 4 angles",
    icon: "📐",
    keyframes: 4,
    corners: [-45, 45, 135, 225],
  },
} as const;

// Camera feel configuration
export const CAMERA_FEEL_CONFIG = {
  soft: {
    name: "Yumuşak",
    description: "Slow, smooth movement",
    speed: 0.7,
    intensity: 0.6,
    easing: "easeInOut",
    motionBlur: false,
  },
  cinematic: {
    name: "Sinematik",
    description: "Dramatic, professional",
    speed: 1.0,
    intensity: 1.0,
    easing: "cinematic",
    motionBlur: true,
  },
  dynamic: {
    name: "Dinamik",
    description: "Fast, energetic",
    speed: 1.4,
    intensity: 1.3,
    easing: "linear",
    motionBlur: true,
  },
} as const;

/**
 * Generate composition props from render config
 */
export function generateCompositionProps(config: RenderConfig) {
  const qualityPreset = VIDEO_QUALITY_PRESETS[config.quality];
  
  return {
    projectId: config.projectId,
    parcelName: config.parcelName,
    parcelArea: config.parcelArea,
    parcelCenter: config.parcelCenter,
    parcelBounds: config.parcelBounds,
    geoJson: config.geoJson,
    duration: config.duration,
    cameraModes: config.cameraModes,
    cameraFeel: config.cameraFeel,
    startHeight: config.startHeight,
    pois: config.pois,
    narrationText: config.narrationText,
    narrationAudioUrl: config.narrationAudioUrl,
    wordTimings: config.wordTimings,
    consultantName: config.consultantName,
    consultantPhone: config.consultantPhone,
    consultantLogoUrl: config.consultantLogoUrl,
    consultantAvatarUrl: config.consultantAvatarUrl,
    width: config.width || qualityPreset.width,
    height: config.height || qualityPreset.height,
    fps: config.fps || qualityPreset.fps,
    quality: config.quality,
    primaryColor: config.primaryColor,
  };
}

/**
 * Validate render configuration
 */
export function validateRenderConfig(config: RenderConfig): string[] {
  const errors: string[] = [];
  
  if (!config.projectId) {
    errors.push("Proje ID gerekli");
  }
  
  if (!config.parcelCenter || config.parcelCenter.length !== 2) {
    errors.push("Parsel merkezi koordinatları gerekli");
  }
  
  if (!config.duration || config.duration < 15 || config.duration > 120) {
    errors.push("Video süresi 15-120 saniye arasında olmalı");
  }
  
  if (!config.cameraModes || config.cameraModes.length === 0) {
    errors.push("En az bir kamera modu seçilmeli");
  }
  
  if (!config.narrationText) {
    errors.push("Anlatım metni gerekli");
  }
  
  return errors;
}

/**
 * Estimate render time based on configuration
 */
export function estimateRenderTime(config: RenderConfig): number {
  // Base time in seconds
  const baseTime = 30;
  
  // Duration factor
  const durationFactor = config.duration / 30;
  
  // Quality factor (premium takes longer)
  const qualityFactor = config.quality === "premium" ? 1.5 : 1.0;
  
  // Number of POIs
  const poiFactor = 1 + (config.pois?.length || 0) * 0.05;
  
  // Camera modes complexity
  const modeFactor = 1 + config.cameraModes.length * 0.1;
  
  // Total estimate in seconds
  const estimatedSeconds = baseTime * durationFactor * qualityFactor * poiFactor * modeFactor;
  
  return Math.ceil(estimatedSeconds);
}

/**
 * Generate thumbnail URL from video URL
 */
export function generateThumbnailUrl(videoUrl: string): string {
  // In production, this would be the Supabase Storage thumbnail
  // For now, return a placeholder
  return videoUrl.replace(/\.mp4$/, "_thumb.jpg");
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Parse timeline events from word timings
 */
export function parseTimelineEvents(
  wordTimings: Array<{ word: string; start: number; end: number }>,
  poiNames: string[]
): Array<{ time: number; type: string; data: Record<string, unknown> }> {
  const events: Array<{ time: number; type: string; data: Record<string, unknown> }> = [];
  
  // POI highlight events
  for (const timing of wordTimings) {
    for (const poiName of poiNames) {
      const normalizedPoiName = poiName.toLowerCase().normalize("NFC");
      const normalizedWord = timing.word.toLowerCase().normalize("NFC");
      
      if (normalizedPoiName.includes(normalizedWord) || normalizedWord.includes(normalizedPoiName)) {
        events.push({
          time: timing.start,
          type: "poi_highlight",
          data: { poiName, word: timing.word },
        });
      }
    }
  }
  
  // Periodic zoom events
  const zoomInterval = 5;
  const lastEnd = wordTimings[wordTimings.length - 1]?.end || 30;
  
  for (let t = 2; t < lastEnd; t += zoomInterval) {
    events.push({
      time: t,
      type: "camera_zoom",
      data: { intensity: Math.random() * 0.3 + 0.2 },
    });
  }
  
  return events.sort((a, b) => a.time - b.time);
}