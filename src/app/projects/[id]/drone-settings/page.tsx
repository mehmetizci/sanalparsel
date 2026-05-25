"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { CameraMode } from "@/types";
import { 
  ProjectConfig, 
  DroneConfig,
  createDefaultProjectConfig,
  loadProjectConfig,
  saveProjectConfig,
  migrateLegacySettings,
  configToSettings,
  CAMERA_MODE_LABELS,
  buildCameraSequence,
} from "@/lib/project-config";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import DroneModeCard from "@/components/DroneModeCard";
import PrimaryButton from "@/components/PrimaryButton";
import GlassCard from "@/components/GlassCard";

const CAMERA_MODES: { mode: CameraMode; label: string }[] = [
  { mode: "orbit_360", label: "Orbit 360" },
  { mode: "spiral_descent", label: "Spiral Alçalış" },
  { mode: "top_view", label: "Tepe Görünüm" },
  { mode: "low_fly", label: "Alçak Geçiş" },
  { mode: "four_corners", label: "4 Köşe" },
];

const DURATIONS = [30, 45, 60] as const;
const HEIGHTS = [100, 200, 300, 400] as const;
const CAMERA_STYLES = [
  { value: "smooth", label: "Yumuşak", description: "Akıcı geçişler" },
  { value: "cinematic", label: "Sinematik", description: "Dramatik hareketler" },
  { value: "dynamic", label: "Dinamik", description: "Hızlı geçişler" },
] as const;

interface DroneSettingsPageProps {
  params: { id: string };
}

export default function DroneSettingsPage({ params }: DroneSettingsPageProps) {
  const { id: projectId } = params;
  const router = useRouter();
  
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [droneSettings, setDroneSettings] = useState<DroneConfig>({
    duration: 30,
    startHeight: 300,
    cameraFeel: "cinematic",
    cameraModes: ["orbit_360", "spiral_descent"],
  });
  
  const [cameraModes, setCameraModes] = useState(
    CAMERA_MODES.map((cm) => ({ ...cm, selected: droneSettings.cameraModes.includes(cm.mode) }))
  );
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load config from localStorage or create new
  useEffect(() => {
    const loadConfig = () => {
      const stored = loadProjectConfig(projectId);
      if (stored) {
        setProjectConfig(stored);
        setDroneSettings(stored.droneSettings);
        setCameraModes(
          CAMERA_MODES.map((cm) => ({
            ...cm,
            selected: stored.droneSettings.cameraModes.includes(cm.mode),
          }))
        );
      } else {
        const newConfig = createDefaultProjectConfig(projectId);
        setProjectConfig(newConfig);
      }
    };
    loadConfig();
  }, [projectId]);

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
        setDroneSettings(migrated.droneSettings);
        setCameraModes(
          CAMERA_MODES.map((cm) => ({
            ...cm,
            selected: migrated.droneSettings.cameraModes.includes(cm.mode),
          }))
        );
        saveProjectConfig(migrated);
      }

      setLoading(false);
    };

    fetchProject();
  }, [projectId, router]);

  // Update drone settings and save to localStorage
  const updateDroneSettings = useCallback((updates: Partial<DroneConfig>) => {
    const newDroneSettings = { ...droneSettings, ...updates };
    setDroneSettings(newDroneSettings);
    
    if (projectConfig) {
      const updatedConfig = {
        ...projectConfig,
        droneSettings: newDroneSettings,
        updatedAt: Date.now(),
      };
      setProjectConfig(updatedConfig);
      saveProjectConfig(updatedConfig);
    }
  }, [droneSettings, projectConfig]);

  // Handle camera mode toggle - prevent last mode from being deselected
  const handleToggleCameraMode = (mode: CameraMode) => {
    const selectedCount = cameraModes.filter((cm) => cm.selected).length;
    const isCurrentlySelected = cameraModes.find((cm) => cm.mode === mode)?.selected;

    // Prevent deselecting the last selected mode
    if (isCurrentlySelected && selectedCount === 1) {
      return;
    }

    const newModes = cameraModes.map((cm) =>
      cm.mode === mode ? { ...cm, selected: !cm.selected } : cm
    );
    setCameraModes(newModes);

    // Update drone settings with new camera modes
    const selectedCameraModes = newModes
      .filter((cm) => cm.selected)
      .map((cm) => cm.mode);
    updateDroneSettings({ cameraModes: selectedCameraModes });
  };

  // Preview camera sequence (for UI feedback)
  const previewCameraSequence = () => {
    return buildCameraSequence(droneSettings);
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

      // Navigate to video settings
      router.push(`/projects/${projectId}/video-settings`);
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

  const sequence = previewCameraSequence();

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <StepHeader
          step={3}
          totalSteps={10}
          title="Drone Ayarları"
          description="Video drone hareketini özelleştirin"
        />

        {/* Camera Sequence Preview */}
        {sequence.keyframes.length > 0 && (
          <GlassCard className="mb-6 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted text-sm">Kamera Sırası</span>
              <span className="text-white text-sm font-medium">{droneSettings.duration} sn</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sequence.keyframes.map((kf, i) => (
                <div
                  key={i}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30"
                >
                  <span className="text-primary text-xs font-medium">
                    {CAMERA_MODE_LABELS[kf.mode]}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        <div className="space-y-6">
          {/* Duration */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Video Süresi</label>
            <div className="grid grid-cols-3 gap-3">
              {DURATIONS.map((duration) => (
                <button
                  key={duration}
                  onClick={() => updateDroneSettings({ duration })}
                  className={`py-3 rounded-xl font-semibold transition-all ${
                    droneSettings.duration === duration
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
                  onClick={() => updateDroneSettings({ startHeight: height })}
                  className={`py-3 rounded-xl font-semibold transition-all ${
                    droneSettings.startHeight === height
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
                  onClick={() => updateDroneSettings({ cameraFeel: style.value as "smooth" | "cinematic" | "dynamic" })}
                  className={`glass rounded-xl p-4 text-center transition-all ${
                    droneSettings.cameraFeel === style.value
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
            onClick={() => router.push(`/projects/${projectId}/preview`)}
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