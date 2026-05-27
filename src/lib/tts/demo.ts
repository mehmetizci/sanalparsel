/**
 * TTS Voice Mappings for Turkish
 * 
 * Production'da Edge TTS CLI kullanılır.
 * Demo audio fallback kaldırıldı - gerçek hata döner.
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
  return "edge-tts-cli";
}