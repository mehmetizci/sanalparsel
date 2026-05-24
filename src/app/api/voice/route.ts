import { NextRequest, NextResponse } from "next/server";

const VOICE_IDS: Record<string, string> = {
  female: "21m00Tcm4TlvDq8ikWAM", // Bella - warm, professional
  male: "TX3LPaxmHKxFdv7VOQ29", // Josh - confident, engaging
  corporate: "7EqFNOAJwpCXRJ1OuF4b", // Rachel - clear, authoritative
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice_type = "female" } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = VOICE_IDS[voice_type] || VOICE_IDS.female;

    if (!apiKey) {
      // Return a mock URL for demo purposes
      return NextResponse.json({ 
        audio_url: "/mock-audio.mp3",
        message: "Voice generation is in demo mode. Set ELEVENLABS_API_KEY for production." 
      });
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();

    // In production, you would upload this to Supabase Storage
    // For now, return a placeholder
    const audioUrl = `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString("base64").slice(0, 100)}...`;

    return NextResponse.json({ 
      audio_url: audioUrl,
      duration: Math.ceil(text.length / 15), // Rough estimate
    });
  } catch (error) {
    console.error("Voice generation error:", error);
    return NextResponse.json({ 
      error: "Failed to generate voice",
      audio_url: "/mock-audio.mp3",
    }, { status: 500 });
  }
}