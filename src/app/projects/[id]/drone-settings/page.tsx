"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import PrimaryButton from "@/components/PrimaryButton";
import GlassCard from "@/components/GlassCard";
import { useParcelStore, CameraFeel } from "@/lib/parcel-store";
import { buildCameraSequence } from "@/lib/camera-sequence";

const DURATIONS = [30, 45, 60] as const;
const HEIGHTS = [100, 200, 300, 400] as const;

// Enhanced camera feel options with detailed descriptions
const CAMERA_STYLES: {
  value: CameraFeel;
  label: string;
  description: string;
  goals: string[];
  default?: boolean;
}[] = [
  {
    value: "soft",
    label: "Yumuşak",
    description: "Akıcı ve sakin geçişler",
    goals: [
      "Daha stabil hareketler",
      "Daha az dönüş",
      "Premium görünüm",
      "Uzun izleme deneyimi",
    ],
  },
  {
    value: "cinematic",
    label: "Sinematik",
    description: "Drone reklam filmi hissi",
    goals: [
      "En etkileyici sonuç",
      "Gayrimenkul tanıtımı için önerilen",
      "Sinematik geçişler",
      "Profesyonel drone görüntüsü",
    ],
    default: true,
  },
  {
    value: "dynamic",
    label: "Dinamik",
    description: "Hızlı ve enerjik hareketler",
    goals: [
      "Sosyal medya odaklı",
      "Daha hareketli kamera",
      "Daha fazla açı değişimi",
    ],
  },
];

export default function DroneSettingsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  
  // Store state
  const droneSettings = useParcelStore((state) => state.droneSettings);
  const setDroneSettings = useParcelStore((state) => state.setDroneSettings);
  const setCameraSequence = useParcelStore((state) => state.setCameraSequence);
  
  // Local UI state
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
      
      setLoading(false);
    };

    fetchProject();
  }, [id, router]);

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      // Build drone settings from UI state (no camera modes anymore)
      const newDroneSettings = {
        ...droneSettings,
      };
      
      // Update store with settings
      setDroneSettings(newDroneSettings);
      
      // Build camera sequence based only on cameraFeel
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
          totalSteps={8}
          title="Drone Ayarları"
          description="Profesyonel drone uçuş senaryosu otomatik oluşturulur"
        />

        <div className="space-y-6">
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

          {/* Camera Feel - Main Control */}
          <GlassCard className="!p-6">
            <div className="mb-4">
              <label className="text-white font-semibold text-lg mb-2 block">Kamera Hissi</label>
              <p className="text-gray-400 text-sm">Bu profilin video karakterini belirler</p>
            </div>
            <div className="space-y-4">
              {CAMERA_STYLES.map((style) => {
                const isSelected = droneSettings.cameraFeel === style.value;
                return (
                  <button
                    key={style.value}
                    onClick={() => setDroneSettings({ cameraFeel: style.value })}
                    className={`
                      w-full text-left rounded-xl p-5 transition-all duration-300
                      ${isSelected 
                        ? "border-2 border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.4)]" 
                        : "border border-white/10 bg-card/30 hover:bg-card/50 hover:border-white/20"
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon indicator */}
                      <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                        ${isSelected ? "bg-blue-500 text-white" : "bg-white/10 text-gray-400"}
                      `}>
                        {isSelected ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="9" strokeWidth="2" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={`font-semibold text-lg ${isSelected ? "text-blue-400" : "text-white"}`}>
                            {style.label}
                          </h3>
                          {style.default && !isSelected && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                              Önerilen
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-400">
                              Seçili
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mb-3 ${isSelected ? "text-blue-300/80" : "text-gray-400"}`}>
                          {style.description}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {style.goals.map((goal, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-blue-400" : "bg-gray-500"}`} />
                              <span className={`text-xs ${isSelected ? "text-blue-200/70" : "text-gray-500"}`}>
                                {goal}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>
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