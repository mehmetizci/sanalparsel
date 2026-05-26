/**
 * SanalParsel TTS Backend - Express Server
 * 
 * Runs on Render as a standalone backend service.
 * 
 * Endpoints:
 * - GET /health - Health check
 * - POST /generate-tts - Generate TTS audio
 */

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// Edge TTS - use pre-compiled JS from node_modules/edge-tts/out/index.js
// We need to use dynamic import with file:// protocol for ESM
async function getEdgeTts() {
  // Import the compiled JS file directly
  const module = await import("edge-tts/out/index.js");
  return module.tts || module.default;
}

// ─── Middleware ────────────────────────────────────────────────────────────────

// CORS - allow all origins for universal access
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// JSON body parser
app.use(express.json({ limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ─── Health Endpoint ───────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  console.log("=== HEALTH CHECK ===");
  console.log("Status: OK");
  console.log("Time:", new Date().toISOString());
  console.log("====================");
  
  res.json({ 
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "sanalparsel-tts-backend"
  });
});

// ─── TTS Generation Endpoint ──────────────────────────────────────────────────

app.post("/generate-tts", async (req, res) => {
  console.log("═══════════════════════════════════════");
  console.log("=== TTS GENERATION REQUEST ===");
  console.log("═══════════════════════════════════════");
  
  try {
    const { text, voice, rate, pitch } = req.body || {};
    
    console.log("Received body:");
    console.log("  - text:", text ? `${text.substring(0, 100)}...` : "MISSING");
    console.log("  - voice:", voice || "default");
    console.log("  - rate:", rate || "+0%");
    console.log("  - pitch:", pitch || "+0Hz");
    
    // Validate required fields
    if (!text || typeof text !== "string") {
      console.log("=== ERROR: Missing text ===");
      return res.status(400).json({
        success: false,
        error: "Metin eksik",
        details: "text alanı zorunludur"
      });
    }
    
    // Max text length
    const MAX_TEXT_LENGTH = 5000;
    if (text.length > MAX_TEXT_LENGTH) {
      console.log("=== ERROR: Text too long ===");
      return res.status(400).json({
        success: false,
        error: "Metin çok uzun",
        details: `Metin ${MAX_TEXT_LENGTH} karakterden uzun olamaz`
      });
    }
    
    // Voice mapping
    const VOICE_MAP = {
      "female": "tr-TR-EmelNeural",
      "male": "tr-TR-AhmetNeural",
      "corporate": "tr-TR-AhmetNeural",
      // Direct voice names
      "tr-TR-EmelNeural": "tr-TR-EmelNeural",
      "tr-TR-AhmetNeural": "tr-TR-AhmetNeural",
      "tr-TR-ZeynepNeural": "tr-TR-ZeynepNeural",
    };
    
    // Get voice
    let selectedVoice = VOICE_MAP[voice] || "tr-TR-AhmetNeural";
    
    // Handle direct voice name in text
    if (!VOICE_MAP[voice] && voice && voice.startsWith("tr-TR")) {
      selectedVoice = voice;
    }
    
    console.log("Selected voice:", selectedVoice);
    
    // Use Edge TTS
    console.log("=== GENERATING SPEECH ===");
    
    const tts = await getEdgeTts();
    
    const audioBuffer = await tts(text, {
      voice: selectedVoice,
      rate: rate || "+0%",
      pitch: pitch || "+0Hz",
      format: "audio-24khz-96kbitrate-mono-mp3"
    });
    
    console.log("=== TTS GENERATION SUCCESS ===");
    console.log("Audio buffer size:", audioBuffer.length, "bytes");
    console.log("==========================");
    
    // Calculate duration estimate
    const duration = Math.ceil(text.length / 150);
    
    // Return JSON with audio data
    // For production, you might want to upload to S3/Cloud storage
    // and return a URL instead of base64
    const audioBase64 = audioBuffer.toString("base64");
    
    return res.json({
      success: true,
      audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
      audioData: audioBase64,
      duration: duration,
      voice: selectedVoice,
      textLength: text.length
    });
    
  } catch (error) {
    console.log("═══════════════════════════════════════");
    console.log("=== TTS GENERATION ERROR ===");
    console.log("Error:", error.message);
    console.log("Stack:", error.stack);
    console.log("═══════════════════════════════════════");
    
    return res.status(500).json({
      success: false,
      error: "Ses oluşturma hatası",
      details: error.message
    });
  }
});

// ─── Root Endpoint ─────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({
    service: "SanalParsel TTS Backend",
    version: "1.0.0",
    endpoints: [
      "GET /health - Health check",
      "POST /generate-tts - Generate TTS audio"
    ]
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    method: req.method
  });
});

// ─── Error Handler ─────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log("═══════════════════════════════════════");
  console.log("SanalParsel TTS Backend");
  console.log("═══════════════════════════════════════");
  console.log(`Server running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`TTS: http://localhost:${PORT}/generate-tts`);
  console.log("═══════════════════════════════════════");
});

module.exports = app;