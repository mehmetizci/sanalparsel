/**
 * POI Service - Real environment data from OpenStreetMap Overpass API
 */

export interface POI {
  id: string;
  type: POIType;
  name: string;
  distance: number; // in meters
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

// POI type configurations for Overpass queries
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

/**
 * Map OSM amenity type to our POI type
 */
function mapOsmTypeToPoiType(amenityKey: string, amenityValue: string): POIType {
  const mapping: Record<string, POIType> = {
    "hospital": "hospital",
    "school": "school",
    "university": "university",
    "supermarket": "market",
    "pharmacy": "pharmacy",
    "station": "transport",
    "park": "park",
    "bank": "bank",
    "place_of_worship": "mosque",
    "primary": "highway",
  };
  return mapping[amenityValue] || "market";
}

/**
 * Build Overpass query for nearby POIs
 */
function buildOverpassQuery(lat: number, lng: number, radius: number = 3000): string {
  const configs = POI_CONFIGS.map(c => {
    if (c.type === "highway") {
      return `way["${c.amenityKey}"="${c.amenityValue}"](around:${radius},${lat},${lng});`;
    }
    return `node["${c.amenityKey}"="${c.amenityValue}"](around:${radius},${lat},${lng});`;
  }).join("\n");

  return `[out:json][timeout:25][maxsize:1073741824];
(
${configs}
);
out center;`;
}

/**
 * Cache key for POI data
 */
function getCacheKey(lat: number, lng: number): string {
  // Round to ~100m precision
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  return `poi_${roundedLat}_${roundedLng}`;
}

// In-memory cache
const poiCache = new Map<string, { data: POI[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Fetch POIs from Overpass API with caching
 */
export async function fetchNearbyPOIs(
  lat: number, 
  lng: number, 
  radius: number = 3000,
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

  const query = buildOverpassQuery(lat, lng, radius);
  
  try {
    console.log("[POI Service] Fetching POIs from Overpass API...");
    
    const response = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    const elements = data.elements || [];

    console.log(`[POI Service] Found ${elements.length} POIs`);

    // Process and deduplicate POIs
    const poisByType = new Map<POIType, POI[]>();
    
    for (const element of elements) {
      let elLat = element.lat;
      let elLon = element.lon;
      
      // For ways, use the center coordinates
      if (element.type === "way" && element.center) {
        elLat = element.center.lat;
        elLon = element.center.lon;
      }
      
      if (!elLat || !elLon) continue;
      
      const tags = element.tags || {};
      const amenityKey = tags.amenity || tags.shop || tags.leisure || tags.highway || "";
      const amenityValue = amenityKey;
      
      const poiType = mapOsmTypeToPoiType(amenityKey, amenityValue);
      const config = POI_CONFIGS.find(c => c.type === poiType);
      
      if (!config) continue;
      
      const distance = haversineDistance(lat, lng, elLat, elLon);
      const name = tags.name || 
                   tags["name:tr"] || 
                   tags.short_name || 
                   `${config.label} ${tags.ref || ""}`.trim() ||
                   config.fallbackName;
      
      const poi: POI = {
        id: `poi_${element.id}`,
        type: poiType,
        name: name || config.fallbackName,
        distance,
        distanceText: formatDistance(distance),
        lat: elLat,
        lng: elLon,
        selected: false,
      };
      
      // Keep only the closest POI for each type
      const existing = poisByType.get(poiType);
      if (!existing || poi.distance < existing[0].distance) {
        poisByType.set(poiType, [poi]);
      }
    }

    // Convert to array and sort by distance
    const pois = Array.from(poisByType.values())
      .flat()
      .sort((a, b) => a.distance - b.distance);

    // Auto-select the closest ones (up to 5)
    pois.slice(0, 5).forEach(poi => poi.selected = true);

    // Cache the result
    poiCache.set(cacheKey, { data: pois, timestamp: Date.now() });

    console.log(`[POI Service] Processed ${pois.length} unique POIs`);
    return pois;

  } catch (error) {
    console.error("[POI Service] Error fetching POIs:", error);
    throw error;
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