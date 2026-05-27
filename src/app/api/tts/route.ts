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
  console.log(`[TTS:${requestId}] Request started`);
  
  try {
    const body: TTSRequestBody = await request.json();
    const { text, voice = "female", userId, projectId } = body;

    console.log(`[TTS:${requestId}] Input validated`, { 
      textLength: text?.length || 0, 
      voice,
      userId,
      projectId
    });

    if (!text) {
      console.log(`[TTS:${requestId}] Missing text - returning 400`);
      return NextResponse.json(
        { error: "Metin gereklidir" },
        { status: 400 }
      );
    }

    if (!userId || !projectId) {
      console.log(`[TTS:${requestId}] Missing userId or projectId - returning 400`);
      return NextResponse.json(
        { error: "Kullanıcı ve proje bilgisi gereklidir" },
        { status: 400 }
      );
    }

    const provider = getTTSProvider();
    console.log(`[TTS:${requestId}] Provider: ${provider}`);
    
    // If no TTS config, use demo audio (stored as data URL)
    if (provider === "demo") {
      console.log(`[TTS:${requestId}] Using demo audio`);
      
      const response = {
        success: true,
        audioUrl: `data:audio/mpeg;base64,${DEMO_AUDIO_BASE64}`,
        duration: DEMO_AUDIO_DURATION,
        provider: "demo",
        voice: VOICE_MAP[voice] || VOICE_MAP.female,
        storagePath: null,
        message: "Demo modu: Ses oluşturma API'sı yapılandırılmamış.",
      };
      
      console.log(`[TTS:${requestId}] Returning demo response`);
      return NextResponse.json(response);
    }

    // Generate real audio with Azure TTS
    if (provider === "azure") {
      return await generateAndUploadAudio(text, voice, userId, projectId, requestId);
    }

    // Default to demo if provider not recognized
    console.log(`[TTS:${requestId}] Unknown provider, using demo`);
    return NextResponse.json({
      success: true,
      audioUrl: `data:audio/mpeg;base64,${DEMO_AUDIO_BASE64}`,
      duration: DEMO_AUDIO_DURATION,
      provider: "demo",
      voice: VOICE_MAP[voice] || VOICE_MAP.female,
      storagePath: null,
    });
  } catch (error) {
    console.error(`[TTS:${requestId}] Error:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Ses oluşturulurken hata oluştu. Lütfen tekrar deneyin." 
      },
      { status: 500 }
    );
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

  console.log(`[TTS:${requestId}] Azure TTS starting`, { voiceId, region });

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`[TTS:${requestId}] Request timeout triggered`);
      controller.abort();
    }, REQUEST_TIMEOUT);

    const response = await fetch(
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

    console.log(`[TTS:${requestId}] Azure response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[TTS:${requestId}] Azure TTS error:`, errorText);
      return NextResponse.json(
        { 
          success: false,
          error: `Azure TTS hatası: ${response.status} - ${errorText}` 
        },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[TTS:${requestId}] Audio buffer received, size:`, audioBuffer.byteLength);

    // Generate storage path
    const timestamp = Date.now();
    const fileName = `voice-${voice}-${timestamp}.mp3`;
    const storagePath = `${userId}/${projectId}/${fileName}`;

    console.log(`[TTS:${requestId}] Uploading to Supabase Storage:`, storagePath);

    // Upload to Supabase Storage
    const supabase = createServerClient();
    
    // Ensure bucket exists
    const { error: bucketError } = await supabase.storage.getBucket(STORAGE_BUCKET);
    
    if (bucketError) {
      console.log(`[TTS:${requestId}] Bucket doesn't exist, creating...`);
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (createError) {
        console.error(`[TTS:${requestId}] Failed to create bucket:`, createError);
        return NextResponse.json(
          { 
            success: false,
            error: `Storage bucket oluşturulamadı: ${createError.message}. Lütfen Supabase Storage'da 'generated-audio' bucket'ini manuel olarak oluşturun.` 
          },
          { status: 500 }
        );
      }
    }

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error(`[TTS:${requestId}] Upload error:`, uploadError);
      return NextResponse.json(
        { 
          success: false,
          error: `Dosya yüklenemedi: ${uploadError.message}` 
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    console.log(`[TTS:${requestId}] Upload successful!`);

    const duration = Math.ceil(text.length / 15);

    return NextResponse.json({
      success: true,
      audioUrl: urlData.publicUrl,
      storagePath: storagePath,
      duration,
      provider: "azure",
      voice: voiceId,
    });
  } catch (error) {
    console.error(`[TTS:${requestId}] Azure TTS exception:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Ses oluşturulurken hata oluştu." 
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