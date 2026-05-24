"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, ParcelProperties } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import ParcelInfoCard from "@/components/ParcelInfoCard";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";

export default function ParcelInfoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const demoTitle = searchParams.get("title") || "Yeni Proje";
  
  const [project, setProject] = useState<Project | null>(null);
  const [, setCustomNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      // Demo mode - create a fake project object
      const demoProject: Project = {
        id: params.id as string,
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
        area: null,
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
        // Redirect to demo mode if not authenticated
        router.replace(`/projects/${params.id}/parcel-info?demo=true&title=${demoTitle}`);
        return;
      }

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

      if (!data) {
        // Project not found, go to new project
        router.push("/projects/new");
        return;
      }

      setProject(data as Project);
      setCustomNote(data.custom_note || "");
      setLoading(false);
    };

    fetchProject();
  }, [params.id, router, isDemo, demoTitle]);

  const handleSaveAndContinue = () => {
    if (project) {
      // In demo mode, just navigate to preview
      router.push(`/projects/${project.id}/preview?demo=true&title=${encodeURIComponent(project.title)}`);
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

  if (!project) {
    return null;
  }

  const shortTitle = project.short_title || project.title?.split(" ").slice(-2).join(" ");
  const properties = project.properties as ParcelProperties || {};

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
              <span className="font-semibold">Demo Modu:</span> Bu proje demo olarak oluşturuldu. Supabase bağlantısı yapılandırıldığında gerçek projeler oluşturabilirsiniz.
            </p>
          </div>
        )}

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
                <p className="text-white font-mono">{project.center_lat?.toFixed(6) || "-"}</p>
              </div>
              <div>
                <span className="text-muted">Boylam</span>
                <p className="text-white font-mono">{project.center_lon?.toFixed(6) || "-"}</p>
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