"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, Narration, VideoTone } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import NarrationEditor from "@/components/NarrationEditor";
import PrimaryButton from "@/components/PrimaryButton";

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

      // Fetch existing narration
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
      // Fallback to default text
      const defaultText = `${project.neighborhood || project.district || "Bölge"}'de yer alan bu parsel, modern şehir yaşamına yakın konumuyla dikkat çekmektedir. ${project.area || "Geniş"} metrekarelik alanıyla çeşitli yatırım fırsatları sunmaktadır. Profesyonel emlak danışmanlarımız detaylı bilgi için sizinle iletişime geçecektir.`;
      setNarration((prev) => ({ ...prev, text: defaultText }));
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAndContinue = async () => {
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

        <GlassCard className="mb-4">
          <button
            onClick={handleGenerateWithAI}
            disabled={generating}
            className="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:from-blue-600 hover:to-primary transition-all disabled:opacity-50"
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
                <span>AI ile Metin Oluştur</span>
              </>
            )}
          </button>
        </GlassCard>

        <GlassCard>
          <NarrationEditor
            text={narration.text}
            onChange={(text) => setNarration((prev) => ({ ...prev, text }))}
            tone={narration.tone}
            onToneChange={(tone) => setNarration((prev) => ({ ...prev, tone: tone as VideoTone }))}
          />
        </GlassCard>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => router.push(`/projects/${id}/environment`)}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
          >
            Geri
          </button>
          <PrimaryButton
            onClick={handleSaveAndContinue}
            loading={saving}
            disabled={!narration.text}
            className="flex-1"
          >
            Seslendirmeye Geç
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}