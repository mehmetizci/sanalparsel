export interface Project {
  id: string
  user_id: string
  name: string
  geojson_data: GeoJSONData
  drone_settings: DroneSettings
  branding: BrandingOptions
  narration_text?: string
  audio_url?: string
  video_url?: string
  status: 'draft' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface GeoJSONData {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: Record<string, unknown>
    geometry: {
      type: string
      coordinates: number[] | number[][] | number[][][]
    }
  }>
}

export interface DroneSettings {
  altitude: 100 | 200 | 300 | 500
  duration: 30 | 45 | 60
  cameraAngle: 'northeast' | 'southwest' | 'topdown' | 'lowaltitude'
  flyoverPath: boolean
}

export interface BrandingOptions {
  showProfilePhoto: boolean
  showFullName: boolean
  showPhoneNumber: boolean
  showLogo: boolean
  showLicenseNumber: boolean
}

export const defaultBrandingOptions: BrandingOptions = {
  showProfilePhoto: true,
  showFullName: true,
  showPhoneNumber: true,
  showLogo: false,
  showLicenseNumber: false,
}

export interface NearbyPlace {
  name: string
  type: 'hospital' | 'school' | 'market' | 'highway' | 'beach' | 'mall' | 'center'
  distance: string
  coordinates: [number, number]
}

export interface ConsultantInfo {
  profilePhoto?: string
  fullName: string
  phoneNumber: string
  licenseNumber?: string
  companyName?: string
}

export interface VideoRenderResult {
  success: boolean
  videoUrl?: string
  error?: string
}