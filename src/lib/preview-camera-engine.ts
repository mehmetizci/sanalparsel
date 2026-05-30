/**
 * Preview Camera Engine v1
 * 
 * Parcel ön izleme ekranındaki stabil kamera davranışını video render'a taşıyan kamera motoru.
 * 
 * TEMEL İLKELER:
 * - 4 yön çekimi korunur (Kuzey, Doğu, Güney, Batı)
 * - Ancak karmaşık drone-camera mantığı YERİNE stabil, doğal kamera
 * - fitBounds ile kadrajlama (parseller kaybolmaz)
 * - Pitch ~55-60° sabit
 * - Bearing yavaş değişir (max ±5° drift)
 * - Zoom çok hafif değişir (agresif zoom YOK)
 * - Center offset KULLANILMAZ (parsel her zaman merkezde)
 * - 360° orbit YOK
 * 
 * SAHNELER:
 * 1. KUZEY - 7s (bearing=180, pitch=55-60)
 * 2. DOĞU - 7s (bearing=270, pitch=55-60)
 * 3. GÜNEY - 7s (bearing=0, pitch=55-60)
 * 4. BATI - 7s (bearing=90, pitch=55-60)
 * 5. FİNAL HOVER - 2s
 * 
 * TOPLAM: 30s
 */

import type { CameraFeel } from "@/lib/parcel-store";

// ─── SABİTLER ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 13;
const MAX_ZOOM = 16.5;

// Her yön için sabit bearing değerleri
const CARDINAL_BEARINGS = {
  north: 180,
  east: 270,
  south: 0,
  west: 90,
};

// Sahne süreleri (toplam = 1.00)
const SCENE_DURATIONS = {
  north: 0.233,    // 7s / 30s = 0.233
  east: 0.233,      // 7s / 30s = 0.233
  south: 0.233,     // 7s / 30s = 0.233
  west: 0.233,      // 7s / 30s = 0.233
  final: 0.067,      // 2s / 30s = 0.067
};

// Toplam kontrol
const TOTAL = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);
console.log(`[PreviewCamera] Scene total: ${TOTAL} (should be 1.00)`);

// ─── EASING FONKSİYONLARI ───────────────────────────────────────────────────

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

/**
 * fitBounds mantığı ile güvenli zoom hesapla
 * Parsel ekranın ~35% ini kaplayacak şekilde
 */
export function calculateFitBoundsZoom(
  altitude: number,
  parcelBounds: { minLon: number; minLat: number; maxLon: number; maxLat: number }
): number {
  if (!parcelBounds) return 15;
  
  // Parsel boyutunu hesapla (derece cinsinden)
  const width = parcelBounds.maxLon - parcelBounds.minLon;
  const height = parcelBounds.maxLat - parcelBounds.minLat;
  const avgSize = Math.max(width, height);
  
  // Parsel boyutuna göre zoom ayarla
  // Büyük parseller için daha düşük zoom, küçük parseller için daha yüksek zoom
  const sizeAdjustment = Math.log2(Math.max(avgSize, 0.0001) * 10000) * 0.4;
  const baseZoom = altitudeToZoom(altitude);
  
  // fitBounds mantığı: parseli kadrajla
  // Ortalama zoom = baseZoom - sizeAdjustment + offset
  const fittedZoom = baseZoom - sizeAdjustment + 0.5;
  
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fittedZoom));
}

// ─── TİPLER ────────────────────────────────────────────────────────────────

export interface CameraState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  altitude: number;
}

export type SceneName = "north" | "east" | "south" | "west" | "final";

export interface SceneInfo {
  name: SceneName;
  progress: number;
  globalProgress: number;
  bearing: number;
  zoom: number;
}

// ─── PREVIEW CAMERA ENGINE ──────────────────────────────────────────────────

export interface PreviewCameraOptions {
  parcelCenter: [number, number];
  parcelBounds?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  altitude: number;
  duration: number;
  feel: CameraFeel;
  /** Base pitch değeri (55-60 arası önerilir) */
  basePitch?: number;
}

export class PreviewCameraEngine {
  private options: PreviewCameraOptions;
  private easing: (t: number) => number;
  private baseZoom: number;
  private basePitch: number;
  private sceneStartZooms: Record<SceneName, number>;
  private sceneEndZooms: Record<SceneName, number>;
  
  constructor(options: PreviewCameraOptions) {
    this.options = options;
    this.easing = getEasing(options.feel);
    
    // Base zoom: fitBounds mantığı ile hesapla
    this.baseZoom = options.parcelBounds
      ? calculateFitBoundsZoom(options.altitude, options.parcelBounds)
      : altitudeToZoom(options.altitude);
    
    // Base pitch: 55-60 arası (ön izleme ekranındaki gibi)
    this.basePitch = options.basePitch ?? 57;
    
    // Her sahne için zoom aralıkları (çok hafif değişim)
    // sceneStartZoom = baseZoom - 0.15, sceneEndZoom = baseZoom + 0.10
    this.sceneStartZooms = {
      north: this.baseZoom - 0.15,
      east: this.baseZoom - 0.15,
      south: this.baseZoom - 0.15,
      west: this.baseZoom - 0.15,
      final: this.baseZoom - 0.10,
    };
    
    this.sceneEndZooms = {
      north: this.baseZoom + 0.10,
      east: this.baseZoom + 0.10,
      south: this.baseZoom + 0.10,
      west: this.baseZoom + 0.10,
      final: this.baseZoom + 0.05,
    };
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
    
    if (progress < d.north) return "north";
    if (progress < d.north + d.east) return "east";
    if (progress < d.north + d.east + d.south) return "south";
    if (progress < d.north + d.east + d.south + d.west) return "west";
    return "final";
  }
  
  /**
   * Sahne içi progress (0-1)
   */
  private getSceneProgress(globalProgress: number, scene: SceneName): number {
    const sceneStart = this.getSceneStartProgress(scene);
    const sceneDuration = SCENE_DURATIONS[scene];
    
    if (sceneDuration === 0) return 0;
    
    const progressInScene = globalProgress - sceneStart;
    return Math.max(0, Math.min(1, progressInScene / sceneDuration));
  }
  
  private getSceneStartProgress(scene: SceneName): number {
    const d = SCENE_DURATIONS;
    
    switch (scene) {
      case "north": return 0;
      case "east": return d.north;
      case "south": return d.north + d.east;
      case "west": return d.north + d.east + d.south;
      case "final": return d.north + d.east + d.south + d.west;
    }
  }
  
  /**
   * Sahneye göre kamera durumunu hesapla
   * 
   * KRİTİK KURALLAR:
   * - center = parcelCenter (SABİT - değişmez!)
   * - pitch = basePitch (SABİT - değişmez!)
   * - bearing = CARDINAL_BEARINGS[scene] + max ±5° drift
   * - zoom = sceneStartZoom + easing * (sceneEndZoom - sceneStartZoom)
   */
  private calculateSceneState(scene: SceneName, sceneProgress: number): CameraState {
    const { parcelCenter, altitude } = this.options;
    
    // SAKİN HIZ EĞRİSİ (0-20% yavaş, 20-80% normal, 80-100% yavaşla)
    const calmProgress = this.calculateCalmProgress(sceneProgress);
    const easedProgress = this.easing(calmProgress);
    
    // ─── CENTER (SABİT) ───
    const center: [number, number] = [parcelCenter[0], parcelCenter[1]];
    
    // ─── PITCH (SABİT) ───
    const pitch = this.basePitch;
    
    // ─── BEARING (çok küçük drift ile) ───
    const baseBearing = CARDINAL_BEARINGS[scene];
    // Max ±5° drift (çok küçük sinematik hareket)
    const driftRange = 5;
    const driftAmount = Math.sin(calmProgress * Math.PI) * driftRange;
    const bearing = baseBearing + driftAmount;
    
    // ─── ZOOM (çok hafif değişim) ───
    const startZoom = this.sceneStartZooms[scene];
    const endZoom = this.sceneEndZooms[scene];
    let zoom = startZoom + (endZoom - startZoom) * easedProgress;
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    
    return {
      center,
      zoom,
      pitch,
      bearing: ((bearing % 360) + 360) % 360,
      altitude,
    };
  }
  
  /**
   * Sakin hız eğrisi:
   * İlk %20: yavaş başla
   * Orta %60: sakin ilerle
   * Son %20: yavaşla
   */
  private calculateCalmProgress(progress: number): number {
    if (progress < 0.2) {
      // İlk %20: quadratic yavaş başlangıç
      return Math.pow(progress / 0.2, 2) * 0.2;
    } else if (progress > 0.8) {
      // Son %20: quadratic yavaş bitiş
      const t = (progress - 0.8) / 0.2;
      return 0.2 + (1 - Math.pow(1 - t, 2)) * 0.8;
    } else {
      // Orta %60: doğrusal
      return progress;
    }
  }
  
  /**
   * DEBUG: Sahne bilgilerini logla
   */
  getDebugInfo(progress: number): string {
    const state = this.getState(progress);
    const info = this.getSceneInfo(progress);
    return `[${info.name.toUpperCase()}] p=${(info.progress * 100).toFixed(1)}% | center=[${state.center[0].toFixed(5)}, ${state.center[1].toFixed(5)}] | zoom=${state.zoom.toFixed(2)} | pitch=${state.pitch.toFixed(0)}° | bearing=${state.bearing.toFixed(1)}°`;
  }
  
  getSceneInfo(progress: number): SceneInfo {
    const p = Math.max(0, Math.min(1, progress));
    const scene = this.getCurrentScene(p);
    const sceneProgress = this.getSceneProgress(p, scene);
    const state = this.getState(p);
    
    return {
      name: scene,
      progress: sceneProgress,
      globalProgress: p,
      bearing: state.bearing,
      zoom: state.zoom,
    };
  }
  
  getSceneNameTR(scene: SceneName): string {
    switch (scene) {
      case "north": return "Kuzey Görünümü";
      case "east": return "Doğu Görünümü";
      case "south": return "Güney Görünümü";
      case "west": return "Batı Görünümü";
      case "final": return "Final Hover";
    }
  }
  
  /**
   * Base zoom değerini al (fitBounds referansı)
   */
  getBaseZoom(): number {
    return this.baseZoom;
  }
  
  /**
   * Base pitch değerini al
   */
  getBasePitch(): number {
    return this.basePitch;
  }
}

// ─── ESKİ UYUMLULUK İÇİN EXPORT ──────────────────────────────────────────────

export { PreviewCameraEngine as default };