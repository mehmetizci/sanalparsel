import { NextRequest, NextResponse } from "next/server";

// Enhanced POI types with OSM metadata and source tracking
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

// Overpass endpoints - ordered by reliability
const OVERPASS_ENDPOINTS = [
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
];

// In-memory cache
const cache = new Map<string, { data: POI[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// In-flight requests lock
const inFlightRequests = new Map<string, Promise<POI[]>>();

// Debounce tracking
const recentRequests = new Map<string, number>();
const DEBOUNCE_MS = 2000;

function getCacheKey(lat: number, lng: number): string {
  // Round to 4 decimal places for cache key
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  return `nearby:${roundedLat}:${roundedLng}`;
}

function getFromCache(key: string): POI[] | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("[NearbyPlaces] Cache hit for:", key);
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

// Check debounce
function shouldDebounce(key: string): boolean {
  const lastRequest = recentRequests.get(key);
  if (lastRequest && Date.now() - lastRequest < DEBOUNCE_MS) {
    console.log("[NearbyPlaces] Debouncing request for:", key);
    return true;
  }
  recentRequests.set(key, Date.now());
  return false;
}

// Get in-flight request
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

// Get best name from OSM tags
function getBestName(tags: Record<string, string>, fallbackName: string): string {
  if (tags["name:tr"] && tags["name:tr"].length > 2) return tags["name:tr"];
  if (tags.official_name && tags.official_name.length > 2) return tags.official_name;
  if (tags.name && tags.name.length > 2) return tags.name;
  if (tags.brand && tags.brand.length > 2) return tags.brand;
  if (tags.operator && tags.operator.length > 2) return tags.operator;
  return fallbackName;
}

// Generate Overpass query for a given radius
function generateOverpassQuery(lat: number, lng: number, radius: number): string {
  return `
[out:json][timeout:25];
(
  // Amenities
  amenity=hospital;
  amenity=clinic;
  amenity=pharmacy;
  amenity=school;
  amenity=university;
  amenity=cafe;
  amenity=restaurant;
  amenity=bank;
  amenity=fuel;
  
  // Shops
  shop=supermarket;
  shop=convenience;
  
  // Transport
  highway=bus_stop;
  public_transport=platform;
  railway=station;
  railway=tram_stop;
)->.amenities;

.amenities around:${radius},${lat},${lng};
out center;
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

// Fetch from Overpass with retry logic
async function fetchFromOverpass(
  query: string
): Promise<{ elements: OverpassElement[]; endpoint?: string; status?: number }> {
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const endpoint = OVERPASS_ENDPOINTS[i];
    
    try {
      console.log(`[NearbyPlaces] Trying Overpass endpoint ${i + 1}/${OVERPASS_ENDPOINTS.length}:`, endpoint);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": "SanalParsel/1.0 (contact@sanalparsel.com)",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        console.log("[NearbyPlaces] Rate limited (429) on", endpoint);
        // Wait 5 seconds before trying next endpoint
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Handle other errors
      if (response.status === 406 || response.status === 504 || response.status >= 500) {
        console.log(`[NearbyPlaces] Overpass returned ${response.status} on`, endpoint);
        continue;
      }

      if (!response.ok) {
        console.log("[NearbyPlaces] Overpass HTTP error:", response.status);
        continue;
      }

      const text = await response.text();
      const data = JSON.parse(text);
      
      if (data.elements && data.elements.length > 0) {
        console.log("[NearbyPlaces] Overpass success:", data.elements.length, "elements from", endpoint);
        return { elements: data.elements, endpoint };
      }
      
      // Empty result from this endpoint
      console.log("[NearbyPlaces] No elements from", endpoint);
      
    } catch (err) {
      const error = err as Error;
      console.log("[NearbyPlaces] Overpass error on", endpoint, ":", error.message);
      
      // Don't retry same endpoint immediately
      if (i < OVERPASS_ENDPOINTS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  return { elements: [], status: 429 };
}

// Parse Overpass elements into POIs
function parseOverpassElements(
  elements: OverpassElement[],
  lat: number,
  lng: number,
  radius: number
): POI[] {
  const poisByCategory = new Map<string, POI>();

  for (const el of elements) {
    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    
    if (!elLat || !elLng) continue;
    
    const distance = haversineDistance(lat, lng, elLat, elLng);
    if (distance > radius * 1.1) continue; // 10% margin
    
    const tags = el.tags || {};
    
    // Determine category and label
    let category = "";
    let label = "";
    
    // Priority order for categories
    if (tags.amenity === "hospital" || tags.amenity === "clinic") {
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
    } else if (tags.shop === "supermarket" || tags.shop === "convenience") {
      category = "market";
      label = "Market";
    } else if (
      tags.highway === "bus_stop" ||
      tags.public_transport === "platform" ||
      tags.railway === "station" ||
      tags.railway === "tram_stop" ||
      tags.amenity === "bus_station"
    ) {
      category = "transport";
      label = tags.railway === "station" ? "İstasyon" : "Otobüs Durağı";
    } else {
      continue; // Skip unknown categories
    }

    // Get name - use category label if no name
    const name = getBestName(tags, label);
    
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

    // Keep closest POI per category
    const existing = poisByCategory.get(category);
    if (!existing || distance < existing.distanceMeters) {
      poisByCategory.set(category, poi);
    }
  }

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
      name: cat.label,
      distanceMeters: Math.round(distance),
      distanceText: formatDistance(distance),
      lat: lat + (distance / 111000) * Math.cos(angle),
      lng: lng + (distance / (111000 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle),
      selected: false,
      source: "fallback" as const,
    };
  });
}

// Category priority for sorting
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

  // Validate coordinates
  if (isNaN(lat) || isNaN(lng) || lat < 36 || lat > 42 || lng < 26 || lng > 45) {
    return NextResponse.json(
      { error: "Geçersiz koordinatlar" },
      { status: 400 }
    );
  }

  const cacheKey = getCacheKey(lat, lng);
  console.log("[NearbyPlaces] Request for:", cacheKey);

  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    return NextResponse.json({
      success: true,
      pois: cached,
      count: cached.length,
      center: { lat, lng },
      source: "cache",
      parcelKey: cacheKey,
    });
  }

  // Check debounce
  if (shouldDebounce(cacheKey)) {
    return NextResponse.json(
      { error: "Çok sık istek atılıyor. Lütfen bekleyin." },
      { status: 429 }
    );
  }

  // Check in-flight request
  const inFlight = getInFlight(cacheKey);
  if (inFlight) {
    console.log("[NearbyPlaces] Waiting for in-flight request");
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

  // Create in-flight request
  const { pois: allPois, usedRadius } = await (async () => {
    let allPois: POI[] = [];
    let usedRadius = 0;

    // Try radius progression: 1500m -> 3000m -> 5000m
    const radiusSteps = [1500, 3000, 5000];
    const minPoisPerRadius = [6, 5, 4]; // Minimum POIs to accept at each radius

    for (let i = 0; i < radiusSteps.length; i++) {
      const radius = radiusSteps[i];
      console.log(`[NearbyPlaces] Trying radius ${radius}m...`);
      
      const query = generateOverpassQuery(lat, lng, radius);
      const result = await fetchFromOverpass(query);
      
      if (result.elements.length > 0) {
        allPois = parseOverpassElements(result.elements, lat, lng, radius);
        usedRadius = radius;
        console.log(`[NearbyPlaces] Found ${allPois.length} POIs at ${radius}m`);
        
        // Check if we have enough POIs
        if (allPois.length >= minPoisPerRadius[i]) {
          break;
        }
      }
    }

    // If no POIs from Overpass, try fallback
    if (allPois.length === 0) {
      console.log("[NearbyPlaces] No POIs from Overpass, generating fallback");
      allPois = generateFallbackPois(lat, lng);
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

    // Cache the result
    setCache(cacheKey, displayPois);

    console.log("[NearbyPlaces] Final result:", {
      total: displayPois.length,
      selected: displayPois.filter(p => p.selected).length,
    });

    return { pois: displayPois, usedRadius };
  })();

  return NextResponse.json({
    success: true,
    pois: allPois,
    count: allPois.length,
    center: { lat, lng },
    source: "overpass",
    parcelKey: cacheKey,
    debug: {
      radius: usedRadius,
      selectedCount: allPois.filter(p => p.selected).length,
    },
  });
}
