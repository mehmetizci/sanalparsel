"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, ProjectSettings, CameraMode } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import DroneModeCard from "@/components/DroneModeCard";
import PrimaryButton from "@/components/PrimaryButton";
import GlassCard from "@/components/GlassCard";

const CAMERA_MODES: { mode: CameraMode; label: string; selected: boolean }[] = [
  { mode: "orbit_360", label: "Orbit 360", selected: true },
  { mode: "spiral_descent", label: "Spiral Alçalış", selected: true },
  { mode: "top_view", label: "Tepe Görünüm", selected: false },
  { mode: "low_fly", label: "Alçak Geçiş", selected: false },
  { mode: "four_corners", label: "4 Köşe", selected: false },
];

const DURATIONS = [30, 45, 60] as const;
const HEIGHTS = [100, 200, 300, 400] as const;
const CAMERA_STYLES = [
  { value: "smooth", label: "Yumuşak", description: "Akıcı geçişler" },
  { value: "cinematic", label: "Sinematik", description: "Dramatik hareketler" },
  { value: "dynamic", label: "Dinamik", description: "Hızlı geçişler" },
] as const;

export default function DroneSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [, setProject] = useState<Project | null>(null);
  const [settings, setSettings] = useState<ProjectSettings>({
    id: "",
    project_id: id,
    duration: 30,
    height: 300,
    camera_modes: ["orbit_360", "spiral_descent"],
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
  const [cameraModes, setCameraModes] = useState(CAMERA_MODES);
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

      // Fetch existing settings
      const { data: settingsData } = await supabase
        .from("project_settings")
        .select("*")
        .eq("project_id", id)
        .single();

      if (settingsData) {
        setSettings(settingsData as ProjectSettings);
        setCameraModes(
          CAMERA_MODES.map((cm) => ({
            ...cm,
            selected: (settingsData as ProjectSettings).camera_modes.includes(cm.mode),
          }))
        );
      }

      setProject(data as Project);
      setLoading(false);
    };

    fetchProject();
  }, [id, router]);

  const handleToggleCameraMode = (mode: CameraMode) => {
    setCameraModes((prev) =>
      prev.map((cm) =>
        cm.mode === mode ? { ...cm, selected: !cm.selected } : cm
      )
    );
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const selectedModes = cameraModes
        .filter((cm) => cm.selected)
        .map((cm) => cm.mode);

      // Upsert settings
      await supabase.from("project_settings").upsert({
        ...settings,
        project_id: id,
        camera_modes: selectedModes,
      }, {
        onConflict: "project_id",
      });

      router.push(`/projects/${id}/video-settings`);
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
          step={3}
          totalSteps={10}
          title="Drone Ayarları"
          description="Video drone hareketini özelleştirin"
        />

        <div className="space-y-6">
          {/* Duration */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Video Süresi</label>
            <div className="grid grid-cols-3 gap-3">
              {DURATIONS.map((duration) => (
                <button
                  key={duration}
                  onClick={() => setSettings({ ...settings, duration })}
                  className={`py-3 rounded-xl font-semibold transition-all ${
                    settings.duration === duration
                      ? "bg-primary text-white"
                      : "bg-card/50 text-muted hover:bg-card"
                  }`}
                >
                  {duration} sn
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Height */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Başlangıç Yüksekliği</label>
            <div className="grid grid-cols-4 gap-3">
              {HEIGHTS.map((height) => (
                <button
                  key={height}
                  onClick={() => setSettings({ ...settings, height })}
                  className={`py-3 rounded-xl font-semibold transition-all ${
                    settings.height === height
                      ? "bg-primary text-white"
                      : "bg-card/50 text-muted hover:bg-card"
                  }`}
                >
                  {height}m
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Camera Style */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Kamera Hissi</label>
            <div className="grid grid-cols-3 gap-3">
              {CAMERA_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setSettings({ ...settings, camera_style: style.value as "smooth" | "cinematic" | "dynamic" })}
                  className={`glass rounded-xl p-4 text-center transition-all ${
                    settings.camera_style === style.value
                      ? "border-primary bg-primary/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <p className="text-white font-medium">{style.label}</p>
                  <p className="text-muted text-xs mt-1">{style.description}</p>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Camera Modes */}
          <DroneModeCard
            modes={cameraModes}
            onToggle={handleToggleCameraMode}
          />
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => router.push(`/projects/${id}/preview`)}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
          >
            Geri
          </button>
          <PrimaryButton
            onClick={handleSaveAndContinue}
            loading={saving}
            className="flex-1"
          >
            Video Ayarlarına Geç
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}