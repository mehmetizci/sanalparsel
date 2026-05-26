/**
 * Project Configuration System
 * 
 * Central state management for drone and video settings.
 * Provides helpers for camera sequence building and overlay configuration.
 */

import type { CameraMode } from "@/types";

// ─── Central Project Config Type ─────────────────────────────────────────────

export interface DroneConfig {
  duration: 30 | 45 | 60;
  startHeight: 100 | 200 | 300 | 400;
  cameraFeel: "smooth" | "cinematic" | "dynamic";
  cameraModes: CameraMode[];
}

export interface OverlayConfig {
  consultantName: boolean;
  phone: boolean;
  logo: boolean;
  profilePhoto: boolean;
  parcelInfo: boolean;
  nearbyPlaces: boolean;
  subtitles: boolean;
  finalContactCard: boolean;
}

export interface Resolution {
  width: number;
  height: number;
}

export interface VideoConfig {
  format: "reels" | "landscape";
  resolution: Resolution;
  overlays: OverlayConfig;
}

export interface ProjectConfig {
  projectId: string;
  droneSettings: DroneConfig;
  videoSettings: VideoConfig;
  nearbyPlaces: NearbyPlacesConfig;
  aiNarration: AiNarrationConfig;
  voiceSettings: VoiceSettings;
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

// ─── Camera Mode Definitions ──────────────────────────────────────────────────

export const CAMERA_MODE_LABELS: Record<CameraMode, string> = {
  orbit_360: "Orbit 360",
  spiral_descent: "Spiral Alçalış",
  top_view: "Tepe Görünüm",
  low_fly: "Alçak Geçiş",
  four_corners: "4 Köşe",
};

export const CAMERA_MODE_DESCRIPTIONS: Record<CameraMode, string> = {
  orbit_360: "360° dairesel çevrim",
  spiral_descent: "Yukarıdan aşağı spiral",
  top_view: "Tepe görünümü",
  low_fly: "Alçak açıdan geçiş",
  four_corners: "4 köşe turu",
};

// Camera mode duration in seconds (relative weight)
export const CAMERA_MODE_DURATIONS: Record<CameraMode, number> = {
  orbit_360: 8,
  spiral_descent: 10,
  top_view: 5,
  low_fly: 7,
  four_corners: 10,
};

// ─── Resolution Definitions ───────────────────────────────────────────────────

export const FORMAT_RESOLUTIONS: Record<"reels" | "landscape", Resolution> = {
  reels: { width: 720, height: 1280 },
  landscape: { width: 1280, height: 720 },
};

export const FORMAT_ASPECT_RATIOS: Record<"reels" | "landscape", string> = {
  reels: "9:16",
  landscape: "16:9",
};

// ─── POI/Nearby Places Types ─────────────────────────────────────────────────

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  distanceMeters: number;
  distanceText: string;
  lat: number;
  lng: number;
  selected: boolean;
}

export interface NearbyPlacesConfig {
  places: NearbyPlace[];
  lastFetchedAt: number | null;
  parcelKey: string | null;
}

// ─── AI Narration Types ─────────────────────────────────────────────────────

export type NarrationMode = "corporate" | "investment" | "social" | "short" | "premium";

export interface NarrationModeInfo {
  value: NarrationMode;
  label: string;
  description: string;
  maxWords: number;
  avgSpeechDuration: number; // seconds per word
}

export const NARRATION_MODES: NarrationModeInfo[] = [
  { 
    value: "corporate", 
    label: "Kurumsal", 
    description: "Profesyonel ve güven veren",
    maxWords: 150,
    avgSpeechDuration: 0.35,
  },
  { 
    value: "investment", 
    label: "Yatırım Odaklı", 
    description: "Değer ve potansiyel vurgulu",
    maxWords: 180,
    avgSpeechDuration: 0.38,
  },
  { 
    value: "social", 
    label: "Sosyal Medya", 
    description: "Kısa ve dikkat çekici",
    maxWords: 80,
    avgSpeechDuration: 0.30,
  },
  { 
    value: "short", 
    label: "Kısa", 
    description: "60-90 kelime özet",
    maxWords: 90,
    avgSpeechDuration: 0.32,
  },
  { 
    value: "premium", 
    label: "Premium", 
    description: "Lüks ve prestijli",
    maxWords: 140,
    avgSpeechDuration: 0.40,
  },
];

export interface AiNarrationConfig {
  mode: NarrationMode;
  text: string;
  lastGeneratedAt: number | null;
}

export const DEFAULT_NARRATION_CONFIG: AiNarrationConfig = {
  mode: "corporate",
  text: "",
  lastGeneratedAt: null,
};

// ─── Voice Settings Types ───────────────────────────────────────────────────

export type VoiceType = "female" | "male" | "corporate";

export interface VoiceSettings {
  selectedVoice: VoiceType;
  provider: "edge-tts";
  edgeVoice: string;
  rate: string;
  pitch: string;
  generatedAudioUrl: string | null;
  generatedAudioBlob: Blob | null;
  audioDuration: number;
}

// Edge TTS voice configurations for Turkish
export const EDGE_VOICE_CONFIGS: Record<VoiceType, {
  voice: string;
  rate: string;
  pitch: string;
  description: string;
}> = {
  female: {
    voice: "tr-TR-EmelNeural",
    rate: "0%",
    pitch: "0Hz",
    description: "Sıcak ve profesyonel",
  },
  male: {
    voice: "tr-TR-AhmetNeural",
    rate: "0%",
    pitch: "0Hz",
    description: "Güvenilir ve dinamik",
  },
  corporate: {
    voice: "tr-TR-AhmetNeural",
    rate: "-10%",
    pitch: "-2Hz",
    description: "Formal ve ciddi",
  },
};

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  selectedVoice: "male",
  provider: "edge-tts",
  edgeVoice: "tr-TR-AhmetNeural",
  rate: "0%",
  pitch: "0Hz",
  generatedAudioUrl: null,
  generatedAudioBlob: null,
  audioDuration: 0,
};

// ─── Default Config ───────────────────────────────────────────────────────────

export const DEFAULT_DRONE_CONFIG: DroneConfig = {
  duration: 30,
  startHeight: 300,
  cameraFeel: "cinematic",
  cameraModes: ["orbit_360", "spiral_descent"],
};

export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  consultantName: true,
  phone: true,
  logo: true,
  profilePhoto: false,
  parcelInfo: true,
  nearbyPlaces: true,
  subtitles: true,
  finalContactCard: true,
};

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  format: "reels",
  resolution: FORMAT_RESOLUTIONS.reels,
  overlays: DEFAULT_OVERLAY_CONFIG,
};

export const DEFAULT_NEARBY_PLACES_CONFIG: NearbyPlacesConfig = {
  places: [],
  lastFetchedAt: null,
  parcelKey: null,
};

export function createDefaultProjectConfig(projectId: string): ProjectConfig {
  return {
    projectId,
    droneSettings: { ...DEFAULT_DRONE_CONFIG },
    videoSettings: { ...DEFAULT_VIDEO_CONFIG },
    nearbyPlaces: { ...DEFAULT_NEARBY_PLACES_CONFIG },
    aiNarration: { ...DEFAULT_NARRATION_CONFIG },
    voiceSettings: { ...DEFAULT_VOICE_SETTINGS },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── Camera Sequence Builder ──────────────────────────────────────────────────

export interface CameraKeyframe {
  mode: CameraMode;
  startTime: number;
  endTime: number;
  duration: number;
  pitch: number;
  bearing: number;
  zoom: number;
}

export interface CameraSequence {
  totalDuration: number;
  keyframes: CameraKeyframe[];
}

/**
 * Build camera sequence from drone settings
 * Distributes total video duration across selected camera modes
 */
export function buildCameraSequence(droneConfig: DroneConfig): CameraSequence {
  const { duration, cameraModes } = droneConfig;
  
  if (cameraModes.length === 0) {
    return { totalDuration: 0, keyframes: [] };
  }

  // Calculate time per mode
  const baseTimePerMode = duration / cameraModes.length;
  
  const keyframes: CameraKeyframe[] = [];
  let currentTime = 0;

  cameraModes.forEach((mode, index) => {
    // Add transition time between modes
    const transitionTime = index > 0 ? 1 : 0; // 1 second transition
    currentTime += transitionTime;
    
    const modeDuration = Math.min(baseTimePerMode, CAMERA_MODE_DURATIONS[mode]);
    const endTime = currentTime + modeDuration;

    // Calculate camera parameters based on mode
    const { pitch, bearing, zoom } = getCameraParameters(mode, index, cameraModes.length);

    keyframes.push({
      mode,
      startTime: currentTime,
      endTime,
      duration: modeDuration,
      pitch,
      bearing,
      zoom,
    });

    currentTime = endTime;
  });

  // Adjust final time to match total duration
  const totalDuration = Math.max(currentTime, duration);
  
  return {
    totalDuration,
    keyframes,
  };
}

/**
 * Get camera parameters for a specific mode
 */
function getCameraParameters(
  mode: CameraMode,
  index: number,
  totalModes: number
): { pitch: number; bearing: number; zoom: number } {
  const basePitch = 55;
  const baseZoom = 17;

  switch (mode) {
    case "orbit_360":
      return {
        pitch: basePitch,
        bearing: (index * 360) / totalModes,
        zoom: baseZoom,
      };
    case "spiral_descent":
      return {
        pitch: 65 - (index * 5),
        bearing: -20 + (index * 10),
        zoom: baseZoom + 0.5,
      };
    case "top_view":
      return {
        pitch: 0,
        bearing: 0,
        zoom: baseZoom - 1,
      };
    case "low_fly":
      return {
        pitch: 45,
        bearing: -15 + (index * 15),
        zoom: baseZoom + 0.3,
      };
    case "four_corners":
      return {
        pitch: 50,
        bearing: (index * 90),
        zoom: baseZoom,
      };
    default:
      return { pitch: basePitch, bearing: 0, zoom: baseZoom };
  }
}

// ─── Overlay Sequence Builder ──────────────────────────────────────────────────

export type OverlayType = 
  | "parcelInfo"
  | "nearbyPlaces"
  | "consultantCard"
  | "subtitles"
  | "finalContact";

export interface OverlayKeyframe {
  type: OverlayType;
  startTime: number;
  endTime: number;
  position: "top" | "bottom" | "center" | "overlay";
  visible: boolean;
}

export interface OverlaySequence {
  totalDuration: number;
  keyframes: OverlayKeyframe[];
}

/**
 * Build overlay sequence from video settings
 * Defines timing for each overlay type based on video duration
 */
export function buildOverlaySequence(
  videoConfig: VideoConfig,
  totalDuration: number
): OverlaySequence {
  const { overlays } = videoConfig;
  const keyframes: OverlayKeyframe[] = [];

  // Define overlay timing based on video structure
  // Intro: 0-5s, Main content: 5-25s, Outro: 25-30s

  if (overlays.parcelInfo) {
    // Show parcel info during intro
    keyframes.push({
      type: "parcelInfo",
      startTime: 0,
      endTime: Math.min(8, totalDuration * 0.25),
      position: "top",
      visible: true,
    });
  }

  if (overlays.nearbyPlaces) {
    // Show nearby places during main content
    keyframes.push({
      type: "nearbyPlaces",
      startTime: Math.min(8, totalDuration * 0.25),
      endTime: Math.min(20, totalDuration * 0.7),
      position: "bottom",
      visible: true,
    });
  }

  if (overlays.subtitles) {
    // Subtitles during entire video
    keyframes.push({
      type: "subtitles",
      startTime: 2,
      endTime: Math.min(totalDuration - 3, totalDuration * 0.95),
      position: "center",
      visible: true,
    });
  }

  if (overlays.consultantName || overlays.logo || overlays.phone) {
    // Consultant card during main content
    keyframes.push({
      type: "consultantCard",
      startTime: Math.min(5, totalDuration * 0.15),
      endTime: Math.min(15, totalDuration * 0.5),
      position: "bottom",
      visible: true,
    });
  }

  if (overlays.finalContactCard) {
    // Final contact card at end
    keyframes.push({
      type: "finalContact",
      startTime: Math.max(0, totalDuration - 8),
      endTime: totalDuration,
      position: "center",
      visible: true,
    });
  }

  return {
    totalDuration,
    keyframes,
  };
}

// ─── Resolution Helper ────────────────────────────────────────────────────────

/**
 * Get render resolution for a given format
 */
export function getRenderResolution(format: "reels" | "landscape"): Resolution {
  return FORMAT_RESOLUTIONS[format];
}

/**
 * Get aspect ratio string for a given format
 */
export function getAspectRatio(format: "reels" | "landscape"): string {
  return FORMAT_ASPECT_RATIOS[format];
}

// ─── Config Persistence (localStorage) ────────────────────────────────────────

const CONFIG_STORAGE_KEY = "sanalparsel_project_config";

/**
 * Save project config to localStorage
 */
export function saveProjectConfig(config: ProjectConfig): void {
  if (typeof window === "undefined") return;
  
  try {
    const configs = getAllProjectConfigs();
    configs[config.projectId] = {
      ...config,
      updatedAt: Date.now(),
    };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configs));
  } catch (error) {
    console.error("Failed to save project config:", error);
  }
}

/**
 * Load project config from localStorage
 */
export function loadProjectConfig(projectId: string): ProjectConfig | null {
  if (typeof window === "undefined") return null;
  
  try {
    const configs = getAllProjectConfigs();
    return configs[projectId] || null;
  } catch (error) {
    console.error("Failed to load project config:", error);
    return null;
  }
}

/**
 * Get all project configs from localStorage
 */
export function getAllProjectConfigs(): Record<string, ProjectConfig> {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Delete project config from localStorage
 */
export function deleteProjectConfig(projectId: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const configs = getAllProjectConfigs();
    delete configs[projectId];
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configs));
  } catch (error) {
    console.error("Failed to delete project config:", error);
  }
}

/**
 * Get the most recently updated project ID from localStorage
 * Returns the project ID with the most recent updatedAt timestamp
 */
export function getMostRecentProjectId(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    const configs = getAllProjectConfigs();
    const projectIds = Object.keys(configs);
    
    if (projectIds.length === 0) return null;
    
    // Find the project with the most recent updatedAt
    let mostRecentId: string | null = null;
    let mostRecentTime = 0;
    
    for (const id of projectIds) {
      const updatedAt = configs[id]?.updatedAt || 0;
      if (updatedAt > mostRecentTime) {
        mostRecentTime = updatedAt;
        mostRecentId = id;
      }
    }
    
    return mostRecentId;
  } catch {
    return null;
  }
}

/**
 * Check if any project config exists in localStorage
 */
export function hasAnyProjectConfig(): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    const configs = getAllProjectConfigs();
    return Object.keys(configs).length > 0;
  } catch {
    return false;
  }
}

/**
 * Migrate legacy settings to new config format
 */
export function migrateLegacySettings(
  projectId: string,
  settings: {
    duration?: number;
    height?: number;
    camera_modes?: string[];
    camera_style?: string;
    video_format?: string;
    show_name?: boolean;
    show_phone?: boolean;
    show_logo?: boolean;
    show_avatar?: boolean;
    show_parcel_info?: boolean;
    show_environment?: boolean;
    show_subtitles?: boolean;
    show_final_card?: boolean;
  }
): ProjectConfig {
  const existingConfig = loadProjectConfig(projectId);
  
  if (existingConfig) {
    // Update existing config
    return {
      ...existingConfig,
      droneSettings: {
        ...existingConfig.droneSettings,
        duration: (settings.duration || existingConfig.droneSettings.duration) as 30 | 45 | 60,
        startHeight: (settings.height || existingConfig.droneSettings.startHeight) as 100 | 200 | 300 | 400,
        cameraFeel: (settings.camera_style as "smooth" | "cinematic" | "dynamic") || existingConfig.droneSettings.cameraFeel,
        cameraModes: (settings.camera_modes as CameraMode[]) || existingConfig.droneSettings.cameraModes,
      },
      videoSettings: {
        ...existingConfig.videoSettings,
        format: (settings.video_format as "reels" | "landscape") || existingConfig.videoSettings.format,
        resolution: FORMAT_RESOLUTIONS[settings.video_format as "reels" | "landscape"] || existingConfig.videoSettings.resolution,
        overlays: {
          consultantName: settings.show_name ?? existingConfig.videoSettings.overlays.consultantName,
          phone: settings.show_phone ?? existingConfig.videoSettings.overlays.phone,
          logo: settings.show_logo ?? existingConfig.videoSettings.overlays.logo,
          profilePhoto: settings.show_avatar ?? existingConfig.videoSettings.overlays.profilePhoto,
          parcelInfo: settings.show_parcel_info ?? existingConfig.videoSettings.overlays.parcelInfo,
          nearbyPlaces: settings.show_environment ?? existingConfig.videoSettings.overlays.nearbyPlaces,
          subtitles: settings.show_subtitles ?? existingConfig.videoSettings.overlays.subtitles,
          finalContactCard: settings.show_final_card ?? existingConfig.videoSettings.overlays.finalContactCard,
        },
      },
      updatedAt: Date.now(),
    };
  }

  // Create new config from settings
  return {
    projectId,
    droneSettings: {
      duration: (settings.duration || 30) as 30 | 45 | 60,
      startHeight: (settings.height || 300) as 100 | 200 | 300 | 400,
      cameraFeel: (settings.camera_style as "smooth" | "cinematic" | "dynamic") || "cinematic",
      cameraModes: (settings.camera_modes as CameraMode[]) || ["orbit_360", "spiral_descent"],
    },
    videoSettings: {
      format: (settings.video_format as "reels" | "landscape") || "reels",
      resolution: FORMAT_RESOLUTIONS[settings.video_format as "reels" | "landscape"] || FORMAT_RESOLUTIONS.reels,
      overlays: {
        consultantName: settings.show_name ?? true,
        phone: settings.show_phone ?? true,
        logo: settings.show_logo ?? true,
        profilePhoto: settings.show_avatar ?? false,
        parcelInfo: settings.show_parcel_info ?? true,
        nearbyPlaces: settings.show_environment ?? true,
        subtitles: settings.show_subtitles ?? true,
        finalContactCard: settings.show_final_card ?? true,
      },
    },
    nearbyPlaces: { ...DEFAULT_NEARBY_PLACES_CONFIG },
    aiNarration: { ...DEFAULT_NARRATION_CONFIG },
    voiceSettings: { ...DEFAULT_VOICE_SETTINGS },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── Config to Settings Converter ─────────────────────────────────────────────

/**
 * Convert ProjectConfig back to legacy settings format (for Supabase)
 */
export function configToSettings(config: ProjectConfig): Record<string, unknown> {
  return {
    project_id: config.projectId,
    duration: config.droneSettings.duration,
    height: config.droneSettings.startHeight,
    camera_modes: config.droneSettings.cameraModes,
    camera_style: config.droneSettings.cameraFeel,
    video_format: config.videoSettings.format,
    show_name: config.videoSettings.overlays.consultantName,
    show_phone: config.videoSettings.overlays.phone,
    show_logo: config.videoSettings.overlays.logo,
    show_avatar: config.videoSettings.overlays.profilePhoto,
    show_parcel_info: config.videoSettings.overlays.parcelInfo,
    show_environment: config.videoSettings.overlays.nearbyPlaces,
    show_subtitles: config.videoSettings.overlays.subtitles,
    show_final_card: config.videoSettings.overlays.finalContactCard,
  };
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

/**
 * Validate drone config
 */
export function validateDroneConfig(config: DroneConfig): string[] {
  const errors: string[] = [];

  if (![30, 45, 60].includes(config.duration)) {
    errors.push("Video süresi 30, 45 veya 60 saniye olmalıdır");
  }

  if (![100, 200, 300, 400].includes(config.startHeight)) {
    errors.push("Yükseklik 100, 200, 300 veya 400 metre olmalıdır");
  }

  if (!["smooth", "cinematic", "dynamic"].includes(config.cameraFeel)) {
    errors.push("Geçersiz kamera hissi");
  }

  if (config.cameraModes.length === 0) {
    errors.push("En az bir kamera modu seçilmelidir");
  }

  return errors;
}

/**
 * Validate video config
 */
export function validateVideoConfig(config: VideoConfig): string[] {
  const errors: string[] = [];

  if (!["reels", "landscape"].includes(config.format)) {
    errors.push("Geçersiz video formatı");
  }

  return errors;
}

// ─── Nearby Places Helpers ────────────────────────────────────────────────────

/**
 * Convert POI from parcel-store to normalized NearbyPlace
 */
export function poiToNearbyPlace(poi: { 
  id: string; 
  name?: string; 
  label?: string;
  category: string; 
  distanceMeters: number; 
  distanceText?: string;
  lat: number; 
  lng?: number;
  selected?: boolean;
}): NearbyPlace {
  return {
    id: poi.id,
    name: poi.name || poi.label || "Bilinmeyen Yer",
    category: poi.category,
    distanceMeters: poi.distanceMeters,
    distanceText: poi.distanceText || `${Math.round(poi.distanceMeters)} m`,
    lat: poi.lat,
    lng: poi.lng || poi.lat, // Fallback if lng missing
    selected: poi.selected ?? true,
  };
}

/**
 * Convert array of POIs to NearbyPlace array
 */
export function poisToNearbyPlaces(pois: Array<{
  id: string;
  name?: string;
  label?: string;
  category: string;
  distanceMeters: number;
  distanceText?: string;
  lat: number;
  lng?: number;
  selected?: boolean;
}>): NearbyPlace[] {
  return pois.map(poiToNearbyPlace);
}

/**
 * Get selected POIs from nearby places config
 */
export function getSelectedPOIs(config: NearbyPlacesConfig): NearbyPlace[] {
  return config.places.filter(p => p.selected);
}

/**
 * Get selected POI count
 */
export function getSelectedPOICount(config: NearbyPlacesConfig): number {
  return config.places.filter(p => p.selected).length;
}

/**
 * Validate POI selection rules
 * - At least 1 POI must be selected
 * - At most 7 POIs can be selected
 */
export function validatePOISelection(config: NearbyPlacesConfig): { valid: boolean; error?: string } {
  const selectedCount = getSelectedPOICount(config);
  
  if (selectedCount === 0) {
    return { valid: false, error: "En az bir POI seçilmelidir" };
  }
  
  if (selectedCount > 7) {
    return { valid: false, error: "En fazla 7 POI seçilebilir" };
  }
  
  return { valid: true };
}

/**
 * Check if can toggle a POI (respects max selection rule)
 */
export function canTogglePOI(config: NearbyPlacesConfig, poiId: string): boolean {
  const selectedCount = getSelectedPOICount(config);
  const poi = config.places.find(p => p.id === poiId);
  
  if (!poi) return false;
  
  if (poi.selected) {
    // Can always deselect
    return true;
  } else {
    // Can only select if under max
    return selectedCount < 7;
  }
}

/**
 * Toggle POI selection in config
 */
export function togglePOIInConfig(config: NearbyPlacesConfig, poiId: string): NearbyPlacesConfig {
  if (!canTogglePOI(config, poiId)) {
    return config;
  }
  
  return {
    ...config,
    places: config.places.map(p => 
      p.id === poiId ? { ...p, selected: !p.selected } : p
    ),
  };
}

/**
 * Build POI sequence for camera animation
 * Returns POIs sorted by distance for fly-by animations
 */
export function buildPOISequence(config: NearbyPlacesConfig): NearbyPlace[] {
  return config.places
    .filter(p => p.selected)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/**
 * Format POI for AI narration
 */
export function formatPOIForNarration(pois: NearbyPlace[]): string {
  if (pois.length === 0) return "";
  
  const descriptions = pois.map(poi => {
    const categoryLabel = getCategoryLabel(poi.category);
    const distanceText = poi.distanceMeters < 1000 
      ? `${Math.round(poi.distanceMeters)} metre`
      : `${(poi.distanceMeters / 1000).toFixed(1)} kilometre`;
    return `${poi.name} (${categoryLabel}, ${distanceText} uzaklıkta)`;
  });
  
  if (descriptions.length === 1) {
    return `${descriptions[0]}`;
  }
  
  const last = descriptions.pop();
  return `${descriptions.join(", ")} ve ${last}`;
}

/**
 * Get Turkish label for POI category
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    hospital: "Hastane",
    school: "Okul",
    university: "Üniversite",
    market: "Market",
    pharmacy: "Eczane",
    transport: "Toplu Taşıma",
    highway: "Otoyol",
    marketplace: "Pazar Yeri",
    restaurant: "Restoran",
    cafe: "Kafe",
    bank: "Banka",
    atm: "ATM",
    fuel: "Benzin İstasyonu",
    parking: "Otopark",
    shopping: "Alışveriş",
    mosque: "Camii",
    church: "Kilise",
    park: "Park",
    gym: "Spor Salonu",
  };
  
  return labels[category.toLowerCase()] || category;
}