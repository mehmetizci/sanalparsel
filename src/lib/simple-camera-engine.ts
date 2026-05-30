/**
 * Simple Cinematic Camera Engine v4
 * 
 * Sıralı 6 sahne sistemi:
 * 1. 360 Orbit - %30 (dönüş)
 * 2. Kuzeyden Yaklaşım - %15
 * 3. Güneyden Yaklaşım - %15
 * 4. Doğudan Yaklaşım - %15
 * 5. Batıdan Yaklaşım - %15
 * 6. Final Yaklaşım - %10
 * 
 * Kurallar:
 * - center = parcelCenter (ASLA değişmez)
 * - Zoom sınırları içinde kalır
 * - Bearing + zoom ile yaklaşım
 * - Karmaşık blending YOK
 */

import type { CameraFeel } from "@/lib/parcel-store";

// ─── Sabitler ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 14;      // Parsel küçük kalmaz (max görüntü)
const MAX_ZOOM = 17;      // Parsel kadrajdan taşmaz (min görüntü)

const SCENE_DURATIONS = {
  orbit: 0.30,           // %30
  north: 0.15,          // %15
  south: 0.15,          // %15
  east: 0.15,           // %15
  west: 0.15,           // %15
  final: 0.10,          // %10
};

// ─── Easing ─────────────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function getEasing(feel: CameraFeel): (t: number) => number {
  switch (feel) {
    case "soft":
      return easeInOutQuint;
    case "cinematic":
      return easeInOutCubic;
    case "dynamic":
      return easeOutExpo;
  }
}

// ─── Türler ─────────────────────────────────────────────────────────────────

export interface CameraState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  altitude: number;
}

export type SceneName = 'orbit' | 'north' | 'south' | 'east' | 'west' | 'final';

export interface SceneInfo {
  name: SceneName;
  progress: number; // 0-1 within scene
  globalProgress: number; // 0-1 overall
}

// ─── Basit Kamera Motoru ─────────────────────────────────────────────────────

export interface SimpleCameraOptions {
  parcelCenter: [number, number];
  altitude: number;
  duration: number; // Video duration in seconds
  feel: CameraFeel;
}

export class SimpleCameraEngine {
  private options: SimpleCameraOptions;
  private easing: (t: number) => number;
  private baseZoom: number;
  private startBearing: number;

  constructor(options: SimpleCameraOptions) {
    this.options = options;
    this.easing = getEasing(options.feel);
    
    // Base zoom altitude'dan hesaplanır
    // 100m → zoom ~16, 300m → zoom ~14, 400m → zoom ~13.5
    this.baseZoom = 18 - Math.log2(options.altitude / 50);
    
    // Rastgele başlangıç bearing'i (çeşitlilik için)
    this.startBearing = Math.random() * 360;
  }

  /**
   * Herhangi bir progress'te (0-1) kamera durumunu al
   */
  getState(progress: number): CameraState {
    const p = Math.max(0, Math.min(1, progress));
    const easedP = this.easing(p);
    
    const scene = this.getCurrentScene(easedP);
    const sceneProgress = this.getSceneProgress(easedP, scene);
    
    return this.calculateSceneState(scene, sceneProgress);
  }

  /**
   * Mevcut sahneyi bul
   */
  private getCurrentScene(progress: number): SceneName {
    if (progress < SCENE_DURATIONS.orbit) return 'orbit';
    if (progress < SCENE_DURATIONS.orbit + SCENE_DURATIONS.north) return 'north';
    if (progress < SCENE_DURATIONS.orbit + SCENE_DURATIONS.north + SCENE_DURATIONS.south) return 'south';
    if (progress < SCENE_DURATIONS.orbit + SCENE_DURATIONS.north + SCENE_DURATIONS.south + SCENE_DURATIONS.east) return 'east';
    if (progress < SCENE_DURATIONS.orbit + SCENE_DURATIONS.north + SCENE_DURATIONS.south + SCENE_DURATIONS.east + SCENE_DURATIONS.west) return 'west';
    return 'final';
  }

  /**
   * Sahne içi progress (0-1)
   */
  private getSceneProgress(globalProgress: number, scene: SceneName): number {
    const sceneStart = this.getSceneStartProgress(scene);
    const sceneDuration = this.getSceneDuration(scene);
    
    const progressInScene = globalProgress - sceneStart;
    return Math.max(0, Math.min(1, progressInScene / sceneDuration));
  }

  private getSceneStartProgress(scene: SceneName): number {
    switch (scene) {
      case 'orbit': return 0;
      case 'north': return SCENE_DURATIONS.orbit;
      case 'south': return SCENE_DURATIONS.orbit + SCENE_DURATIONS.north;
      case 'east': return SCENE_DURATIONS.orbit + SCENE_DURATIONS.north + SCENE_DURATIONS.south;
      case 'west': return SCENE_DURATIONS.orbit + SCENE_DURATIONS.north + SCENE_DURATIONS.south + SCENE_DURATIONS.east;
      case 'final': return SCENE_DURATIONS.orbit + SCENE_DURATIONS.north + SCENE_DURATIONS.south + SCENE_DURATIONS.east + SCENE_DURATIONS.west;
    }
  }

  private getSceneDuration(scene: SceneName): number {
    switch (scene) {
      case 'orbit': return SCENE_DURATIONS.orbit;
      case 'north': return SCENE_DURATIONS.north;
      case 'south': return SCENE_DURATIONS.south;
      case 'east': return SCENE_DURATIONS.east;
      case 'west': return SCENE_DURATIONS.west;
      case 'final': return SCENE_DURATIONS.final;
    }
  }

  /**
   * Sahneye göre kamera durumunu hesapla
   */
  private calculateSceneState(scene: SceneName, sceneProgress: number): CameraState {
    const { parcelCenter, altitude } = this.options;
    const easedSceneProgress = this.easing(sceneProgress);
    
    let zoom: number;
    let pitch: number;
    let bearing: number;

    switch (scene) {
      case 'orbit':
        // SAHNE 1: 360 derece dönüş
        // pitch = 45, bearing 0→360, zoom sabit
        zoom = this.baseZoom + 0.5; // Orta mesafe
        pitch = 45;
        // 360° dönerken smooth devam
        bearing = this.startBearing + easedSceneProgress * 360;
        break;

      case 'north':
        // SAHNE 2: Kuzeyden yaklaşım
        // bearing = 180 (kuzey)
        zoom = this.clampZoom(this.baseZoom + 0.5 + easedSceneProgress * 1.0);
        pitch = 45;
        bearing = 180 + easedSceneProgress * 30; // 180→210 arası hafif dönüş
        break;

      case 'south':
        // SAHNE 3: Güneyden yaklaşım
        // bearing = 0 (güney)
        zoom = this.clampZoom(this.baseZoom + 0.5 + easedSceneProgress * 1.0);
        pitch = 45;
        bearing = 0 + easedSceneProgress * 30; // 0→30 arası hafif dönüş
        break;

      case 'east':
        // SAHNE 4: Doğudan yaklaşım
        // bearing = 270 (doğu)
        zoom = this.clampZoom(this.baseZoom + 0.5 + easedSceneProgress * 1.0);
        pitch = 45;
        bearing = 270 + easedSceneProgress * 30; // 270→300 arası hafif dönüş
        break;

      case 'west':
        // SAHNE 5: Batıdan yaklaşım
        // bearing = 90 (batı)
        zoom = this.clampZoom(this.baseZoom + 0.5 + easedSceneProgress * 1.0);
        pitch = 45;
        bearing = 90 + easedSceneProgress * 30; // 90→120 arası hafif dönüş
        break;

      case 'final':
        // SAHNE 6: Final yaklaşımı (yavaş)
        // Yavaşça yaklaşır, parsel merkezde kalır
        zoom = this.clampZoom(this.baseZoom + 1.5 + easedSceneProgress * 1.5);
        pitch = 45;
        bearing = 120 + easedSceneProgress * 45; // Final dönüş
        break;

      default:
        zoom = this.baseZoom;
        pitch = 45;
        bearing = this.startBearing;
    }

    return {
      center: [parcelCenter[0], parcelCenter[1]], // ASLA değişmez
      zoom,
      pitch,
      bearing: ((bearing % 360) + 360) % 360,
      altitude,
    };
  }

  /**
   * Zoom'u sınırlar içinde tut
   */
  private clampZoom(zoom: number): number {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  }

  /**
   * Mevcut sahne bilgisini al (debugging için)
   */
  getSceneInfo(progress: number): SceneInfo {
    const p = Math.max(0, Math.min(1, progress));
    const easedP = this.easing(p);
    const scene = this.getCurrentScene(easedP);
    const sceneProgress = this.getSceneProgress(easedP, scene);
    
    return {
      name: scene,
      progress: sceneProgress,
      globalProgress: easedP,
    };
  }

  /**
   * Sahne adını Türkçe olarak al
   */
  getSceneNameTR(scene: SceneName): string {
    switch (scene) {
      case 'orbit': return '360° Dönüş';
      case 'north': return 'Kuzey Yaklaşımı';
      case 'south': return 'Güney Yaklaşımı';
      case 'east': return 'Doğu Yaklaşımı';
      case 'west': return 'Batı Yaklaşımı';
      case 'final': return 'Final Yaklaşımı';
    }
  }
}

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

/**
 * Yükseklikten zoom hesapla
 */
export function altitudeToZoom(altitude: number): number {
  // 50m → zoom ~18, 100m → zoom ~16, 300m → zoom ~14, 400m → zoom ~13.5
  return 18 - Math.log2(altitude / 50);
}

/**
 * Parsel bounds'dan uygun zoom hesapla
 */
export function calculateOptimalZoom(
  altitude: number,
  parcelBounds: { width: number; height: number }
): number {
  // Parsel boyutlarına göre zoom ayarla
  const avgSize = (parcelBounds.width + parcelBounds.height) / 2;
  
  // Büyük parseller için daha düşük zoom
  const sizeAdjustment = Math.log2(avgSize * 10000) * 0.3;
  
  const baseZoom = altitudeToZoom(altitude);
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, baseZoom - sizeAdjustment + 1));
}

/**
 * Süreye göre sahne zamanlamalarını hesapla (30s, 45s, 60s)
 */
export function calculateSceneTimings(
  duration: number
): Array<{ name: SceneName; start: number; end: number }> {
  const timings: Array<{ name: SceneName; start: number; end: number }> = [];
  
  let currentTime = 0;
  
  for (const [scene, ratio] of Object.entries(SCENE_DURATIONS)) {
    const start = currentTime;
    const end = currentTime + (duration * ratio);
    timings.push({
      name: scene as SceneName,
      start,
      end,
    });
    currentTime = end;
  }
  
  return timings;
}