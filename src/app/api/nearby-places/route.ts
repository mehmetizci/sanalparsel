import { NextRequest, NextResponse } from "next/server";

// POI types
interface POI {
  id: string;
  category: string;
  label: string;
  name: string;
  address?: string;
  distanceMeters: number;
  distanceText: string;
  lat: number;
  lng: number;
  selected: boolean;
  source: "mapbox" | "overpass" | "fallback";
}

// Cache data structure
interface CacheData {
  data: POI[];
  source: "mapbox" | "overpass" | "fallback";
  createdAt: number;
}

// Mapbox categories
const MAPBOX_CATEGORIES = [
  "restaurant",
  "cafe",
  "school",
  "hospital",
  "pharmacy",
  "supermarket",
  "bank",
  "gas_station",
  "bus_station",
];

// In-memory cache
const cache = new Map<string, CacheData>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// In-flight requests
const inFlightRequests = new Map<string, Promise<POI[]>>();

// Debounce
const recentRequests = new Map<string, number>();
const DEBOUNCE_MS = 2000;

function getCacheKey(lat: number, lng: number): string {
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  return `nearby:mapbox:${roundedLat}:${roundedLng}`;
}

function getFromCache(key: string): CacheData | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
    return cached;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: POI[], source: "mapbox" | "overpass" | "fallback"): void {
  if (source === "fallback") return;
  
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

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restoran",
  cafe: "Kafe",
  school: "Okul",
  hospital: "Hastane",
  pharmacy: "Eczane",
  supermarket: "Market",
  bank: "Banka",
  gas_station: "Benzin İstasyonu",
  bus_station: "Otobüs Terminali",
  bus_stop: "Otobüs Durağı",
};

// Mapbox category to POI category mapping
const CATEGORY_MAP: Record<string, string> = {
  restaurant: "restaurant",
  cafe: "cafe",
  school: "school",
  hospital: "hospital",
  pharmacy: "pharmacy",
  supermarket: "market",
  bank: "bank",
  gas_station: "fuel",
  bus_station: "transport",
  bus_stop: "transport",
};

// Fetch from Mapbox
async function fetchFromMapbox(lat: number, lng: number, token: string): Promise<POI[]> {
  const pois: POI[] = [];
  const seenNames = new Set<string>();

  for (const category of MAPBOX_CATEGORIES) {
    try {
      const url = `https://api.mapbox.com/search/searchbox/v1/category/${category}?access_token=${token}&limit=5&language=tr&proximity=${lng},${lat}`;

      console.log(`[NearbyPlaces] Mapbox requesting category: ${category}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`[NearbyPlaces] Mapbox ${category} failed: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        continue;
      }

      for (const feature of data.features) {
        const name = feature.properties.name || feature.properties.full_address;
        if (!name || seenNames.has(name.toLowerCase())) continue;
        
        seenNames.add(name.toLowerCase());

        const center = feature.geometry?.coordinates;
        if (!center) continue;

        const distance = haversineDistance(lat, lng, center[1], center[0]);
        
        if (distance > 5000) continue; // Only include within 5km

        const poi: POI = {
          id: `mapbox_${feature.id || feature.properties.mapbox_id}`,
          category: CATEGORY_MAP[category] || category,
          label: CATEGORY_LABELS[category] || category,
          name,
          address: feature.properties.full_address || feature.properties.address,
          distanceMeters: Math.round(distance),
          distanceText: formatDistance(distance),
          lat: center[1],
          lng: center[0],
          selected: false,
          source: "mapbox",
        };

        pois.push(poi);
      }
    } catch (err) {
      console.log(`[NearbyPlaces] Mapbox ${category} error:`, (err as Error).message);
      continue;
    }
  }

  return pois;
}

// Overpass fallback
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

function generateOverpassQuery(lat: number, lng: number, radius: number): string {
  return `
[out:json][timeout:15];
(
  node["amenity"~"school|hospital|clinic|pharmacy|restaurant|cafe|bank"](around:${radius},${lat},${lng});
  way["amenity"~"school|hospital|clinic|pharmacy|restaurant|cafe|bank"](around:${radius},${lat},${lng});
  node["shop"~"supermarket|convenience"](around:${radius},${lat},${lng});
  way["shop"~"supermarket|convenience"](around:${radius},${lat},${lng});
  node["highway"="bus_stop"](around:${radius},${lat},${lng});
  way["highway"="bus_stop"](around:${radius},${lat},${lng});
  node["railway"~"station|tram_stop"](around:${radius},${lat},${lng});
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

async function fetchFromOverpass(lat: number, lng: number, radius: number): Promise<OverpassElement[]> {
  const query = generateOverpassQuery(lat, lng, radius);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`[NearbyPlaces] Overpass trying:`, endpoint);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "SanalParsel/1.0",
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.elements && data.elements.length > 0) {
          console.log(`[NearbyPlaces] Overpass success: ${data.elements.length} elements`);
          return data.elements;
        }
      }
    } catch (err) {
      console.log(`[NearbyPlaces] Overpass error:`, (err as Error).message);
      continue;
    }
  }

  return [];
}

function parseOverpassElements(elements: OverpassElement[], lat: number, lng: number): POI[] {
  const pois: POI[] = [];
  const seenNames = new Set<string>();

  for (const el of elements) {
    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (!elLat || !elLng) continue;

    const tags = el.tags || {};
    const name = tags.name || tags["name:tr"] || tags.official_name || tags.operator || tags.brand;
    if (!name || seenNames.has(name.toLowerCase())) continue;
    seenNames.add(name.toLowerCase());

    let category = "";
    let label = "";

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
      label = "Banka";
    } else if (tags.amenity === "fuel") {
      category = "fuel";
      label = "Benzin İstasyonu";
    } else if (tags.shop === "supermarket" || tags.shop === "convenience") {
      category = "market";
      label = "Market";
    } else if (tags.highway === "bus_stop" || tags.railway === "station" || tags.railway === "tram_stop") {
      category = "transport";
      label = tags.railway === "station" ? "İstasyon" : "Otobüs Durağı";
    } else {
      continue;
    }

    const distance = haversineDistance(lat, lng, elLat, elLng);

    pois.push({
      id: `ov_${el.type}_${el.id}`,
      category,
      label,
      name,
      address: tags["addr:street"],
      distanceMeters: Math.round(distance),
      distanceText: formatDistance(distance),
      lat: elLat,
      lng: elLng,
      selected: false,
      source: "overpass",
    });
  }

  return pois;
}

// Generate fallback
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

  // Check cache
  const cached = getFromCache(cacheKey);
  if (cached && cached.source !== "fallback") {
    console.log("[NearbyPlaces] Cache hit, source:", cached.source);
    return NextResponse.json({
      success: true,
      pois: cached.data,
      count: cached.data.length,
      center: { lat, lng },
      source: cached.source,
      parcelKey: cacheKey,
    });
  }

  if (shouldDebounce(cacheKey)) {
    return NextResponse.json({ error: "Çok sık istek atılıyor" }, { status: 429 });
  }

  const inFlight = getInFlight(cacheKey);
  if (inFlight) {
    const result = await inFlight;
    return NextResponse.json({
      success: true,
      pois: result,
      count: result.length,
      center: { lat, lng },
      source: "cache",
      parcelKey: cacheKey,
    });
  }

  const fetchPromise = (async () => {
    let allPois: POI[] = [];
    let usedSource = "fallback";

    // 1. Try Mapbox
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (mapboxToken) {
      console.log("[NearbyPlaces] Trying Mapbox...");
      const mapboxPois = await fetchFromMapbox(lat, lng, mapboxToken);
      
      if (mapboxPois.length > 0) {
        allPois = mapboxPois;
        usedSource = "mapbox";
        console.log("[NearbyPlaces] Mapbox success:", mapboxPois.length, "POIs");
      }
    } else {
      console.log("[NearbyPlaces] MAPBOX_ACCESS_TOKEN not set, skipping Mapbox");
    }

    // 2. Try Overpass if Mapbox failed
    if (allPois.length === 0) {
      console.log("[NearbyPlaces] Trying Overpass fallback...");
      const overpassElements = await fetchFromOverpass(lat, lng, 2000);
      
      if (overpassElements.length > 0) {
        allPois = parseOverpassElements(overpassElements, lat, lng);
        usedSource = "overpass";
        console.log("[NearbyPlaces] Overpass success:", overpassElements.length, "elements");
      }
    }

    // 3. Generate fallback if both failed
    if (allPois.length === 0) {
      console.log("[NearbyPlaces] Both Mapbox and Overpass failed, using fallback");
      allPois = generateFallbackPois(lat, lng);
      usedSource = "fallback";
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

    // Cache only real results
    if (usedSource !== "fallback") {
      setCache(cacheKey, displayPois, usedSource as "mapbox" | "overpass");
    }

    console.log("[NearbyPlaces] Final result:", {
      total: displayPois.length,
      selected: displayPois.filter(p => p.selected).length,
      source: usedSource,
      realPoiCount: displayPois.filter(p => p.source !== "fallback").length,
    });

    return displayPois;
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  fetchPromise.finally(() => inFlightRequests.delete(cacheKey));

  const allPois = await fetchPromise;

  return NextResponse.json({
    success: true,
    pois: allPois,
    count: allPois.length,
    center: { lat, lng },
    source: "mapbox",
    parcelKey: cacheKey,
    debug: {
      selectedCount: allPois.filter(p => p.selected).length,
    },
  });
}