export interface ConsultantProfile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  officeAddress: string;
  officeName: string;
  certificateNumber: string;
  companyLogoUrl?: string;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParcelData {
  id: string;
  userId: string;
  name: string;
  description?: string;
  geojson: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  area?: number;
  createdAt: string;
}

export interface NearbyPlace {
  name: string;
  type: string;
  distance: number;
  unit: string;
  icon: string;
}

export interface DroneSettings {
  altitude: 100 | 200 | 300 | 500;
  duration: 30 | 45 | 60;
  resolution: { width: number; height: number; label: string; aspectRatio: string };
  cameraAngles: CameraAngle[];
}

export interface CameraAngle {
  name: string;
  heading: number;
  pitch: number;
  altitude: number;
  duration: number;
}

export interface VideoProject {
  id: string;
  userId: string;
  parcelId: string;
  parcelData: ParcelData;
  consultantProfile: ConsultantProfile;
  droneSettings: DroneSettings;
  nearbyPlaces: NearbyPlace[];
  narrationText?: string;
  customDescription?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserCredits {
  total: number;
  used: number;
  remaining: number;
}
