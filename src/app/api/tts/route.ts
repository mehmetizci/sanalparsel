import { NextRequest, NextResponse } from "next/server";
import { DEMO_AUDIO_BASE64, DEMO_AUDIO_DURATION, getTTSProvider } from "@/lib/tts/demo";

// Turkish voice mappings for real TTS
const VOICE_MAP: Record<string, string> = {
  female: "tr-TR-EmelNeural",
  male: "tr-TR-AhmetNeural",
  corporate: "tr-TR-AhmetNeural",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice = "female" } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Metin gereklidir" },
        { status: 400 }
      );
    }

    const provider = getTTSProvider();
    
    // If no TTS config, use demo audio
    if (provider === "demo") {
      console.log(`[TTS] No TTS API configured. Using demo audio for text: "${text.substring(0, 50)}..."`);
      
      return NextResponse.json({
        audioUrl: `data:audio/mpeg;base64,${DEMO_AUDIO_BASE64}`,
        duration: DEMO_AUDIO_DURATION,
        provider: "demo",
        voice: VOICE_MAP[voice] || VOICE_MAP.female,
        message: "Demo modu: Ses oluşturma API'sı yapılandırılmamış. Gerçek ses için Azure TTS veya OpenAI TTS ekleyin.",
      });
    }

    // Try real TTS based on provider
    if (provider === "azure") {
      return await generateAzureTTS(text, voice);
    }

    // Default to demo if provider not recognized
    return NextResponse.json({
      audioUrl: `data:audio/mpeg;base64,${DEMO_AUDIO_BASE64}`,
      duration: DEMO_AUDIO_DURATION,
      provider: "demo",
      voice: VOICE_MAP[voice] || VOICE_MAP.female,
    });
  } catch (error) {
    console.error("TTS generation error:", error);
    return NextResponse.json(
      { error: "Ses oluşturulurken hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}

/**
 * Generate speech using Azure Cognitive Services TTS
 */
async function generateAzureTTS(text: string, voice: string): Promise<NextResponse> {
  const voiceId = VOICE_MAP[voice] || VOICE_MAP.female;
  const apiKey = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_TTS_REGION || "westeurope";

  try {
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
      }
    );

    if (!response.ok) {
      throw new Error(`Azure TTS error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const duration = Math.ceil(text.length / 15);

    return NextResponse.json({
      audioUrl: `data:audio/mpeg;base64,${base64Audio}`,
      duration,
      provider: "azure",
      voice: voiceId,
    });
  } catch (error) {
    console.error("Azure TTS error:", error);
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