"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import PrimaryButton from "@/components/PrimaryButton";

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const demoTitle = searchParams.get("title") || "Yeni Proje";
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      // Demo mode - create a fake project object
      const demoProject: Project = {
        id,
        user_id: "demo",
        title: decodeURIComponent(demoTitle),
        short_title: decodeURIComponent(demoTitle).split(" ").slice(-2).join(" "),
        geojson: null,
        properties: {},
        city: null,
        district: null,
        neighborhood: null,
        block_no: null,
        parcel_no: null,
        area: "1,234",
        property_type: null,
        center_lat: 38.4237,
        center_lon: 27.1428,
        custom_note: null,
        status: "draft",
        created_at: new Date().toISOString(),
      };
      setProject(demoProject);
      setLoading(false);
      return;
    }

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
      setLoading(false);
    };

    fetchProject();
  }, [id, router, isDemo, demoTitle]);

  const polygonCoordinates = project?.geojson?.geometry?.coordinates?.[0] || [];

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-4xl mx-auto">
        <StepHeader
          step={2}
          totalSteps={10}
          title="Parsel Önizleme"
          description="Haritada parselinizi görüntüleyin"
        />

        <div className="glass rounded-2xl overflow-hidden" style={{ minHeight: "400px" }}>
          {project ? (
            <div className="relative w-full h-full bg-card rounded-2xl overflow-hidden">
              {/* Map placeholder - Cesium integration will be added */}
              <div className="absolute inset-0 flex items-center justify-center bg-card">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Harita Önizleme</h3>
                  <p className="text-muted text-sm mb-4">
                    Koordinat: {project.center_lat?.toFixed(6) || "-"}, {project.center_lon?.toFixed(6) || "-"}
                  </p>
                  <p className="text-muted text-xs">
                    Parsel sınırı: {polygonCoordinates.length} nokta
                  </p>
                </div>
              </div>

              {/* Map overlay controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  className="glass p-2 rounded-lg hover:bg-card/80 transition-colors"
                  title="Tam ekran"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <button
                  className="glass p-2 rounded-lg hover:bg-card/80 transition-colors"
                  title="Yakınlaştır"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
                <button
                  className="glass p-2 rounded-lg hover:bg-card/80 transition-colors"
                  title="Uzaklaştır"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </button>
              </div>

              {/* Parcel info overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-semibold">{project.short_title || project.title}</h4>
                      <p className="text-muted text-sm">{project.area ? `${project.area} m²` : "-"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                      <span className="text-success text-sm">Parsel görüntüleniyor</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <p className="text-muted">Harita için koordinat bilgisi bulunamadı.</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push(`/projects/${id}/parcel-info`)}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
          >
            Geri
          </button>
          <PrimaryButton
            onClick={() => router.push(`/projects/${id}/drone-settings`)}
            className="flex-1"
          >
            Drone Ayarlarına Geç
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}