/**
 * TKGM CBS API Service
 * Modüler yapı - ileride koordinat sorgusu ve çoklu parsel desteği eklenebilir
 */

const TKGM_API_BASE = "https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api";

// Types for TKGM API responses
export interface TKGMIl {
  id: number;
  name: string;
  properties?: Record<string, unknown>;
}

export interface TKGMIlce {
  id: number;
  name: string;
  mahalleKodu?: number;
  properties?: Record<string, unknown>;
}

export interface TKGMMahalle {
  id: number;
  name: string;
  properties?: Record<string, unknown>;
}

export interface TKGMParcel {
  adaNo: number;
  parselNo: number;
  alan: number;
  nitelik: string;
  pafta: string;
  ilAd: string;
  ilceAd: string;
  mahalleAd: string;
  mahalleKodu?: number;
  geometri: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  merkezNokta: {
    lat: number;
    lng: number;
  };
  koordinatlar: Array<{ lat: number; lng: number }>;
}

export interface TKGMQueryResult {
  success: boolean;
  parcel?: {
    adaNo: number;
    parselNo: number;
    alan: string;
    nitelik: string;
    pafta: string;
    il: string;
    ilce: string;
    mahalle: string;
    geometri: GeoJSON.Polygon | null;
    center: { lat: number; lng: number };
  };
  error?: string;
  code?: string;
}

// Error class for TKGM service
export class TKGMServiceError extends Error {
  constructor(
    message: string,
    public code: string = "TKGM_ERROR",
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "TKGMServiceError";
  }
}

// Cache for province/district/neighborhood lists
const ilCache = new Map<string, { data: TKGMIl[]; timestamp: number }>();
const ilceCache = new Map<string, { data: TKGMIlce[]; timestamp: number }>();
const mahalleCache = new Map<string, { data: TKGMMahalle[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// Helper to parse GeoJSON FeatureCollection
function parseFeatureCollection(data: unknown, type: string): Array<{ id: number; name: string }> {
  const result: Array<{ id: number; name: string }> = [];
  
  if (!data || typeof data !== "object") return result;
  
  const d = data as Record<string, unknown>;
  
  if (d.type === "FeatureCollection" && Array.isArray(d.features)) {
    for (const feature of d.features) {
      if (!feature || typeof feature !== "object") continue;
      const f = feature as Record<string, unknown>;
      if (f.type !== "Feature") continue;
      
      const props = f.properties as Record<string, unknown> | null;
      if (!props) continue;
      
      const id = type === "mahalle" 
        ? Number(props.mahalleId || props.id || 0)
        : Number(props.id || 0);
      
      const name = String(
        props.name || 
        props.adi || 
        props.mahalleAd || 
        props.ilceAd || 
        props.ilAd || 
        ""
      ).trim();
      
      if (id && name) {
        result.push({ id, name });
      }
    }
  }
  
  return result;
}

// Fetch from TKGM API via backend proxy
async function tkgmFetch(endpoint: string): Promise<unknown> {
  const response = await fetch(`/api/tkgm/proxy?endpoint=${encodeURIComponent(endpoint)}`, {
    method: "GET",
    signal: AbortSignal.timeout(15000),
  });
  
  if (!response.ok) {
    // Log if needed
    throw new TKGMServiceError(
      `TKGM API error: ${response.status}`,
      "TKGM_API_ERROR",
      response.status
    );
  }
  
  return response.json();
}

// Public API: Get all provinces (iller)
export async function getIller(): Promise<TKGMIl[]> {
  const cacheKey = "iller";
  const cached = ilCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const data = await tkgmFetch(`${TKGM_API_BASE}/idariYapi/ilListe`);
    const parsed = parseFeatureCollection(data, "il");
    const result: TKGMIl[] = parsed.map(p => ({ id: p.id, name: p.name }));
    
    ilCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error("[TKGMService] Error fetching iller:", err);
    throw new TKGMServiceError(
      "İl listesi alınamadı",
      "FETCH_IL_ERROR",
      500
    );
  }
}

// Public API: Get districts (ilçeler) for a province
export async function getIlceler(ilKodu: number): Promise<TKGMIlce[]> {
  const cacheKey = `ilce_${ilKodu}`;
  const cached = ilceCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const data = await tkgmFetch(`${TKGM_API_BASE}/idariYapi/ilceListe/${ilKodu}`);
    const parsed = parseFeatureCollection(data, "ilce");
    const result: TKGMIlce[] = parsed.map(p => ({ 
      id: p.id, 
      name: p.name,
      mahalleKodu: p.id, // ilce code can be used for mahalle lookup
    }));
    
    ilceCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error("[TKGMService] Error fetching ilçeler:", err);
    throw new TKGMServiceError(
      "İlçe listesi alınamadı",
      "FETCH_ILCE_ERROR",
      500
    );
  }
}

// Public API: Get neighborhoods (mahalleler) for a district
export async function getMahalleler(ilceKodu: number): Promise<TKGMMahalle[]> {
  const cacheKey = `mahalle_${ilceKodu}`;
  const cached = mahalleCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const data = await tkgmFetch(`${TKGM_API_BASE}/idariYapi/mahalleListe/${ilceKodu}`);
    const parsed = parseFeatureCollection(data, "mahalle");
    const result: TKGMMahalle[] = parsed.map(p => ({ 
      id: p.id as number, 
      name: p.name,
    }));
    
    mahalleCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error("[TKGMService] Error fetching mahalleler:", err);
    throw new TKGMServiceError(
      "Mahalle listesi alınamadı",
      "FETCH_MAHALLE_ERROR",
      500
    );
  }
}

// Public API: Query parcel by ada/parsel
export async function queryParcel(
  mahalleKodu: number,
  adaNo: number,
  parselNo: number
): Promise<TKGMQueryResult> {
  try {
    const data = await tkgmFetch(
      `${TKGM_API_BASE}/parsel/${mahalleKodu}/${adaNo}/${parselNo}`
    );
    
    if (!data || typeof data !== "object") {
      return { success: false, error: "Geçersiz API yanıtı", code: "INVALID_RESPONSE" };
    }
    
    const d = data as Record<string, unknown>;
    
    if (d.Message) {
      return { success: false, error: String(d.Message), code: "API_MESSAGE" };
    }
    
    if (d.type !== "Feature") {
      return { success: false, error: "Parsel bulunamadı", code: "NOT_FOUND" };
    }
    
    const props = (d.properties || {}) as Record<string, unknown>;
    const geom = (d.geometry || {}) as Record<string, unknown>;
    
    // Calculate center from polygon
    let centerLat = 0, centerLng = 0;
    const coords: Array<{ lat: number; lng: number }> = [];
    
    if (geom.type === "Polygon" && Array.isArray(geom.coordinates)) {
      const ring = geom.coordinates[0] as number[][];
      if (ring && ring.length > 0) {
        let sumLat = 0, sumLng = 0;
        for (const c of ring) {
          sumLng += c[0];
          sumLat += c[1];
          coords.push({ lat: c[1], lng: c[0] });
        }
        centerLat = sumLat / ring.length;
        centerLng = sumLng / ring.length;
      }
    }
    
    // Parse area
    const alanStr = String(props.alan || "0");
    const alan = parseFloat(alanStr.replace(/\./g, "").replace(",", ".")) || 0;
    
    return {
      success: true,
      parcel: {
        adaNo: Number(props.adaNo || adaNo),
        parselNo: Number(props.parselNo || parselNo),
        alan: alan.toFixed(0),
        nitelik: String(props.nitelik || ""),
        pafta: String(props.pafta || ""),
        il: String(props.ilAd || ""),
        ilce: String(props.ilceAd || ""),
        mahalle: String(props.mahalleAd || ""),
        geometri: {
          type: "Polygon",
          coordinates: geom.coordinates as number[][][],
        },
        center: { lat: centerLat, lng: centerLng },
      },
    };
  } catch (err) {
    console.error("[TKGMService] Error querying parcel:", err);
    
    if (err instanceof TKGMServiceError) {
      return { success: false, error: err.message, code: err.code };
    }
    
    return { 
      success: false, 
      error: "Parsel sorgulanamadı", 
      code: "QUERY_ERROR" 
    };
  }
}

// Clear all caches (for testing/debugging)
export function clearTKGMCache(): void {
  ilCache.clear();
  ilceCache.clear();
  mahalleCache.clear();
}
