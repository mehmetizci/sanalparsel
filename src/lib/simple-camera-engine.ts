/**
 * Simple Cinematic Camera Engine v5
 * 
 * Sıralı 6 sahne sistemi:
 * 1. 360 Orbit - %30 (tam tur, sabit zoom)
 * 2. Kuzeyden Yaklaşım - %15 (düz hat, center kayar)
 * 3. Güneyden Yaklaşım - %15 (düz hat, center kayar)
 * 4. Doğudan Yaklaşım - %15 (düz hat, center kayar)
 * 5. Batıdan Yaklaşım - %15 (düz hat, center kayar)
 * 6. Final Yaklaşım - %10 (yavaş zoom)
 * 
 * Kurallar:
 * - Orbit: center = parcelCenter (SABİT), zoom = SABİT, sadece bearing döner
 * - 4 Köşe: center kayar (düz hat), bearing sabit, zoom sabit
 * - Pitch = 45 sabit tüm sahnelerde
 */

import type { CameraFeel } from "@/lib/parcel-store";

// ─── Sabitler ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 14;      // Parsel küçük kalmaz
const MAX_ZOOM = 17;      // Parsel kadrajdan taşmaz

const SCENE_DURATIONS = {
  orbit: 0.30,           // %30
  north: 0.15,           // %15
  south: 0.15,           // %15
  east: 0.15,            // %15
  west: 0.15,            // %15
  final: 0.10,           // %10
};

// Yükseklik bazlı offset mesafeleri (derece cinsinden)
// Daha yüksek = daha uzak başlangıç
const ALTITUDE_TO_OFFSET = {
  100: 0.008,
  200: 0.012,
  300: 0.015,
  400: 0.018,
  500: 0.020,
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
  private offset: number; // Başlangıç offset mesafesi

  constructor(options: SimpleCameraOptions) {
    this.options = options;
    this.easing = getEasing(options.feel);
    
    // Base zoom altitude'dan hesaplanır
    // 100m → zoom ~16, 300m → zoom ~14, 400m → zoom ~13.5
    this.baseZoom = 18 - Math.log2(options.altitude / 50);
    
    // Rastgele başlangıç bearing'i (çeşitlilik için)
    this.startBearing = Math.random() * 360;
    
    // Yükseklik bazlı offset
    const altKey = Math.round(options.altitude / 100) * 100;
    this.offset = ALTITUDE_TO_OFFSET[altKey as keyof typeof ALTITUDE_TO_OFFSET] || 0.015;
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
    
    let center: [number, number];
    let zoom: number;
    let pitch: number;
    let bearing: number;

    switch (scene) {
      case 'orbit':
        // SAHNE 1: 360° ORBIT
        // center = parcelCenter (SABİT)
        // zoom = SABİT
        // bearing = 0→360 (sadece bearing döner)
        // Son 2sn: hover (bearing sabit)
        
        center = [parcelCenter[0], parcelCenter[1]];
        zoom = this.baseZoom + 0.5; // SABİT zoom
        pitch = 45;
        
        // Son 2 saniye için hover
        const hoverStart = sceneProgress > 0.85;
        if (hoverStart) {
          // Hover: bearing sabit, sadece son pozisyonda kal
          const hoverProgress = (sceneProgress - 0.85) / 0.15;
          const targetBearing = this.startBearing + 0.85 * 360;
          bearing = targetBearing + (hoverProgress * 30); // Son 30° yavaş
        } else {
          // Normal orbit: 0→360
          bearing = this.startBearing + easedSceneProgress * 360;
        }
        break;

      case 'north':
        // SAHNE 2: KUZEYDEN YAKLAŞIM
        // Düz hat boyunca parsele yaklaşır
        // center kayar, bearing sabit, zoom sabit
        
        const northStart = parcelCenter[1] + this.offset; // Kuzeyde başla
        const northEnd = parcelCenter[1] + this.offset * 0.3; // Yaklaş
        center = [
          parcelCenter[0], // lon sabit
          northStart + (northEnd - northStart) * easedSceneProgress, // lat değişir
        ];
        zoom = this.baseZoom + 0.5; // SABİT zoom
        pitch = 45;
        bearing = 180; // Kuzeye doğru bak (SABİT)
        break;

      case 'south':
        // SAHNE 3: GÜNEYDEN YAKLAŞIM
        // Düz hat boyunca parsele yaklaşır
        
        const southStart = parcelCenter[1] - this.offset; // Güneyde başla
        const southEnd = parcelCenter[1] - this.offset * 0.3; // Yaklaş
        center = [
          parcelCenter[0],
          southStart + (southEnd - southStart) * easedSceneProgress,
        ];
        zoom = this.baseZoom + 0.5;
        pitch = 45;
        bearing = 0; // Güneye doğru bak (SABİT)
        break;

      case 'east':
        // SAHNE 4: DOĞUDAN YAKLAŞIM
        // Düz hat boyunca parsele yaklaşır
        
        const eastStart = parcelCenter[0] + this.offset; // Doğuda başla
        const eastEnd = parcelCenter[0] + this.offset * 0.3; // Yaklaş
        center = [
          eastStart + (eastEnd - eastStart) * easedSceneProgress, // lon değişir
          parcelCenter[1], // lat sabit
        ];
        zoom = this.baseZoom + 0.5;
        pitch = 45;
        bearing = 90; // Doğuya doğru bak (SABİT)
        break;

      case 'west':
        // SAHNE 5: BATIDAN YAKLAŞIM
        // Düz hat boyunca parsele yaklaşır
        
        const westStart = parcelCenter[0] - this.offset; // Batıda başla
        const westEnd = parcelCenter[0] - this.offset * 0.3; // Yaklaş
        center = [
          westStart + (westEnd - westStart) * easedSceneProgress, // lon değişir
          parcelCenter[1], // lat sabit
        ];
        zoom = this.baseZoom + 0.5;
        pitch = 45;
        bearing = 270; // Batıya doğru bak (SABİT)
        break;

      case 'final':
        // SAHNE 6: FİNAL YAKLAŞIM
        // Yavaşça zoom yap, parsel merkezde kalır
        
        center = [parcelCenter[0], parcelCenter[1]];
        zoom = this.clampZoom(this.baseZoom + 0.5 + easedSceneProgress * 1.5); // Zoom in
        pitch = 45;
        bearing = this.startBearing + 360 + easedSceneProgress * 45; // Devam eden dönüş
        break;

      default:
        center = [parcelCenter[0], parcelCenter[1]];
        zoom = this.baseZoom;
        pitch = 45;
        bearing = this.startBearing;
    }

    return {
      center,
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
      case 'orbit': return '360° Orbit';
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
  return 18 - Math.log2(altitude / 50);
}

/**
 * Parsel bounds'dan uygun zoom hesapla
 */
export function calculateOptimalZoom(
  altitude: number,
  parcelBounds: { width: number; height: number }
): number {
  const avgSize = (parcelBounds.width + parcelBounds.height) / 2;
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