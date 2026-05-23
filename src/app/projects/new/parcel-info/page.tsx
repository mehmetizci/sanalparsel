'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell, StepHeader, ProgressBar } from '@/components/layout'
import { ParcelInfoCard } from '@/components/mobile'

export default function ParcelInfoPage() {
  const router = useRouter()
  const [parcelData, setParcelData] = useState<any>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('parcelData')
    if (stored) {
      setParcelData(JSON.parse(stored))
    }
  }, [])

  if (!parcelData) {
    return (
      <AppShell showNav={false} showBack onBack={() => router.back()}>
        <p className="text-gray-400">Parsel bilgisi yükleniyor...</p>
      </AppShell>
    )
  }

  const { projectName, shortProjectName, properties } = parcelData

  return (
    <AppShell showNav={false} showBack onBack={() => router.back()}>
      <StepHeader 
        step={2} 
        totalSteps={7}
        title="Parsel Bilgileri" 
        description="GeoJSON'dan otomatik alındı"
      />

      <ProgressBar current={2} total={7} className="mb-6" />

      <ParcelInfoCard 
        projectName={projectName}
        shortName={shortProjectName}
        properties={properties}
      />

      {/* Optional note */}
      <div className="mt-4">
        <label className="text-sm text-gray-400 mb-2 block">Özel Tanıtım Notu (Opsiyonel)</label>
        <textarea
          className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[#2563EB]"
          placeholder="Parselinizi tanıtacak ek notlar..."
        />
      </div>

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-[#07182F]/95 backdrop-blur-md">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/projects/new/preview')}
            className="w-full py-4 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] rounded-2xl font-semibold text-white"
          >
            Haritada Önizle →
          </button>
        </div>
      </div>
    </AppShell>
  )
}