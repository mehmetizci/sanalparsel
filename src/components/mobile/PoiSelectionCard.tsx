'use client'

import { useState } from 'react'
import GlassCard from './GlassCard'
import PrimaryButton from './PrimaryButton'

interface Place {
  id: string
  name: string
  distance: number
  selected: boolean
}

interface PoiSelectionCardProps {
  onNext: (places: Place[]) => void
  places?: Place[]
}

const DEFAULT_PLACES: Place[] = [
  { id: '1', name: 'Hastane', distance: 110, selected: true },
  { id: '2', name: 'Migros', distance: 121, selected: true },
  { id: '3', name: 'Eczane', distance: 151, selected: true },
  { id: '4', name: 'Kapalı Pazar', distance: 258, selected: true },
]

export default function PoiSelectionCard({ onNext, places = DEFAULT_PLACES }: PoiSelectionCardProps) {
  const [localPlaces, setLocalPlaces] = useState(places)

  const togglePlace = (id: string) => {
    setLocalPlaces(prev =>
      prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p)
    )
  }

  const handleNext = () => {
    onNext(localPlaces.filter(p => p.selected))
  }

  return (
    <div className="space-y-6 pb-24">
      {/* POI List */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-3">Yakın Çevre</h3>
        <div className="space-y-2">
          {localPlaces.map(place => (
            <button
              key={place.id}
              onClick={() => togglePlace(place.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                place.selected
                  ? 'bg-[#22C55E]/20 border border-[#22C55E]'
                  : 'bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill={place.selected ? '#22C55E' : 'none'} stroke={place.selected ? '#22C55E' : '#64748b'} strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className={place.selected ? 'text-white' : 'text-gray-400'}>
                  {place.name}
                </span>
              </div>
              <span className="text-gray-500 text-sm">{place.distance}m</span>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Manual add */}
      <button className="w-full py-3 text-[#2563EB] font-medium bg-[#2563EB]/10 rounded-xl">
        + Manuel Ekle
      </button>

      {/* AI generate */}
      <button className="w-full py-3 text-[#7C3AED] font-medium bg-[#7C3AED]/10 rounded-xl">
        ✨ AI Metin Oluştur
      </button>

      {/* Fixed CTA */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-[#07182F]/95 backdrop-blur-md">
        <div className="max-w-lg mx-auto">
          <PrimaryButton onClick={handleNext}>
            Seslendirmeye Geç →
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}