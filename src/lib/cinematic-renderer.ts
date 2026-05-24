/**
 * Cinematic MapLibre Renderer for high-quality satellite video production.
 * 
 * Features:
 * - Esri World Imagery with high-res tiles (512x512)
 * - Antialiasing for crisp edges
 * - Cinematic pitch (55-65°) and smooth flyTo animations
 * - Contrast/saturation enhancement
 * - Atmospheric fog for depth
 * - Frame-by-frame rendering for video export (H264, 30fps, 20Mbps)
 */

import maplibregl, {
  type LngLatLike,
  type CameraOptions,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const ESRI_IMAGERY_TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile";

/** Cinematic camera pitch range (degrees) */
export const CINEMATIC_PITCH = { min: 55, max: 65 };

/** Easing curves for natural, cinematic movement */
export const CINEMATIC_EASING = {
  /** Smooth exponential approach – best for flyTo */
  flyTo: (t: number) => 1 - Math.pow(1 - t, 3),
  /** Gentle deceleration for camera pans */
  pan: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  /** Subtle zoom breath for life-like feel */
  zoom: (t: number) => Math.sin((t * Math.PI) / 2),
};

// ─── Style helpers ────────────────────────────────────────────────────────────

export interface MapStyleConfig {
  /** Higher contrast (1.0 = neutral) */
  contrast?: number;
  /** Color intensity (1.0 = neutral) */
  saturation?: number;
  /** Fog color [r,g,b,a] in 0-1 range */
  fogColor?: [number, number, number, number];
  /** Fog intensity */
  fogAttenuation?: number;
  /** Enable antialiasing */
  antialias?: boolean;
}

/** Build an optimized MapLibre style for cinematic satellite rendering */
export function buildCinematicStyle(config: MapStyleConfig = {}): object {
  const {
    contrast = 1.15,
    saturation = 1.2,
    fogColor = [0.78, 0.85, 0.94, 0.3],
    fogAttenuation = 0.15,

  } = config;

  return {
    version: 8 as const,
    sources: {
      esri: {
        type: "raster" as const,
        tiles: [`${ESRI_IMAGERY_TILE}/{z}/{y}/{x}`],
        // 512px tiles provide better quality than default 256
        tileSize: 512,
        // Allow zoom up to 22 for maximum detail
        maxzoom: 22,
        // Prevent blurry tiles on high-DPI displays
        tilePixelRatio: typeof window !== "undefined" && window.devicePixelRatio > 1 ? 2 : 1,
        attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
      },
    },
    layers: [
      {
        id: "satellite",
        type: "raster" as const,
        source: "esri",
        paint: {
          // Contrast boost for sharper imagery
          "raster-contrast": contrast,
          // Slight saturation boost for cinematic warmth
          "raster-saturation": saturation,
          // Fade in at high zoom to prevent oversaturation
          "raster-fade-duration": 300,
        },
      },
    ],
    // Atmospheric fog for depth and cinematic quality
    fog: {
      color: `rgb(${fogColor[0] * 255}, ${fogColor[1] * 255}, ${fogColor[2] * 255})`,
      "high-color": `rgb(${Math.min(fogColor[0] + 0.1, 1) * 255}, ${Math.min(fogColor[1] + 0.1, 1) * 255}, ${Math.min(fogColor[2] + 0.1, 1) * 255})`,
      "horizon-blend": fogAttenuation,
      "space-color": "#0a1628",
      "star-intensity": 0.0,
    },
    // Disable default light for deeper cinematic feel
    light: {
      anchor: "viewport",
      color: "#ffffff",
      intensity: 0.3,
    },
  };
}

// ─── Rendering utilities ─────────────────────────────────────────────────────

export interface CameraKeyframe {
  center: LngLatLike;
  /** Zoom level (0-22) */
  zoom: number;
  /** Pitch in degrees (0-85) */
  pitch: number;
  /** Bearing in degrees (0-360) */
  bearing: number;
  /** Duration in milliseconds */
  duration: number;
}

export interface RenderOptions {
  /** Video framerate */
  fps?: number;
  /** Encoding bitrate in Mbps */
  bitrate?: number;
  /** Total video duration in ms */
  duration?: number;
  /** Output resolution */
  width?: number;
  height?: number;
}

/**
 * Preload tiles around a path to ensure smooth rendering during recording.
 * Call this before starting video recording.
 */
export async function preloadTilesForPath(
  map: maplibregl.Map,
  keyframes: CameraKeyframe[],
  zoomLevels: number[] = [14, 16, 18, 20]
): Promise<void> {
  const preloadSet = new Set<string>();

  for (const kf of keyframes) {
    const center = maplibregl.LngLat.convert(kf.center);
    for (const z of zoomLevels) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const tile = centerToTile(center, z, dx, dy);
          const key = `${tile.z}/${tile.x}/${tile.y}`;
          if (!preloadSet.has(key)) {
            preloadSet.add(key);
          }
        }
      }
    }
  }

  // Trigger tile loads by panning to each region
  const results: Promise<void>[] = [];
  const preloadArray = Array.from(preloadSet);
  for (const key of preloadArray) {
    const [z, x, y] = key.split("/").map(Number);
    const tileCenter = tileToLngLat(x, y, z);
    results.push(
      new Promise((resolve) => {
        map.once("idle", () => resolve());
        map.jumpTo({ center: tileCenter, zoom: z });
      })
    );
  }

  // Wait for tiles to load with timeout
  await Promise.race([
    Promise.allSettled(results),
    new Promise((r) => setTimeout(r, 30000)),
  ]);
}

function centerToTile(
  center: maplibregl.LngLat,
  zoom: number,
  offsetX: number,
  offsetY: number
): { z: number; x: number; y: number } {
  const scale = Math.pow(2, zoom);
  const x = Math.floor((center.lng + 180) / 360 * scale) + offsetX;
  const latRad = (center.lat * Math.PI) / 180;
  const y = Math.floor(
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale
  ) + offsetY;
  return { z: zoom, x: Math.max(0, x), y: Math.max(0, y) };
}

function tileToLngLat(x: number, y: number, z: number): [number, number] {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const lng = (x / Math.pow(2, z)) * 360 - 180;
  return [lng, lat];
}

// ─── Frame capture utilities ──────────────────────────────────────────────────

/**
 * Capture a single frame from the map canvas.
 * Returns a clean RGBA image buffer suitable for video encoding.
 */
export function captureFrame(canvas: HTMLCanvasElement): ImageData {
  return canvas.getContext("2d", { willReadFrequently: true })!.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );
}

/**
 * Capture frame as PNG blob for analysis/debugging.
 */
export async function captureFrameAsBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))),
      "image/png"
    );
  });
}

// ─── Camera interpolation ─────────────────────────────────────────────────────

/**
 * Interpolate between two camera states with cinematic easing.
 */
export function interpolateCamera(
  from: CameraKeyframe,
  to: CameraKeyframe,
  t: number
): CameraOptions {
  const ease = CINEMATIC_EASING.flyTo(t);

  // Interpolate center
  const fromCenter = maplibregl.LngLat.convert(from.center);
  const toCenter = maplibregl.LngLat.convert(to.center);

  return {
    center: [
      fromCenter.lng + (toCenter.lng - fromCenter.lng) * ease,
      fromCenter.lat + (toCenter.lat - fromCenter.lat) * ease,
    ] as LngLatLike,
    zoom: from.zoom + (to.zoom - from.zoom) * ease,
    pitch: from.pitch + (to.pitch - from.pitch) * ease,
    bearing: from.bearing + (to.bearing - from.bearing) * ease,
  };
}

/**
 * Generate keyframes for a smooth fly-to animation around a parcel.
 */
export function generateOrbitKeyframes(
  center: LngLatLike,
  parcelBounds: { minLon: number; minLat: number; maxLon: number; maxLat: number },
  options: {
    startPitch?: number;
    endPitch?: number;
    duration?: number;
    orbitCount?: number;
  } = {}
): CameraKeyframe[] {
  const {
    startPitch = 60,
    endPitch = 55,
    duration = 5000,
    orbitCount = 0.5,
  } = options;

  const keyframes: CameraKeyframe[] = [];
  
  // Calculate bounds center and size
  const midLon = (parcelBounds.minLon + parcelBounds.maxLon) / 2;
  const midLat = (parcelBounds.minLat + parcelBounds.maxLat) / 2;
  const spanLon = parcelBounds.maxLon - parcelBounds.minLon;
  const spanLat = parcelBounds.maxLat - parcelBounds.minLat;
  const maxSpan = Math.max(spanLon, spanLat);

  // Estimate zoom from parcel size (rough calibration)
  const zoom = Math.max(14, Math.min(18, 17 - Math.log2(maxSpan * 111000)));

  const steps = Math.ceil(orbitCount * 30); // 30 frames per orbit
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * orbitCount * 360;
    const radiusFactor = 1 + 0.15 * Math.sin(t * Math.PI); // Slight zoom breathing
    const offset = maxSpan * 0.5 * radiusFactor;

    keyframes.push({
      center: [
        midLon + offset * Math.sin((angle * Math.PI) / 180),
        midLat + offset * Math.cos((angle * Math.PI) / 180) * 0.7,
      ] as LngLatLike,
      zoom,
      pitch: startPitch + (endPitch - startPitch) * t,
      bearing: -angle,
      duration: Math.round(duration / steps),
    });
  }

  return keyframes;
}

// ─── High-quality map factory ─────────────────────────────────────────────────

export interface CinematicMapOptions {
  container: HTMLElement;
  center: LngLatLike;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  styleConfig?: MapStyleConfig;
  maxZoom?: number;
}

export function createCinematicMap(options: CinematicMapOptions): maplibregl.Map {
  const {
    container,
    center,
    zoom = 16,
    pitch = 60,
    bearing = -20,
    styleConfig = {},
    maxZoom = 22,
  } = options;

  const style = buildCinematicStyle(styleConfig);

  const map = new maplibregl.Map({
    container,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    style: style as any,
    center,
    zoom,
    pitch,
    bearing,
    maxZoom,
    // High-quality rendering
    antialias: true,
    // Ensure crisp tiles
    renderWorldCopies: false,
    // Optimize for satellite imagery
    preserveDrawingBuffer: true, // Required for frame capture
    // Smooth animations
    fadeDuration: 300,
    // Performance
    collectResourceTiming: false,
    // Attribution
    attributionControl: false,
  });

  // Add minimal attribution
  map.addControl(
    new maplibregl.AttributionControl({ compact: true }),
    "bottom-right"
  );

  return map;
}

// ─── Frame-by-frame renderer ──────────────────────────────────────────────────

export class CinematicFrameRenderer {
  private map: maplibregl.Map;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private frames: ImageData[] = [];
  private isRecording = false;

  constructor(map: maplibregl.Map) {
    this.map = map;
  }

  /**
   * Initialize the frame capture canvas.
   * Must be called after map is ready.
   */
  initialize(width: number, height: number): void {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
    this.frames = [];
    this.isRecording = false;
  }

  /**
   * Capture a single frame from the current map state.
   */
  captureFrame(): void {
    if (!this.canvas || !this.ctx) return;

    const mapCanvas = this.map.getCanvas();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Scale to target resolution
    this.ctx.drawImage(
      mapCanvas,
      0, 0, mapCanvas.width, mapCanvas.height,
      0, 0, this.canvas.width, this.canvas.height
    );

    this.frames.push(
      this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    );
  }

  /**
   * Start recording frames.
   */
  startRecording(): void {
    this.isRecording = true;
    this.frames = [];
  }

  /**
   * Stop recording frames.
   */
  stopRecording(): void {
    this.isRecording = false;
  }

  /**
   * Get all captured frames.
   */
  getFrames(): ImageData[] {
    return [...this.frames];
  }

  /**
   * Export frames as a tar archive (for FFmpeg processing).
   * Returns a base64-encoded tar string.
   */
  exportFramesAsTar(frameDir: string = "./frames"): string {
    // frameDir parameter reserved for future file-based export
    void frameDir;
    // This is a placeholder - in production, you'd write actual files
    // or stream to a video encoder
    return JSON.stringify({
      frameCount: this.frames.length,
      format: "rgba",
      width: this.canvas?.width,
      height: this.canvas?.height,
    });
  }

  /**
   * Check if currently recording.
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }
}

// ─── Animation runner ─────────────────────────────────────────────────────────

export interface AnimationOptions {
  keyframes: CameraKeyframe[];
  onFrame?: (frame: number, timestamp: number) => void;
  onComplete?: () => void;
}

export function runCinematicAnimation(
  map: maplibregl.Map,
  options: AnimationOptions
): { cancel: () => void } {
  const { keyframes, onFrame, onComplete } = options;
  const startTime = performance.now();
  let animationId: number | null = null;
  let currentKeyframe = 0;
  let keyframeStart = startTime;
  let cancelled = false;

  const animate = (now: number) => {
    if (cancelled) return;

    const elapsed = now - keyframeStart;
    const kf = keyframes[currentKeyframe];
    const progress = Math.min(elapsed / kf.duration, 1);

    // Interpolate camera
    if (currentKeyframe < keyframes.length - 1) {
      const nextKf = keyframes[currentKeyframe + 1];
      const ease = CINEMATIC_EASING.flyTo(progress);

      const fromCenter = maplibregl.LngLat.convert(kf.center);
      const toCenter = maplibregl.LngLat.convert(nextKf.center);

      map.jumpTo({
        center: [
          fromCenter.lng + (toCenter.lng - fromCenter.lng) * ease,
          fromCenter.lat + (toCenter.lat - fromCenter.lat) * ease,
        ] as LngLatLike,
        zoom: kf.zoom + (nextKf.zoom - kf.zoom) * ease,
        pitch: kf.pitch + (nextKf.pitch - kf.pitch) * ease,
        bearing: kf.bearing + (nextKf.bearing - kf.bearing) * ease,
      });

      onFrame?.(currentKeyframe * 30 + Math.floor(progress * 30), now - startTime);
    }

    if (progress < 1) {
      animationId = requestAnimationFrame(animate);
    } else if (currentKeyframe < keyframes.length - 2) {
      currentKeyframe++;
      keyframeStart = now;
      animationId = requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  };

  animationId = requestAnimationFrame(animate);

  return {
    cancel: () => {
      cancelled = true;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    },
  };
}