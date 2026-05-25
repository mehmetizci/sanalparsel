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

  // Use default voice if not specified
  const selectedVoice = voice || "tr-TR-AhmetNeural";
  const selectedRate = rate || "0%";
  const selectedPitch = pitch || "0Hz";

  console.log("=== TTS POST REQUEST ===");
  console.log("Text length:", text.length, "chars");
  console.log("Text preview:", text.substring(0, 100) + (text.length > 100 ? "..." : ""));
  console.log("Voice:", selectedVoice);
  console.log("Rate:", selectedRate);
  console.log("Pitch:", selectedPitch);
  console.log("========================");

  // Build request payload
  const payload = {
    text,
    voice: selectedVoice,
    rate: selectedRate,
    pitch: selectedPitch,
  };

  console.log("POST body:", JSON.stringify(payload, null, 2).substring(0, 500));

  try {
    console.log("Calling /api/generate-tts...");
    
    const response = await fetch("/api/generate-tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("=== TTS RESPONSE ===");
    console.log("Status:", response.status);
    console.log("StatusText:", response.statusText);
    console.log("Content-Type:", response.headers.get("Content-Type"));
    console.log("===================");

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

      console.error("TTS Error Response:", errorDetails);

      throw {
        error: "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        details: errorDetails,
      };
    }

    // Get content type
    const contentType = response.headers.get("Content-Type") || "";
    
    console.log("Processing response as blob...");
    
    // Always try to read as blob first (for audio responses)
    const audioBlob = await response.blob();
    console.log("Blob size:", audioBlob.size, "bytes");
    console.log("Blob type:", audioBlob.type);

    // Check if response is actually audio or JSON error
    if (contentType.includes("audio") || contentType.includes("mpeg") || audioBlob.type.includes("audio")) {
      console.log("Response is audio - creating preview");
      
      // Calculate duration
      const duration = await getAudioDuration(audioBlob);
      console.log("Audio duration:", duration, "seconds");

      return {
        audioBlob,
        duration,
      };
    } else {
      // Might be JSON error in blob body - try to read as text
      console.log("Response might be JSON, checking content...");
      
      const textResponse = await audioBlob.text();
      console.log("Raw response (first 500 chars):", textResponse.substring(0, 500));
      
      // Try to parse as JSON
      try {
        const jsonResponse = JSON.parse(textResponse);
        console.error("JSON Error Response:", jsonResponse);
        throw {
          error: jsonResponse.error || "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
          details: jsonResponse.details || "Unknown error",
        };
      } catch (parseErr) {
        if (parseErr && typeof parseErr === "object" && "error" in parseErr) {
          throw parseErr;
        }
        
        // Not JSON - might be test response or other format
        if (textResponse.includes("ok") || textResponse.includes("success")) {
          console.log("Test response received:", textResponse);
          // This is a test/success response, not actual audio
          throw {
            error: "Test modunda ses oluşturulamadı",
            details: textResponse,
          };
        }
        
        console.error("Could not parse response as audio or JSON");
        throw {
          error: "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
          details: "Invalid response format from server",
        };
      }
    }
  } catch (err) {
    // Log the error
    console.error("=== TTS EXCEPTION ===");
    if (err instanceof Error) {
      console.error("Exception message:", err.message);
      console.error("Exception stack:", err.stack);
      throw {
        error: "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        details: err.message,
      };
    }

    // Re-throw known errors
    if (typeof err === "object" && err !== null && "error" in err) {
      console.error("TTS Error object:", err);
      throw err;
    }

    // Unknown error
    console.error("Unknown TTS error:", err);
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