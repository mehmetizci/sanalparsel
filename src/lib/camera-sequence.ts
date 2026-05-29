import type { 
  DroneSettingsState, 
  CameraSequence, 
  CameraSequenceStep, 
  CameraSequenceMode,
  CameraFeel
} from "@/lib/parcel-store";

/**
 * Get pitch range based on camera feel
 */
function getPitchRange(feel: CameraFeel): { min: number; max: number } {
  switch (feel) {
    case "soft":
      return { min: 45, max: 50 };
    case "cinematic":
      return { min: 55, max: 60 };
    case "dynamic":
      return { min: 60, max: 65 };
  }
}

/**
 * Get default bearing range for each mode
 */
function getBearingRange(mode: CameraSequenceMode, feel: CameraFeel): { from: number; to: number } {
  switch (mode) {
    case "orbit360":
      return { from: 0, to: feel === "dynamic" ? 420 : 360 };
    case "spiralDescend":
      return { from: 0, to: feel === "dynamic" ? 180 : 90 };
    case "topView":
      return { from: 0, to: 0 };
    case "lowPass":
      return { from: 0, to: feel === "dynamic" ? 270 : 180 };
    case "fourCorners":
      return { from: 0, to: 360 };
  }
}

/**
 * Build camera sequence based on drone settings
 */
export function buildCameraSequence(droneSettings: DroneSettingsState): CameraSequence {
  const { duration, startHeight, cameraFeel, cameraModes } = droneSettings;

  if (!cameraModes || cameraModes.length === 0) {
    return { steps: [], totalDuration: 0 };
  }

  // Distribute duration evenly among selected modes
  const numModes = cameraModes.length;
  const durationPerMode = Math.floor(duration / numModes);

  // Get pitch range based on camera feel
  const pitchRange = getPitchRange(cameraFeel);

  // Calculate height descent for each mode
  const totalHeightDrop = startHeight - 50; // End 50m above ground
  const heightDropPerMode = Math.floor(totalHeightDrop / numModes);

  const steps: CameraSequenceStep[] = cameraModes.map((mode, index) => {
    const bearingRange = getBearingRange(mode, cameraFeel);
    const currentStartHeight = startHeight - (heightDropPerMode * index);
    const currentEndHeight = currentStartHeight - heightDropPerMode;

    // Add some variation to pitch within range
    const pitchVariation = (pitchRange.max - pitchRange.min) * 0.1;
    const pitch = pitchRange.min + Math.random() * pitchVariation;

    const step: CameraSequenceStep = {
      mode: mode,
      duration: durationPerMode,
      startHeight: currentStartHeight,
      endHeight: currentEndHeight,
      pitch: Math.round(pitch),
      bearingFrom: bearingRange.from,
      bearingTo: bearingRange.to,
      easing: cameraFeel,
    };

    return step;
  });

  const sequence: CameraSequence = {
    steps,
    totalDuration: steps.reduce((sum, step) => sum + step.duration, 0),
  };

  console.log("[buildCameraSequence] Generated camera sequence:", JSON.stringify(sequence, null, 2));

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
 * Easing function for smooth camera movement
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Interpolate camera state for a given step and progress
 */
export function interpolateCameraStep(
  step: CameraSequenceStep,
  t: number,
  center: { lat: number; lon: number }
): { center: [number, number]; zoom: number; pitch: number; bearing: number } {
  const ease = easeInOutCubic(t);
  const heightRange = step.startHeight - step.endHeight;
  const baseZoom = 16 - Math.log2(step.startHeight / 100);
  const zoomOffset = heightRange / 500 * 0.5;
  const zoom = baseZoom + zoomOffset * ease;
  const pitch = step.pitch;
  
  // Handle bearing wraparound
  let bearingDiff = step.bearingTo - step.bearingFrom;
  if (bearingDiff > 180) bearingDiff -= 360;
  if (bearingDiff < -180) bearingDiff += 360;
  const bearing = step.bearingFrom + bearingDiff * ease;
  
  // Add subtle circular movement around the center
  const offsetFactor = 0.0005 * (1 - Math.abs(t - 0.5) * 2);
  const offsetLon = Math.sin(bearing * Math.PI / 180) * offsetFactor * step.startHeight / 100;
  const offsetLat = Math.cos(bearing * Math.PI / 180) * offsetFactor * step.startHeight / 100;
  
  return {
    center: [center.lon + offsetLon, center.lat + offsetLat] as [number, number],
    zoom: Math.min(18, Math.max(14, zoom)),
    pitch,
    bearing: (bearing + 360) % 360
  };
}
