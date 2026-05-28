import { NextRequest, NextResponse } from "next/server";

// Debug endpoint for testing Overpass API directly
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lon") || searchParams.get("lng") || "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({
      error: "lat and lng required",
      example: "/api/debug/overpass?lat=38.4919&lon=26.9489"
    }, { status: 400 });
  }

  const radius = 2000;

  const query = `
[out:json][timeout:30];
(
  node["amenity"~"school|hospital|clinic|pharmacy|restaurant"](around:${radius},${lat},${lng});
  way["amenity"~"school|hospital|clinic|pharmacy|restaurant"](around:${radius},${lat},${lng});
);
out center tags;
  `.trim();

  const results: Array<{
    endpoint: string;
    status: number;
    elements?: number;
    error?: string;
    responseTime?: number;
  }> = [];

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
  ];

  for (const endpoint of endpoints) {
    const startTime = Date.now();
    
    try {
      console.log(`[Debug] Testing endpoint:`, endpoint);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "SanalParsel-Debug/1.0",
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        results.push({
          endpoint,
          status: response.status,
          elements: data.elements?.length || 0,
          responseTime,
        });
        
        if (data.elements && data.elements.length > 0) {
          // Return first successful result's data
          const sampleElements = data.elements.slice(0, 5).map((el: { type: string; id: number; tags?: Record<string, string>; center?: { lat: number; lon: number }; lat?: number; lon?: number }) => ({
            type: el.type,
            id: el.id,
            tags: el.tags,
            lat: el.lat ?? el.center?.lat,
            lon: el.lon ?? el.center?.lon,
          }));

          return NextResponse.json({
            success: true,
            endpoint,
            responseTime,
            totalElements: data.elements.length,
            sampleElements,
            query,
          });
        }
      } else {
        const errorText = await response.text();
        results.push({
          endpoint,
          status: response.status,
          error: errorText.substring(0, 100),
          responseTime,
        });
      }
    } catch (err) {
      const error = err as Error;
      const responseTime = Date.now() - startTime;
      results.push({
        endpoint,
        status: 0,
        error: error.message,
        responseTime,
      });
    }
  }

  return NextResponse.json({
    success: false,
    tested: results.length,
    results,
    query,
  });
}