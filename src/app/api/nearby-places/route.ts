import { NextRequest, NextResponse } from "next/server";

// POI types
interface POI {
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
  source: "overpass" | "nominatim" | "fallback";
}

// Cache data structure with source
interface CacheData {
  data: POI[];
  source: "overpass" | "fallback";
  createdAt: number;
}

// Overpass endpoints
const OVERPASS_ENDPOINTS = [
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
];

// In-memory cache with versioned key
const cache = new Map<string, CacheData>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const CACHE_VERSION = "v2";

// In-flight requests lock
const inFlightRequests = new Map<string, Promise<POI[]>>();

// Debounce tracking
const recentRequests = new Map<string, number>();
const DEBOUNCE_MS = 2000;

function getCacheKey(lat: number, lng: number): string {
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  return `nearby:${CACHE_VERSION}:${roundedLat}:${roundedLng}`;
}

function getFromCache(key: string): CacheData | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
    return cached;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: POI[], source: "overpass" | "fallback"): void {
  // Don't cache fallback results
  if (source === "fallback") {
    console.log("[NearbyPlaces] Skipping cache for fallback result");
    return;
  }
  
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value as string | undefined;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, source, createdAt: Date.now() });
}

function shouldDebounce(key: string): boolean {
  const lastRequest = recentRequests.get(key);
  if (lastRequest && Date.now() - lastRequest < DEBOUNCE_MS) {
    return true;
  }
  recentRequests.set(key, Date.now());
  return false;
}

function getInFlight(key: string): Promise<POI[]> | null {
  return inFlightRequests.get(key) || null;
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
  if (meters < 1000) {
    return `${Math.round(meters)} m yakınında`;
  }
  return `${(meters / 1000).toFixed(1)} km mesafede`;
}

// Get POI name from tags
function getPoiName(tags: Record<string, string>): string | null {
  return (
    tags.name ||
    tags["name:tr"] ||
    tags.official_name ||
    tags.operator ||
    tags.brand ||
    tags.alt_name ||
    null
  );
}

// Generate Overpass query
function generateOverpassQuery(lat: number, lng: number, radius: number): string {
  return `
[out:json][timeout:15];
(
  node["amenity"~"school|hospital|clinic|pharmacy|cafe|restaurant|university|fuel|bank"](around:${radius},${lat},${lng});
  way["amenity"~"school|hospital|clinic|pharmacy|cafe|restaurant|university|fuel|bank"](around:${radius},${lat},${lng});

  node["shop"~"supermarket|convenience|mall|bakery"](around:${radius},${lat},${lng});
  way["shop"~"supermarket|convenience|mall|bakery"](around:${radius},${lat},${lng});

  node["highway"="bus_stop"](around:${radius},${lat},${lng});
  way["highway"="bus_stop"](around:${radius},${lat},${lng});

  node["public_transport"="platform"](around:${radius},${lat},${lng});
  way["public_transport"="platform"](around:${radius},${lat},${lng});

  node["railway"~"station|halt|tram_stop"](around:${radius},${lat},${lng});
  way["railway"~"station|halt|tram_stop"](around:${radius},${lat},${lng});

  node["healthcare"~"hospital|clinic|doctor|pharmacy"](around:${radius},${lat},${lng});
  way["healthcare"~"hospital|clinic|doctor|pharmacy"](around:${radius},${lat},${lng});
);
out center tags;
  `.trim();
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// Fetch from Overpass
async function fetchFromOverpass(query: string): Promise<{ elements: OverpassElement[]; status: number }> {
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const endpoint = OVERPASS_ENDPOINTS[i];
    
    try {
      console.log(`[NearbyPlaces] Trying endpoint ${i + 1}/${OVERPASS_ENDPOINTS.length}:`, endpoint);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 400) {
        const errorText = await response.text();
        console.error("[NearbyPlaces] Overpass 400 response:", errorText.substring(0, 200));
        continue;
      }

      if (response.status === 429) {
        console.log("[NearbyPlaces] Rate limited on", endpoint);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      if (response.status >= 500 || response.status === 406) {
        console.log(`[NearbyPlaces] HTTP ${response.status} on`, endpoint);
        continue;
      }

      if (!response.ok) {
        console.log("[NearbyPlaces] HTTP error:", response.status);
        continue;
      }

      const data = await response.json();
      
      if (data.elements && data.elements.length > 0) {
        console.log("[NearbyPlaces] Success:", data.elements.length, "elements from", endpoint);
        return { elements: data.elements, status: 200 };
      }
      
      console.log("[NearbyPlaces] No elements from", endpoint);
      
    } catch (err) {
      console.log("[NearbyPlaces] Error on", endpoint, ":", (err as Error).message);
      if (i < OVERPASS_ENDPOINTS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  return { elements: [], status: 429 };
}

// Parse POIs from Overpass elements
function parseOverpassElements(elements: OverpassElement[], lat: number, lng: number): POI[] {
  const poisByCategory = new Map<string, POI>();
  let namedCount = 0;
  let unnamedCount = 0;

  for (const el of elements) {
    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    
    if (!elLat || !elLng) continue;
    
    const tags = el.tags || {};
    const poiName = getPoiName(tags);
    
    if (poiName) {
      namedCount++;
    } else {
      unnamedCount++;
    }

    // Determine category
    let category = "";
    let label = "";

    if (tags.amenity === "hospital" || tags.amenity === "clinic" || tags.amenity === "doctors" ||
        tags.healthcare === "hospital" || tags.healthcare === "clinic") {
      category = "hospital";
      label = "Hastane";
    } else if (tags.amenity === "pharmacy") {
      category = "pharmacy";
      label = "Eczane";
    } else if (tags.amenity === "school" || tags.amenity === "university") {
      category = "school";
      label = tags.amenity === "university" ? "Üniversite" : "Okul";
    } else if (tags.amenity === "cafe") {
      category = "cafe";
      label = "Kafe";
    } else if (tags.amenity === "restaurant") {
      category = "restaurant";
      label = "Restoran";
    } else if (tags.amenity === "bank" || tags.amenity === "atm") {
      category = "bank";
      label = tags.amenity === "atm" ? "ATM" : "Banka";
    } else if (tags.amenity === "fuel") {
      category = "fuel";
      label = "Benzin İstasyonu";
    } else if (tags.shop && /supermarket|convenience|mall|bakery/.test(tags.shop)) {
      category = "market";
      label = "Market";
    } else if (tags.highway === "bus_stop" || tags.public_transport === "platform" ||
               tags.railway === "station" || tags.railway === "tram_stop" ||
               tags.amenity === "bus_station") {
      category = "transport";
      label = tags.railway === "station" ? "İstasyon" : "Otobüs Durağı";
    } else {
      continue;
    }

    const distance = haversineDistance(lat, lng, elLat, elLng);
    
    // Use name or "Yakındaki [label]" as fallback
    const name = poiName || `Yakındaki ${label}`;

    const poi: POI = {
      id: `poi_${el.type}_${el.id}`,
      osmId: el.id,
      osmType: el.type,
      category,
      label,
      name,
      distanceMeters: Math.round(distance),
      distanceText: formatDistance(distance),
      lat: elLat,
      lng: elLng,
      selected: false,
      source: "overpass",
    };

    // Prefer named POI or closer POI
    const existing = poisByCategory.get(category);
    if (!existing) {
      poisByCategory.set(category, poi);
    } else {
      const existingNamed = existing.name.startsWith("Yakındaki") === false;
      const newNamed = !name.startsWith("Yakındaki");
      
      if (newNamed && !existingNamed) {
        // Prefer named over unnamed
        poisByCategory.set(category, poi);
      } else if (distance < existing.distanceMeters) {
        // Prefer closer
        poisByCategory.set(category, poi);
      }
    }
  }

  console.log("[NearbyPlaces] Parsed POIs:", {
    total: elements.length,
    named: namedCount,
    unnamed: unnamedCount,
    categories: poisByCategory.size,
  });

  return Array.from(poisByCategory.values());
}

// Generate fallback POIs
function generateFallbackPois(lat: number, lng: number): POI[] {
  console.log("[NearbyPlaces] Generating fallback POIs");
  
  const categories = [
    { category: "hospital", label: "Hastane", baseDist: 800 },
    { category: "pharmacy", label: "Eczane", baseDist: 400 },
    { category: "market", label: "Market", baseDist: 250 },
    { category: "school", label: "Okul", baseDist: 500 },
    { category: "cafe", label: "Kafe", baseDist: 350 },
    { category: "restaurant", label: "Restoran", baseDist: 400 },
    { category: "bank", label: "Banka", baseDist: 600 },
    { category: "transport", label: "Otobüs Durağı", baseDist: 300 },
  ];

  return categories.map((cat, i) => {
    const angle = (i * 45 + Math.random() * 20 - 10) * (Math.PI / 180);
    const distance = cat.baseDist + Math.random() * 200 - 100;
    
    return {
      id: `fallback_${cat.category}`,
      category: cat.category,
      label: cat.label,
      name: `Yakındaki ${cat.label}`,
      distanceMeters: Math.round(distance),
      distanceText: formatDistance(distance),
      lat: lat + (distance / 111000) * Math.cos(angle),
      lng: lng + (distance / (111000 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle),
      selected: false,
      source: "fallback" as const,
    };
  });
}

// Category priority
const CATEGORY_PRIORITY: Record<string, number> = {
  hospital: 1,
  pharmacy: 2,
  market: 3,
  school: 4,
  cafe: 5,
  restaurant: 6,
  transport: 7,
  bank: 8,
  fuel: 9,
};

// Main handler
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");

  if (isNaN(lat) || isNaN(lng) || lat < 36 || lat > 42 || lng < 26 || lng > 45) {
    return NextResponse.json({ error: "Geçersiz koordinatlar" }, { status: 400 });
  }

  const cacheKey = getCacheKey(lat, lng);
  console.log("[NearbyPlaces] Request for:", cacheKey);

  // Check cache
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log("[NearbyPlaces] Cache source:", cached.source);
    
    // Ignore fallback cache, try fresh query
    if (cached.source === "fallback") {
      console.log("[NearbyPlaces] Ignoring fallback cache, fetching fresh data");
    } else {
      return NextResponse.json({
        success: true,
        pois: cached.data,
        count: cached.data.length,
        center: { lat, lng },
        source: "cache",
        parcelKey: cacheKey,
      });
    }
  }

  // Check debounce
  if (shouldDebounce(cacheKey)) {
    return NextResponse.json(
      { error: "Çok sık istek atılıyor. Lütfen bekleyin." },
      { status: 429 }
    );
  }

  // Check in-flight
  const inFlight = getInFlight(cacheKey);
  if (inFlight) {
    const result = await inFlight;
    return NextResponse.json({
      success: true,
      pois: result,
      count: result.length,
      center: { lat, lng },
      source: "overpass",
      parcelKey: cacheKey,
    });
  }

  // Create and track request
  const fetchPromise = (async () => {
    try {
      let allPois: POI[] = [];
      let usedRadius = 0;
      let usedSource = "overpass";

      // Try radius progression
      const radiusSteps = [1500, 3000, 5000];

      for (const radius of radiusSteps) {
        console.log(`[NearbyPlaces] Trying radius ${radius}m...`);
        
        const query = generateOverpassQuery(lat, lng, radius);
        console.log("[NearbyPlaces] Overpass query:", query);
        
        const result = await fetchFromOverpass(query);
        
        if (result.elements.length > 0) {
          allPois = parseOverpassElements(result.elements, lat, lng);
          usedRadius = radius;
          usedSource = "overpass";
          console.log(`[NearbyPlaces] Found ${allPois.length} POIs at ${radius}m`);
          
          if (allPois.length >= 5) {
            break;
          }
        }
      }

      // Only use fallback if no real POIs found
      if (allPois.length === 0) {
        console.log("[NearbyPlaces] All endpoints failed, using fallback");
        allPois = generateFallbackPois(lat, lng);
        usedSource = "fallback";
        usedRadius = 5000;
      }

      // Sort by priority then distance
      allPois.sort((a, b) => {
        const priorityA = CATEGORY_PRIORITY[a.category] || 999;
        const priorityB = CATEGORY_PRIORITY[b.category] || 999;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.distanceMeters - b.distanceMeters;
      });

      // Limit to max 8 POIs
      const displayPois = allPois.slice(0, 8);
      
      // Auto-select first 5 POIs
      displayPois.forEach((poi, index) => {
        poi.selected = index < 5;
      });

      // Cache only real results (not fallback)
      if (usedSource === "overpass") {
        setCache(cacheKey, displayPois, "overpass");
      }

      console.log("[NearbyPlaces] Final result:", {
        total: displayPois.length,
        selected: displayPois.filter(p => p.selected).length,
        source: usedSource,
        radius: usedRadius,
      });

      return displayPois;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  // Set in-flight
  inFlightRequests.set(cacheKey, fetchPromise);

  // Wait and return
  const allPois = await fetchPromise;

  return NextResponse.json({
    success: true,
    pois: allPois,
    count: allPois.length,
    center: { lat, lng },
    source: "overpass",
    parcelKey: cacheKey,
    debug: {
      radius: 0,
      selectedCount: allPois.filter(p => p.selected).length,
    },
  });
}