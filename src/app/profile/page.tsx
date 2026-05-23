"use client"

import { AppShell, StepHeader, ProgressBar } from '@/components/layout'
import { GlassCard, PrimaryButton } from '@/components/mobile'

export default function ProfilePage() {
  return (
    <AppShell title="Profil">
      {/* Profile Card */}
      <GlassCard className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-[#2563EB]/20 flex items-center justify-center">
          <span className="text-2xl">👤</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Ahmet Yılmaz</h2>
          <p className="text-gray-400 text-sm">ahmet@example.com</p>
        </div>
      </GlassCard>

      {/* Menu items */}
      <div className="space-y-3">
        <GlassCard className="flex items-center justify-between cursor-pointer hover:bg-[#143660] transition-colors">
          <div className="flex items-center gap-4">
            <span className="text-xl">📧</span>
            <span className="text-white">E-posta Değiştir</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </GlassCard>

        <GlassCard className="flex items-center justify-between cursor-pointer hover:bg-[#143660] transition-colors">
          <div className="flex items-center gap-4">
            <span className="text-xl">🔒</span>
            <span className="text-white">Şifre Değiştir</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </GlassCard>

        <GlassCard className="flex items-center justify-between cursor-pointer hover:bg-[#143660] transition-colors">
          <div className="flex items-center gap-4">
            <span className="text-xl">📱</span>
            <span className="text-white">Telefon</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">0532 123 45 67</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center justify-between cursor-pointer hover:bg-[#143660] transition-colors">
          <div className="flex items-center gap-4">
            <span className="text-xl">💳</span>
            <span className="text-white">Kredi Paketleri</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </GlassCard>
      </div>

      {/* Logout */}
      <button className="w-full mt-6 py-4 bg-red-500/10 text-red-500 rounded-2xl font-semibold">
        Çıkış Yap
      </button>
    </AppShell>
  )
}
