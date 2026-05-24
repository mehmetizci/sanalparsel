"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, ProjectSettings } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import VideoSettingToggle from "@/components/VideoSettingToggle";
import PrimaryButton from "@/components/PrimaryButton";

export default function VideoSettingsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [, setProject] = useState<Project | null>(null);
  const [settings, setSettings] = useState<ProjectSettings>({
    id: "",
    project_id: id,
    duration: 30,
    height: 300,
    camera_modes: [],
    camera_style: "cinematic",
    video_format: "reels",
    show_logo: true,
    show_name: true,
    show_phone: true,
    show_avatar: false,
    show_office: false,
    show_license: false,
    show_parcel_info: true,
    show_environment: true,
    show_subtitles: true,
    show_final_card: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

      const { data: settingsData } = await supabase
        .from("project_settings")
        .select("*")
        .eq("project_id", id)
        .single();

      if (settingsData) {
        setSettings(settingsData as ProjectSettings);
      }

      setProject(data as Project);
      setLoading(false);
    };

    fetchProject();
  }, [id, router]);

  const toggleSetting = (key: keyof ProjectSettings) => {
    if (typeof settings[key] === "boolean") {
      setSettings({ ...settings, [key]: !settings[key] });
    }
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("project_settings").upsert(settings, {
        onConflict: "project_id",
      });
      router.push(`/projects/${id}/environment`);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
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
          {/* Video Format */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Video Formatı</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSettings({ ...settings, video_format: "reels" })}
                className={`glass rounded-xl p-4 text-center transition-all ${
                  settings.video_format === "reels"
                    ? "border-primary bg-primary/10"
                    : "border-white/10"
                }`}
              >
                <div className="mb-2">
                  <div className="w-12 h-20 mx-auto bg-primary/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary text-xs">9:16</span>
                  </div>
                </div>
                <p className="text-white font-medium">Reels</p>
                <p className="text-muted text-xs">1080x1920</p>
              </button>
              <button
                onClick={() => setSettings({ ...settings, video_format: "landscape" })}
                className={`glass rounded-xl p-4 text-center transition-all ${
                  settings.video_format === "landscape"
                    ? "border-primary bg-primary/10"
                    : "border-white/10"
                }`}
              >
                <div className="mb-2">
                  <div className="w-20 h-12 mx-auto bg-primary/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary text-xs">16:9</span>
                  </div>
                </div>
                <p className="text-white font-medium">Yatay</p>
                <p className="text-muted text-xs">1920x1080</p>
              </button>
            </div>
          </GlassCard>

          {/* Display Options */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Bilgi Göstergeleri</label>
            <div className="space-y-3">
              <VideoSettingToggle
                label="Danışman Adı"
                enabled={settings.show_name}
                onChange={() => toggleSetting("show_name")}
              />
              <VideoSettingToggle
                label="Telefon"
                enabled={settings.show_phone}
                onChange={() => toggleSetting("show_phone")}
              />
              <VideoSettingToggle
                label="Logo"
                enabled={settings.show_logo}
                onChange={() => toggleSetting("show_logo")}
              />
              <VideoSettingToggle
                label="Profil Fotoğrafı"
                enabled={settings.show_avatar}
                onChange={() => toggleSetting("show_avatar")}
              />
              <VideoSettingToggle
                label="Ada/Parsel Bilgisi"
                enabled={settings.show_parcel_info}
                onChange={() => toggleSetting("show_parcel_info")}
              />
              <VideoSettingToggle
                label="Yakın Çevre Bilgileri"
                enabled={settings.show_environment}
                onChange={() => toggleSetting("show_environment")}
              />
              <VideoSettingToggle
                label="Altyazı"
                enabled={settings.show_subtitles}
                onChange={() => toggleSetting("show_subtitles")}
              />
              <VideoSettingToggle
                label="Final İletişim Kartı"
                enabled={settings.show_final_card}
                onChange={() => toggleSetting("show_final_card")}
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