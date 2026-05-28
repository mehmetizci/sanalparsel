"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import GlassCard from "@/components/GlassCard";
import Toast, { ToastType } from "@/components/Toast";

interface ProfileFormData {
  id?: string;
  full_name: string;
  phone: string;
  city: string;
  district: string;
  office_name: string;
  office_address: string;
  license_number: string;
  show_name: boolean;
  show_phone: boolean;
  show_logo: boolean;
  show_profile_photo: boolean;
  show_license: boolean;
  credits: number;
}

const defaultFormData: ProfileFormData = {
  full_name: "",
  phone: "",
  city: "",
  district: "",
  office_name: "",
  office_address: "",
  license_number: "",
  show_name: true,
  show_phone: true,
  show_logo: true,
  show_profile_photo: false,
  show_license: false,
  credits: 5,
};

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

export default function ProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProfileFormData>(defaultFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "", type: "success" });

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const updateField = <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Profile fetch error:", error);
      }

      if (data) {
        setFormData({
          id: data.id,
          full_name: data.full_name || user.user_metadata?.full_name || "",
          phone: data.phone || "",
          city: data.city || "",
          district: data.district || "",
          office_name: data.office_name || "",
          office_address: data.office_address || "",
          license_number: data.license_number || "",
          show_name: data.show_name ?? true,
          show_phone: data.show_phone ?? true,
          show_logo: data.show_logo ?? true,
          show_profile_photo: data.show_profile_photo ?? false,
          show_license: data.show_license ?? false,
          credits: data.credits ?? 5,
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          full_name: user.user_metadata?.full_name || "",
        }));
      }

      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        showToast("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.", "error");
        return;
      }

      const profileData = {
        user_id: user.id,
        full_name: formData.full_name,
        phone: formData.phone,
        city: formData.city,
        district: formData.district,
        office_name: formData.office_name,
        office_address: formData.office_address,
        license_number: formData.license_number,
        show_name: formData.show_name,
        show_phone: formData.show_phone,
        show_logo: formData.show_logo,
        show_profile_photo: formData.show_profile_photo,
        show_license: formData.show_license,
        credits: formData.credits,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_profiles")
        .upsert(profileData, { onConflict: "user_id" });

      if (error) {
        console.error("Save error:", error);
        showToast("Kayıt sırasında hata oluştu", "error");
      } else {
        showToast("Profil bilgileri kaydedildi", "success");
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast("Kayıt sırasında hata oluştu", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
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
    <AppShell showNav={false}>
      <div className="px-4 py-8 max-w-2xl mx-auto pb-32">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Profil Ayarları</h1>
          <p className="text-muted mt-1">Kişisel bilgilerinizi ve video varsayılanlarınızı yönetin</p>
        </div>

        {/* Kişisel Bilgiler */}
        <GlassCard className="mb-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Kişisel Bilgiler
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-muted text-sm mb-2">Ad Soyad</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                placeholder="Ahmet Yılmaz"
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3.5 text-white placeholder-muted/50 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-muted text-sm mb-2">Cep Telefonu</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="0532 123 45 67"
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3.5 text-white placeholder-muted/50 transition-all duration-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-muted text-sm mb-2">Şehir</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="İstanbul"
                  className="w-full bg-card/50 border border-white/10 rounded-xl p-3.5 text-white placeholder-muted/50 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-muted text-sm mb-2">İlçe</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => updateField("district", e.target.value)}
                  placeholder="Kadıköy"
                  className="w-full bg-card/50 border border-white/10 rounded-xl p-3.5 text-white placeholder-muted/50 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Ofis Bilgileri */}
        <GlassCard className="mb-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Ofis Bilgileri
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-muted text-sm mb-2">Ofis Adı</label>
              <input
                type="text"
                value={formData.office_name}
                onChange={(e) => updateField("office_name", e.target.value)}
                placeholder="ABC Emlak"
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3.5 text-white placeholder-muted/50 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-muted text-sm mb-2">Ofis Adresi</label>
              <input
                type="text"
                value={formData.office_address}
                onChange={(e) => updateField("office_address", e.target.value)}
                placeholder="İstanbul, Türkiye"
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3.5 text-white placeholder-muted/50 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-muted text-sm mb-2">Yetki Belge No</label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => updateField("license_number", e.target.value)}
                placeholder="1234567"
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3.5 text-white placeholder-muted/50 transition-all duration-200"
              />
            </div>
          </div>
        </GlassCard>

        {/* Kredi Bilgisi */}
        <GlassCard className="mb-4 bg-gradient-to-r from-success/10 to-primary/10 border border-success/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-muted text-sm">Mevcut Kredi</p>
                <p className="text-3xl font-bold text-white">{formData.credits}</p>
              </div>
            </div>
            <a 
              href="/billing"
              className="px-4 py-2 rounded-xl bg-success/20 text-success font-medium hover:bg-success/30 transition-colors"
            >
              Kredi Satın Al
            </a>
          </div>
        </GlassCard>

        {/* Video Varsayılanları */}
        <GlassCard className="mb-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Video Varsayılanları
          </h3>
          <p className="text-muted text-sm mb-4">Videolarda varsayılan olarak gösterilecek bilgiler</p>
          <div className="space-y-3">
            <label className="custom-checkbox flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={formData.show_name}
                onChange={(e) => updateField("show_name", e.target.checked)}
              />
              <span className="checkmark" />
              <span className="text-white">Ad Soyad göster</span>
            </label>
            <label className="custom-checkbox flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={formData.show_phone}
                onChange={(e) => updateField("show_phone", e.target.checked)}
              />
              <span className="checkmark" />
              <span className="text-white">Telefon göster</span>
            </label>
            <label className="custom-checkbox flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={formData.show_logo}
                onChange={(e) => updateField("show_logo", e.target.checked)}
              />
              <span className="checkmark" />
              <span className="text-white">Logo göster</span>
            </label>
            <label className="custom-checkbox flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={formData.show_profile_photo}
                onChange={(e) => updateField("show_profile_photo", e.target.checked)}
              />
              <span className="checkmark" />
              <span className="text-white">Profil fotoğrafı göster</span>
            </label>
            <label className="custom-checkbox flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={formData.show_license}
                onChange={(e) => updateField("show_license", e.target.checked)}
              />
              <span className="checkmark" />
              <span className="text-white">Yetki belge no göster</span>
            </label>
          </div>
        </GlassCard>

        {/* Çıkış Yap */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl border border-warning/20 text-warning hover:bg-warning/10 transition-colors font-medium mb-4"
        >
          Çıkış Yap
        </button>
      </div>

      {/* Sticky Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#07182F] via-[#07182F]/95 to-transparent">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-semibold rounded-xl py-4 px-8 text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Değişiklikleri Kaydet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </AppShell>
  );
}