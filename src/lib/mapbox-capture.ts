/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mapbox Frame Capture System
 * 
 * Uses Puppeteer + headless Chromium to capture real Mapbox satellite imagery.
 * Proper wait for tiles to load before capture.
 */
import puppeteer, { Browser, Page } from "puppeteer";
import fs from "fs/promises";
import path from "path";

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
    mapInitReady?: boolean;
    map?: {
      isStyleLoaded: () => boolean;
      isMoving: () => boolean;
      getZoom: () => number;
      getCenter: () => { lng: number; lat: number };
      getCanvas: () => HTMLCanvasElement;
      easeTo: (opts: object) => void;
      jumpTo: (opts: object) => void;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      once: (event: string, callback: (...args: unknown[]) => void) => void;
      loaded: boolean;
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
  debugInfo?: string;
}

export class MapboxFrameCapture {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: MapboxConfig;
  private isReady = false;
  private debugDir: string | null = null;
  private frameCount = 0;

  constructor(config: MapboxConfig) {
    this.config = config;
  }

  setDebugDir(dir: string) {
    this.debugDir = dir;
  }

  async initialize(mapboxToken: string): Promise<void> {
    console.log("[MapboxCapture] Initializing Puppeteer...");
    
    // Set cache directory
    const cacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/.cache/puppeteer';
    console.log(`[MapboxCapture] Puppeteer cache dir: ${cacheDir}`);

    // Create debug directory
    if (this.debugDir) {
      await fs.mkdir(this.debugDir, { recursive: true });
    }

    console.log("[MapboxCapture] Launching Chrome...");
    console.log(`[MapboxCapture] Puppeteer executable path: ${puppeteer.executablePath()}`);
    
    // Puppeteer will find Chrome automatically from its bundled browser cache
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    
    this.browser = browser;
    console.log("[MapboxCapture] Chrome launched successfully!");

    this.page = await this.browser.newPage();

    // Set proper viewport with deviceScaleFactor for quality
    await this.page.setViewport({
      width: this.config.width,
      height: this.config.height,
      deviceScaleFactor: 2, // High quality
    });

    // Set user agent to appear as real browser
    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const html = this.createMapboxHTML(mapboxToken);
    
    // Use networkidle0 to wait for all network requests to complete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.page.setContent(html, { waitUntil: "networkidle0" as any, timeout: 60000 });

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
  <title>Mapbox Satellite</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: ${width}px; 
      height: ${height}px; 
      overflow: hidden; 
      background: #000;
    }
    #map { 
      width: 100%; 
      height: 100%; 
      position: absolute;
      top: 0;
      left: 0;
    }
    #debug {
      position: absolute;
      top: 10px;
      left: 10px;
      color: white;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      background: rgba(0,0,0,0.7);
      padding: 5px;
    }
  </style>
</head>
<body>
  <div id="debug">Initializing...</div>
  <div id="map"></div>
  
  <!-- Mapbox GL JS -->
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
  
  <script>
    // Store config before map init
    window.mapboxToken = '${token}';
    window.mapConfig = {
      style: '${style}',
      center: [${center[0]}, ${center[1]}],
      zoom: ${zoom},
      pitch: ${pitch},
      bearing: ${bearing}
    };
    window.mapInitReady = true;
    
    // Debug logging function
    function debugLog(msg) {
      console.log('[MAP]', msg);
      const debugEl = document.getElementById('debug');
      if (debugEl) debugEl.textContent = msg;
    }
    
    debugLog('Script loaded, checking mapboxgl...');
    
    // Wait for mapboxgl to be available
    function initMap() {
      if (typeof mapboxgl === 'undefined') {
        debugLog('Waiting for mapboxgl...');
        setTimeout(initMap, 500);
        return;
      }
      
      debugLog('mapboxgl found, initializing map...');
      
      mapboxgl.accessToken = window.mapboxToken;
      
      const config = window.mapConfig;
      
      const map = new mapboxgl.Map({
        container: 'map',
        style: config.style,
        center: config.center,
        zoom: config.zoom,
        pitch: config.pitch,
        bearing: config.bearing,
        antialias: true,
        preserveDrawingBuffer: true,
        fadeDuration: 0,
        interactive: false,
        attributionControl: false,
        pitchWithRotate: false,
      });
      
      window.map = map;
      
      map.on('load', function() {
        debugLog('Map style loaded, waiting for tiles...');
        window.map.loaded = true;
      });
      
      map.on('error', function(e) {
        debugLog('Map error: ' + JSON.stringify(e));
      });
      
      // Check for tile load progress
      let lastTileCount = 0;
      map.on('dataloading', function(e) {
        if (e.dataType === 'source') {
          debugLog('Source loading: ' + e.sourceId);
        }
      });
      
      // Wait for idle - this means all tiles are loaded
      function checkIdle() {
        if (!window.map) return;
        
        const state = map.tileLoading ? 'loading' : 'loaded';
        debugLog('Map state: ' + state + ', zoom: ' + map.getZoom());
        
        if (!map.isMoving() && map.loaded) {
          map.once('idle', function() {
            debugLog('MAP IS IDLE - Ready to capture!');
          });
        }
      }
      
      setInterval(checkIdle, 1000);
    }
    
    // Start initialization after scripts load
    if (document.readyState === 'complete') {
      initMap();
    } else {
      window.addEventListener('load', initMap);
    }
  </script>
</body>
</html>`;
  }

  private async waitForMapReady(): Promise<void> {
    if (!this.page) throw new Error("Page not initialized");
    console.log("[MapboxCapture] Waiting for map to be fully ready...");

    // Wait for the page to be completely loaded
    await this.page.waitForFunction(() => {
      return document.readyState === 'complete';
    }, { timeout: 30000 });

    // Wait for debug message to indicate map is initializing
    await this.page.waitForFunction(
      () => {
        const debug = document.getElementById('debug');
        return debug && debug.textContent && debug.textContent.includes('mapboxgl');
      },
      { timeout: 15000 }
    ).catch(() => console.log("Debug element not found yet"));

    // Wait for map to be created
    await this.page.waitForFunction(() => {
      return !!(window as any).map && (window as any).map.loaded;
    }, { timeout: 60000 });

    console.log("[MapboxCapture] Map loaded, waiting for tiles...");

    // CRITICAL: Wait for the map to be truly idle (all tiles loaded)
    await this.page.evaluate(() => new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.log("[MAP] Timeout waiting for idle, proceeding anyway");
        resolve();
      }, 30000);

      const checkAndResolve = () => {
        const map = (window as any).map;
        if (!map) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        // Check if map is ready
        if (!map.loaded || map.isMoving()) {
          setTimeout(checkAndResolve, 500);
          return;
        }

        // Wait for idle event
        map.once('idle', () => {
          console.log("[MAP] Idle event fired - tiles should be loaded");
          clearTimeout(timeout);
          resolve();
        });

        // Double check after a delay
        setTimeout(() => {
          if (!map.isMoving()) {
            clearTimeout(timeout);
            resolve();
          }
        }, 5000);
      };

      checkAndResolve();
    }));

    // Extra buffer for satellite tiles to render
    await new Promise((r) => setTimeout(r, 3000));

    // Take a test capture to verify
    const testCapture = await this.captureTestFrame();
    if (testCapture.success && testCapture.data) {
      const sizeKB = testCapture.data.length / 1024;
      console.log(`[MapboxCapture] Test frame captured: ${sizeKB.toFixed(1)} KB`);
      
      if (this.debugDir) {
        await fs.writeFile(
          path.join(this.debugDir, "00_test_frame.png"),
          testCapture.data
        );
      }
      
      // Validate it's not just a blank/green frame
      if (sizeKB < 50) {
        console.log("[MapboxCapture] WARNING: Test frame is very small, tiles may not be loaded");
      }
    }

    console.log("[MapboxCapture] Map ready with tiles!");
  }

  private async captureTestFrame(): Promise<CaptureResult> {
    if (!this.page) return { success: false, error: "Page not initialized" };

    try {
      const dataUrl = await this.page.evaluate(() => {
        const map = (window as any).map;
        if (!map || !map.getCanvas) return '';
        const canvas = map.getCanvas();
        if (!canvas) return '';
        return canvas.toDataURL('image/png', 1.0);
      });

      if (!dataUrl) return { success: false, error: "No canvas" };

      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      return { success: true, data: Buffer.from(base64Data, "base64") };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async captureFrame(keyframe: CameraKeyframe): Promise<CaptureResult> {
    if (!this.page || !this.isReady) {
      return { success: false, error: "Map not ready" };
    }

    this.frameCount++;
    const frameNum = this.frameCount;

    try {
      // Move camera to new position
      await this.page.evaluate((kf) => {
        const map = (window as any).map;
        if (map) {
          map.easeTo({
            center: kf.center,
            zoom: kf.zoom,
            pitch: kf.pitch,
            bearing: kf.bearing,
            duration: 0,
          });
        }
      }, keyframe);

      // Wait for camera animation to complete
      await this.page.evaluate(() => new Promise<void>((resolve) => {
        const map = (window as any).map;
        if (!map) {
          resolve();
          return;
        }

        // Wait for moveend
        const timeout = setTimeout(resolve, 500);
        
        if (map.isMoving()) {
          map.once('moveend', () => {
            clearTimeout(timeout);
            resolve();
          });
        } else {
          clearTimeout(timeout);
          resolve();
        }
      }));

      // CRITICAL: Wait for tiles to load at new position
      await this.page.evaluate(() => new Promise<void>((resolve) => {
        const map = (window as any).map;
        if (!map) {
          resolve();
          return;
        }

        const timeout = setTimeout(resolve, 5000);
        
        // Wait for idle after camera stops
        map.once('idle', () => {
          console.log(`[Frame ${frameNum}] Idle after camera move`);
          clearTimeout(timeout);
          resolve();
        });

        // Fallback: check periodically
        let checks = 0;
        const checkInterval = setInterval(() => {
          checks++;
          if (!map.isMoving() && checks > 10) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        }, 500);
      }));

      // Extra buffer for tile rendering
      await new Promise((r) => setTimeout(r, 500));

      // Capture canvas
      const dataUrl = await this.page.evaluate(() => {
        const map = (window as any).map;
        if (!map || !map.getCanvas) return '';
        const canvas = map.getCanvas();
        if (!canvas) return '';
        return canvas.toDataURL('image/png', 1.0);
      });

      if (!dataUrl) {
        return { success: false, error: "Failed to capture canvas" };
      }

      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Validate frame
      if (!this.validateFrame(buffer)) {
        console.log(`[Frame ${frameNum}] Invalid frame, retrying...`);
        
        // Retry with longer wait
        await this.page.evaluate(() => new Promise<void>((resolve) => {
          const map = (window as any).map;
          if (map) {
            map.once('idle', resolve);
          }
          setTimeout(resolve, 5000);
        }));

        const retryDataUrl = await this.page.evaluate(() => {
          const map = (window as any).map;
          return map?.getCanvas?.()?.toDataURL('image/png', 1.0) || '';
        });

        if (!retryDataUrl) {
          return { success: false, error: "Retry capture failed" };
        }

        const retryBuffer = Buffer.from(retryDataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
        
        if (this.validateFrame(retryBuffer)) {
          // Save debug frame
          if (this.debugDir && this.frameCount <= 5) {
            await fs.writeFile(
              path.join(this.debugDir, `frame_${String(this.frameCount).padStart(6, "0")}_retry.png`),
              retryBuffer
            );
          }
          return { success: true, data: retryBuffer };
        }
        
        return { success: false, error: "Frame validation failed after retry" };
      }

      // Save first few frames for debugging
      if (this.debugDir && this.frameCount <= 5) {
        await fs.writeFile(
          path.join(this.debugDir, `frame_${String(this.frameCount).padStart(6, "0")}.png`),
          buffer
        );
      }

      return { success: true, data: buffer };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private validateFrame(buffer: Buffer): boolean {
    // Minimum size check - a real satellite image should be at least 50KB
    if (buffer.length < 50000) {
      console.log(`[MapboxCapture] Frame too small: ${buffer.length} bytes`);
      return false;
    }

    // PNG magic bytes check
    const magic = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    for (let i = 0; i < 8; i++) {
      if (buffer[i] !== magic[i]) {
        console.log("[MapboxCapture] Invalid PNG header");
        return false;
      }
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
      const map = (window as any).map;
      return {
        loaded: map?.loaded ?? false,
        zoom: map?.getZoom?.() ?? 0,
        center: map?.getCenter?.() ?? null,
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