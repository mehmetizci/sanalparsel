export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  office_name?: string;
  office_logo_url?: string;
  office_address?: string;
  license_no?: string;
}

export interface ParcelProperties {
  Il?: string;
  Ilce?: string;
  Mahalle?: string;
  Mevkii?: string;
  Ada?: string;
  ParselNo?: string;
  Alan?: string;
  Nitelik?: string;
}

export interface ParcelGeoJson {
  type: "Feature";
  properties: ParcelProperties;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  short_title: string;
  geojson: ParcelGeoJson | null;
  properties: ParcelProperties | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  block_no: string | null;
  parcel_no: string | null;
  area: string | null;
  property_type: string | null;
  center_lat: number | null;
  center_lon: number | null;
  custom_note: string | null;
  status: "draft" | "analysis_ready" | "video_ready" | "completed";
  created_at: string;
}

export interface ProjectSettings {
  id: string;
  project_id: string;
  duration: 30 | 45 | 60;
  height: 100 | 200 | 300 | 400;
  camera_modes: string[];
  camera_style: "smooth" | "cinematic" | "dynamic";
  video_format: "reels" | "landscape";
  show_logo: boolean;
  show_name: boolean;
  show_phone: boolean;
  show_avatar: boolean;
  show_office: boolean;
  show_license: boolean;
  show_parcel_info: boolean;
  show_environment: boolean;
  show_subtitles: boolean;
  show_final_card: boolean;
  /** Video rendering quality settings */
  video_quality?: "standard" | "high" | "ultra";
  video_fps?: 24 | 30 | 60;
  video_bitrate?: number; // Mbps
}

export interface EnvironmentItem {
  id: string;
  project_id: string;
  name: string;
  type: "hospital" | "school" | "university" | "market" | "pharmacy" | "transport" | "highway" | "marketplace";
  distance: string;
  lat: number;
  lon: number;
  selected: boolean;
  sort_order: number;
  source: "osm" | "locationiq" | "manual";
}

export interface Narration {
  id: string;
  project_id: string;
  text: string;
  tone: "corporate" | "investment" | "social" | "short" | "premium";
  voice_type: "female" | "male" | "corporate";
  audio_url: string | null;
  duration: number | null;
}

export interface Video {
  id: string;
  project_id: string;
  user_id: string;
  video_url: string | null;
  thumbnail_url: string | null;
  format: "reels" | "landscape";
  duration: number;
  status: "preparing" | "audio_creating" | "rendering" | "finalizing" | "completed" | "error";
  render_error: string | null;
  created_at: string;
}

export interface Credit {
  id: string;
  user_id: string;
  amount: number;
  source: "purchase" | "bonus" | "refund";
  payment_id: string | null;
  created_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  videos: number;
  price: number;
  price_id: string;
}

export type CameraMode = "orbit_360" | "spiral_descent" | "top_view" | "low_fly" | "four_corners";
export type VideoTone = "corporate" | "investment" | "social" | "short" | "premium";
export type VoiceType = "female" | "male" | "corporate";