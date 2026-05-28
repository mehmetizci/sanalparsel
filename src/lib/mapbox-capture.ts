/**
 * Mapbox Frame Capture System
 */
import puppeteer, { Browser, Page } from "puppeteer";

// Extend window for browser globals
declare global {
  interface Window {
    mapboxToken?: string;
    mapConfig?: {
      style: string;
      center: [number, number];
      zoom: number;
      pitch: number;
      bearing: number;
    };
    map?: {
      isStyleLoaded: () => boolean;
      getZoom: () => number;
      getCenter: () => { lng: number; lat: number };
      getCanvas: () => { toDataURL: (type: string, quality?: number) => string };
      easeTo: (opts: object) => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

interface MapboxConfig {
  center: [number, number];
  zoom: number;
  width: number;
  height: number;
  pitch: number;
  bearing: number;
  style: string;
}

interface CameraKeyframe {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

interface CaptureResult {
  success: boolean;
  data?: Buffer;
  error?: string;
}

export class MapboxFrameCapture {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: MapboxConfig;
  private isReady = false;

  constructor(config: MapboxConfig) {
    this.config = config;
  }

  async initialize(mapboxToken: string): Promise<void> {
    console.log("[MapboxCapture] Initializing Puppeteer...");

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    this.page = await this.browser.newPage();

    await this.page.setViewport({
      width: this.config.width,
      height: this.config.height,
      deviceScaleFactor: 2,
    });

    const html = this.createMapboxHTML(mapboxToken);
    await this.page.setContent(html, { waitUntil: "domcontentloaded" });

    await this.waitForMapReady();
    this.isReady = true;
    console.log("[MapboxCapture] Ready!");
  }

  private createMapboxHTML(token: string): string {
    const { center, zoom, pitch, bearing, style, width, height } = this.config;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mapbox</title>
  <style>
    * { margin: 0; padding: 0; }
    body { overflow: hidden; width: ${width}px; height: ${height}px; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
  <script>
    window.mapboxToken = '${token}';
    window.mapConfig = {
      style: '${style}',
      center: [${center[0]}, ${center[1]}],
      zoom: ${zoom},
      pitch: ${pitch},
      bearing: ${bearing}
    };
  </script>
</body>
</html>`;
  }

  private async waitForMapReady(): Promise<void> {
    if (!this.page) throw new Error("Page not initialized");
    console.log("[MapboxCapture] Waiting for map...");

    await this.page.evaluate(() => new Promise<void>((resolve) => {
      const config = window.mapConfig;

      const initMap = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapboxgl = (globalThis as any).mapboxgl as { Map: new (opts: object) => object } | undefined;
        if (mapboxgl?.Map && config) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const map = new (mapboxgl as any).Map({
            container: 'map',
            style: config.style,
            center: config.center,
            zoom: config.zoom,
            pitch: config.pitch,
            bearing: config.bearing,
            antialias: true,
            preserveDrawingBuffer: true,
          });
          window.map = map;

          map.on('load', () => {
            console.log('MAP_LOADED');
            resolve();
          });
        } else {
          resolve();
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((globalThis as any).mapboxgl) {
        initMap();
      } else {
        setTimeout(initMap, 1000);
      }
    }));

    await new Promise((r) => setTimeout(r, 3000));
    console.log("[MapboxCapture] Map ready!");
  }

  async captureFrame(keyframe: CameraKeyframe): Promise<CaptureResult> {
    if (!this.page || !this.isReady) {
      return { success: false, error: "Map not ready" };
    }

    try {
      await this.page.evaluate((kf) => {
        if (window.map) {
          window.map.easeTo({
            center: kf.center,
            zoom: kf.zoom,
            pitch: kf.pitch,
            bearing: kf.bearing,
            duration: 0,
          });
        }
      }, keyframe);

      await new Promise((r) => setTimeout(r, 150));

      const dataUrl = await this.page.evaluate(() => {
        if (!window.map) return '';
        const canvas = window.map.getCanvas();
        return canvas.toDataURL('image/png', 1.0);
      });

      if (!dataUrl) {
        return { success: false, error: "Failed to capture canvas" };
      }

      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      if (!this.validateFrame(buffer)) {
        await new Promise((r) => setTimeout(r, 300));
        const retryDataUrl = await this.page.evaluate(() => {
          if (!window.map) return '';
          return window.map.getCanvas().toDataURL('image/png', 1.0);
        });
        if (!retryDataUrl) {
          return { success: false, error: "Retry capture failed" };
        }
        const retryBuffer = Buffer.from(retryDataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
        if (this.validateFrame(retryBuffer)) {
          return { success: true, data: retryBuffer };
        }
        return { success: false, error: "Frame validation failed" };
      }

      return { success: true, data: buffer };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private validateFrame(buffer: Buffer): boolean {
    if (buffer.length < 100) return false;
    const magic = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    for (let i = 0; i < 8; i++) {
      if (buffer[i] !== magic[i]) return false;
    }
    return true;
  }

  async captureFrameAtPosition(
    center: [number, number],
    zoom: number,
    pitch: number,
    bearing: number
  ): Promise<CaptureResult> {
    return this.captureFrame({ center, zoom, pitch, bearing });
  }

  async getMapInfo(): Promise<{loaded: boolean; zoom: number; center: {lng: number; lat: number} | null}> {
    if (!this.page) return { loaded: false, zoom: 0, center: null };
    return this.page.evaluate(() => {
      return {
        loaded: window.map?.isStyleLoaded() ?? false,
        zoom: window.map?.getZoom() ?? 0,
        center: window.map?.getCenter() ?? null,
      };
    });
  }

  async destroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isReady = false;
    }
  }
}

export function generateCinematicCameraPath(
  center: [number, number],
  mode: string,
  feel: string,
  duration: number,
  fps: number
): CameraKeyframe[] {
  const totalFrames = duration * fps;
  const keyframes: CameraKeyframe[] = [];

  const feelSettings: Record<string, { speed: number; radius: number; zoomRange: [number, number] }> = {
    soft: { speed: 0.5, radius: 0.002, zoomRange: [15, 17] },
    cinematic: { speed: 1.0, radius: 0.003, zoomRange: [14.5, 16.5] },
    dynamic: { speed: 1.5, radius: 0.004, zoomRange: [14, 17] },
  };

  const feelConfig = feelSettings[feel] || feelSettings.cinematic;

  switch (mode) {
    case "orbit360": {
      for (let i = 0; i < totalFrames; i++) {
        const t = i / totalFrames;
        const angle = t * 2 * Math.PI;
        const easedT = smoothstep(Math.min(1, t * feelConfig.speed));

        keyframes.push({
          center: [
            center[0] + Math.cos(angle) * feelConfig.radius,
            center[1] + Math.sin(angle) * feelConfig.radius,
          ],
          zoom: feelConfig.zoomRange[0] + (1 - easedT) * 0.5,
          pitch: 45 + Math.sin(t * Math.PI * 4) * 15,
          bearing: t * 360,
        });
      }
      break;
    }

    case "spiralDescend": {
      for (let i = 0; i < totalFrames; i++) {
        const t = i / totalFrames;
        const easedT = smoothstep(t);
        const angle = t * Math.PI * 3;

        keyframes.push({
          center: [
            center[0] + Math.cos(angle) * (1 - easedT) * 0.002,
            center[1] + Math.sin(angle) * (1 - easedT) * 0.002,
          ],
          zoom: 13 + easedT * 3,
          pitch: 70 - easedT * 40,
          bearing: easedT * 45,
        });
      }
      break;
    }

    case "topView": {
      for (let i = 0; i < totalFrames; i++) {
        const t = i / totalFrames;
        const drift = Math.sin(t * Math.PI * 2) * 0.0003;

        keyframes.push({
          center: [center[0] + drift, center[1] + drift * 0.5],
          zoom: 17,
          pitch: 0,
          bearing: 0,
        });
      }
      break;
    }

    default: {
      for (let i = 0; i < totalFrames; i++) {
        const t = i / totalFrames;
        const easedT = smoothstep(t);

        keyframes.push({
          center: [
            center[0] + (t - 0.5) * 0.003,
            center[1] + Math.sin(t * Math.PI * 2) * 0.001,
          ],
          zoom: 16 - easedT * 0.5,
          pitch: 50 + Math.sin(t * Math.PI) * 20,
          bearing: easedT * 90,
        });
      }
    }
  }

  return keyframes;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}