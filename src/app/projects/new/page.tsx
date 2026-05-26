"use client";

import type { Polygon, MultiPolygon } from "geojson";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { parseParcelGeoJson, generateProjectName, generateShortProjectName, getParcelCenter } from "@/lib/geojson";
import { ParcelGeoJson, ParcelProperties } from "@/types";
import { useParcelStore, ParcelMetadata } from "@/lib/parcel-store";
import { useAppLoadingStore } from "@/lib/loading-states";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import UploadCard from "@/components/UploadCard";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import AdaParselForm from "@/components/tkgm/AdaParselForm";
import type { ParcelQueryResult } from "@/components/tkgm/AdaParselForm";

type NewProjectMode = "upload" | "adaparsel";

export default function NewProjectPage() {
  const router = useRouter();
  const setFromParsed = useParcelStore((state) => state.setFromParsed);
  
  // Video state management - reset on page mount (GeoJSON upload must NOT trigger video overlay)
  const setVideoRenderState = useAppLoadingStore((state) => state.setVideoRenderState);
  const setVideoRenderStartedByUser = useAppLoadingStore((state) => state.setVideoRenderStartedByUser);
  
  const [mode, setMode] = useState<NewProjectMode>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<{
    geoJson: ParcelGeoJson;
    properties: ParcelProperties;
    projectName: string;
    shortTitle: string;
    center: { lat: number; lon: number } | null;
  } | null>(null);

  // Reset video state on page mount - GeoJSON upload must NEVER trigger video overlay
  useEffect(() => {
    setVideoRenderState("idle");
    setVideoRenderStartedByUser(false);
  }, [setVideoRenderState, setVideoRenderStartedByUser]);

  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const content = await file.text();
      
      if (!content || content.trim().length === 0) {
        setError("Dosya boş görünüyor. Lütfen geçerli bir GeoJSON dosyası yükleyin.");
        setLoading(false);
        return;
      }
      
      let data;
      try {
        data = JSON.parse(content);
      } catch {
        setError("GeoJSON dosyası okunamadı. Dosya formatı hatalı olabilir.");
        setLoading(false);
        return;
      }
      
      const geoJson = parseParcelGeoJson(data);

      if (!geoJson) {
        setError("GeoJSON dosyası okunamadı. Lütfen parsel sınırı içeren geçerli bir dosya yükleyin.");
        setLoading(false);
        return;
      }

      const properties = geoJson.properties || {};
      const projectName = generateProjectName(properties);
      const shortTitle = generateShortProjectName(properties);
      const center = getParcelCenter(geoJson);

      // Save to global store immediately
      setFromParsed({
        geoJson,
        metadata: properties as ParcelMetadata,
      });

      setGeoJsonData({
        geoJson,
        properties,
        projectName,
        shortTitle,
        center,
      });
    } catch (err) {
      console.error("File parse error:", err);
      setError("GeoJSON dosyası okunamadı. Lütfen parsel sınırı içeren geçerli bir dosya yükleyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleTKGMParcel = (parcel: NonNullable<ParcelQueryResult["parcel"]>) => {
    console.log("[NewProject] TKGM Parcel result:", parcel);

    // Create GeoJSON from TKGM result
    const geoJson: ParcelGeoJson = {
      type: "Feature",
      properties: {
        Il: parcel.il,
        Ilce: parcel.ilce,
        Mahalle: parcel.mahalle,
        Ada: String(parcel.adaNo),
        ParselNo: String(parcel.parselNo),
        Alan: parcel.alan,
        Nitelik: parcel.nitelik,
        Pafta: parcel.pafta,
      },
      geometry: parcel.geometri.geometry as Polygon | MultiPolygon,
    };

    const projectName = `${parcel.il} / ${parcel.ilce} - Ada ${parcel.adaNo} Parsel ${parcel.parselNo}`;
    const shortTitle = `Ada ${parcel.adaNo} P${parcel.parselNo}`;
    const center = { lat: parcel.center.lat, lon: parcel.center.lng };

    // Save to global store
    setFromParsed({
      geoJson,
      metadata: geoJson.properties as ParcelMetadata,
    });

    setGeoJsonData({
      geoJson,
      properties: geoJson.properties,
      projectName,
      shortTitle,
      center,
    });
  };

  const handleCreateProject = async () => {
    if (!geoJsonData) return;

    setLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error("Auth error:", authError);
        // For demo purposes, continue without auth
        const demoProjectId = "demo-" + Date.now();
        router.push(`/projects/${demoProjectId}/parcel-info?demo=true&title=${encodeURIComponent(geoJsonData.projectName)}`);
        return;
      }

      if (!user) {
        // Demo mode - redirect to parcel info with demo data
        const demoProjectId = "demo-" + Date.now();
        router.push(`/projects/${demoProjectId}/parcel-info?demo=true&title=${encodeURIComponent(geoJsonData.projectName)}`);
        return;
      }

      const { data: project, error: createError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: geoJsonData.projectName,
          short_title: geoJsonData.shortTitle,
          geojson: geoJsonData.geoJson,
          properties: geoJsonData.properties,
          city: geoJsonData.properties.Il || null,
          district: geoJsonData.properties.Ilce || null,
          neighborhood: geoJsonData.properties.Mahalle || null,
          block_no: geoJsonData.properties.Ada || null,
          parcel_no: geoJsonData.properties.ParselNo || null,
          area: geoJsonData.properties.Alan || null,
          property_type: geoJsonData.properties.Nitelik || null,
          center_lat: geoJsonData.center?.lat || null,
          center_lon: geoJsonData.center?.lon || null,
          status: "draft",
        })
        .select()
        .single();

      if (createError) {
        console.error("Supabase error:", createError);
        // Fallback to demo mode
        const demoProjectId = "demo-" + Date.now();
        router.push(`/projects/${demoProjectId}/parcel-info?demo=true&title=${encodeURIComponent(geoJsonData.projectName)}`);
        return;
      }

      router.push(`/projects/${project.id}/parcel-info`);
    } catch (err) {
      console.error("Project creation error:", err);
      // Fallback to demo mode
      const demoProjectId = "demo-" + Date.now();
      router.push(`/projects/${demoProjectId}/parcel-info?demo=true&title=${encodeURIComponent(geoJsonData.projectName)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <StepHeader
          step={0}
          totalSteps={10}
          title="Yeni Proje Oluştur"
          description="Parsel seçerek başlayın"
        />

        {error && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-warning mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-warning font-medium">Hata</p>
                <p className="text-warning/80 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={() => { setError(null); setGeoJsonData(null); }}
              className="mt-3 text-sm text-warning hover:text-warning/80 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Tekrar dene
            </button>
          </div>
        )}

        {/* Show form or preview */}
        {!geoJsonData ? (
          <>
            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setMode("upload")}
                className={`p-4 rounded-xl border transition-all ${
                  mode === "upload"
                    ? "bg-primary/10 border-primary text-white"
                    : "bg-card/50 border-border text-muted hover:text-white hover:border-border/80"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <span className="font-medium">GeoJSON Yükle</span>
                <p className="text-xs mt-1 opacity-70">Parsel dosyası yükleyin</p>
              </button>

              <button
                onClick={() => setMode("adaparsel")}
                className={`p-4 rounded-xl border transition-all ${
                  mode === "adaparsel"
                    ? "bg-primary/10 border-primary text-white"
                    : "bg-card/50 border-border text-muted hover:text-white hover:border-border/80"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <span className="font-medium">Ada/Parsel Sorgula</span>
                <p className="text-xs mt-1 opacity-70">TKGM veritabanından sorgulayın</p>
              </button>
            </div>

            {/* Mode content */}
            {mode === "upload" ? (
              <UploadCard onFileSelect={handleFileSelect} disabled={loading} />
            ) : (
              <GlassCard>
                <AdaParselForm onSuccess={handleTKGMParcel} />
              </GlassCard>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <GlassCard>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold">Dosya Yüklendi</h3>
                  <p className="text-muted text-sm">{geoJsonData.projectName}</p>
                </div>
              </div>

              <div className="bg-card/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">İl / İlçe</span>
                  <span className="text-white">{geoJsonData.properties.Il || "-"} / {geoJsonData.properties.Ilce || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Mahalle</span>
                  <span className="text-white">{geoJsonData.properties.Mahalle || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Ada / Parsel</span>
                  <span className="text-white">{geoJsonData.properties.Ada || "-"} / {geoJsonData.properties.ParselNo || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Alan</span>
                  <span className="text-white">{geoJsonData.properties.Alan || "-"} m²</span>
                </div>
              </div>

              <button
                onClick={() => { setGeoJsonData(null); setError(null); setMode("upload"); }}
                className="mt-4 text-sm text-muted hover:text-white flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Farklı parsel seç
              </button>
            </GlassCard>

            <PrimaryButton
              onClick={handleCreateProject}
              loading={loading}
              fullWidth
              size="lg"
              className="mt-6"
            >
              Projeyi Oluştur ve Devam Et
            </PrimaryButton>
          </div>
        )}
      </div>
    </AppShell>
  );
}