'use client'

import Link from 'next/link'
import { AppShell, StepHeader } from '@/components/layout'
import { GlassCard, PrimaryButton } from '@/components/mobile'

export default function DownloadPage() {
  return (
    <AppShell showNav={false}>
      <StepHeader 
        title="Video Hazır!" 
        description="Videonuzu indirin"
      />

      {/* Success message */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-full bg-[#22C55E]/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-5xl">✅</span>
        </div>
        <h2 className="text-xl font-bold text-white">Tebrikler!</h2>
        <p className="text-gray-400 mt-2">Video başarıyla oluşturuldu</p>
      </div>

      {/* Video info */}
      <GlassCard className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="text-3xl">🎬</span>
          </div>
          <div>
            <p className="font-semibold text-white">Büyük Çiğli 21645/4</p>
            <p className="text-gray-400 text-sm">1080x1920 • 45 saniye</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">45s</p>
            <p className="text-xs text-gray-400">Süre</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">4K</p>
            <p className="text-xs text-gray-400">Kalite</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">12MB</p>
            <p className="text-xs text-gray-400">Boyut</p>
          </div>
        </div>
      </GlassCard>

      {/* Download button */}
      <PrimaryButton className="w-full mb-4">
        📥 MP4 İndir
      </PrimaryButton>

      {/* Share buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button className="py-3 bg-white/5 rounded-xl text-white text-sm font-medium hover:bg-white/10 transition-colors">
          📱 Instagram
        </button>
        <button className="py-3 bg-white/5 rounded-xl text-white text-sm font-medium hover:bg-white/10 transition-colors">
          🎵 TikTok
        </button>
        <button className="py-3 bg-white/5 rounded-xl text-white text-sm font-medium hover:bg-white/10 transition-colors">
          ▶️ YouTube
        </button>
      </div>

      {/* New project */}
      <Link href="/projects/new" className="block mt-6">
        <GlassCard className="text-center cursor-pointer hover:bg-[#143660] transition-colors">
          <p className="text-[#2563EB] font-medium">+ Yeni Proje Oluştur</p>
        </GlassCard>
      </Link>
    </AppShell>
  )
}