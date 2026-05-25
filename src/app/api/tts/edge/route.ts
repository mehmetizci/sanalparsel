import { NextRequest, NextResponse } from "next/server";

// Edge TTS voice configurations for Turkish
const EDGE_TTS_VOICES: Record<string, string> = {
  "tr-TR-EmelNeural": "tr-TR-EmelNeural",
  "tr-TR-AhmetNeural": "tr-TR-AhmetNeural",
  "tr-TR-Ahmet": "tr-TR-Ahmet",
  "tr-TR-ZeynepNeural": "tr-TR-ZeynepNeural",
};

// Type for edge-tts
type EdgeTTSOptions = {
  voice: string;
  rate?: string;
  pitch?: string;
};

type TTSFunction = (text: string, options?: EdgeTTSOptions) => Promise<Buffer>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice = "tr-TR-AhmetNeural", rate = "0%", pitch = "0Hz" } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Validate voice
    const voiceId = EDGE_TTS_VOICES[voice] || "tr-TR-AhmetNeural";

    // Use edge-tts library to generate audio
    try {
      // Dynamic import from the JS output
      const edgeTtsModule = await import("edge-tts/out/index.js");
      const tts: TTSFunction = edgeTtsModule.tts;

      const audioBuffer = await tts(text, {
        voice: voiceId,
        rate: rate,
        pitch: pitch,
      });

      // Create a ReadableStream from the buffer data
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(audioBuffer);
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": "inline",
        },
      });
    } catch (edgeError) {
      console.error("Edge TTS error:", edgeError);
      
      // Fallback: Return a mock response for demo
      return NextResponse.json(
        { error: "TTS generation failed. Edge TTS may not be available in this environment." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle GET requests for testing
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Edge TTS API is running",
    available_voices: Object.keys(EDGE_TTS_VOICES),
  });
}