"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAppLoadingStore } from "@/lib/loading-states";
import { 
  ProjectConfig, 
  VideoConfig,
  OverlayConfig,
  createDefaultProjectConfig,
  loadProjectConfig,
  saveProjectConfig,
  migrateLegacySettings,
  configToSettings,
  buildOverlaySequence,
  FORMAT_RESOLUTIONS,
  FORMAT_ASPECT_RATIOS,
} from "@/lib/project-config";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import VideoSettingToggle from "@/components/VideoSettingToggle";
import PrimaryButton from "@/components/PrimaryButton";
import LoadingRenderState from "@/components/LoadingRenderState";

interface VideoSettingsPageProps {
  params: { id: string };
}

export default function VideoSettingsPage({ params }: VideoSettingsPageProps) {
  const { id: projectId } = params;
  const router = useRouter();
  
  // Video state management - reset on page mount
  const setVideoRenderState = useAppLoadingStore((state) => state.setVideoRenderState);
  const setVideoRenderStartedByUser = useAppLoadingStore((state) => state.setVideoRenderStartedByUser);
  
  // Mounted guard to prevent SSR/hydration issues
  const [mounted, setMounted] = useState(false);
  
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [videoSettings, setVideoSettings] = useState<VideoConfig>({
    format: "reels",
    resolution: FORMAT_RESOLUTIONS.reels,
    overlays: {
      consultantName: true,
      phone: true,
      logo: true,
      profilePhoto: false,
      parcelInfo: true,
      nearbyPlaces: true,
      subtitles: true,
      finalContactCard: true,
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Set mounted guard and reset video state on mount
  useEffect(() => {
    setMounted(true);
    setVideoRenderState("idle");
    setVideoRenderStartedByUser(false);
  }, [setVideoRenderState, setVideoRenderStartedByUser]);

  // Load config from localStorage or create new (only after mounted)
  useEffect(() => {
    if (!mounted) return;
    
    const loadConfig = () => {
      const stored = loadProjectConfig(projectId);
      if (stored) {
        setProjectConfig(stored);
        setVideoSettings(stored.videoSettings);
      } else {
        const newConfig = createDefaultProjectConfig(projectId);
        setProjectConfig(newConfig);
      }
    };
    loadConfig();
  }, [projectId, mounted]);

  // Fetch project from Supabase
  useEffect(() => {
    const fetchProject = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (!data) {
        router.push("/dashboard");
        return;
      }

      // Fetch existing settings
      const { data: settingsData } = await supabase
        .from("project_settings")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (settingsData) {
        // Migrate legacy settings to new config
        const migrated = migrateLegacySettings(projectId, settingsData as Record<string, unknown>);
        setProjectConfig(migrated);
        setVideoSettings(migrated.videoSettings);
        saveProjectConfig(migrated);
      }

      setLoading(false);
    };

    fetchProject();
  }, [projectId, router]);

  // Update video settings and save to localStorage
  const updateVideoSettings = useCallback((updates: Partial<VideoConfig>) => {
    const newVideoSettings = { ...videoSettings, ...updates };
    setVideoSettings(newVideoSettings);
    
    if (projectConfig) {
      const updatedConfig = {
        ...projectConfig,
        videoSettings: newVideoSettings,
        updatedAt: Date.now(),
      };
      setProjectConfig(updatedConfig);
      saveProjectConfig(updatedConfig);
    }
  }, [videoSettings, projectConfig]);

  // Update overlays and save to localStorage
  const updateOverlays = useCallback((updates: Partial<OverlayConfig>) => {
    const newOverlays = { ...videoSettings.overlays, ...updates };
    updateVideoSettings({ overlays: newOverlays });
  }, [videoSettings.overlays, updateVideoSettings]);

  // Toggle specific overlay
  const toggleOverlay = (key: keyof OverlayConfig) => {
    updateOverlays({ [key]: !videoSettings.overlays[key] });
  };

  // Preview overlay sequence (for UI feedback)
  const previewOverlaySequence = () => {
    if (!projectConfig) return null;
    return buildOverlaySequence(videoSettings, projectConfig.droneSettings.duration);
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      const supabase = createClient();

      // Get settings from config
      const settings = configToSettings(projectConfig!);

      // Upsert to Supabase
      await supabase.from("project_settings").upsert(settings, {
        onConflict: "project_id",
      });

      // Navigate to environment
      router.push(`/projects/${projectId}/environment`);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !mounted) {
    return (
      <AppShell>
        <LoadingRenderState status="preparing" progress={10} customMessage="Sayfa hazırlanıyor..." />
      </AppShell>
    );
  }

  const overlaySequence = previewOverlaySequence();

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <StepHeader
          step={4}
          totalSteps={10}
          title="Video Ayarları"
          description="Videoda gösterilecek bilgileri seçin"
        />

        <div className="space-y-4">
          {/* Video Format */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Video Formatı</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateVideoSettings({ 
                  format: "reels", 
                  resolution: FORMAT_RESOLUTIONS.reels 
                })}
                className={`glass rounded-xl p-4 text-center transition-all ${
                  videoSettings.format === "reels"
                    ? "border-primary bg-primary/10"
                    : "border-white/10"
                }`}
              >
                <div className="mb-2">
                  <div className="w-12 h-20 mx-auto bg-primary/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary text-xs">{FORMAT_ASPECT_RATIOS.reels}</span>
                  </div>
                </div>
                <p className="text-white font-medium">Reels</p>
                <p className="text-muted text-xs">{videoSettings.resolution.width}x{videoSettings.resolution.height}</p>
              </button>
              <button
                onClick={() => updateVideoSettings({ 
                  format: "landscape", 
                  resolution: FORMAT_RESOLUTIONS.landscape 
                })}
                className={`glass rounded-xl p-4 text-center transition-all ${
                  videoSettings.format === "landscape"
                    ? "border-primary bg-primary/10"
                    : "border-white/10"
                }`}
              >
                <div className="mb-2">
                  <div className="w-20 h-12 mx-auto bg-primary/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary text-xs">{FORMAT_ASPECT_RATIOS.landscape}</span>
                  </div>
                </div>
                <p className="text-white font-medium">Yatay</p>
                <p className="text-muted text-xs">{videoSettings.resolution.width}x{videoSettings.resolution.height}</p>
              </button>
            </div>
          </GlassCard>

          {/* Display Options */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Bilgi Göstergeleri</label>
            <div className="space-y-3">
              <VideoSettingToggle
                label="Danışman Adı"
                enabled={videoSettings.overlays.consultantName}
                onChange={() => toggleOverlay("consultantName")}
              />
              <VideoSettingToggle
                label="Telefon"
                enabled={videoSettings.overlays.phone}
                onChange={() => toggleOverlay("phone")}
              />
              <VideoSettingToggle
                label="Logo"
                enabled={videoSettings.overlays.logo}
                onChange={() => toggleOverlay("logo")}
              />
              <VideoSettingToggle
                label="Profil Fotoğrafı"
                enabled={videoSettings.overlays.profilePhoto}
                onChange={() => toggleOverlay("profilePhoto")}
              />
              <VideoSettingToggle
                label="Ada/Parsel Bilgisi"
                enabled={videoSettings.overlays.parcelInfo}
                onChange={() => toggleOverlay("parcelInfo")}
              />
              <VideoSettingToggle
                label="Yakın Çevre Bilgileri"
                enabled={videoSettings.overlays.nearbyPlaces}
                onChange={() => toggleOverlay("nearbyPlaces")}
              />
              <VideoSettingToggle
                label="Altyazı"
                enabled={videoSettings.overlays.subtitles}
                onChange={() => toggleOverlay("subtitles")}
              />
              <VideoSettingToggle
                label="Final İletişim Kartı"
                enabled={videoSettings.overlays.finalContactCard}
                onChange={() => toggleOverlay("finalContactCard")}
              />
            </div>
          </GlassCard>

          {/* Overlay Sequence Preview */}
          {overlaySequence && overlaySequence.keyframes.length > 0 && (
            <GlassCard className="bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-semibold">Overlay Sırası</span>
                <span className="text-muted text-sm">Önizleme</span>
              </div>
              <div className="space-y-2">
                {overlaySequence.keyframes.map((kf, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-card/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-primary text-xs font-mono w-16">
                        {kf.startTime.toFixed(1)}s - {kf.endTime.toFixed(1)}s
                      </span>
                      <span className="text-white text-sm">
                        {kf.type === "parcelInfo" && "Parsel Bilgisi"}
                        {kf.type === "nearbyPlaces" && "Yakın Çevre"}
                        {kf.type === "consultantCard" && "Danışman Kartı"}
                        {kf.type === "subtitles" && "Altyazı"}
                        {kf.type === "finalContact" && "İletişim Kartı"}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      kf.position === "top" ? "bg-blue-500/20 text-blue-400" :
                      kf.position === "bottom" ? "bg-green-500/20 text-green-400" :
                      kf.position === "center" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>
                      {kf.position}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => router.push(`/projects/${projectId}/drone-settings`)}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
          >
            Geri
          </button>
          <PrimaryButton
            onClick={handleSaveAndContinue}
            loading={saving}
            className="flex-1"
          >
            Çevre Bilgilerine Geç
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}