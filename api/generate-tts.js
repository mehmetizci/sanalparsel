/**
 * Vercel API Route - TTS Generation
 * 
 * Endpoint: /api/generate-tts
 * 
 * Generates speech using Edge TTS.
 * Returns MP3 audio on success, JSON error on failure.
 */

const edgeTtsService = require("../../server/edgeTtsService");

// Max text length to prevent serverless timeout
const MAX_TEXT_LENGTH = 5000;
// Test mode max text length
const TEST_MAX_TEXT_LENGTH = 1200;

module.exports = async function handler(req, res) {
  // Only accept POST
  if (req.method !== "POST") {
    console.log("=== VERCEL API ===");
    console.log("Method:", req.method);
    console.log("Only POST is supported");
    console.log("=================");
    
    return res.status(405).json({
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
    console.log("Rate:", rate || "0%");
    console.log("Pitch:", pitch || "0Hz");
    console.log("=================");

    // TEST MODE: Return success response without actually generating TTS
    if (test === true) {
      console.log("=== TEST MODE ===");
      console.log("Returning test success response");
      console.log("=================");
      
      // Limit text length for test mode
      if (text && text.length > TEST_MAX_TEXT_LENGTH) {
        return res.status(400).json({
          error: "Text too long for serverless TTS test. Please shorten narration.",
          details: `Text is ${text.length} chars, max is ${TEST_MAX_TEXT_LENGTH} chars for test mode.`,
        });
      }
      
      return res.status(200).json({
        ok: true,
        message: "POST endpoint works",
        received: {
          textLength: text?.length || 0,
          voice: voice || "default",
          rate: rate || "0%",
          pitch: pitch || "0Hz",
        },
      });
    }

    // Validate request
    if (!text || typeof text !== "string") {
      console.log("=== VALIDATION ERROR ===");
      console.log("Missing text");
      console.log("======================");
      
      return res.status(400).json({
        error: "Missing text or voice",
        details: "text is required",
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      console.log("=== VALIDATION ERROR ===");
      console.log("Text too long:", text.length, "chars");
      console.log("======================");
      
      return res.status(400).json({
        error: "Missing text or voice",
        details: `text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
      });
    }

    console.log("=== EDGE TTS START ===");
    console.log("Generating speech...");
    console.log("=====================");

    // Generate speech
    const result = await edgeTtsService.generateSpeech({
      text,
      voice: voice || edgeTtsService.DEFAULT_VOICE,
      rate: rate || "+0%",
      pitch: pitch || "+0Hz",
    });

    console.log("=== EDGE TTS SUCCESS ===");
    console.log("Audio buffer size:", result.audio.length, "bytes");
    console.log("Voice used:", result.voice);
    console.log("Duration:", result.duration, "seconds");
    console.log("========================");

    // Convert Buffer to Uint8Array for response
    const uint8Array = new Uint8Array(
      result.audio.buffer,
      result.audio.byteOffset,
      result.audio.byteLength
    );

    // Set response headers
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");

    return res.send(uint8Array);
  } catch (error) {
    console.log("=== EDGE TTS ERROR ===");
    console.log("Error message:", error.message);
    console.log("Error stack:", process.env.NODE_ENV === "development" ? error.stack : "hidden in production");
    console.log("====================");

    return res.status(500).json({
      error: "TTS generation failed",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};