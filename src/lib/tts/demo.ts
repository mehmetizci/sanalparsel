/**
 * TTS Voice Mappings for Turkish
 * 
 * Production'da Edge TTS CLI kullanılır (primary).
 * Edge TTS 403 veya herhangi bir hata verirse gTTS fallback kullanılır.
 * Her iki provider da başarısız olursa hata döner (demo audio yok).
 */

// Voice mappings for Turkish
export const TURKISH_VOICES: Record<string, string> = {
  female: "tr-TR-EmelNeural",
  male: "tr-TR-AhmetNeural",
  corporate: "tr-TR-AhmetNeural",
};

/**
 * Get TTS provider type
 */
export function getTTSProvider(): string {
  return "edge-tts";
}