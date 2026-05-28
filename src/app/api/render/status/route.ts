/**
 * Render Status API
 * 
 * GET /api/render/status?id={renderId}
 * Returns current render progress and status
 */

import { NextRequest, NextResponse } from "next/server";

// Shared render state (in production, use Redis or database)
declare global {
  // eslint-disable-next-line no-var
  var __renderQueue: Map<string, {
    status: string;
    progress: number;
    phase: string;
    outputUrl?: string;
    error?: string;
    startedAt?: string;
    completedAt?: string;
  }>;
}

// Initialize global render queue if not exists
if (!global.__renderQueue) {
  global.__renderQueue = new Map();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const renderId = searchParams.get("id");

  if (!renderId) {
    return NextResponse.json(
      { error: "Missing render ID parameter" },
      { status: 400 }
    );
  }

  const renderJob = global.__renderQueue.get(renderId);

  if (!renderJob) {
    return NextResponse.json(
      { error: "Render job not found", renderId },
      { status: 404 }
    );
  }

  return NextResponse.json({
    renderId,
    status: renderJob.status,
    progress: renderJob.progress,
    phase: renderJob.phase,
    outputUrl: renderJob.outputUrl,
    error: renderJob.error,
    startedAt: renderJob.startedAt,
    completedAt: renderJob.completedAt,
  });
}