/**
 * OpenAI TTS Service
 * 
 * Uses OpenAI's Audio Speech API for text-to-speech synthesis.
 * Optimized for Turkish real estate marketing content.
 * 
 * IMPORTANT: OpenAI client is initialized lazily inside the function
 * to avoid build-time errors when OPENAI_API_KEY is not set.
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";

// Default instructions for Turkish real estate narration
export const DEFAULT_TURKISH_INSTRUCTIONS = `Language: Turkish (Türkiye) — fluent, natural, modern and high-energy Turkish pronunciation.
Voice Affect: Maximum-energy cinematic real estate narration with dynamic tone shifts and strong vocal momentum.
Tone: Premium, persuasive, exciting and trustworthy.
Pacing: Very fast-paced but still clear and understandable, optimized for short-form real estate drone videos.
Delivery: Rapid during aerial drone scenes, investment opportunities, location advantages and unique selling points.
Emotion: Enthusiastic, ambitious, opportunity-focused and positive.
Personality: Charismatic, modern and engaging; like a premium Turkish real estate presenter narrating a cinematic drone commercial.
Pauses: Minimal, short and punchy pauses only after major selling points.
Narration Style: Fast cinematic Turkish drone-tour narration optimized for premium real estate marketing reels.`;

// Supported voices
export const OPENAI_TTS_VOICES = {
  nova: {
    id: "nova",
    name: "Nova",
    description: "Hızlı, canlı, modern emlak reels",
    character: "female",
  },
  onyx: {
    id: "onyx",
    name: "Onyx",
    description: "Premium, güçlü, ciddi",
    character: "male",
  },
  shimmer: {
    id: "shimmer",
    name: "Shimmer",
    description: "Yumuşak, kadın premium sunum",
    character: "female",
  },
  coral: {
    id: "coral",
    name: "Coral",
    description: "Sıcak, pozitif, doğal",
    character: "female",
  },
} as const;

export type OpenAIVoiceType = keyof typeof OPENAI_TTS_VOICES;

// Default settings
const DEFAULT_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const DEFAULT_VOICE = process.env.OPENAI_TTS_VOICE || "nova";
const DEFAULT_SPEED = parseFloat(process.env.OPENAI_TTS_SPEED || "1.55");
const DEFAULT_FORMAT = "mp3" as const;

export interface OpenAITTSSettings {
  model?: string;
  voice?: OpenAIVoiceType;
  speed?: number;
  response_format?: "mp3" | "opus" | "aac" | "flac";
  instructions?: string;
}

export interface GenerateAudioResult {
  success: boolean;
  audioPath?: string;
  audioBuffer?: Buffer;
  error?: string;
  settings?: {
    model: string;
    voice: string;
    speed: number;
    provider: string;
  };
}

/**
 * Generate audio using OpenAI's Audio Speech API
 */
export async function generateWithOpenAI(
  text: string,
  settings: OpenAITTSSettings = {}
): Promise<GenerateAudioResult> {
  const {
    model = DEFAULT_MODEL,
    voice = DEFAULT_VOICE as OpenAIVoiceType,
    speed = DEFAULT_SPEED,
    response_format = DEFAULT_FORMAT,
    instructions = DEFAULT_TURKISH_INSTRUCTIONS,
  } = settings;

  console.log("[OpenAI TTS] Starting generation");
  console.log(`[OpenAI TTS] Model: ${model}, Voice: ${voice}, Speed: ${speed}`);

  // Validate API key at runtime
  if (!process.env.OPENAI_API_KEY) {
    console.error("[OpenAI TTS] ERROR: OPENAI_API_KEY missing on backend environment");
    return { success: false, error: "OPENAI_API_KEY missing on backend environment" };
  }

  try {
    // Initialize OpenAI client at runtime (not at file level)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Call OpenAI Audio Speech API
    console.log("[OpenAI TTS] Calling OpenAI API...");
    const audioResponse = await openai.audio.speech.create({
      model: model,
      voice: voice,
      input: text,
      instructions: instructions,
      speed: speed,
      response_format: response_format,
    });

    // Get audio buffer
    const buffer = Buffer.from(await audioResponse.arrayBuffer());

    if (!buffer || buffer.length === 0) {
      console.error("[OpenAI TTS] Empty audio buffer returned");
      return { success: false, error: "OpenAI returned empty audio buffer" };
    }

    console.log(`[OpenAI TTS] Audio generated successfully (${buffer.length} bytes)`);

    return {
      success: true,
      audioBuffer: buffer,
      settings: {
        model,
        voice,
        speed,
        provider: "openai",
      },
    };
  } catch (error) {
    console.error("[OpenAI TTS] API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown OpenAI error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Save audio buffer to temporary file
 */
export async function saveToTempFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, filename);
  
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(filePath);
      }
    });
  });
}