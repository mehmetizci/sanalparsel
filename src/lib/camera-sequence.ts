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
 * Build camera sequence based on drone settings and parcel geometry
 * 
 * Duration distribution:
 * - Total video duration is divided equally among selected modes
 * - Four Corners mode internally splits its time into 4 equal cardinal directions
 * - Each direction gets (fourCornersDuration / 4) seconds
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
  
  // Calculate parcel center from geoJson
  const parcelCenter = geoJson ? computeParcelCenter(geoJson) : null;
  
  // Calculate cardinal approach positions for Four Corners
  const fourCornerShots = parcelCenter ? calculateFourCornerShots(parcelCenter) : [];

  const steps: CameraSequenceStep[] = [];
  let accumulatedDuration = 0;

  for (let index = 0; index < cameraModes.length; index++) {
    const mode = cameraModes[index];
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
    
    if (mode === "fourCorners") {
      // Four Corners mode: split into 4 separate steps (N, S, E, W)
      const cornerDuration = Math.floor(durationPerMode / 4);
      
      for (let cornerIndex = 0; cornerIndex < fourCornerShots.length; cornerIndex++) {
        const shot = fourCornerShots[cornerIndex];
        
        const cornerStep: CameraSequenceStep = {
          mode: "fourCorners",
          subMode: shot.id as "north" | "south" | "east" | "west",
          duration: cornerDuration,
          startHeight: currentStartHeight,
          endHeight: currentEndHeight,
          pitch: pitchRange.start,
          pitchEnd: pitchRange.end,
          bearingFrom: startBearing,
          bearingTo: bearingRange.to,
          zoomFrom: zoomRange.from,
          zoomTo: zoomRange.to,
          easing: cameraFeel,
          pauseAtStart: 0,
          // Four Corners specific: approach from cardinal direction
          approachFrom: shot,
          approachTo: { lon: parcelCenter?.lon || 0, lat: parcelCenter?.lat || 0 },
        };

        console.log(`[CameraSequence] Four Corners ${shot.label} (${shot.id}):`, {
          duration: cornerStep.duration,
          startPos: `(${shot.startLon.toFixed(5)}, ${shot.startLat.toFixed(5)})`,
          endPos: `(${parcelCenter?.lon.toFixed(5)}, ${parcelCenter?.lat.toFixed(5)})`,
          height: `${cornerStep.startHeight}m → ${cornerStep.endHeight}m`,
        });

        steps.push(cornerStep);
      }
    } else {
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
        pauseAtStart: 0,
      };

      console.log(`[CameraSequence] Step ${index} (${mode}):`, {
        duration: step.duration,
        height: `${step.startHeight}m → ${step.endHeight}m`,
        pitch: `${step.pitch}° → ${step.pitchEnd}°`,
      });

      steps.push(step);
    }
    
    accumulatedDuration += mode === "fourCorners" 
      ? (fourCornerShots.length * Math.floor(durationPerMode / 4))
      : durationPerMode;
  }

  const sequence: CameraSequence = {
    steps,
    totalDuration: accumulatedDuration,
  };

  console.log("[CameraSequence] Generated sequence:", {
    totalDuration: sequence.totalDuration,
    stepCount: steps.length,
    modes: cameraModes,
  });

  return sequence;
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
  cameraModes: ["heroZoom", "orbit360", "spiralDescend", "topView"],
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
      // Google Earth Studio Hero Shot: Pure zoom movement only
      // Camera is LOCKED to parcel center - no jitter, no drift
      // Only zoom changes from start to end
      const progress = easedT;
      
      // Final hover: 1.5-2 seconds at end (calculated from step duration)
      const hoverDurationSeconds = 1.5;
      const hoverThreshold = Math.max(0.9, (step.duration - hoverDurationSeconds) / step.duration);
      const actualProgress = progress > hoverThreshold 
        ? hoverThreshold  // Freeze at end
        : progress;
      
      // Cinematic zoom curve:
      // First 20%: Very slow approach (ease in)
      // Middle 60%: Normal approach (linear)
      // Last 20%: Slow down (ease out)
      let cinematicProgress = actualProgress;
      if (actualProgress < 0.2) {
        // First 20%: Ease in - very slow start
        cinematicProgress = Math.pow(actualProgress / 0.2, 0.5) * 0.2;
      } else if (actualProgress < 0.8) {
        // Middle 60%: Linear
        cinematicProgress = actualProgress;
      } else {
        // Last 20%: Ease out - slow down
        const t = (actualProgress - 0.8) / 0.2;
        cinematicProgress = 0.8 + 0.2 * (1 - Math.pow(1 - t, 2));
      }
      
      // Zoom: 11.5 → 16.1 (wider start, balanced end)
      // Start: 11.5 gives ~1500m feel (very wide, regional view)
      // End: 16.1 gives ~200m feel (parcel ~65% of screen, roads visible)
      const startZoom = 11.5;
      const endZoom = 16.1;
      
      zoom = startZoom + (endZoom - startZoom) * cinematicProgress;
      
      // FIXED VALUES - no jitter, no drift
      pitch = 65;           // Fixed at 65°
      bearing = 0;          // Fixed at 0° (no rotation)
      
      // CRITICAL: Camera LOCKED on parcel center
      centerOffset = { lon: 0, lat: 0 };
      
      break;
    }

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
