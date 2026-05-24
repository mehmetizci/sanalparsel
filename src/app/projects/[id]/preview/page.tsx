"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, ParcelProperties } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import PrimaryButton from "@/components/PrimaryButton";
import ErrorBoundary from "@/components/ErrorBoundary";

const DEMO_POLYGON = [
  [27.1418, 38.4228],
  [27.1438, 38.4228],
  [27.1438, 38.4248],
  [27.1418, 38.4248],
  [27.1418, 38.4228],
];

export default function PreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [id, setId] = useState<string>("test");
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    const projectId = pathParts[2] || "test";
    setId(projectId);

    const isDemo = searchParams.get("demo") === "true";
    const demoTitle = searchParams.get("title") || "Yeni Proje";

    if (isDemo) {
      const demoProject: Project = {
        id: projectId,
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
        .eq("id", projectId)
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
  }, [router, searchParams]);

  const polygonCoordinates = project?.geojson?.geometry?.coordinates?.[0] || [];
  const properties = project?.properties as ParcelProperties || {};
  const centerLat = project?.center_lat || 38.4237;
  const centerLon = project?.center_lon || 27.1428;
  const displayPolygon = polygonCoordinates.length > 0 ? polygonCoordinates : DEMO_POLYGON;

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
            <ParcelMapPreview
              centerLat={centerLat}
              centerLon={centerLon}
              polygonCoordinates={displayPolygon}
              properties={properties}
            />
          </ErrorBoundary>
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

function ParcelMapPreview({
  centerLat,
  centerLon,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  polygonCoordinates,
  properties,
}: {
  centerLat: number;
  centerLon: number;
  polygonCoordinates: number[][];
  properties: ParcelProperties;
}) {
  return (
    <div className="w-full h-full min-h-[500px] bg-card flex items-center justify-center relative">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h3 className="text-white font-bold mb-2">Parsel Haritası</h3>
        <p className="text-muted text-sm mb-4">
          Koordinatlar: {centerLat.toFixed(4)}, {centerLon.toFixed(4)}
        </p>
        <div className="text-xs text-muted">
          {properties.Il && <span>{properties.Il} / </span>}
          {properties.Ilce && <span>{properties.Ilce}</span>}
        </div>
      </div>
    </div>
  );
}