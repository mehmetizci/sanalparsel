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

// Optimized POI categories with better key mapping
const POI_CATEGORIES = [
  { key: "hospital", amenity: "hospital", label: "Hastane", fallbackName: "Hastane" },
  { key: "school", amenity: "school", label: "Okul", fallbackName: "Okul" },
  { key: "pharmacy", amenity: "pharmacy", label: "Eczane", fallbackName: "Eczane" },
  { key: "market", shop: "supermarket", label: "Market", fallbackName: "Market" },
];

// Overpass endpoints
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.monicz.ru/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
];

// In-memory cache
const cache = new Map<string, { data: POI[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24;
const OVERPASS_TIMEOUT = 4000;

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
  // Try name:tr first (Turkish name)
  if (tags["name:tr"] && tags["name:tr"].length > 2) {
    return tags["name:tr"];
  }
  // Try official_name
  if (tags.official_name && tags.official_name.length > 2) {
    return tags.official_name;
  }
  // Try name
  if (tags.name && tags.name.length > 2) {
    return tags.name;
  }
  // Try brand
  if (tags.brand && tags.brand.length > 2) {
    return tags.brand;
  }
  // Try operator
  if (tags.operator && tags.operator.length > 2) {
    return tags.operator;
  }
  // Fallback to category name
  return fallbackName;
}

// Build query for node + way + relation
function buildCategoryQuery(
  lat: number,
  lng: number,
  radius: number,
  amenityKey: string,
  amenityValue: string
): string {
  return `[out:json][timeout:8][maxsize:67108864];
(
  node["${amenityKey}"="${amenityValue}"](around:${radius},${lat},${lng});
  way["${amenityKey}"="${amenityValue}"](around:${radius},${lat},${lng});
);
out center tags 5;`;
}

// Build query for shop type
function buildShopQuery(
  lat: number,
  lng: number,
  radius: number,
  shopValue: string
): string {
  return `[out:json][timeout:8][maxsize:67108864];
(
  node["shop"="${shopValue}"](around:${radius},${lat},${lng});
  way["shop"="${shopValue}"](around:${radius},${lat},${lng});
);
out center tags 5;`;
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

// Normalize POI from OSM element
function normalizePoi(
  el: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> },
  category: typeof POI_CATEGORIES[0],
  userLat: number,
  userLng: number
): POI | null {
  const elLat = el.lat || el.center?.lat;
  const elLon = el.lon || el.center?.lon;
  
  if (!elLat || !elLon) return null;
  
  const distance = haversineDistance(userLat, userLng, elLat, elLon);
  const tags = el.tags || {};
  
  return {
    id: `${el.type}_${el.id}`,
    osmId: el.id,
    osmType: el.type,
    category: category.key,
    label: category.label,
    name: getBestName(tags, category.fallbackName),
    distanceMeters: Math.round(distance),
    distanceText: formatDistance(distance),
    lat: elLat,
    lng: elLon,
    selected: false,
  };
}

// Fetch single category from Overpass
async function fetchCategory(
  endpoint: string,
  lat: number,
  lng: number,
  radius: number,
  category: typeof POI_CATEGORIES[0]
): Promise<POI[] | null> {
  const query = category.amenity 
    ? buildCategoryQuery(lat, lng, radius, "amenity", category.amenity)
    : buildShopQuery(lat, lng, radius, category.shop || "");
  
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
    
    const pois = elements
      .map((el: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }) => 
        normalizePoi(el, category, lat, lng)
      )
      .filter(Boolean) as POI[];
    
    return pois;
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
      if (result && result.length > 0) return result;
      return await fetchCategory(endpoint, lat, lng, radius, cat);
    }, Promise.resolve<POI[] | null>(null));
  });
  
  const results = await Promise.allSettled(promises);
  
  const allPois: POI[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      allPois.push(...result.value);
    }
  }
  
  return allPois;
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
  
  // Parallel fetch all categories
  const pois = await fetchCategoriesParallel(latNum, lngNum, radius, POI_CATEGORIES);
  
  if (pois.length > 0) {
    // Sort by distance and select top 4
    pois.sort((a, b) => a.distanceMeters - b.distanceMeters);
    pois.slice(0, 4).forEach(p => p.selected = true);
    
    // Cache successful results
    setCache(cacheKey, pois);
    
    console.log(`[NearbyPlaces] Returning ${pois.length} POIs from Overpass`);
    console.log("[NearbyPlaces] Sample names:", pois.map(p => p.name).join(", "));
    
    return NextResponse.json({
      success: true,
      pois,
      count: pois.length,
      center: { lat: latNum, lng: lngNum },
      source: "overpass",
      parcelKey: cacheKey,
    });
  }
  
  // Overpass failed - return demo with better naming
  console.log("[NearbyPlaces] Overpass timeout, returning demo data");
  const demoPois = generateDemoPois(latNum, lngNum);
  
  return NextResponse.json({
    success: true,
    pois: demoPois,
    count: demoPois.length,
    center: { lat: latNum, lng: lngNum },
    source: "demo",
    parcelKey: cacheKey,
    message: "Çevre verileri yoğunluk nedeniyle geç yükleniyor. Demo veriler gösteriliyor.",
  });
}

function generateDemoPois(lat: number, lng: number): POI[] {
  const demoData = [
    { category: "hospital", label: "Hastane", name: "Devlet Hastanesi", baseDist: 800 },
    { category: "school", label: "Okul", name: "İlkokul", baseDist: 400 },
    { category: "pharmacy", label: "Eczane", name: "Eczane", baseDist: 350 },
    { category: "market", label: "Market", name: "Süpermarket", baseDist: 250 },
  ];
  
  return demoData.map((item, i) => {
    const dist = Math.max(50, item.baseDist + (Math.random() * 200 - 100));
    return {
      id: `demo_${i}`,
      osmId: 0,
      osmType: "demo",
      category: item.category,
      label: item.label,
      name: item.name,
      distanceMeters: Math.round(dist),
      distanceText: formatDistance(dist),
      lat: lat + (Math.random() - 0.5) * 0.003,
      lng: lng + (Math.random() - 0.5) * 0.003,
      selected: i < 3,
    };
  }).sort((a, b) => a.distanceMeters - b.distanceMeters);
}
