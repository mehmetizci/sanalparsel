'use client'

import { useState } from 'react'
import GlassCard from './GlassCard'
import PrimaryButton from './PrimaryButton'

const FORMAT_OPTIONS = [
  { id: 'reels', label: 'Reels', size: '1080x1920' },
  { id: 'landscape', label: 'Yatay', size: '1920x1080' },
]

const BRAND_OPTIONS = [
  { id: 'logo', label: 'Logo', enabled: true },
  { id: 'name', label: 'Danışman Adı', enabled: true },
  { id: 'phone', label: 'Telefon', enabled: true },
  { id: 'parcel', label: 'Ada/Parsel', enabled: true },
  { id: 'nearby', label: 'Yakın Çevre', enabled: true },
  { id: 'subtitle', label: 'Altyazı', enabled: true },
]

interface VideoSettingToggleProps {
  onNext: (settings: { format: string; branding: string[] }) => void
}

export default function VideoSettingToggle({ onNext }: VideoSettingToggleProps) {
  const [format, setFormat] = useState('reels')
  const [branding, setBranding] = useState<string[]>(BRAND_OPTIONS.filter(o => o.enabled).map(o => o.id))

  const toggleBranding = (id: string) => {
    setBranding(prev =>
      prev.includes(id)
        ? prev.filter(b => b !== id)
        : [...prev, id]
    )
  }

  const handleNext = () => {
    onNext({ format, branding })
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Format */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-3">Format</h3>
        <div className="space-y-2">
          {FORMAT_OPTIONS.map(f => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                format === f.id
                  ? 'bg-[#2563EB]/20 border border-[#2563EB]'
                  : 'bg-white/5 border border-transparent'
              }`}
            >
              <div>
                <span className={format === f.id ? 'text-white' : 'text-gray-300'}>
                  {f.label}
                </span>
                <span className="text-gray-500 text-sm ml-2">{f.size}</span>
              </div>
              {format === f.id && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563EB" stroke="none">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Branding options */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-3">Video Bindirmeleri</h3>
        <div className="space-y-2">
          {BRAND_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => toggleBranding(opt.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                branding.includes(opt.id)
                  ? 'bg-[#7C3AED]/20 border border-[#7C3AED]'
                  : 'bg-white/5 border border-transparent'
              }`}
            >
              <span className={branding.includes(opt.id) ? 'text-white' : 'text-gray-400'}>
                {opt.label}
              </span>
              {branding.includes(opt.id) ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#7C3AED" stroke="none">
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Fixed CTA */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-[#07182F]/95 backdrop-blur-md">
        <div className="max-w-lg mx-auto">
          <PrimaryButton onClick={handleNext}>
            Çevre Bilgilerine Geç →
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}