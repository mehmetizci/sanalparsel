import { ParcelGeoJson, ParcelProperties } from "@/types";

export function parseParcelGeoJson(geoJsonData: unknown): ParcelGeoJson | null {
  try {
    const data = geoJsonData as {
      type?: string;
      features?: unknown[];
      geometry?: unknown;
      properties?: unknown;
    };

    // Handle FeatureCollection
    if (data.type === "FeatureCollection" && Array.isArray(data.features) && data.features.length > 0) {
      const firstFeature = data.features[0] as {
        type?: string;
        geometry?: unknown;
        properties?: unknown;
      };
      if (firstFeature.type === "Feature") {
        return {
          type: "Feature",
          properties: firstFeature.properties || {},
          geometry: firstFeature.geometry as { type: "Polygon"; coordinates: number[][][] },
        };
      }
    }

    // Handle single Feature
    if (data.type === "Feature") {
      return {
        type: "Feature",
        properties: data.properties || {},
        geometry: data.geometry as { type: "Polygon"; coordinates: number[][][] },
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function extractParcelProperties(geoJson: ParcelGeoJson): ParcelProperties {
  return geoJson.properties || {};
}

export function generateProjectName(properties: ParcelProperties): string {
  const parts: string[] = [];
  
  if (properties.Il) parts.push(properties.Il);
  if (properties.Ilce) parts.push(properties.Ilce);
  if (properties.Mahalle) parts.push(properties.Mahalle);
  if (properties.Ada) parts.push(`${properties.Ada} Ada`);
  if (properties.ParselNo) parts.push(`${properties.ParselNo} Parsel`);

  return parts.length > 0 ? parts.join(" ") : "Yeni Proje";
}

export function generateShortProjectName(properties: ParcelProperties): string {
  const parts: string[] = [];
  
  if (properties.Mahalle) parts.push(properties.Mahalle);
  if (properties.Ada && properties.ParselNo) {
    parts.push(`${properties.Ada}/${properties.ParselNo} Parsel`);
  } else if (properties.ParselNo) {
    parts.push(`${properties.ParselNo} Parsel`);
  }

  return parts.length > 0 ? parts.join(" ") : "Yeni Proje";
}

export function getParcelCenter(geoJson: ParcelGeoJson): { lat: number; lon: number } | null {
  try {
    // Handle both Polygon and MultiPolygon
    const polygonCoords = geoJson.geometry?.type === "MultiPolygon" 
      ? geoJson.geometry.coordinates[0] 
      : geoJson.geometry?.coordinates[0];
    
    if (!polygonCoords || polygonCoords.length === 0) return null;

    let totalLat = 0;
    let totalLon = 0;
    let count = 0;

    for (const ring of polygonCoords) {
      if (Array.isArray(ring)) {
        for (const coord of ring) {
          if (Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number') {
            totalLon += coord[0] as number;
            totalLat += coord[1] as number;
            count++;
          }
        }
      }
    }

    if (count === 0) return null;

    return {
      lat: totalLat / count,
      lon: totalLon / count,
    };
  } catch {
    return null;
  }
}

export function formatArea(area: string | undefined | null): string {
  if (!area) return "Alan bilgisi bulunamadı";
  
  const trimmed = String(area).trim();
  
  // Check for empty or zero values
  if (!trimmed || trimmed === "0" || trimmed === "0.00" || trimmed === "0,00") {
    return "Alan bilgisi bulunamadı";
  }
  
  // Parse Turkish number format
  let numArea: number;
  
  if (trimmed.includes(".") && trimmed.includes(",")) {
    // Turkish format: "4.207,00" => 4207
    numArea = parseFloat(trimmed.replace(/\./g, "").replace(",", "."));
  } else if (trimmed.includes(",") && !trimmed.includes(".")) {
    const parts = trimmed.split(",");
    if (parts.length === 2 && parts[0].length <= 3) {
      // Likely Turkish: "1234,56" => 1234.56
      numArea = parseFloat(trimmed.replace(",", "."));
    } else {
      // Likely thousands separator: "1,234" => 1234
      numArea = parseFloat(trimmed.replace(/,/g, ""));
    }
  } else {
    numArea = parseFloat(trimmed);
  }
  
  if (isNaN(numArea) || numArea <= 0) {
    return "Alan bilgisi bulunamadı";
  }
  
  return numArea.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " m²";
}

export function validateGeoJsonFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        const geoJson = parseParcelGeoJson(data);
        resolve(geoJson !== null);
      } catch {
        resolve(false);
      }
    };
    reader.onerror = () => resolve(false);
    reader.readAsText(file);
  });
}