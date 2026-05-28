/**
 * TTS Service Index
 * 
 * Unified interface for text-to-speech generation.
 * Supports multiple providers with OpenAI as default.
 */

import { generateWithOpenAI, DEFAULT_TURKISH_INSTRUCTIONS, OPENAI_TTS_VOICES } from "./openaiTTS";
import { generateWithEdgeTTS, generateWithGTTS } from "./edgeTTS";

// Re-export types
export { OPENAI_TTS_VOICES, DEFAULT_TURKISH_INSTRUCTIONS } from "./openaiTTS";
export type { OpenAIVoiceType } from "./openaiTTS";
export { VOICE_MAP } from "./edgeTTS";
export type { EdgeVoiceType, EdgeTTSSettings } from "./edgeTTS";

// Provider type
export type TTSProvider = "openai" | "edge-tts" | "gtts-fallback";

// Request options
export interface TTSSettings {
  provider?: TTSProvider;
  voice?: string;
  speed?: number;
  instructions?: string;
}

export interface TTSTextOptions {
  text: string;
  projectId: string;
  userId: string;
  settings?: TTSSettings;
}

export interface TTSGenerateResult {
  success: boolean;
  audioUrl?: string;
  storagePath?: string;
  duration?: number;
  provider?: string;
  voice?: string;
  speed?: number;
  error?: string;
  errorMessage?: string;
  fallbackUsed?: boolean;
}

// Default provider
const DEFAULT_PROVIDER = (process.env.TTS_PROVIDER as TTSProvider) || "openai";
const DEFAULT_VOICE = process.env.OPENAI_TTS_VOICE || "nova";
const DEFAULT_SPEED = parseFloat(process.env.OPENAI_TTS_SPEED || "1.55");

// Supabase storage client type - using 'any' for flexibility with Supabase client variations
type SupabaseStorageClient = {
  storage: {
    from: (bucket: string) => {
      upload: (path: string, data: Buffer, options: { contentType: string; upsert: boolean }) => Promise<{ error: { message: string } | null }>;
      getPublicUrl: (path: string) => { data?: { publicUrl: string }; publicUrl?: string };
    };
  };
};

/**
 * Generate audio with the specified provider
 * 
 * IMPORTANT: When user explicitly selects "openai", do NOT silently fall back to Edge TTS.
 * If OpenAI fails, return error with fallbackUsed: true so UI can show user message.
 */
export async function generateAudio(
  options: TTSTextOptions,
  supabase: SupabaseStorageClient
): Promise<TTSGenerateResult> {
  const { text, projectId, userId, settings = {} } = options;
  
  const provider = settings.provider || DEFAULT_PROVIDER;
  const voice = settings.voice || DEFAULT_VOICE;
  const speed = settings.speed || DEFAULT_SPEED;
  
  console.log(`[TTS Service] === Generating audio for project ${projectId} ===`);
  console.log(`[TTS Service] Selected provider: ${provider}`);
  console.log(`[TTS Service] Voice: ${voice}, Speed: ${speed}`);
  
  let audioBuffer: Buffer | null = null;
  let audioSettings: Record<string, unknown> = {};
  let fallbackUsed = false;
  let usedProvider = provider;
  
  // Try primary provider based on explicit selection
  if (provider === "openai") {
    console.log("[TTS Service] Requested provider: OPENAI - attempting OpenAI TTS...");
    
    const openaiResult = await generateWithOpenAI(text, {
      voice: voice as "nova" | "onyx" | "shimmer" | "coral",
      speed: speed,
      instructions: settings.instructions || DEFAULT_TURKISH_INSTRUCTIONS,
    });
    
    if (openaiResult.success && openaiResult.audioBuffer) {
      audioBuffer = openaiResult.audioBuffer;
      audioSettings = openaiResult.settings || {};
      usedProvider = "openai";
      console.log("[TTS Service] ✓ OpenAI TTS successful");
    } else {
      // OpenAI failed - do NOT silently fallback if user explicitly chose openai
      console.error("[TTS Service] ✗ OpenAI TTS FAILED");
      console.error(`[TTS Service] Error: ${openaiResult.error}`);
      console.error("[TTS Service] NOT falling back to Edge TTS - user explicitly selected OpenAI");
      
      // Return error with fallbackUsed: true so UI knows to show message
      return {
        success: false,
        error: openaiResult.error || "OpenAI TTS failed",
        errorMessage: `OpenAI TTS başarısız oldu: ${openaiResult.error}. Lütfen Edge TTS seçin veya daha sonra tekrar deneyin.`,
        fallbackUsed: true, // Indicates OpenAI was attempted but failed
      };
    }
  } else {
    // User explicitly chose edge-tts - use Edge TTS directly
    console.log("[TTS Service] Requested provider: EDGE_TTS - using Edge TTS...");
    
    try {
      const edgeResult = await generateWithEdgeTTS(text, { voice });
      if (edgeResult.success && edgeResult.audioBuffer) {
        audioBuffer = edgeResult.audioBuffer;
        audioSettings = edgeResult.settings || {};
        usedProvider = "edge-tts";
        console.log("[TTS Service] ✓ Edge TTS successful");
      }
    } catch (edgeError) {
      console.error(`[TTS Service] Edge TTS failed: ${edgeError}`);
      
      // Try gTTS as fallback for edge-tts selection
      try {
        const gttsResult = await generateWithGTTS(text);
        if (gttsResult.success && gttsResult.audioBuffer) {
          audioBuffer = gttsResult.audioBuffer;
          audioSettings = gttsResult.settings || {};
          usedProvider = "gtts-fallback";
          fallbackUsed = true;
          console.log("[TTS Service] gTTS fallback successful");
        }
      } catch (gttsError) {
        console.error(`[TTS Service] gTTS fallback also failed: ${gttsError}`);
      }
    }
  }
  
  // Check if we got audio
  if (!audioBuffer || audioBuffer.length === 0) {
    return {
      success: false,
      error: "Audio generation failed",
      errorMessage: "Ses oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
    };
  }
  
  // Upload to Supabase Storage
  console.log("[TTS Service] Uploading to Supabase Storage...");
  console.log(`[TTS Service] Used provider: ${usedProvider}`);
  
  const timestamp = Date.now();
  const providerTag = usedProvider;
  const fileName = `voice-${providerTag}-${timestamp}.mp3`;
  const storagePath = `${userId}/${projectId}/${fileName}`;
  
  try {
    const { error: uploadError } = await supabase.storage
      .from("generated-audio")
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });
    
    if (uploadError) {
      console.error(`[TTS Service] Upload error: ${uploadError.message}`);
      return {
        success: false,
        error: uploadError.message,
        errorMessage: "Ses dosyası yüklenemedi",
      };
    }
    
    // Get public URL - handle both return styles: { publicUrl } or { data: { publicUrl } }
    const urlData = supabase.storage
      .from("generated-audio")
      .getPublicUrl(storagePath);
    
    console.log("[TTS Service] Upload successful");
    
    // Extract URL from either format
    const audioUrl = urlData.publicUrl || urlData.data?.publicUrl || "";
    
    // Estimate duration (rough approximation)
    const duration = Math.ceil(text.length / (speed * 10));
    
    // Get voice from audioSettings or use the passed voice
    const returnedVoice = (audioSettings.voice as string) || voice;
    
    console.log(`[TTS Service] === Audio generation COMPLETE ===`);
    console.log(`[TTS Service] Provider: ${usedProvider}, Voice: ${returnedVoice}, Speed: ${speed}`);
    console.log(`[TTS Service] Fallback used: ${fallbackUsed}`);
    
    return {
      success: true,
      audioUrl: audioUrl,
      storagePath: storagePath,
      duration: duration,
      provider: usedProvider,
      voice: returnedVoice,
      speed: speed,
      fallbackUsed: fallbackUsed,
    };
    
  } catch (error) {
    console.error("[TTS Service] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorMessage: "Ses oluşturulurken beklenmeyen hata oluştu",
    };
  }
}

// Helper function to ensure bucket exists
export async function ensureStorageBucket(
  supabase: {
    storage: {
      getBucket: (bucket: string) => Promise<{ error: { message: string } | null }>;
      createBucket: (bucket: string, options: { public: boolean; fileSizeLimit: number }) => Promise<{ error: { message: string } | null }>;
    };
  }
): Promise<boolean> {
  const bucketName = "generated-audio";
  
  try {
    const { error } = await supabase.storage.getBucket(bucketName);
    
    if (error) {
      // Bucket doesn't exist, create it
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (createError) {
        console.error(`[TTS Service] Failed to create bucket: ${createError.message}`);
        return false;
      }
    }
    
    return true;
  } catch (err) {
    console.error("[TTS Service] Bucket check failed:", err);
    return false;
  }
}

// Export available voices for frontend
export const AVAILABLE_VOICES = {
  openai: Object.entries(OPENAI_TTS_VOICES).map(([key, voice]) => ({
    id: key,
    name: voice.name,
    description: voice.description,
    character: voice.character,
  })),
  edge: [
    { id: "female", name: "Kadın", description: "Türkçe kadın sesi", character: "female" },
    { id: "male", name: "Erkek", description: "Türkçe erkek sesi", character: "male" },
    { id: "corporate", name: "Kurumsal", description: "Profesyonel erkek sesi", character: "male" },
  ],
};

// Export available speeds
export const AVAILABLE_SPEEDS = [
  { id: "1.25", label: "1.25x", description: "Normal canlı" },
  { id: "1.45", label: "1.45x", description: "Hızlı" },
  { id: "1.55", label: "1.55x", description: "Reels hızlı" },
  { id: "1.75", label: "1.75x", description: "Çok hızlı" },
];

// Default instructions for UI reference
export const DEFAULT_INSTRUCTIONS = DEFAULT_TURKISH_INSTRUCTIONS;