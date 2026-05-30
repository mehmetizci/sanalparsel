/**
 * Natural Drone Camera Engine v9
 * 
 * Görüntü hissi öncelikli - teknik kurallardan çok doğallık
 * 
 * Referans: Gerçek drone arazi tanıtım filmi hissi
 * 
 * SAHNELER:
 * 1. INTRO - Hızlı kurulum (%8)
 * 2. ORBIT - Kısa bakış (%10)
 * 3. DISCOVERY - Kuzey yaklaşımı (%18)
 * 4. DISCOVERY - Güney yaklaşımı (%18)
 * 5. DISCOVERY - Doğu yaklaşımı (%18)
 * 6. DISCOVERY - Batı yaklaşımı (%18)
 * 7. FINAL - Sakin hover (%10)
 * 
 * TOPLAM: 1.00
 * 
 * TEMEL İLKELER:
 * - Kamera acele etmez
 * - Sürekli açı değiştirmez
 * - Sürekli zoom yapmaz
 * - Sakin şekilde süzülür
 * - Sahneler arası doğal geçiş
 * - "Bu gerçek drone çekimi" hissi
 */

import type { CameraFeel } from "@/lib/parcel-store";

// ─── SABİTLER ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 14;
const MAX_ZOOM = 17;

// Sahne süreleri - discovery daha uzun, orbit kısa
const SCENE_DURATIONS = {
  intro: 0.08,
  orbit: 0.10,
  north: 0.18,
  south: 0.18,
  east: 0.18,
  west: 0.18,
  final: 0.10,
};

// Toplam kontrol
const TOTAL = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);
console.log(`[DroneCamera] Scene total: ${TOTAL}`);

// ─── DRIFT EASING ────────────────────────────────────────────────────────────
// Çok yavaş, doğal geçişler için
// Hiçbir şey ani olmamalı

function driftEase(t: number): number {
  // S-curve for ultra-smooth transitions
  // Başlangıç ve bitiş çok yavaş, orta kısım normal
  return t * t * (3 - 2 * t);
}

function gentleEase(t: number): number {
  // Çok daha yavaş ease
  return t < 0.5 
    ? 4 * t * t * t 
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getEasing(feel: CameraFeel): (t: number) => number {
  switch (feel) {
    case "soft":
      return driftEase;
    case "cinematic":
      return gentleEase;
    case "dynamic":
      return driftEase;
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
    
    // Rastgele ama tutarlı başlangıç
    this.startBearing = Math.floor(Math.random() * 360);
  }

  /**
   * Herhangi bir progress'te (0-1) kamera durumunu al
   */
  getState(progress: number): CameraState {
    const p = Math.max(0, Math.min(1, progress));
    
    // Sahne seçimi
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
   * Sahneye göre kamera durumunu hesapla
   * 
   * ÖNEMLİ: Tüm sahneler için TEMEL DEĞERLER ortak:
   * - center = parcelCenter (SABİT)
   * - zoom = baseZoom + 0.5 (SABİT - çok az değişim)
   * - pitch = 45° (SABİT)
   * 
   * Sadece bearing ve hafif zoom değişimi var
   */
  private calculateSceneState(scene: SceneName, sceneProgress: number): CameraState {
    const { parcelCenter, altitude } = this.options;
    const { baseZoom, startBearing } = this;

    // Temel değerler - tüm sahneler için aynı
    const center: [number, number] = [parcelCenter[0], parcelCenter[1]];
    const pitch = 45;
    
    // Zoom çok az değişir - SABİT yakın
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, baseZoom + 0.5));

    let bearing: number;

    switch (scene) {
      case "intro": {
        // ═══════════════════════════════════════════════════════════════
        // INTRO - Hızlı kurulum ama yine de sakin
        // ═══════════════════════════════════════════════════════════════
        // Başlangıç: yukarıdan parseli göster
        // Hafif zoom out yap, sonra normalleştir
        
        const eased = driftEase(sceneProgress);
        bearing = startBearing + eased * 15; // Sadece hafif dönüş
        
        break;
      }

      case "orbit": {
        // ═══════════════════════════════════════════════════════════════
        // ORBIT - Kısa bakış, "parsel burada" demek için
        // ═══════════════════════════════════════════════════════════════
        // ÇOK KISA - sadece 1 tur, sonra geç
        // Yavaş, sakin dönüş
        
        const eased = driftEase(sceneProgress);
        
        // Son %20'de yavaşla (hover effect)
        if (sceneProgress > 0.8) {
          const hoverProgress = (sceneProgress - 0.8) / 0.2;
          const preHoverBearing = startBearing + 0.8 * 360;
          bearing = preHoverBearing + hoverProgress * 72; // Son ~72°
        } else {
          bearing = startBearing + eased * 360;
        }
        
        break;
      }

      case "north": {
        // ═══════════════════════════════════════════════════════════════
        // NORTH DISCOVERY - Kuzeyden yaklaşma
        // ═══════════════════════════════════════════════════════════════
        // "Drone kuzey tarafından geliyor, parsele doğru süzülüyor"
        // 
        // Başlangıç: parsel kuzeye bakıyor (bearing = 180)
        // Orta: hafif bearing değişimi (doğal drone漂移)
        // Bitiş: parsel üzerinde hafif offset
        
        const eased = driftEase(sceneProgress);
        
        // Kuzeyden gelirken hafif doğuya kayma (doğal drift)
        bearing = 180 + Math.sin(eased * Math.PI) * 15; // ±15° wiggle
        
        break;
      }

      case "south": {
        // ═══════════════════════════════════════════════════════════════
        // SOUTH DISCOVERY - Güneyden yaklaşma
        // ═══════════════════════════════════════════════════════════════
        
        const eased = driftEase(sceneProgress);
        
        // Güneyden gelirken hafif sola kayma
        bearing = 0 + Math.sin(eased * Math.PI) * 15;
        
        break;
      }

      case "east": {
        // ═══════════════════════════════════════════════════════════════
        // EAST DISCOVERY - Doğudan yaklaşma
        // ═══════════════════════════════════════════════════════════════
        
        const eased = driftEase(sceneProgress);
        
        // Doğudan gelirken hafif aşağı kayma
        bearing = 90 + Math.sin(eased * Math.PI) * 15;
        
        break;
      }

      case "west": {
        // ═══════════════════════════════════════════════════════════════
        // WEST DISCOVERY - Batıdan yaklaşma
        // ═══════════════════════════════════════════════════════════════
        
        const eased = driftEase(sceneProgress);
        
        // Batıdan gelirken hafif yukarı kayma
        bearing = 270 + Math.sin(eased * Math.PI) * 15;
        
        break;
      }

      case "final": {
        // ═══════════════════════════════════════════════════════════════
        // FINAL - Sakin hover, parsel üzerinde
        // ═══════════════════════════════════════════════════════════════
        // Yavaşça stabilize ol
        // Çok az zoom in (sadece hissiyat için)
        // Çok az bearing devam
        
        const eased = driftEase(sceneProgress);
        
        // Hafif zoom in (sadece %15)
        const finalZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + eased * 0.8));
        
        // Yavaş bearing devamı
        bearing = startBearing + 360 + eased * 30;
        
        return {
          center,
          zoom: finalZoom,
          pitch,
          bearing: ((bearing % 360) + 360) % 360,
          altitude,
        };
      }

      default:
        bearing = startBearing;
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
      case "orbit": return "360° Bakış";
      case "north": return "Kuzey Keşfi";
      case "south": return "Güney Keşfi";
      case "east": return "Doğu Keşfi";
      case "west": return "Batı Keşfi";
      case "final": return "Final";
    }
  }
}

// Export for compatibility
export const SimpleCameraEngine = DroneCamera;
export type { DroneCameraOptions as SimpleCameraOptions };