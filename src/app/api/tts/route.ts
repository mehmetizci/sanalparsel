import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-admin";
import { EdgeTTS } from "node-edge-tts";

// Turkish voice mappings for Edge TTS
const VOICE_MAP: Record<string, string> = {
  female: "tr-TR-EmelNeural",
  male: "tr-TR-AhmetNeural",
  corporate: "tr-TR-AhmetNeural",
};

// Bucket name for generated audio
const STORAGE_BUCKET = "generated-audio";

// Request body type
interface TTSRequestBody {
  text: string;
  voice: string;
  userId: string;
  projectId: string;
}

export async function POST(request: NextRequest) {
  const requestId = Date.now();
  
  console.log("=".repeat(60));
  console.log(`[TTS:${requestId}] ===== TTS REQUEST STARTED =====`);
  
  // Debug: Check environment variables
  console.log(`[TTS:${requestId}] [ENV CHECK]`);
  console.log(`  SUPABASE_URL exists:`, !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY exists:`, !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    const body: TTSRequestBody = await request.json();
    const { text, voice = "female", userId, projectId } = body;

    console.log(`[TTS:${requestId}] [INPUT]`);
    console.log(`  text length: ${text?.length || 0}`);
    console.log(`  voice: ${voice}`);
    console.log(`  userId: ${userId}`);
    console.log(`  projectId: ${projectId}`);

    if (!text) {
      console.log(`[TTS:${requestId}] [ERROR] Missing text - returning 400`);
      return NextResponse.json(
        { success: false, error: "Metin gereklidir" },
        { status: 400 }
      );
    }

    if (!userId || !projectId) {
      console.log(`[TTS:${requestId}] [ERROR] Missing userId or projectId`);
      return NextResponse.json(
        { success: false, error: "Kullanıcı ve proje bilgisi gereklidir" },
        { status: 400 }
      );
    }

    console.log(`[TTS:${requestId}] [PROVIDER] Edge TTS (free)`);
    return await generateAndUploadAudio(text, voice, userId, projectId, requestId);
    
  } catch (error) {
    console.error(`[TTS:${requestId}] [FATAL ERROR]`, error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Ses oluşturulurken hata oluştu" 
      },
      { status: 500 }
    );
  } finally {
    console.log(`[TTS:${requestId}] ===== TTS REQUEST ENDED =====`);
    console.log("=".repeat(60));
  }
}

/**
 * Generate audio with Edge TTS and upload to Supabase Storage
 */
async function generateAndUploadAudio(
  text: string, 
  voice: string, 
  userId: string, 
  projectId: string,
  requestId: number
): Promise<NextResponse> {
  const voiceId = VOICE_MAP[voice] || VOICE_MAP.female;

  console.log(`[TTS:${requestId}] [EDGE TTS] Voice: ${voiceId}`);

  try {
    // Step 1: Call Edge TTS
    console.log(`[TTS:${requestId}] [STEP 1] Calling Edge TTS...`);
    
    const tts = new EdgeTTS({
      voice: voiceId,
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    });

    // Generate audio to a temp file
    const tempPath = `/tmp/edge-tts-${requestId}.mp3`;
    await tts.ttsPromise(text, tempPath);

    // Read the generated file
    const fs = await import("fs");
    const audioBuffer = fs.readFileSync(tempPath);
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempPath);
    } catch {}

    console.log(`[TTS:${requestId}] [STEP 1] Edge TTS success, buffer size: ${audioBuffer.length} bytes`);

    if (audioBuffer.length === 0) {
      console.error(`[TTS:${requestId}] [STEP 1 ERROR] Empty audio buffer`);
      return NextResponse.json(
        { success: false, error: "Edge TTS boş yanıt döndürdü" },
        { status: 502 }
      );
    }

    // Step 2: Generate storage path
    const timestamp = Date.now();
    const fileName = `voice-${voice}-${timestamp}.mp3`;
    const storagePath = `${userId}/${projectId}/${fileName}`;

    console.log(`[TTS:${requestId}] [STEP 2] Storage path: ${storagePath}`);

    // Step 3: Create Supabase client
    console.log(`[TTS:${requestId}] [STEP 3] Creating Supabase client...`);
    const supabase = createServerClient();
    console.log(`[TTS:${requestId}] [STEP 3] Supabase client created`);

    // Step 4: Check/create bucket
    console.log(`[TTS:${requestId}] [STEP 4] Checking bucket '${STORAGE_BUCKET}'...`);
    const { error: bucketError } = await supabase.storage.getBucket(STORAGE_BUCKET);
    
    if (bucketError) {
      console.log(`[TTS:${requestId}] [STEP 4] Bucket not found, creating...`);
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (createError) {
        console.error(`[TTS:${requestId}] [STEP 4 ERROR] Bucket creation failed:`, createError);
        return NextResponse.json(
          { 
            success: false,
            error: `Bucket oluşturulamadı: ${createError.message}. Lütfen Supabase Storage'da 'generated-audio' bucket'i oluşturun.` 
          },
          { status: 500 }
        );
      }
      console.log(`[TTS:${requestId}] [STEP 4] Bucket created successfully`);
    } else {
      console.log(`[TTS:${requestId}] [STEP 4] Bucket exists`);
    }

    // Step 5: Upload file
    console.log(`[TTS:${requestId}] [STEP 5] Uploading to Supabase Storage...`);
    console.log(`  contentType: audio/mpeg`);
    console.log(`  path: ${storagePath}`);
    console.log(`  buffer size: ${audioBuffer.length}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error(`[TTS:${requestId}] [STEP 5 ERROR] Upload failed:`, uploadError);
      return NextResponse.json(
        { 
          success: false,
          error: `Dosya yüklenemedi: ${uploadError.message}` 
        },
        { status: 500 }
      );
    }

    console.log(`[TTS:${requestId}] [STEP 5] Upload success:`, uploadData);

    // Step 6: Get public URL
    console.log(`[TTS:${requestId}] [STEP 6] Getting public URL...`);
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    console.log(`[TTS:${requestId}] [STEP 6] Public URL: ${urlData.publicUrl}`);

    const duration = Math.ceil(text.length / 15);

    // SUCCESS!
    console.log(`[TTS:${requestId}] [SUCCESS] Returning audio URL`);

    return NextResponse.json({
      success: true,
      audioUrl: urlData.publicUrl,
      storagePath: storagePath,
      duration,
      provider: "edge-tts",
      voice: voiceId,
      fileSize: audioBuffer.length,
    });
    
  } catch (error) {
    console.error(`[TTS:${requestId}] [FATAL] Edge TTS exception:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Ses oluşturulurken hata oluştu" 
      },
      { status: 500 }
    );
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