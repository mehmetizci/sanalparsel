"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";

interface ProfileData {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  office_name: string;
  office_logo_url: string;
  office_address: string;
  license_no: string;
  default_show_name: boolean;
  default_show_phone: boolean;
  default_show_logo: boolean;
  default_show_avatar: boolean;
  default_show_license: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>({
    id: "",
    full_name: "",
    phone: "",
    avatar_url: "",
    office_name: "",
    office_logo_url: "",
    office_address: "",
    license_no: "",
    default_show_name: true,
    default_show_phone: true,
    default_show_logo: true,
    default_show_avatar: false,
    default_show_license: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile((prev) => ({
        ...prev,
        ...data,
        full_name: data?.full_name || user.user_metadata?.full_name || prev.full_name,
      }));

      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      await supabase.from("profiles").upsert({
        user_id: user.id,
        ...profile,
      }, {
        onConflict: "user_id",
      });

      setMessage({ type: "success", text: "Profil başarıyla kaydedildi!" });
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: "error", text: "Profil kaydedilirken bir hata oluştu." });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Profil Ayarları</h1>
          <p className="text-muted mt-1">Kişisel bilgilerinizi ve video varsayılanlarınızı yönetin</p>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-xl ${
            message.type === "success" 
              ? "bg-success/10 border border-success/20 text-success"
              : "bg-warning/10 border border-warning/20 text-warning"
          }`}>
            {message.text}
          </div>
        )}

        <GlassCard className="mb-4">
          <h3 className="text-white font-semibold mb-4">Kişisel Bilgiler</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-muted text-sm mb-2">Ad Soyad</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Ahmet Yılmaz"
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3 text-white placeholder-muted/50 focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-muted text-sm mb-2">Cep Telefonu</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="0532 123 45 67"
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3 text-white placeholder-muted/50 focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="mb-4">
          <h3 className="text-white font-semibold mb-4">Ofis Bilgileri</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-muted text-sm mb-2">Ofis Adı</label>
              <input
                type="text"
                value={profile.office_name}
                onChange={(e) => setProfile({ ...profile, office_name: e.target.value })}
                placeholder="ABC Emlak"
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3 text-white placeholder-muted/50 focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-muted text-sm mb-2">Ofis Adresi</label>
              <input
                type="text"
                value={profile.office_address}
                onChange={(e) => setProfile({ ...profile, office_address: e.target.value })}
                placeholder="İstanbul, Türkiye"
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3 text-white placeholder-muted/50 focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-muted text-sm mb-2">Yetki Belge No</label>
              <input
                type="text"
                value={profile.license_no}
                onChange={(e) => setProfile({ ...profile, license_no: e.target.value })}
                placeholder="1234567"
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3 text-white placeholder-muted/50 focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="mb-4">
          <h3 className="text-white font-semibold mb-4">Video Varsayılanları</h3>
          <p className="text-muted text-sm mb-4">Videolarda varsayılan olarak gösterilecek bilgiler</p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.default_show_name}
                onChange={(e) => setProfile({ ...profile, default_show_name: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-card/50 text-primary focus:ring-primary"
              />
              <span className="text-white">Ad Soyad göster</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.default_show_phone}
                onChange={(e) => setProfile({ ...profile, default_show_phone: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-card/50 text-primary focus:ring-primary"
              />
              <span className="text-white">Telefon göster</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.default_show_logo}
                onChange={(e) => setProfile({ ...profile, default_show_logo: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-card/50 text-primary focus:ring-primary"
              />
              <span className="text-white">Logo göster</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.default_show_avatar}
                onChange={(e) => setProfile({ ...profile, default_show_avatar: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-card/50 text-primary focus:ring-primary"
              />
              <span className="text-white">Profil fotoğrafı göster</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.default_show_license}
                onChange={(e) => setProfile({ ...profile, default_show_license: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-card/50 text-primary focus:ring-primary"
              />
              <span className="text-white">Yetki belge no göster</span>
            </label>
          </div>
        </GlassCard>

        <PrimaryButton
          onClick={handleSave}
          loading={saving}
          fullWidth
          size="lg"
          className="mb-4"
        >
          Değişiklikleri Kaydet
        </PrimaryButton>

        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl border border-warning/20 text-warning hover:bg-warning/10 transition-colors font-medium"
        >
          Çıkış Yap
        </button>
      </div>
    </AppShell>
  );
}