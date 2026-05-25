import { NextRequest, NextResponse } from "next/server";

// Enhanced POI types with OSM metadata
interface POI {
  id: string;
  osmId: number;
  osmType: string;
  category: string;
  label: string;
  name: string;
  distanceMeters: number;
  distanceText: string;
  lat: number;
  lng: number;
  selected: boolean;
}

// Optimized POI categories
const POI_CATEGORIES = [
  { key: "hospital", amenity: "hospital", label: "Hastane", fallbackName: "Hastane" },
  { key: "school", amenity: "school", label: "Okul", fallbackName: "Okul" },
  { key: "pharmacy", amenity: "pharmacy", label: "Eczane", fallbackName: "Eczane" },
  { key: "market", shop: "supermarket", label: "Market", fallbackName: "Market" },
];

// Overpass endpoints - sequential fallback
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// In-memory cache
const cache = new Map<string, { data: POI[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24;

function getCacheKey(lat: number, lng: number): string {
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  return `poi_${roundedLat}_${roundedLng}`;
}

function getFromCache(key: string): POI[] | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: POI[]): void {
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value as string | undefined;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// Get best name from OSM tags - priority: name:tr > official_name > name > brand > operator
function getBestName(tags: Record<string, string>, fallbackName: string): string {
  if (tags["name:tr"] && tags["name:tr"].length > 2) return tags["name:tr"];
  if (tags.official_name && tags.official_name.length > 2) return tags.official_name;
  if (tags.name && tags.name.length > 2) return tags.name;
  if (tags.brand && tags.brand.length > 2) return tags.brand;
  if (tags.operator && tags.operator.length > 2) return tags.operator;
  return fallbackName;
}

// Build single combined query - optimized for speed
function buildCombinedQuery(lat: number, lng: number, radius: number): string {
  // Simplified query - fewer elements, faster execution
  return `[out:json][timeout:25];
(
  node(around:${radius},${lat},${lng})["amenity"="hospital"];
  node(around:${radius},${lat},${lng})["amenity"="school"];
  node(around:${radius},${lat},${lng})["amenity"="pharmacy"];
  node(around:${radius},${lat},${lng})["shop"="supermarket"];
);
out body 20;`;
}

// Haversine distance
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}


// Fetch from Overpass with proper formatting
async function fetchFromOverpass(
  endpoint: string,
  query: string
): Promise<{ elements: unknown[]; error?: string }> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "SanalParsel/1.0 (contact: mehmetizcix@gmail.com)",
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(15000),
    });

    const text = await response.text();

    if (response.status === 406) {
      return { elements: [], error: `Server returned 406: ${text.substring(0, 200)}` };
    }

    if (response.status === 429) {
      return { elements: [], error: "Rate limit exceeded" };
    }

    if (!response.ok) {
      return { elements: [], error: `HTTP ${response.status}: ${text.substring(0, 200)}` };
    }

    const data = JSON.parse(text);
    return { elements: data.elements || [] };
  } catch (err) {
    const error = err as Error;
    return { elements: [], error: error.message };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  
  if (!lat || !lng) {
    return NextResponse.json({ error: "Koordinat gerekli", code: "MISSING_COORDS" }, { status: 400 });
  }
  
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  
  if (isNaN(latNum) || isNaN(lngNum)) {
    return NextResponse.json({ error: "Geçersiz koordinat", code: "INVALID_COORDS" }, { status: 400 });
  }
  
  // Check cache first
  const cacheKey = getCacheKey(latNum, lngNum);
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log("[NearbyPlaces] Using cached data for", latNum, lngNum);
    return NextResponse.json({ 
      success: true, 
      pois: cached, 
      count: cached.length, 
      center: { lat: latNum, lng: lngNum }, 
      source: "cache", 
      cached: true,
      parcelKey: cacheKey,
    });
  }
  
  const radius = 1200;
  console.log(`[NearbyPlaces] Fetching POIs for ${latNum}, ${lngNum}, radius: ${radius}m`);
  
  // Build single combined query
  const query = buildCombinedQuery(latNum, lngNum, radius);
  console.log("[NearbyPlaces] Query:", query.replace(/\s+/g, " ").trim());
  
  // Try each endpoint sequentially
  let allElements: unknown[] = [];
  let lastError = "";
  
  for (const endpoint of OVERPASS_ENDPOINTS) {
    console.log(`[NearbyPlaces] Trying endpoint: ${endpoint}`);
    
    const result = await fetchFromOverpass(endpoint, query);
    
    if (result.error) {
      console.log(`[NearbyPlaces] Error from ${endpoint}:`, result.error);
      lastError = result.error;
      continue;
    }
    
    if (result.elements.length > 0) {
      allElements = result.elements;
      console.log(`[NearbyPlaces] Success from ${endpoint}: ${allElements.length} elements`);
      break;
    }
  }
  
  if (allElements.length === 0) {
    console.log("[NearbyPlaces] All endpoints failed. Last error:", lastError);
    return NextResponse.json({
      success: false,
      error: "Gerçek çevre verisi alınamadı",
      details: lastError || "Tüm Overpass sunucuları yanıt vermedi veya rate limit'e takıldı.",
      count: 0,
      pois: [],
      center: { lat: latNum, lng: lngNum },
      source: "error",
      parcelKey: cacheKey,
    });
  }
  
  // Process elements - keep closest POI per category
  const poisByCategory = new Map<string, POI>();
  
  for (const el of allElements as { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[]) {
    const elLat = el.lat || el.center?.lat;
    const elLon = el.lon || el.center?.lon;
    if (!elLat || !elLon) continue;
    
    const tags = el.tags || {};
    const distance = haversineDistance(latNum, lngNum, elLat, elLon);
    
    // Find matching category
    for (const cat of POI_CATEGORIES) {
      const key = cat.amenity || cat.shop || "";
      const value = cat.amenity || cat.shop || "";
      
      if (tags[key] === value || tags[key]?.includes(value)) {
        const poi: POI = {
          id: `${el.type}_${el.id}`,
          osmId: el.id,
          osmType: el.type,
          category: cat.key,
          label: cat.label,
          name: getBestName(tags, cat.fallbackName),
          distanceMeters: Math.round(distance),
          distanceText: formatDistance(distance),
          lat: elLat,
          lng: elLon,
          selected: false,
        };
        
        const existing = poisByCategory.get(cat.key);
        if (!existing || distance < existing.distanceMeters) {
          poisByCategory.set(cat.key, poi);
        }
        break;
      }
    }
  }
  
  const pois = Array.from(poisByCategory.values()).sort((a, b) => a.distanceMeters - b.distanceMeters);
  
  if (pois.length > 0) {
    pois.slice(0, 4).forEach(p => p.selected = true);
    setCache(cacheKey, pois);
    
    console.log(`[NearbyPlaces] Returning ${pois.length} POIs`);
    console.log("[NearbyPlaces] Names:", pois.map(p => `${p.category}: ${p.name}`).join(", "));
    
    return NextResponse.json({
      success: true,
      pois,
      count: pois.length,
      center: { lat: latNum, lng: lngNum },
      source: "overpass",
      parcelKey: cacheKey,
    });
  }
  
  // No matching categories found
  return NextResponse.json({
    success: false,
    error: "Bu bölgede çevre verisi bulunamadı",
    details: "Belirtilen kategorilerde (hastane, okul, eczane, market) hiç sonuç bulunamadı.",
    count: 0,
    pois: [],
    center: { lat: latNum, lng: lngNum },
    source: "empty",
    parcelKey: cacheKey,
  });
}
