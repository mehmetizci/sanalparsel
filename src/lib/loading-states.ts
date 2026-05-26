/**
 * App-wide Loading State Management
 * 
 * Separates different loading contexts to prevent "Video hazırlanıyor" overlay
 * from appearing on unrelated pages and actions.
 * 
 * Loading contexts:
 * - appLoading: App initialization only
 * - pageLoading: Page/step transitions
 * - uploadLoading: GeoJSON upload only
 * - ttsLoading: Audio generation only
 * - videoRenderState: Video rendering only (this is what shows "Video hazırlanıyor")
 */

import { create } from "zustand";

export type AppLoadingState = "idle" | "loading";

export type PageLoadingState = "idle" | "loading";

export type UploadLoadingState = "idle" | "uploading" | "success" | "error";

export type TTSLoadingState = "idle" | "generating" | "success" | "error";

export type VideoRenderState = 
  | "idle"           // No rendering in progress
  | "preparing"      // Preparing video render
  | "recording"      // Recording frames
  | "uploading"      // Uploading to server
  | "generating_audio" // Generating TTS audio
  | "merging"        // Merging video and audio
  | "completed"      // Render completed
  | "error";         // Render failed

export interface AppLoadingStore {
  // App initialization
  appLoading: AppLoadingState;
  setAppLoading: (state: AppLoadingState) => void;
  
  // Page transitions
  pageLoading: PageLoadingState;
  setPageLoading: (state: PageLoadingState) => void;
  
  // GeoJSON upload
  uploadLoading: UploadLoadingState;
  setUploadLoading: (state: UploadLoadingState) => void;
  
  // TTS audio generation (NOT video rendering)
  ttsLoading: TTSLoadingState;
  setTtsLoading: (state: TTSLoadingState) => void;
  
  // Video rendering state - this controls "Video hazırlanıyor" overlay
  videoRenderState: VideoRenderState;
  setVideoRenderState: (state: VideoRenderState) => void;
  
  // Track if video render was started by user click (not by page load or other actions)
  videoRenderStartedByUser: boolean;
  setVideoRenderStartedByUser: (started: boolean) => void;
  
  // Reset all states
  resetAll: () => void;
}

// Video render state labels for UI
export const VIDEO_RENDER_LABELS: Record<VideoRenderState, { label: string; description: string }> = {
  idle: { label: "Hazır", description: "" },
  preparing: { label: "Video Hazırlanıyor", description: "Video oluşturuluyor, lütfen bekleyin..." },
  recording: { label: "Kayıt Yapılıyor", description: "Kamera hareketleri kaydediliyor..." },
  uploading: { label: "Yükleniyor", description: "Video sunucuya yükleniyor..." },
  generating_audio: { label: "Ses Oluşturuluyor", description: "Seslendirme sentezleniyor..." },
  merging: { label: "Birleştiriliyor", description: "Video ve ses birleştiriliyor..." },
  completed: { label: "Tamamlandı", description: "Video hazır!" },
  error: { label: "Hata", description: "Video oluşturulurken bir hata oluştu" },
};

// Should show video preparing overlay?
export function shouldShowVideoOverlay(
  videoRenderState: VideoRenderState,
  videoRenderStartedByUser: boolean
): boolean {
  return (
    videoRenderState !== "idle" &&
    videoRenderState !== "completed" &&
    videoRenderStartedByUser === true
  );
}

// Default state
const defaultState = {
  appLoading: "idle" as AppLoadingState,
  pageLoading: "idle" as PageLoadingState,
  uploadLoading: "idle" as UploadLoadingState,
  ttsLoading: "idle" as TTSLoadingState,
  videoRenderState: "idle" as VideoRenderState,
  videoRenderStartedByUser: false,
};

export const useAppLoadingStore = create<AppLoadingStore>((set) => ({
  ...defaultState,
  
  setAppLoading: (state) => set({ appLoading: state }),
  
  setPageLoading: (state) => set({ pageLoading: state }),
  
  setUploadLoading: (state) => set({ uploadLoading: state }),
  
  setTtsLoading: (state) => set({ ttsLoading: state }),
  
  setVideoRenderState: (state) => set({ videoRenderState: state }),
  
  setVideoRenderStartedByUser: (started) => set({ videoRenderStartedByUser: started }),
  
  resetAll: () => set(defaultState),
}));