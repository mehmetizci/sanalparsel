'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell, StepHeader } from '@/components/layout'
import { GlassCard, PrimaryButton } from '@/components/mobile'

const SCENES = [
  { id: 'intro', label: 'Giriş', status: 'completed' },
  { id: 'reveal', label: 'Parsel Reveal', status: 'completed' },
  { id: 'orbit', label: 'Orbit', status: 'completed' },
  { id: 'poi', label: 'Çevre Bilgileri', status: 'completed' },
  { id: 'contact', label: 'Final İletişim', status: 'pending' },
]

export default function VideoPreviewPage() {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
    }, 3000)
  }

  return (
    <AppShell showNav={false} showBack onBack={() => router.back()}>
      <StepHeader 
        title="Video Önizleme" 
        description="Son halini kontrol et"
      />

      {/* Video mockup */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 mb-6">
        <div className="aspect-[9/16] max-h-[500px] mx-auto bg-dark-800 flex items-center justify-center">
          {generating ? (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Video oluşturuluyor...</p>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <span className="text-6xl">🎬</span>
              <p className="mt-2">Video önizleme</p>
            </div>
          )}
        </div>
        
        {/* Phone frame effect */}
        <div className="absolute inset-0 rounded-2xl border-4 border-white/10 pointer-events-none" />
      </div>

      {/* Scene timeline */}
      <GlassCard className="mb-6">
        <h3 className="text-white font-semibold mb-4">Sahne Listesi</h3>
        <div className="space-y-2">
          {SCENES.map((scene) => (
            <div key={scene.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <span className={scene.status === 'completed' ? 'text-white' : 'text-gray-400'}>
                {scene.label}
              </span>
              {scene.status === 'completed' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#22C55E" stroke="none">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" />
                </svg>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-500" />
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* CTA */}
      <div className="space-y-3">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-4 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] rounded-2xl font-semibold text-white disabled:opacity-50"
        >
          {generating ? 'Oluşturuluyor...' : '🔄 Video Oluştur'}
        </button>
        
        <PrimaryButton onClick={() => router.push('/projects/new/download')}>
          📥 MP4 İndir
        </PrimaryButton>
      </div>
    </AppShell>
  )
}