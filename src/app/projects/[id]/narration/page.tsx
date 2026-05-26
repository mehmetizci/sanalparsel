"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { Project, Narration, VideoTone } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";

const modeLabels: Record<VideoTone, string> = {
  corporate: "Kurumsal",
  investment: "Yatırım",
  social: "Sosyal",
  short: "Kısa",
  premium: "Premium",
};

const aiButtonLabels: Record<VideoTone, string> = {
  premium: "✨ Premium Metin Oluştur",
  investment: "✨ Yatırım Metni Oluştur",
  corporate: "✨ Kurumsal Metin Oluştur",
  social: "✨ Sosyal Medya Metni Oluştur",
  short: "✨ Kısa Metin Oluştur",
};

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
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const modeRef = useRef<VideoTone>("corporate");

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
        if (narData.text) setHasGeneratedOnce(true);
      }

      setLoading(false);
    };

    fetchProject();
  }, [id, router]);

  const handleGenerateWithAI = async (force = false) => {
    if (!project) return;
    
    const currentMode = narration.tone;
    modeRef.current = currentMode;

    if (!force && hasGeneratedOnce && narration.text) {
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: id,
          tone: currentMode,
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
        setHasGeneratedOnce(true);
      }
    } catch (error) {
      console.error("AI generation error:", error);
      const defaultText = `${project.neighborhood || project.district || "Bölge"}'de yer alan bu parsel, modern şehir yaşamına yakın konumuyla dikkat çekmektedir. ${project.area || "Geniş"} metrekarelik alanıyla çeşitli yatırım fırsatları sunmaktadır. Profesyonel emlak danışmanlarımız detaylı bilgi için sizinle iletişime geçecektir.`;
      setNarration((prev) => ({ ...prev, text: defaultText }));
      setHasGeneratedOnce(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleModeChange = (newMode: VideoTone) => {
    setNarration((prev) => ({ ...prev, tone: newMode }));
    if (hasGeneratedOnce && narration.text) {
      setTimeout(() => handleGenerateWithAI(true), 100);
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

  const duration = Math.ceil(narration.text.length / 15);
  const statsText = narration.text 
    ? `~${duration} sn seslendirme • ${narration.text.length} karakter`
    : "";

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
      <div className="px-4 py-5 max-w-2xl mx-auto pb-28">
        <StepHeader
          step={6}
          totalSteps={10}
          title="AI Tanıtım Metni"
          description="Video içeriği için tanıtım metnini oluşturun"
        />

        {/* Horizontal Scroll Mode Selector */}
        <div className="mb-4 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {(Object.keys(modeLabels) as VideoTone[]).map((mode) => {
              const isActive = narration.tone === mode;
              return (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  disabled={generating}
                  className={`
                    shrink-0 px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap
                    ${generating ? "opacity-50" : ""}
                    ${isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/30" 
                      : "bg-white/[0.05] text-white/50 border border-white/[0.08]"
                    }
                  `}
                >
                  {modeLabels[mode]}
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Generate Button - Compact */}
        {!hasGeneratedOnce ? (
          <motion.button
            onClick={() => handleGenerateWithAI()}
            disabled={generating}
            whileTap={{ scale: 0.98 }}
            className="w-full mb-4 relative overflow-hidden bg-gradient-to-r from-primary to-blue-500 text-white font-medium py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Oluşturuluyor...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>{aiButtonLabels[narration.tone]}</span>
              </>
            )}
          </motion.button>
        ) : (
          <motion.button
            onClick={() => handleGenerateWithAI(true)}
            disabled={generating}
            whileTap={{ scale: 0.98 }}
            className="w-full mb-4 relative overflow-hidden bg-white/[0.06] text-white/70 font-medium py-2.5 rounded-2xl flex items-center justify-center gap-2 border border-white/[0.08]"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Yeniden oluşturuluyor...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>✨ Yeniden Oluştur</span>
              </>
            )}
          </motion.button>
        )}

        {/* Generated Text Panel - Premium Cinematic */}
        <AnimatePresence mode="wait">
          {narration.text ? (
            <motion.div
              key="text-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative"
            >
              {/* AI Badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-primary text-xs font-medium">AI tarafından oluşturuldu</span>
                <span className="text-white/20 text-xs">•</span>
                <span className="text-white/50 text-xs">{modeLabels[narration.tone]}</span>
              </div>

              {/* Text Card */}
              <GlassCard className="p-0 overflow-hidden">
                <div 
                  className="relative p-4 bg-[rgba(15,23,42,0.4)]"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), inset 0 -1px 0 0 rgba(0,0,0,0.3), 0 0 60px rgba(37,99,235,0.08)"
                  }}
                >
                  <textarea
                    value={narration.text}
                    onChange={(e) => setNarration((prev) => ({ ...prev, text: e.target.value }))}
                    className="w-full min-h-[140px] bg-transparent text-white/90 text-sm leading-relaxed placeholder-white/20 focus:outline-none resize-none"
                    placeholder="Metin düzenleyin..."
                  />
                </div>
                
                {/* Inline Stats Bar */}
                <div className="px-4 py-2.5 border-t border-white/[0.05] flex items-center justify-between">
                  <span className="text-white/40 text-xs">{statsText}</span>
                </div>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 px-6"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/[0.03] flex items-center justify-center">
                <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-white/40 text-sm">Mod seçin ve AI ile metin oluşturun</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#07182F]/95 backdrop-blur-xl border-t border-white/[0.05]">
        <motion.button
          onClick={handleSaveAndContinue}
          disabled={!narration.text}
          whileTap={narration.text ? { scale: 0.98 } : {}}
          className={`
            w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
            ${narration.text 
              ? "bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/30" 
              : "bg-white/[0.05] text-white/30"
            }
          `}
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Kaydediliyor...
            </>
          ) : (
            <>
              <span>🎙</span>
              <span>Seslendirmeye Geç</span>
            </>
          )}
        </motion.button>
      </div>
    </AppShell>
  );
}