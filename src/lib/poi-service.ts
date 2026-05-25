/**
 * POI Service - Fetches real environment data via backend proxy
 * Uses backend API route to avoid CORS issues and properly format Overpass queries
 */

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
}

export type POIType = 
  | "hospital" 
  | "school" 
  | "university" 
  | "market" 
  | "pharmacy" 
  | "transport" 
  | "highway" 
  | "park"
  | "bank"
  | "mosque";

export interface POITypeConfig {
  type: POIType;
  label: string;
  amenityKey: string;
  amenityValue: string;
  fallbackName: string;
}

// POI type configurations
const POI_CONFIGS: POITypeConfig[] = [
  { type: "hospital", label: "Hastane", amenityKey: "amenity", amenityValue: "hospital", fallbackName: "Yakındaki Hastane" },
  { type: "school", label: "Okul", amenityKey: "amenity", amenityValue: "school", fallbackName: "Yakındaki Okul" },
  { type: "university", label: "Üniversite", amenityKey: "amenity", amenityValue: "university", fallbackName: "Yakındaki Üniversite" },
  { type: "market", label: "Market", amenityKey: "shop", amenityValue: "supermarket", fallbackName: "Yakındaki Market" },
  { type: "pharmacy", label: "Eczane", amenityKey: "amenity", amenityValue: "pharmacy", fallbackName: "Yakındaki Eczane" },
  { type: "transport", label: "Toplu Taşıma", amenityKey: "railway", amenityValue: "station", fallbackName: "Yakındaki İstasyon" },
  { type: "park", label: "Park", amenityKey: "leisure", amenityValue: "park", fallbackName: "Yakındaki Park" },
  { type: "bank", label: "Banka", amenityKey: "amenity", amenityValue: "bank", fallbackName: "Yakındaki Banka" },
  { type: "mosque", label: "Camii", amenityKey: "amenity", amenityValue: "place_of_worship", fallbackName: "Yakındaki Cami" },
  { type: "highway", label: "Ana Yol", amenityKey: "highway", amenityValue: "primary", fallbackName: "Yakındaki Ana Yol" },
];

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Cache for POI data
const poiCache = new Map<string, { data: POI[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Get cache key for coordinates
 */
function getCacheKey(lat: number, lng: number): string {
  // Round to ~100m precision
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  return `poi_${roundedLat}_${roundedLng}`;
}

/**
 * Custom error class for POI service
 */
export class POIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "POIServiceError";
  }
}

/**
 * Fetch POIs from backend API (which proxies to Overpass)
 * Uses in-memory cache to avoid repeated API calls
 */
export async function fetchNearbyPOIs(
  lat: number, 
  lng: number, 
  
  useCache: boolean = true
): Promise<POI[]> {
  const cacheKey = getCacheKey(lat, lng);
  
  // Check cache
  if (useCache) {
    const cached = poiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[POI Service] Using cached data");
      return cached.data;
    }
  }

  try {
    console.log(`[POI Service] Fetching from backend API: ${lat}, ${lng}`);
    
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
    });
    
    const response = await fetch(`/api/nearby-places?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout for client
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `API error: ${response.status}`;
      const errorCode = errorData.code || "API_ERROR";
      
      console.error("[POI Service] API error:", errorMessage, errorCode);
      throw new POIServiceError(errorMessage, errorCode, response.status);
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error("[POI Service] Invalid response:", data);
      throw new POIServiceError(
        data.message || "Çevre verileri alınamadı",
        "INVALID_RESPONSE",
        500
      );
    }

    const pois = data.pois as POI[];
    const message = data.message;
    
    if (message) {
      console.log(`[POI Service] Message from API: ${message}`);
    }
    
    // Cache the result
    poiCache.set(cacheKey, { data: pois, timestamp: Date.now() });
    
    console.log(`[POI Service] Got ${pois.length} POIs from API, source: ${data.source}`);
    return pois;

  } catch (error) {
    console.error("[POI Service] Error:", error);
    
    if (error instanceof POIServiceError) {
      throw error;
    }
    
    // Handle network errors
    const err = error as Error;
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      throw new POIServiceError(
        "Çevre verileri yoğunluk nedeniyle geç yükleniyor",
        "TIMEOUT",
        408
      );
    }
    
    throw new POIServiceError(
      "Çevre verileri alınamadı. Bağlantınızı kontrol edin.",
      "NETWORK_ERROR",
      500
    );
  }
}

/**
 * Clear POI cache
 */
export function clearPoiCache(): void {
  poiCache.clear();
}

/**
 * Get POI type configuration
 */
export function getPoiTypeConfig(type: POIType): POITypeConfig | undefined {
  return POI_CONFIGS.find(c => c.type === type);
}

/**
 * Get all POI types for UI
 */
export function getAllPoiTypes(): POITypeConfig[] {
  return POI_CONFIGS;
}