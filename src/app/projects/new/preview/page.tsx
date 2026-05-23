'use client'

import { useRouter } from 'next/navigation'
import { AppShell, StepHeader, ProgressBar } from '@/components/layout'
import { GlassCard, PrimaryButton } from '@/components/mobile'

export default function PreviewPage() {
  const router = useRouter()

  return (
    <AppShell showNav={false} showBack onBack={() => router.back()}>
      <StepHeader 
        step={3} 
        totalSteps={7}
        title="Parsel Önizleme" 
        description="Cesium harita üzerinde kontrol edin"
      />

      <ProgressBar current={3} total={7} className="mb-6" />

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 mb-4">
        <div className="h-[400px] bg-dark-800">
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Harita yükleniyor...
          </div>
        </div>
        
        {/* Map overlay info */}
        <GlassCard className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Büyük Çiğli 21645/4</p>
              <p className="text-gray-400 text-sm">4.972 m² Arsa</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary">📍</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-[#07182F]/95 backdrop-blur-md">
        <div className="max-w-lg mx-auto">
          <PrimaryButton onClick={() => router.push('/projects/new/drone-settings')}>
            Drone Ayarlarına Geç →
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  )
}