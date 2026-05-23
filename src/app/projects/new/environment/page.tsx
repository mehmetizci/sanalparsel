'use client'

import { useRouter } from 'next/navigation'
import { AppShell, StepHeader, ProgressBar } from '@/components/layout'
import { PoiSelectionCard } from '@/components/mobile'

export default function EnvironmentPage() {
  const router = useRouter()

  return (
    <AppShell showNav={false} showBack onBack={() => router.back()}>
      <StepHeader 
        step={6} 
        totalSteps={7}
        title="Çevre Bilgileri" 
        description="Yakın yerleri seçin"
      />

      <ProgressBar current={6} total={7} className="mb-6" />

      <PoiSelectionCard onNext={(places) => {
        sessionStorage.setItem('poiPlaces', JSON.stringify(places))
        router.push('/projects/new/narration')
      }} />
    </AppShell>
  )
}