"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, Narration, ParcelGeoJson, TTSProvider, OpenAIVoice } from "@/types";
import { useParcelStore, ParcelMetadata } from "@/lib/parcel-store";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import GlassCard from "@/components/GlassCard";
import VoiceSelector from "@/components/VoiceSelector";
import type { VoiceState } from "@/components/VoiceSelector";


export default function VideoPreviewPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    }>
      <VideoPreviewPageInner params={params} />
    </Suspense>
  );
}

function VideoPreviewPageInner({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  // Demo mode: Check URL params for demo mode
  const searchParams = useSearchParams();
  const isDemo = searchParams?.get("demo") === "true";

  // Store state
  const uploadedGeoJson = useParcelStore((state) => state.uploadedGeoJson);
  const droneSettings = useParcelStore((state) => state.droneSettings);

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [voiceType, setVoiceType] = useState<OpenAIVoice>("nova");
  const [loading, setLoading] = useState(true);
  const [textExpanded, setTextExpanded] = useState(false);

  // TTS settings state
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>("openai");
  const [ttsSpeed, setTtsSpeed] = useState(1.55);
  const [ttsUsedProvider, setTtsUsedProvider] = useState<string | null>(null);
  const [ttsUsedVoice, setTtsUsedVoice] = useState<string | null>(null);
  const [showFallbackWarning, setShowFallbackWarning] = useState(false);

  // Voice state for TTS
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");

  // Abort controller ref for TTS
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Demo mode: Skip auth check if demo=true in URL
      if (isDemo) {
        console.log("[VideoPreview] Demo mode - skipping auth");
        
        // Initialize demo store data if not set
        if (!uploadedGeoJson) {
          const demoGeoJson: ParcelGeoJson = {
            type: "Feature",
            properties: {
              Il: "İzmir",
              Ilce: "Çiğli",
              Mahalle: "Harmandalı",
              Ada: "2406",
              ParselNo: "9",
              Alan: "1234",
              Nitelik: "Arsa",
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [27.1418, 38.4228],
                  [27.1438, 38.4228],
                  [27.1438, 38.4248],
                  [27.1418, 38.4248],
                  [27.1418, 38.4228],
                ],
              ],
            },
          };
          useParcelStore.getState().setFromParsed({
            geoJson: demoGeoJson,
            metadata: demoGeoJson.properties as ParcelMetadata,
          });
        }
        
        // Set demo narration with audio URL (simulated for testing)
        const demoNarration: Narration = {
          id: "demo-narration",
          project_id: id,
          text: "İzmir Çiğli ilçesinde, Harmandalı mahallesinde yer alan bu 1234 metrekarelik arsa, konut yapılaşması için ideal bir lokasyonda bulunmaktadır. Çevresinde cadde ve sokak yolları mevcut olup, altyapı hizmetlerine yakın mesafededir.",
          tone: "premium",
          voice_type: "nova",
          audio_url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
          duration: 15,
          tts_provider: "openai",
          tts_voice: "nova",
          tts_speed: 1.55,
        };
        
        setNarration(demoNarration);
        setVoiceState("ready");

        // Set minimal demo project
        setProject({
          id,
          user_id: "demo",
          title: searchParams.get("title") || "Demo Proje",
          short_title: (searchParams.get("title") || "Demo").substring(0, 20),
          geojson: null,
          properties: {
            Il: "İzmir",
            Ilce: "Çiğli",
            Mahalle: "Harmandalı",
            Ada: "2406",
            ParselNo: "9",
            Alan: "1234",
            Nitelik: "Arsa",
          },
          city: "İzmir",
          district: "Çiğli",
          neighborhood: "Harmandalı",
          block_no: "2406",
          parcel_no: "9",
          area: "1234",
          property_type: "Arsa",
          center_lat: 38.4238,
          center_lon: 27.1428,
          custom_note: null,
          status: "draft",
          created_at: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }
      
      if (!user) { router.push("/login"); return; }

      const { data: projectData } = await supabase.from("projects").select("*").eq("id", id).eq("user_id", user.id).single();
      if (!projectData || cancelled) return;
      setProject(projectData as Project);

      const { data: narData } = await supabase.from("narrations").select("*").eq("project_id", id).single();
      if (!cancelled && narData) {
        setNarration(narData as Narration);
        setVoiceType((narData as Narration).voice_type as OpenAIVoice || "nova");
        if ((narData as Narration).audio_url) setVoiceState("ready");
      }

      if (projectData.tts_provider) setTtsProvider(projectData.tts_provider as TTSProvider);
      if (projectData.tts_voice) setVoiceType(projectData.tts_voice as OpenAIVoice);
      if (projectData.tts_speed) setTtsSpeed(projectData.tts_speed);

      if (!cancelled) setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [id, router, isDemo, searchParams, uploadedGeoJson]);

  const handleGenerateVoice = useCallback(async () => {
    if (!narration?.text) { setVoiceState("error"); return; }
    if (!project?.user_id) { setVoiceState("error"); return; }

    abortRef.current = new AbortController();
    setVoiceState("generating");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: narration.text, voice: voiceType, userId: project.user_id, projectId: id, provider: ttsProvider, speed: ttsSpeed }),
        signal: abortRef.current.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data?.audioUrl) throw new Error(data?.error || "Ses oluşturulamadı");

      if (data?.provider) { setTtsUsedProvider(data.provider); setTtsUsedVoice(data.voice); }
      if (data?.fallbackUsed && data?.provider !== "openai") setShowFallbackWarning(true);
      else setShowFallbackWarning(false);

      const supabase = createClient();
      await supabase.from("narrations").update({ audio_url: data.audioUrl, audio_status: "ready", voice_type: data.voice, tts_provider: data.provider, tts_speed: data.speed }).eq("project_id", id);

      setNarration(prev => prev ? { ...prev, audio_url: data.audioUrl, audio_status: "ready" } : null);
      setVoiceState("ready");
    } catch (err) {
      if ((err as Error).name === "AbortError") { setVoiceState("idle"); }
      else { setVoiceState("error"); }
    }
  }, [narration?.text, project?.user_id, id, ttsProvider, voiceType, ttsSpeed]);

  const handleVoiceRetry = useCallback(() => { setVoiceState("idle"); setTimeout(() => handleGenerateVoice(), 100); }, [handleGenerateVoice]);

  if (loading) {
    return <AppShell><div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div></AppShell>;
  }

  const hasAudio = !!narration?.audio_url;
  const textPreview = narration?.text || "";

  return (
    <AppShell>
      <div className="px-4 py-5 max-w-2xl mx-auto">
        <StepHeader step={7} totalSteps={10} title="Video Önizleme" description="Seslendirme ve video önizleme" />

        {showFallbackWarning && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <svg className="w-5 h-5 text-warning shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div><p className="text-warning text-sm font-medium">OpenAI TTS başarısız oldu</p><p className="text-white/60 text-xs">Edge TTS kullanıldı. Lütfen tekrar deneyin veya API anahtarınızı kontrol edin.</p></div>
          </div>
        )}

        <GlassCard className="mb-4 p-4">
          <VoiceSelector voiceType={voiceType} onChange={setVoiceType} onGenerate={handleGenerateVoice} disabled={voiceState === "generating"} voiceState={voiceState} audioUrl={narration?.audio_url} onRetry={handleVoiceRetry} provider={ttsProvider} onProviderChange={setTtsProvider} speed={ttsSpeed} onSpeedChange={setTtsSpeed} usedProvider={ttsUsedProvider} usedVoice={ttsUsedVoice} />
        </GlassCard>

        {textPreview && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2"><span className="text-white/50 text-xs">Metin Önizleme</span><span className="text-white/30 text-xs">{textPreview.length} karakter</span></div>
            <div className="relative rounded-xl overflow-hidden" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className={`p-4 ${!textExpanded && "line-clamp-4"}`}><p className="text-white/70 text-sm leading-relaxed">{textPreview}</p></div>
              {textPreview.length > 200 && <button onClick={() => setTextExpanded(!textExpanded)} className="w-full py-2 text-center text-primary/80 text-xs hover:text-primary transition-colors border-t border-white/[0.05]">{textExpanded ? "▲ Daha Az" : "▼ Devamını Gör"}</button>}
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <button onClick={() => router.push(`/projects/${id}/preview${isDemo ? '?demo=true' : ''}`)} className="flex-1 py-3 rounded-xl border border-white/[0.1] text-white/70 text-sm hover:bg-white/[0.05] transition-all font-medium">Geri</button>
          <button disabled={!hasAudio} onClick={() => router.push(`/projects/${id}/video-create${isDemo ? '?demo=true' : ''}`)} className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${hasAudio ? "bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30" : "bg-white/[0.05] text-white/30 border border-white/[0.05]"}`}>
            <span>🎬</span><span>Sinematik Video Oluştur</span>
          </button>
        </div>

        <div className="text-center py-3 px-4 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.04) 100%)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <span>{project?.short_title || "Proje"} • {droneSettings?.duration || 30} sn • WEBM 720×1280</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
