/**
 * Camera Blending Engine v2.1
 * 
 * A seamless camera behavior system that blends multiple camera modes
 * simultaneously, creating a single continuous professional drone flight.
 * 
 * Key concepts:
 * - All camera behaviors are ALWAYS active
 * - Each behavior has a weight (0-1) that determines its influence
 * - Weights change smoothly over time - one increases as another decreases
 * - The viewer never sees transitions - just one continuous flight
 */

import type { CameraFeel } from "@/lib/parcel-store";

// ─── Easing functions ─────────────────────────────────────────────────────────

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

// Get easing based on camera feel
export function getEasing(feel: CameraFeel): (t: number) => number {
  switch (feel) {
    case "soft":
      return easeInOutQuint; // Very smooth, long easing
    case "cinematic":
      return easeInOutCubic; // Balanced cinematic
    case "dynamic":
      return easeOutExpo; // Faster, snappier
  }
}

// ─── Camera State Types ────────────────────────────────────────────────────────

export interface CameraState {
  center: [number, number]; // [lon, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  altitude: number;
}

export interface CameraBehavior {
  getState(progress: number, baseState: CameraState, parcelCenter: [number, number]): CameraState;
  getWeight(progress: number): number;
}

// ─── Sinematic Profile (Default) ─────────────────────────────────────────────

/**
 * Sinematic Profile:
 * - Progress 0.00-0.20: Hero Zoom dominant (100%)
 * - Progress 0.20-0.50: Hero fades, Orbit rises (30% Hero, 70% Orbit)
 * - Progress 0.50-0.75: Orbit fades, Reveal rises (40% Orbit, 60% Reveal)
 * - Progress 0.75-1.00: Reveal fades, Final Orbit rises (20% Reveal, 80% Final)
 */
export class CinematicProfile {
  private feel: CameraFeel;
  private ease: (t: number) => number;

  constructor(feel: CameraFeel) {
    this.feel = feel;
    this.ease = getEasing(feel);
  }

  // Get all behavior weights at a given progress
  getWeights(progress: number): { hero: number; orbit: number; reveal: number; final: number } {
    const p = this.ease(progress);
    
    // Progress 0.00-0.20: Hero dominant
    // Progress 0.20-0.50: Hero → Orbit
    // Progress 0.50-0.75: Orbit → Reveal
    // Progress 0.75-1.00: Reveal → Final
    
    let hero = 0, orbit = 0, reveal = 0, final = 0;
    
    if (p <= 0.20) {
      // Hero zone (0-20%)
      const t = p / 0.20;
      hero = 1;
      orbit = 0;
      reveal = 0;
      final = 0;
    } else if (p <= 0.50) {
      // Hero → Orbit transition (20-50%)
      const t = (p - 0.20) / 0.30;
      hero = 1 - t * (0.70 / 0.30); // 100% → 30%
      orbit = t * (0.70 / 0.30); // 0% → 70%
      reveal = 0;
      final = 0;
    } else if (p <= 0.75) {
      // Orbit → Reveal transition (50-75%)
      const t = (p - 0.50) / 0.25;
      hero = 0;
      orbit = 0.70 * (1 - t) + 0.40 * t; // 70% → 40%
      reveal = 0.30 * t; // 0% → 60%
      final = 0;
    } else {
      // Reveal → Final transition (75-100%)
      const t = (p - 0.75) / 0.25;
      hero = 0;
      orbit = 0;
      reveal = 0.60 * (1 - t) + 0.20 * t; // 60% → 20%
      final = 0.40 * t; // 0% → 80%
    }
    
    // Soft profile adjusts transition speeds
    if (this.feel === "soft") {
      // More gradual transitions
      hero = Math.max(0, hero);
      orbit = Math.max(0, orbit);
      reveal = Math.max(0, reveal);
      final = Math.max(0, final);
    }
    
    // Dynamic profile adjusts speeds
    if (this.feel === "dynamic") {
      // Sharper transitions
      const sharp = smoothstep;
      hero = sharp(hero);
      orbit = sharp(orbit);
      reveal = sharp(reveal);
      final = sharp(final);
    }
    
    return { hero, orbit, reveal, final };
  }
}

// ─── Hero Zoom Behavior ────────────────────────────────────────────────────────

export class HeroZoomBehavior implements CameraBehavior {
  private baseZoom: number;
  private startBearing: number;
  private feel: CameraFeel;

  constructor(baseZoom: number, startBearing: number, feel: CameraFeel) {
    this.baseZoom = baseZoom;
    this.startBearing = startBearing;
    this.feel = feel;
  }

  getWeight(progress: number): number {
    // Hero is most dominant in first 20% (but blended throughout)
    if (progress <= 0.2) return 1.0;
    if (progress <= 0.35) return 1.0 - (progress - 0.2) / 0.15 * 0.7;
    return 0.3;
  }

  getState(progress: number, baseState: CameraState, parcelCenter: [number, number]): CameraState {
    // Hero starts far, zooms in while slightly rotating
    const startOffset = this.feel === "soft" ? 0.008 : 0.006;
    const zoomRange = this.feel === "soft" ? 2.5 : this.feel === "dynamic" ? 3.0 : 2.8;
    
    // Start from far position
    const startLon = parcelCenter[0];
    const startLat = parcelCenter[1] + startOffset;
    
    // Interpolate to center
    const t = smoothstep(Math.min(progress * 2, 1));
    
    const center: [number, number] = [
      startLon + (parcelCenter[0] - startLon) * t,
      startLat + (parcelCenter[1] - startLat) * t,
    ];
    
    // Zoom in from far to close
    const zoomStart = this.baseZoom - zoomRange;
    const zoomEnd = this.baseZoom + 0.3;
    const zoom = zoomStart + (zoomEnd - zoomStart) * t;
    
    // Subtle rotation during zoom
    const bearingDelta = this.feel === "soft" ? 10 : this.feel === "dynamic" ? 25 : 15;
    const bearing = this.startBearing + bearingDelta * t;
    
    // Pitch stays relatively high, slight dip in middle
    const pitchStart = 55;
    const pitchEnd = this.feel === "soft" ? 45 : this.feel === "dynamic" ? 60 : 50;
    const pitch = pitchStart + (pitchEnd - pitchStart) * t;
    
    return {
      center,
      zoom: Math.max(13, Math.min(19, zoom)),
      pitch,
      bearing: ((bearing % 360) + 360) % 360,
      altitude: baseState.altitude,
    };
  }
}

// ─── Orbit Behavior ───────────────────────────────────────────────────────────

export class OrbitBehavior implements CameraBehavior {
  private baseZoom: number;
  private feel: CameraFeel;
  private orbitRadius: number;
  private rotationSpeed: number;

  constructor(baseZoom: number, feel: CameraFeel) {
    this.baseZoom = baseZoom;
    this.feel = feel;
    this.orbitRadius = feel === "soft" ? 0.002 : feel === "dynamic" ? 0.003 : 0.0025;
    this.rotationSpeed = feel === "soft" ? 270 : feel === "dynamic" ? 420 : 360;
  }

  getWeight(progress: number): number {
    // Orbit is dominant in 20-50% range
    if (progress < 0.15) return 0;
    if (progress < 0.25) return (progress - 0.15) / 0.10;
    if (progress < 0.50) return 1.0;
    if (progress < 0.60) return 1.0 - (progress - 0.50) / 0.10 * 0.6;
    return 0.4;
  }

  getState(progress: number, baseState: CameraState, parcelCenter: [number, number]): CameraState {
    // Full 360° orbit around parcel center
    const normalizedProgress = Math.max(0, (progress - 0.15) / 0.35);
    const angle = normalizedProgress * this.rotationSpeed * (Math.PI / 180);
    
    // Orbit around center (no offset needed - center stays locked)
    const center: [number, number] = [parcelCenter[0], parcelCenter[1]];
    
    // Zoom stays relatively stable during orbit
    const zoomOffset = this.feel === "soft" ? -0.5 : this.feel === "dynamic" ? 0.2 : 0;
    const zoom = this.baseZoom + zoomOffset + Math.sin(normalizedProgress * Math.PI * 2) * 0.3;
    
    // Bearing rotates around center
    const bearing = normalizedProgress * this.rotationSpeed;
    
    // High pitch for cinematic view
    const pitch = this.feel === "soft" ? 55 : this.feel === "dynamic" ? 65 : 60;
    
    return {
      center,
      zoom: Math.max(13, Math.min(19, zoom)),
      pitch,
      bearing: ((bearing % 360) + 360) % 360,
      altitude: baseState.altitude,
    };
  }
}

// ─── Reveal Behavior ──────────────────────────────────────────────────────────

export class RevealBehavior implements CameraBehavior {
  private baseZoom: number;
  private feel: CameraFeel;

  constructor(baseZoom: number, feel: CameraFeel) {
    this.baseZoom = baseZoom;
    this.feel = feel;
  }

  getWeight(progress: number): number {
    // Reveal is dominant in 50-75% range
    if (progress < 0.45) return 0;
    if (progress < 0.55) return (progress - 0.45) / 0.10 * 0.8;
    if (progress <= 0.75) return 0.8 + (progress - 0.55) / 0.20 * 0.2;
    if (progress < 0.85) return 1.0 - (progress - 0.75) / 0.10 * 0.6;
    return 0.4;
  }

  getState(progress: number, baseState: CameraState, parcelCenter: [number, number]): CameraState {
    // Reveal: Top-down approach that shows parcel and context
    const normalizedProgress = Math.max(0, (progress - 0.45) / 0.35);
    
    // Slight offset for dynamic view, centered for soft
    const offsetAmount = this.feel === "soft" ? 0.001 : this.feel === "dynamic" ? 0.002 : 0.0015;
    const center: [number, number] = [
      parcelCenter[0] + offsetAmount * Math.sin(normalizedProgress * Math.PI),
      parcelCenter[1] + offsetAmount * Math.cos(normalizedProgress * Math.PI * 0.5),
    ];
    
    // Zoom to show parcel clearly (don't zoom too much)
    const zoomMin = this.feel === "soft" ? 14.5 : this.feel === "dynamic" ? 15 : 14.8;
    const zoomMax = this.feel === "soft" ? 16 : this.feel === "dynamic" ? 17 : 16.5;
    const zoom = zoomMin + (zoomMax - zoomMin) * Math.sin(normalizedProgress * Math.PI * 0.7);
    
    // Pitch transitions from high (60°) to top-down (15-25°)
    const pitchStart = 60;
    const pitchEnd = this.feel === "soft" ? 15 : this.feel === "dynamic" ? 25 : 20;
    const pitch = pitchStart + (pitchEnd - pitchStart) * smoothstep(normalizedProgress);
    
    // Slight rotation for visual interest
    const bearingDelta = this.feel === "soft" ? 20 : this.feel === "dynamic" ? 40 : 30;
    const bearing = baseState.bearing + bearingDelta * normalizedProgress;
    
    return {
      center,
      zoom: Math.max(13, Math.min(19, zoom)),
      pitch,
      bearing: ((bearing % 360) + 360) % 360,
      altitude: baseState.altitude,
    };
  }
}

// ─── Final Orbit Behavior ─────────────────────────────────────────────────────

export class FinalOrbitBehavior implements CameraBehavior {
  private baseZoom: number;
  private feel: CameraFeel;
  private rotationSpeed: number;

  constructor(baseZoom: number, feel: CameraFeel) {
    this.baseZoom = baseZoom;
    this.feel = feel;
    this.rotationSpeed = feel === "soft" ? 240 : feel === "dynamic" ? 360 : 300;
  }

  getWeight(progress: number): number {
    // Final orbit rises from 75% onwards
    if (progress < 0.70) return 0;
    if (progress < 0.80) return (progress - 0.70) / 0.10 * 0.6;
    return 0.6 + (progress - 0.80) / 0.20 * 0.4;
  }

  getState(progress: number, baseState: CameraState, parcelCenter: [number, number]): CameraState {
    // Final orbit: Elegant 360° with slight zoom out
    const normalizedProgress = Math.max(0, (progress - 0.70) / 0.30);
    const angle = normalizedProgress * this.rotationSpeed * (Math.PI / 180);
    
    // Center stays locked on parcel
    const center: [number, number] = parcelCenter;
    
    // Slight zoom out at end for dramatic effect
    const zoomOffset = this.feel === "soft" ? -1.0 : this.feel === "dynamic" ? 0.5 : -0.3;
    const zoom = this.baseZoom + zoomOffset + Math.sin(normalizedProgress * Math.PI * 0.5) * 0.5;
    
    // Bearing rotates
    const bearing = baseState.bearing + this.rotationSpeed * normalizedProgress;
    
    // Pitch: slightly lower for final dramatic shot
    const pitch = this.feel === "soft" ? 50 : this.feel === "dynamic" ? 62 : 55;
    
    return {
      center,
      zoom: Math.max(13, Math.min(19, zoom)),
      pitch,
      bearing: ((bearing % 360) + 360) % 360,
      altitude: baseState.altitude,
    };
  }
}

// ─── Camera Blending Engine ────────────────────────────────────────────────────

export interface BlendingEngineOptions {
  parcelCenter: [number, number];
  baseZoom: number;
  startBearing: number;
  altitude: number;
  feel: CameraFeel;
}

export class CameraBlendingEngine {
  private hero: HeroZoomBehavior;
  private orbit: OrbitBehavior;
  private reveal: RevealBehavior;
  private final: FinalOrbitBehavior;
  private profile: CinematicProfile;
  private options: BlendingEngineOptions;

  constructor(options: BlendingEngineOptions) {
    this.options = options;
    
    this.hero = new HeroZoomBehavior(options.baseZoom, options.startBearing, options.feel);
    this.orbit = new OrbitBehavior(options.baseZoom, options.feel);
    this.reveal = new RevealBehavior(options.baseZoom, options.feel);
    this.final = new FinalOrbitBehavior(options.baseZoom, options.feel);
    this.profile = new CinematicProfile(options.feel);
  }

  /**
   * Get blended camera state at any progress (0-1)
   */
  getState(progress: number): CameraState {
    // Clamp progress to 0-1
    const p = Math.max(0, Math.min(1, progress));
    
    // Get all behavior states
    const baseState: CameraState = {
      center: this.options.parcelCenter,
      zoom: this.options.baseZoom,
      pitch: 60,
      bearing: this.options.startBearing,
      altitude: this.options.altitude,
    };
    
    const heroState = this.hero.getState(p, baseState, this.options.parcelCenter);
    const orbitState = this.orbit.getState(p, baseState, this.options.parcelCenter);
    const revealState = this.reveal.getState(p, baseState, this.options.parcelCenter);
    const finalState = this.final.getState(p, baseState, this.options.parcelCenter);
    
    // Get weights from profile
    const weights = this.profile.getWeights(p);
    
    // Normalize weights (they should sum to ~1, but just in case)
    const totalWeight = weights.hero + weights.orbit + weights.reveal + weights.final;
    const normalizedWeights = {
      hero: weights.hero / totalWeight,
      orbit: weights.orbit / totalWeight,
      reveal: weights.reveal / totalWeight,
      final: weights.final / totalWeight,
    };
    
    // Blend all values
    const blendedCenter: [number, number] = [
      heroState.center[0] * normalizedWeights.hero +
      orbitState.center[0] * normalizedWeights.orbit +
      revealState.center[0] * normalizedWeights.reveal +
      finalState.center[0] * normalizedWeights.final,
      
      heroState.center[1] * normalizedWeights.hero +
      orbitState.center[1] * normalizedWeights.orbit +
      revealState.center[1] * normalizedWeights.reveal +
      finalState.center[1] * normalizedWeights.final,
    ];
    
    const blendedZoom =
      heroState.zoom * normalizedWeights.hero +
      orbitState.zoom * normalizedWeights.orbit +
      revealState.zoom * normalizedWeights.reveal +
      finalState.zoom * normalizedWeights.final;
    
    const blendedPitch =
      heroState.pitch * normalizedWeights.hero +
      orbitState.pitch * normalizedWeights.orbit +
      revealState.pitch * normalizedWeights.reveal +
      finalState.pitch * normalizedWeights.final;
    
    const blendedBearing =
      heroState.bearing * normalizedWeights.hero +
      orbitState.bearing * normalizedWeights.orbit +
      revealState.bearing * normalizedWeights.reveal +
      finalState.bearing * normalizedWeights.final;
    
    return {
      center: blendedCenter,
      zoom: blendedZoom,
      pitch: Math.max(0, Math.min(85, blendedPitch)),
      bearing: ((blendedBearing % 360) + 360) % 360,
      altitude: this.options.altitude,
    };
  }

  /**
   * Get debug info about current weights
   */
  getWeights(progress: number) {
    return this.profile.getWeights(progress);
  }
}

// ─── Utility Functions ─────────────────────────────────────────────────────────

/**
 * Calculate base zoom from altitude
 */
export function calculateBaseZoom(altitude: number): number {
  // Higher altitude = lower zoom
  // Roughly: zoom 16 at 100m, zoom 14 at 400m
  return 18 - Math.log2(altitude / 50);
}

/**
 * Smooth lerp for bearing (handles 360° wrap)
 */
export function lerpBearing(from: number, to: number, t: number): number {
  // Normalize to 0-360
  from = ((from % 360) + 360) % 360;
  to = ((to % 360) + 360) % 360;
  
  // Find shortest path
  let diff = to - from;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  let result = from + diff * t;
  return ((result % 360) + 360) % 360;
}

/**
 * Smooth lerp for center coordinates
 */
export function lerpCenter(
  from: [number, number],
  to: [number, number],
  t: number
): [number, number] {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
  ];
}