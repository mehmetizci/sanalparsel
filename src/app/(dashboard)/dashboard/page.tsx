"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Project } from "@/types";
import AppShell from "@/components/AppShell";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import { useParcelStore } from "@/lib/parcel-store";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openProjectError, setOpenProjectError] = useState<string | null>(null);

  // Wizard store for loading project data into state
  const initFromProject = useParcelStore((state) => state.initFromProject);
  const clearParcelData = useParcelStore((state) => state.clearParcelData);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }
      
      setUser(user);
      
      // Fetch projects
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (projectsData) {
        setProjects(projectsData as Project[]);
      }
      
      // Fetch credits
      const { data: creditsData } = await supabase
        .from("credits")
        .select("amount")
        .eq("user_id", user.id);
      
      if (creditsData) {
        const total = creditsData.reduce((sum, c) => sum + c.amount, 0);
        setCredits(total);
      }
      
      setLoading(false);
    };
    
    checkUser();
  }, [router]);

  const handleProjectClick = async (project: Project) => {
    try {
      // Clear any existing parcel data first
      clearParcelData();
      
      // Initialize parcel store from project data
      if (project.geojson || project.properties || project.center_lat || project.center_lon) {
        initFromProject({
          geojson: project.geojson ?? undefined,
          properties: project.properties ?? undefined,
          center_lat: project.center_lat ?? undefined,
          center_lon: project.center_lon ?? undefined,
        });
      } else {
        // Project has no data - show error
        setOpenProjectError("Proje verisi bulunamadı.");
        return;
      }
      
      // Navigate directly to parcel-info page (step 2/10)
      router.push(`/projects/${project.id}/parcel-info`);
    } catch (error) {
      console.error("[Dashboard] handleProjectClick error:", error);
      setOpenProjectError("Proje verisi bulunamadı.");
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

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || " هناك";

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Merhaba, {firstName} 👋</h1>
            <p className="text-muted mt-1">Video projelerinizi yönetin</p>
          </div>
          <Link href="/profile">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Credits Card */}
        <GlassCard className="mb-6 bg-gradient-to-r from-primary/20 to-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Kalan Video Kredisi</p>
              <p className="text-4xl font-bold text-white mt-1">{credits}</p>
            </div>
            <Link href="/billing">
              <PrimaryButton variant="secondary" size="sm">
                Kredi Satın Al
              </PrimaryButton>
            </Link>
          </div>
        </GlassCard>

        {/* New Project Button */}
        <Link href="/projects/new" className="block mb-8">
          <GlassCard hover className="flex items-center gap-4 p-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg">Yeni Proje Oluştur</h3>
              <p className="text-muted text-sm">GeoJSON dosyası yükleyerek başlayın</p>
            </div>
            <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </GlassCard>
        </Link>

        {/* Recent Projects */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Son Projeler</h2>
            <Link href="/projects" className="text-primary text-sm hover:underline">
              Tümünü Gör
            </Link>
          </div>

          {openProjectError && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-warning mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-warning font-medium">Hata</p>
                  <p className="text-warning/80 text-sm">{openProjectError}</p>
                </div>
              </div>
              <button
                onClick={() => setOpenProjectError(null)}
                className="mt-3 text-sm text-warning hover:text-warning/80 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Kapat
              </button>
            </div>
          )}

          {projects.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="Henüz proje yok"
              description="İlk projenizi oluşturmak için GeoJSON dosyası yükleyin"
              action={
                <Link href="/projects/new">
                  <PrimaryButton>Yeni Proje Oluştur</PrimaryButton>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className="w-full text-left"
                >
                  <GlassCard hover className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">{project.short_title || project.title}</h3>
                      <p className="text-muted text-sm">
                        {[project.city, project.district, project.neighborhood].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        project.status === "completed" 
                          ? "bg-success/10 text-success"
                          : project.status === "video_ready"
                          ? "bg-primary/10 text-primary"
                          : "bg-warning/10 text-warning"
                      }`}>
                        {project.status === "draft" ? "Taslak" : 
                         project.status === "analysis_ready" ? "Analiz Hazır" :
                         project.status === "video_ready" ? "Video Hazır" : "Tamamlandı"}
                      </span>
                      <span className="text-muted text-xs">
                        {new Date(project.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </GlassCard>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { href: "/videos", icon: "🎬", label: "Videolarım" },
            { href: "/billing", icon: "💳", label: "Kredilerim" },
            { href: "/profile", icon: "👤", label: "Profilim" },
            { href: "/help", icon: "❓", label: "Yardım" },
          ].map((link) => (
            <Link key={link.href} href={link.href}>
              <GlassCard hover className="text-center py-4">
                <span className="text-2xl mb-2 block">{link.icon}</span>
                <span className="text-white text-sm font-medium">{link.label}</span>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}