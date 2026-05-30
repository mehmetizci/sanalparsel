"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import PrimaryButton from "@/components/PrimaryButton";
import GlassCard from "@/components/GlassCard";
import { useParcelStore } from "@/lib/parcel-store";

const DURATIONS = [30, 45, 60] as const;
const HEIGHTS = [100, 200, 300, 400] as const;

export default function DroneSettingsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  
  // Store state
  const droneSettings = useParcelStore((state) => state.droneSettings);
  const setDroneSettings = useParcelStore((state) => state.setDroneSettings);
  
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
      // Video süresi Drone Ayarları'ndan alınır
      // Camera feel artık kullanılmıyor - her zaman CinematicCameraEngine çalışır
      const newDroneSettings = {
        ...droneSettings,
      };
      
      // Update store with settings
      setDroneSettings(newDroneSettings);
      
      // Navigate to video settings (step 4/10)
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
          description="Video, seçilen yükseklikte profesyonel sinematik drone senaryosu ile oluşturulur"
        />

        <div className="space-y-6">
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
