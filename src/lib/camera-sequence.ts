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
export function getEasing(feel: CameraFeel): (t: number) => number {
  switch (feel) {
    case "soft":
      // Very smooth, slow ease - longer transitions
      return (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case "cinematic":
      // Smooth with slight acceleration/deceleration
      return (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case "dynamic":
      // Faster, more aggressive - shorter transitions
      return (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t - 2, 4) / 2;
  }
}

/**
 * Build camera sequence based on drone settings (auto-generated, no user input)
 */
export function buildCameraSequence(droneSettings: DroneSettingsState): CameraSequence {
  // The sequence is now auto-generated from cameraFeel
  // Duration comes from droneSettings.duration
  const totalDuration = droneSettings.duration * 1000; // Convert to ms
  
  // Generate steps based on camera feel
  const steps = generateAutoSequence(droneSettings.cameraFeel, droneSettings.startHeight, totalDuration);
  
  return {
    steps,
    totalDuration,
  };
}

/**
 * Generate auto camera sequence based on feel
 */
function generateAutoSequence(
  feel: CameraFeel,
  startHeight: number,
  totalDuration: number
): CameraSequenceStep[] {
  const baseZoom = calculateBaseZoom(startHeight);
  const startBearing = Math.random() * 360;
  
  // Define the phases based on camera feel
  const phases = getFeelPhases(feel);
  
  return phases.map((phase, index) => {
    const phaseDuration = (phase.end - phase.start) * totalDuration;
    
    return {
      mode: phase.mode,
      duration: phaseDuration,
      startHeight,
      endHeight: startHeight,
      pitch: phase.pitch,
      pitchEnd: phase.pitchEnd ?? phase.pitch,
      bearingFrom: startBearing + phase.bearingOffset,
      bearingTo: startBearing + phase.bearingOffset + phase.bearingRange,
      zoomFrom: baseZoom + (phase.zoomOffset ?? 0),
      zoomTo: baseZoom + (phase.zoomOffset ?? 0) + (phase.zoomRange ?? 0),
      easing: feel,
    };
  });
}

/**
 * Get phase configuration based on camera feel
 */
function getFeelPhases(feel: CameraFeel): Array<{
  start: number;
  end: number;
  mode: CameraSequenceMode;
  pitch: number;
  pitchEnd?: number;
  bearingOffset: number;
  bearingRange: number;
  zoomOffset?: number;
  zoomRange?: number;
}> {
  switch (feel) {
    case "soft":
      // Yumuşak: Slow, stable, premium for 45-60s videos
      return [
        { start: 0, end: 0.25, mode: "heroZoom", pitch: 50, pitchEnd: 45, bearingOffset: 0, bearingRange: 15, zoomOffset: -2.0, zoomRange: 2.0 },
        { start: 0.25, end: 0.60, mode: "orbit360", pitch: 55, bearingOffset: 15, bearingRange: 280, zoomOffset: -0.3, zoomRange: 0.5 },
        { start: 0.60, end: 0.85, mode: "topView", pitch: 45, pitchEnd: 20, bearingOffset: 295, bearingRange: 30, zoomOffset: 0.2, zoomRange: 0.8 },
        { start: 0.85, end: 1.0, mode: "orbit360", pitch: 50, bearingOffset: 325, bearingRange: 240, zoomOffset: -0.8, zoomRange: 0.6 },
      ];
    case "cinematic":
      // Sinematik: Professional, recommended for real estate
      return [
        { start: 0, end: 0.20, mode: "heroZoom", pitch: 60, pitchEnd: 50, bearingOffset: 0, bearingRange: 15, zoomOffset: -2.5, zoomRange: 2.8 },
        { start: 0.20, end: 0.50, mode: "orbit360", pitch: 60, bearingOffset: 15, bearingRange: 360, zoomOffset: -0.2, zoomRange: 0.4 },
        { start: 0.50, end: 0.75, mode: "topView", pitch: 60, pitchEnd: 25, bearingOffset: 375, bearingRange: 45, zoomOffset: 0.1, zoomRange: 0.6 },
        { start: 0.75, end: 1.0, mode: "orbit360", pitch: 55, bearingOffset: 420, bearingRange: 300, zoomOffset: -0.5, zoomRange: 0.5 },
      ];
    case "dynamic":
      // Dinamik: Fast, energetic, for social media
      return [
        { start: 0, end: 0.13, mode: "heroZoom", pitch: 65, pitchEnd: 55, bearingOffset: 0, bearingRange: 20, zoomOffset: -3.0, zoomRange: 3.2 },
        { start: 0.13, end: 0.35, mode: "orbit360", pitch: 65, bearingOffset: 20, bearingRange: 420, zoomOffset: 0.1, zoomRange: 0.3 },
        { start: 0.35, end: 0.60, mode: "lowPass", pitch: 72, bearingOffset: 440, bearingRange: 200, zoomOffset: 0.3, zoomRange: 0.4 },
        { start: 0.60, end: 1.0, mode: "orbit360", pitch: 60, bearingOffset: 640, bearingRange: 360, zoomOffset: -0.2, zoomRange: 0.4 },
      ];
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
  soft: {
    modes: [
      { mode: "heroZoom", startPhase: 0, endPhase: 0.33 },
      { mode: "orbit360", startPhase: 0.33, endPhase: 0.66 },
      { mode: "heroZoom", startPhase: 0.66, endPhase: 1 },
    ],
  },
  cinematic: {
    modes: [
      { mode: "heroZoom", startPhase: 0, endPhase: 0.17 },
      { mode: "orbit360", startPhase: 0.17, endPhase: 0.5 },
      { mode: "topView", startPhase: 0.5, endPhase: 0.73 },
      { mode: "orbit360", startPhase: 0.73, endPhase: 1 },
    ],
  },
  dynamic: {
    modes: [
      { mode: "heroZoom", startPhase: 0, endPhase: 0.13 },
      { mode: "orbit360", startPhase: 0.13, endPhase: 0.33 },
      { mode: "lowPass", startPhase: 0.33, endPhase: 0.6 },
      { mode: "orbit360", startPhase: 0.6, endPhase: 1 },
    ],
  },
};

/**
 * Get pitch range based on camera feel and mode
 */
function getPitchRange(feel: CameraFeel, mode: CameraSequenceMode): { start: number; end: number } {
  switch (mode) {
    case "heroZoom":
      return { start: 25, end: 60 };
    case "orbit360":
      return { start: feel === "dynamic" ? 62 : feel === "soft" ? 50 : 57, end: feel === "dynamic" ? 62 : feel === "soft" ? 50 : 57 };
    case "spiralDescend":
      return { start: feel === "dynamic" ? 55 : feel === "soft" ? 45 : 50, end: feel === "dynamic" ? 70 : feel === "soft" ? 60 : 65 };
    case "topView":
      return { start: feel === "dynamic" ? 10 : feel === "soft" ? 5 : 8, end: feel === "dynamic" ? 20 : feel === "soft" ? 15 : 18 };
    case "lowPass":
      return { start: feel === "dynamic" ? 75 : feel === "soft" ? 68 : 72, end: feel === "dynamic" ? 75 : feel === "soft" ? 68 : 72 };
    case "fourCorners":
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
      return { from: baseZoom - 2.0, to: baseZoom + 0.5 };
    case "orbit360":
      return { from: baseZoom - 0.5, to: baseZoom + 0.3 };
    case "spiralDescend":
      return { from: baseZoom - 0.8, to: baseZoom + 1.0 };
    case "topView":
      return { from: baseZoom - 0.3, to: baseZoom + 0.5 };
    case "lowPass":
      return { from: baseZoom + 0.5, to: baseZoom + 0.8 };
    case "fourCorners":
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
      return { from: startBearing, to: startBearing + 15 };
    case "orbit360":
      return { from: startBearing, to: startBearing + rotationAmount };
    case "spiralDescend":
      return { from: startBearing, to: startBearing + (rotationAmount / 2) };
    case "topView":
      return { from: startBearing, to: startBearing + 30 };
    case "lowPass":
      return { from: startBearing, to: startBearing + (rotationAmount * 0.6) };
    case "fourCorners":
      return { from: startBearing, to: startBearing };
  }
}

/**
 * Four Corners approach directions (cardinal)
 */
interface FourCornerShot {
  id: string;
  label: string;
  startLon: number;
  startLat: number;
  endLon: number;
  endLat: number;
  direction: "north" | "south" | "east" | "west";
}

function calculateFourCornerShots(center: { lat: number; lon: number }, distance: number = 0.007): FourCornerShot[] {
  return [
    { id: "north", label: "Kuzey", startLon: center.lon, startLat: center.lat + distance, endLon: center.lon, endLat: center.lat, direction: "north" },
    { id: "south", label: "Güney", startLon: center.lon, startLat: center.lat - distance, endLon: center.lon, endLat: center.lat, direction: "south" },
    { id: "east", label: "Doğu", startLon: center.lon + distance, startLat: center.lat, endLon: center.lon, endLat: center.lat, direction: "east" },
    { id: "west", label: "Batı", startLon: center.lon - distance, startLat: center.lat, endLon: center.lon, endLat: center.lat, direction: "west" },
  ];
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
  
  return { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 };
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
      // Hero Zoom: Smooth transition from wide view to close-up
      // Uses step.zoomFrom, step.zoomTo for smooth transitions between scenes
      // Rules:
      // - center = parcelCenter (NEVER changes) - parcel always at center
      // - pitch changes smoothly from step.pitch to step.pitchEnd
      // - bearing changes smoothly from step.bearingFrom to step.bearingTo
      // - zoom changes from step.zoomFrom to step.zoomTo
      
      const progress = easedT;
      
      // Cinematic zoom curve
      let cinematicProgress = progress;
      if (progress < 0.2) {
        cinematicProgress = Math.pow(progress / 0.2, 0.5) * 0.2;
      } else if (progress < 0.8) {
        cinematicProgress = progress;
      } else {
        const t = (progress - 0.8) / 0.2;
        cinematicProgress = 0.8 + 0.2 * (1 - Math.pow(1 - t, 2));
      }
      
      // Smooth zoom interpolation
      zoom = step.zoomFrom + (step.zoomTo - step.zoomFrom) * cinematicProgress;
      
      // Smooth pitch interpolation
      pitch = step.pitch + (step.pitchEnd - step.pitch) * cinematicProgress;
      
      // Smooth bearing interpolation
      bearing = step.bearingFrom + (step.bearingTo - step.bearingFrom) * cinematicProgress;
      
      // CRITICAL: Camera LOCKED on parcel center
      centerOffset = { lon: 0, lat: 0 };
      
      break;
    }

    case "orbit360": {
      // Orbit360: Smooth 360° orbit around parcel
      // CRITICAL for transitions:
      // - Starts from step.pitch, step.zoomFrom (inherited from previous scene)
      // - Ends near step.pitchEnd, step.zoomTo
      // - pitch and zoom change smoothly (not hardcoded)
      // - ONLY bearing changes for the orbit effect
      // - Camera orbits by rotating bearing, not moving center
      
      const progress = easedT;
      
      // Phase 1: Centering (first 8%)
      // Camera transitions smoothly from previous scene values
      const centeringThreshold = 0.08;
      
      if (progress < centeringThreshold) {
        const transitionProgress = progress / centeringThreshold;
        // Smooth transition from previous scene values to orbit values
        const orbitPitch = 65;
        const orbitZoom = 15;
        const orbitBearing = 0;
        
        centerOffset = { lon: 0, lat: 0 };
        zoom = step.zoomFrom + (orbitZoom - step.zoomFrom) * transitionProgress;
        pitch = step.pitch + (orbitPitch - step.pitch) * transitionProgress;
        bearing = step.bearingFrom + (orbitBearing - step.bearingFrom) * transitionProgress;
        break;
      }
      
      // Phase 2: True 360° orbit with smooth parameter transitions
      const orbitProgress = (progress - centeringThreshold) / (1 - centeringThreshold);
      
      // Final hover: 1.5 seconds at end
      const hoverDurationSeconds = 1.5;
      const hoverThreshold = Math.max(0.85, (step.duration - hoverDurationSeconds) / step.duration);
      const adjustedProgress = Math.min(orbitProgress, hoverThreshold);
      
      // Consistent values for orbit mode
      const orbitPitch = 65;
      const orbitZoom = step.zoomFrom + (step.zoomTo - step.zoomFrom) * 0.5; // Middle point
      
      // Full 360° rotation with smooth transitions
      const currentBearing = step.bearingFrom + adjustedProgress * 360;
      
      // CENTER STAYS LOCKED - no centerOffset!
      centerOffset = { lon: 0, lat: 0 };
      
      // Smooth parameter transitions toward end values
      const paramProgress = orbitProgress;
      zoom = orbitZoom + (step.zoomTo - orbitZoom) * paramProgress;
      pitch = orbitPitch + (step.pitchEnd - orbitPitch) * paramProgress;
      bearing = currentBearing;
      
      // Normalize bearing to 0-360
      bearing = ((bearing % 360) + 360) % 360;
      
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
      // Reveal Shot: Nearly top-down view for cinematic reveal
      // CRITICAL: Parcel must stay visible - minimum 25% screen height
      // Uses step.zoomFrom, step.zoomTo, step.pitch, step.pitchEnd for smooth transitions
      
      const progress = easedT;
      
      // SMOOTH TRANSITION from previous scene (orbit ending values)
      // to new top view values
      const transitionDuration = 0.1; // First 10% for smooth transition
      
      if (progress < transitionDuration) {
        const transitionProgress = progress / transitionDuration;
        // Smooth transition from orbit values to top view values
        const topPitch = 30; // High angle, can see context
        const topZoom = Math.max(step.zoomTo, 14); // Ensure parcel stays visible
        
        zoom = step.zoomFrom + (topZoom - step.zoomFrom) * transitionProgress;
        pitch = step.pitch + (topPitch - step.pitch) * transitionProgress;
        bearing = step.bearingFrom + (step.bearingTo - step.bearingFrom) * transitionProgress;
      } else {
        // Main top view animation with smooth transitions
        const animProgress = (progress - transitionDuration) / (1 - transitionDuration);
        
        // Top down view - high pitch for showing property and context
        const topPitch = step.pitch + (step.pitchEnd - step.pitch) * animProgress;
        // Keep adequate zoom so parcel stays visible (25% screen minimum)
        const topZoom = Math.max(
          step.zoomFrom + (step.zoomTo - step.zoomFrom) * animProgress,
          14 // Minimum zoom to keep parcel visible
        );
        
        zoom = topZoom;
        pitch = topPitch;
        bearing = step.bearingFrom + (step.bearingTo - step.bearingFrom) * animProgress;
      }
      
      // CRITICAL: NO centerOffset - parcel stays LOCKED at center
      centerOffset = { lon: 0, lat: 0 };
      
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
