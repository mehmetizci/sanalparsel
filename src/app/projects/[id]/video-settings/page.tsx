"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import VideoSettingToggle from "@/components/VideoSettingToggle";
import PrimaryButton from "@/components/PrimaryButton";
import { useParcelStore, VideoResolution, ListingType, VIDEO_RESOLUTIONS } from "@/lib/parcel-store";

const VIDEO_RESOLUTION_OPTIONS: { value: VideoResolution; label: string; sublabel: string }[] = [
  { value: "720x1280", label: "Hızlı Render", sublabel: "720x1280 • Daha hızlı export" },
  { value: "1080x1920", label: "Premium HD", sublabel: "1080x1920 • Yüksek kalite" },
];

const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: "sale", label: "Satılık" },
  { value: "investment", label: "Yatırımlık" },
];

export default function VideoSettingsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  
  // Store state
  const videoSettings = useParcelStore((state) => state.videoSettings);
  const setVideoSettings = useParcelStore((state) => state.setVideoSettings);
  
  const [loading, setLoading] = useState(true);

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
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!data) {
        router.push("/dashboard");
        return;
      }

      setLoading(false);
    };

    fetchProject();
  }, [id, router]);

  const handleResolutionChange = (resolution: VideoResolution) => {
    const config = VIDEO_RESOLUTIONS[resolution];
    setVideoSettings({ resolution, width: config.width, height: config.height });
  };

  const handleOverlayToggle = (key: keyof typeof videoSettings.overlays) => {
    setVideoSettings((state) => ({
      ...state,
      overlays: {
        ...state.overlays,
        [key]: !state.overlays[key],
      },
    }));
  };

  const handleSaveAndContinue = () => {
    console.log("[VideoSettings] Saved:", JSON.stringify(videoSettings, null, 2));
    router.push(`/projects/${id}/environment`);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

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
          {/* Video Resolution */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Video Formatı</label>
            <div className="grid grid-cols-2 gap-3">
              {VIDEO_RESOLUTION_OPTIONS.map((opt) => {
                const isSelected = videoSettings.resolution === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleResolutionChange(opt.value)}
                    className={`
                      relative rounded-xl p-4 text-center transition-all duration-200
                      ${isSelected 
                        ? "border-2 border-blue-500 bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                        : "border border-white/20 bg-card/50 hover:bg-card hover:border-white/30"
                      }
                    `}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <div className="mb-2">
                      <div className={`w-12 h-20 mx-auto rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-blue-500/30" : "bg-blue-500/10"
                      }`}>
                        <span className={`text-xs ${isSelected ? "text-blue-400" : "text-blue-300"}`}>9:16</span>
                      </div>
                    </div>
                    <p className={`font-medium ${isSelected ? "text-blue-400" : "text-white"}`}>
                      {opt.label}
                    </p>
                    <p className={`text-xs mt-1 ${isSelected ? "text-blue-300/70" : "text-gray-400"}`}>
                      {opt.sublabel}
                    </p>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Listing Type */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">İlan Tipi</label>
            <div className="grid grid-cols-2 gap-3">
              {LISTING_TYPES.map((opt) => {
                const isSelected = videoSettings.listingType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setVideoSettings({ listingType: opt.value })}
                    className={`
                      relative rounded-xl p-4 text-center transition-all duration-200
                      ${isSelected 
                        ? "border-2 border-blue-500 bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                        : "border border-white/20 bg-card/50 hover:bg-card hover:border-white/30"
                      }
                    `}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <p className={`font-medium ${isSelected ? "text-blue-400" : "text-white"}`}>
                      {opt.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Display Options */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Bilgi Göstergeleri</label>
            <div className="space-y-3">
              <VideoSettingToggle
                label="Danışman Adı"
                enabled={videoSettings.overlays.consultantName}
                onChange={() => handleOverlayToggle("consultantName")}
              />
              <VideoSettingToggle
                label="Telefon"
                enabled={videoSettings.overlays.phone}
                onChange={() => handleOverlayToggle("phone")}
              />
              <VideoSettingToggle
                label="Logo"
                enabled={videoSettings.overlays.logo}
                onChange={() => handleOverlayToggle("logo")}
              />
              <VideoSettingToggle
                label="Profil Fotoğrafı"
                enabled={videoSettings.overlays.profilePhoto}
                onChange={() => handleOverlayToggle("profilePhoto")}
              />
              <VideoSettingToggle
                label="Ada/Parsel Bilgisi"
                enabled={videoSettings.overlays.parcelInfo}
                onChange={() => handleOverlayToggle("parcelInfo")}
              />
              <VideoSettingToggle
                label="Yakın Çevre Bilgileri"
                enabled={videoSettings.overlays.nearbyPlaces}
                onChange={() => handleOverlayToggle("nearbyPlaces")}
              />
              <VideoSettingToggle
                label="Altyazı"
                enabled={videoSettings.overlays.subtitles}
                onChange={() => handleOverlayToggle("subtitles")}
              />
            </div>
          </GlassCard>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => router.push(`/projects/${id}/drone-settings`)}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
          >
            Geri
          </button>
          <PrimaryButton
            onClick={handleSaveAndContinue}
            className="flex-1"
          >
            Çevre Bilgilerine Geç
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}