'use client'

import { useState } from 'react'
import GlassCard from './GlassCard'
import PrimaryButton from './PrimaryButton'

const DRONE_OPTIONS = {
  duration: [30, 45, 60],
  height: [100, 200, 300, 400],
  modes: [
    { id: 'orbit', label: 'Orbit 360', enabled: true },
    { id: 'spiral', label: 'Spiral Alçalış', enabled: true },
    { id: 'top', label: 'Tepe Görünüm', enabled: false },
    { id: 'low', label: 'Alçak Geçiş', enabled: false },
    { id: 'corners', label: '4 Köşe', enabled: false },
  ]
}

interface DroneModeCardProps {
  onNext: (settings: { duration: number; height: number; modes: string[] }) => void
}

export default function DroneModeCard({ onNext }: DroneModeCardProps) {
  const [duration, setDuration] = useState(45)
  const [height, setHeight] = useState(200)
  const [modes, setModes] = useState<string[]>(['orbit', 'spiral'])

  const toggleMode = (id: string) => {
    setModes(prev => 
      prev.includes(id) 
        ? prev.filter(m => m !== id)
        : [...prev, id]
    )
  }

  const handleNext = () => {
    onNext({ duration, height, modes })
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Duration */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-3">Süre (saniye)</h3>
        <div className="flex gap-2">
          {DRONE_OPTIONS.duration.map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                duration === d
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Height */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-3">Yükseklik (metre)</h3>
        <div className="grid grid-cols-2 gap-2">
          {DRONE_OPTIONS.height.map(h => (
            <button
              key={h}
              onClick={() => setHeight(h)}
              className={`py-3 rounded-xl font-medium transition-all ${
                height === h
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {h}m
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Camera modes */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-3">Kamera Modları</h3>
        <div className="space-y-2">
          {DRONE_OPTIONS.modes.map(mode => (
            <button
              key={mode.id}
              onClick={() => toggleMode(mode.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                modes.includes(mode.id)
                  ? 'bg-[#2563EB]/20 border border-[#2563EB]'
                  : 'bg-white/5 border border-transparent'
              }`}
            >
              <span className={modes.includes(mode.id) ? 'text-white' : 'text-gray-400'}>
                {mode.label}
              </span>
              {modes.includes(mode.id) ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563EB" stroke="none">
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
            Video Ayarlarına Geç →
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}