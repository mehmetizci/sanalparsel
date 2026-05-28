/**
 * Video Streaming Endpoint
 * 
 * Serves rendered MP4 files from local temp directory.
 * Works even if Supabase upload failed.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const renderId = searchParams.get("id");

  if (!renderId) {
    return NextResponse.json({ error: "Missing render ID" }, { status: 400 });
  }

  // Get local path from render queue
  const job = global.__renderQueue?.get(renderId);
  const localPath = job?.localPath;

  if (!localPath) {
    // Try to find in render files map
    const fileInfo = global.__renderFiles?.get(renderId);
    if (!fileInfo) {
      return NextResponse.json({ error: "Render not found or expired" }, { status: 404 });
    }
  }

  const mp4Path = localPath || global.__renderFiles?.get(renderId)?.mp4Path;

  if (!mp4Path) {
    return NextResponse.json({ error: "Video file not found" }, { status: 404 });
  }

  try {
    // Check if file exists
    await fs.access(mp4Path);

    // Get file stats
    const stats = await fs.stat(mp4Path);
    const fileSize = stats.size;

    // Read file
    const fileBuffer = await fs.readFile(mp4Path);

    // Log the request
    console.log(`[VideoStream] Serving ${renderId}: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Return as video stream
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(fileSize),
        "Content-Disposition": `inline; filename="render_${renderId}.mp4"`,
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
      },
    });

  } catch (error) {
    console.error(`[VideoStream] Error serving ${renderId}:`, error);
    return NextResponse.json({ error: "Failed to read video file" }, { status: 500 });
  }
}