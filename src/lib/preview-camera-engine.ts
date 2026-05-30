/**
 * Simplified Camera Engine v2
 * 
 * ParcelMap.tsx ön izleme mantığı:
 * 1. ORBIT: center=sabit, bearing yavaşça artar (3°/saniye)
 * 2. N-S GEÇİŞİ: bearing=180, center kontrollü hareket
 * 3. FINAL: tamamen sabit
 * 
 * Karmaşık dairesel orbit YOK.
 * Ön izleme ekranındaki çalışan davranış kullanılıyor.
 */

import type { CameraFeel } from "@/lib/parcel-store";

// ─── SABİTLER ────────────────────────────────────────────────────────────────

const BEARING_SPEED_DEG_PER_SEC = 3; // Yavaş rotation - ön izleme gibi

// ─── EASING ────────────────────────────────────────────────────────────────

// Easing kaldırıldı - tüm hareketler lineer sabit hızda

// ─── YARDIMCI FONKSİYONLAR ────────────────────────────────────────────────

export function altitudeToZoom(altitude: number): number {
  return 18 - Math.log2(altitude / 50);
}

// ─── TİPLER ────────────────────────────────────────────────────────────────

export interface CameraState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  altitude: number;
}

export type SceneName = "orbit" | "transition" | "final";

export interface SceneInfo {
  name: SceneName;
  progress: number;
  globalProgress: number;
}

// ─── KAMERA MOTORU ─────────────────────────────────────────────────────────

export interface SimpleCameraOptions {
  parcelCenter: [number, number];
  altitude: number;
  duration: number;
  feel: CameraFeel;
  /** Geçiş mesafesi (derece cinsinden) */
  passDistanceDegrees?: number;
}

export class SimpleCameraEngine {
  private options: Required<SimpleCameraOptions>;
  private startBearing: number;
  
  // Scene durations (ratio of total)
  private readonly SCENE_RATIOS = {
    orbit: 0.45,
    transition: 0.45,
    final: 0.10,
  };
  
  // Sabit kamera değerleri (ön izleme gibi)
  private readonly BASE_PITCH = 55; // Stabil pitch

  constructor(options: SimpleCameraOptions) {
    this.options = {
      passDistanceDegrees: 0.001, // ~100m - güvenli
      ...options,
    };
    // Başlangıç bearing: hafif offset ile
    this.startBearing = -25; // Ön izleme gibi
  }
  
  /**
   * Herhangi bir progress'te (0-1) kamera durumunu al
   */
  getState(progress: number): CameraState {
    const p = Math.max(0, Math.min(1, progress));
    const scene = this.getCurrentScene(p);
    const sceneProgress = this.getSceneProgress(p, scene);
    
    // Elapsed seconds for bearing calculation
    const elapsedSeconds = p * this.options.duration;
    
    return this.calculateSceneState(scene, sceneProgress, elapsedSeconds);
  }
  
  /**
   * Mevcut sahneyi bul
   */
  private getCurrentScene(progress: number): SceneName {
    const r = this.SCENE_RATIOS;
    const orbitEnd = r.orbit;
    const transitionEnd = orbitEnd + r.transition;
    
    if (progress < orbitEnd) return "orbit";
    if (progress < transitionEnd) return "transition";
    return "final";
  }
  
  /**
   * Sahne içi progress (0-1)
   */
  private getSceneProgress(globalProgress: number, scene: SceneName): number {
    const r = this.SCENE_RATIOS;
    
    switch (scene) {
      case "orbit": return globalProgress / r.orbit;
      case "transition": return (globalProgress - r.orbit) / r.transition;
      case "final": return (globalProgress - r.orbit - r.transition) / r.final;
    }
  }
  
  /**
   * Her sahne için kamera durumunu hesapla
   */
  private calculateSceneState(
    scene: SceneName, 
    sceneProgress: number,
    elapsedSeconds: number
  ): CameraState {
    const { parcelCenter, passDistanceDegrees } = this.options;
    
    switch (scene) {
      case "orbit":
        return this.calculateOrbitState(elapsedSeconds, parcelCenter);
      
      case "transition":
        return this.calculateTransitionState(sceneProgress, parcelCenter, passDistanceDegrees);
      
      case "final":
        return this.calculateFinalState(parcelCenter);
    }
  }
  
  /**
   * ORBIT: Ön izleme gibi - center sabit, bearing yavaşça artar
   * 
   * ParcelMap.tsx mantığı:
   * - center = parcelCenter (değişmez)
   * - bearing = startBearing + elapsedSeconds * 3°/saniye
   * - pitch = 55 (sabit)
   * - zoom = sabit
   */
  private calculateOrbitState(
    elapsedSeconds: number,
    parcelCenter: [number, number]
  ): CameraState {
    // Bearing: 3 derece/saniye (ön izleme gibi)
    const bearing = this.startBearing + elapsedSeconds * BEARING_SPEED_DEG_PER_SEC;
    
    return {
      center: [parcelCenter[0], parcelCenter[1]], // Center sabit
      zoom: this.baseZoom,
      pitch: this.BASE_PITCH,
      bearing: ((bearing % 360) + 360) % 360,
      altitude: this.options.altitude,
    };
  }
  
  /**
   * TRANSITION: Kuzey-Güney geçiş
   * 
   * - bearing = 180 (güneye bak)
   * - pitch = 55 (sabit)
   * - center kontrollü N-S hareket
   * - zoom sabit
   */
  private calculateTransitionState(
    sceneProgress: number,
    parcelCenter: [number, number],
    passDistanceDegrees: number
  ): CameraState {
    // Center: kuzeyden güneye yavaş geçiş
    const northOffset = passDistanceDegrees / 2;
    const southOffset = -passDistanceDegrees / 2;
    const centerLat = parcelCenter[1] + northOffset + (southOffset - northOffset) * sceneProgress;
    
    return {
      center: [parcelCenter[0], centerLat],
      zoom: this.baseZoom,
      pitch: this.BASE_PITCH,
      bearing: 180, // Güneye bak
      altitude: this.options.altitude,
    };
  }
  
  /**
   * FINAL: Tamamen sabit hover
   * 
   * bearing = 180
   * center = parcelCenter
   * zoom sabit
   * pitch sabit
   */
  private calculateFinalState(
    parcelCenter: [number, number]
  ): CameraState {
    return {
      center: [parcelCenter[0], parcelCenter[1]],
      zoom: this.baseZoom,
      pitch: this.BASE_PITCH,
      bearing: 180, // Sabit güney
      altitude: this.options.altitude,
    };
  }
  
  /**
   * Base zoom hesapla
   */
  private get baseZoom(): number {
    return 18 - Math.log2(this.options.altitude / 50);
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
      case "orbit": return "Orbit Turu";
      case "transition": return "Kuzey-Güney Geçişi";
      case "final": return "Final";
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
}

// ─── ESKİ UYUMLULUK İÇİN EXPORT ──────────────────────────────────────────────

export { SimpleCameraEngine as PreviewCameraEngine };
export { SimpleCameraEngine as default };