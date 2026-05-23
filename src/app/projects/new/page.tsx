'use client'

import { useRouter } from 'next/navigation'
import { AppShell, StepHeader, ProgressBar } from '@/components/layout'
import { UploadCard } from '@/components/mobile'
import { parseParcelGeoJson } from '@/lib/geojson'
import { useState } from 'react'

export default function NewProjectPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async (uploadedFile: File) => {
    setFile(uploadedFile)
  }

  const handleReadParcel = async () => {
    if (!file) return
    
    setLoading(true)
    try {
      const text = await file.text()
      const geojson = JSON.parse(text)
      const parcelData = parseParcelGeoJson(geojson)
      
      // Store in session storage for next page
      sessionStorage.setItem('parcelData', JSON.stringify(parcelData))
      router.push('/projects/new/parcel-info')
    } catch (error) {
      console.error('Error parsing GeoJSON:', error)
      alert('GeoJSON dosyası okunamadı. Lütfen geçerli bir dosya yükleyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell showNav={false} showBack onBack={() => router.back()}>
      <StepHeader 
        step={1} 
        totalSteps={7}
        title="GeoJSON Yükle" 
        description="Parsel dosyanı seç"
      />

      <ProgressBar current={1} total={7} className="mb-6" />

      <UploadCard 
        onUpload={handleUpload}
        accept={{ 'application/json': ['.json', '.geojson'] }}
      />

      {file && (
        <div className="mt-4 p-4 bg-[#22C55E]/10 rounded-xl border border-[#22C55E]/30">
          <p className="text-green-400 font-medium">✓ {file.name}</p>
          <p className="text-gray-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      )}

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-[#07182F]/95 backdrop-blur-md">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleReadParcel}
            disabled={!file || loading}
            className="w-full py-4 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] rounded-2xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Okunuyor...' : 'Parseli Oku →'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}