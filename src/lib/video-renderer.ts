/**
 * Video rendering pipeline using FFmpeg for frame-by-frame encoding.
 * 
 * This module handles:
 * - Frame sequencing from MapLibre canvas captures
 * - FFmpeg command generation for H264 encoding
 * - Progress tracking during rendering
 * 
 * Note: Actual FFmpeg execution happens server-side or via a render worker.
 * This client-side module prepares the data and generates commands.
 */

import type { RenderOptions } from "./cinematic-renderer";

// ─── Constants ────────────────────────────────────────────────────────────────

export const VIDEO_DEFAULTS: Required<RenderOptions> = {
  fps: 30,
  bitrate: 20, // Mbps
  duration: 30000, // ms
  width: 1920,
  height: 1080,
};

export const CODEC_PRESETS = {
  /** High quality, larger file size */
  high: {
    preset: "slow" as const,
    crf: 18,
    profile: "high" as const,
    level: "4.2" as const,
  },
  /** Balanced quality and speed */
  balanced: {
    preset: "medium" as const,
    crf: 22,
    profile: "high" as const,
    level: "4.1" as const,
  },
  /** Fast encoding, smaller file */
  fast: {
    preset: "fast" as const,
    crf: 26,
    profile: "main" as const,
    level: "4.0" as const,
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RenderJob {
  id: string;
  projectId: string;
  frames: Uint8ClampedArray[]; // RGBA frame data
  options: Required<RenderOptions>;
  status: "pending" | "rendering" | "encoding" | "completed" | "failed";
  progress: number; // 0-100
  outputUrl?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface FrameManifest {
  frameCount: number;
  width: number;
  height: number;
  fps: number;
  duration: number;
  format: "rgba" | "rgb24" | "yuv420p";
  codec: string;
  bitrate: number;
}

// ─── FFmpeg command generation ───────────────────────────────────────────────

export interface FFmpegCommandOptions {
  inputPattern: string; // e.g., "frames/frame_%06d.png"
  output: string; // e.g., "output.mp4"
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  preset?: keyof typeof CODEC_PRESETS;
  pixFmt?: "yuv420p" | "yuv444p" | "rgb24";
  additionalArgs?: string[];
}

/**
 * Generate FFmpeg command for encoding a sequence of PNG frames to H264 MP4.
 */
export function generateFFmpegCommand(options: FFmpegCommandOptions): string {
  const {
    inputPattern,
    output,
    width,
    height,
    fps,
    bitrate,
    preset = "balanced",
    pixFmt = "yuv420p",
    additionalArgs = [],
  } = options;

  const codecConfig = CODEC_PRESETS[preset];

  const args = [
    // Input settings
    "-framerate", String(fps),
    "-i", inputPattern,
    
    // Output settings
    "-c:v", "libx264",
    "-preset", codecConfig.preset,
    "-crf", String(codecConfig.crf),
    "-profile:v", codecConfig.profile,
    "-level", codecConfig.level,
    
    // Resolution
    "-vf", `scale=${width}:${height}`,
    
    // Frame rate
    "-r", String(fps),
    
    // Bitrate (minimum 20Mbps as specified)
    "-b:v", `${bitrate}M`,
    "-maxrate", `${Math.ceil(bitrate * 1.5)}M`,
    "-bufsize", `${Math.ceil(bitrate * 2)}M`,
    
    // Pixel format
    "-pix_fmt", pixFmt,
    
    // GOP size for better streaming (keyframe every 60 frames at 30fps)
    "-g", "60",
    "-keyint_min", "60",
    
    // Additional quality settings
    "-movflags", "+faststart", // Enable fast start for web playback
    
    // Output file
    output,
    ...additionalArgs,
  ];

  return `ffmpeg ${args.join(" ")}`;
}

/**
 * Generate FFmpeg command for encoding RGBA raw frames.
 */
export function generateRawFFmpegCommand(
  inputWidth: number,
  inputHeight: number,
  frameCount: number,
  fps: number,
  outputPath: string,
  options: {
    bitrate?: number;
    preset?: keyof typeof CODEC_PRESETS;
  } = {}
): string {
  const { bitrate = 20, preset = "balanced" } = options;
  const codecConfig = CODEC_PRESETS[preset];

  return [
    "ffmpeg",
    // Raw input
    "-f", "rawvideo",
    "-pix_fmt", "rgba",
    "-s", `${inputWidth}x${inputHeight}`,
    "-r", String(fps),
    "-i", "pipe:0",
    
    // Encoding
    "-c:v", "libx264",
    "-preset", codecConfig.preset,
    "-crf", String(codecConfig.crf),
    "-pix_fmt", "yuv420p",
    
    // Bitrate
    "-b:v", `${bitrate}M`,
    
    // Output
    "-y", outputPath,
  ].join(" ");
}

// ─── Frame utilities ──────────────────────────────────────────────────────────

/**
 * Convert ImageData to PNG buffer suitable for FFmpeg input.
 */
export function imageDataToPNG(imageData: ImageData): Uint8Array {
  // Create canvas for conversion
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);

  // Get PNG data
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  
  // Decode base64 to Uint8Array
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes;
}

/**
 * Create a video from frame array using canvas + MediaRecorder as fallback.
 * Note: This creates WebM, not H264. For H264, use the FFmpeg pipeline.
 */
export async function createWebMVideo(
  frames: ImageData[],
  options: { fps?: number; width?: number; height?: number } = {}
): Promise<Blob> {
  const { fps = 30, width = frames[0]?.width ?? 1920, height = frames[0]?.height ?? 1080 } = options;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(fps);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: 20 * 1000000,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: "video/webm" }));
    };

    mediaRecorder.start();

    // Render frames
    let frameIndex = 0;
    const frameDuration = 1000 / fps;

    const renderFrame = () => {
      if (frameIndex >= frames.length) {
        setTimeout(() => mediaRecorder.stop(), frameDuration);
        return;
      }

      ctx.putImageData(frames[frameIndex], 0, 0);
      frameIndex++;
      setTimeout(renderFrame, frameDuration);
    };

    renderFrame();
  });
}

// ─── Rendering pipeline ────────────────────────────────────────────────────────

export interface RenderPipelineOptions {
  frames: ImageData[];
  outputPath: string;
  options: Required<RenderOptions>;
  onProgress?: (progress: number, phase: string) => void;
  ffmpegPath?: string;
}

/**
 * Execute the render pipeline.
 * 
 * In production, this would send frames to a render worker or server
 * for FFmpeg encoding. This client-side version provides utilities
 * for frame preparation and command generation.
 */
export async function executeRenderPipeline(
  options: RenderPipelineOptions
): Promise<{ success: boolean; outputUrl?: string; command?: string }> {
  const { frames, outputPath, options: opts, onProgress } = options;

  if (frames.length === 0) {
    return { success: false };
  }

  onProgress?.(0, "preparing");

  try {
    // Phase 1: Encode frames as PNG sequence
    const pngFrames: Uint8Array[] = [];
    for (let i = 0; i < frames.length; i++) {
      pngFrames.push(imageDataToPNG(frames[i]));
      if (i % 10 === 0) {
        onProgress?.(Math.round((i / frames.length) * 30), "encoding_frames");
      }
    }

    onProgress?.(30, "frames_ready");

    // Phase 2: Generate FFmpeg command
    // In production, we'd upload frames and execute FFmpeg server-side
    const command = generateFFmpegCommand({
      inputPattern: "frames/frame_%06d.png",
      output: outputPath,
      width: opts.width,
      height: opts.height,
      fps: opts.fps,
      bitrate: opts.bitrate,
    });

    onProgress?.(40, "ffmpeg_command_generated");

    // For client-side, create a WebM fallback (not H264)
    // Production should use server-side FFmpeg
    const webmBlob = await createWebMVideo(frames, {
      fps: opts.fps,
      width: opts.width,
      height: opts.height,
    });

    onProgress?.(90, "encoding_complete");

    // Convert WebM blob to URL
    const outputUrl = URL.createObjectURL(webmBlob);

    onProgress?.(100, "completed");

    return {
      success: true,
      outputUrl,
      command, // Return FFmpeg command for reference
    };
  } catch (error) {
    console.error("Render pipeline error:", error);
    return { success: false };
  }
}

// ─── Progress tracking ────────────────────────────────────────────────────────

export class RenderProgressTracker {
  private callbacks: Map<string, (progress: number, phase: string) => void> = new Map();
  private currentProgress = 0;
  private currentPhase = "";

  addListener(id: string, callback: (progress: number, phase: string) => void): void {
    this.callbacks.set(id, callback);
  }

  removeListener(id: string): void {
    this.callbacks.delete(id);
  }

  update(progress: number, phase: string): void {
    this.currentProgress = progress;
    this.currentPhase = phase;
    this.callbacks.forEach((cb) => cb(progress, phase));
  }

  getProgress(): { progress: number; phase: string } {
    return { progress: this.currentProgress, phase: this.currentPhase };
  }
}

// ─── Manifest generation ─────────────────────────────────────────────────────

export function generateVideoManifest(
  frames: ImageData[],
  options: Required<RenderOptions>
): FrameManifest {
  return {
    frameCount: frames.length,
    width: options.width,
    height: options.height,
    fps: options.fps,
    duration: options.duration,
    format: "rgba",
    codec: "h264",
    bitrate: options.bitrate,
  };
}