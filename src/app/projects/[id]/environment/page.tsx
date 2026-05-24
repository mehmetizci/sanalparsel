"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, EnvironmentItem } from "@/types";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import PoiSelectionCard from "@/components/PoiSelectionCard";
import PrimaryButton from "@/components/PrimaryButton";

const POI_TYPES = [
  { type: "hospital", label: "Hastane" },
  { type: "school", label: "Okul" },
  { type: "university", label: "Üniversite" },
  { type: "market", label: "Market" },
  { type: "pharmacy", label: "Eczane" },
  { type: "transport", label: "Toplu Taşıma" },
  { type: "highway", label: "Ana Yol" },
  { type: "marketplace", label: "Pazar Yeri" },
];

export default function EnvironmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<EnvironmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingPoI, setFetchingPoI] = useState(false);

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
      } else {
        // Create default items
        const defaultItems: Omit<EnvironmentItem, "id">[] = POI_TYPES.slice(0, 5).map((poi, index) => ({
          project_id: id,
          name: `${poi.label} (Yakın)`,
          type: poi.type as EnvironmentItem["type"],
          distance: `${(index + 1) * 0.5} km`,
          lat: (data as Project).center_lat || 0,
          lon: (data as Project).center_lon || 0,
          selected: index < 3,
          sort_order: index,
          source: "osm",
        }));
        setItems(defaultItems as EnvironmentItem[]);
      }

      setLoading(false);
    };

    fetchProject();
  }, [id, router]);

  const handleFetchFromOsm = async () => {
    if (!project?.center_lat || !project?.center_lon) return;

    setFetchingPoI(true);
    try {
      // Fetch from Overpass API
      const lat = project.center_lat;
      const lon = project.center_lon;
      const radius = 3000; // 3km radius

      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:${radius},${lat},${lon});
          node["amenity"="school"](around:${radius},${lat},${lon});
          node["amenity"="university"](around:${radius},${lat},${lon});
          node["shop"="supermarket"](around:${radius},${lat},${lon});
          node["amenity"="pharmacy"](around:${radius},${lat},${lon});
          node["railway"="station"](around:${radius},${lat},${lon});
          way["highway"="primary"](around:${radius},${lat},${lon});
          node["marketplace"](around:${radius},${lat},${lon});
        );
        out body;
      `;

      const response = await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
        }
      );

      const data = await response.json();
      const elements = data.elements || [];

      const newItems: EnvironmentItem[] = elements.slice(0, 10).map((el: { tags?: { name?: string; amenity?: string; shop?: string }; lat: number; lon: number }, index: number) => {
        const type = el.tags?.amenity || el.tags?.shop || "market";
        const typeMap: Record<string, string> = {
          hospital: "hospital",
          school: "school",
          university: "university",
          supermarket: "market",
          pharmacy: "pharmacy",
          station: "transport",
          primary: "highway",
          marketplace: "marketplace",
        };

        return {
          id: `osm-${index}`,
          project_id: id,
          name: el.tags?.name || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
          type: (typeMap[type] || "market") as EnvironmentItem["type"],
          distance: `${(Math.random() * 2 + 0.5).toFixed(1)} km`,
          lat: el.lat,
          lon: el.lon,
          selected: index < 5,
          sort_order: index,
          source: "osm" as const,
        };
      });

      setItems(newItems);
    } catch (error) {
      console.error("OSM fetch error:", error);
    } finally {
      setFetchingPoI(false);
    }
  };

  const handleToggleItem = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
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

        <div className="flex justify-end mb-4">
          <button
            onClick={handleFetchFromOsm}
            disabled={fetchingPoI}
            className="text-sm text-primary hover:underline flex items-center gap-2"
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