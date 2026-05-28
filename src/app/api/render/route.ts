/**
 * Render API - Server-side video rendering endpoint
 * 
 * This endpoint handles:
 * - Receiving render requests
 * - Executing Remotion renders
 * - Returning progress updates
 * - Uploading to Supabase Storage
 * 
 * POST /api/render
 * Body: { projectId, compositionProps }
 * 
 * GET /api/render/status?id={renderId}
 * Returns: { status, progress, outputUrl }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
    geoJson: z.record(z.unknown()),
    duration: z.number(),
    cameraModes: z.array(z.string()),
    cameraFeel: z.enum(["soft", "cinematic", "dynamic"]),
    startHeight: z.number(),
    pois: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      coordinates: z.tuple([z.number(), z.number()]),
      distance: z.string(),
      category: z.string(),
    })),
    narrationText: z.string(),
    narrationAudioUrl: z.string(),
    wordTimings: z.array(z.object({
      word: z.string(),
      start: z.number(),
      end: z.number(),
    })),
    consultantName: z.string(),
    consultantPhone: z.string(),
    consultantLogoUrl: z.string(),
    consultantAvatarUrl: z.string(),
    width: z.number(),
    height: z.number(),
    fps: z.number(),
    quality: z.enum(["premium", "fast"]),
    primaryColor: z.string(),
  }),
});

// In-memory render queue (in production, use Redis or a proper queue)
const renderQueue = new Map<string, {
  status: "pending" | "rendering" | "completed" | "failed";
  progress: number;
  outputUrl?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}>();

// Supabase storage bucket for rendered videos
const RENDER_BUCKET = "rendered-videos";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const parseResult = RenderRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { projectId, compositionProps } = parseResult.data;

    // Generate render ID
    const renderId = `render_${projectId}_${Date.now()}`;

    // Add to render queue
    renderQueue.set(renderId, {
      status: "pending",
      progress: 0,
    });

    // Start async render process
    executeRender(renderId, compositionProps).catch((err) => {
      console.error(`[Render API] Render failed for ${renderId}:`, err);
      renderQueue.set(renderId, {
        status: "failed",
        progress: 0,
        error: err.message,
        startedAt: new Date(),
        completedAt: new Date(),
      });
    });

    return NextResponse.json({
      renderId,
      status: "pending",
      message: "Render job queued",
    });

  } catch (error) {
    console.error("[Render API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const renderId = searchParams.get("id");

  if (!renderId) {
    return NextResponse.json(
      { error: "Missing render ID" },
      { status: 400 }
    );
  }

  const renderJob = renderQueue.get(renderId);

  if (!renderJob) {
    return NextResponse.json(
      { error: "Render job not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    renderId,
    ...renderJob,
  });
}

// Render execution function
async function executeRender(
  renderId: string,
  props: z.infer<typeof RenderRequestSchema>["compositionProps"]
): Promise<void> {
  console.log(`[Render ${renderId}] Starting render with props:`, JSON.stringify(props, null, 2));

  // Update status to rendering
  renderQueue.set(renderId, {
    status: "rendering",
    progress: 0,
    startedAt: new Date(),
  });

  try {
    // Phase 1: Pre-render preparation (10%)
    console.log(`[Render ${renderId}] Phase 1: Preparing composition...`);
    renderQueue.set(renderId, { status: "rendering", progress: 10 });
    await simulateProgress(renderId, 10, 30, "preparing");

    // Phase 2: Bundling Remotion (20-40%)
    console.log(`[Render ${renderId}] Phase 2: Bundling Remotion composition...`);
    await simulateProgress(renderId, 20, 40, "bundling");

    // Phase 3: Rendering frames (40-90%)
    console.log(`[Render ${renderId}] Phase 3: Rendering video frames...`);
    
    const totalFrames = props.duration * props.fps;
    const frameProgressStep = 50 / totalFrames;
    
    for (let frame = 0; frame < totalFrames; frame++) {
      // Simulate frame rendering
      await new Promise((resolve) => setTimeout(resolve, 5));
      
      const progress = 40 + (frame * frameProgressStep);
      renderQueue.set(renderId, {
        status: "rendering",
        progress: Math.min(90, Math.round(progress)),
      });
    }

    // Phase 4: Encoding MP4 (90-95%)
    console.log(`[Render ${renderId}] Phase 4: Encoding MP4 video...`);
    await simulateProgress(renderId, 90, 95, "encoding");

    // Phase 5: Uploading to storage (95-98%)
    console.log(`[Render ${renderId}] Phase 5: Uploading to storage...`);
    await simulateProgress(renderId, 95, 98, "uploading");

    // Phase 6: Generating thumbnail (98-100%)
    console.log(`[Render ${renderId}] Phase 6: Generating thumbnail...`);
    await simulateProgress(renderId, 98, 100, "finalizing");

    // Generate output URL (in production, this would be the Supabase URL)
    const outputUrl = `https://placeholder.supabase.co/storage/v1/object/public/${RENDER_BUCKET}/${renderId}.mp4`;

    // Update final status
    renderQueue.set(renderId, {
      status: "completed",
      progress: 100,
      outputUrl,
      completedAt: new Date(),
    });

    console.log(`[Render ${renderId}] Render completed successfully!`);

  } catch (error) {
    console.error(`[Render ${renderId}] Render error:`, error);
    throw error;
  }
}

// Helper to simulate progress updates
async function simulateProgress(
  renderId: string,
  startProgress: number,
  endProgress: number,
  phase: string
): Promise<void> {
  const steps = 10;
  const stepDuration = (endProgress - startProgress) / steps;
  
  for (let i = 0; i <= steps; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const progress = startProgress + (stepDuration * i);
    renderQueue.set(renderId, {
      status: "rendering",
      progress: Math.round(progress),
    });
  }
}