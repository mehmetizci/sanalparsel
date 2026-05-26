"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Feature, Polygon, MultiPolygon } from "geojson";

export interface ParcelMetadata {
  Il?: string;
  Ilce?: string;
  Mahalle?: string;
  Mevkii?: string;
  Ada?: string;
  ParselNo?: string;
  Alan?: string;
  Nitelik?: string;
}

export interface ParcelBounds {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface ParcelCenter {
  lat: number;
  lon: number;
}

export interface ParcelCoordinates {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

// Drone settings types
export type CameraSequenceMode = "orbit360" | "spiralDescend" | "topView" | "lowPass" | "fourCorners";
export type CameraFeel = "soft" | "cinematic" | "dynamic";

export interface DroneSettingsState {
  duration: 30 | 45 | 60;
  startHeight: 100 | 200 | 300 | 400;
  cameraFeel: CameraFeel;
  cameraModes: CameraSequenceMode[];
}

export interface CameraSequenceStep {
  mode: CameraSequenceMode;
  duration: number;
  startHeight: number;
  endHeight: number;
  pitch: number;
  bearingFrom: number;
  bearingTo: number;
  easing: CameraFeel;
}

export interface CameraSequence {
  steps: CameraSequenceStep[];
  totalDuration: number;
}

// Video settings types
export type VideoResolution = "1080x1920" | "720x1280";
export type ListingType = "sale" | "investment";

export interface VideoOverlaySettings {
  consultantName: boolean;
  phone: boolean;
  logo: boolean;
  profilePhoto: boolean;
  parcelInfo: boolean;
  nearbyPlaces: boolean;
  subtitles: boolean;
}

export interface VideoSettingsState {
  resolution: VideoResolution;
  width: number;
  height: number;
  listingType: ListingType;
  overlays: VideoOverlaySettings;
}

// Enhanced POI types with OSM metadata
export interface POI {
  id: string;
  osmId?: number;
  osmType?: string;
  category: string;
  label: string;
  name: string;
  distanceMeters: number;
  distanceText: string;
  lat: number;
  lng: number;
  selected: boolean;
  source?: "overpass" | "nominatim" | "fallback";
}

// Legacy support - convert old format to new
export function convertToNewPOI(old: { id: string; type: string; name: string; distance: number; distanceText: string; lat: number; lng: number; selected: boolean }): POI {
  return {
    id: old.id,
    category: old.type,
    label: old.type,
    name: old.name,
    distanceMeters: old.distance,
    distanceText: old.distanceText,
    lat: old.lat,
    lng: old.lng,
    selected: old.selected,
  };
}

// Helper to convert string coordinates to numbers
function normalizeCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

// Helper to get all coordinates from a geometry (flatten nested arrays)
function extractCoordinates(coords: unknown): [number, number][] {
  const result: [number, number][] = [];
  
  if (!Array.isArray(coords)) return result;
  
  const processCoord = (c: unknown) => {
    if (Array.isArray(c) && c.length >= 2) {
      const lon = normalizeCoord(c[0]);
      const lat = normalizeCoord(c[1]);
      if (lon !== null && lat !== null) {
        result.push([lon, lat]);
      }
    }
  };
  
  // Handle Polygon: coords is number[][][]
  if (Array.isArray(coords) && Array.isArray(coords[0])) {
    // Check if it's a ring (just coords) or multiple rings
    if (Array.isArray(coords[0]) && !Array.isArray(coords[0][0])) {
      // It's a single ring: number[][]
      processCoord(coords);
    } else {
      // It's multiple rings: number[][][]
      for (const ring of coords) {
        if (Array.isArray(ring)) {
          for (const point of ring) {
            processCoord(point);
          }
        }
      }
    }
  }
  
  return result;
}

// Helper to validate coordinates are in valid range
function isValidCoordinate(lon: number, lat: number): boolean {
  return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
}

// Helper to compute bounds from coordinates
function computeBoundsFromCoords(coords: [number, number][]): { minLon: number; minLat: number; maxLon: number; maxLat: number } | null {
  if (!coords.length) return null;

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  
  for (const [lon, lat] of coords) {
    if (isValidCoordinate(lon, lat)) {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    }
  }

  if (!Number.isFinite(minLon)) return null;
  return { minLon, minLat, maxLon, maxLat };
}

// Helper to compute center from coordinates
function computeCenterFromCoords(coords: [number, number][]): { lat: number; lon: number } | null {
  const bounds = computeBoundsFromCoords(coords);
  if (!bounds) return null;
  
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lon: (bounds.minLon + bounds.maxLon) / 2,
  };
}

export interface ParcelState {
  // GeoJSON data
  uploadedGeoJson: Feature<Polygon | MultiPolygon> | null;
  
  // Parcel metadata
  parcelMetadata: ParcelMetadata | null;
  
  // Calculated bounds and center
  parcelBounds: ParcelBounds | null;
  parcelCenter: ParcelCenter | null;
  
  // Raw coordinates for rendering
  parcelCoordinates: ParcelCoordinates | null;
  
  // Track if data came from upload or demo
  source: "upload" | "demo" | "database" | null;

  // POI data (environment items) - enhanced with OSM metadata
  pois: POI[];
  
  // Nearby places persistence
  nearbyParcelKey: string | null;
  nearbyLastFetchedAt: number | null;
  selectedNearbyPlaceIds: string[];
  
  // Drone settings state
  droneSettings: DroneSettingsState;
  cameraSequence: CameraSequence | null;
  
  // Video settings state
  videoSettings: VideoSettingsState;
  
  // Actions
  setParcelData: (data: {
    geoJson?: Feature<Polygon | MultiPolygon>;
    metadata?: ParcelMetadata;
    bounds?: ParcelBounds;
    center?: ParcelCenter;
    source?: "upload" | "demo" | "database";
  }) => void;
  
  // Set from raw parsed data (from new project page)
  setFromParsed: (data: {
    geoJson: Feature<Polygon | MultiPolygon>;
    metadata: ParcelMetadata;
  }) => void;
  
  clearParcelData: () => void;
  
  // Initialize from existing project data (from database)
  initFromProject: (project: {
    geojson?: Feature<Polygon | MultiPolygon>;
    properties?: ParcelMetadata;
    center_lat?: number;
    center_lon?: number;
  }) => void;
  
  // POI actions
  setPois: (pois: POI[]) => void;
  togglePoi: (poiId: string) => void;
  clearPois: () => void;
  
  // Update POIs from API with full metadata
  updatePoisFromApi: (pois: POI[], parcelKey: string) => void;
  
  // Persist selected POIs
  setSelectedPoiIds: (ids: string[]) => void;
  
  // Drone settings actions
  setDroneSettings: (settings: Partial<DroneSettingsState>) => void;
  setCameraSequence: (sequence: CameraSequence | null) => void;
  setVideoSettings: (settings: Partial<VideoSettingsState> | ((prev: VideoSettingsState) => VideoSettingsState)) => void;
  clearDroneSettings: () => void;
}

export const useParcelStore = create<ParcelState>()(
  persist(
    (set) => ({
      uploadedGeoJson: null,
      parcelMetadata: null,
      parcelBounds: null,
      parcelCenter: null,
      parcelCoordinates: null,
      pois: [],
      source: null,
      // New POI persistence fields
      nearbyParcelKey: null,
      nearbyLastFetchedAt: null,
      selectedNearbyPlaceIds: [],
      // Drone settings
      droneSettings: {
        duration: 30,
        startHeight: 300,
        cameraFeel: "cinematic",
        cameraModes: ["orbit360", "spiralDescend"],
      },
      cameraSequence: null,
      // Video settings
      videoSettings: {
        resolution: "1080x1920",
        width: 1080,
        height: 1920,
        listingType: "sale",
        overlays: {
          consultantName: true,
          phone: true,
          logo: true,
          profilePhoto: false,
          parcelInfo: true,
          nearbyPlaces: true,
          subtitles: true,
        },
      },

      setParcelData: (data) => set((state) => {
        const updates: Partial<ParcelState> = {
          source: data.source || state.source,
        };

        if (data.geoJson !== undefined) {
          updates.uploadedGeoJson = data.geoJson;
          
          // Auto-compute bounds and center from geometry
          if (data.geoJson?.geometry) {
            const coords = extractCoordinates(data.geoJson.geometry.coordinates);
            updates.parcelCoordinates = data.geoJson.geometry as ParcelCoordinates;
            
            if (coords.length > 0) {
              updates.parcelBounds = computeBoundsFromCoords(coords) as ParcelBounds;
              updates.parcelCenter = computeCenterFromCoords(coords);
            }
          }
        }

        if (data.metadata !== undefined) {
          updates.parcelMetadata = data.metadata;
        }

        if (data.bounds !== undefined) {
          updates.parcelBounds = data.bounds;
        }

        if (data.center !== undefined) {
          updates.parcelCenter = data.center;
        }

        return updates;
      }),

      setFromParsed: (data) => {
        const coords = extractCoordinates(data.geoJson.geometry.coordinates);
        
        set({
          uploadedGeoJson: data.geoJson,
          parcelMetadata: data.metadata,
          parcelCoordinates: data.geoJson.geometry as ParcelCoordinates,
          parcelBounds: coords.length > 0 ? computeBoundsFromCoords(coords) as ParcelBounds : null,
          parcelCenter: coords.length > 0 ? computeCenterFromCoords(coords) : null,
          source: "upload",
        });
      },

      clearParcelData: () => set({
        uploadedGeoJson: null,
        parcelMetadata: null,
        parcelBounds: null,
        parcelCenter: null,
        parcelCoordinates: null,
        pois: [],
        source: null,
      }),

      initFromProject: (project) => {
        const updates: Partial<ParcelState> = {
          source: "database",
          parcelMetadata: project.properties || null,
        };

        if (project.geojson) {
          updates.uploadedGeoJson = project.geojson;
          updates.parcelCoordinates = project.geojson.geometry as ParcelCoordinates;
          
          const coords = extractCoordinates(project.geojson.geometry.coordinates);
          if (coords.length > 0) {
            updates.parcelBounds = computeBoundsFromCoords(coords) as ParcelBounds;
            updates.parcelCenter = computeCenterFromCoords(coords);
          }
        } else if (project.center_lat && project.center_lon) {
          updates.parcelCenter = {
            lat: project.center_lat,
            lon: project.center_lon,
          };
        }

        set(updates);
      },

      // POI actions
      setPois: (pois) => set({ pois }),
      
      togglePoi: (poiId) => set((state) => ({
        pois: state.pois.map(poi => 
          poi.id === poiId ? { ...poi, selected: !poi.selected } : poi
        ),
      })),
      
      clearPois: () => set({ pois: [] }),
      
      // Update POIs from API with parcel key
      updatePoisFromApi: (pois, parcelKey) => set((state) => {
        // Restore selected state from previous selections
        const updatedPois = pois.map(poi => ({
          ...poi,
          selected: state.selectedNearbyPlaceIds.includes(poi.id),
        }));
        
        return {
          pois: updatedPois,
          nearbyParcelKey: parcelKey,
          nearbyLastFetchedAt: Date.now(),
        };
      }),
      
      // Set selected POI IDs
      setSelectedPoiIds: (ids) => set({ selectedNearbyPlaceIds: ids }),
      
      // Drone settings actions
      setDroneSettings: (settings) => set((state) => ({
        droneSettings: { ...state.droneSettings, ...settings },
      })),
      setCameraSequence: (sequence) => set({ cameraSequence: sequence }),
      // Set video settings (supports both direct value and updater function)
      setVideoSettings: (settings) => set((state) => {
        if (typeof settings === 'function') {
          return { videoSettings: settings(state.videoSettings) };
        }
        return { videoSettings: { ...state.videoSettings, ...settings } };
      }),
      clearDroneSettings: () => set({
        droneSettings: {
          duration: 30,
          startHeight: 300,
          cameraFeel: "cinematic",
          cameraModes: ["orbit360", "spiralDescend"],
        },
        cameraSequence: null,
      }),
    }),
    {
      name: "sanalparsel-parcel", // localStorage key
      partialize: (state) => ({
        uploadedGeoJson: state.uploadedGeoJson,
        parcelMetadata: state.parcelMetadata,
        parcelBounds: state.parcelBounds,
        parcelCenter: state.parcelCenter,
        parcelCoordinates: state.parcelCoordinates,
        pois: state.pois,
        source: state.source,
        // Persist POI data across pages
        nearbyParcelKey: state.nearbyParcelKey,
        nearbyLastFetchedAt: state.nearbyLastFetchedAt,
        selectedNearbyPlaceIds: state.selectedNearbyPlaceIds,
        // Persist drone settings
        droneSettings: state.droneSettings,
        cameraSequence: state.cameraSequence,
        // Persist video settings
        videoSettings: state.videoSettings,
      }),
    }
  )
);