import { NextRequest, NextResponse } from "next/server";
import { DEMO_AUDIO_BASE64, DEMO_AUDIO_DURATION, getTTSProvider } from "@/lib/tts/demo";

// Turkish voice mappings for real TTS
const VOICE_MAP: Record<string, string> = {
  female: "tr-TR-EmelNeural",
  male: "tr-TR-AhmetNeural",
  corporate: "tr-TR-AhmetNeural",
};

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 20000; // 20 seconds

export async function POST(request: NextRequest) {
  const requestId = Date.now();
  console.log(`[TTS:${requestId}] Request started`);
  
  try {
    const body = await request.json();
    const { text, voice = "female" } = body;

    console.log(`[TTS:${requestId}] Input validated`, { 
      textLength: text?.length || 0, 
      voice 
    });

    if (!text) {
      console.log(`[TTS:${requestId}] Missing text - returning 400`);
      return NextResponse.json(
        { error: "Metin gereklidir" },
        { status: 400 }
      );
    }

    const provider = getTTSProvider();
    console.log(`[TTS:${requestId}] Provider: ${provider}`);
    
    // If no TTS config, use demo audio
    if (provider === "demo") {
      console.log(`[TTS:${requestId}] Using demo audio`);
      
      const response = {
        audioUrl: `data:audio/mpeg;base64,${DEMO_AUDIO_BASE64}`,
        duration: DEMO_AUDIO_DURATION,
        provider: "demo",
        voice: VOICE_MAP[voice] || VOICE_MAP.female,
        message: "Demo modu: Ses oluşturma API'sı yapılandırılmamış.",
      };
      
      console.log(`[TTS:${requestId}] Returning demo response`);
      return NextResponse.json(response);
    }

    // Try real TTS based on provider
    if (provider === "azure") {
      console.log(`[TTS:${requestId}] Using Azure TTS`);
      return await generateAzureTTS(text, voice, requestId);
    }

    // Default to demo if provider not recognized
    console.log(`[TTS:${requestId}] Unknown provider, using demo`);
    return NextResponse.json({
      audioUrl: `data:audio/mpeg;base64,${DEMO_AUDIO_BASE64}`,
      duration: DEMO_AUDIO_DURATION,
      provider: "demo",
      voice: VOICE_MAP[voice] || VOICE_MAP.female,
    });
  } catch (error) {
    console.error(`[TTS:${requestId}] Error:`, error);
    return NextResponse.json(
      { error: "Ses oluşturulurken hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}

/**
 * Generate speech using Azure Cognitive Services TTS
 */
async function generateAzureTTS(text: string, voice: string, requestId: number): Promise<NextResponse> {
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
      throw new Error(`Azure TTS error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[TTS:${requestId}] Audio buffer received, size:`, audioBuffer.byteLength);

    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const duration = Math.ceil(text.length / 15);

    console.log(`[TTS:${requestId}] Success!`);

    return NextResponse.json({
      audioUrl: `data:audio/mpeg;base64,${base64Audio}`,
      duration,
      provider: "azure",
      voice: voiceId,
    });
  } catch (error) {
    console.error(`[TTS:${requestId}] Azure TTS exception:`, error);
    throw error;
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