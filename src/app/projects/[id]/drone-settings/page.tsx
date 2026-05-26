"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import DroneModeCard from "@/components/DroneModeCard";
import PrimaryButton from "@/components/PrimaryButton";
import GlassCard from "@/components/GlassCard";
import { useParcelStore, CameraSequenceMode, CameraFeel } from "@/lib/parcel-store";
import { buildCameraSequence } from "@/lib/camera-sequence";

// Map old camera modes to new sequence modes
const MODE_MAP: Record<string, CameraSequenceMode> = {
  "orbit_360": "orbit360",
  "spiral_descent": "spiralDescend",
  "top_view": "topView",
  "low_fly": "lowPass",
  "four_corners": "fourCorners",
};

const DURATIONS = [30, 45, 60] as const;
const HEIGHTS = [100, 200, 300, 400] as const;
const CAMERA_STYLES: { value: CameraFeel; label: string; description: string }[] = [
  { value: "soft", label: "Yumuşak", description: "Akıcı geçişler" },
  { value: "cinematic", label: "Sinematik", description: "Dramatik hareketler" },
  { value: "dynamic", label: "Dinamik", description: "Hızlı geçişler" },
];

interface CameraModeOption {
  mode: string;
  label: string;
  selected: boolean;
}

const CAMERA_MODE_OPTIONS: CameraModeOption[] = [
  { mode: "orbit_360", label: "Orbit 360", selected: true },
  { mode: "spiral_descent", label: "Spiral Alçalış", selected: true },
  { mode: "top_view", label: "Tepe Görünüm", selected: false },
  { mode: "low_fly", label: "Alçak Geçiş", selected: false },
  { mode: "four_corners", label: "4 Köşe", selected: false },
];

export default function DroneSettingsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  
  // Store state
  const droneSettings = useParcelStore((state) => state.droneSettings);
  const setDroneSettings = useParcelStore((state) => state.setDroneSettings);
  const setCameraSequence = useParcelStore((state) => state.setCameraSequence);
  
  // Local UI state
  const [cameraModes, setCameraModes] = useState<CameraModeOption[]>(CAMERA_MODE_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

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
      
      // Sync camera modes from store
      const storeModes = droneSettings.cameraModes;
      setCameraModes(CAMERA_MODE_OPTIONS.map((opt) => ({
        ...opt,
        selected: storeModes.includes(MODE_MAP[opt.mode] as CameraSequenceMode),
      })));

      setLoading(false);
    };

    fetchProject();
  }, [id, router, droneSettings.cameraModes]);

  const handleToggleCameraMode = (mode: string) => {
    setWarningMessage(null);
    
    setCameraModes((prev) => {
      const updated = prev.map((cm) =>
        cm.mode === mode ? { ...cm, selected: !cm.selected } : cm
      );
      
      // Check if we're unchecking the last mode
      const selectedCount = updated.filter((cm) => cm.selected).length;
      const isLastMode = updated.find((cm) => cm.mode === mode)?.selected === true && selectedCount === 0;
      
      if (isLastMode) {
        setWarningMessage("En az bir kamera modu seçmelisiniz.");
        return prev; // Don't apply the change
      }
      
      return updated;
    });
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      // Get selected mode strings
      const selectedModes = cameraModes
        .filter((cm) => cm.selected)
        .map((cm) => MODE_MAP[cm.mode] as CameraSequenceMode);
      
      // Build drone settings from UI state
      const newDroneSettings = {
        ...droneSettings,
        cameraModes: selectedModes,
      };
      
      // Update store with new settings
      setDroneSettings(newDroneSettings);
      
      // Build camera sequence
      const sequence = buildCameraSequence(newDroneSettings);
      
      // Save sequence to store
      setCameraSequence(sequence);
      
      // Navigate to video settings (step 5/10)
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
          {/* Warning message */}
          {warningMessage && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-warning font-medium">{warningMessage}</p>
              </div>
            </div>
          )}

          {/* Duration */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Video Süresi</label>
            <div className="grid grid-cols-3 gap-3">
              {DURATIONS.map((duration) => (
                <button
                  key={duration}
                  onClick={() => setDroneSettings({ duration })}
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
                  onClick={() => setDroneSettings({ startHeight: height as 100 | 200 | 300 | 400 })}
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

          {/* Camera Feel */}
          <GlassCard>
            <label className="text-white font-semibold mb-3 block">Kamera Hissi</label>
            <div className="grid grid-cols-3 gap-3">
              {CAMERA_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setDroneSettings({ cameraFeel: style.value })}
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