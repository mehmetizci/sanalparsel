import { NextRequest, NextResponse } from "next/server";

const TKGM_API_BASE = "https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api";
const TKGM_CACHE = new Map<string, { data: unknown[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ilKodu = parseInt(params.id);
    if (isNaN(ilKodu)) {
      return NextResponse.json({ error: "Geçersiz il kodu" }, { status: 400 });
    }

    const cacheKey = `ilce_${ilKodu}`;
    const cached = TKGM_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${TKGM_API_BASE}/idariYapi/ilceListe/${ilKodu}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "SanalParsel/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: "İlçe listesi alınamadı" }, { status: 500 });
    }

    const data = await response.json();

    const result: { id: number; name: string }[] = [];
    if (data?.type === "FeatureCollection" && Array.isArray(data.features)) {
      for (const feature of data.features) {
        if (feature?.type === "Feature" && feature.properties) {
          const id = Number(feature.properties.id || 0);
          // TKGM uses 'text' for name
          const name = String(feature.properties.text || feature.properties.name || "").trim();
          if (id && name) {
            result.push({ id, name });
          }
        }
      }
    }

    result.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    TKGM_CACHE.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[TKGM Ilceler] Error:", (err as Error).message);
    return NextResponse.json({ error: "İlçe listesi alınamadı" }, { status: 500 });
  }
}
