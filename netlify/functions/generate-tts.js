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
// Test mode max text length
const TEST_MAX_TEXT_LENGTH = 1200;

exports.handler = async function (event, context) {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    console.log("=== NETLIFY FUNCTION ===");
    console.log("Method:", event.httpMethod);
    console.log("Only POST is supported");
    console.log("========================");
    
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
        console.log("=== NETLIFY FUNCTION ===");
        console.log("Error: Invalid JSON body");
        console.log("========================");
        
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

    const { text, voice, rate, pitch, test } = body;

    console.log("=== NETLIFY FUNCTION ===");
    console.log("Method: POST");
    console.log("Test mode:", test || false);
    console.log("Text length:", text?.length || 0);
    console.log("Text preview:", text?.substring(0, 100) + (text?.length > 100 ? "..." : "") || "N/A");
    console.log("Voice:", voice || "default");
    console.log("Rate:", rate || "0%");
    console.log("Pitch:", pitch || "0Hz");
    console.log("========================");

    // TEST MODE: Return success response without actually generating TTS
    if (test === true) {
      console.log("=== TEST MODE ===");
      console.log("Returning test success response");
      console.log("=================");
      
      // Limit text length for test mode
      if (text && text.length > TEST_MAX_TEXT_LENGTH) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "Text too long for serverless TTS test. Please shorten narration.",
            details: `Text is ${text.length} chars, max is ${TEST_MAX_TEXT_LENGTH} chars for test mode.`,
          }),
        };
      }
      
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          ok: true,
          message: "POST endpoint works",
          received: {
            textLength: text?.length || 0,
            voice: voice || "default",
            rate: rate || "0%",
            pitch: pitch || "0Hz",
          },
        }),
      };
    }

    // Validate request
    if (!text || typeof text !== "string") {
      console.log("=== VALIDATION ERROR ===");
      console.log("Missing text");
      console.log("======================");
      
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
      console.log("=== VALIDATION ERROR ===");
      console.log("Text too long:", text.length, "chars");
      console.log("======================");
      
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
    console.log("=== EDGE TTS ERROR ===");
    console.log("Error message:", error.message);
    console.log("Error stack:", process.env.NODE_ENV === "development" ? error.stack : "hidden in production");
    console.log("====================");

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "TTS generation failed",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      }),
    };
  }
};