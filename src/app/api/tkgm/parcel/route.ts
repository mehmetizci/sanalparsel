import { NextRequest, NextResponse } from "next/server";

const TKGM_API_BASE = "https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mahalleKodu, adaNo, parselNo } = body;
    
    if (!mahalleKodu || !adaNo || !parselNo) {
      return NextResponse.json({ 
        success: false, 
        error: "Mahalle kodu, ada ve parsel numarası gerekli" 
      }, { status: 400 });
    }
    
    console.log(`[TKGM Parcel] Query: mahalle=${mahalleKodu}, ada=${adaNo}, parsel=${parselNo}`);
    
    const endpoint = `${TKGM_API_BASE}/parsel/${mahalleKodu}/${adaNo}/${parselNo}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "SanalParsel/1.0",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: data.Message || "Parsel bulunamadı",
        code: "NOT_FOUND"
      }, { status: 404 });
    }
    
    if (data.Message) {
      return NextResponse.json({ 
        success: false, 
        error: data.Message,
        code: "API_MESSAGE"
      }, { status: 400 });
    }
    
    if (data.type !== "Feature") {
      return NextResponse.json({ 
        success: false, 
        error: "Geometri alınamadı",
        code: "NO_GEOMETRY"
      }, { status: 400 });
    }
    
    const props = data.properties || {};
    const geom = data.geometry || {};
    
    // First, try to get area from TKGM properties
    let areaM2: number | null = null;
    const rawAlan = props.alan;
    
    if (rawAlan !== undefined && rawAlan !== null && rawAlan !== 0) {
      // Parse area from TKGM - can be string like "4.207,00" or number
      if (typeof rawAlan === "string") {
        const trimmed = rawAlan.trim();
        if (trimmed && trimmed !== "0" && trimmed !== "0.00" && trimmed !== "0,00") {
          // Turkish format: "4.207,00" => 4207
          const normalized = trimmed.replace(/\./g, "").replace(",", ".");
          const parsed = parseFloat(normalized);
          if (Number.isFinite(parsed) && parsed > 0) {
            areaM2 = parsed;
          }
        }
      } else if (typeof rawAlan === "number" && rawAlan > 0) {
        areaM2 = rawAlan;
      }
    }
    
    // Calculate center from polygon
    let centerLat = 0, centerLng = 0;
    
    if (geom.type === "Polygon" && geom.coordinates?.[0]) {
      const ring = geom.coordinates[0];
      let sumLat = 0, sumLng = 0;
      
      for (const c of ring) {
        sumLng += c[0];
        sumLat += c[1];
      }
      
      if (ring.length > 0) {
        centerLat = sumLat / ring.length;
        centerLng = sumLng / ring.length;
      }
      
      // If no area from TKGM, calculate from geometry using spherical approximation
      if (areaM2 === null && ring.length >= 3) {
        let area = 0;
        for (let i = 0; i < ring.length - 1; i++) {
          const j = i + 1;
          const lat1Rad = ring[i][1] * Math.PI / 180;
          const lat2Rad = ring[j][1] * Math.PI / 180;
          const dLon = (ring[j][0] - ring[i][0]) * Math.PI / 180;
          area += dLon * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
        }
        const EARTH_RADIUS = 6371000;
        areaM2 = Math.abs(area * EARTH_RADIUS * EARTH_RADIUS / 2);
      }
    }
    
    const geojsonFeature = {
      type: "Feature",
      properties: {
        Il: props.ilAd || "",
        Ilce: props.ilceAd || "",
        Mahalle: props.mahalleAd || "",
        Ada: String(props.adaNo || adaNo),
        ParselNo: String(props.parselNo || parselNo),
        Alan: areaM2 !== null ? String(Math.round(areaM2)) : "",
        Nitelik: props.nitelik || "",
        Pafta: props.pafta || "",
      },
      geometry: geom,
    };
    
    return NextResponse.json({
      success: true,
      parcel: {
        adaNo: Number(props.adaNo || adaNo),
        parselNo: Number(props.parselNo || parselNo),
        alan: areaM2 !== null ? Math.round(areaM2).toString() : "",
        nitelik: props.nitelik || "",
        pafta: props.pafta || "",
        il: props.ilAd || "",
        ilce: props.ilceAd || "",
        mahalle: props.mahalleAd || "",
        geometri: geojsonFeature,
        center: { lat: centerLat, lng: centerLng },
      },
    });
    
  } catch (err) {
    const error = err as Error;
    console.log("[TKGM Parcel] Error:", error.message);
    
    if (error.name === "AbortError") {
      return NextResponse.json({ 
        success: false, 
        error: "Parsel sorgusu zaman aşımına uğradı",
        code: "TIMEOUT"
      }, { status: 504 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: "Parsel sorgulanamadı",
      code: "QUERY_ERROR"
    }, { status: 500 });
  }
}
