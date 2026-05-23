'use client'

import { useState } from 'react'
import GlassCard from './GlassCard'
import PrimaryButton from './PrimaryButton'

const VOICE_OPTIONS = [
  { id: 'female', label: 'Kadın', description: 'Sıcak ve profesyonel' },
  { id: 'male', label: 'Erkek', description: 'Güvenilir ve net' },
  { id: 'corporate', label: 'Kurumsal', description: 'Profesyonel ve ciddi' },
]

interface NarrationEditorProps {
  initialText?: string
  onNext: (settings: { voice: string; text: string }) => void
}

export default function NarrationEditor({ initialText = '', onNext }: NarrationEditorProps) {
  const [voice, setVoice] = useState('female')
  const [text, setText] = useState(initialText)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleNext = () => {
    onNext({ voice, text })
  }

  const handlePreview = () => {
    setIsPlaying(true)
    setTimeout(() => setIsPlaying(false), 2000)
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Voice selection */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-3">Ses Tipi</h3>
        <div className="space-y-2">
          {VOICE_OPTIONS.map(v => (
            <button
              key={v.id}
              onClick={() => setVoice(v.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                voice === v.id
                  ? 'bg-[#2563EB]/20 border border-[#2563EB]'
                  : 'bg-white/5 border border-transparent'
              }`}
            >
              <div className="text-left">
                <span className={voice === v.id ? 'text-white' : 'text-gray-300'}>
                  {v.label}
                </span>
                <p className="text-gray-500 text-sm">{v.description}</p>
              </div>
              {voice === v.id && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563EB" stroke="none">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Text editor */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-3">Tanıtım Metni</h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Parselinizi tanıtacak metni buraya yazın..."
          className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[#2563EB]"
        />
      </GlassCard>

      {/* Preview button */}
      <button 
        onClick={handlePreview}
        className="w-full flex items-center justify-center gap-2 py-4 bg-white/10 rounded-2xl text-white font-medium hover:bg-white/20 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
        {isPlaying ? 'Ses Oynatılıyor...' : 'Ses Önizleme'}
      </button>

      {/* Fixed CTA */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-[#07182F]/95 backdrop-blur-md">
        <div className="max-w-lg mx-auto">
          <PrimaryButton onClick={handleNext}>
            Video Önizlemeye Geç →
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}