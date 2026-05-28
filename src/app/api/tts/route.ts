import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-admin";
import { generateAudio, ensureStorageBucket } from "@/lib/services/tts";

// Node.js runtime强制要求
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Request body type
interface TTSRequestBody {
  text: string;
  voice?: string;
  userId: string;
  projectId: string;
  provider?: "openai" | "edge-tts";
  speed?: number;
  instructions?: string;
}

// Default values from environment - MVP uses Edge TTS
const DEFAULT_PROVIDER = (process.env.TTS_PROVIDER as "openai" | "edge-tts") || "edge-tts";
const DEFAULT_VOICE = process.env.OPENAI_TTS_VOICE || "nova";
const DEFAULT_SPEED = parseFloat(process.env.OPENAI_TTS_SPEED || "1.55");

export async function POST(request: NextRequest) {
  const requestId = Date.now();
  
  console.log("=".repeat(60));
  console.log(`[TTS API] Request started (${requestId})`);
  
  try {
    const body: TTSRequestBody = await request.json();
    const { 
      text, 
      voice = DEFAULT_VOICE, 
      userId, 
      projectId, 
      provider = DEFAULT_PROVIDER,
      speed = DEFAULT_SPEED,
      instructions 
    } = body;

    console.log(`[TTS API] Input - text length: ${text?.length || 0}, provider: ${provider}, voice: ${voice}`);

    // Validate required fields
    if (!text) {
      console.log(`[TTS API] Error: Missing text`);
      return NextResponse.json(
        { success: false, error: "Metin gereklidir" },
        { status: 400 }
      );
    }

    if (!userId || !projectId) {
      console.log(`[TTS API] Error: Missing userId or projectId`);
      return NextResponse.json(
        { success: false, error: "Kullanıcı ve proje bilgisi gereklidir" },
        { status: 400 }
      );
    }

    // Validate voice for OpenAI
    const validVoices = ["nova", "onyx", "shimmer", "coral", "female", "male", "corporate"];
    if (!validVoices.includes(voice)) {
      console.log(`[TTS API] Warning: Unknown voice "${voice}", using default`);
    }

    // Create Supabase client
    const supabase = createServerClient();

    // Ensure bucket exists
    const bucketReady = await ensureStorageBucket(supabase);
    if (!bucketReady) {
      return NextResponse.json(
        { success: false, error: "Storage bucket hazır değil" },
        { status: 500 }
      );
    }

    // Generate audio using TTS service
    const result = await generateAudio(
      {
        text,
        projectId,
        userId,
        settings: {
          provider: provider as "openai" | "edge-tts",
          voice,
          speed,
          instructions,
        },
      },
      supabase
    );

    if (!result.success) {
      console.error(`[TTS API] Generation failed: ${result.error}`);
      return NextResponse.json(
        { 
          success: false, 
          error: result.errorMessage || result.error || "Ses oluşturulamadı",
          fallbackUsed: result.fallbackUsed 
        },
        { status: 500 }
      );
    }

    console.log(`[TTS API] Success - provider: ${result.provider}, voice: ${result.voice}`);
    console.log(`[TTS API] Audio URL: ${result.audioUrl}`);

    // Update project with audio info in database (optional)
    // This could be used to persist audio_url for video rendering
    try {
      await supabase
        .from("projects")
        .update({
          audio_url: result.audioUrl,
          audio_status: "ready",
          tts_provider: result.provider,
          tts_voice: result.voice,
          tts_speed: result.speed,
        })
        .eq("id", projectId)
        .eq("user_id", userId);
    } catch (dbError) {
      // Non-critical error - audio is already uploaded
      console.log(`[TTS API] Warning: Could not update project: ${dbError}`);
    }

    return NextResponse.json({
      success: true,
      audioUrl: result.audioUrl,
      storagePath: result.storagePath,
      duration: result.duration,
      provider: result.provider,
      voice: result.voice,
      speed: result.speed,
      fallbackUsed: result.fallbackUsed || false,
    });

  } catch (error) {
    console.error(`[TTS API] FATAL ERROR:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Ses oluşturulurken hata oluştu";
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  } finally {
    console.log(`[TTS API] Request ended`);
    console.log("=".repeat(60));
  }
}

// OPTIONS method for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}