/**
 * Vercel API Route - TTS Generation
 * 
 * Endpoint: /api/generate-tts
 * 
 * Generates speech using Edge TTS.
 * Returns JSON with audioUrl on success, JSON error on failure.
 */

// Use dynamic import for ES module edge-tts
let edgeTts = null;

async function initEdgeTts() {
  if (!edgeTts) {
    edgeTts = await import("edge-tts");
  }
  return edgeTts;
}

// Max text length to prevent serverless timeout
const MAX_TEXT_LENGTH = 5000;
// Test mode max text length
const TEST_MAX_TEXT_LENGTH = 1200;

// Voice mapping
const VOICE_MAP = {
  female: "tr-TR-EmelNeural",
  male: "tr-TR-AhmetNeural",
  corporate: "tr-TR-AhmetNeural",
  "tr-TR-EmelNeural": "tr-TR-EmelNeural",
  "tr-TR-AhmetNeural": "tr-TR-AhmetNeural",
  "tr-TR-ZeynepNeural": "tr-TR-ZeynepNeural",
};

const DEFAULT_VOICE = "tr-TR-AhmetNeural";

module.exports = async function handler(req, res) {
  // Only accept POST
  if (req.method !== "POST") {
    console.log("=== VERCEL API ===");
    console.log("Method:", req.method);
    console.log("Only POST is supported");
    console.log("=================");
    
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
      details: "Only POST method is supported",
    });
  }

  try {
    const { text, voice, rate, pitch, test } = req.body || {};

    console.log("=== VERCEL API ===");
    console.log("Method: POST");
    console.log("Test mode:", test || false);
    console.log("Text length:", text?.length || 0);
    console.log("Text preview:", (text?.substring(0, 100) || "N/A") + (text?.length > 100 ? "..." : ""));
    console.log("Voice:", voice || "default");
    console.log("Rate:", rate || "+0%");
    console.log("Pitch:", pitch || "+0Hz");
    console.log("=================");

    // TEST MODE: Return success response without actually generating TTS
    if (test === true) {
      console.log("=== TEST MODE ===");
      console.log("Returning test success response");
      console.log("=================");
      
      // Limit text length for test mode
      if (text && text.length > TEST_MAX_TEXT_LENGTH) {
        return res.status(400).json({
          success: false,
          error: "Text too long for serverless TTS test. Please shorten narration.",
          details: `Text is ${text.length} chars, max is ${TEST_MAX_TEXT_LENGTH} chars for test mode.`,
        });
      }
      
      return res.status(200).json({
        success: true,
        ok: true,
        message: "POST endpoint works",
        received: {
          textLength: text?.length || 0,
          voice: voice || DEFAULT_VOICE,
          rate: rate || "+0%",
          pitch: pitch || "+0Hz",
        },
      });
    }

    // Validate request
    if (!text || typeof text !== "string") {
      console.log("=== VALIDATION ERROR ===");
      console.log("Missing text");
      console.log("======================");
      
      return res.status(400).json({
        success: false,
        error: "Missing text",
        details: "text is required",
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      console.log("=== VALIDATION ERROR ===");
      console.log("Text too long:", text.length, "chars");
      console.log("======================");
      
      return res.status(400).json({
        success: false,
        error: "Text too long",
        details: `text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
      });
    }

    // Get voice
    let selectedVoice = DEFAULT_VOICE;
    if (voice) {
      selectedVoice = VOICE_MAP[voice] || (voice.startsWith("tr-TR") ? voice : DEFAULT_VOICE);
    }

    console.log("=== EDGE TTS START ===");
    console.log("Generating speech...");
    console.log("Voice:", selectedVoice);
    console.log("=====================");

    // Generate speech - dynamic import
    const edgeTtsModule = await initEdgeTts();
    const tts = edgeTtsModule.default || edgeTtsModule.tts || edgeTtsModule;
    
    const audioBuffer = await tts(text, {
      voice: selectedVoice,
      rate: rate || "+0%",
      pitch: pitch || "+0Hz",
      format: "audio-24khz-96kbitrate-mono-mp3"
    });

    console.log("=== EDGE TTS SUCCESS ===");
    console.log("Audio buffer size:", audioBuffer.length, "bytes");
    console.log("Voice used:", selectedVoice);
    console.log("========================");

    // Calculate duration estimate
    const duration = Math.ceil(text.length / 150);

    // Return JSON with audio data
    const audioBase64 = audioBuffer.toString("base64");

    return res.status(200).json({
      success: true,
      audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
      audioData: audioBase64,
      duration: duration,
      voice: selectedVoice,
      textLength: text.length
    });

  } catch (error) {
    console.log("=== EDGE TTS ERROR ===");
    console.log("Error message:", error.message);
    console.log("Error stack:", process.env.NODE_ENV === "development" ? error.stack : "hidden in production");
    console.log("====================");

    return res.status(500).json({
      success: false,
      error: "TTS generation failed",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};