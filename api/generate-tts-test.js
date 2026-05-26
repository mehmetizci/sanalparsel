/**
 * Test TTS Endpoint
 * 
 * Returns a minimal fake MP3 blob to test frontend blob handling.
 * This confirms if the problem is in the frontend or backend.
 */

const MINIMAL_MP3 = Buffer.from([
  0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
]);

module.exports = async function handler(req, res) {
  console.log("═══════════════════════════════════════════");
  console.log("TEST ENDPOINT: /api/generate-tts-test");
  console.log("═══════════════════════════════════════════");
  console.log("Method:", req.method);
  
  if (req.method !== "POST") {
    console.log("Only POST supported");
    console.log("═══════════════════════════════════════════");
    return res.status(405).json({
      error: "Method not allowed",
      details: "Only POST method is supported"
    });
  }

  try {
    const { text, voice, fake } = req.body || {};
    
    console.log("Text length:", text?.length || 0);
    console.log("Voice:", voice || "default");
    console.log("Fake mode:", fake || false);
    
    // If fake=true, return JSON test response (not audio)
    if (fake === true) {
      console.log("");
      console.log("FAKE MODE: Returning JSON test response");
      console.log("═══════════════════════════════════════════");
      
      return res.status(200).json({
        ok: true,
        message: "Test endpoint works",
        mode: "fake-json"
      });
    }
    
    console.log("");
    console.log("REAL MODE: Returning minimal MP3 blob");
    console.log("MP3 size:", MINIMAL_MP3.length, "bytes");
    console.log("═══════════════════════════════════════════");
    
    // Return minimal MP3 blob
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    
    return res.send(MINIMAL_MP3);
  } catch (error) {
    console.log("");
    console.log("ERROR:", error.message);
    console.log("═══════════════════════════════════════════");
    
    return res.status(500).json({
      error: "Test endpoint failed",
      message: error.message,
      stack: error.stack
    });
  }
};