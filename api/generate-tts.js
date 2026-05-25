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

module.exports = async function handler(req, res) {
  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      details: "Only POST method is supported",
    });
  }

  try {
    const { text, voice, rate, pitch } = req.body || {};

    console.log("[API /api/generate-tts] Request received");
    console.log("[API /api/generate-tts] Text length:", text?.length || 0);

    // Validate request
    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "Missing text or voice",
        details: "text is required",
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: "Missing text or voice",
        details: `text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
      });
    }

    // Generate speech
    const result = await edgeTtsService.generateSpeech({
      text,
      voice: voice || edgeTtsService.DEFAULT_VOICE,
      rate: rate || "+0%",
      pitch: pitch || "+0Hz",
    });

    console.log("[API /api/generate-tts] Generation successful, audio size:", result.audio.length);

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
    console.error("[API /api/generate-tts] Error:", error.message);

    return res.status(500).json({
      error: "TTS generation failed",
      details: error.message,
    });
  }
};