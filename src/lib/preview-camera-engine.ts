/**
 * Simplified Camera Engine v2
 * 
 * Sadece iki ana hareket:
 * 1. SABİT YÜKSEKLİKTE ORBIT (5 km/saat)
 * 2. KUZEY-GÜNEY HATTI BOYUNCA GEÇİŞ
 * 
 * Karmaşık 4 yön çekimi ve zoom değişimi YOK.
 */

import type { CameraFeel } from "@/lib/parcel-store";

// ─── SABİTLER ────────────────────────────────────────────────────────────────

// Orbit hızı: 5 km/saat (yürüyüş hızı)
const ORBIT_SPEED_KMH = 5;
const SPEED_MPS = ORBIT_SPEED_KMH / 3.6; // ~1.39 m/s

// ─── EASING ────────────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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
  /** Orbit radius (derece cinsinden, varsayılan ~500m) */
  orbitRadiusDegrees?: number;
  /** Geçiş mesafesi (derece cinsinden) */
  passDistanceDegrees?: number;
}

export class SimpleCameraEngine {
  private options: Required<SimpleCameraOptions>;
  private easing: (t: number) => number;
  private startBearing: number;
  
  // Scene durations (ratio of total)
  private readonly SCENE_RATIOS = {
    orbit: 0.45,
    transition: 0.45,
    final: 0.10,
  };

  constructor(options: SimpleCameraOptions) {
    this.options = {
      orbitRadiusDegrees: 0.005, // ~500m
      passDistanceDegrees: 0.002, // ~200m - güvenli, parsel kaybolmaz
      ...options,
    };
    this.easing = easeInOutCubic; // Sadece geçiş için
    this.startBearing = Math.random() * 360;
  }
  
  /**
   * Herhangi bir progress'te (0-1) kamera durumunu al
   */
  getState(progress: number): CameraState {
    const p = Math.max(0, Math.min(1, progress));
    const scene = this.getCurrentScene(p);
    const sceneProgress = this.getSceneProgress(p, scene);
    
    return this.calculateSceneState(scene, sceneProgress, p);
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
    globalProgress: number
  ): CameraState {
    const { parcelCenter, orbitRadiusDegrees, passDistanceDegrees } = this.options;
    const { baseZoom, basePitch } = this;
    
    switch (scene) {
      case "orbit":
        return this.calculateOrbitState(sceneProgress, parcelCenter, baseZoom, basePitch, orbitRadiusDegrees);
      
      case "transition":
        return this.calculateTransitionState(sceneProgress, parcelCenter, baseZoom, basePitch, passDistanceDegrees);
      
      case "final":
        return this.calculateFinalState(globalProgress, parcelCenter, baseZoom, basePitch);
    }
  }
  
  /**
   * ORBIT: 5 km/saat hızda sabit yükseklik orbit
   * NOT: Easing YOK - lineer sabit hız
   */
  private calculateOrbitState(
    sceneProgress: number,
    parcelCenter: [number, number],
    zoom: number,
    pitch: number,
    orbitRadiusDegrees: number
  ): CameraState {
    // Lineer sabit hız - easing YOK
    const linearProgress = sceneProgress;
    
    // Açısal hız hesapla (5 km/saat)
    const radiusMeters = orbitRadiusDegrees * 111000; // derece → metre
    const angularSpeedRadPerSec = SPEED_MPS / radiusMeters;
    
    // Elapsed time (orbit sahnesi içinde)
    const elapsedSeconds = linearProgress * this.options.duration * this.SCENE_RATIOS.orbit;
    const angleRad = angularSpeedRadPerSec * elapsedSeconds;
    const angleDeg = angleRad * (180 / Math.PI);
    
    // Bearing hesapla - lineer artış
    const bearing = (this.startBearing + angleDeg) % 360;
    
    return {
      center: [parcelCenter[0], parcelCenter[1]],
      zoom,
      pitch,
      bearing: ((bearing % 360) + 360) % 360,
      altitude: this.options.altitude,
    };
  }
  
  /**
   * TRANSITION: Kuzey-Güney düz geçiş
   * NOT: Easing YOK - lineer sabit hız, parsel kadrajda kalır
   */
  private calculateTransitionState(
    sceneProgress: number,
    parcelCenter: [number, number],
    zoom: number,
    pitch: number,
    passDistanceDegrees: number
  ): CameraState {
    // Lineer sabit hız - easing YOK
    const linearProgress = sceneProgress;
    
    // Kuzeyden güneye doğru düz hat
    // start: parcelCenter + northOffset
    // end: parcelCenter + southOffset
    // Geçiş çok küçük (<200m) - parsel her zaman kadrajda
    
    const northOffset = passDistanceDegrees / 2;
    const southOffset = -passDistanceDegrees / 2;
    
    // Linear interpolation: north → south
    const centerLat = parcelCenter[1] + northOffset + (southOffset - northOffset) * linearProgress;
    
    // Bearing: 180° (güneye doğru bak) - sabit
    const bearing = 180;
    
    return {
      center: [parcelCenter[0], centerLat],
      zoom,
      pitch,
      bearing,
      altitude: this.options.altitude,
    };
  }
  
  /**
   * FINAL: Tamamen sabit hover
   * NOT: Drift YOK - tamamen sabit
   */
  private calculateFinalState(
    globalProgress: number,
    parcelCenter: [number, number],
    zoom: number,
    pitch: number
  ): CameraState {
    // Tamamen sabit - hiçbir şey değişmez
    return {
      center: [parcelCenter[0], parcelCenter[1]],
      zoom,
      pitch,
      bearing: 180, // Sabit
      altitude: this.options.altitude,
    };
  }
  
  /**
   * Base zoom hesapla
   */
  private get baseZoom(): number {
    return 18 - Math.log2(this.options.altitude / 50);
  }
  
  /**
   * Base pitch hesapla
   */
  private get basePitch(): number {
    return 57; // Stabil pitch
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