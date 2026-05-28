"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import GlassCard from "@/components/GlassCard";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const { createClient } = await import("@/lib/supabase");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("credits")
            .eq("user_id", user.id)
            .single();

          if (profile) {
            setCredits(profile.credits ?? 0);
          }
        }
      } catch (error) {
        console.error("Error fetching credits:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, []);

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-md mx-auto min-h-screen flex items-center">
        <div className="w-full">
          <GlassCard className="text-center bg-gradient-to-r from-success/20 to-primary/20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">Ödeme Başarılı!</h1>
            <p className="text-muted mb-6">
              Krediniz hesabınıza eklendi. Artık videolarınızı oluşturabilirsiniz.
            </p>

            {!loading && credits !== null && (
              <div className="bg-card/50 rounded-xl p-4 mb-6">
                <p className="text-muted text-sm mb-1">Mevcut Kredi Bakiyeniz</p>
                <p className="text-4xl font-bold text-white">{credits}</p>
              </div>
            )}

            <div className="space-y-3">
              <Link href="/dashboard">
                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all">
                  Ana Sayfaya Dön
                </button>
              </Link>
              
              <Link href="/billing">
                <button className="w-full py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium">
                  Daha Fazla Kredi Al
                </button>
              </Link>
            </div>
          </GlassCard>

          {orderId && (
            <p className="text-muted/50 text-xs text-center mt-4">
              Sipariş No: {orderId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
