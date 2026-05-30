/**
 * Simple Cinematic Camera Engine v8
 * 
 * Sıralı sahne sistemi:
 * 1. ORBIT 360° - %28 (tam tur, sabit zoom, sabit center)
 * 2. Geçiş - %2 (stabil kadraj)
 * 3. NORTH - %14 (ileri uçuş, kuzeye bak)
 * 4. Geçiş - %2
 * 5. SOUTH - %14 (ileri uçuş, güneye bak)
 * 6. Geçiş - %2
 * 7. EAST - %14 (ileri uçuş, doğuya bak)
 * 8. Geçiş - %2
 * 9. WEST - %14 (ileri uçuş, batıya bak)
 * 10. FINAL - %10 (stabil hover)
 * 
 * TOPLAM: 1.00
 * 
 * KRİTİK KURALLAR:
 * - Orbit: center = parcelCenter (SABİT), zoom = SABİT, sadece bearing döner
 * - 4 Yön: center = parcelCenter (SABİT), sadece bearing değişir
 * - Pitch = 45° sabit tüm sahnelerde
 * - Zoom = sabit (MIN_ZOOM - MAX_ZOOM arasında)
 * - Parsel HER ZAMAN merkezde
 * - Orbit: linear progress (easing YOK)
 */

import type { CameraFeel } from "@/lib/parcel-store";

// ─── SABİTLER ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 13;
const MAX_ZOOM = 16; // Daha güvenli max zoom

// Sahne süreleri (toplam = 1.00)
const SCENE_DURATIONS = {
  orbit: 0.28,
  transitionNorth: 0.02,
  north: 0.14,
  transitionSouth: 0.02,
  south: 0.14,
  transitionEast: 0.02,
  east: 0.14,
  transitionWest: 0.02,
  west: 0.14,
  final: 0.10,
};

// Toplam kontrol
const TOTAL = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);
console.log(`[CameraEngine] Scene total: ${TOTAL}`);

// ─── EASING ────────────────────────────────────────────────────────────────

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

export type SceneName = "orbit" | "north" | "south" | "east" | "west" | "final";

type InternalScene =
  | SceneName
  | "transitionNorth"
  | "transitionSouth"
  | "transitionEast"
  | "transitionWest";

export interface SceneInfo {
  name: SceneName;
  progress: number;
  globalProgress: number;
}

// ─── KAMERA MOTORU ────────────────────────────────────────────────────────

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

  constructor(options: SimpleCameraOptions) {
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

    // Sahne seçimi için raw progress kullan
    const scene = this.getCurrentScene(p);
    const sceneProgress = this.getSceneProgress(p, scene);

    return this.calculateSceneState(scene, sceneProgress);
  }

  /**
   * Mevcut sahneyi bul
   */
  private getCurrentScene(progress: number): InternalScene {
    const d = SCENE_DURATIONS;
    const orbitEnd = d.orbit;
    const tNorthEnd = orbitEnd + d.transitionNorth;
    const northEnd = tNorthEnd + d.north;
    const tSouthEnd = northEnd + d.transitionSouth;
    const southEnd = tSouthEnd + d.south;
    const tEastEnd = southEnd + d.transitionEast;
    const eastEnd = tEastEnd + d.east;
    const tWestEnd = eastEnd + d.transitionWest;
    const westEnd = tWestEnd + d.west;

    if (progress < orbitEnd) return "orbit";
    if (progress < tNorthEnd) return "transitionNorth";
    if (progress < northEnd) return "north";
    if (progress < tSouthEnd) return "transitionSouth";
    if (progress < southEnd) return "south";
    if (progress < tEastEnd) return "transitionEast";
    if (progress < eastEnd) return "east";
    if (progress < tWestEnd) return "transitionWest";
    if (progress < westEnd) return "west";
    return "final";
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
      case "orbit":
        return 0;
      case "transitionNorth":
        return d.orbit;
      case "north":
        return d.orbit + d.transitionNorth;
      case "transitionSouth":
        return d.orbit + d.transitionNorth + d.north;
      case "south":
        return d.orbit + d.transitionNorth + d.north + d.transitionSouth;
      case "transitionEast":
        return d.orbit + d.transitionNorth + d.north + d.transitionSouth + d.south;
      case "east":
        return (
          d.orbit + d.transitionNorth + d.north + d.transitionSouth + d.south + d.transitionEast
        );
      case "transitionWest":
        return (
          d.orbit +
          d.transitionNorth +
          d.north +
          d.transitionSouth +
          d.south +
          d.transitionEast +
          d.east
        );
      case "west":
        return (
          d.orbit +
          d.transitionNorth +
          d.north +
          d.transitionSouth +
          d.south +
          d.transitionEast +
          d.east +
          d.transitionWest
        );
      case "final":
        return (
          d.orbit +
          d.transitionNorth +
          d.north +
          d.transitionSouth +
          d.south +
          d.transitionEast +
          d.east +
          d.transitionWest +
          d.west
        );
    }
  }

  private getSceneDuration(scene: InternalScene): number {
    const d = SCENE_DURATIONS;

    switch (scene) {
      case "orbit":
        return d.orbit;
      case "transitionNorth":
        return d.transitionNorth;
      case "north":
        return d.north;
      case "transitionSouth":
        return d.transitionSouth;
      case "south":
        return d.south;
      case "transitionEast":
        return d.transitionEast;
      case "east":
        return d.east;
      case "transitionWest":
        return d.transitionWest;
      case "west":
        return d.west;
      case "final":
        return d.final;
    }
  }

  /**
   * Sahneye göre kamera durumunu hesapla
   */
  private calculateSceneState(scene: InternalScene, sceneProgress: number): CameraState {
    const { parcelCenter, altitude } = this.options;
    const { baseZoom, startBearing } = this;

    // Tüm sahneler için sabit değerler
    const center: [number, number] = [parcelCenter[0], parcelCenter[1]];
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, baseZoom + 0.5));
    const pitch = 45;

    let bearing: number;

    // ─── Geçiş sahneleri ───
    if (scene.startsWith("transition")) {
      const nextScene = scene.replace("transition", "") as SceneName;
      bearing = this.getBearingForScene(nextScene);
      return { center, zoom, pitch, bearing, altitude };
    }

    // ─── Ana sahneler ───
    switch (scene) {
      case "orbit": {
        // ═══════════════════════════════════════════════════════════════
        // ORBIT 360° - LINEER dönüş, sabit zoom, sabit center
        // ═══════════════════════════════════════════════════════════════
        // Progress'te easing KULLANMA - linear rotation
        // Son %7'de yavaş hover

        const isHovering = sceneProgress > 0.93;

        if (isHovering) {
          // Son %7: yavaş hover
          const hoverProgress = (sceneProgress - 0.93) / 0.07;
          const preHoverBearing = startBearing + 0.93 * 360;
          bearing = preHoverBearing + hoverProgress * 25.2; // Son ~25°
        } else {
          // Normal: LINEAR 360° rotation (easing YOK)
          bearing = startBearing + sceneProgress * 360;
        }
        break;
      }

      case "north": {
        // ═══════════════════════════════════════════════════════════════
        // KUZEY YAKLAŞIMI - İleri uçuş, kuzeye bak
        // ═══════════════════════════════════════════════════════════════
        // center = parcelCenter (SABİT - değişmez!)
        // bearing = 180° (kuzeye doğru)
        // Sadece bearing değişir - parsel her zaman merkezde

        bearing = 180;
        break;
      }

      case "south": {
        // ═══════════════════════════════════════════════════════════════
        // GÜNEY YAKLAŞIMI - İleri uçuş, güneye bak
        // ═══════════════════════════════════════════════════════════════

        bearing = 0;
        break;
      }

      case "east": {
        // ═══════════════════════════════════════════════════════════════
        // DOĞU YAKLAŞIMI - İleri uçuş, doğuya bak
        // ═══════════════════════════════════════════════════════════════

        bearing = 90;
        break;
      }

      case "west": {
        // ═══════════════════════════════════════════════════════════════
        // BATI YAKLAŞIMI - İleri uçuş, batıya bak
        // ═══════════════════════════════════════════════════════════════

        bearing = 270;
        break;
      }

      case "final": {
        // ═══════════════════════════════════════════════════════════════
        // FİNAL - Stabil hover
        // ═══════════════════════════════════════════════════════════════
        // Sadece yavaş bearing devamı
        // Zoom değişmez - agresif zoom YOK

        const easedFinal = easeInOutCubic(sceneProgress);
        bearing = startBearing + 360 + easedFinal * 45;
        break;
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

  private getBearingForScene(scene: SceneName): number {
    switch (scene) {
      case "north":
        return 180;
      case "south":
        return 0;
      case "east":
        return 90;
      case "west":
        return 270;
      case "final":
        return this.startBearing + 360;
      default:
        return this.startBearing;
    }
  }

  getSceneInfo(progress: number): SceneInfo {
    const p = Math.max(0, Math.min(1, progress));
    const scene = this.getCurrentScene(p);
    const sceneProgress = this.getSceneProgress(p, scene);

    // Geçiş sahnelerini ana sahneye map et
    let mappedScene: SceneName = "orbit";

    if (scene === "orbit") {
      mappedScene = "orbit";
    } else if (scene.startsWith("transition")) {
      const next = scene.replace("transition", "") as SceneName;
      mappedScene = next || "orbit";
    } else {
      mappedScene = scene as SceneName;
    }

    return {
      name: mappedScene,
      progress: sceneProgress,
      globalProgress: p,
    };
  }

  getSceneNameTR(scene: SceneName): string {
    switch (scene) {
      case "orbit":
        return "360° Orbit";
      case "north":
        return "Kuzey Yaklaşımı";
      case "south":
        return "Güney Yaklaşımı";
      case "east":
        return "Doğu Yaklaşımı";
      case "west":
        return "Batı Yaklaşımı";
      case "final":
        return "Final";
    }
  }
}
