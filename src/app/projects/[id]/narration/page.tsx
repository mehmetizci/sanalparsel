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
      <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
        <StepHeader
          step={6}
          totalSteps={10}
          title="AI Tanıtım Metni"
          description="Video içeriği için tanıtım metnini oluşturun"
        />

        {/* AI Generate Button - Single source of truth */}
        <motion.button
          onClick={handleGenerateWithAI}
          disabled={generating}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full mb-5 relative overflow-hidden bg-gradient-to-r from-primary via-blue-500 to-primary bg-[length:200%_100%] animate-gradient text-white font-medium py-3.5 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>AI Metin Oluşturuyor...</span>
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

        {/* Text Editor with embedded mode selector */}
        <GlassCard className="mb-4">
          <NarrationEditor
            text={narration.text}
            onChange={(text) => setNarration((prev) => ({ ...prev, text }))}
            tone={narration.tone}
            onToneChange={(tone) => setNarration((prev) => ({ ...prev, tone: tone as VideoTone }))}
          />
        </GlassCard>

        {/* Back button */}
        <button
          onClick={() => router.push(`/projects/${id}/environment`)}
          className="w-full py-2.5 text-white/50 text-sm hover:text-white/70 transition-colors"
        >
          ← Geri
        </button>

        {/* Sticky Bottom CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#07182F] via-[#07182F]/95 to-transparent"
        >
          <motion.button
            onClick={handleSaveAndContinue}
            disabled={!narration.text}
            whileHover={narration.text ? { scale: 1.02 } : {}}
            whileTap={narration.text ? { scale: 0.98 } : {}}
            className={`
              w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300
              ${narration.text 
                ? "bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/30" 
                : "bg-white/[0.06] text-white/30"
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
        </motion.div>
      </div>
    </AppShell>
  );
}