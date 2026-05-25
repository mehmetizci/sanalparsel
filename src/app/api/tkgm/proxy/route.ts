import { NextRequest, NextResponse } from "next/server";

const TKGM_API_BASE = "https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");
  
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint gerekli" }, { status: 400 });
  }
  
  if (!endpoint.startsWith(TKGM_API_BASE)) {
    return NextResponse.json({ error: "Geçersiz API endpoint" }, { status: 400 });
  }
  
  try {
    console.log("[TKGM Proxy] Fetching:", endpoint);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "SanalParsel/1.0",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Log error if needed
      return NextResponse.json({ error: `TKGM API error: ${response.status}` }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (err) {
    const error = err as Error;
    if (error.name === "AbortError") {
      return NextResponse.json({ error: "İstek zaman aşımına uğradı" }, { status: 504 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
