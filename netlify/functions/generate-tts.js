/**
 * Netlify Function - TTS Generation
 * 
 * Endpoint: /.netlify/functions/generate-tts
 * 
 * Generates speech using Edge TTS.
 * Returns MP3 audio on success, JSON error on failure.
 */

const edgeTtsService = require("../../server/edgeTtsService");

// Max text length to prevent serverless timeout
const MAX_TEXT_LENGTH = 5000;

exports.handler = async function (event, context) {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Method not allowed",
        details: "Only POST method is supported",
      }),
    };
  }

  try {
    // Parse body
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "Invalid JSON body",
            details: "Request body must be valid JSON",
          }),
        };
      }
    }

    const { text, voice, rate, pitch } = body;

    console.log("[Netlify Function /generate-tts] Request received");
    console.log("[Netlify Function /generate-tts] Text length:", text?.length || 0);

    // Validate request
    if (!text || typeof text !== "string") {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Missing text or voice",
          details: "text is required",
        }),
      };
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Missing text or voice",
          details: `text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
        }),
      };
    }

    // Generate speech
    const result = await edgeTtsService.generateSpeech({
      text,
      voice: voice || edgeTtsService.DEFAULT_VOICE,
      rate: rate || "+0%",
      pitch: pitch || "+0Hz",
    });

    console.log("[Netlify Function /generate-tts] Generation successful, audio size:", result.audio.length);

    // Convert Buffer to base64 for binary response
    const audioBase64 = result.audio.toString("base64");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
      body: audioBase64,
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("[Netlify Function /generate-tts] Error:", error.message);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "TTS generation failed",
        details: error.message,
      }),
    };
  }
};