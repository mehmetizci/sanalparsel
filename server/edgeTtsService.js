/**
 * Edge TTS Service
 * 
 * Shared core service for generating speech using Microsoft Edge TTS.
 * Used by both Vercel and Netlify serverless functions.
 */

const VOICE_MAP = {
  // Turkish voices
  "tr-TR-AhmetNeural": "tr-TR-AhmetNeural",
  "tr-TR-EmelNeural": "tr-TR-EmelNeural",
  "tr-TR-Ahmet": "tr-TR-Ahmet",
  "tr-TR-ZeynepNeural": "tr-TR-ZeynepNeural",
  
  // English fallback voices
  "en-US-JennyNeural": "en-US-JennyNeural",
  "en-US-GuyNeural": "en-US-GuyNeural",
};

// Default voice
const DEFAULT_VOICE = "tr-TR-AhmetNeural";

// Max text length to prevent serverless timeout (5000 chars)
const MAX_TEXT_LENGTH = 5000;

/**
 * Generate speech using Edge TTS
 * @param {Object} options - Speech generation options
 * @param {string} options.text - Text to synthesize
 * @param {string} [options.voice] - Voice name (defaults to tr-TR-AhmetNeural)
 * @param {string} [options.rate] - Speech rate (e.g., "+0%", "-10%")
 * @param {string} [options.pitch] - Speech pitch (e.g., "+0Hz", "-2Hz")
 * @returns {Promise<{audio: Buffer, duration: number}>}
 */
async function generateSpeech({ text, voice, rate, pitch }) {
  // Validate input
  if (!text || typeof text !== "string") {
    throw new Error("Text is required");
  }
  
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
  }
  
  // Validate voice
  const selectedVoice = voice && VOICE_MAP[voice] ? voice : DEFAULT_VOICE;
  
  // Use edge-tts library
  const edgeTts = await import("edge-tts/out/index.js");
  const tts = edgeTts.tts;
  
  // Generate audio
  const audioBuffer = await tts(text, {
    voice: selectedVoice,
    rate: rate || "+0%",
    pitch: pitch || "+0Hz",
  });
  
  // Calculate approximate duration (rough estimate: ~150 chars per second)
  const duration = Math.ceil(text.length / 150);
  
  return {
    audio: audioBuffer,
    duration,
    voice: selectedVoice,
  };
}

/**
 * Get available voices
 */
function getAvailableVoices() {
  return Object.keys(VOICE_MAP);
}

/**
 * Validate TTS request
 */
function validateRequest(body) {
  const errors = [];
  
  if (!body.text || typeof body.text !== "string") {
    errors.push("text is required");
  } else if (body.text.length > MAX_TEXT_LENGTH) {
    errors.push(`text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
  }
  
  if (body.voice && !VOICE_MAP[body.voice]) {
    errors.push(`invalid voice: ${body.voice}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  generateSpeech,
  getAvailableVoices,
  validateRequest,
  DEFAULT_VOICE,
  MAX_TEXT_LENGTH,
  VOICE_MAP,
};