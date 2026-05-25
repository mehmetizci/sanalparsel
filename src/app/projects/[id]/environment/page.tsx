"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, EnvironmentItem } from "@/types";
import { useParcelStore } from "@/lib/parcel-store";
import { fetchNearbyPOIs, POIServiceError } from "@/lib/poi-service";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import PoiSelectionCard from "@/components/PoiSelectionCard";
import PrimaryButton from "@/components/PrimaryButton";

type ErrorType = "MISSING_COORDS" | "TIMEOUT" | "OVERPASS_ERROR" | "NETWORK_ERROR" | "UNKNOWN";

interface ErrorInfo {
  type: ErrorType;
  message: string;
}

export default function EnvironmentPage({ params }: { params: { id: string } }) {
  const urlParams = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = (urlParams?.id as string) || params.id;
  const isDemo = searchParams.get("demo") === "true";
  
  // Global store for POI
  const parcelCenter = useParcelStore((state) => state.parcelCenter);
  const pois = useParcelStore((state) => state.pois);
  const setPois = useParcelStore((state) => state.setPois);
  const togglePoi = useParcelStore((state) => state.togglePoi);
  
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<EnvironmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingPoI, setFetchingPoI] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      // Demo mode: skip auth and Supabase
      if (isDemo) {
        const demoProject = {
          id: "demo",
          user_id: "demo",
          title: "Yeni Proje",
          short_title: "Yeni Proje",
          status: "draft" as const,
          geojson: null,
          properties: null,
          city: "İzmir",
          district: "Çiğli",
          neighborhood: "Harmandalı",
          block_no: "2406",
          parcel_no: "9",
          area: "1234",
          property_type: "Arsa",
          center_lat: 38.42360,
          center_lon: 27.14260,
          custom_note: null,
          created_at: new Date().toISOString(),
        };
        setProject(demoProject);
        
        // Use global store POIs if available, otherwise use demo items
        if (pois.length > 0) {
          setItems(pois.map((p, i) => ({
            id: p.id,
            project_id: "demo",
            name: p.name,
            type: p.type as EnvironmentItem["type"],
            distance: p.distanceText,
            lat: p.lat,
            lon: p.lng,
            selected: p.selected,
            sort_order: i,
            source: "osm",
          })));
        }
        setLoading(false);
        return;
      }

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

      // Fetch existing environment items
      const { data: envData } = await supabase
        .from("environment_items")
        .select("*")
        .eq("project_id", id)
        .order("sort_order");

      if (envData && envData.length > 0) {
        setItems(envData as EnvironmentItem[]);
      }

      setLoading(false);
    };

    fetchProject();
  }, [id, router, isDemo, pois]);

  const handleFetchFromOsm = async () => {
    // Use parcel center from global store, fallback to project center
    const lat = parcelCenter?.lat || project?.center_lat;
    const lng = parcelCenter?.lon || project?.center_lon;
    
    if (!lat || !lng) {
      setError({
        type: "MISSING_COORDS",
        message: "Parsel koordinatları bulunamadı. Lütfen önce parsel bilgilerini girin.",
      });
      return;
    }

    setFetchingPoI(true);
    setError(null);
    
    try {
      console.log(`[Environment] Fetching POIs for ${lat}, ${lng}`);
      
      const pois = await fetchNearbyPOIs(lat, lng, 3000);
      
      console.log(`[Environment] Got ${pois.length} POIs`);
      
      if (pois.length === 0) {
        setError({
          type: "OVERPASS_ERROR",
          message: "Bu bölgede çevre verisi bulunamadı. Farklı bir konum deneyin.",
        });
        return;
      }
      
      // Update global store
      setPois(pois);
      
      // Update items for UI
      setItems(pois.map((p, i) => ({
        id: p.id,
        project_id: id,
        name: p.name,
        type: p.type as EnvironmentItem["type"],
        distance: p.distanceText,
        lat: p.lat,
        lon: p.lng,
        selected: p.selected,
        sort_order: i,
        source: "osm" as const,
      })));
      
    } catch (err) {
      console.error("[Environment] POI fetch error:", err);
      
      if (err instanceof POIServiceError) {
        switch (err.code) {
          case "MISSING_COORDS":
            setError({ type: "MISSING_COORDS", message: err.message });
            break;
          case "TIMEOUT":
            setError({ type: "TIMEOUT", message: "Overpass API zaman aşımına uğradı. Lütfen tekrar deneyin." });
            break;
          case "OVERPASS_ERROR":
            setError({ type: "OVERPASS_ERROR", message: err.message });
            break;
          case "NETWORK_ERROR":
            setError({ type: "NETWORK_ERROR", message: "Sunucu bağlantı hatası. Lütfen internet bağlantınızı kontrol edin." });
            break;
          default:
            setError({ type: "UNKNOWN", message: err.message });
        }
      } else {
        setError({ type: "UNKNOWN", message: "Bilinmeyen hata oluştu." });
      }
    } finally {
      setFetchingPoI(false);
    }
  };

  const handleToggleItem = (itemId: string) => {
    // Update local state
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
    // Update global store
    togglePoi(itemId);
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      const supabase = createClient();

      // Delete existing items
      await supabase.from("environment_items").delete().eq("project_id", id);

      // Insert new items
      const itemsToInsert = items.map((item, index) => ({
        ...item,
        sort_order: index,
      }));

      await supabase.from("environment_items").insert(itemsToInsert);

      router.push(`/projects/${id}/narration`);
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
          step={5}
          totalSteps={10}
          title="Yakın Çevre Bilgileri"
          description="Videoda gösterilecek çevre bilgilerini seçin"
        />

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm">{error.message}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end mb-4">
          <button
            onClick={handleFetchFromOsm}
            disabled={fetchingPoI}
            className="text-sm text-primary hover:underline flex items-center gap-2 disabled:opacity-50"
          >
            {fetchingPoI ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Çevre taranıyor...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Çevreyi Otomatik Tara
              </>
            )}
          </button>
        </div>

        <PoiSelectionCard
          items={items}
          onToggleItem={handleToggleItem}
          maxSelections={7}
        />

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => router.push(`/projects/${id}/video-settings`)}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
          >
            Geri
          </button>
          <PrimaryButton
            onClick={handleSaveAndContinue}
            loading={saving}
            className="flex-1"
          >
            AI Tanıtım Metnine Geç
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}