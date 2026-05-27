// This is a tiny valid MP3 file (silent audio frame) for demo purposes
// In production, this would be replaced with real TTS from Edge TTS
export const DEMO_AUDIO_BASE64 = "//uQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

export const DEMO_AUDIO_DURATION = 1; // seconds

/**
 * Get TTS provider type - currently only Edge TTS is supported
 */
export function getTTSProvider(): string {
  return "edge"; // Always use Edge TTS (free)
}

// Voice mappings for Turkish
export const TURKISH_VOICES: Record<string, string> = {
  female: "tr-TR-EmelNeural",
  male: "tr-TR-AhmetNeural",
  corporate: "tr-TR-AhmetNeural",
};