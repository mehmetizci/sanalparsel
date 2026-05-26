"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project, EnvironmentItem } from "@/types";
import { useParcelStore, POI } from "@/lib/parcel-store";
import { fetchNearbyPOIs, POIServiceError } from "@/lib/poi-service";
import {
  ProjectConfig,
  NearbyPlace,
  NearbyPlacesConfig,
  createDefaultProjectConfig,
  loadProjectConfig,
  saveProjectConfig,
  poiToNearbyPlace,
  getSelectedPOICount,
  getCategoryLabel,
} from "@/lib/project-config";
import AppShell from "@/components/AppShell";
import StepHeader from "@/components/StepHeader";
import PoiSelectionCard from "@/components/PoiSelectionCard";
import PrimaryButton from "@/components/PrimaryButton";
import GlassCard from "@/components/GlassCard";
import LoadingRenderState from "@/components/LoadingRenderState";

type ErrorType = "MISSING_COORDS" | "TIMEOUT" | "OVERPASS_ERROR" | "NETWORK_ERROR" | "UNKNOWN";

interface ErrorInfo {
  type: ErrorType;
  message: string;
}

const MAX_POI_SELECTION = 7;
const MIN_POI_SELECTION = 1;

// Convert global POI to EnvironmentItem
function poiToEnvironmentItem(poi: POI, projectId: string, index: number): EnvironmentItem {
  return {
    id: poi.id,
    project_id: projectId,
    name: poi.name || poi.label || "Bilinmeyen Yer",
    type: poi.category as EnvironmentItem["type"],
    distance: poi.distanceText || `${Math.round(poi.distanceMeters)} m`,
    lat: poi.lat,
    lon: poi.lng,
    selected: poi.selected,
    sort_order: index,
    source: "osm",
  };
}

// Convert NearbyPlace to EnvironmentItem
function nearbyPlaceToEnvItem(place: NearbyPlace, projectId: string, index: number): EnvironmentItem {
  return {
    id: place.id,
    project_id: projectId,
    name: place.name,
    type: place.category as EnvironmentItem["type"],
    distance: place.distanceText,
    lat: place.lat,
    lon: place.lng,
    selected: place.selected,
    sort_order: index,
    source: "osm" as const,
  };
}

export default function EnvironmentPage({ params }: { params: { id: string } }) {
  const urlParams = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = (urlParams?.id as string) || params.id;
  const isDemo = searchParams.get("demo") === "true";
  
  // Mounted guard to prevent SSR/hydration issues
  const [mounted, setMounted] = useState(false);
  
  // Project config
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [nearbyConfig, setNearbyConfig] = useState<NearbyPlacesConfig>({
    places: [],
    lastFetchedAt: null,
    parcelKey: null,
  });
  
  // Global store for POI - only access after mounted
  const parcelCenter = useParcelStore((state) => state.parcelCenter);
  const globalPois = useParcelStore((state) => state.pois);
  const nearbyParcelKey = useParcelStore((state) => state.nearbyParcelKey);
  const updatePoisFromApi = useParcelStore((state) => state.updatePoisFromApi);
  const togglePoi = useParcelStore((state) => state.togglePoi);
  const setSelectedPoiIds = useParcelStore((state) => state.setSelectedPoiIds);
  
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<EnvironmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingPoI, setFetchingPoI] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Set mounted guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load config from localStorage (only after mounted)
  useEffect(() => {
    if (!mounted) return;
    
    const loadConfig = () => {
      const stored = loadProjectConfig(projectId);
      if (stored) {
        setProjectConfig(stored);
        if (stored.nearbyPlaces) {
          setNearbyConfig(stored.nearbyPlaces);
          // Also sync to local state for UI
          setItems(stored.nearbyPlaces.places.map((p, i) => nearbyPlaceToEnvItem(p, projectId, i)));
        }
      } else {
        const newConfig = createDefaultProjectConfig(projectId);
        setProjectConfig(newConfig);
      }
    };
    loadConfig();
  }, [projectId, mounted]);

  // Fetch project from Supabase
  useEffect(() => {
    const fetchProject = async () => {
      // Demo mode: skip auth
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
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (!data) {
        router.push("/dashboard");
        return;
      }

      setProject(data as Project);

      // Fetch existing environment items from Supabase
      const { data: envData } = await supabase
        .from("environment_items")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order");

      if (envData && envData.length > 0) {
        // Convert to NearbyPlace format and update config
        const places: NearbyPlace[] = envData.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.type,
          distanceMeters: parseFloat(item.distance.replace(/[^\d.]/g, "")) || 0,
          distanceText: item.distance,
          lat: item.lat,
          lng: item.lon,
          selected: item.selected,
        }));
        
        const newConfig: NearbyPlacesConfig = {
          places,
          lastFetchedAt: Date.now(),
          parcelKey: `poi_${projectId}`,
        };
        
        setNearbyConfig(newConfig);
        setItems(envData as EnvironmentItem[]);
        
        // Save to project config
        if (projectConfig) {
          const updatedConfig = {
            ...projectConfig,
            nearbyPlaces: newConfig,
            updatedAt: Date.now(),
          };
          setProjectConfig(updatedConfig);
          saveProjectConfig(updatedConfig);
        }
      }

      setLoading(false);
    };

    fetchProject();
  }, [projectId, router, isDemo, projectConfig]);

  // Sync items when nearbyConfig changes
  useEffect(() => {
    if (nearbyConfig.places.length > 0 && items.length === 0) {
      setItems(nearbyConfig.places.map((p, i) => nearbyPlaceToEnvItem(p, projectId, i)));
    }
  }, [nearbyConfig, projectId, items.length]);

  // Update nearbyConfig and save to localStorage
  const updateNearbyConfig = useCallback((updates: Partial<NearbyPlacesConfig>) => {
    const newConfig = { ...nearbyConfig, ...updates };
    setNearbyConfig(newConfig);
    
    if (projectConfig) {
      const updatedProjectConfig = {
        ...projectConfig,
        nearbyPlaces: newConfig,
        updatedAt: Date.now(),
      };
      setProjectConfig(updatedProjectConfig);
      saveProjectConfig(updatedProjectConfig);
    }
  }, [nearbyConfig, projectConfig]);

  // Handle fetch from OSM
  const handleFetchFromOsm = async () => {
    const lat = parcelCenter?.lat || project?.center_lat;
    const lng = parcelCenter?.lon || project?.center_lon;
    
    if (!lat || !lng) {
      setError({
        type: "MISSING_COORDS",
        message: "Parsel koordinatları bulunamadı. Lütfen önce parsel bilgilerini girin.",
      });
      return;
    }

    const parcelKey = `poi_${Math.round(lat * 1000) / 1000}_${Math.round(lng * 1000) / 1000}`;
    
    // Skip if same parcel - use cached data
    if (nearbyParcelKey === parcelKey && globalPois.length > 0) {
      console.log("[Environment] Same parcel, using cached POIs");
      // Convert global POIs to nearby places
      const places = globalPois.map(poiToNearbyPlace);
      updateNearbyConfig({ places, parcelKey, lastFetchedAt: Date.now() });
      setItems(globalPois.map((p, i) => poiToEnvironmentItem(p, projectId, i)));
      return;
    }

    setFetchingPoI(true);
    setError(null);
    setValidationError(null);
    
    try {
      console.log(`[Environment] Fetching POIs for ${lat}, ${lng}`);
      
      const apiPois = await fetchNearbyPOIs(lat, lng);
      
      console.log(`[Environment] Got ${apiPois.length} POIs`);
      
      if (apiPois.length === 0) {
        setError({
          type: "OVERPASS_ERROR",
          message: "Bu bölgede çevre verisi bulunamadı",
        });
        return;
      }
      
      // Convert to normalized NearbyPlace format
      const places = apiPois.map(poiToNearbyPlace);
      
      // Update global store
      updatePoisFromApi(apiPois, parcelKey);
      
      // Update selected IDs in global store
      setSelectedPoiIds(places.filter(p => p.selected).map(p => p.id));
      
      // Update local config
      updateNearbyConfig({ places, parcelKey, lastFetchedAt: Date.now() });
      
      // Update UI items
      setItems(apiPois.map((p, i) => poiToEnvironmentItem(p, projectId, i)));
      
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
            setError({ type: "OVERPASS_ERROR", message: "Gerçek çevre verisi alınamadı: " + err.message });
            break;
          case "API_ERROR":
            setError({ type: "OVERPASS_ERROR", message: "Gerçek çevre verisi alınamadı. Sunucular meşgul veya erişim sınırlandırıldı." });
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

  // Handle POI toggle with validation
  const handleToggleItem = (itemId: string) => {
    const selectedCount = getSelectedPOICount(nearbyConfig);
    const item = nearbyConfig.places.find(p => p.id === itemId);
    
    if (!item) return;
    
    // Check if trying to deselect last item
    if (item.selected && selectedCount <= MIN_POI_SELECTION) {
      setValidationError(`En az ${MIN_POI_SELECTION} POI seçili olmalıdır`);
      setTimeout(() => setValidationError(null), 3000);
      return;
    }
    
    // Check if trying to select beyond max
    if (!item.selected && selectedCount >= MAX_POI_SELECTION) {
      setValidationError(`En fazla ${MAX_POI_SELECTION} POI seçilebilir`);
      setTimeout(() => setValidationError(null), 3000);
      return;
    }
    
    setValidationError(null);
    
    // Update local config
    const updatedPlaces = nearbyConfig.places.map(p =>
      p.id === itemId ? { ...p, selected: !p.selected } : p
    );
    updateNearbyConfig({ places: updatedPlaces });
    
    // Update items for UI
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, selected: !item.selected } : item
    ));
    
    // Update global store
    togglePoi(itemId);
    
    // Persist selected IDs
    const newSelectedIds = updatedPlaces.filter(p => p.selected).map(p => p.id);
    setSelectedPoiIds(newSelectedIds);
  };

  // Save and continue
  const handleSaveAndContinue = async () => {
    // Validate selection
    const selectedCount = getSelectedPOICount(nearbyConfig);
    if (selectedCount < MIN_POI_SELECTION) {
      setValidationError(`En az ${MIN_POI_SELECTION} POI seçilmelidir`);
      return;
    }
    
    setSaving(true);
    try {
      if (!isDemo) {
        const supabase = createClient();
        
        // Delete existing items
        await supabase.from("environment_items").delete().eq("project_id", projectId);
        
        // Insert new items from nearby config
        const itemsToInsert = nearbyConfig.places.map((place, index) => ({
          id: place.id,
          project_id: projectId,
          name: place.name,
          type: place.category,
          distance: place.distanceText,
          lat: place.lat,
          lon: place.lng,
          selected: place.selected,
          sort_order: index,
          source: "osm",
        }));
        
        await supabase.from("environment_items").insert(itemsToInsert);
      }
      
      // Navigate to narration
      router.push(`/projects/${projectId}/narration`);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !mounted) {
    return (
      <AppShell>
        <LoadingRenderState status="preparing" progress={10} customMessage="Sayfa hazırlanıyor..." />
      </AppShell>
    );
  }

  const selectedCount = getSelectedPOICount(nearbyConfig);

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <StepHeader
          step={5}
          totalSteps={10}
          title="Yakın Çevre Bilgileri"
          description="Videoda gösterilecek çevre bilgilerini seçin"
        />

        {/* Error message */}
        {error && (
          <GlassCard className="mb-4 bg-red-500/10 border-red-500/20">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm">{error.message}</p>
            </div>
          </GlassCard>
        )}

        {/* Validation error message */}
        {validationError && (
          <GlassCard className="mb-4 bg-warning/10 border-warning/20">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-warning text-sm">{validationError}</p>
            </div>
          </GlassCard>
        )}

        {/* Selection counter */}
        <GlassCard className="mb-4 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-muted text-sm">Seçili POI</span>
            <span className={`text-sm font-medium ${
              selectedCount >= MIN_POI_SELECTION && selectedCount <= MAX_POI_SELECTION
                ? "text-success" : "text-warning"
            }`}>
              {selectedCount} / {MAX_POI_SELECTION}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-card rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                selectedCount >= MIN_POI_SELECTION ? "bg-success" : "bg-warning"
              }`}
              style={{ width: `${(selectedCount / MAX_POI_SELECTION) * 100}%` }}
            />
          </div>
        </GlassCard>

        {/* Fetch button */}
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

        {/* POI Selection Card */}
        <PoiSelectionCard
          items={items}
          onToggleItem={handleToggleItem}
          maxSelections={MAX_POI_SELECTION}
        />

        {/* Selected POIs Preview */}
        {selectedCount > 0 && (
          <GlassCard className="mt-4 bg-gradient-to-r from-success/5 to-transparent">
            <div className="text-muted text-xs mb-2">Seçili Yerler</div>
            <div className="space-y-1">
              {nearbyConfig.places
                .filter(p => p.selected)
                .sort((a, b) => a.distanceMeters - b.distanceMeters)
                .slice(0, 5)
                .map(poi => (
                  <div key={poi.id} className="flex items-center justify-between text-sm">
                    <span className="text-white">{poi.name}</span>
                    <span className="text-muted text-xs">{getCategoryLabel(poi.category)} • {poi.distanceText}</span>
                  </div>
                ))}
              {selectedCount > 5 && (
                <div className="text-muted text-xs">+{selectedCount - 5} daha...</div>
              )}
            </div>
          </GlassCard>
        )}

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => router.push(`/projects/${projectId}/video-settings`)}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
          >
            Geri
          </button>
          <PrimaryButton
            onClick={handleSaveAndContinue}
            loading={saving}
            disabled={selectedCount < MIN_POI_SELECTION}
            className="flex-1"
          >
            AI Tanıtım Metnine Geç
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}