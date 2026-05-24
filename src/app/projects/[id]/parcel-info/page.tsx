"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, ParcelProperties, ParcelGeoJson } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import ParcelInfoCard from "@/components/ParcelInfoCard";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";

// Lazy-load the map so this route stays light, mobile-fast and SSR-safe.
const ParcelMap = dynamic(() => import("@/components/ParcelMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  ),
});

// Default demo parcel (İzmir Çiğli Harmandalı 2406 Ada 9 Parsel).
const DEMO_PARCEL: ParcelGeoJson = {
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

function ParcelInfoPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = (params?.id as string) || "test";
  const isDemo = searchParams.get("demo") === "true";
  const demoTitle = searchParams.get("title") || "Yeni Proje";

  const [project, setProject] = useState<Project | null>(null);
  const [, setCustomNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      const demoProject: Project = {
        id,
        user_id: "demo",
        title: decodeURIComponent(demoTitle),
        short_title: decodeURIComponent(demoTitle).split(" ").slice(-2).join(" "),
        geojson: DEMO_PARCEL,
        properties: DEMO_PARCEL.properties,
        city: DEMO_PARCEL.properties.Il || null,
        district: DEMO_PARCEL.properties.Ilce || null,
        neighborhood: DEMO_PARCEL.properties.Mahalle || null,
        block_no: DEMO_PARCEL.properties.Ada || null,
        parcel_no: DEMO_PARCEL.properties.ParselNo || null,
        area: DEMO_PARCEL.properties.Alan || null,
        property_type: DEMO_PARCEL.properties.Nitelik || null,
        center_lat: 38.4238,
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(
          `/projects/${id}/parcel-info?demo=true&title=${encodeURIComponent(demoTitle)}`
        );
        return;
      }

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!data) {
        router.push("/projects/new");
        return;
      }

      setProject(data as Project);
      setCustomNote(data.custom_note || "");
      setLoading(false);
    };

    fetchProject().catch((err) => {
      console.error("[ParcelInfo] fetchProject error", err);
      router.replace(
        `/projects/${id}/parcel-info?demo=true&title=${encodeURIComponent(demoTitle)}`
      );
    });
  }, [id, router, isDemo, demoTitle]);

  const handleSaveAndContinue = () => {
    if (!project) return;
    const target = `/projects/${project.id}/preview${
      isDemo ? `?demo=true&title=${encodeURIComponent(project.title)}` : ""
    }`;
    router.push(target);
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

  if (!project) {
    return null;
  }

  const shortTitle =
    project.short_title || project.title?.split(" ").slice(-2).join(" ");
  const properties = (project.properties as ParcelProperties) || {};
  const parcelFeature = (project.geojson as ParcelGeoJson | null) || DEMO_PARCEL;

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <StepHeader
          step={1}
          totalSteps={10}
          title="Parsel Bilgileri"
          description="Otomatik çıkarılan parsel bilgilerini kontrol edin"
        />

        {isDemo && (
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-4 text-sm">
            <p className="text-accent">
              <span className="font-semibold">Demo Modu:</span> Bu proje demo
              olarak oluşturuldu. Supabase bağlantısı yapılandırıldığında
              gerçek projeler oluşturabilirsiniz.
            </p>
          </div>
        )}

        <div className="glass rounded-2xl overflow-hidden h-[260px] mb-4">
          <ParcelMap
            parcel={parcelFeature}
            centerLat={project.center_lat ?? undefined}
            centerLon={project.center_lon ?? undefined}
            properties={properties}
            droneHeight={300}
            cinematic={false}
            showOverlays
          />
        </div>

        <ParcelInfoCard
          properties={properties}
          shortTitle={shortTitle}
          onCustomNoteChange={setCustomNote}
        />

        <div className="mt-6 space-y-3">
          <GlassCard className="p-4">
            <h4 className="text-white font-semibold mb-3">Koordinat Bilgisi</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted">Enlem</span>
                <p className="text-white font-mono">
                  {project.center_lat?.toFixed(6) || "-"}
                </p>
              </div>
              <div>
                <span className="text-muted">Boylam</span>
                <p className="text-white font-mono">
                  {project.center_lon?.toFixed(6) || "-"}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <h4 className="text-white font-semibold mb-3">Proje Adı</h4>
            <p className="text-white">{project.title}</p>
          </GlassCard>
        </div>

        <PrimaryButton
          onClick={handleSaveAndContinue}
          fullWidth
          size="lg"
          className="mt-8"
        >
          Haritada Önizle
        </PrimaryButton>
      </div>
    </AppShell>
  );
}

export default function ParcelInfoPage() {
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
      <ParcelInfoPageInner />
    </Suspense>
  );
}
