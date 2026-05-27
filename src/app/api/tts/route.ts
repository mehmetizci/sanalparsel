import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-admin";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

// Node.js runtime强制要求 - Edge TTS CLI需要完整的Node.js环境
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bucket name for generated audio
const STORAGE_BUCKET = "generated-audio";

// Turkish voice mapping
const VOICE_MAP: Record<string, string> = {
  female: "tr-TR-EmelNeural",
  male: "tr-TR-AhmetNeural",
  corporate: "tr-TR-AhmetNeural",
};

// Request body type
interface TTSRequestBody {
  text: string;
  voice: string;
  userId: string;
  projectId: string;
}

/**
 * Generate audio using Python edge-tts CLI with spawn
 */
function generateAudioWithCLI(
  text: string,
  voice: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(os.tmpdir(), `tts-${Date.now()}.mp3`);
    
    console.log(`[EDGE TTS CLI] Starting`);
    console.log(`[EDGE TTS CLI] Command: python3 -m edge_tts --voice ${voice} --text "..." --write-media ${outputPath}`);
    
    // Use spawn with argument array - safe from injection
    const child = spawn("python3", [
      "-m",
      "edge_tts",
      "--voice",
      voice,
      "--text",
      text,
      "--write-media",
      outputPath
    ]);
    
    let errorOutput = "";
    
    child.on("error", (err) => {
      console.error(`[EDGE TTS CLI] Spawn error: ${err.message}`);
      reject(new Error(`Failed to start edge-tts: ${err.message}`));
    });
    
    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });
    
    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`[EDGE TTS CLI] Exit code: ${code}`);
        console.error(`[EDGE TTS CLI] stderr: ${errorOutput}`);
        
        // Clean up temp file on error
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch {}
        
        reject(new Error(`edge-tts CLI exited with code ${code}`));
        return;
      }
      
      // Check if file was created
      if (!fs.existsSync(outputPath)) {
        reject(new Error("edge-tts CLI did not create output file"));
        return;
      }
      
      // Read the generated file
      try {
        const audioBuffer = fs.readFileSync(outputPath);
        
        // Clean up temp file
        try {
          fs.unlinkSync(outputPath);
        } catch {}
        
        if (!audioBuffer || audioBuffer.length === 0) {
          reject(new Error("edge-tts CLI returned empty audio buffer"));
          return;
        }
        
        console.log(`[EDGE TTS CLI] MP3 created`);
        resolve(audioBuffer);
        
      } catch (readError) {
        reject(new Error(`Failed to read MP3 file: ${readError}`));
      }
    });
  });
}

export async function POST(request: NextRequest) {
  const requestId = Date.now();
  
  console.log("=".repeat(60));
  console.log(`[TTS:${requestId}] ===== TTS REQUEST STARTED =====`);
  
  try {
    const body: TTSRequestBody = await request.json();
    const { text, voice = "female", userId, projectId } = body;

    console.log(`[TTS:${requestId}] [INPUT]`);
    console.log(`  text length: ${text?.length || 0}`);
    console.log(`  voice: ${voice}`);
    console.log(`  userId: ${userId}`);
    console.log(`  projectId: ${projectId}`);

    if (!text) {
      console.log(`[TTS:${requestId}] [ERROR] Missing text`);
      return NextResponse.json(
        { success: false, error: "Metin gereklidir" },
        { status: 400 }
      );
    }

    if (!userId || !projectId) {
      console.log(`[TTS:${requestId}] [ERROR] Missing userId or projectId`);
      return NextResponse.json(
        { success: false, error: "Kullanıcı ve proje bilgisi gereklidir" },
        { status: 400 }
      );
    }

    // Get voice ID from voice type
    const selectedVoice = VOICE_MAP[voice] || VOICE_MAP.female;
    console.log(`[TTS:${requestId}] [VOICE] Selected: ${selectedVoice}`);

    // Generate audio with CLI
    const audioBuffer = await generateAudioWithCLI(text, selectedVoice);

    // Generate storage path
    const timestamp = Date.now();
    const fileName = `voice-${voice}-${timestamp}.mp3`;
    const storagePath = `${userId}/${projectId}/${fileName}`;

    // Create Supabase client
    const supabase = createServerClient();

    // Check/create bucket
    const { error: bucketError } = await supabase.storage.getBucket(STORAGE_BUCKET);
    
    if (bucketError) {
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (createError) {
        console.error(`[TTS:${requestId}] [ERROR] Bucket creation failed:`, createError);
        return NextResponse.json(
          { success: false, error: `Bucket oluşturulamadı: ${createError.message}` },
          { status: 500 }
        );
      }
    }

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error(`[TTS:${requestId}] [ERROR] Upload failed:`, uploadError);
      return NextResponse.json(
        { success: false, error: `Dosya yüklenemedi: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log(`[SUPABASE] Upload successful`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log(`[TTS] Public URL returned: ${publicUrl}`);

    console.log(`[TTS:${requestId}] [SUCCESS] Audio URL ready`);

    return NextResponse.json({
      success: true,
      audioUrl: publicUrl,
      storagePath: storagePath,
      duration: Math.ceil(text.length / 15),
      provider: "edge-tts-cli",
      voice: selectedVoice,
      fileSize: audioBuffer.length,
    });
    
  } catch (error) {
    console.error(`[TTS:${requestId}] [FATAL ERROR]`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Ses oluşturulurken hata oluştu";
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  } finally {
    console.log(`[TTS:${requestId}] ===== TTS REQUEST ENDED =====`);
    console.log("=".repeat(60));
  }
}

// OPTIONS method for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}