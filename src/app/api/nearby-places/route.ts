import { NextRequest, NextResponse } from "next/server";

// Overpass API endpoints (with fallback)
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// Overpass query for nearby places
function buildOverpassQuery(lat: number, lng: number, radius: number = 3000): string {
  return `[out:json][timeout:25][maxsize:1073741824];
(
  node["amenity"="hospital"](around:${radius},${lat},${lng});
  node["amenity"="school"](around:${radius},${lat},${lng});
  node["amenity"="university"](around:${radius},${lat},${lng});
  node["amenity"="pharmacy"](around:${radius},${lat},${lng});
  node["shop"="supermarket"](around:${radius},${lat},${lng});
  node["railway"="station"](around:${radius},${lat},${lng});
  node["leisure"="park"](around:${radius},${lat},${lng});
  node["amenity"="bank"](around:${radius},${lat},${lng});
  node["amenity"="place_of_worship"](around:${radius},${lat},${lng});
  way["highway"="primary"](around:${radius},${lat},${lng});
);
out center;`;
}

// Haversine distance calculation
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Map OSM amenity to POI type
function mapOsmTypeToPoiType(tags: Record<string, string>): string {
  const amenity = tags.amenity || tags.shop || tags.leisure || tags.highway || "";
  
  const mapping: Record<string, string> = {
    "hospital": "hospital",
    "school": "school",
    "university": "university",
    "pharmacy": "pharmacy",
    "supermarket": "market",
    "station": "transport",
    "park": "park",
    "bank": "bank",
    "place_of_worship": "mosque",
    "primary": "highway",
  };
  
  return mapping[amenity] || "market";
}

// Fallback names for POI types
const FALLBACK_NAMES: Record<string, string> = {
  "hospital": "Yakındaki Hastane",
  "school": "Yakındaki Okul",
  "university": "Yakındaki Üniversite",
  "pharmacy": "Yakındaki Eczane",
  "market": "Yakındaki Market",
  "transport": "Yakındaki İstasyon",
  "park": "Yakındaki Park",
  "bank": "Yakındaki Banka",
  "mosque": "Yakındaki Cami",
  "highway": "Yakındaki Ana Yol",
};

// Check if error is rate limiting
function isRateLimitError(statusCode: number, body: string): boolean {
  return statusCode === 429 || 
         statusCode === 406 || 
         body.includes("rate") || 
         body.includes("quota") ||
         body.includes("Too Many Requests");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "3000";

  // Validate coordinates
  if (!lat || !lng) {
    console.error("[NearbyPlaces] Missing coordinates:", { lat, lng });
    return NextResponse.json(
      { error: "Parsel koordinatı bulunamadı", code: "MISSING_COORDS" },
      { status: 400 }
    );
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusNum = parseInt(radius, 10);

  if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
    console.error("[NearbyPlaces] Invalid coordinates:", { lat, lng, radius });
    return NextResponse.json(
      { error: "Geçersiz koordinat formatı", code: "INVALID_COORDS" },
      { status: 400 }
    );
  }

  // Validate coordinate ranges
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    console.error("[NearbyPlaces] Coordinates out of range:", { lat: latNum, lng: lngNum });
    return NextResponse.json(
      { error: "Koordinatlar geçerli aralıkta değil", code: "OUT_OF_RANGE" },
      { status: 400 }
    );
  }

  console.log(`[NearbyPlaces] Fetching POIs for ${latNum}, ${lngNum}, radius: ${radiusNum}m`);

  const query = buildOverpassQuery(latNum, lngNum, radiusNum);

  // Try each Overpass endpoint
  
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`[NearbyPlaces] Trying endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: query,
        signal: AbortSignal.timeout(15000),
      });

      const responseText = await response.text();

      if (isRateLimitError(response.status, responseText)) {
        console.warn(`[NearbyPlaces] Rate limited or blocked by ${endpoint}: ${response.status}`);
        continue;
      }

      if (!response.ok) {
        console.error(`[NearbyPlaces] Overpass error ${response.status}:`, responseText.substring(0, 200));
        continue;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(`[NearbyPlaces] Invalid JSON from ${endpoint}`);
        continue;
      }

      console.log(`[NearbyPlaces] Got ${data.elements?.length || 0} elements from Overpass`);

      // Process elements
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const poisByType = new Map<string, any>();
      const elements = data.elements || [];

      for (const element of elements) {
        let elLat = element.lat;
        let elLon = element.lon;

        if (element.type === "way" && element.center) {
          elLat = element.center.lat;
          elLon = element.center.lon;
        }

        if (!elLat || !elLon) continue;

        const tags = element.tags || {};
        const poiType = mapOsmTypeToPoiType(tags);
        const distance = haversineDistance(latNum, lngNum, elLat, elLon);
        
        const name = tags.name || tags["name:tr"] || tags.short_name || FALLBACK_NAMES[poiType] || "Bilinmeyen";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const poi: any = {
          id: `poi_${element.id}`,
          type: poiType,
          name,
          distance: Math.round(distance),
          distanceText: formatDistance(distance),
          lat: elLat,
          lng: elLon,
          selected: false,
        };

        const existing = poisByType.get(poiType);
        if (!existing || distance < existing.distance) {
          poisByType.set(poiType, poi);
        }
      }

      const pois = Array.from(poisByType.values()).sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);
      pois.slice(0, 5).forEach((poi: { selected: boolean }) => poi.selected = true);

      console.log(`[NearbyPlaces] Processed ${pois.length} unique POIs`);
      
      return NextResponse.json({
        success: true,
        pois,
        count: pois.length,
        center: { lat: latNum, lng: lngNum },
        source: endpoint,
      });

    } catch (error: unknown) {
      const err = error as Error;
      console.error(`[NearbyPlaces] Endpoint ${endpoint} failed:`, err.message);
      continue;
    }
  }

  // All endpoints failed - return demo POIs for Turkish locations
  console.warn("[NearbyPlaces] All Overpass endpoints failed, returning demo data");
  
  // Generate demo POIs based on coordinates (Turkey-specific defaults)
  const demoPois = generateDemoPois(latNum, lngNum);
  
  return NextResponse.json({
    success: true,
    pois: demoPois,
    count: demoPois.length,
    center: { lat: latNum, lng: lngNum },
    source: "demo",
  });
}

// Generate demo POIs for when API fails
function generateDemoPois(lat: number, lng: number) {
  const demoData = [
    { type: "hospital", name: "Devlet Hastanesi", baseDistance: 800 },
    { type: "school", name: "İlkokul", baseDistance: 400 },
    { type: "market", name: "Süpermarket", baseDistance: 250 },
    { type: "pharmacy", name: "Eczane", baseDistance: 350 },
    { type: "transport", name: "Otobüs Durağı", baseDistance: 150 },
    { type: "park", name: "Park", baseDistance: 500 },
  ];

  return demoData.map((item, index) => {
    const distanceVariation = Math.random() * 200 - 100;
    const distance = Math.max(50, item.baseDistance + distanceVariation);
    
    return {
      id: `demo_${index}`,
      type: item.type,
      name: item.name,
      distance: Math.round(distance),
      distanceText: formatDistance(distance),
      lat: lat + (Math.random() - 0.5) * 0.005,
      lng: lng + (Math.random() - 0.5) * 0.005,
      selected: index < 4,
    };
  }).sort((a, b) => a.distance - b.distance);
}