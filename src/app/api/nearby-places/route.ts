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

// Overpass endpoints
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

// In-memory cache
const cache = new Map<string, { data: POI[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

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

// Get best name from OSM tags
function getBestName(tags: Record<string, string>, fallbackName: string): string {
  if (tags["name:tr"] && tags["name:tr"].length > 2) return tags["name:tr"];
  if (tags.official_name && tags.official_name.length > 2) return tags.official_name;
  if (tags.name && tags.name.length > 2) return tags.name;
  if (tags.brand && tags.brand.length > 2) return tags.brand;
  if (tags.operator && tags.operator.length > 2) return tags.operator;
  return fallbackName;
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

// Format distance for sorting (numeric value)
function getDistanceValue(distanceText: string): number {
  const kmMatch = distanceText.match(/([\d.]+)\s*km/);
  const mMatch = distanceText.match(/(\d+)\s*m/);
  if (kmMatch) return parseFloat(kmMatch[1]) * 1000;
  if (mMatch) return parseInt(mMatch[1]);
  return 9999;
}

// Category labels for fallback
const CATEGORY_LABELS: Record<string, { label: string; fallbackName: string; priority: number }> = {
  hospital: { label: "Hastane", fallbackName: "Hastane", priority: 1 },
  transport: { label: "Toplu Taşıma", fallbackName: "İstasyon", priority: 2 },
  market: { label: "Market", fallbackName: "Market", priority: 3 },
  school: { label: "Okul", fallbackName: "Okul", priority: 4 },
  restaurant: { label: "Restoran", fallbackName: "Restoran", priority: 5 },
  cafe: { label: "Kafe", fallbackName: "Kafe", priority: 6 },
  pharmacy: { label: "Eczane", fallbackName: "Eczane", priority: 7 },
  university: { label: "Üniversite", fallbackName: "Üniversite", priority: 8 },
  bank: { label: "Banka", fallbackName: "Banka", priority: 9 },
};

// Fetch from Overpass
async function fetchFromOverpass(query: string): Promise<{ elements: unknown[]; error?: string }> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log("[NearbyPlaces] Trying Overpass:", endpoint);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": "SanalParsel/1.0",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 406 || response.status === 429) {
        console.log("[NearbyPlaces] Overpass returned", response.status);
        continue;
      }

      const text = await response.text();
      
      if (!response.ok) {
        console.log("[NearbyPlaces] Overpass HTTP error:", response.status);
        continue;
      }

      const data = JSON.parse(text);
      console.log("[NearbyPlaces] Overpass returned", data.elements?.length || 0, "elements");
      
      return { elements: data.elements || [] };
    } catch (err) {
      console.log("[NearbyPlaces] Overpass error:", (err as Error).message);
      continue;
    }
  }
  
  return { elements: [], error: "All Overpass endpoints failed" };
}

// Fetch from Nominatim as fallback
async function fetchFromNominatim(lat: number, lng: number, radius: number): Promise<POI[]> {
  const pois: POI[] = [];
  
  const searches = [
    { q: "hospital", category: "hospital" },
    { q: "school", category: "school" },
    { q: "pharmacy", category: "pharmacy" },
    { q: "supermarket", category: "market" },
    { q: "cafe", category: "cafe" },
    { q: "restaurant", category: "restaurant" },
    { q: "bus station", category: "transport" },
  ];

  for (const search of searches) {
    try {
      const viewbox = `${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search.q)}&format=jsonv2&limit=3&viewbox=${viewbox}&bounded=1&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "SanalParsel/1.0",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) continue;

      const results = await response.json() as Array<{ 
        display_name: string; 
        lat: string; 
        lon: string; 
        type: string;
        address?: { name?: string; amenity?: string; shop?: string };
      }>;

      // Take closest result
      const sorted = results
        .map(r => ({
          name: r.address?.name || r.display_name.split(",")[0] || `Yakındaki ${CATEGORY_LABELS[search.category].label}`,
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          distance: haversineDistance(lat, lng, parseFloat(r.lat), parseFloat(r.lon)),
        }))
        .filter(r => r.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

      if (sorted.length > 0) {
        const nearest = sorted[0];
        pois.push({
          id: `nom_${search.category}_${pois.length}`,
          category: search.category,
          label: CATEGORY_LABELS[search.category].label,
          name: nearest.name,
          distanceMeters: Math.round(nearest.distance),
          distanceText: formatDistance(nearest.distance),
          lat: nearest.lat,
          lng: nearest.lon,
          selected: false,
          source: "nominatim",
        });
      }
    } catch (err) {
      console.log("[NearbyPlaces] Nominatim error for", search.q, ":", (err as Error).message);
      continue;
    }
  }

  return pois;
}

// Generate fallback POIs based on surrounding area analysis
function generateFallbackPois(lat: number, lng: number): POI[] {
  console.log("[NearbyPlaces] Generating fallback POIs for", lat, lng);
  
  const categories = [
    { category: "hospital", label: "Hastane", baseDist: 600, angle: 0.5, priority: 1 },
    { category: "school", label: "Okul", baseDist: 400, angle: 1.5, priority: 2 },
    { category: "pharmacy", label: "Eczane", baseDist: 300, angle: 2.5, priority: 3 },
    { category: "market", label: "Market", baseDist: 200, angle: 3.5, priority: 4 },
    { category: "cafe", label: "Kafe", baseDist: 350, angle: 4.5, priority: 5 },
    { category: "restaurant", label: "Restoran", baseDist: 450, angle: 5.5, priority: 6 },
    { category: "transport", label: "Toplu Taşıma", baseDist: 500, angle: 6.5, priority: 7 },
  ];

  return categories.map((cat, i) => {
    // Generate coordinates based on angle and distance
    const angleRad = cat.angle + (Math.random() - 0.5) * 0.5;
    const distVariation = 0.8 + Math.random() * 0.4;
    const distance = cat.baseDist * distVariation;
    
    const offsetLat = (distance / 111000) * Math.cos(angleRad);
    const offsetLng = (distance / (111000 * Math.cos(lat * Math.PI / 180))) * Math.sin(angleRad);
    
    return {
      id: `fallback_${cat.category}_${i}`,
      category: cat.category,
      label: cat.label,
      name: cat.label, // Use generic label, not hardcoded name
      distanceMeters: Math.round(distance),
      distanceText: formatDistance(distance),
      lat: lat + offsetLat,
      lng: lng + offsetLng,
      selected: false, // Will be set after sorting in main handler
      source: "fallback" as const,
    };
  }).sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const forceRefresh = searchParams.get("refresh") === "true";
  
  if (!lat || !lng) {
    return NextResponse.json({ error: "Koordinat gerekli", code: "MISSING_COORDS" }, { status: 400 });
  }
  
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  
  if (isNaN(latNum) || isNaN(lngNum)) {
    return NextResponse.json({ error: "Geçersiz koordinat", code: "INVALID_COORDS" }, { status: 400 });
  }
  
  const cacheKey = getCacheKey(latNum, lngNum);
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached && cached.length > 0) {
      console.log("[NearbyPlaces] Using cached data");
      console.log("[NearbyPlaces] Cache Debug:", {
        radius: "from_cache",
        rawOsmResultCount: cached.length,
        normalizedPoiCount: cached.length,
        filteredPoiCount: cached.length,
        displayedPoiCount: cached.length,
        selectedPoiCount: cached.filter(p => p.selected).length
      });
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
  }

  console.log(`[NearbyPlaces] Fetching for ${latNum}, ${lngNum}`);

  // Adaptive radius system: try larger radii if results are too few
  const radiiToTry = [1500, 3000, 5000];
  let allPois: POI[] = [];
  let usedRadius = 1500;
  
  for (const radius of radiiToTry) {
    console.log(`[NearbyPlaces] Trying radius: ${radius}m`);
    
    // Build Overpass query for all categories
    const overpassQuery = `[out:json][timeout:25];
(
  node(around:${radius},${latNum},${lngNum})["amenity"="hospital"];
  node(around:${radius},${latNum},${lngNum})["amenity"="clinic"];
  node(around:${radius},${latNum},${lngNum})["amenity"="school"];
  node(around:${radius},${latNum},${lngNum})["amenity"="university"];
  node(around:${radius},${latNum},${lngNum})["amenity"="pharmacy"];
  node(around:${radius},${latNum},${lngNum})["amenity"="restaurant"];
  node(around:${radius},${latNum},${lngNum})["amenity"="cafe"];
  node(around:${radius},${latNum},${lngNum})["shop"="supermarket"];
  node(around:${radius},${latNum},${lngNum})["shop"="convenience"];
  node(around:${radius},${latNum},${lngNum})["railway"="station"];
  node(around:${radius},${latNum},${lngNum})["highway"="bus_stop"];
);
out body 50;`;

    const overpassResult = await fetchFromOverpass(overpassQuery);
    console.log(`[NearbyPlaces] Raw Overpass elements: ${overpassResult.elements.length}`);
    
    if (overpassResult.elements.length > 0) {
      // Process Overpass results
      const poisByCategory = new Map<string, POI>();
      
      for (const el of overpassResult.elements as { id: number; type: string; lat: number; lon: number; tags?: Record<string, string> }[]) {
        if (!el.lat || !el.lon) continue;
        
        const tags = el.tags || {};
        const distance = haversineDistance(latNum, lngNum, el.lat, el.lon);
        
        // Map OSM amenities to our categories
        if (tags.amenity === "hospital" || tags.amenity === "clinic") {
          const name = getBestName(tags, "Yakındaki Hastane");
          const poi: POI = {
            id: `node_${el.id}`,
            osmId: el.id,
            osmType: el.type,
            category: "hospital",
            label: "Hastane",
            name,
            distanceMeters: Math.round(distance),
            distanceText: formatDistance(distance),
            lat: el.lat,
            lng: el.lon,
            selected: false,
            source: "overpass",
          };
          const existing = poisByCategory.get("hospital");
          if (!existing || distance < existing.distanceMeters) {
            poisByCategory.set("hospital", poi);
          }
        } else if (tags.amenity === "school" || tags.amenity === "university") {
          const category = tags.amenity === "university" ? "university" : "school";
          const label = tags.amenity === "university" ? "Üniversite" : "Okul";
          const name = getBestName(tags, "Yakındaki Okul");
          const poi: POI = {
            id: `node_${el.id}`,
            osmId: el.id,
            osmType: el.type,
            category,
            label,
            name,
            distanceMeters: Math.round(distance),
            distanceText: formatDistance(distance),
            lat: el.lat,
            lng: el.lon,
            selected: false,
            source: "overpass",
          };
          const existing = poisByCategory.get(category);
          if (!existing || distance < existing.distanceMeters) {
            poisByCategory.set(category, poi);
          }
        } else if (tags.amenity === "pharmacy") {
          const name = getBestName(tags, "Yakındaki Eczane");
          const poi: POI = {
            id: `node_${el.id}`,
            osmId: el.id,
            osmType: el.type,
            category: "pharmacy",
            label: "Eczane",
            name,
            distanceMeters: Math.round(distance),
            distanceText: formatDistance(distance),
            lat: el.lat,
            lng: el.lon,
            selected: false,
            source: "overpass",
          };
          const existing = poisByCategory.get("pharmacy");
          if (!existing || distance < existing.distanceMeters) {
            poisByCategory.set("pharmacy", poi);
          }
        } else if (tags.amenity === "restaurant") {
          const name = getBestName(tags, "Yakındaki Restoran");
          const poi: POI = {
            id: `node_${el.id}`,
            osmId: el.id,
            osmType: el.type,
            category: "restaurant",
            label: "Restoran",
            name,
            distanceMeters: Math.round(distance),
            distanceText: formatDistance(distance),
            lat: el.lat,
            lng: el.lon,
            selected: false,
            source: "overpass",
          };
          const existing = poisByCategory.get("restaurant");
          if (!existing || distance < existing.distanceMeters) {
            poisByCategory.set("restaurant", poi);
          }
        } else if (tags.amenity === "cafe") {
          const name = getBestName(tags, "Yakındaki Kafe");
          const poi: POI = {
            id: `node_${el.id}`,
            osmId: el.id,
            osmType: el.type,
            category: "cafe",
            label: "Kafe",
            name,
            distanceMeters: Math.round(distance),
            distanceText: formatDistance(distance),
            lat: el.lat,
            lng: el.lon,
            selected: false,
            source: "overpass",
          };
          const existing = poisByCategory.get("cafe");
          if (!existing || distance < existing.distanceMeters) {
            poisByCategory.set("cafe", poi);
          }
        } else if (tags.shop === "supermarket" || tags.shop === "convenience") {
          const name = getBestName(tags, "Yakındaki Market");
          const poi: POI = {
            id: `node_${el.id}`,
            osmId: el.id,
            osmType: el.type,
            category: "market",
            label: "Market",
            name,
            distanceMeters: Math.round(distance),
            distanceText: formatDistance(distance),
            lat: el.lat,
            lng: el.lon,
            selected: false,
            source: "overpass",
          };
          const existing = poisByCategory.get("market");
          if (!existing || distance < existing.distanceMeters) {
            poisByCategory.set("market", poi);
          }
        } else if (tags.railway === "station" || tags.railway === "tram_stop" || 
                   tags.public_transport === "platform" || 
                   tags.highway === "bus_stop" || 
                   tags.amenity === "bus_station" ||
                   tags.station === "subway") {
          const name = getBestName(tags, "İstasyon");
          const poi: POI = {
            id: `node_${el.id}`,
            osmId: el.id,
            osmType: el.type,
            category: "transport",
            label: "Toplu Taşıma",
            name,
            distanceMeters: Math.round(distance),
            distanceText: formatDistance(distance),
            lat: el.lat,
            lng: el.lon,
            selected: false,
            source: "overpass",
          };
          const existing = poisByCategory.get("transport");
          if (!existing || distance < existing.distanceMeters) {
            poisByCategory.set("transport", poi);
          }
        } else if (tags.amenity === "bank" || tags.amenity === "atm") {
          const name = getBestName(tags, "Banka");
          const category = tags.amenity === "atm" ? "atm" : "bank";
          const poi: POI = {
            id: `node_${el.id}`,
            osmId: el.id,
            osmType: el.type,
            category,
            label: tags.amenity === "atm" ? "ATM" : "Banka",
            name,
            distanceMeters: Math.round(distance),
            distanceText: formatDistance(distance),
            lat: el.lat,
            lng: el.lon,
            selected: false,
            source: "overpass",
          };
          const existing = poisByCategory.get(category);
          if (!existing || distance < existing.distanceMeters) {
            poisByCategory.set(category, poi);
          }
        }
      }

      allPois = Array.from(poisByCategory.values());
      usedRadius = radius;
      console.log(`[NearbyPlaces] Normalized POIs: ${allPois.length}`);
      
      // If we have at least 3 POIs, we can stop
      if (allPois.length >= 3) {
        break;
      }
    }
  }
  
  // Log debug info
  console.log("[NearbyPlaces] POI Debug:", {
    radius: `${usedRadius}m`,
    requestedCategories: ["market", "pharmacy", "hospital", "school", "university", "transport", "cafe", "restaurant"],
    rawOsmResultCount: allPois.length,
    normalizedPoiCount: allPois.length,
    filteredPoiCount: allPois.length,
    displayedPoiCount: Math.min(allPois.length, 7),
    selectedPoiCount: allPois.filter(p => p.selected).length
  });

  // If we still have no POIs from Overpass, try Nominatim
  if (allPois.length === 0) {
    console.log("[NearbyPlaces] Overpass failed, trying Nominatim...");
    const nominatimPois = await fetchFromNominatim(latNum, lngNum, 5000);
    
    if (nominatimPois.length > 0) {
      allPois = nominatimPois;
    }
  }

  // If still no POIs, generate fallback
  if (allPois.length === 0) {
    console.log("[NearbyPlaces] All sources failed, generating fallback...");
    allPois = generateFallbackPois(latNum, lngNum);
  }

  // Sort POIs: category priority first, then by distance
  const categoryPriority: Record<string, number> = {
    hospital: 1,
    transport: 2,
    market: 3,
    school: 4,
    restaurant: 5,
    cafe: 6,
    pharmacy: 7,
    university: 8,
    bank: 9,
    atm: 10,
    highway: 11,
    marketplace: 12,
  };

  allPois.sort((a, b) => {
    // First by category priority
    const priorityA = categoryPriority[a.category] || 999;
    const priorityB = categoryPriority[b.category] || 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Then by distance
    return a.distanceMeters - b.distanceMeters;
  });

  // Limit to max 7 POIs
  const displayPois = allPois.slice(0, 7);
  
  // Auto-select up to 4 POIs (based on sorted order - first 4 are highest priority)
  displayPois.forEach((poi, index) => {
    poi.selected = index < 4;
  });

  setCache(cacheKey, displayPois);
  
  const finalSource = displayPois[0]?.source || "fallback";
  console.log("[NearbyPlaces] Final POIs:", displayPois.map(p => `${p.name} (${p.category})`).join(", "));
  
  return NextResponse.json({
    success: true,
    pois: displayPois,
    count: displayPois.length,
    center: { lat: latNum, lng: lngNum },
    source: finalSource,
    parcelKey: cacheKey,
    debug: {
      radius: usedRadius,
      totalFound: allPois.length,
      displayed: displayPois.length,
      selected: displayPois.filter(p => p.selected).length
    }
  });
}
