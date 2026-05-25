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
  console.log("═══════════════════════════════════════════");
  console.log("NETLIFY FUNCTION: /generate-tts");
  console.log("═══════════════════════════════════════════");
  
  // Only accept POST
  if (event.httpMethod !== "POST") {
    console.log("STEP 0: Method check");
    console.log("Method:", event.httpMethod);
    console.log("Only POST is supported");
    console.log("═══════════════════════════════════════════");
    
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
    console.log("STEP 1: Parsing body");
    console.log("Raw body:", event.body?.substring(0, 200) || "empty");
    
    // Parse body
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
        console.log("STEP 1: Body parsed successfully");
        console.log("Parsed keys:", Object.keys(body).join(", "));
      } catch (e) {
        console.log("STEP 1: FAILED - Invalid JSON body");
        console.log("Parse error:", e.message);
        console.log("═══════════════════════════════════════════");
        
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "Invalid JSON body",
            details: "Request body must be valid JSON",
            parseError: e.message,
          }),
        };
      }
    } else {
      console.log("STEP 1: Body is empty");
    }

    const { text, voice, rate, pitch, test } = body;

    console.log("");
    console.log("STEP 2: Request validated");
    console.log("  text length:", text?.length || 0);
    console.log("  text preview:", (text?.substring(0, 50) || "N/A") + (text?.length > 50 ? "..." : ""));
    console.log("  voice:", voice || "default (tr-TR-AhmetNeural)");
    console.log("  rate:", rate || "0%");
    console.log("  pitch:", pitch || "0Hz");
    console.log("  test mode:", test || false);

    // TEST MODE: Return success response without actually generating TTS
    if (test === true) {
      console.log("");
      console.log("STEP 3: TEST MODE - Skipping TTS generation");
      console.log("Returning test success response");
      console.log("═══════════════════════════════════════════");
      
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
          message: "POST endpoint works - test mode",
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
    console.log("");
    console.log("STEP 4: Validation");
    
    if (!text || typeof text !== "string") {
      console.log("STEP 4: FAILED - Missing text");
      console.log("═══════════════════════════════════════════");
      
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
      console.log("STEP 4: FAILED - Text too long");
      console.log("  Text length:", text.length);
      console.log("  Max allowed:", MAX_TEXT_LENGTH);
      console.log("═══════════════════════════════════════════");
      
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

    console.log("STEP 4: Validation passed");
    console.log("");
    console.log("STEP 5: Loading edge-tts package");
    
    // Check if edge-tts can be loaded
    let edgeTts;
    try {
      edgeTts = require("edge-tts/out/index.js");
      console.log("STEP 5: edge-tts package loaded");
      console.log("  Package keys:", Object.keys(edgeTts).join(", "));
    } catch (loadError) {
      console.log("STEP 5: FAILED - Cannot load edge-tts");
      console.log("  Load error:", loadError.message);
      console.log("  Stack:", loadError.stack?.substring(0, 500));
      console.log("═══════════════════════════════════════════");
      
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Cannot load edge-tts package",
          message: loadError.message,
          stack: loadError.stack,
          name: loadError.name,
        }),
      };
    }

    console.log("");
    console.log("STEP 6: Starting TTS generation");
    console.log("  Voice:", voice || "tr-TR-AhmetNeural");
    console.log("  Rate:", rate || "+0%");
    console.log("  Pitch:", pitch || "+0Hz");

    // Generate speech
    let audioBuffer;
    try {
      const tts = edgeTts.tts;
      
      console.log("STEP 7: Calling tts() function");
      
      audioBuffer = await tts(text, {
        voice: voice || "tr-TR-AhmetNeural",
        rate: rate || "+0%",
        pitch: pitch || "+0Hz",
      });
      
      console.log("STEP 7: tts() completed");
      console.log("  Audio buffer type:", typeof audioBuffer);
      console.log("  Audio buffer length:", audioBuffer?.length || "undefined");
      console.log("  Audio buffer constructor:", audioBuffer?.constructor?.name);
      
    } catch (ttsError) {
      console.log("");
      console.log("STEP 7: FAILED - TTS generation error");
      console.log("  Error name:", ttsError.name);
      console.log("  Error message:", ttsError.message);
      console.log("  Error stack:", ttsError.stack?.substring(0, 1000));
      console.log("═══════════════════════════════════════════");
      
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "TTS generation failed",
          message: ttsError.message,
          stack: ttsError.stack,
          name: ttsError.name,
          step: "tts generation",
        }),
      };
    }

    console.log("");
    console.log("STEP 8: TTS success - preparing response");
    console.log("  Audio size:", audioBuffer.length, "bytes");

    // Convert Buffer to base64 for binary response
    const audioBase64 = audioBuffer.toString("base64");
    console.log("  Base64 length:", audioBase64.length);
    console.log("═══════════════════════════════════════════");

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
    console.log("");
    console.log("═══════════════════════════════════════════");
    console.log("STEP 9: UNHANDLED ERROR");
    console.log("═══════════════════════════════════════════");
    console.log("Error name:", error.name);
    console.log("Error message:", error.message);
    console.log("Error stack:", error.stack?.substring(0, 2000));
    console.log("═══════════════════════════════════════════");

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "TTS generation failed - unhandled error",
        message: error.message,
        stack: error.stack,
        name: error.name,
      }),
    };
  }
};