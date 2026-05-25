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

export interface ParcelState {
  // GeoJSON data
  uploadedGeoJson: Feature<Polygon | MultiPolygon> | null;
  
  // Parcel metadata
  parcelMetadata: ParcelMetadata | null;
  
  // Calculated bounds and center
  parcelBounds: ParcelBounds | null;
  parcelCenter: ParcelCenter | null;
  
  // Track if data came from upload or demo
  source: "upload" | "demo" | "database" | null;
  
  // Actions
  setParcelData: (data: {
    geoJson?: Feature<Polygon | MultiPolygon>;
    metadata?: ParcelMetadata;
    bounds?: ParcelBounds;
    center?: ParcelCenter;
    source?: "upload" | "demo" | "database";
  }) => void;
  
  clearParcelData: () => void;
  
  // Initialize from existing project data (from database)
  initFromProject: (project: {
    geojson?: Feature<Polygon | MultiPolygon>;
    properties?: ParcelMetadata;
    center_lat?: number;
    center_lon?: number;
  }) => void;
}

// Helper to compute bounds from GeoJSON
function computeBoundsFromGeoJSON(geometry: Polygon | MultiPolygon): ParcelBounds | null {
  const getCoords = (geom: Polygon | MultiPolygon) => {
    if (geom.type === "Polygon") {
      return geom.coordinates[0] || [];
    }
    return (geom.coordinates[0]?.[0] as [number, number][]) || [];
  };

  const coords = getCoords(geometry);
  if (!coords.length) return null;

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  
  for (const coord of coords) {
    if (Array.isArray(coord) && coord.length >= 2) {
      const [lon, lat] = coord;
      if (typeof lon === "number" && typeof lat === "number") {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
      }
    }
  }

  if (!Number.isFinite(minLon)) return null;
  return { minLon, minLat, maxLon, maxLat };
}

// Helper to compute center from GeoJSON
function computeCenterFromGeoJSON(geometry: Polygon | MultiPolygon): ParcelCenter | null {
  const bounds = computeBoundsFromGeoJSON(geometry);
  if (!bounds) return null;
  
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lon: (bounds.minLon + bounds.maxLon) / 2,
  };
}

export const useParcelStore = create<ParcelState>()(
  persist(
    (set) => ({
      uploadedGeoJson: null,
      parcelMetadata: null,
      parcelBounds: null,
      parcelCenter: null,
      source: null,

      setParcelData: (data) => set((state) => {
        const updates: Partial<ParcelState> = {
          source: data.source || state.source,
        };

        if (data.geoJson !== undefined) {
          updates.uploadedGeoJson = data.geoJson;
          
          // Auto-compute bounds and center if not provided
          if (data.geoJson?.geometry && !data.bounds) {
            updates.parcelBounds = computeBoundsFromGeoJSON(data.geoJson.geometry);
            updates.parcelCenter = computeCenterFromGeoJSON(data.geoJson.geometry);
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

      clearParcelData: () => set({
        uploadedGeoJson: null,
        parcelMetadata: null,
        parcelBounds: null,
        parcelCenter: null,
        source: null,
      }),

      initFromProject: (project) => {
        const updates: Partial<ParcelState> = {
          source: "database",
          parcelMetadata: project.properties || null,
        };

        if (project.geojson) {
          updates.uploadedGeoJson = project.geojson;
          updates.parcelBounds = computeBoundsFromGeoJSON(project.geojson.geometry);
          updates.parcelCenter = computeCenterFromGeoJSON(project.geojson.geometry);
        } else if (project.center_lat && project.center_lon) {
          updates.parcelCenter = {
            lat: project.center_lat,
            lon: project.center_lon,
          };
        }

        set(updates);
      },
    }),
    {
      name: "sanalparsel-parcel", // localStorage key
      partialize: (state) => ({
        uploadedGeoJson: state.uploadedGeoJson,
        parcelMetadata: state.parcelMetadata,
        parcelBounds: state.parcelBounds,
        parcelCenter: state.parcelCenter,
        source: state.source,
      }),
    }
  )
);