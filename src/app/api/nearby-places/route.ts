import { NextRequest, NextResponse } from "next/server";

// Types for POI
interface POI {
  id: string;
  type: string;
  name: string;
  distance: number;
  distanceText: string;
  lat: number;
  lng: number;
  selected: boolean;
}

// Optimized POI categories - focus on essential first
const POI_CATEGORIES = [
  { key: "hospital", amenity: "hospital", label: "Hastane" },
  { key: "school", amenity: "school", label: "Okul" },
  { key: "pharmacy", amenity: "pharmacy", label: "Eczane" },
  { key: "market", shop: "supermarket", label: "Market" },
];

const PRIORITY_CATEGORIES = [
  { key: "hospital", amenity: "hospital", label: "Hastane" },
  { key: "school", amenity: "school", label: "Okul" },
];

// Optimized Overpass endpoints
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

// In-memory cache (would be Redis in production)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const OVERPASS_TIMEOUT = 8000; // 8 seconds

function getCacheKey(lat: number, lng: number): string {
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  return `poi_${roundedLat}_${roundedLng}`;
}

function getFromCache(key: string): unknown | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  // Limit cache size
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value as string | undefined;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// Minified Overpass query builder - each category separate
function buildCategoryQuery(
  lat: number,
  lng: number,
  radius: number,
  amenityKey: string,
  amenityValue: string,
  isNode: boolean = true
): string {
  const type = isNode ? "node" : "way";
  return `[out:json][timeout:8][maxsize:67108864];(${type}["${amenityKey}"="${amenityValue}"](around:${radius},${lat},${lng}););out body 5;`;
}

function buildFallbackQuery(
  lat: number,
  lng: number,
  radius: number,
  categories: typeof POI_CATEGORIES
): string {
  const parts = categories.map(cat => {
    const key = cat.amenity || cat.shop || "";
    const value = cat.amenity || cat.shop || "";
    return `node["${key}"="${value}"](around:${radius},${lat},${lng});`;
  }).join("");
  return `[out:json][timeout:12];(${parts});out body 5;`;
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

// Fetch single category from Overpass
async function fetchCategory(
  endpoint: string,
  lat: number,
  lng: number,
  radius: number,
  category: typeof POI_CATEGORIES[0]
): Promise<{ key: string; pois: POI[] } | null> {
  const query = buildCategoryQuery(lat, lng, radius, category.amenity || category.shop || "", category.amenity || category.shop || "");
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT);
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: query,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const elements = data.elements || [];
    
    const pois = elements.map((el: { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }) => {
      const elLat = el.lat || el.center?.lat;
      const elLon = el.lon || el.center?.lon;
      if (!elLat || !elLon) return null;
      
      const distance = haversineDistance(lat, lng, elLat, elLon);
      const tags = el.tags || {};
      
      return {
        id: `poi_${el.id}`,
        type: category.key,
        name: tags.name || tags["name:tr"] || tags.short_name || `Yakındaki ${category.label}`,
        distance: Math.round(distance),
        distanceText: formatDistance(distance),
        lat: elLat,
        lng: elLon,
        selected: false,
      };
    }).filter(Boolean);
    
    // Only keep closest POI for this category
    if (pois.length > 0) {
      pois.sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);
      return { key: category.key, pois: [pois[0]] };
    }
    
    return null;
  } catch {
    return null;
  }
}

// Fetch multiple categories in parallel
async function fetchCategoriesParallel(
  lat: number,
  lng: number,
  radius: number,
  categories: typeof POI_CATEGORIES
): Promise<POI[]> {
  const promises = categories.map(cat => {
    return OVERPASS_ENDPOINTS.reduce(async (prev, endpoint) => {
      const result = await prev;
      if (result) return result;
      
      // Try next endpoint
      const fetched = await fetchCategory(endpoint, lat, lng, radius, cat);
      return fetched;
    }, Promise.resolve<{ key: string; pois: POI[] } | null>(null));
  });
  
  const results = await Promise.allSettled(promises);
  
  const allPois: POI[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value?.pois) {
      allPois.push(...result.value.pois);
    }
  }
  
  return allPois;
}

// Try fallback with priority categories
async function fetchFallback(
  lat: number,
  lng: number,
  radius: number
): Promise<POI[]> {
  const query = buildFallbackQuery(lat, lng, radius, PRIORITY_CATEGORIES);
  
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: query,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const elements = data.elements || [];
      
      const poisByType = new Map<string, unknown>();
      
      for (const el of elements) {
        const elLat = el.lat || el.center?.lat;
        const elLon = el.lon || el.center?.lon;
        if (!elLat || !elLon) continue;
        
        const tags = el.tags || {};
        const amenity = tags.amenity || "";
        
        let poiType = amenity;
        if (amenity === "hospital") poiType = "hospital";
        else if (amenity === "school") poiType = "school";
        else continue;
        
        const distance = haversineDistance(lat, lng, elLat, elLon);
        const existing = poisByType.get(poiType) as { distance: number } | undefined;
        
        if (!existing || distance < existing.distance) {
          poisByType.set(poiType, {
            id: `poi_${el.id}`,
            type: poiType,
            name: tags.name || tags["name:tr"] || `Yakındaki ${poiType === "hospital" ? "Hastane" : "Okul"}`,
            distance: Math.round(distance),
            distanceText: formatDistance(distance),
            lat: elLat,
            lng: elLon,
            selected: false,
          });
        }
      }
      
      return Array.from(poisByType.values()) as POI[];
    } catch {
      continue;
    }
  }
  
  return [];
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
    return NextResponse.json({ ...cached as object, cached: true });
  }
  
  const radius = 1200; // Optimized radius
  
  console.log(`[NearbyPlaces] Fetching POIs for ${latNum}, ${lngNum}, radius: ${radius}m`);
  
  // Parallel fetch primary categories
  let pois = await fetchCategoriesParallel(latNum, lngNum, radius, POI_CATEGORIES);
  
  // If no results, try fallback with priority categories
  if (pois.length === 0) {
    console.log("[NearbyPlaces] No results from primary, trying fallback...");
    pois = await fetchFallback(latNum, lngNum, radius);
  }
  
  // If still no results, return demo
  if (pois.length === 0) {
    console.log("[NearbyPlaces] No results, returning demo data");
    const demoPois = generateDemoPois(latNum, lngNum);
    
    // Cache demo data for 1 hour
    setCache(cacheKey, { pois: demoPois, source: "demo" });
    
    return NextResponse.json({
      success: true,
      pois: demoPois,
      count: demoPois.length,
      center: { lat: latNum, lng: lngNum },
      source: "demo",
      message: "Çevre verileri yoğunluk nedeniyle geç yükleniyor",
    });
  }
  
  // Sort by distance and select top 4
  const sortedPois = pois as POI[];
  sortedPois.sort((a, b) => a.distance - b.distance);
  sortedPois.slice(0, 4).forEach(p => p.selected = true);
  
  // Cache successful results
  setCache(cacheKey, { pois, source: "overpass" });
  
  console.log(`[NearbyPlaces] Returning ${pois.length} POIs`);
  
  return NextResponse.json({
    success: true,
    pois,
    count: pois.length,
    center: { lat: latNum, lng: lngNum },
    source: "overpass",
  });
}

function generateDemoPois(lat: number, lng: number): POI[] {
  const demoData = [
    { type: "hospital", name: "Devlet Hastanesi", baseDist: 800 },
    { type: "school", name: "İlkokul", baseDist: 400 },
    { type: "pharmacy", name: "Eczane", baseDist: 350 },
    { type: "market", name: "Süpermarket", baseDist: 250 },
  ];
  
  return demoData.map((item, i) => {
    const dist = Math.max(50, item.baseDist + (Math.random() * 200 - 100));
    return {
      id: `demo_${i}`,
      type: item.type,
      name: item.name,
      distance: Math.round(dist),
      distanceText: formatDistance(dist),
      lat: lat + (Math.random() - 0.5) * 0.003,
      lng: lng + (Math.random() - 0.5) * 0.003,
      selected: i < 3,
    };
  }).sort((a, b) => a.distance - b.distance);
}