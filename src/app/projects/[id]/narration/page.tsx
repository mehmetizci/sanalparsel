"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { Project, Narration, VideoTone } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import NarrationEditor from "@/components/NarrationEditor";

export default function NarrationPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [narration, setNarration] = useState<Narration>({
    id: "",
    project_id: id,
    text: "",
    tone: "corporate",
    voice_type: "female",
    audio_url: null,
    duration: null,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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

      setProject(data as Project);

      const { data: narData } = await supabase
        .from("narrations")
        .select("*")
        .eq("project_id", id)
        .single();

      if (narData) {
        setNarration(narData as Narration);
      }

      setLoading(false);
    };

    fetchProject();
  }, [id, router]);

  const handleGenerateWithAI = async () => {
    if (!project) return;

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: id,
          tone: narration.tone,
          city: project.city,
          district: project.district,
          neighborhood: project.neighborhood,
          area: project.area,
          property_type: project.property_type,
          custom_note: project.custom_note,
        }),
      });

      const data = await response.json();
      if (data.text) {
        setNarration((prev) => ({ ...prev, text: data.text }));
      }
    } catch (error) {
      console.error("AI generation error:", error);
      const defaultText = `${project.neighborhood || project.district || "Bölge"}'de yer alan bu parsel, modern şehir yaşamına yakın konumuyla dikkat çekmektedir. ${project.area || "Geniş"} metrekarelik alanıyla çeşitli yatırım fırsatları sunmaktadır. Profesyonel emlak danışmanlarımız detaylı bilgi için sizinle iletişime geçecektir.`;
      setNarration((prev) => ({ ...prev, text: defaultText }));
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!narration.text) return;
    
    setSaving(true);
    try {
      const supabase = createClient();

      await supabase.from("narrations").upsert({
        project_id: id,
        text: narration.text,
        tone: narration.tone,
        voice_type: narration.voice_type,
      }, {
        onConflict: "project_id",
      });

      router.push(`/projects/${id}/video-preview`);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const aiButtonLabels: Record<VideoTone, string> = {
    premium: "✨ Premium Metin Oluştur",
    investment: "✨ Yatırım Metni Oluştur",
    corporate: "✨ Kurumsal Metin Oluştur",
    social: "✨ Sosyal Medya Metni Oluştur",
    short: "✨ Kısa Metin Oluştur",
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
          step={6}
          totalSteps={10}
          title="AI Tanıtım Metni"
          description="Video içeriği için tanıtım metnini oluşturun"
        />

        {/* Main Content Card */}
        <GlassCard className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Text Mode Selection - Moved ABOVE the AI button */}
            <div className="mb-6">
              <label className="text-white/90 font-semibold text-sm mb-3 block">Metin Modu</label>
              <div className="flex flex-wrap gap-2">
                {(["corporate", "investment", "social", "short", "premium"] as VideoTone[]).map((mode, index) => {
                  const isActive = narration.tone === mode;
                  return (
                    <motion.button
                      key={mode}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setNarration((prev) => ({ ...prev, tone: mode }))}
                      disabled={generating}
                      className={`
                        relative px-4 py-2 rounded-full font-medium text-xs transition-all duration-300
                        ${generating ? "opacity-50 pointer-events-none" : ""}
                        ${isActive 
                          ? "bg-gradient-to-r from-primary/20 to-blue-500/20 border border-primary/50 text-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                          : "bg-[rgba(15,23,42,0.4)] border border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span>{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
                        {isActive && (
                          <motion.svg 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3 h-3" 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </motion.svg>
                        )}
                      </div>
                      {isActive && (
                        <div className="absolute inset-0 rounded-full bg-primary/10 blur-md -z-10" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* AI Generate Button - Dynamic text based on mode */}
            <motion.button
              onClick={handleGenerateWithAI}
              disabled={generating}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full relative overflow-hidden bg-gradient-to-r from-primary via-blue-500 to-primary bg-[length:200%_100%] animate-gradient text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>AI Metin Oluşturuyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>{aiButtonLabels[narration.tone]}</span>
                </>
              )}
            </motion.button>
          </motion.div>
        </GlassCard>

        {/* Text Editor Card */}
        <GlassCard className="mb-6">
          <NarrationEditor
            text={narration.text}
            onChange={(text) => setNarration((prev) => ({ ...prev, text }))}
            tone={narration.tone}
            onToneChange={(tone) => setNarration((prev) => ({ ...prev, tone: tone as VideoTone }))}
          />
        </GlassCard>

        {/* Navigation Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3"
        >
          <motion.button
            onClick={() => router.push(`/projects/${id}/environment`)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 hover:text-white transition-all font-medium text-sm"
          >
            Geri
          </motion.button>
          
          <motion.button
            onClick={handleSaveAndContinue}
            disabled={!narration.text}
            whileHover={narration.text ? { scale: 1.02, boxShadow: "0 0 30px rgba(59, 130, 246, 0.4)" } : {}}
            whileTap={narration.text ? { scale: 0.98 } : {}}
            className={`
              flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300
              ${narration.text 
                ? "bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40" 
                : "bg-white/10 text-white/40 cursor-not-allowed border border-white/5"
              }
            `}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Kaydediliyor...
              </span>
            ) : (
              "Seslendirmeye Geç →"
            )}
          </motion.button>
        </motion.div>
      </div>
    </AppShell>
  );
}