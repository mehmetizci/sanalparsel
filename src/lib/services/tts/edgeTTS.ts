/**
 * Edge TTS Service
 * 
 * Uses Microsoft Edge's edge-tts CLI for text-to-speech synthesis.
 * This is a fallback provider when OpenAI TTS is unavailable.
 * 
 * Requires: edge-tts Python package
 * Installation: pip install edge-tts
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export interface EdgeTTSSettings {
  voice?: string;
  rate?: string;
  pitch?: string;
}

// Turkish voice mapping for Edge TTS
export const VOICE_MAP: Record<string, string> = {
  female: "tr-TR-EmelNeural",
  male: "tr-TR-AhmetNeural",
  corporate: "tr-TR-AhmetNeural",
  nova: "tr-TR-EmelNeural", // Map OpenAI voice names to Edge
  onyx: "tr-TR-AhmetNeural",
  shimmer: "tr-TR-EmelNeural",
  coral: "tr-TR-BuseNeural",
};

export type EdgeVoiceType = keyof typeof VOICE_MAP;

export interface GenerateAudioResult {
  success: boolean;
  audioPath?: string;
  audioBuffer?: Buffer;
  error?: string;
  settings?: {
    voice: string;
    provider: string;
  };
}

/**
 * Generate audio using Python edge-tts CLI
 */
export async function generateWithEdgeTTS(
  text: string,
  settings: EdgeTTSSettings = {}
): Promise<GenerateAudioResult> {
  const voice = settings.voice || "female";
  const selectedVoice = VOICE_MAP[voice] || VOICE_MAP.female;
  
  const outputPath = path.join(os.tmpdir(), `edge-tts-${Date.now()}.mp3`);
  
  console.log(`[EDGE TTS] Starting`);
  console.log(`[EDGE TTS] Voice: ${selectedVoice}`);
  
  return new Promise((resolve, reject) => {
    const rateArg = settings.rate ? `--rate=${settings.rate}` : "";
    const pitchArg = settings.pitch ? `--pitch=${settings.pitch}` : "";
    
    const args = [
      "-m",
      "edge_tts",
      "--voice",
      selectedVoice,
      "--text",
      text,
      "--write-media",
      outputPath,
    ];

    // Add rate and pitch if provided
    if (rateArg) args.push(rateArg);
    if (pitchArg) args.push(pitchArg);

    const child = spawn("python3", args);
    
    let errorOutput = "";
    
    child.on("error", (err) => {
      console.error(`[EDGE TTS] Spawn error: ${err.message}`);
      reject(new Error(`Failed to start edge-tts: ${err.message}`));
    });
    
    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });
    
    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`[EDGE TTS] Failed with exit code: ${code}`);
        console.error(`[EDGE TTS] Error: ${errorOutput || "Unknown error"}`);
        
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch {}

        reject(new Error(`edge-tts CLI failed with code ${code}: ${errorOutput}`));
        return;
      }
      
      if (!fs.existsSync(outputPath)) {
        console.error(`[EDGE TTS] Output file not created`);
        reject(new Error("edge-tts CLI did not create output file"));
        return;
      }
      
      try {
        const audioBuffer = fs.readFileSync(outputPath);
        
        // Clean up temp file
        try {
          fs.unlinkSync(outputPath);
        } catch {}
        
        if (!audioBuffer || audioBuffer.length === 0) {
          console.error(`[EDGE TTS] Empty audio buffer returned`);
          reject(new Error("edge-tts CLI returned empty audio buffer"));
          return;
        }
        
        console.log(`[EDGE TTS] MP3 created (${audioBuffer.length} bytes)`);
        
        resolve({
          success: true,
          audioBuffer,
          settings: {
            voice: selectedVoice,
            provider: "edge-tts",
          },
        });
        
      } catch (readError) {
        console.error(`[EDGE TTS] Failed to read output file: ${readError}`);
        reject(new Error(`Failed to read MP3 file: ${readError}`));
      }
    });
  });
}

/**
 * Generate audio using Python gTTS (Google Text-to-Speech) - Final fallback
 */
export async function generateWithGTTS(text: string): Promise<GenerateAudioResult> {
  const outputPath = path.join(os.tmpdir(), `gtts-${Date.now()}.mp3`);
  
  console.log(`[GTTS] Starting`);
  console.log(`[GTTS] Language: tr`);
  
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [
      "-c",
      `from gtts import gTTS; gTTS(text=${JSON.stringify(text)}, lang='tr').save(${JSON.stringify(outputPath)})`
    ]);
    
    let errorOutput = "";
    
    child.on("error", (err) => {
      console.error(`[GTTS] Spawn error: ${err.message}`);
      reject(new Error(`Failed to start gTTS: ${err.message}`));
    });
    
    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });
    
    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`[GTTS] Failed with exit code: ${code}`);
        console.error(`[GTTS] Error: ${errorOutput || "Unknown error"}`);
        
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch {}
        
        reject(new Error(`gTTS CLI failed with code ${code}: ${errorOutput}`));
        return;
      }
      
      if (!fs.existsSync(outputPath)) {
        console.error(`[GTTS] Output file not created`);
        reject(new Error("gTTS CLI did not create output file"));
        return;
      }
      
      try {
        const audioBuffer = fs.readFileSync(outputPath);
        
        try {
          fs.unlinkSync(outputPath);
        } catch {}
        
        if (!audioBuffer || audioBuffer.length === 0) {
          console.error(`[GTTS] Empty audio buffer returned`);
          reject(new Error("gTTS CLI returned empty audio buffer"));
          return;
        }
        
        console.log(`[GTTS] MP3 created (${audioBuffer.length} bytes)`);
        
        resolve({
          success: true,
          audioBuffer,
          settings: {
            voice: "gtts-default",
            provider: "gtts-fallback",
          },
        });
        
      } catch (readError) {
        console.error(`[GTTS] Failed to read output file: ${readError}`);
        reject(new Error(`Failed to read MP3 file: ${readError}`));
      }
    });
  });
}