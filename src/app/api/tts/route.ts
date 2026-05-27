import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-admin";
import { DEMO_AUDIO_BASE64, DEMO_AUDIO_DURATION, getTTSProvider } from "@/lib/tts/demo";

// Turkish voice mappings for real TTS
const VOICE_MAP: Record<string, string> = {
  female: "tr-TR-EmelNeural",
  male: "tr-TR-AhmetNeural",
  corporate: "tr-TR-AhmetNeural",
};

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 20000; // 20 seconds

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
  console.log(`  AZURE_TTS_KEY exists:`, !!process.env.AZURE_TTS_KEY);
  console.log(`  AZURE_TTS_REGION:`, process.env.AZURE_TTS_REGION || "westeurope (default)");
  
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

    const provider = getTTSProvider();
    console.log(`[TTS:${requestId}] [PROVIDER] ${provider}`);
    
    // If no TTS config, use demo audio (stored as data URL)
    if (provider === "demo") {
      console.log(`[TTS:${requestId}] [DEMO MODE] Using base64 audio`);
      
      return NextResponse.json({
        success: true,
        audioUrl: `data:audio/mpeg;base64,${DEMO_AUDIO_BASE64}`,
        duration: DEMO_AUDIO_DURATION,
        provider: "demo",
        voice: VOICE_MAP[voice] || VOICE_MAP.female,
        storagePath: null,
        message: "Demo modu - Gerçek ses için Azure TTS yapılandırın",
      });
    }

    // Generate real audio with Azure TTS
    if (provider === "azure") {
      console.log(`[TTS:${requestId}] [AZURE MODE] Starting generation...`);
      return await generateAndUploadAudio(text, voice, userId, projectId, requestId);
    }

    console.log(`[TTS:${requestId}] [ERROR] Unknown provider: ${provider}`);
    return NextResponse.json({
      success: false,
      error: `Bilinmeyen TTS sağlayıcı: ${provider}`,
    }, { status: 400 });
    
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
 * Generate audio with Azure TTS and upload to Supabase Storage
 */
async function generateAndUploadAudio(
  text: string, 
  voice: string, 
  userId: string, 
  projectId: string,
  requestId: number
): Promise<NextResponse> {
  const voiceId = VOICE_MAP[voice] || VOICE_MAP.female;
  const apiKey = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_TTS_REGION || "westeurope";

  console.log(`[TTS:${requestId}] [AZURE] Voice: ${voiceId}, Region: ${region}`);

  try {
    // Step 1: Call Azure TTS
    console.log(`[TTS:${requestId}] [STEP 1] Calling Azure TTS API...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`[TTS:${requestId}] [TIMEOUT] 20s timeout triggered`);
      controller.abort();
    }, REQUEST_TIMEOUT);

    const azureResponse = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey!,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        },
        body: `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='tr-TR'>
          <voice name='${voiceId}'>${text}</voice>
        </speak>`,
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    console.log(`[TTS:${requestId}] [STEP 1] Azure TTS response status: ${azureResponse.status}`);

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text().catch(() => "Unknown error");
      console.error(`[TTS:${requestId}] [STEP 1 ERROR] Azure TTS failed:`, errorText);
      return NextResponse.json(
        { 
          success: false,
          error: `Azure TTS hatası (${azureResponse.status}): ${errorText.substring(0, 200)}` 
        },
        { status: 502 }
      );
    }

    // Step 2: Get audio buffer
    console.log(`[TTS:${requestId}] [STEP 2] Reading audio buffer...`);
    const audioBuffer = await azureResponse.arrayBuffer();
    console.log(`[TTS:${requestId}] [STEP 2] Audio buffer size: ${audioBuffer.byteLength} bytes`);

    if (audioBuffer.byteLength === 0) {
      console.error(`[TTS:${requestId}] [STEP 2 ERROR] Empty audio buffer`);
      return NextResponse.json(
        { success: false, error: "Azure TTS boş yanıt döndürdü" },
        { status: 502 }
      );
    }

    // Step 3: Generate storage path
    const timestamp = Date.now();
    const fileName = `voice-${voice}-${timestamp}.mp3`;
    const storagePath = `${userId}/${projectId}/${fileName}`;

    console.log(`[TTS:${requestId}] [STEP 3] Storage path: ${storagePath}`);

    // Step 4: Create Supabase client
    console.log(`[TTS:${requestId}] [STEP 4] Creating Supabase client...`);
    const supabase = createServerClient();
    console.log(`[TTS:${requestId}] [STEP 4] Supabase client created`);

    // Step 5: Check/create bucket
    console.log(`[TTS:${requestId}] [STEP 5] Checking bucket '${STORAGE_BUCKET}'...`);
    const { error: bucketError } = await supabase.storage.getBucket(STORAGE_BUCKET);
    
    if (bucketError) {
      console.log(`[TTS:${requestId}] [STEP 5] Bucket not found, creating...`);
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (createError) {
        console.error(`[TTS:${requestId}] [STEP 5 ERROR] Bucket creation failed:`, createError);
        return NextResponse.json(
          { 
            success: false,
            error: `Bucket oluşturulamadı: ${createError.message}. Lütfen Supabase Storage'da 'generated-audio' bucket'i oluşturun.` 
          },
          { status: 500 }
        );
      }
      console.log(`[TTS:${requestId}] [STEP 5] Bucket created successfully`);
    } else {
      console.log(`[TTS:${requestId}] [STEP 5] Bucket exists`);
    }

    // Step 6: Upload file
    console.log(`[TTS:${requestId}] [STEP 6] Uploading to Supabase Storage...`);
    console.log(`  contentType: audio/mpeg`);
    console.log(`  path: ${storagePath}`);
    console.log(`  buffer size: ${audioBuffer.byteLength}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error(`[TTS:${requestId}] [STEP 6 ERROR] Upload failed:`, uploadError);
      return NextResponse.json(
        { 
          success: false,
          error: `Dosya yüklenemedi: ${uploadError.message}` 
        },
        { status: 500 }
      );
    }

    console.log(`[TTS:${requestId}] [STEP 6] Upload success:`, uploadData);

    // Step 7: Get public URL
    console.log(`[TTS:${requestId}] [STEP 7] Getting public URL...`);
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    console.log(`[TTS:${requestId}] [STEP 7] Public URL: ${urlData.publicUrl}`);

    const duration = Math.ceil(text.length / 15);

    // SUCCESS!
    console.log(`[TTS:${requestId}] [SUCCESS] Returning audio URL`);

    return NextResponse.json({
      success: true,
      audioUrl: urlData.publicUrl,
      storagePath: storagePath,
      duration,
      provider: "azure",
      voice: voiceId,
      fileSize: audioBuffer.byteLength,
    });
    
  } catch (error) {
    console.error(`[TTS:${requestId}] [FATAL] Azure TTS exception:`, error);
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