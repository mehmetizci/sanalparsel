"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import GlassCard from "@/components/GlassCard";
import CreditPackageCard from "@/components/CreditPackageCard";
import PrimaryButton from "@/components/PrimaryButton";

// Package definitions matching iyzico backend
const CREDIT_PACKAGES = [
  { id: "starter", name: "Başlangıç", videos: 1, price: 149 },
  { id: "standard", name: "Standart", videos: 5, price: 599 },
  { id: "pro", name: "Pro", videos: 10, price: 999 },
];

interface Package {
  id: string;
  name: string;
  videos: number;
  price: number;
}

export default function BillingPage() {
  const router = useRouter();
  const [credits, setCredits] = useState(5);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchCredits = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch credits from user_profiles
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setCredits(profile.credits ?? 5);
      }

      setLoading(false);
    };

    fetchCredits();
  }, [router]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setProcessing(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Get the session token for auth
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/payments/iyzico/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.paymentPageUrl) {
        // Redirect to iyzico checkout form
        window.location.href = data.paymentPageUrl;
      } else {
        console.error("Payment init error:", data.error);
        alert("Ödeme başlatılamadı: " + (data.error || "Bilinmeyen hata"));
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setProcessing(false);
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
      <div className="px-4 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Kredi Satın Al</h1>
          <p className="text-muted mt-1">Video indirmek için kredi satın alın</p>
        </div>

        {/* Current Credits */}
        <GlassCard className="mb-8 bg-gradient-to-r from-primary/20 to-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Mevcut Kredi</p>
              <p className="text-4xl font-bold text-white mt-1">{credits}</p>
              <p className="text-muted text-sm mt-1">video kredisi</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </GlassCard>

        {/* Packages */}
        <h2 className="text-xl font-bold text-white mb-4">Video Paketleri</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {CREDIT_PACKAGES.map((pkg) => (
            <CreditPackageCard
              key={pkg.id}
              pkg={pkg}
              onSelect={setSelectedPackage}
              recommended={pkg.videos === 5}
            />
          ))}
        </div>

        {/* Checkout */}
        {selectedPackage && (
          <GlassCard className="sticky bottom-20 md:static">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-bold">{selectedPackage.name} Paket</h3>
                <p className="text-muted text-sm">
                  {selectedPackage.videos} video · {selectedPackage.price.toLocaleString("tr-TR")} TL
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold gradient-text">{selectedPackage.price.toLocaleString("tr-TR")} TL</p>
              </div>
            </div>
            <PrimaryButton
              onClick={handlePurchase}
              loading={processing}
              fullWidth
            >
              Ödemeye Geç
            </PrimaryButton>
          </GlassCard>
        )}

        {/* Info */}
        <div className="mt-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-muted text-sm">Kredileriniz kalıcıdır, son kullanma tarihi yoktur.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-muted text-sm">7/24 destek ve güvenli ödeme</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-muted text-sm">İade garantisi (14 gün içinde)</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}