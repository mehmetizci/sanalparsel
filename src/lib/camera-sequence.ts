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
 * Extract corners from GeoJSON polygon for fourCorners mode
 */
function extractPolygonCorners(geoJson: GeoJSON.Feature): Array<{ lon: number; lat: number }> {
  const geometry = geoJson.geometry;
  
  // Only process Polygon type
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    return [];
  }
  
  // For MultiPolygon, get first polygon
  const coordinates = geometry.type === "Polygon" 
    ? (geometry as GeoJSON.Polygon).coordinates
    : (geometry as GeoJSON.MultiPolygon).coordinates[0];
  
  if (!coordinates) return [];
  
  const ring = coordinates[0] as number[][]; // Outer ring
    
  // Get unique corners (skip last point which equals first)
  const corners: Array<{ lon: number; lat: number }> = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon, lat] = ring[i];
    corners.push({ lon, lat });
  }
  
  // Return max 4 corners for simplicity
  return corners.slice(0, 4);
}

/**
 * Build camera sequence based on drone settings and parcel geometry
 */
export function buildCameraSequence(
  droneSettings: DroneSettingsState, 
  geoJson?: GeoJSON.Feature
): CameraSequence {
  const { duration, startHeight, cameraFeel, cameraModes } = droneSettings;

  if (!cameraModes || cameraModes.length === 0) {
    return { steps: [], totalDuration: 0 };
  }

  // Distribute duration evenly among selected modes
  const numModes = cameraModes.length;
  const durationPerMode = Math.floor(duration / numModes);
  
  // Pause time for dramatic effect (distributed across modes)
  const totalPauseTime = Math.min(2, durationPerMode * 0.1);
  const pausePerMode = totalPauseTime / numModes;

  // Extract corners if geoJson provided
  const corners = geoJson ? extractPolygonCorners(geoJson) : [];

  const steps: CameraSequenceStep[] = cameraModes.map((mode, index) => {
    const pitchRange = getPitchRange(cameraFeel, mode);
    const zoomRange = getZoomRange(cameraFeel, mode, startHeight);
    
    // Rotate start bearing for variety if multiple modes
    const startBearing = index * 45;
    const bearingRange = getBearingRange(mode, cameraFeel, startBearing);
    
    // Calculate height change per mode
    const heightDropPerMode = mode === "spiralDescend" 
      ? (startHeight - 120) / numModes  // Spiral descends significantly
      : mode === "fourCorners"
        ? (startHeight - 150) / numModes  // Moderate descent
        : (startHeight - 200) / numModes; // Other modes moderate descent
    
    const currentStartHeight = startHeight - (heightDropPerMode * index);
    const currentEndHeight = Math.max(100, currentStartHeight - heightDropPerMode);
    
    const step: CameraSequenceStep = {
      mode,
      duration: durationPerMode,
      startHeight: currentStartHeight,
      endHeight: currentEndHeight,
      pitch: pitchRange.start,
      pitchEnd: pitchRange.end,
      bearingFrom: bearingRange.from,
      bearingTo: bearingRange.to,
      zoomFrom: zoomRange.from,
      zoomTo: zoomRange.to,
      easing: cameraFeel,
      pauseAtStart: pausePerMode,
      ...(mode === "fourCorners" && corners.length >= 4 ? { corners } : {}),
    };

    console.log(`[CameraSequence] Step ${index} (${mode}):`, {
      duration: step.duration,
      height: `${step.startHeight}m → ${step.endHeight}m`,
      pitch: `${step.pitch}° → ${step.pitchEnd}°`,
      bearing: `${step.bearingFrom}° → ${step.bearingTo}°`,
      zoom: `${step.zoomFrom} → ${step.zoomTo}`,
    });

    return step;
  });

  const sequence: CameraSequence = {
    steps,
    totalDuration: steps.reduce((sum, step) => sum + step.duration, 0),
  };

  console.log("[CameraSequence] Generated sequence:", JSON.stringify(sequence, null, 2));

  return sequence;
}

/**
 * Default drone settings for new projects
 */
export const defaultDroneSettings: DroneSettingsState = {
  duration: 30,
  startHeight: 300,
  cameraFeel: "cinematic",
  cameraModes: ["orbit360", "spiralDescend"],
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
    case "orbit360": {
      // Simple circular orbit around center
      const orbitRadius = 0.0005 * (step.startHeight / 100);
      const angle = easedT * 2 * Math.PI; // Full circle
      
      centerOffset = {
        lon: Math.sin(angle) * orbitRadius,
        lat: Math.cos(angle) * orbitRadius,
      };
      
      zoom = step.zoomFrom + (step.zoomTo - step.zoomFrom) * easedT;
      pitch = step.pitch; // Constant pitch
      bearing = step.bearingFrom + (step.bearingTo - step.bearingFrom) * easedT;
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
      // Move between corners with pauses
      const corners = step.corners || [
        { lon: center.lon - 0.001, lat: center.lat + 0.001 },
        { lon: center.lon + 0.001, lat: center.lat + 0.001 },
        { lon: center.lon + 0.001, lat: center.lat - 0.001 },
        { lon: center.lon - 0.001, lat: center.lat - 0.001 },
      ];
      
      const numCorners = corners.length;
      const pauseTime = step.pauseAtStart || 0;
      const moveTime = 1 - pauseTime;
      
      if (t < pauseTime) {
        // Pause at start
        centerOffset = { lon: 0, lat: 0 };
        zoom = step.zoomFrom;
        pitch = step.pitch;
        bearing = step.bearingFrom;
      } else {
        // Move between corners
        const moveProgress = (t - pauseTime) / moveTime;
        const segmentCount = numCorners;
        const segmentDuration = 1 / segmentCount;
        const segmentIndex = Math.floor(moveProgress * segmentCount);
        const segmentProgress = (moveProgress - segmentIndex * segmentDuration) / segmentDuration;
        const easedSegment = ease(segmentProgress);
        
        const currentCorner = corners[segmentIndex % numCorners];
        const nextCorner = corners[(segmentIndex + 1) % numCorners];
        
        centerOffset = {
          lon: (currentCorner.lon - center.lon) + (nextCorner.lon - currentCorner.lon) * easedSegment,
          lat: (currentCorner.lat - center.lat) + (nextCorner.lat - currentCorner.lat) * easedSegment,
        };
        
        // Zoom in slightly at each corner
        const cornerZoom = 0.2 * Math.sin(easedSegment * Math.PI);
        zoom = step.zoomFrom + (step.zoomTo - step.zoomFrom) * cornerZoom;
        pitch = step.pitch;
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
