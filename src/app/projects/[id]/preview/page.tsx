"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase";
import { Project, ParcelGeoJson } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useParcelStore } from "@/lib/parcel-store";

// Lazy-load MapboxMap so this route stays light, mobile-fast and SSR-safe.
const MapboxMap = dynamic(() => import("@/components/MapboxMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  ),
});

function PreviewPageInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = (params?.id as string) || "test";
  const isDemo = searchParams.get("demo") === "true";
  const demoTitle = searchParams.get("title") || "Yeni Proje";

  // Zustand store
  const uploadedGeoJson = useParcelStore((state) => state.uploadedGeoJson);
  const setParcelData = useParcelStore((state) => state.setParcelData);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setProject({
        id,
        user_id: "demo",
        title: decodeURIComponent(demoTitle),
        short_title: decodeURIComponent(demoTitle).split(" ").slice(-2).join(" "),
        geojson: null, // Will use store data
        properties: null,
        city: "İzmir",
        district: "Çiğli",
        neighborhood: "Harmandalı",
        block_no: null,
        parcel_no: null,
        area: null,
        property_type: null,
        center_lat: 38.4238,
        center_lon: 27.1428,
        custom_note: null,
        status: "draft",
        created_at: new Date().toISOString(),
      });
      
      // Initialize store with demo data if not already set
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
        setParcelData({
          geoJson: demoGeoJson,
          metadata: demoGeoJson.properties,
          source: "demo",
        });
      }
      
      setLoading(false);
      return;
    }

    const fetchProject = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/projects/${id}/preview?demo=true&title=${encodeURIComponent(demoTitle)}`);
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
      
      // Initialize store with project data
      if (data.geojson) {
        setParcelData({
          geoJson: data.geojson,
          metadata: data.properties ?? undefined,
          source: "database",
        });
      }
      
      setLoading(false);
    };

    fetchProject().catch((err) => {
      console.error("[Preview] fetchProject error", err);
      // Fall back to demo so the page never crashes.
      router.replace(`/projects/${id}/preview?demo=true&title=${encodeURIComponent(demoTitle)}`);
    });
  }, [id, router, isDemo, demoTitle, uploadedGeoJson, setParcelData]);

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

        <div className="glass rounded-[28px] overflow-hidden h-[60vh] min-h-[480px] w-full relative">
          <MapboxMap
            droneHeight={300}
            cinematic
            className="!absolute !inset-0"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push(`/projects/${id}/parcel-info${isDemo ? `?demo=true&title=${encodeURIComponent(project.title)}` : ""}`)}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
          >
            Geri
          </button>
          <PrimaryButton
            onClick={() => router.push(`/projects/${id}/drone-settings${isDemo ? `?demo=true&title=${encodeURIComponent(project.title)}` : ""}`)}
            className="flex-1"
          >
            Drone Ayarlarına Geç
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </AppShell>
      }
    >
      <PreviewPageInner />
    </Suspense>
  );
}
