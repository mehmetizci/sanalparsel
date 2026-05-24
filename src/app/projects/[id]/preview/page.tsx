"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, ParcelProperties } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import PrimaryButton from "@/components/PrimaryButton";
import ParcelMap from "@/components/CesiumMap";
import ErrorBoundary from "@/components/ErrorBoundary";

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
      // Skip Supabase call in demo mode
      if (isDemo) return;

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
  const properties = project?.properties as ParcelProperties || {};

  // Define center coordinates
  const centerLat = project?.center_lat || 38.4237;
  const centerLon = project?.center_lon || 27.1428;

  // Demo mode: use a sample polygon around the center point
  const displayPolygon = isDemo && polygonCoordinates.length === 0 ? [
    [centerLon - 0.001, centerLat - 0.001],
    [centerLon + 0.001, centerLat - 0.001],
    [centerLon + 0.001, centerLat + 0.001],
    [centerLon - 0.001, centerLat + 0.001],
    [centerLon - 0.001, centerLat - 0.001],
  ] : polygonCoordinates;

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

        <div className="glass rounded-2xl overflow-hidden" style={{ minHeight: "500px" }}>
          {project ? (
            <ErrorBoundary
              fallback={
                <div className="w-full h-full min-h-[500px] bg-card rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold mb-2">Harita Yüklenemedi</h3>
                    <p className="text-muted text-sm">Harita bileşeni yüklenirken bir hata oluştu.</p>
                  </div>
                </div>
              }
            >
              <ParcelMap
                centerLat={centerLat}
                centerLon={centerLon}
                polygonCoordinates={displayPolygon}
                properties={properties}
                height={300}
              />
            </ErrorBoundary>
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