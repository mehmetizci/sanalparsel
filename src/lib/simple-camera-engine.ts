/**
 * Simple Cinematic Camera Engine v7
 * 
 * Sıralı 6 sahne sistemi:
 * 1. 360 Orbit - %28 (tam tur, sabit zoom, sabit center)
 * 2. Geçiş - %2 (1 saniye sabit)
 * 3. Kuzey - %14 (düz ileri yaklaşma)
 * 4. Geçiş - %2 (1 saniye sabit)
 * 5. Güney - %14 (düz ileri yaklaşma)
 * 6. Geçiş - %2 (1 saniye sabit)
 * 7. Doğu - %14 (düz ileri yaklaşma)
 * 8. Geçiş - %2 (1 saniye sabit)
 * 9. Batı - %14 (düz ileri yaklaşma)
 * 10. Final - %10
 * 
 * KRİTİK KURALLAR:
 * - Orbit: center = parcelCenter (SABİT), zoom = SABİT, sadece bearing döner
 * - 4 Köşe: düz ileri yaklaşma, bearing ileri yöne bakar
 * - Her sahne başında 1sn hazırlık
 * - Parsel HER ZAMAN görünür
 * - easeInOutCubic kullan
 */

import type { CameraFeel } from "@/lib/parcel-store";

// ─── Sabitler ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 13;
const MAX_ZOOM = 17;

// Sahne süreleri (100% = 1.0)
const SCENE_DURATIONS = {
  orbit: 0.28,
  orbitHover: 0.02,    // Orbit sonunda 2% hover
  transitionNorth: 0.02, // 1sn geçiş
  north: 0.14,
  transitionSouth: 0.02,
  south: 0.14,
  transitionEast: 0.02,
  east: 0.14,
  transitionWest: 0.02,
  west: 0.14,
  final: 0.10,
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

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

export function altitudeToZoom(altitude: number): number {
  return 18 - Math.log2(altitude / 50);
}

/**
 * Yükseklikten offset mesafesi (derece)
 */
function altitudeToOffset(altitude: number): number {
  const baseOffset = altitude / 100 * 0.006;
  return Math.max(0.006, Math.min(0.030, baseOffset));
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
  
  const sceneMap: Record<string, number> = {
    orbit: SCENE_DURATIONS.orbit,
    north: SCENE_DURATIONS.north,
    south: SCENE_DURATIONS.south,
    east: SCENE_DURATIONS.east,
    west: SCENE_DURATIONS.west,
    final: SCENE_DURATIONS.final,
  };
  
  for (const [scene, ratio] of Object.entries(sceneMap)) {
    const start = currentTime;
    const end = currentTime + (duration * ratio);
    timings.push({ name: scene as SceneName, start, end });
    currentTime = end;
  }
  
  return timings;
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

// Internal scene type (includes transitions)
type InternalScene = SceneName | 'transitionNorth' | 'transitionSouth' | 'transitionEast' | 'transitionWest';

export interface SceneInfo {
  name: SceneName;
  progress: number;
  globalProgress: number;
}

// ─── Basit Kamera Motoru ─────────────────────────────────────────────────────

export interface SimpleCameraOptions {
  parcelCenter: [number, number];
  altitude: number;
  duration: number;
  feel: CameraFeel;
}

export class SimpleCameraEngine {
  private options: SimpleCameraOptions;
  private easing: (t: number) => number;
  private baseZoom: number;
  private startBearing: number;
  private offset: number;
  private previousScene: SceneName = 'orbit';

  constructor(options: SimpleCameraOptions) {
    this.options = options;
    this.easing = getEasing(options.feel);
    this.baseZoom = 18 - Math.log2(options.altitude / 50);
    this.startBearing = Math.floor(Math.random() * 360);
    this.offset = altitudeToOffset(options.altitude);
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
   * Mevcut sahneyi bul (geçiş sahneleri dahil)
   */
  private getCurrentScene(progress: number): InternalScene {
    // Geçiş kontrolü
    const orbitEnd = SCENE_DURATIONS.orbit;
    const transitionNorthEnd = orbitEnd + SCENE_DURATIONS.transitionNorth;
    const northEnd = transitionNorthEnd + SCENE_DURATIONS.north;
    const transitionSouthEnd = northEnd + SCENE_DURATIONS.transitionSouth;
    const southEnd = transitionSouthEnd + SCENE_DURATIONS.south;
    const transitionEastEnd = southEnd + SCENE_DURATIONS.transitionEast;
    const eastEnd = transitionEastEnd + SCENE_DURATIONS.east;
    const transitionWestEnd = eastEnd + SCENE_DURATIONS.transitionWest;
    const westEnd = transitionWestEnd + SCENE_DURATIONS.west;
    
    if (progress < orbitEnd) return 'orbit';
    if (progress < transitionNorthEnd) return 'transitionNorth';
    if (progress < northEnd) return 'north';
    if (progress < transitionSouthEnd) return 'transitionSouth';
    if (progress < southEnd) return 'south';
    if (progress < transitionEastEnd) return 'transitionEast';
    if (progress < eastEnd) return 'east';
    if (progress < transitionWestEnd) return 'transitionWest';
    if (progress < westEnd) return 'west';
    return 'final';
  }

  /**
   * Sahne içi progress (0-1)
   */
  private getSceneProgress(globalProgress: number, scene: InternalScene): number {
    const sceneStart = this.getSceneStartProgress(scene);
    const sceneDuration = this.getSceneDuration(scene);
    
    if (sceneDuration === 0) return 0;
    
    const progressInScene = globalProgress - sceneStart;
    return Math.max(0, Math.min(1, progressInScene / sceneDuration));
  }

  private getSceneStartProgress(scene: InternalScene): number {
    const d = SCENE_DURATIONS;
    
    switch (scene) {
      case 'orbit': return 0;
      case 'transitionNorth': return d.orbit;
      case 'north': return d.orbit + d.transitionNorth;
      case 'transitionSouth': return d.orbit + d.transitionNorth + d.north;
      case 'south': return d.orbit + d.transitionNorth + d.north + d.transitionSouth;
      case 'transitionEast': return d.orbit + d.transitionNorth + d.north + d.transitionSouth + d.south;
      case 'east': return d.orbit + d.transitionNorth + d.north + d.transitionSouth + d.south + d.transitionEast;
      case 'transitionWest': return d.orbit + d.transitionNorth + d.north + d.transitionSouth + d.south + d.transitionEast + d.east;
      case 'west': return d.orbit + d.transitionNorth + d.north + d.transitionSouth + d.south + d.transitionEast + d.east + d.transitionWest;
      case 'final': return d.orbit + d.transitionNorth + d.north + d.transitionSouth + d.south + d.transitionEast + d.east + d.transitionWest + d.west;
    }
  }

  private getSceneDuration(scene: InternalScene): number {
    const d = SCENE_DURATIONS;
    
    switch (scene) {
      case 'orbit': return d.orbit;
      case 'transitionNorth': return d.transitionNorth;
      case 'north': return d.north;
      case 'transitionSouth': return d.transitionSouth;
      case 'south': return d.south;
      case 'transitionEast': return d.transitionEast;
      case 'east': return d.east;
      case 'transitionWest': return d.transitionWest;
      case 'west': return d.west;
      case 'final': return d.final;
    }
  }

  /**
   * Sahneye göre kamera durumunu hesapla
   */
  private calculateSceneState(scene: InternalScene, sceneProgress: number): CameraState {
    const { parcelCenter, altitude } = this.options;
    const easedSceneProgress = easeInOutCubic(sceneProgress);
    
    let center: [number, number];
    let zoom: number;
    let pitch: number;
    let bearing: number;

    // ─── Geçiş sahneleri: parsel merkeze snap ───
    if (scene.startsWith('transition')) {
      center = [parcelCenter[0], parcelCenter[1]];
      zoom = this.baseZoom + 0.5;
      pitch = 45;
      
      // Hangi yöne geçiş yapılıyor
      const nextScene = scene.replace('transition', '');
      bearing = this.getBearingForScene(nextScene as SceneName);
      
      return { center, zoom, pitch, bearing, altitude };
    }

    // ─── Ana sahneler ───
    switch (scene) {
      case 'orbit':
        // ═══════════════════════════════════════════════════
        // ORBIT 360° - Tam tur, sabit zoom, sabit center
        // ═══════════════════════════════════════════════════
        center = [parcelCenter[0], parcelCenter[1]];
        zoom = this.baseZoom + 0.5; // SABİT
        pitch = 45;
        
        // Son %7'de (2%) hover
        const isHovering = sceneProgress > 0.93;
        
        if (isHovering) {
          const hoverProgress = (sceneProgress - 0.93) / 0.07;
          const preHoverBearing = this.startBearing + 0.93 * 360;
          bearing = preHoverBearing + (hoverProgress * 25.2);
        } else {
          bearing = this.startBearing + easedSceneProgress * 360;
        }
        break;

      case 'north':
        // ═══════════════════════════════════════════════════
        // KUZEYDEN YAKLAŞIM - Düz ileri, kuzeye bak
        // ═══════════════════════════════════════════════════
        // Başlangıç: kuzeyde uzak
        // Bitiş: parsele yaklaş
        // İleri hareket, kuzeye bak
        
        const northStartLat = parcelCenter[1] + this.offset;
        const northEndLat = parcelCenter[1] + this.offset * 0.15;
        
        center = [
          parcelCenter[0],
          northStartLat + (northEndLat - northStartLat) * easedSceneProgress,
        ];
        zoom = this.baseZoom + 0.5; // SABİT
        pitch = 45;
        bearing = 180; // Kuzeye doğru (ileri)
        break;

      case 'south':
        // ═══════════════════════════════════════════════════
        // GÜNEYDEN YAKLAŞIM - Düz ileri, güneye bak
        // ═══════════════════════════════════════════════════
        
        const southStartLat = parcelCenter[1] - this.offset;
        const southEndLat = parcelCenter[1] - this.offset * 0.15;
        
        center = [
          parcelCenter[0],
          southStartLat + (southEndLat - southStartLat) * easedSceneProgress,
        ];
        zoom = this.baseZoom + 0.5;
        pitch = 45;
        bearing = 0; // Güneye doğru (ileri)
        break;

      case 'east':
        // ═══════════════════════════════════════════════════
        // DOĞUDAN YAKLAŞIM - Düz ileri, doğuya bak
        // ═══════════════════════════════════════════════════
        
        const eastStartLon = parcelCenter[0] + this.offset;
        const eastEndLon = parcelCenter[0] + this.offset * 0.15;
        
        center = [
          eastStartLon + (eastEndLon - eastStartLon) * easedSceneProgress,
          parcelCenter[1],
        ];
        zoom = this.baseZoom + 0.5;
        pitch = 45;
        bearing = 90; // Doğuya doğru (ileri)
        break;

      case 'west':
        // ═══════════════════════════════════════════════════
        // BATIDAN YAKLAŞIM - Düz ileri, batıya bak
        // ═══════════════════════════════════════════════════
        
        const westStartLon = parcelCenter[0] - this.offset;
        const westEndLon = parcelCenter[0] - this.offset * 0.15;
        
        center = [
          westStartLon + (westEndLon - westStartLon) * easedSceneProgress,
          parcelCenter[1],
        ];
        zoom = this.baseZoom + 0.5;
        pitch = 45;
        bearing = 270; // Batıya doğru (ileri)
        break;

      case 'final':
        // ═══════════════════════════════════════════════════
        // FİNAL - Yavaş zoom in, parsel merkezde
        // ═══════════════════════════════════════════════════
        center = [parcelCenter[0], parcelCenter[1]];
        zoom = this.clampZoom(this.baseZoom + 0.5 + easedSceneProgress * 1.5);
        pitch = 45;
        bearing = this.startBearing + 360 + easedSceneProgress * 45;
        break;

      default:
        center = [parcelCenter[0], parcelCenter[1]];
        zoom = this.baseZoom;
        pitch = 45;
        bearing = this.startBearing;
    }

    this.previousScene = scene as SceneName;

    return {
      center,
      zoom,
      pitch,
      bearing: ((bearing % 360) + 360) % 360,
      altitude,
    };
  }

  private getBearingForScene(scene: SceneName): number {
    switch (scene) {
      case 'north': return 180;
      case 'south': return 0;
      case 'east': return 90;
      case 'west': return 270;
      case 'final': return this.startBearing + 360;
      default: return this.startBearing;
    }
  }

  private clampZoom(zoom: number): number {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  }

  getSceneInfo(progress: number): SceneInfo {
    const p = Math.max(0, Math.min(1, progress));
    const easedP = this.easing(p);
    const scene = this.getCurrentScene(easedP);
    const sceneProgress = this.getSceneProgress(easedP, scene);
    
    // Geçiş sahnelerini ana sahneye map et
    let mappedScene: SceneName = 'orbit';
    if (scene === 'orbit') mappedScene = 'orbit';
    else if (scene.startsWith('transition')) {
      // Geçiş ise bir sonraki sahneyi göster
      const next = scene.replace('transition', '') as SceneName;
      mappedScene = next || 'orbit';
    } else {
      mappedScene = scene as SceneName;
    }
    
    return {
      name: mappedScene,
      progress: sceneProgress,
      globalProgress: easedP,
    };
  }

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