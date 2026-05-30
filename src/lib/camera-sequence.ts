import type { 
  DroneSettingsState, 
  CameraSequence, 
  CameraSequenceStep, 
  CameraSequenceMode,
  CameraFeel
} from "@/lib/parcel-store";

/**
 * Easing functions based on camera feel
 */
function getEasing(feel: CameraFeel): (t: number) => number {
  switch (feel) {
    case "soft":
      // Very smooth, slow ease
      return (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case "cinematic":
      // Smooth with slight acceleration/deceleration
      return (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case "dynamic":
      // Faster, more aggressive
      return (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t - 2, 4) / 2;
  }
}

/**
 * Get pitch range based on camera feel
 */
function getPitchRange(feel: CameraFeel, mode: CameraSequenceMode): { start: number; end: number } {
  switch (mode) {
    case "heroZoom":
      // Start shallow, end steep looking down
      return { start: 25, end: 60 };
    case "orbit360":
      // High angle, cinematic view
      return { start: feel === "dynamic" ? 62 : feel === "soft" ? 50 : 57, end: feel === "dynamic" ? 62 : feel === "soft" ? 50 : 57 };
    case "spiralDescend":
      // Start high, end looking more down
      return { start: feel === "dynamic" ? 55 : feel === "soft" ? 45 : 50, end: feel === "dynamic" ? 70 : feel === "soft" ? 60 : 65 };
    case "topView":
      // Almost top-down
      return { start: feel === "dynamic" ? 10 : feel === "soft" ? 5 : 8, end: feel === "dynamic" ? 20 : feel === "soft" ? 15 : 18 };
    case "lowPass":
      // Very low, aggressive angle
      return { start: feel === "dynamic" ? 75 : feel === "soft" ? 68 : 72, end: feel === "dynamic" ? 75 : feel === "soft" ? 68 : 72 };
    case "fourCorners":
      // Medium-high angle
      return { start: feel === "dynamic" ? 58 : feel === "soft" ? 48 : 53, end: feel === "dynamic" ? 58 : feel === "soft" ? 48 : 53 };
  }
}

/**
 * Get zoom range based on camera feel and mode
 */
function getZoomRange(feel: CameraFeel, mode: CameraSequenceMode, baseHeight: number): { from: number; to: number } {
  const baseZoom = 16 - Math.log2(baseHeight / 100);
  
  switch (mode) {
    case "heroZoom":
      // Dramatic zoom in from far
      return { from: baseZoom - 2.0, to: baseZoom + 0.5 };
    case "orbit360":
      // Zoom stays relatively stable
      return { from: baseZoom - 0.5, to: baseZoom + 0.3 };
    case "spiralDescend":
      // Zoom in as we descend
      return { from: baseZoom - 0.8, to: baseZoom + 1.0 };
    case "topView":
      // Zoom in for clarity
      return { from: baseZoom - 0.3, to: baseZoom + 0.5 };
    case "lowPass":
      // Low pass needs higher zoom
      return { from: baseZoom + 0.5, to: baseZoom + 0.8 };
    case "fourCorners":
      // Zoom in at each corner
      return { from: baseZoom, to: baseZoom + 0.6 };
  }
}

/**
 * Get bearing range for each mode
 */
function getBearingRange(mode: CameraSequenceMode, feel: CameraFeel, startBearing: number): { from: number; to: number } {
  const rotationAmount = feel === "dynamic" ? 420 : feel === "soft" ? 300 : 360;
  
  switch (mode) {
    case "heroZoom":
      // Subtle rotation for dramatic effect
      return { from: startBearing, to: startBearing + 15 };
    case "orbit360":
      // Full 360 rotation
      return { from: startBearing, to: startBearing + rotationAmount };
    case "spiralDescend":
      // Slight rotation during descent (half orbit)
      return { from: startBearing, to: startBearing + (rotationAmount / 2) };
    case "topView":
      // Minimal rotation (slight pan)
      return { from: startBearing, to: startBearing + 30 };
    case "lowPass":
      // Linear sweep
      return { from: startBearing, to: startBearing + (rotationAmount * 0.6) };
    case "fourCorners":
      // No automatic rotation (moves between corners)
      return { from: startBearing, to: startBearing };
  }
}

/**
 * Four Corners approach directions (cardinal)
 */
interface FourCornerShot {
  id: string;
  label: string;
  // Start position offset from parcel center (in degrees)
  startLon: number;
  startLat: number;
  // End position (parcel center)
  endLon: number;
  endLat: number;
  // Direction label
  direction: "north" | "south" | "east" | "west";
}

function calculateFourCornerShots(center: { lat: number; lon: number }, distance: number = 0.007): FourCornerShot[] {
  // distance ~0.007 degrees ≈ 700 meters
  return [
    {
      id: "north",
      label: "Kuzey",
      startLon: center.lon,
      startLat: center.lat + distance,
      endLon: center.lon,
      endLat: center.lat,
      direction: "north",
    },
    {
      id: "south",
      label: "Güney",
      startLon: center.lon,
      startLat: center.lat - distance,
      endLon: center.lon,
      endLat: center.lat,
      direction: "south",
    },
    {
      id: "east",
      label: "Doğu",
      startLon: center.lon + distance,
      startLat: center.lat,
      endLon: center.lon,
      endLat: center.lat,
      direction: "east",
    },
    {
      id: "west",
      label: "Batı",
      startLon: center.lon - distance,
      startLat: center.lat,
      endLon: center.lon,
      endLat: center.lat,
      direction: "west",
    },
  ];
}

/**
 * Auto-generated camera sequences based on camera feel
 * Each feel has a predefined flight plan that creates a cohesive video
 */
interface FeelSequenceConfig {
  modes: Array<{
    mode: CameraSequenceMode;
    startPhase: number;  // 0-1, when this mode starts (% of total duration)
    endPhase: number;    // 0-1, when this mode ends (% of total duration)
  }>;
}

const FEEL_SEQUENCES: Record<CameraFeel, FeelSequenceConfig> = {
  /**
   * Yumuşak: Slow and calm transitions
   * 0-10s: Slow Hero Zoom
   * 10-20s: Slow Orbit
   * 20-30s: Final Hero Shot
   */
  soft: {
    modes: [
      { mode: "heroZoom", startPhase: 0, endPhase: 0.33 },
      { mode: "orbit360", startPhase: 0.33, endPhase: 0.66 },
      { mode: "heroZoom", startPhase: 0.66, endPhase: 1 }, // Final shot
    ],
  },
  /**
   * Sinematik: The default, most professional look
   * 0-5s: Hero Zoom
   * 5-15s: Orbit360
   * 15-22s: Reveal Shot (top view approach)
   * 22-30s: Final Orbit
   */
  cinematic: {
    modes: [
      { mode: "heroZoom", startPhase: 0, endPhase: 0.17 },
      { mode: "orbit360", startPhase: 0.17, endPhase: 0.5 },
      { mode: "topView", startPhase: 0.5, endPhase: 0.73 }, // Reveal shot
      { mode: "orbit360", startPhase: 0.73, endPhase: 1 }, // Final orbit
    ],
  },
  /**
   * Dinamik: Fast and energetic for social media
   * 0-4s: Fast Hero Zoom
   * 4-10s: Orbit360 (faster)
   * 10-18s: Flyover (low pass)
   * 18-30s: Final Orbit
   */
  dynamic: {
    modes: [
      { mode: "heroZoom", startPhase: 0, endPhase: 0.13 },
      { mode: "orbit360", startPhase: 0.13, endPhase: 0.33 },
      { mode: "lowPass", startPhase: 0.33, endPhase: 0.6 }, // Flyover
      { mode: "orbit360", startPhase: 0.6, endPhase: 1 }, // Final orbit
    ],
  },
};

/**
 * Get transition parameters between two modes to ensure smooth interpolation
 * CRITICAL: Each step inherits its starting values from the previous step's ending values
 */
function getTransitionParams(
  feel: CameraFeel,
  fromMode: CameraSequenceMode | null,
  toMode: CameraSequenceMode,
  baseHeight: number,
  stepIndex: number
): {
  startPitch: number;
  startBearing: number;
  startZoom: number;
} {
  const baseZoom = 16 - Math.log2(baseHeight / 100);
  
  // Default starting point (hero zoom style)
  const defaultStart = {
    startPitch: feel === "soft" ? 30 : feel === "dynamic" ? 35 : 25,
    startBearing: stepIndex * 45, // Rotate for variety
    startZoom: baseZoom - 1.5,
  };
  
  if (!fromMode) {
    return defaultStart;
  }
  
  // Calculate what the ending values would be for the fromMode
  const fromPitch = getPitchPitch(feel, fromMode);
  const fromBearing = stepIndex === 0 ? 0 : stepIndex * 45;
  const fromZoom = getZoomEnd(feel, fromMode, baseHeight);
  
  return {
    startPitch: fromPitch,
    startBearing: fromBearing,
    startZoom: fromZoom,
  };
}

function getPitchPitch(feel: CameraFeel, mode: CameraSequenceMode): number {
  const dynamic = feel === "dynamic" ? 1 : 0;
  const soft = feel === "soft" ? 1 : 0;
  
  switch (mode) {
    case "heroZoom": return soft ? 30 : dynamic ? 35 : 25;
    case "orbit360": return soft ? 50 : dynamic ? 62 : 57;
    case "topView": return soft ? 8 : dynamic ? 15 : 10;
    case "lowPass": return soft ? 70 : dynamic ? 75 : 72;
    case "spiralDescend": return soft ? 55 : dynamic ? 65 : 60;
    case "fourCorners": return soft ? 50 : dynamic ? 58 : 53;
    default: return 55;
  }
}

function getZoomEnd(feel: CameraFeel, mode: CameraSequenceMode, baseHeight: number): number {
  const baseZoom = 16 - Math.log2(baseHeight / 100);
  
  switch (mode) {
    case "heroZoom": return baseZoom + 0.5;
    case "orbit360": return baseZoom;
    case "topView": return baseZoom + 0.5;
    case "lowPass": return baseZoom + 0.8;
    case "spiralDescend": return baseZoom + 1;
    case "fourCorners": return baseZoom + 0.6;
    default: return baseZoom;
  }
}

/**
 * Build camera sequence based on drone settings and parcel geometry
 * 
 * Now automatically generates camera modes based on cameraFeel setting.
 * The system creates a cohesive flight plan where:
 * - Each mode transitions smoothly from the previous
 * - Starting values of each step = Ending values of previous step
 * - No sudden jumps in zoom, pitch, or bearing
 */
export function buildCameraSequence(
  droneSettings: DroneSettingsState, 
  geoJson?: GeoJSON.Feature
): CameraSequence {
  const { duration, startHeight, cameraFeel } = droneSettings;
  
  // Get the auto-generated sequence for this feel
  const feelConfig = FEEL_SEQUENCES[cameraFeel];
  if (!feelConfig) {
    console.warn(`Unknown cameraFeel: ${cameraFeel}, defaulting to cinematic`);
    return buildCameraSequence({ ...droneSettings, cameraFeel: "cinematic" }, geoJson);
  }
  
  const parcelCenter = geoJson ? computeParcelCenter(geoJson) : null;
  const fourCornerShots = parcelCenter ? calculateFourCornerShots(parcelCenter) : [];
  
  const steps: CameraSequenceStep[] = [];
  let previousMode: CameraSequenceMode | null = null;
  
  for (let index = 0; index < feelConfig.modes.length; index++) {
    const modeConfig = feelConfig.modes[index];
    const modeDuration = Math.round((modeConfig.endPhase - modeConfig.startPhase) * duration);
    
    // CRITICAL: Get transition params to ensure smooth interpolation
    const transition = getTransitionParams(cameraFeel, previousMode, modeConfig.mode, startHeight, index);
    
    const pitchRange = getPitchRange(cameraFeel, modeConfig.mode);
    const zoomRange = getZoomRange(cameraFeel, modeConfig.mode, startHeight);
    const bearingRange = getBearingRange(modeConfig.mode, cameraFeel, transition.startBearing);
    
    // Calculate height range for this step
    const heightLossPerStep = (startHeight - 150) / feelConfig.modes.length;
    const currentStartHeight = startHeight - (heightLossPerStep * index);
    const currentEndHeight = Math.max(100, startHeight - (heightLossPerStep * (index + 1)));
    
    // For hero zoom at the end (final shot), ensure strong zoom in
    const isFinalHeroShot = index === feelConfig.modes.length - 1 && modeConfig.mode === "heroZoom";
    const baseZoom = 16 - Math.log2(startHeight / 100);
    
    const step: CameraSequenceStep = {
      mode: modeConfig.mode,
      duration: modeDuration,
      startHeight: currentStartHeight,
      endHeight: currentEndHeight,
      pitch: transition.startPitch, // Use transitioning value
      pitchEnd: isFinalHeroShot ? 65 : pitchRange.end, // Final hero shot looks more down
      bearingFrom: transition.startBearing,
      bearingTo: bearingRange.to,
      zoomFrom: transition.startZoom, // Use transitioning value
      zoomTo: isFinalHeroShot ? baseZoom + 1.5 : zoomRange.to, // Strong zoom for final shot
      easing: cameraFeel,
    };
    
    // Enable approach mode for four corners
    if (modeConfig.mode === "fourCorners" && fourCornerShots.length > 0) {
      const shot = fourCornerShots[0];
      step.approachFrom = {
        id: shot.id,
        startLon: shot.startLon,
        startLat: shot.startLat,
      };
      step.approachTo = {
        lon: shot.endLon,
        lat: shot.endLat,
      };
    }
    
    steps.push(step);
    previousMode = modeConfig.mode;
  }
  
  return {
    steps,
    totalDuration: duration,
  };
}

/**
 * Compute parcel center from GeoJSON
 */
function computeParcelCenter(geoJson: GeoJSON.Feature): { lat: number; lon: number } | null {
  const geometry = geoJson.geometry;
  
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    return null;
  }
  
  const coordinates = geometry.type === "Polygon" 
    ? (geometry as GeoJSON.Polygon).coordinates
    : (geometry as GeoJSON.MultiPolygon).coordinates[0];
  
  if (!coordinates || !coordinates[0]) return null;
  
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  
  for (const coord of coordinates[0]) {
    const [lon, lat] = coord;
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  
  if (!Number.isFinite(minLon)) return null;
  
  return {
    lat: (minLat + maxLat) / 2,
    lon: (minLon + maxLon) / 2,
  };
}

/**
 * Default drone settings for new projects
 */
export const defaultDroneSettings: DroneSettingsState = {
  duration: 30,
  startHeight: 300,
  cameraFeel: "cinematic",
};

/**
 * Interpolate camera state for a given step and progress
 * 
 * Each mode has unique behavior:
 * - orbit360: Circular orbit, constant height/zoom, full bearing rotation
 * - spiralDescend: Descend while rotating, increase zoom
 * - topView: Nearly top-down, slight zoom increase
 * - lowPass: Low angle, linear movement, stable pitch
 * - fourCorners: Move between polygon corners with pauses
 */
export function interpolateCameraStep(
  step: CameraSequenceStep,
  t: number,
  center: { lat: number; lon: number }
): { center: [number, number]; zoom: number; pitch: number; bearing: number } {
  const ease = getEasing(step.easing);
  const easedT = ease(t);
  
  let centerOffset: { lon: number; lat: number } = { lon: 0, lat: 0 };
  let zoom: number;
  let pitch: number;
  let bearing: number;

  switch (step.mode) {
    case "heroZoom": {
      // SIMPLIFIED Google Earth Studio Hero Shot
      // Rules:
      // - center = parcelCenter (NEVER changes)
      // - pitch = fixed (NEVER changes)
      // - bearing = fixed (NEVER changes)
      // - Only zoom changes
      // - Zoom calculated ONCE at video start, then locked
      
      const progress = easedT;
      
      // Final hover: 1.5 seconds at end
      const hoverDurationSeconds = 1.5;
      const hoverThreshold = Math.max(0.9, (step.duration - hoverDurationSeconds) / step.duration);
      const actualProgress = progress > hoverThreshold 
        ? hoverThreshold 
        : progress;
      
      // Cinematic zoom curve - only zoom changes
      // First 20%: Very slow approach (ease in)
      // Middle 60%: Normal approach (linear)
      // Last 20%: Slow down (ease out)
      let cinematicProgress = actualProgress;
      if (actualProgress < 0.2) {
        cinematicProgress = Math.pow(actualProgress / 0.2, 0.5) * 0.2;
      } else if (actualProgress < 0.8) {
        cinematicProgress = actualProgress;
      } else {
        const t = (actualProgress - 0.8) / 0.2;
        cinematicProgress = 0.8 + 0.2 * (1 - Math.pow(1 - t, 2));
      }
      
      // FIXED zoom range - calculated once, never changes
      // Start: wide view (11.5 = ~1500m feel)
      // End: close view (15.9 = ~200m feel)
      const startZoom = 11.5;
      const endZoom = 15.9;
      
      zoom = startZoom + (endZoom - startZoom) * cinematicProgress;
      
      // FIXED VALUES - never change during zoom
      pitch = 65;           // Fixed at 65°
      bearing = 0;          // Fixed at 0° (no rotation)
      
      // CRITICAL: Camera LOCKED on parcel center
      centerOffset = { lon: 0, lat: 0 };
      
      break;
    }

    case "orbit360": {
      // TRUE DJI POI Mode - 360° orbit with parcel LOCKED at center
      // CRITICAL RULES:
      // - center = parcelCenter (NEVER moves, not even offset)
      // - zoom = fixed (NEVER changes)
      // - pitch = fixed (NEVER changes)
      // - ONLY bearing changes (0° → 360°)
      // - Camera orbits by rotating bearing, not moving center
      
      const progress = easedT;
      
      // Phase 1: Centering (first 8%)
      // Camera locks on parcel, shows stable view
      const centeringThreshold = 0.08;
      
      if (progress < centeringThreshold) {
        // Parcel centered, stable view
        centerOffset = { lon: 0, lat: 0 };  // ZERO offset
        zoom = 16;  // Fixed zoom
        pitch = 65; // Fixed pitch
        bearing = 0; // North facing
        break;
      }
      
      // Phase 2: True 360° orbit
      const orbitProgress = (progress - centeringThreshold) / (1 - centeringThreshold);
      
      // Final hover: 2 seconds at end
      const hoverDurationSeconds = 2;
      const hoverThreshold = Math.max(0.82, (step.duration - hoverDurationSeconds) / step.duration);
      const adjustedProgress = orbitProgress > hoverThreshold 
        ? hoverThreshold 
        : orbitProgress;
      
      // FIXED VALUES - calculated once, never changes
      const fixedPitch = 65;
      const fixedZoom = 16;
      
      // ONLY bearing changes - full 360° rotation
      const currentBearing = adjustedProgress * 360;
      
      // CENTER STAYS LOCKED - no centerOffset!
      // The camera orbits by rotating bearing, not by moving center
      // This keeps parcel at exact screen center throughout orbit
      centerOffset = { lon: 0, lat: 0 };
      
      // All values locked
      zoom = fixedZoom;
      pitch = fixedPitch;
      bearing = currentBearing;
      
      break;
    }
    
    case "spiralDescend": {
      // Spiral inward while descending
      const progress = easedT;
      const orbitRadius = 0.001 * (1 - progress * 0.7); // Shrink as we descend
      const orbitSpeed = progress * 4 * Math.PI; // 2 full rotations
      const descentProgress = progress;
      
      centerOffset = {
        lon: Math.sin(orbitSpeed) * orbitRadius,
        lat: Math.cos(orbitSpeed) * orbitRadius,
      };
      
      zoom = step.zoomFrom + (step.zoomTo - step.zoomFrom) * descentProgress;
      pitch = step.pitch + (step.pitchEnd - step.pitch) * descentProgress;
      bearing = step.bearingFrom + (step.bearingTo - step.bearingFrom) * progress;
      break;
    }
    
    case "topView": {
      // Nearly top-down view with slight zoom
      const progress = easedT;
      
      // Very subtle circular movement
      const radius = 0.0002 * (1 - progress);
      const angle = progress * Math.PI / 4;
      
      centerOffset = {
        lon: Math.sin(angle) * radius,
        lat: Math.cos(angle) * radius,
      };
      
      zoom = step.zoomFrom + (step.zoomTo - step.zoomFrom) * progress;
      pitch = step.pitch + (step.pitchEnd - step.pitch) * progress;
      bearing = step.bearingFrom + (step.bearingTo - step.bearingFrom) * progress;
      break;
    }
    
    case "lowPass": {
      // Linear sweep with very low angle
      const progress = easedT;
      const sweepDistance = 0.002; // Distance to sweep
      
      centerOffset = {
        lon: (progress - 0.5) * sweepDistance,
        lat: Math.sin(progress * Math.PI) * 0.0003, // Slight sine wave
      };
      
      zoom = step.zoomFrom + (step.zoomTo - step.zoomFrom) * progress;
      pitch = step.pitch; // Constant low angle
      bearing = step.bearingFrom + (step.bearingTo - step.bearingFrom) * progress;
      break;
    }
    
    case "fourCorners": {
      // Cinematic cardinal direction approach (N, S, E, W)
      // Camera approaches from 500-700m away, always looking at parcel center
      // Pitch stays high (55-65°) for Google Earth / DJI drone feel
      
      const progress = easedT;
      const pitchRange = 58; // High angle for cinematic view
      
      // Get approach positions from step data
      const approachFrom = step.approachFrom;
      const approachTo = step.approachTo;
      
      if (approachFrom && approachTo) {
        // Interpolate from approach position to parcel center
        // Start far (outside), end at parcel center
        const approachStartLon = approachFrom.startLon;
        const approachStartLat = approachFrom.startLat;
        const approachEndLon = approachTo.lon;
        const approachEndLat = approachTo.lat;
        
        // Cinematic easing: ease-in-out for smooth approach
        const cinematicT = t * t * (3 - 2 * t); // Smooth step
        
        // Interpolate position
        centerOffset = {
          lon: (approachEndLon - approachStartLon) * cinematicT,
          lat: (approachEndLat - approachStartLat) * cinematicT,
        };
        
        // Zoom in as we approach
        const startZoom = step.startHeight / 50; // Far zoom
        const endZoom = step.startHeight / 100 + 2; // Close zoom
        zoom = startZoom + (endZoom - startZoom) * cinematicT;
        
        // Constant high pitch for DJI drone feel
        pitch = pitchRange;
        
        // Bearing points to parcel center (always looking at target)
        // Calculate bearing based on approach direction
        const dLon = approachEndLon - approachStartLon;
        const dLat = approachEndLat - approachStartLat;
        bearing = Math.atan2(dLon, dLat) * (180 / Math.PI);
        
      } else {
        // Fallback: simple approach from generic position
        const approachRadius = 0.007 * (1 - progress);
        const angle = 0; // Default approach
        
        centerOffset = {
          lon: Math.sin(angle) * approachRadius,
          lat: Math.cos(angle) * approachRadius,
        };
        
        zoom = step.zoomFrom + (step.zoomTo - step.zoomFrom) * progress;
        pitch = 58; // High pitch
        bearing = step.bearingFrom;
      }
      break;
    }
    
    default:
      // Fallback to simple interpolation
      centerOffset = { lon: 0, lat: 0 };
      zoom = step.zoomFrom + (step.zoomTo - step.zoomFrom) * easedT;
      pitch = step.pitch + (step.pitchEnd - step.pitch) * easedT;
      bearing = step.bearingFrom + (step.bearingTo - step.bearingFrom) * easedT;
  }

  return {
    center: [center.lon + centerOffset.lon, center.lat + centerOffset.lat] as [number, number],
    zoom: Math.min(19, Math.max(13, zoom)),
    pitch: Math.max(0, Math.min(85, pitch)),
    bearing: ((bearing % 360) + 360) % 360,
  };
}
