/**
 * Mapbox Frame Capture System
 * 
 * Captures frames from Mapbox GL JS for use in Remotion compositions.
 */

import type { Feature, Polygon, MultiPolygon } from "geojson";

export interface CameraPosition {
  lat: number;
  lon: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface CaptureConfig {
  width: number;
  height: number;
  fps: number;
  duration: number;
}

// Camera modes
export type CameraModeKey = "orbit360" | "spiralDescend" | "topView" | "lowPass" | "fourCorners";

// Camera feel presets
export type CameraFeelKey = "soft" | "cinematic" | "dynamic";

const FEEL_CONFIG: Record<CameraFeelKey, { speed: number; easing: string }> = {
  soft: { speed: 0.7, easing: "easeInOut" },
  cinematic: { speed: 1.0, easing: "cinematic" },
  dynamic: { speed: 1.4, easing: "linear" },
};

function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case "easeInOut":
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case "cinematic":
      return t * t * (3 - 2 * t);
    default:
      return t;
  }
}

export function generateCameraPositions(
  mode: CameraModeKey,
  center: [number, number],
  duration: number,
  feel: CameraFeelKey
): CameraPosition[] {
  const feelConfig = FEEL_CONFIG[feel];
  const frames = Math.ceil(duration * 30);
  const positions: CameraPosition[] = [];

  for (let i = 0; i < frames; i++) {
    const t = i / frames;
    const easedT = applyEasing(t, feelConfig.easing);

    let position: CameraPosition;

    switch (mode) {
      case "orbit360": {
        const angle = easedT * 2 * Math.PI;
        const radius = 0.002 + Math.sin(t * Math.PI) * 0.001;
        position = {
          lat: center[0] + Math.sin(angle) * radius,
          lon: center[1] + Math.cos(angle) * radius * 1.3,
          zoom: 16 - easedT * 0.5,
          pitch: 55 + Math.sin(easedT * Math.PI) * 5,
          bearing: easedT * 360,
        };
        break;
      }
      case "spiralDescend": {
        const spiralAngle = easedT * Math.PI * 1.5;
        position = {
          lat: center[0] + Math.sin(spiralAngle) * 0.001 * easedT,
          lon: center[1] + Math.cos(spiralAngle) * 0.001 * easedT,
          zoom: 13 + 4 * easedT,
          pitch: 70 - 25 * easedT,
          bearing: -30 + 60 * easedT,
        };
        break;
      }
      case "topView": {
        const driftRadius = 0.0005;
        position = {
          lat: center[0] + Math.sin(t * Math.PI * 2) * driftRadius,
          lon: center[1] + Math.cos(t * Math.PI * 2) * driftRadius,
          zoom: 17 + Math.sin(t * Math.PI) * 0.3,
          pitch: 89,
          bearing: Math.sin(t * Math.PI * 0.5) * 30,
        };
        break;
      }
      case "lowPass": {
        const curve = Math.sin(t * Math.PI);
        position = {
          lat: center[0] + (t - 0.5) * 0.003 * curve,
          lon: center[1] + (t - 0.3) * 0.002,
          zoom: 17.5 - curve * 1.5,
          pitch: 40 + curve * 10,
          bearing: -60 + 180 * easedT,
        };
        break;
      }
      case "fourCorners": {
        const corners = [-45, 45, 135, 225];
        const segmentIndex = Math.floor(t * corners.length);
        const cornerT = (t * corners.length) % 1;
        position = {
          lat: center[0],
          lon: center[1],
          zoom: 15 + (segmentIndex % 2) * 0.5,
          pitch: 50,
          bearing: corners[segmentIndex] + Math.sin(cornerT * Math.PI) * 10,
        };
        break;
      }
      default:
        position = { lat: center[0], lon: center[1], zoom: 16, pitch: 55, bearing: 0 };
    }

    positions.push(position);
  }

  return positions;
}

export async function captureMapboxFrame(
  _map: unknown,
  config: CaptureConfig
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 16));
  
  const canvas = document.createElement("canvas");
  canvas.width = config.width;
  canvas.height = config.height;
  
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function calculateParcelBounds(geoJson: Feature<Polygon | MultiPolygon>): {
  center: [number, number];
  bounds: [[number, number], [number, number]];
} {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  
  const coords = geoJson.geometry.type === "Polygon"
    ? geoJson.geometry.coordinates[0]
    : geoJson.geometry.coordinates[0][0];
  
  for (const coord of coords) {
    const [lon, lat] = coord;
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }
  
  return {
    center: [(minLat + maxLat) / 2, (minLon + maxLon) / 2],
    bounds: [[minLon, minLat], [maxLon, maxLat]],
  };
}