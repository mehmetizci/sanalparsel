'use client'

import { useRouter } from 'next/navigation'
import { AppShell, StepHeader, ProgressBar } from '@/components/layout'
import { NarrationEditor } from '@/components/mobile'

export default function NarrationPage() {
  const router = useRouter()

  return (
    <AppShell showNav={false} showBack onBack={() => router.back()}>
      <StepHeader 
        step={7} 
        totalSteps={7}
        title="AI Seslendirme" 
        description="Ses ve metin ayarlarını yapın"
      />

      <ProgressBar current={7} total={7} className="mb-6" />

      <NarrationEditor onNext={(settings) => {
        sessionStorage.setItem('narrationSettings', JSON.stringify(settings))
        router.push('/projects/new/video-preview')
      }} />
    </AppShell>
  )
}