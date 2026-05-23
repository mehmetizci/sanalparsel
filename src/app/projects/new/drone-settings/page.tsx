'use client'

import { useRouter } from 'next/navigation'
import { AppShell, StepHeader, ProgressBar } from '@/components/layout'
import { DroneModeCard } from '@/components/mobile'

export default function DroneSettingsPage() {
  const router = useRouter()

  return (
    <AppShell showNav={false} showBack onBack={() => router.back()}>
      <StepHeader 
        step={4} 
        totalSteps={7}
        title="Drone Ayarları" 
        description="Kamera hareketlerini seçin"
      />

      <ProgressBar current={4} total={7} className="mb-6" />

      <DroneModeCard onNext={(settings) => {
        sessionStorage.setItem('droneSettings', JSON.stringify(settings))
        router.push('/projects/new/video-settings')
      }} />
    </AppShell>
  )
}