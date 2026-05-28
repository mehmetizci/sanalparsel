/**
 * Stabilized Cinematic Video Renderer - MVP Focus
 * 
 * Features:
 * - Real PNG frame generation with validation
 * - Optional Supabase storage (doesn't fail on error)
 * - Local video streaming endpoint
 * - Optimized for 30-60 second render
 * - Frame validation before FFmpeg
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import zlib from "zlib";

const execAsync = promisify(exec);

// PNG magic bytes for validation
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

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
}

if (!global.__renderQueue) {
  global.__renderQueue = new Map();
}
if (!global.__renderFiles) {
  global.__renderFiles = new Map();
}

// MVP Fast Settings
const MVP_SETTINGS = {
  width: 720,
  height: 1280,
  fps: 24,
  duration: 15,
  totalFrames: 360, // 15 * 24
  crf: 23,
  preset: "veryfast",
};

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
    // Keep only last 100 logs
    if (job.logs.length > 100) {
      job.logs = job.logs.slice(-100);
    }
  }
  
  return logLine;
}

function updateProgress(
  renderId: string,
  status: string,
  progress: number,
  phase: string,
  message: string,
  extras?: { 
    frameCount?: number; 
    totalFrames?: number; 
    outputUrl?: string;
    localPath?: string;
    fileSize?: number;
    error?: string 
  }
) {
  const existing = global.__renderQueue.get(renderId);
  global.__renderQueue.set(renderId, {
    status,
    progress,
    phase,
    message,
    frameCount: extras?.frameCount ?? existing?.frameCount ?? 0,
    totalFrames: extras?.totalFrames ?? existing?.totalFrames ?? MVP_SETTINGS.totalFrames,
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

    const isPremium = compositionProps.quality === "premium";
    const settings = isPremium 
      ? {
          width: compositionProps.width || 1080,
          height: compositionProps.height || 1920,
          fps: compositionProps.fps || 30,
          duration: compositionProps.duration || 30,
        }
      : MVP_SETTINGS;

    const totalFrames = settings.duration * settings.fps;

    global.__renderQueue.set(renderId, {
      status: "pending",
      progress: 0,
      phase: "initializing",
      message: "Render job queued",
      frameCount: 0,
      totalFrames,
      logs: [],
    });

    log(renderId, "=".repeat(60));
    log(renderId, `STABILIZED RENDER START`);
    log(renderId, `Mode: ${isPremium ? "PREMIUM" : "FAST (MVP)"}`);
    log(renderId, `Resolution: ${settings.width}x${settings.height}`);
    log(renderId, `Duration: ${settings.duration}s @ ${settings.fps}fps`);
    log(renderId, `Total frames: ${totalFrames}`);
    log(renderId, "=".repeat(60));

    executeRender(renderId, compositionProps, settings, isPremium).catch((err) => {
      log(renderId, `ERROR: ${err.message}`);
      updateProgress(renderId, "failed", 0, "error", err.message, { error: err.message });
    });

    return NextResponse.json({
      renderId,
      status: "pending",
      message: "Render job started",
      estimatedTime: Math.ceil(settings.duration * 0.4),
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

// Validate PNG file
async function validatePNG(filePath: string): Promise<{ valid: boolean; error?: string; size?: number }> {
  try {
    const stats = await fs.stat(filePath);
    
    // Minimum size check - PNG should be at least 100 bytes
    if (stats.size < 100) {
      return { valid: false, error: `File too small: ${stats.size} bytes`, size: stats.size };
    }
    
    // Maximum reasonable size check
    if (stats.size > 10 * 1024 * 1024) {
      return { valid: false, error: `File too large: ${stats.size} bytes`, size: stats.size };
    }
    
    // Check magic bytes
    const buffer = Buffer.alloc(8);
    const fd = await fs.open(filePath, "r");
    await fd.read(buffer, 0, 8, 0);
    await fd.close();
    
    const isPng = PNG_MAGIC.every((byte, i) => buffer[i] === byte);
    
    if (!isPng) {
      return { valid: false, error: "Invalid PNG magic bytes", size: stats.size };
    }
    
    return { valid: true, size: stats.size };
  } catch (error) {
    return { valid: false, error: `Validation error: ${error}` };
  }
}

// Create PNG frame
function createPNGFrame(
  width: number,
  height: number,
  frameNum: number,
  totalFrames: number,
  camera: { lat: number; lon: number; zoom: number; pitch: number; bearing: number }
): Buffer {
  const progress = frameNum / totalFrames;
  
  // Create RGBA pixel data
  const rowSize = width * 4;
  const filteredData = Buffer.alloc(height * (rowSize + 1));
  
  for (let y = 0; y < height; y++) {
    filteredData[y * (rowSize + 1)] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const idx = y * (rowSize + 1) + 1 + x * 4;
      
      // Normalized coordinates
      const nx = x / width;
      const ny = y / height;
      
      // Multi-octave noise for terrain
      const noise1 = Math.sin(nx * 6 + progress * 3) * Math.cos(ny * 4 + progress * 2);
      const noise2 = Math.sin(nx * 10 - progress * 1.5) * Math.cos(ny * 8 + progress * 1.5);
      const noise3 = Math.sin(nx * 15 + progress * 2) * Math.cos(ny * 12 - progress);
      const terrain = (noise1 + noise2 * 0.5 + noise3 * 0.25 + 3) / 3.75;
      
      // Cinematic color (dark forest green/teal)
      const baseR = 15 + terrain * 50;
      const baseG = 35 + terrain * 70;
      const baseB = 25 + terrain * 55;
      
      // Camera zoom affects brightness
      const zoomFactor = 1 + (camera.zoom - 15) * 0.1;
      
      filteredData[idx] = Math.min(255, Math.floor(baseR * zoomFactor));     // R
      filteredData[idx + 1] = Math.min(255, Math.floor(baseG * zoomFactor)); // G
      filteredData[idx + 2] = Math.min(255, Math.floor(baseB * zoomFactor)); // B
      filteredData[idx + 3] = 255; // A (opaque)
    }
  }
  
  // Compress with zlib
  const compressed = zlib.deflateSync(filteredData, { level: 5 });
  
  // Build PNG
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(6, 9);    // color type (RGBA)
  ihdr.writeUInt8(0, 10);   // compression
  ihdr.writeUInt8(0, 11);   // filter
  ihdr.writeUInt8(0, 12);    // interlace
  
  const ihdrChunk = createPNGChunk("IHDR", ihdr);
  const idatChunk = createPNGChunk("IDAT", compressed);
  const iendChunk = createPNGChunk("IEND", Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createPNGChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  const table = getCRC32Table();
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let crcTable: number[] | null = null;
function getCRC32Table(): number[] {
  if (crcTable) return crcTable;
  crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  return crcTable;
}

async function executeRender(
  renderId: string,
  props: z.infer<typeof RenderRequestSchema>["compositionProps"],
  settings: { width: number; height: number; fps: number; duration: number },
  isPremium: boolean
) {
  const tempDir = path.join(os.tmpdir(), `render_${renderId}`);
  const framesDir = path.join(tempDir, "frames");
  const outputFile = path.join(tempDir, "output.mp4");
  
  log(renderId, `Temp dir: ${tempDir}`);
  
  try {
    // ========================================
    // PHASE 1: Prepare
    // ========================================
    updateProgress(renderId, "rendering", 2, "preparing", "Preparing render...");
    await fs.mkdir(framesDir, { recursive: true });
    
    const totalFrames = settings.duration * settings.fps;
    log(renderId, `Frame count: ${totalFrames}`);
    
    // Generate camera path
    const cameraPath = generateCameraPath(
      props.parcelCenter,
      props.cameraModes,
      props.cameraFeel,
      settings.duration,
      settings.fps
    );
    
    updateProgress(renderId, "rendering", 5, "preparing", "Ready", { totalFrames });
    
    // ========================================
    // PHASE 2: Render Frames
    // ========================================
    log(renderId, "PHASE 2: Rendering PNG frames...");
    const startTime = Date.now();
    
    for (let frame = 0; frame < totalFrames; frame++) {
      const progress = 5 + (frame / totalFrames) * 70;
      const percent = Math.round(progress);
      
      // Create PNG frame
      const frameData = createPNGFrame(
        settings.width,
        settings.height,
        frame,
        totalFrames,
        cameraPath[frame]
      );
      
      // Write frame
      const framePath = path.join(framesDir, `frame_${String(frame).padStart(6, "0")}.png`);
      await fs.writeFile(framePath, frameData);
      
      // Validate PNG
      const validation = await validatePNG(framePath);
      if (!validation.valid) {
        log(renderId, `ERROR: Frame ${frame} invalid - ${validation.error}`);
        // Regenerate if invalid
        const newData = createPNGFrame(settings.width, settings.height, frame, totalFrames, cameraPath[frame]);
        await fs.writeFile(framePath, newData);
        const revalidation = await validatePNG(framePath);
        if (!revalidation.valid) {
          throw new Error(`Frame ${frame} regeneration failed: ${revalidation.error}`);
        }
        log(renderId, `Regenerated frame ${frame}`);
      }
      
      // Progress update
      if (frame % 20 === 0 || frame === totalFrames - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const fps = frame > 0 ? (frame / ((Date.now() - startTime) / 1000)).toFixed(1) : "0";
        const frameSizeKB = validation.size ? (validation.size / 1024).toFixed(0) : "0";
        
        log(renderId, `[${percent}%] Frame ${frame + 1}/${totalFrames} | ${fps} fps | ${elapsed}s | ${frameSizeKB}KB`);
        
        updateProgress(renderId, "rendering", percent, "rendering", 
          `Rendering ${frame + 1}/${totalFrames}`,
          { frameCount: frame + 1, totalFrames }
        );
      }
    }
    
    const frameTime = ((Date.now() - startTime) / 1000).toFixed(1);
    log(renderId, `Frames rendered: ${totalFrames} in ${frameTime}s (${(totalFrames / parseFloat(frameTime)).toFixed(1)} fps)`);
    
    // ========================================
    // PHASE 3: FFmpeg Encoding
    // ========================================
    updateProgress(renderId, "encoding", 78, "encoding", "Encoding video...");
    log(renderId, "PHASE 3: FFmpeg encoding...");
    
    const framePattern = path.join(framesDir, "frame_%06d.png");
    const crf = isPremium ? 18 : MVP_SETTINGS.crf;
    const preset = isPremium ? "medium" : MVP_SETTINGS.preset;
    
    const ffmpegCmd = [
      "ffmpeg", "-y",
      "-framerate", String(settings.fps),
      "-i", framePattern,
      "-c:v", "libx264",
      "-preset", preset,
      "-crf", String(crf),
      "-profile:v", "main",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-threads", "4",
      outputFile
    ].join(" ");
    
    log(renderId, `Running: ffmpeg ... -preset ${preset} -crf ${crf}`);
    
    try {
      const result = await execAsync(ffmpegCmd, { timeout: 300000 });
      
      if (result.stderr && result.stderr.includes("Error")) {
        log(renderId, `FFmpeg warning: ${result.stderr.substring(0, 300)}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "FFmpeg failed";
      log(renderId, `FFmpeg ERROR: ${errorMessage}`);
      throw new Error(`FFmpeg encoding failed: ${errorMessage}`);
    }
    
    log(renderId, "FFmpeg encoding complete");
    
    // ========================================
    // PHASE 4: Validate Output
    // ========================================
    log(renderId, "PHASE 4: Validating output...");
    
    const stats = await fs.stat(outputFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    log(renderId, `Output file: ${fileSizeMB} MB`);
    
    if (stats.size < 10000) {
      throw new Error(`Output file too small: ${stats.size} bytes`);
    }
    
    // ========================================
    // PHASE 5: Upload to Supabase (OPTIONAL)
    // ========================================
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
        log(renderId, `Supabase upload warning (non-fatal): ${error.message}`);
        // Continue - we'll use local file
      } else {
        const { data: urlData } = supabase.storage
          .from("rendered-videos")
          .getPublicUrl(storagePath);
        outputUrl = urlData.publicUrl;
        log(renderId, `Uploaded to: ${outputUrl}`);
      }
      
    } catch (uploadError) {
      log(renderId, `Upload error (non-fatal): ${uploadError}`);
      // Continue - we have local file
    }
    
    // ========================================
    // PHASE 6: Cleanup & Complete
    // ========================================
    
    // Store local path for streaming
    global.__renderFiles.set(renderId, {
      mp4Path: outputFile,
      cleanup: setTimeout(() => {
        fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        global.__renderFiles.delete(renderId);
      }, 3600000) // 1 hour TTL
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
    log(renderId, `Frames: ${totalFrames}`);
    log(renderId, `Output: ${outputUrl || "local only"}`);
    log(renderId, "=".repeat(60));
    
    // Cleanup frames (keep MP4)
    try {
      await fs.rm(framesDir, { recursive: true, force: true });
      log(renderId, "Frames cleaned up");
    } catch {}
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log(renderId, `ERROR: ${errorMessage}`);
    updateProgress(renderId, "failed", 0, "error", errorMessage, { error: errorMessage });
    throw error;
  }
}

// Generate camera path
function generateCameraPath(
  center: [number, number],
  modes: string[],
  feel: string,
  duration: number,
  fps: number
) {
  const frames: Array<{ lat: number; lon: number; zoom: number; pitch: number; bearing: number }> = [];
  const totalFrames = duration * fps;
  const framesPerMode = Math.floor(totalFrames / modes.length);
  
  const feelConfig = {
    soft: { speed: 0.6, intensity: 0.5 },
    cinematic: { speed: 1.0, intensity: 1.0 },
    dynamic: { speed: 1.5, intensity: 1.3 },
  };
  const feelData = feelConfig[feel as keyof typeof feelConfig] || feelConfig.cinematic;
  
  for (let modeIdx = 0; modeIdx < modes.length; modeIdx++) {
    const mode = modes[modeIdx] || "orbit360";
    const startFrame = modeIdx * framesPerMode;
    const endFrame = Math.min(startFrame + framesPerMode, totalFrames);
    
    for (let f = startFrame; f < endFrame; f++) {
      const t = (f - startFrame) / framesPerMode;
      const easedT = Math.min(1, t * feelData.speed);
      const smoothT = easedT * easedT * (3 - 2 * easedT);
      
      let lat = center[0], lon = center[1], zoom = 16, pitch = 55, bearing = 0;
      
      switch (mode) {
        case "orbit360": {
          const angle = smoothT * 2 * Math.PI;
          const radius = 0.0015 * feelData.intensity;
          lat = center[0] + Math.sin(angle) * radius;
          lon = center[1] + Math.cos(angle) * radius * 1.2;
          zoom = 16 - smoothT * 0.5;
          pitch = 55 + Math.sin(smoothT * Math.PI) * 8;
          bearing = smoothT * 360;
          break;
        }
        case "spiralDescend": {
          const spiralAngle = smoothT * Math.PI * 2;
          lat = center[0] + Math.sin(spiralAngle) * 0.0008 * smoothT;
          lon = center[1] + Math.cos(spiralAngle) * 0.0008 * smoothT;
          zoom = 14 + 2.5 * smoothT;
          pitch = 60 - 20 * smoothT;
          bearing = -20 + 40 * smoothT;
          break;
        }
        case "topView": {
          const drift = 0.0004;
          lat = center[0] + Math.sin(t * Math.PI * 2) * drift;
          lon = center[1] + Math.cos(t * Math.PI * 2) * drift;
          zoom = 17;
          pitch = 89;
          break;
        }
        default: {
          const angle = smoothT * Math.PI;
          lat = center[0] + Math.sin(angle) * 0.001;
          lon = center[1] + Math.cos(angle) * 0.001;
          zoom = 16;
          pitch = 55;
          bearing = smoothT * 90;
        }
      }
      
      frames.push({ lat, lon, zoom, pitch, bearing });
    }
  }
  
  // Pad to exact frame count
  while (frames.length < totalFrames) {
    frames.push(frames[frames.length - 1] || { lat: center[0], lon: center[1], zoom: 16, pitch: 55, bearing: 0 });
  }
  
  return frames;
}