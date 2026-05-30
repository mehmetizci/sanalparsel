/**
 * Drone Camera Engine v12
 * 
 * Basit ve güvenilir drone kamerası
 * 
 * TEMEL İLKELER:
 * 1. center = parcelCenter (HER ZAMAN SABİT)
 * 2. Parsel video boyunca her zaman merkezde
 * 3. Sadece bearing yön değiştirir
 * 4. Zoom çok hafif değişir
 * 
 * SAHNELER:
 * 1. INTRO - %5 (hızlı kurulum)
 * 2. ORBIT - %10 (kısa tur)
 * 3. NORTH - %20 (bearing = 180°)
 * 4. SOUTH - %20 (bearing = 0°)
 * 5. EAST - %20 (bearing = 270°)
 * 6. WEST - %20 (bearing = 90°)
 * 7. FINAL - %5 (sabit hover)
 */

import type { CameraFeel } from "@/lib/parcel-store";

// ─── SABİTLER ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 14;
const MAX_ZOOM = 17;

// Sahne süreleri (toplam = 1.00)
const SCENE_DURATIONS = {
  intro: 0.05,
  orbit: 0.10,
  north: 0.20,
  south: 0.20,
  east: 0.20,
  west: 0.20,
  final: 0.05,
};

// Toplam kontrol
const TOTAL = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);
console.log(`[DroneCamera] Scene total: ${TOTAL}`);

// ─── EASING ────────────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function getEasing(feel: CameraFeel): (t: number) => number {
  switch (feel) {
    case "soft":
      return easeInOutCubic;
    case "cinematic":
      return easeInOutCubic;
    case "dynamic":
      return easeOutCubic;
  }
}

// ─── YARDIMCI FONKSİYONLAR ────────────────────────────────────────────────

export function altitudeToZoom(altitude: number): number {
  return 18 - Math.log2(altitude / 50);
}

export function calculateOptimalZoom(
  altitude: number,
  parcelBounds: { width: number; height: number }
): number {
  const avgSize = (parcelBounds.width + parcelBounds.height) / 2;
  const sizeAdjustment = Math.log2(avgSize * 10000) * 0.3;
  const baseZoom = altitudeToZoom(altitude);
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, baseZoom - sizeAdjustment + 1));
}

export function calculateSceneTimings(
  duration: number
): Array<{ name: SceneName; start: number; end: number }> {
  const timings: Array<{ name: SceneName; start: number; end: number }> = [];
  let currentTime = 0;

  for (const [scene, ratio] of Object.entries(SCENE_DURATIONS)) {
    const start = currentTime;
    const end = currentTime + duration * ratio;
    timings.push({ name: scene as SceneName, start, end });
    currentTime = end;
  }

  return timings;
}

// ─── TİPLER ────────────────────────────────────────────────────────────────

export interface CameraState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  altitude: number;
}

export type SceneName = "intro" | "orbit" | "north" | "south" | "east" | "west" | "final";

export interface SceneInfo {
  name: SceneName;
  progress: number;
  globalProgress: number;
}

// ─── DRONE CAMERA ───────────────────────────────────────────────────────────

export interface DroneCameraOptions {
  parcelCenter: [number, number];
  altitude: number;
  duration: number;
  feel: CameraFeel;
}

export class DroneCamera {
  private options: DroneCameraOptions;
  private easing: (t: number) => number;
  private baseZoom: number;
  private startBearing: number;

  constructor(options: DroneCameraOptions) {
    this.options = options;
    this.easing = getEasing(options.feel);
    this.baseZoom = altitudeToZoom(options.altitude);
    this.startBearing = Math.floor(Math.random() * 360);
  }

  /**
   * Herhangi bir progress'te (0-1) kamera durumunu al
   */
  getState(progress: number): CameraState {
    const p = Math.max(0, Math.min(1, progress));
    
    const scene = this.getCurrentScene(p);
    const sceneProgress = this.getSceneProgress(p, scene);
    
    return this.calculateSceneState(scene, sceneProgress);
  }

  /**
   * Mevcut sahneyi bul
   */
  private getCurrentScene(progress: number): SceneName {
    const d = SCENE_DURATIONS;
    
    if (progress < d.intro) return "intro";
    if (progress < d.intro + d.orbit) return "orbit";
    if (progress < d.intro + d.orbit + d.north) return "north";
    if (progress < d.intro + d.orbit + d.north + d.south) return "south";
    if (progress < d.intro + d.orbit + d.north + d.south + d.east) return "east";
    if (progress < d.intro + d.orbit + d.north + d.south + d.east + d.west) return "west";
    return "final";
  }

  /**
   * Sahne içi progress (0-1)
   */
  private getSceneProgress(globalProgress: number, scene: SceneName): number {
    const sceneStart = this.getSceneStartProgress(scene);
    const sceneDuration = this.getSceneDuration(scene);

    if (sceneDuration === 0) return 0;

    const progressInScene = globalProgress - sceneStart;
    return Math.max(0, Math.min(1, progressInScene / sceneDuration));
  }

  private getSceneStartProgress(scene: SceneName): number {
    const d = SCENE_DURATIONS;
    
    switch (scene) {
      case "intro": return 0;
      case "orbit": return d.intro;
      case "north": return d.intro + d.orbit;
      case "south": return d.intro + d.orbit + d.north;
      case "east": return d.intro + d.orbit + d.north + d.south;
      case "west": return d.intro + d.orbit + d.north + d.south + d.east;
      case "final": return d.intro + d.orbit + d.north + d.south + d.east + d.west;
    }
  }

  private getSceneDuration(scene: SceneName): number {
    return SCENE_DURATIONS[scene];
  }

  /**
   * DEBUG: Sahne bilgilerini logla
   */
  getDebugInfo(progress: number): string {
    const state = this.getState(progress);
    const info = this.getSceneInfo(progress);
    return `[${info.name.toUpperCase()}] p=${(info.progress * 100).toFixed(1)}% | center=[${state.center[0].toFixed(5)}, ${state.center[1].toFixed(5)}] | zoom=${state.zoom.toFixed(2)} | pitch=${state.pitch}° | bearing=${state.bearing.toFixed(1)}°`;
  }

  /**
   * Sahneye göre kamera durumunu hesapla
   * 
   * ÖNEMLİ: center = parcelCenter (HER ZAMAN SABİT)
   * Parsel video boyunca her zaman merkezde
   * 
   * SAHNE BAZLI DEĞİŞİMLER:
   * - ORBIT: sadece bearing döner, zoom sabit
   * - 4 YÖN: bearing sabit, zoom çok hafif değişir (yaklaşma hissi)
   * - FINAL: tüm değerler sabit
   */
  private calculateSceneState(scene: SceneName, sceneProgress: number): CameraState {
    const { parcelCenter, altitude } = this.options;
    const { baseZoom, startBearing } = this;
    
    // Temel sabitler
    const pitch = 45;
    const center: [number, number] = [parcelCenter[0], parcelCenter[1]];
    
    let bearing: number;
    let zoom: number;

    switch (scene) {
      case "intro": {
        // ═══════════════════════════════════════════════════════════════
        // INTRO - Hızlı kurulum
        // ═══════════════════════════════════════════════════════════════
        
        bearing = startBearing + sceneProgress * 45;
        zoom = baseZoom + 0.5;
        
        break;
      }

      case "orbit": {
        // ═══════════════════════════════════════════════════════════════
        // ORBIT - Kısa tur
        // ═══════════════════════════════════════════════════════════════
        // ZOOM KESİNLİKLE SABİT - sadece bearing döner
        
        // Son %20'de yavaşla (hover effect)
        if (sceneProgress > 0.8) {
          const hoverProgress = (sceneProgress - 0.8) / 0.2;
          const preHoverBearing = startBearing + 0.8 * 360;
          bearing = preHoverBearing + hoverProgress * 72;
        } else {
          bearing = startBearing + sceneProgress * 360;
        }
        
        zoom = baseZoom + 0.5; // ZOOM SABİT
        
        break;
      }

      case "north": {
        // ═══════════════════════════════════════════════════════════════
        // NORTH - Kuzey hissi
        // ═══════════════════════════════════════════════════════════════
        // Çok hafif zoom değişimi (yaklaşma hissi)
        
        bearing = 180;
        
        const eased = this.easing(sceneProgress);
        const startZoom = baseZoom - 0.25;
        const endZoom = baseZoom + 0.15;
        zoom = startZoom + (endZoom - startZoom) * eased;
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
        
        break;
      }

      case "south": {
        // ═══════════════════════════════════════════════════════════════
        // SOUTH - Güney hissi
        // ═══════════════════════════════════════════════════════════════
        
        bearing = 0;
        
        const eased = this.easing(sceneProgress);
        const startZoom = baseZoom - 0.25;
        const endZoom = baseZoom + 0.15;
        zoom = startZoom + (endZoom - startZoom) * eased;
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
        
        break;
      }

      case "east": {
        // ═══════════════════════════════════════════════════════════════
        // EAST - Doğu hissi
        // ═══════════════════════════════════════════════════════════════
        
        bearing = 270;
        
        const eased = this.easing(sceneProgress);
        const startZoom = baseZoom - 0.25;
        const endZoom = baseZoom + 0.15;
        zoom = startZoom + (endZoom - startZoom) * eased;
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
        
        break;
      }

      case "west": {
        // ═══════════════════════════════════════════════════════════════
        // WEST - Batı hissi
        // ═══════════════════════════════════════════════════════════════
        
        bearing = 90;
        
        const eased = this.easing(sceneProgress);
        const startZoom = baseZoom - 0.25;
        const endZoom = baseZoom + 0.15;
        zoom = startZoom + (endZoom - startZoom) * eased;
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
        
        break;
      }

      case "final": {
        // ═══════════════════════════════════════════════════════════════
        // FINAL - Stabil hover
        // ═══════════════════════════════════════════════════════════════
        // TÜM DEĞERLER SABİT
        // Bearing = 90 (west'ten devam, ani değişim yok)
        
        bearing = 90;
        zoom = baseZoom + 0.5;
        
        break;
      }

      default:
        bearing = startBearing;
        zoom = baseZoom + 0.5;
    }

    return {
      center,
      zoom,
      pitch,
      bearing: ((bearing % 360) + 360) % 360,
      altitude,
    };
  }

  getSceneInfo(progress: number): SceneInfo {
    const p = Math.max(0, Math.min(1, progress));
    const scene = this.getCurrentScene(p);
    const sceneProgress = this.getSceneProgress(p, scene);

    return {
      name: scene,
      progress: sceneProgress,
      globalProgress: p,
    };
  }

  getSceneNameTR(scene: SceneName): string {
    switch (scene) {
      case "intro": return "Giriş";
      case "orbit": return "360° Tur";
      case "north": return "Kuzey";
      case "south": return "Güney";
      case "east": return "Doğu";
      case "west": return "Batı";
      case "final": return "Final";
    }
  }
}