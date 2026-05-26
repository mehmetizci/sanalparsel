"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, Narration, VideoTone } from "@/types";
import { useParcelStore } from "@/lib/parcel-store";
import {
  ProjectConfig,
  AiNarrationConfig,
  NarrationMode,
  NARRATION_MODES,
  createDefaultProjectConfig,
  loadProjectConfig,
  saveProjectConfig,
} from "@/lib/project-config";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import NarrationEditor from "@/components/NarrationEditor";
import PrimaryButton from "@/components/PrimaryButton";
import LoadingRenderState from "@/components/LoadingRenderState";

export default function NarrationPage({ params }: { params: { id: string } }) {
  const { id: projectId } = params;
  const router = useRouter();
  
  // Mounted guard to prevent SSR/hydration issues
  const [mounted, setMounted] = useState(false);
  
  // Global parcel store for POIs
  const globalPois = useParcelStore((state) => state.pois);
  
  const [project, setProject] = useState<Project | null>(null);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [narrationConfig, setNarrationConfig] = useState<AiNarrationConfig>({
    mode: "corporate",
    text: "",
    lastGeneratedAt: null,
  });
  const [voiceType, setVoiceType] = useState<"female" | "male" | "corporate">("female");
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Set mounted guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load config from localStorage (only after mounted)
  useEffect(() => {
    if (!mounted) return;
    
    const loadConfig = () => {
      const stored = loadProjectConfig(projectId);
      if (stored) {
        setProjectConfig(stored);
        if (stored.aiNarration) {
          setNarrationConfig(stored.aiNarration);
        }
      } else {
        const newConfig = createDefaultProjectConfig(projectId);
        setProjectConfig(newConfig);
      }
    };
    loadConfig();
  }, [projectId, mounted]);

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

      setProject(data as Project);

      // Fetch existing narration
      const { data: narData } = await supabase
        .from("narrations")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (narData) {
        const nar = narData as Narration;
        // Load existing narration text into config
        if (nar.text && !narrationConfig.text) {
          setNarrationConfig(prev => ({ ...prev, text: nar.text }));
        }
        if (nar.voice_type) {
          setVoiceType(nar.voice_type);
        }
      }

      setLoading(false);
    };

    fetchProject();
  }, [projectId, router, narrationConfig.text]);

  // Update narration config and save to localStorage
  const updateNarrationConfig = useCallback((updates: Partial<AiNarrationConfig>) => {
    const newConfig = { ...narrationConfig, ...updates };
    setNarrationConfig(newConfig);
    
    if (projectConfig) {
      const updatedProjectConfig = {
        ...projectConfig,
        aiNarration: newConfig,
        updatedAt: Date.now(),
      };
      setProjectConfig(updatedProjectConfig);
      saveProjectConfig(updatedProjectConfig);
    }
  }, [narrationConfig, projectConfig]);

  // Handle mode change - don't clear existing text
  const handleModeChange = (mode: NarrationMode) => {
    updateNarrationConfig({ mode });
  };

  // Handle AI generation
  const handleGenerateWithAI = async () => {
    if (!project || !projectConfig) return;

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          tone: narrationConfig.mode,
          city: project.city,
          district: project.district,
          neighborhood: project.neighborhood,
          area: project.area,
          property_type: project.property_type,
          custom_note: project.custom_note,
          // Include POIs from both local config and global store
          nearbyPlaces: narrationConfig.mode === narrationConfig.mode 
            ? (projectConfig.nearbyPlaces?.places || globalPois)
            : [],
          videoDuration: projectConfig.droneSettings?.duration || 30,
          cameraModes: projectConfig.droneSettings?.cameraModes || [],
        }),
      });

      const data = await response.json();
      if (data.text) {
        updateNarrationConfig({
          text: data.text,
          lastGeneratedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error("AI generation error:", error);
      // Fallback to default text
      const defaultText = `${project.neighborhood || project.district || "Bölge"}'de yer alan bu parsel, modern şehir yaşamına yakın konumuyla dikkat çekmektedir. ${project.area || "Geniş"} metrekarelik alanıyla çeşitli yatırım fırsatları sunmaktadır. Profesyonel emlak danışmanlarımız detaylı bilgi için sizinle iletişime geçecektir.`;
      updateNarrationConfig({ text: defaultText });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      const supabase = createClient();

      await supabase.from("narrations").upsert({
        project_id: projectId,
        text: narrationConfig.text,
        tone: narrationConfig.mode as VideoTone,
        voice_type: voiceType,
      }, {
        onConflict: "project_id",
      });

      router.push(`/projects/${projectId}/video-preview`);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  // Calculate text statistics
  const textStats = useMemo(() => {
    const text = narrationConfig.text || "";
    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const currentMode = NARRATION_MODES.find(m => m.value === narrationConfig.mode);
    const estimatedDuration = currentMode 
      ? Math.round(wordCount * currentMode.avgSpeechDuration)
      : Math.round(wordCount * 0.35);
    
    return {
      charCount,
      wordCount,
      estimatedDuration,
      maxWords: currentMode?.maxWords || 150,
      isOverLimit: wordCount > (currentMode?.maxWords || 150),
    };
  }, [narrationConfig.text, narrationConfig.mode]);

  if (loading || !mounted) {
    return (
      <AppShell>
        <LoadingRenderState status="preparing" progress={10} customMessage="Sayfa hazırlanıyor..." />
      </AppShell>
    );
  }

  const currentModeInfo = NARRATION_MODES.find(m => m.value === narrationConfig.mode);

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <StepHeader
          step={6}
          totalSteps={10}
          title="AI Tanıtım Metni"
          description="Video içeriği için tanıtım metnini oluşturun"
        />

        {/* Mode Selection */}
        <GlassCard className="mb-4">
          <label className="text-white font-semibold mb-3 block">Metin Modu</label>
          <div className="grid grid-cols-5 gap-2">
            {NARRATION_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => handleModeChange(mode.value)}
                className={`p-3 rounded-xl text-center transition-all ${
                  narrationConfig.mode === mode.value
                    ? "bg-primary/20 border-2 border-primary"
                    : "bg-card/50 border border-white/10 hover:border-white/20"
                }`}
              >
                <div className="text-white text-xs font-medium">{mode.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-2 text-muted text-xs">
            {currentModeInfo?.description} • Max {currentModeInfo?.maxWords} kelime
          </div>
        </GlassCard>

        {/* Generate Button */}
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
                <span>AI ile Metin Oluştur ({currentModeInfo?.label})</span>
              </>
            )}
          </button>
        </GlassCard>

        {/* Text Editor */}
        <GlassCard>
          <NarrationEditor
            text={narrationConfig.text}
            onChange={(text) => updateNarrationConfig({ text })}
            tone={narrationConfig.mode as VideoTone}
            onToneChange={(tone) => updateNarrationConfig({ mode: tone as NarrationMode })}
          />
        </GlassCard>

        {/* Text Statistics */}
        {narrationConfig.text && (
          <GlassCard className="mt-4 bg-card/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-4">
                <span className="text-muted">
                  {textStats.charCount} karakter
                </span>
                <span className={`${textStats.isOverLimit ? "text-warning" : "text-success"}`}>
                  {textStats.wordCount} / {textStats.maxWords} kelime
                </span>
              </div>
              <span className="text-muted">
                ~{textStats.estimatedDuration} sn seslendirme
              </span>
            </div>
          </GlassCard>
        )}

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => router.push(`/projects/${projectId}/environment`)}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
          >
            Geri
          </button>
          <PrimaryButton
            onClick={handleSaveAndContinue}
            loading={saving}
            disabled={!narrationConfig.text || textStats.isOverLimit}
            className="flex-1"
          >
            Seslendirmeye Geç
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}