'use client'

import { useRouter } from 'next/navigation'
import { AppShell, StepHeader, ProgressBar } from '@/components/layout'
import { VideoSettingToggle } from '@/components/mobile'

export default function VideoSettingsPage() {
  const router = useRouter()

  return (
    <AppShell showNav={false} showBack onBack={() => router.back()}>
      <StepHeader 
        step={5} 
        totalSteps={7}
        title="Video Ayarları" 
        description="Format ve bindirmeleri seçin"
      />

      <ProgressBar current={5} total={7} className="mb-6" />

      <VideoSettingToggle onNext={(settings) => {
        sessionStorage.setItem('videoSettings', JSON.stringify(settings))
        router.push('/projects/new/environment')
      }} />
    </AppShell>
  )
}