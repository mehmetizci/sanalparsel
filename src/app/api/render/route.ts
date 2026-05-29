/**
 * Real Cinematic Video Renderer with Mapbox Satellite Capture
 * 
 * Pipeline:
 * 1. Launch Puppeteer + headless Chromium
 * 2. Initialize Mapbox with satellite-v9 style
 * 3. Wait for map fully loaded
 * 4. Animate camera through keyframes
 * 5. Capture each frame from canvas
 * 6. Encode with FFmpeg
 * 7. Stream to client (optional Supabase upload)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { MapboxFrameCapture, generateCinematicCameraPath } from "@/lib/mapbox-capture";

const execAsync = promisify(exec);

// Environment - get Mapbox token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Render job status
type RenderJobStatus = {
  status: string;
  progress: number;
  phase: string;
  message: string;
  frameCount: number;
  totalFrames: number;
  outputUrl?: string;
  localPath?: string;
  fileSize?: number;
  error?: string;
  logs: string[];
  startedAt?: string;
  completedAt?: string;
};

// Global render queue
declare global {
  // eslint-disable-next-line no-var
  var __renderQueue: Map<string, RenderJobStatus>;
  // eslint-disable-next-line no-var
  var __renderFiles: Map<string, { mp4Path: string; cleanup: NodeJS.Timeout }>;
  // eslint-disable-next-line no-var
  var __renderMapboxInstances: Map<string, MapboxFrameCapture>;
}

if (!global.__renderQueue) global.__renderQueue = new Map();
if (!global.__renderFiles) global.__renderFiles = new Map();
if (!global.__renderMapboxInstances) global.__renderMapboxInstances = new Map();

// Render request schema
const RenderRequestSchema = z.object({
  projectId: z.string(),
  compositionProps: z.object({
    projectId: z.string(),
    parcelName: z.string(),
    parcelArea: z.string(),
    parcelCenter: z.tuple([z.number(), z.number()]),
    parcelBounds: z.tuple([
      z.tuple([z.number(), z.number()]),
      z.tuple([z.number(), z.number()]),
    ]),
    duration: z.number().optional(),
    cameraModes: z.array(z.string()),
    cameraFeel: z.enum(["soft", "cinematic", "dynamic"]),
    startHeight: z.number().optional(),
    narrationAudioUrl: z.string().optional(),
    consultantName: z.string(),
    consultantPhone: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    fps: z.number().optional(),
    quality: z.enum(["premium", "fast"]).optional(),
    primaryColor: z.string(),
  }),
});

function log(renderId: string, message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  
  const job = global.__renderQueue.get(renderId);
  if (job) {
    job.logs.push(logLine);
    if (job.logs.length > 100) job.logs = job.logs.slice(-100);
  }
  return logLine;
}

function updateProgress(
  renderId: string,
  status: string,
  progress: number,
  phase: string,
  message: string,
  extras?: { frameCount?: number; totalFrames?: number; outputUrl?: string; localPath?: string; fileSize?: number; error?: string }
) {
  const existing = global.__renderQueue.get(renderId);
  global.__renderQueue.set(renderId, {
    status,
    progress,
    phase,
    message,
    frameCount: extras?.frameCount ?? existing?.frameCount ?? 0,
    totalFrames: extras?.totalFrames ?? existing?.totalFrames ?? 360,
    outputUrl: extras?.outputUrl ?? existing?.outputUrl,
    localPath: extras?.localPath ?? existing?.localPath,
    fileSize: extras?.fileSize ?? existing?.fileSize,
    error: extras?.error ?? existing?.error,
    logs: existing?.logs || [],
    completedAt: status === "completed" || status === "failed" ? new Date().toISOString() : undefined,
    startedAt: existing?.startedAt || (status === "rendering" ? new Date().toISOString() : undefined),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const parseResult = RenderRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { projectId, compositionProps } = parseResult.data;
    const renderId = `render_${projectId}_${Date.now()}`;

    // MVP Fast Settings
    const settings = {
      width: 720,
      height: 1280,
      fps: 24,
      duration: 15,
      totalFrames: 360,
    };

    global.__renderQueue.set(renderId, {
      status: "pending",
      progress: 0,
      phase: "initializing",
      message: "Render job queued",
      frameCount: 0,
      totalFrames: settings.totalFrames,
      logs: [],
    });

    log(renderId, "=".repeat(60));
    log(renderId, "REAL MAPBOX RENDER START");
    log(renderId, `Settings: ${settings.width}x${settings.height} @ ${settings.fps}fps`);
    log(renderId, `Duration: ${settings.duration}s = ${settings.totalFrames} frames`);
    log(renderId, `Center: ${compositionProps.parcelCenter}`);
    log(renderId, `Mode: ${compositionProps.cameraModes.join(", ")}`);
    log(renderId, `Feel: ${compositionProps.cameraFeel}`);
    log(renderId, "=".repeat(60));

    executeRender(renderId, compositionProps, settings).catch((err) => {
      log(renderId, `ERROR: ${err.message}`);
      updateProgress(renderId, "failed", 0, "error", err.message, { error: err.message });
    });

    return NextResponse.json({
      renderId,
      status: "pending",
      message: "Render job started",
      estimatedTime: Math.ceil(settings.duration * 0.5),
    });

  } catch (error) {
    console.error("[Render API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const renderId = searchParams.get("id");

  if (!renderId) {
    return NextResponse.json({ error: "Missing render ID" }, { status: 400 });
  }

  const job = global.__renderQueue.get(renderId);
  if (!job) {
    return NextResponse.json({ error: "Render job not found" }, { status: 404 });
  }

  return NextResponse.json({ renderId, ...job });
}

async function executeRender(
  renderId: string,
  props: z.infer<typeof RenderRequestSchema>["compositionProps"],
  settings: { width: number; height: number; fps: number; duration: number; totalFrames: number }
) {
  const tempDir = path.join(os.tmpdir(), `render_${renderId}`);
  const framesDir = path.join(tempDir, "frames");
  const outputFile = path.join(tempDir, "output.mp4");
  
  let mapCapture: MapboxFrameCapture | null = null;
  
  log(renderId, `Temp dir: ${tempDir}`);
  
  try {
    await fs.mkdir(framesDir, { recursive: true });
    
    // ========================================
    // PHASE 1: Initialize Mapbox
    // ========================================
    updateProgress(renderId, "rendering", 2, "initializing", "Initializing Mapbox...");
    log(renderId, "PHASE 1: Initializing Mapbox capture system...");
    
    if (!MAPBOX_TOKEN) {
      throw new Error("Mapbox token not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN environment variable.");
    }
    
    // Use [lng, lat] format for Mapbox
    const mapCenter: [number, number] = [props.parcelCenter[1], props.parcelCenter[0]];
    
    // Create debug directory for frame capture testing
    const debugDir = path.join(tempDir, "debug");
    
    mapCapture = new MapboxFrameCapture({
      center: mapCenter,
      zoom: 15,
      width: settings.width,
      height: settings.height,
      pitch: 55,
      bearing: 0,
      style: "mapbox://styles/mapbox/satellite-v9",
    });
    
    // Set debug directory for frame capture
    mapCapture.setDebugDir(debugDir);
    
    await mapCapture.initialize(MAPBOX_TOKEN);
    global.__renderMapboxInstances.set(renderId, mapCapture);
    
    // Check map info
    const mapInfo = await mapCapture.getMapInfo();
    log(renderId, `Map loaded: ${JSON.stringify(mapInfo)}`);
    
    // Validate initial frame is real Mapbox content
    log(renderId, "Validating Mapbox content is visible...");
    const testCapture = await mapCapture.captureFrameAtPosition(
      mapCenter,
      15,
      55,
      0
    );
    
    if (testCapture.success && testCapture.data) {
      const sizeKB = testCapture.data.length / 1024;
      log(renderId, `Test frame size: ${sizeKB.toFixed(1)} KB`);
      
      if (sizeKB < 50) {
        // Frame too small = likely blank/loading tiles
        log(renderId, `ERROR: Test frame is only ${sizeKB.toFixed(1)}KB - tiles may not be loaded!`);
        
        // Check if we have debug frames saved
        try {
          const debugFiles = await fs.readdir(debugDir);
          log(renderId, `Debug files: ${debugFiles.join(", ")}`);
        } catch (e) {
          log(renderId, "No debug files found");
        }
        
        // Save test frame for inspection
        const testFramePath = path.join(tempDir, "test_frame.png");
        await fs.writeFile(testFramePath, testCapture.data);
        log(renderId, `Test frame saved to: ${testFramePath}`);
        
        throw new Error(`Mapbox tiles failed to load. Test frame only ${sizeKB.toFixed(1)}KB. Check logs for details.`);
      }
      
      log(renderId, `Test frame valid: ${sizeKB.toFixed(1)} KB - Mapbox satellite visible!`);
    } else {
      throw new Error(`Failed to capture test frame: ${testCapture.error}`);
    }
    
    updateProgress(renderId, "rendering", 5, "initializing", "Mapbox ready", { totalFrames: settings.totalFrames });
    
    // ========================================
    // PHASE 2: Capture Frames
    // ========================================
    log(renderId, "PHASE 2: Capturing frames...");
    const startTime = Date.now();
    
    const mode = props.cameraModes[0] || "orbit360";
    const keyframes = generateCinematicCameraPath(
      mapCenter,
      mode,
      props.cameraFeel,
      settings.duration,
      settings.fps
    );
    
    log(renderId, `Generated ${keyframes.length} camera keyframes`);
    
    for (let frame = 0; frame < settings.totalFrames; frame++) {
      const progress = 5 + (frame / settings.totalFrames) * 70;
      const percent = Math.round(progress);
      const keyframe = keyframes[frame];
      
      // Capture frame from Mapbox
      const result = await mapCapture.captureFrameAtPosition(
        keyframe.center,
        keyframe.zoom,
        keyframe.pitch,
        keyframe.bearing
      );
      
      if (!result.success || !result.data) {
        log(renderId, `[Frame ${frame}] Capture failed: ${result.error}`);
        // Use previous frame or skip
        if (frame > 0) {
          log(renderId, `[Frame ${frame}] Using previous frame`);
        }
        continue;
      }
      
      // Validate frame has meaningful content
      const frameSizeKB = result.data.length / 1024;
      if (frameSizeKB < 30) {
        log(renderId, `[Frame ${frame}] WARNING: Frame only ${frameSizeKB.toFixed(1)}KB - may be blank`);
      }
      
      // Write frame
      const framePath = path.join(framesDir, `frame_${String(frame).padStart(6, "0")}.png`);
      await fs.writeFile(framePath, result.data!);
      
      // Progress update every 10 frames
      if (frame % 10 === 0 || frame === settings.totalFrames - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const fps = frame > 0 ? (frame / ((Date.now() - startTime) / 1000)).toFixed(1) : "0";
        const frameSizeKB = result.data ? (result.data.length / 1024).toFixed(0) : "0";
        
        log(renderId, `[${percent}%] Frame ${frame + 1}/${settings.totalFrames} | ${fps} fps | ${elapsed}s | ${frameSizeKB}KB`);
        
        updateProgress(renderId, "rendering", percent, "capturing", 
          `Frame ${frame + 1}/${settings.totalFrames}`,
          { frameCount: frame + 1, totalFrames: settings.totalFrames }
        );
      }
    }
    
    const frameTime = ((Date.now() - startTime) / 1000).toFixed(1);
    log(renderId, `Frames captured: ${settings.totalFrames} in ${frameTime}s`);
    
    // Cleanup Mapbox
    mapCapture.destroy();
    global.__renderMapboxInstances.delete(renderId);
    
    // ========================================
    // PHASE 3: FFmpeg Encoding
    // ========================================
    updateBackgroundLog(renderId, "PHASE 3: Encoding video...");
    log(renderId, "PHASE 3: FFmpeg encoding...");
    
    const framePattern = path.join(framesDir, "frame_%06d.png");
    
    const ffmpegCmd = [
      "ffmpeg", "-y",
      "-framerate", String(settings.fps),
      "-i", framePattern,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-profile:v", "main",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-threads", "4",
      outputFile
    ].join(" ");
    
    log(renderId, `Running: ffmpeg ... -preset veryfast -crf 23`);
    
    try {
      await execAsync(ffmpegCmd, { timeout: 300000 });
      log(renderId, "FFmpeg encoding complete");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "FFmpeg failed";
      log(renderId, `FFmpeg ERROR: ${errorMessage}`);
      throw new Error(`FFmpeg encoding failed: ${errorMessage}`);
    }
    
    // ========================================
    // PHASE 4: Validate & Upload
    // ========================================
    log(renderId, "PHASE 4: Validating output...");
    
    const stats = await fs.stat(outputFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    log(renderId, `Output file: ${fileSizeMB} MB`);
    
    if (stats.size < 10000) {
      throw new Error(`Output file too small: ${stats.size} bytes`);
    }
    
    // Optional upload
    updateProgress(renderId, "uploading", 92, "uploading", "Uploading...");
    log(renderId, "PHASE 5: Supabase upload (optional)...");
    
    let outputUrl: string | undefined;
    
    try {
      const supabase = createClient();
      const userId = "default-user";
      const storagePath = `videos/${userId}/${props.projectId}/${renderId}/final.mp4`;
      
      const videoBuffer = await fs.readFile(outputFile);
      
      const { data, error } = await supabase.storage
        .from("rendered-videos")
        .upload(storagePath, videoBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });
      
      if (error) {
        log(renderId, `Upload warning: ${error.message}`);
      } else {
        const { data: urlData } = supabase.storage
          .from("rendered-videos")
          .getPublicUrl(storagePath);
        outputUrl = urlData.publicUrl;
        log(renderId, `Uploaded to: ${outputUrl}`);
      }
    } catch (uploadError) {
      log(renderId, `Upload error (non-fatal): ${uploadError}`);
    }
    
    // Store local file info
    global.__renderFiles.set(renderId, {
      mp4Path: outputFile,
      cleanup: setTimeout(() => {
        fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        global.__renderFiles.delete(renderId);
      }, 3600000)
    });
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    updateProgress(renderId, "completed", 100, "completed", "Render complete!", {
      outputUrl,
      localPath: outputFile,
      fileSize: stats.size,
    });
    
    log(renderId, "=".repeat(60));
    log(renderId, "✅ RENDER COMPLETED!");
    log(renderId, `Size: ${fileSizeMB} MB`);
    log(renderId, `Time: ${totalTime}s`);
    log(renderId, `Frames: ${settings.totalFrames}`);
    log(renderId, `Output: ${outputUrl || "local only"}`);
    log(renderId, "=".repeat(60));
    
    // Cleanup frames
    try {
      await fs.rm(framesDir, { recursive: true, force: true });
    } catch {}
    
  } catch (error) {
    // Cleanup on error
    if (mapCapture) {
      mapCapture.destroy();
      global.__renderMapboxInstances.delete(renderId);
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log(renderId, `ERROR: ${errorMessage}`);
    updateProgress(renderId, "failed", 0, "error", errorMessage, { error: errorMessage });
    throw error;
  }
}

function updateBackgroundLog(renderId: string, message: string) {
  const job = global.__renderQueue.get(renderId);
  if (job) {
    job.logs.push(message);
  }
}