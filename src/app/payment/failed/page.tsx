"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import GlassCard from "@/components/GlassCard";

export default function PaymentFailedPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = () => {
    switch (error) {
      case "payment_declined":
        return "Ödemeniz reddedildi. Lütfen kart bilgilerinizi kontrol edin.";
      case "order_not_found":
        return "Sipariş bulunamadı.";
      case "missing_params":
        return "Eksik ödeme bilgileri.";
      case "server_config":
        return "Sunucu yapılandırma hatası.";
      case "server_error":
        return "Sunucu hatası oluştu.";
      default:
        return "Ödeme tamamlanamadı. Lütfen tekrar deneyin.";
    }
  };

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-md mx-auto min-h-screen flex items-center">
        <div className="w-full">
          <GlassCard className="text-center bg-gradient-to-r from-warning/10 to-red-500/10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-warning/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">Ödeme Başarısız</h1>
            <p className="text-muted mb-6">
              {getErrorMessage()}
            </p>

            <div className="space-y-3">
              <Link href="/billing">
                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all">
                  Tekrar Dene
                </button>
              </Link>
              
              <Link href="/dashboard">
                <button className="w-full py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium">
                  Ana Sayfaya Dön
                </button>
              </Link>
            </div>
          </GlassCard>

          <p className="text-muted/50 text-xs text-center mt-4">
            Sorun devam ederse lütfen bizimle iletişime geçin.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
