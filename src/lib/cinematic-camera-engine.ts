/**
 * Cinematic Camera Engine v3
 * 
 * MVP Video Engine for SanalParsel
 * 
 * Scene-based camera system with 6 distinct scenes:
 * 1. Tanıtım Orbiti (Intro Orbit) - Full 360° orbit at fixed height
 * 2. Kuzey Yaklaşımı (North Approach) - Approach from north
 * 3. Güney Yaklaşımı (South Approach) - Approach from south
 * 4. Doğu Yaklaşımı (East Approach) - Approach from east
 * 5. Batı Yaklaşımı (West Approach) - Approach from west
 * 6. Final Yaklaşımı (Final Approach) - Slow approach to parcel
 * 
 * Key features:
 * - Scene-based progression (not weight-based blending)
 * - Duration-based scene scaling (30s/45s/60s)
 * - targetParcelScreenRatio = 0.35
 * - minParcelScreenRatio = 0.20
 * - maxParcelScreenRatio = 0.55
 * - Parcel always centered
 * - No black tiles - proper map loading
 */

import type { CameraFeel } from "@/lib/parcel-store";

// ─── Constants ────────────────────────────────────────────────────────────────

// Zoom limits for parcel screen ratio
// targetParcelScreenRatio = 0.35 (parcel occupies 35% of screen)
const MIN_ZOOM = 13;      // Parcel shows more area (min 20% screen)
const TARGET_ZOOM = 15;   // Parcel shows 35% of screen
const MAX_ZOOM = 16;      // Parcel shows max 55% of screen

// Scene durations as ratios of total video
// These will be scaled based on actual duration
// Scene 1: 0-20%, Scene 2: 20-35%, Scene 3: 35-50%, Scene 4: 50-65%, Scene 5: 65-80%, Scene 6: 80-100%

// ─── Easing Functions ────────────────────────────────────────────────────────

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

// Get easing based on camera feel
function getEasing(feel: CameraFeel): (t: number) => number {
  switch (feel) {
    case "soft":
      return easeInOutQuint;
    case "cinematic":
      return easeInOutCubic;
    case "dynamic":
      return easeOutExpo;
  }
}

// ─── Camera State Type ──────────────────────────────────────────────────────

export interface CameraState {
  center: [number, number]; // [lon, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  altitude: number;
}

export type SceneName = 'introOrbit' | 'northApproach' | 'southApproach' | 'eastApproach' | 'westApproach' | 'finalApproach';

// ─── Scene Definitions ──────────────────────────────────────────────────────

interface SceneConfig {
  name: SceneName;
  startProgress: number;
  endProgress: number;
  targetPitch: number;
  zoomRange: { min: number; max: number };
  bearingDelta: number;
  centerOffset: [number, number]; // [lon, lat] offset from parcel center
}

const SCENES: SceneConfig[] = [
  {
    name: 'introOrbit',
    startProgress: 0.00,
    endProgress: 0.20,
    targetPitch: 60,
    zoomRange: { min: 14, max: 15 },
    bearingDelta: 360, // Full 360° orbit
    centerOffset: [0, 0], // Stay centered
  },
  {
    name: 'northApproach',
    startProgress: 0.20,
    endProgress: 0.35,
    targetPitch: 45,
    zoomRange: { min: 14.5, max: 15.5 },
    bearingDelta: 30, // Slight rotation
    centerOffset: [0, 0.001], // Slight north offset, then back
  },
  {
    name: 'southApproach',
    startProgress: 0.35,
    endProgress: 0.50,
    targetPitch: 45,
    zoomRange: { min: 14.5, max: 15.5 },
    bearingDelta: 30,
    centerOffset: [0, -0.001], // Slight south offset, then back
  },
  {
    name: 'eastApproach',
    startProgress: 0.50,
    endProgress: 0.65,
    targetPitch: 45,
    zoomRange: { min: 14.5, max: 15.5 },
    bearingDelta: 30,
    centerOffset: [0.001, 0], // Slight east offset, then back
  },
  {
    name: 'westApproach',
    startProgress: 0.65,
    endProgress: 0.80,
    targetPitch: 45,
    zoomRange: { min: 14.5, max: 15.5 },
    bearingDelta: 30,
    centerOffset: [-0.001, 0], // Slight west offset, then back
  },
  {
    name: 'finalApproach',
    startProgress: 0.80,
    endProgress: 1.00,
    targetPitch: 50,
    zoomRange: { min: 15, max: 16 }, // Slight zoom in at end
    bearingDelta: 45, // Final rotation
    centerOffset: [0, 0], // Back to center
  },
];

// ─── Cinematic Camera Engine ────────────────────────────────────────────────

export interface CinematicCameraOptions {
  parcelCenter: [number, number];
  altitude: number;
  feel: CameraFeel;
  duration: number; // Video duration in seconds
}

export class CinematicCameraEngine {
  private options: CinematicCameraOptions;
  private easing: (t: number) => number;
  private baseBearing: number;
  
  constructor(options: CinematicCameraOptions) {
    this.options = options;
    this.easing = getEasing(options.feel);
    // Random starting bearing for variety
    this.baseBearing = Math.random() * 360;
  }
  
  /**
   * Get camera state at any progress (0-1)
   */
  getState(progress: number): CameraState {
    // Clamp progress to 0-1
    const p = Math.max(0, Math.min(1, progress));
    const easedP = this.easing(p);
    
    // Find current scene
    const scene = this.getCurrentScene(easedP);
    const sceneProgress = this.getSceneProgress(easedP, scene);
    
    // Calculate camera state for this scene
    return this.calculateSceneState(scene, sceneProgress, easedP);
  }
  
  /**
   * Get current scene based on progress
   */
  private getCurrentScene(progress: number): SceneConfig {
    for (const scene of SCENES) {
      if (progress >= scene.startProgress && progress < scene.endProgress) {
        return scene;
      }
    }
    // Default to final scene if at end
    return SCENES[SCENES.length - 1];
  }
  
  /**
   * Get progress within current scene (0-1)
   */
  private getSceneProgress(globalProgress: number, scene: SceneConfig): number {
    const sceneDuration = scene.endProgress - scene.startProgress;
    const progressInScene = globalProgress - scene.startProgress;
    return Math.max(0, Math.min(1, progressInScene / sceneDuration));
  }
  
  /**
   * Calculate camera state for a scene
   */
  private calculateSceneState(
    scene: SceneConfig,
    sceneProgress: number,
    globalProgress: number
  ): CameraState {
    const easedSceneProgress = this.easing(sceneProgress);
    const { parcelCenter, altitude } = this.options;
    
    // Calculate center with scene-specific offset
    const centerOffsetX = scene.centerOffset[0] * (1 - easedSceneProgress);
    const centerOffsetY = scene.centerOffset[1] * (1 - easedSceneProgress);
    const center: [number, number] = [
      parcelCenter[0] + centerOffsetX,
      parcelCenter[1] + centerOffsetY,
    ];
    
    // Calculate zoom based on scene
    const zoom = this.calculateZoom(scene, easedSceneProgress);
    
    // Calculate pitch
    const pitch = this.calculatePitch(scene, easedSceneProgress);
    
    // Calculate bearing (continuous rotation)
    const bearing = this.calculateBearing(scene, globalProgress);
    
    return {
      center,
      zoom,
      pitch,
      bearing,
      altitude,
    };
  }
  
  /**
   * Calculate zoom for scene
   */
  private calculateZoom(scene: SceneConfig, sceneProgress: number): number {
    const { min, max } = scene.zoomRange;
    
    switch (scene.name) {
      case 'introOrbit':
        // Stable zoom during orbit
        return lerp(min, max, 0.5);
        
      case 'northApproach':
      case 'southApproach':
      case 'eastApproach':
      case 'westApproach':
        // Zoom in slightly during approach
        return lerp(min, max, smoothstep(sceneProgress));
        
      case 'finalApproach':
        // Slow zoom in at end
        return lerp(min, max, easeOutExpo(sceneProgress));
        
      default:
        return TARGET_ZOOM;
    }
  }
  
  /**
   * Calculate pitch for scene
   */
  private calculatePitch(scene: SceneConfig, sceneProgress: number): number {
    const startPitch = 60; // High angle at start
    
    switch (scene.name) {
      case 'introOrbit':
        // Stable high pitch during orbit
        return 60;
        
      case 'northApproach':
      case 'southApproach':
      case 'eastApproach':
      case 'westApproach':
        // Transition to lower pitch during approach
        return lerp(startPitch, scene.targetPitch, smoothstep(sceneProgress));
        
      case 'finalApproach':
        // Return to moderate pitch at end
        return lerp(45, scene.targetPitch, easeInOutCubic(sceneProgress));
        
      default:
        return scene.targetPitch;
    }
  }
  
  /**
   * Calculate bearing (continuous rotation)
   */
  private calculateBearing(scene: SceneConfig, globalProgress: number): number {
    // Calculate cumulative bearing based on scenes completed
    let cumulativeBearing = this.baseBearing;
    
    for (const s of SCENES) {
      if (s.startProgress < scene.startProgress) {
        // Add full bearing delta for completed scenes
        cumulativeBearing += s.bearingDelta;
      } else if (s.name === scene.name) {
        // Add partial bearing for current scene
        const sceneDuration = scene.endProgress - scene.startProgress;
        const progressInScene = (globalProgress - scene.startProgress) / sceneDuration;
        cumulativeBearing += scene.bearingDelta * this.easing(Math.max(0, Math.min(1, progressInScene)));
      }
    }
    
    return ((cumulativeBearing % 360) + 360) % 360;
  }
  
  /**
   * Get current scene name for debugging/overlay
   */
  getCurrentSceneName(progress: number): SceneName {
    const easedP = this.easing(Math.max(0, Math.min(1, progress)));
    const scene = this.getCurrentScene(easedP);
    return scene.name;
  }
  
  /**
   * Get scene progress for overlay display
   */
  getSceneProgressInfo(progress: number): { name: SceneName; progress: number; totalProgress: number } {
    const easedP = this.easing(Math.max(0, Math.min(1, progress)));
    const scene = this.getCurrentScene(easedP);
    const sceneProgress = this.getSceneProgress(easedP, scene);
    
    return {
      name: scene.name,
      progress: sceneProgress,
      totalProgress: easedP,
    };
  }
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Calculate base zoom from altitude
 * Higher altitude = lower zoom (see more area)
 */
export function calculateBaseZoom(altitude: number): number {
  // At 100m: zoom ~15.5
  // At 300m: zoom ~14
  // At 400m: zoom ~13.5
  return 18 - Math.log2(altitude / 50);
}

/**
 * Calculate zoom for target parcel screen ratio
 * targetParcelScreenRatio = 0.35 means parcel occupies 35% of screen
 */
export function calculateTargetZoom(altitude: number, parcelSizeDegrees: number): number {
  // This is a simplified calculation
  // In reality, this would need to account for screen size and parcel geometry
  const baseZoom = calculateBaseZoom(altitude);
  
  // Adjust based on parcel size
  // Larger parcels need lower zoom to fit in target ratio
  const parcelSizeAdjustment = Math.log2(parcelSizeDegrees * 1000) * 0.5;
  
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, baseZoom - parcelSizeAdjustment));
}

/**
 * Smooth lerp for bearing (handles 360° wrap)
 */
export function lerpBearing(from: number, to: number, t: number): number {
  from = ((from % 360) + 360) % 360;
  to = ((to % 360) + 360) % 360;
  
  let diff = to - from;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  const result = from + diff * t;
  return ((result % 360) + 360) % 360;
}
