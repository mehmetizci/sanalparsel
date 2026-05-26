"use client";

import { useState, useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import type { VoiceType } from "./project-config";
import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from "./project-config";

// Mounted guard to prevent SSR/localStorage conflicts
let isMounted = false;
if (typeof window !== "undefined") {
  isMounted = true;
}

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
  
  // Voice settings
  voiceSettings: VoiceSettings;
  cachedAudioBlob: Blob | null;
  cachedAudioUrl: string | null;
  cachedNarrationHash: string | null;
  
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
  
  // Voice settings actions
  setVoiceType: (type: VoiceType) => void;
  setGeneratedAudio: (blob: Blob, duration: number) => void;
  clearGeneratedAudio: () => void;
  invalidateAudioCache: (narrationHash: string) => void;
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
      
      // Voice settings
      voiceSettings: { ...DEFAULT_VOICE_SETTINGS },
      cachedAudioBlob: null,
      cachedAudioUrl: null,
      cachedNarrationHash: null,

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
      
      // Voice settings actions
      setVoiceType: (type) => set((state) => ({
        voiceSettings: {
          ...state.voiceSettings,
          selectedVoice: type,
        },
      })),
      
      setGeneratedAudio: (blob, duration) => set((state) => {
        const url = URL.createObjectURL(blob);
        // Revoke old URL if exists
        if (state.cachedAudioUrl) {
          URL.revokeObjectURL(state.cachedAudioUrl);
        }
        return {
          cachedAudioBlob: blob,
          cachedAudioUrl: url,
          voiceSettings: {
            ...state.voiceSettings,
            generatedAudioBlob: blob,
            generatedAudioUrl: url,
            audioDuration: duration,
          },
        };
      }),
      
      clearGeneratedAudio: () => set((state) => {
        if (state.cachedAudioUrl) {
          URL.revokeObjectURL(state.cachedAudioUrl);
        }
        return {
          cachedAudioBlob: null,
          cachedAudioUrl: null,
          cachedNarrationHash: null,
          voiceSettings: {
            ...state.voiceSettings,
            generatedAudioBlob: null,
            generatedAudioUrl: null,
            audioDuration: 0,
          },
        };
      }),
      
      invalidateAudioCache: (narrationHash) => set((state) => {
        // Only invalidate if the hash is different
        if (state.cachedNarrationHash && state.cachedNarrationHash !== narrationHash) {
          if (state.cachedAudioUrl) {
            URL.revokeObjectURL(state.cachedAudioUrl);
          }
          return {
            cachedAudioBlob: null,
            cachedAudioUrl: null,
            cachedNarrationHash: narrationHash,
            voiceSettings: {
              ...state.voiceSettings,
              generatedAudioBlob: null,
              generatedAudioUrl: null,
              audioDuration: 0,
            },
          };
        }
        return { cachedNarrationHash: narrationHash };
      }),
    }),
    {
      name: "sanalparsel-parcel", // localStorage key
      // Only persist when mounted to prevent SSR conflicts
      skipHydration: true,
      onRehydrateStorage: () => () => {
        // Mark as mounted after rehydration
        isMounted = true;
      },
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
        // Persist voice settings
        voiceSettings: {
          selectedVoice: state.voiceSettings.selectedVoice,
          provider: state.voiceSettings.provider,
          edgeVoice: state.voiceSettings.edgeVoice,
          rate: state.voiceSettings.rate,
          pitch: state.voiceSettings.pitch,
          generatedAudioUrl: null, // Don't persist URL (blob reference invalid)
          generatedAudioBlob: null, // Don't persist blob
          audioDuration: state.voiceSettings.audioDuration,
        },
        cachedNarrationHash: state.cachedNarrationHash,
      }),
    }
  )
);

// Export helper to check if store is ready
export function isParcelStoreMounted(): boolean {
  return isMounted;
}

// Custom hook to safely use parcel store
export function useParcelStoreReady() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return mounted;
}