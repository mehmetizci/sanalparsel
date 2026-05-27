// This is a tiny valid MP3 file (silent audio frame) for demo purposes
// In production, this would be replaced with real TTS from Azure/OpenAI
export const DEMO_AUDIO_BASE64 = "//uQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

export const DEMO_AUDIO_DURATION = 1; // seconds

/**
 * Check if we have a real TTS API key configured
 */
export function hasTTSConfig(): boolean {
  return !!(process.env.AZURE_TTS_KEY || process.env.OPENAI_TTS_KEY);
}

/**
 * Get TTS provider type - checks for configured API keys
 */
export function getTTSProvider(): string {
  if (process.env.AZURE_TTS_KEY) return "azure";
  if (process.env.OPENAI_TTS_KEY) return "openai";
  return "demo";
}

// Voice mappings for Turkish
export const TURKISH_VOICES: Record<string, string> = {
  female: "tr-TR-EmelNeural",
  male: "tr-TR-AhmetNeural",
  corporate: "tr-TR-AhmetNeural",
};