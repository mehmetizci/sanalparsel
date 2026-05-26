/**
 * TTS Client
 * 
 * Frontend client for Text-to-Speech generation.
 * Uses VITE_TTS_API_URL environment variable if available,
 * otherwise falls back to /api/generate-tts (for local/Vercel).
 */

export interface TTSRequest {
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
}

export interface TTSResponse {
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
}

export interface TTSError {
  error: string;
  details?: string;
}

// Environment variable for Render backend URL
const TTS_API_URL = import.meta.env.VITE_TTS_API_URL || "";

// Build endpoint URL - uses env var if set, otherwise relative path
function getEndpoint(): string {
  if (TTS_API_URL) {
    const baseUrl = TTS_API_URL.replace(/\/$/, ""); // Remove trailing slash
    return `${baseUrl}/generate-tts`;
  }
  return "/api/generate-tts";
}

/**
 * Generate speech using the TTS API
 * 
 * @param request - TTS request options
 * @returns Promise with audio blob, URL, and duration
 * @throws TTSError on failure
 */
export async function generateTTS(request: TTSRequest): Promise<TTSResponse> {
  const { text, voice, rate, pitch } = request;
  
  const endpoint = getEndpoint();

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

  console.log("═══════════════════════════════════════");
  console.log("=== TTS CLIENT - POST REQUEST ===");
  console.log("═══════════════════════════════════════");
  console.log("Endpoint:", endpoint);
  console.log("Method: POST");
  console.log("Content-Type: application/json");
  if (TTS_API_URL) {
    console.log("Using backend:", TTS_API_URL);
  } else {
    console.log("Using local API: /api/generate-tts");
  }
  console.log("");
  console.log("Text length:", text.length, "chars");
  console.log("Text preview (first 100):", text.substring(0, 100) + (text.length > 100 ? "..." : ""));
  console.log("Voice:", selectedVoice);
  console.log("Rate:", selectedRate);
  console.log("Pitch:", selectedPitch);
  console.log("═══════════════════════════════════════");

  // Build request payload
  const payload = {
    text,
    voice: selectedVoice,
    rate: selectedRate,
    pitch: selectedPitch,
  };

  const bodyString = JSON.stringify(payload);
  console.log("POST body (first 500):", bodyString.substring(0, 500));
  console.log("═══════════════════════════════════════");

  try {
    console.log("");
    console.log(">>> SENDING FETCH REQUEST...");
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: bodyString,
    });

    console.log("");
    console.log("═══════════════════════════════════════");
    console.log("=== TTS CLIENT - RESPONSE RECEIVED ===");
    console.log("═══════════════════════════════════════");
    console.log("Status:", response.status);
    console.log("StatusText:", response.statusText);
    console.log("Content-Type:", response.headers.get("Content-Type"));
    console.log("═══════════════════════════════════════");

    // Check for non-ok responses
    if (!response.ok) {
      console.log("");
      console.log("!!! RESPONSE NOT OK !!!");
      let errorDetails = "";
      
      try {
        const errorBody = await response.json();
        errorDetails = errorBody.error || errorBody.details || JSON.stringify(errorBody);
        console.log("Error JSON:", errorBody);
      } catch {
        // Not JSON, try text
        try {
          errorDetails = await response.text();
          console.log("Error text:", errorDetails);
        } catch {
          errorDetails = `HTTP ${response.status}: ${response.statusText}`;
          console.log("Error fallback:", errorDetails);
        }
      }

      console.log("");
      console.log("=== DEBUG INFO ===");
      console.log("Endpoint:", endpoint);
      console.log("HTTP Status:", response.status);
      console.log("Backend Response:", errorDetails);
      console.log("Selected Voice:", selectedVoice);
      console.log("Request Body:", bodyString);
      console.log("================");

      console.log("");
      console.log("=== THROWING ERROR ===");
      throw {
        error: "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        details: `Endpoint: ${endpoint}\nHTTP: ${response.status}\nVoice: ${selectedVoice}\n${errorDetails}`,
      };
    }

    console.log("");
    console.log(">>> READING RESPONSE...");
    
    // Parse JSON response (new format)
    const jsonResponse = await response.json();
    console.log("");
    console.log("=== JSON RESPONSE ===");
    console.log("Success:", jsonResponse.success);
    console.log("Has audioUrl:", !!jsonResponse.audioUrl);
    console.log("Has audioData:", !!jsonResponse.audioData);
    console.log("Duration:", jsonResponse.duration);
    console.log("Voice:", jsonResponse.voice);
    console.log("═══════════════════════════════════════");

    // Check for error in JSON response
    if (!jsonResponse.success) {
      console.log("");
      console.log("!!! JSON RESPONSE INDICATES ERROR !!!");
      console.log("Error:", jsonResponse.error);
      console.log("Details:", jsonResponse.details);
      console.log("═══════════════════════════════════════");
      
      throw {
        error: jsonResponse.error || "Ses oluşturulurken bir hata oluştu.",
        details: jsonResponse.details || "Unknown error from server",
      };
    }

    // Extract audio data
    let audioBlob: Blob;
    let audioUrl: string;

    if (jsonResponse.audioUrl) {
      // Use data URL directly
      audioUrl = jsonResponse.audioUrl;
      // Create blob from base64
      const base64Data = jsonResponse.audioData || jsonResponse.audioUrl.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      audioBlob = new Blob([byteArray], { type: "audio/mpeg" });
    } else {
      // Fallback: try to get blob from response
      console.log("");
      console.log(">>> No audioUrl in response, trying blob...");
      audioBlob = await response.blob();
      audioUrl = URL.createObjectURL(audioBlob);
    }

    console.log("");
    console.log("=== AUDIO CREATED ===");
    console.log("Blob size:", audioBlob.size, "bytes");
    console.log("Blob type:", audioBlob.type);
    console.log("Audio URL:", audioUrl.substring(0, 50) + "...");
    console.log("Duration:", jsonResponse.duration || 0, "seconds");
    console.log("═══════════════════════════════════════");

    return {
      audioBlob,
      audioUrl,
      duration: jsonResponse.duration || 0,
    };

  } catch (err) {
    // Log the error
    console.log("");
    console.log("═══════════════════════════════════════");
    console.log("=== TTS CLIENT - EXCEPTION ===");
    console.log("═══════════════════════════════════════");
    
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
 * Check if TTS service is available
 */
export async function checkTTSService(): Promise<boolean> {
  const endpoint = getEndpoint();
  
  try {
    // Try POST with test mode
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true, text: "test" })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.success !== false;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get current endpoint URL
 */
export function getTTSEndpoint(): string {
  return getEndpoint();
}