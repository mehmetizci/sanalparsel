import { NextRequest, NextResponse } from "next/server";

const TKGM_API_BASE = "https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api";
const TKGM_CACHE = new Map<string, { data: unknown[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24;

export async function GET(request: NextRequest) {
  try {
    // Check cache
    const cached = TKGM_CACHE.get("iller");
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${TKGM_API_BASE}/idariYapi/ilListe`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "SanalParsel/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: "İl listesi alınamadı" }, { status: 500 });
    }

    const data = await response.json();

    // Parse FeatureCollection
    const result: { id: number; name: string }[] = [];
    if (data?.type === "FeatureCollection" && Array.isArray(data.features)) {
      for (const feature of data.features) {
        if (feature?.type === "Feature" && feature.properties) {
          const id = Number(feature.properties.id || 0);
          const name = String(feature.properties.name || feature.properties.adi || "").trim();
          if (id && name) {
            result.push({ id, name });
          }
        }
      }
    }

    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name, "tr"));

    // Cache result
    TKGM_CACHE.set("iller", { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[TKGM Iller] Error:", (err as Error).message);
    return NextResponse.json({ error: "İl listesi alınamadı" }, { status: 500 });
  }
}
