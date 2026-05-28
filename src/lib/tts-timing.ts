/**
 * TTS Word Timing System
 * 
 * Handles:
 * - Word-level timing extraction from TTS
 * - Synchronization with video timeline
 * - Audio-reactive animations
 * - POI highlighting based on narration
 */

export interface WordTiming {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface SentenceTiming {
  text: string;
  start: number;
  end: number;
  words: WordTiming[];
}

export interface TTSAudioMetadata {
  duration: number;
  words: WordTiming[];
  sentences: SentenceTiming[];
  sampleRate: number;
  audioUrl: string;
}

/**
 * Parse word timings from various TTS providers
 */
export interface TTSTimingResponse {
  wordTimings: WordTiming[];
  sentences: SentenceTiming[];
  totalDuration: number;
}

/**
 * Parse EdgeTTS VTT format timing
 * Example:
 * WEBVTT
 * 
 * 00:00.000 --> 00:00.500
 * Merhaba bu İzmir
 */
export function parseVTTTiming(vttContent: string): TTSTimingResponse {
  const lines = vttContent.split("\n");
  const wordTimings: WordTiming[] = [];
  const sentences: SentenceTiming[] = [];
  
  let currentStart = 0;
  let currentEnd = 0;
  let currentSentence = "";
  let sentenceStart = 0;
  
  for (const line of lines) {
    // Skip VTT headers and empty lines
    if (!line || line.startsWith("WEBVTT") || line.includes("-->")) {
      // If we have a current sentence, save it
      if (currentSentence.trim()) {
        sentences.push({
          text: currentSentence.trim(),
          start: sentenceStart,
          end: currentEnd,
          words: wordTimings.filter(w => w.start >= sentenceStart && w.end <= currentEnd),
        });
        currentSentence = "";
      }
      continue;
    }
    
    // Parse timestamp line
    const timestampMatch = line.match(/(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2})\.(\d{3})/);
    if (timestampMatch) {
      const [, startMin, startSec, startMs, endMin, endSec, endMs] = timestampMatch.map(Number);
      currentStart = startMin * 60 + startSec + startMs / 1000;
      currentEnd = endMin * 60 + endSec + endMs / 1000;
      sentenceStart = currentStart;
    } else if (line.trim()) {
      // Parse words in the line (simple space-separated)
      const words = line.trim().split(/\s+/);
      const timePerWord = (currentEnd - currentStart) / Math.max(words.length, 1);
      
      let wordStart = currentStart;
      for (const word of words) {
        if (word) {
          const cleanWord = word.replace(/[.,!?;:'"]/g, "");
          if (cleanWord) {
            wordTimings.push({
              word: cleanWord,
              start: wordStart,
              end: wordStart + timePerWord,
            });
            currentSentence += cleanWord + " ";
          }
          wordStart += timePerWord;
        }
      }
    }
  }
  
  // Don't forget the last sentence
  if (currentSentence.trim()) {
    sentences.push({
      text: currentSentence.trim(),
      start: sentenceStart,
      end: currentEnd,
      words: wordTimings.filter(w => w.start >= sentenceStart && w.end <= currentEnd),
    });
  }
  
  return {
    wordTimings,
    sentences,
    totalDuration: wordTimings.length > 0 ? Math.max(...wordTimings.map(w => w.end)) : 0,
  };
}

/**
 * Parse OpenAI Whisper-style timing
 */
export function parseWhisperTiming(segments: Array<{
  start: number;
  end: number;
  text: string;
  words?: Array<{ word: string; start: number; end: number }>;
}>): TTSTimingResponse {
  const wordTimings: WordTiming[] = [];
  const sentences: SentenceTiming[] = [];
  
  for (const segment of segments) {
    if (segment.words && segment.words.length > 0) {
      // Use word-level timing if available
      wordTimings.push(...segment.words.map(w => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })));
    } else {
      // Estimate word timing from segment duration
      const words = segment.text.trim().split(/\s+/);
      const duration = segment.end - segment.start;
      const timePerWord = duration / Math.max(words.length, 1);
      
      let wordStart = segment.start;
      for (const word of words) {
        if (word) {
          wordTimings.push({
            word: word.replace(/[.,!?;:'"]/g, ""),
            start: wordStart,
            end: wordStart + timePerWord,
          });
          wordStart += timePerWord;
        }
      }
    }
    
    sentences.push({
      text: segment.text.trim(),
      start: segment.start,
      end: segment.end,
      words: wordTimings.filter(w => w.start >= segment.start && w.end <= segment.end),
    });
  }
  
  return {
    wordTimings,
    sentences,
    totalDuration: segments.length > 0 ? segments[segments.length - 1].end : 0,
  };
}

/**
 * Generate mock word timings for a given text and duration
 * Used when actual TTS timing isn't available
 */
export function generateMockWordTimings(
  text: string,
  duration: number
): WordTiming[] {
  const words = text.split(/\s+/).filter(Boolean);
  const timePerWord = duration / words.length;
  
  let currentTime = 0.1; // Start a bit after 0
  return words.map(word => {
    const cleanWord = word.replace(/[.,!?;:'"]/g, "");
    const timing: WordTiming = {
      word: cleanWord,
      start: currentTime,
      end: currentTime + timePerWord * 0.9, // Slight gap between words
    };
    currentTime += timePerWord;
    return timing;
  });
}

/**
 * Find the currently active word at a given time
 */
export function getActiveWord(
  time: number,
  wordTimings: WordTiming[]
): WordTiming | null {
  for (const timing of wordTimings) {
    if (time >= timing.start && time <= timing.end) {
      return timing;
    }
  }
  return null;
}

/**
 * Find all words that should be highlighted (recently spoken)
 */
export function getRecentWords(
  time: number,
  wordTimings: WordTiming[],
  lookback: number = 2 // seconds
): WordTiming[] {
  return wordTimings.filter(
    w => w.end >= time - lookback && w.end <= time
  );
}

/**
 * Get words that match a POI name for audio-reactive highlighting
 */
export function matchPOIWords(
  pois: Array<{ name: string }>,
  wordTimings: WordTiming[]
): Map<string, WordTiming[]> {
  const matches = new Map<string, WordTiming[]>();
  
  for (const poi of pois) {
    const poiNameLower = poi.name.toLowerCase();
    const poiMatches: WordTiming[] = [];
    
    for (const timing of wordTimings) {
      if (poiNameLower.includes(timing.word.toLowerCase()) ||
          timing.word.toLowerCase().includes(poiNameLower)) {
        poiMatches.push(timing);
      }
    }
    
    if (poiMatches.length > 0) {
      matches.set(poi.name, poiMatches);
    }
  }
  
  return matches;
}

/**
 * Calculate camera trigger times based on word timings
 */
export function calculateCameraTriggers(
  wordTimings: WordTiming[],
  triggerEveryNWords: number = 10
): number[] {
  const triggers: number[] = [];
  
  for (let i = 0; i < wordTimings.length; i += triggerEveryNWords) {
    triggers.push(wordTimings[i].start);
  }
  
  return triggers;
}

/**
 * Create a timeline event map for the video
 */
export interface TimelineEvent {
  time: number;
  type: "poi_highlight" | "zoom" | "camera_move" | "overlay";
  data: Record<string, unknown>;
}

export function createTimelineEvents(
  wordTimings: WordTiming[],
  poiNames: string[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  // Create POI highlight events
  for (const timing of wordTimings) {
    for (const poiName of poiNames) {
      if (poiName.toLowerCase().includes(timing.word.toLowerCase())) {
        events.push({
          time: timing.start,
          type: "poi_highlight",
          data: { poiName, word: timing.word },
        });
      }
    }
  }
  
  // Create periodic zoom events
  const zoomInterval = 5; // seconds
  for (let t = 2; t < wordTimings[wordTimings.length - 1]?.end || 0; t += zoomInterval) {
    events.push({
      time: t,
      type: "zoom",
      data: { zoomAmount: Math.random() * 0.5 + 0.2 },
    });
  }
  
  return events.sort((a, b) => a.time - b.time);
}