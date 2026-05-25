/**
 * TTS Client
 * 
 * Frontend client for Text-to-Speech generation.
 * Always calls /api/generate-tts endpoint regardless of hosting platform.
 */

export interface TTSRequest {
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
}

export interface TTSResponse {
  audioBlob: Blob;
  duration: number;
}

export interface TTSError {
  error: string;
  details?: string;
}

/**
 * Generate speech using the TTS API
 * 
 * @param request - TTS request options
 * @returns Promise with audio blob and duration
 * @throws TTSError on failure
 */
export async function generateTTS(request: TTSRequest): Promise<TTSResponse> {
  const { text, voice, rate, pitch } = request;

  // Validate input
  if (!text || text.trim().length === 0) {
    throw { error: "Metin boş olamaz", details: "Text is required" };
  }

  if (text.length > 5000) {
    throw { error: "Metin çok uzun", details: "Text exceeds maximum length of 5000 characters" };
  }

  console.log("[TTS Client] Generating speech...");
  console.log("[TTS Client] Text length:", text.length);
  console.log("[TTS Client] Voice:", voice || "default (tr-TR-AhmetNeural)");
  console.log("[TTS Client] Rate:", rate || "+0%");
  console.log("[TTS Client] Pitch:", pitch || "+0Hz");

  try {
    const response = await fetch("/api/generate-tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice: voice || "tr-TR-AhmetNeural",
        rate: rate || "+0%",
        pitch: pitch || "+0Hz",
      }),
    });

    console.log("[TTS Client] Response status:", response.status);
    console.log("[TTS Client] Response statusText:", response.statusText);
    console.log("[TTS Client] Content-Type:", response.headers.get("Content-Type"));

    // Check for non-ok responses
    if (!response.ok) {
      let errorDetails = "";
      
      try {
        const errorBody = await response.json();
        errorDetails = errorBody.error || errorBody.details || JSON.stringify(errorBody);
      } catch {
        // Not JSON, try text
        try {
          errorDetails = await response.text();
        } catch {
          errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        }
      }

      console.error("[TTS Client] Error response:", errorDetails);

      throw {
        error: "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        details: errorDetails,
      };
    }

    // Check content type
    const contentType = response.headers.get("Content-Type") || "";
    
    // Get response as array buffer first (works for both direct binary and base64)
    const arrayBuffer = await response.arrayBuffer();
    
    if (contentType.includes("audio") || contentType.includes("mpeg")) {
      // Direct binary audio
      const audioBlob = new Blob([arrayBuffer], { type: "audio/mpeg" });
      console.log("[TTS Client] Audio blob size:", audioBlob.size, "bytes");
      
      // Calculate duration
      const duration = await getAudioDuration(audioBlob);
      console.log("[TTS Client] Audio duration:", duration, "seconds");

      return {
        audioBlob,
        duration,
      };
    }
    
    // Try to parse as JSON error or base64 audio
    try {
      const decoder = new TextDecoder();
      const textResponse = decoder.decode(arrayBuffer);
      
      // Check if it's JSON error
      const jsonStart = textResponse.trim().startsWith("{");
      if (jsonStart) {
        const errorBody = JSON.parse(textResponse);
        throw {
          error: "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
          details: errorBody.error || errorBody.details || "Invalid response",
        };
      }
      
      // Might be base64 encoded audio (Netlify)
      try {
        const binaryString = atob(textResponse.trim());
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: "audio/mpeg" });
        console.log("[TTS Client] Base64 audio decoded, size:", audioBlob.size, "bytes");
        
        const duration = await getAudioDuration(audioBlob);
        console.log("[TTS Client] Audio duration:", duration, "seconds");

        return {
          audioBlob,
          duration,
        };
      } catch {
        // Not base64 either
        console.error("[TTS Client] Unknown response format");
        throw {
          error: "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
          details: "Invalid response format from server",
        };
      }
    } catch (parseErr) {
      if (parseErr && typeof parseErr === "object" && "error" in parseErr) {
        throw parseErr;
      }
      
      console.error("[TTS Client] Response parse error:", parseErr);
      throw {
        error: "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        details: "Failed to parse response",
      };
    }
  } catch (err) {
    // Log the error
    if (err instanceof Error) {
      console.error("[TTS Client] Exception:", err.message);
      console.error("[TTS Client] Stack:", err.stack);
      throw {
        error: "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        details: err.message,
      };
    }

    // Re-throw known errors
    if (typeof err === "object" && err !== null && "error" in err) {
      throw err;
    }

    // Unknown error
    console.error("[TTS Client] Unknown error:", err);
    throw {
      error: "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
      details: String(err),
    };
  }
}

/**
 * Get audio duration from blob
 */
function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    audio.src = url;
    
    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });

    // Fallback timeout
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(0);
    }, 5000);
  });
}

/**
 * Check if TTS service is available
 */
export async function checkTTSService(): Promise<boolean> {
  try {
    const response = await fetch("/api/generate-tts", {
      method: "HEAD",
    });
    return response.ok;
  } catch {
    return false;
  }
}