/**
 * IndexedDB Audio Cache Service
 * 
 * Provides persistent audio caching for generated TTS audio.
 * This allows audio to survive page refreshes and browser restarts.
 */

const DB_NAME = "sanalparsel-audio-cache";
const DB_VERSION = 1;
const STORE_NAME = "audio-cache";

interface CachedAudio {
  id: string;
  narrationHash: string;
  voiceType: string;
  edgeVoice: string;
  rate: string;
  pitch: string;
  audioBlob: Blob;
  duration: number;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB not available in server context"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open audio cache database:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store with index on narrationHash
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("narrationHash", "narrationHash", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Generate a hash for the narration text
 */
export function hashNarration(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

/**
 * Store audio in IndexedDB cache
 */
export async function cacheAudio(params: {
  narrationText: string;
  voiceType: string;
  edgeVoice: string;
  rate: string;
  pitch: string;
  audioBlob: Blob;
  duration: number;
}): Promise<string> {
  try {
    const db = await openDB();
    const narrationHash = hashNarration(params.narrationText);
    const id = `${narrationHash}-${params.voiceType}-${Date.now()}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const cachedAudio: CachedAudio = {
        id,
        narrationHash,
        voiceType: params.voiceType,
        edgeVoice: params.edgeVoice,
        rate: params.rate,
        pitch: params.pitch,
        audioBlob: params.audioBlob,
        duration: params.duration,
        createdAt: Date.now(),
      };

      const request = store.add(cachedAudio);

      request.onsuccess = () => {
        // Clean up old entries (keep only last 10)
        cleanupOldEntries();
        resolve(id);
      };

      request.onerror = () => {
        console.error("Failed to cache audio:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error caching audio:", error);
    throw error;
  }
}

/**
 * Get cached audio by narration hash
 */
export async function getCachedAudio(narrationText: string, voiceType?: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const narrationHash = hashNarration(narrationText);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("narrationHash");
      const request = index.getAll(narrationHash);

      request.onsuccess = () => {
        const results: CachedAudio[] = request.result;
        
        if (results.length === 0) {
          resolve(null);
          return;
        }

        // Filter by voice type if specified
        const filtered = voiceType 
          ? results.filter(r => r.voiceType === voiceType)
          : results;

        if (filtered.length === 0) {
          resolve(null);
          return;
        }

        // Return the most recent one
        const mostRecent = filtered.reduce((a, b) => 
          a.createdAt > b.createdAt ? a : b
        );

        resolve(mostRecent.audioBlob);
      };

      request.onerror = () => {
        console.error("Failed to get cached audio:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error getting cached audio:", error);
    return null;
  }
}

/**
 * Check if audio exists for given narration text
 */
export async function hasCachedAudio(narrationText: string, voiceType?: string): Promise<boolean> {
  const blob = await getCachedAudio(narrationText, voiceType);
  return blob !== null;
}

/**
 * Get cached audio metadata
 */
export async function getCachedAudioMetadata(narrationText: string, voiceType?: string): Promise<{ duration: number; createdAt: number } | null> {
  try {
    const db = await openDB();
    const narrationHash = hashNarration(narrationText);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("narrationHash");
      const request = index.getAll(narrationHash);

      request.onsuccess = () => {
        const results: CachedAudio[] = request.result;
        
        if (results.length === 0) {
          resolve(null);
          return;
        }

        const filtered = voiceType 
          ? results.filter(r => r.voiceType === voiceType)
          : results;

        if (filtered.length === 0) {
          resolve(null);
          return;
        }

        const mostRecent = filtered.reduce((a, b) => 
          a.createdAt > b.createdAt ? a : b
        );

        resolve({
          duration: mostRecent.duration,
          createdAt: mostRecent.createdAt,
        });
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error getting cached audio metadata:", error);
    return null;
  }
}

/**
 * Delete cached audio by narration hash
 */
export async function deleteCachedAudio(narrationText: string, voiceType?: string): Promise<void> {
  try {
    const db = await openDB();
    const narrationHash = hashNarration(narrationText);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("narrationHash");
      const request = index.getAll(narrationHash);

      request.onsuccess = () => {
        const results: CachedAudio[] = request.result;
        const toDelete = voiceType 
          ? results.filter(r => r.voiceType === voiceType)
          : results;

        toDelete.forEach(item => {
          store.delete(item.id);
        });

        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error deleting cached audio:", error);
    throw error;
  }
}

/**
 * Clear all cached audio
 */
export async function clearAllCachedAudio(): Promise<void> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error clearing all cached audio:", error);
    throw error;
  }
}

/**
 * Clean up old cached entries (keep only last 10)
 */
async function cleanupOldEntries(): Promise<void> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("createdAt");
      const request = index.openCursor(null, "prev");

      request.onsuccess = () => {
        const cursor = request.result;
        let count = 0;

        if (cursor) {
          count++;
          if (count > 10) {
            store.delete(cursor.primaryKey);
          }
          cursor.continue();
        }

        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error cleaning up old entries:", error);
  }
}

/**
 * Get total cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      let totalSize = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        
        if (cursor) {
          const item = cursor.value as CachedAudio;
          totalSize += item.audioBlob.size;
          cursor.continue();
        } else {
          resolve(totalSize);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error getting cache size:", error);
    return 0;
  }
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}