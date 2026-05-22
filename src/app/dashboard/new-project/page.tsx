'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import { 
  Camera, Upload, MapPin, ArrowLeft, ArrowRight, 
  FileJson, AlertCircle, CheckCircle2, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import type { GeoJSONData } from '@/types'

type Step = 'upload' | 'preview' | 'settings'

export default function NewProjectPage() {
  const [step, setStep] = useState<Step>('upload')
  const [geojson, setGeojson] = useState<GeoJSONData | null>(null)
  const [parcelName, setParcelName] = useState('')
  const [error, setError] = useState('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setError('')
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        // Validate GeoJSON structure
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
          throw new Error('Geçersiz GeoJSON formatı')
        }
        
        if (data.features.length === 0) {
          throw new Error('GeoJSON dosyasında parsel bulunamadı')
        }

        setGeojson(data)
        setStep('preview')
      } catch (err) {
        setError('GeoJSON dosyası okunamadı. Lütfen geçerli bir dosya yükleyin.')
      }
    }
    
    reader.readAsText(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/geo+json': ['.geojson', '.json'],
      'application/json': ['.json']
    },
    maxFiles: 1
  })

  const steps = [
    { id: 'upload', label: 'Yükleme', icon: Upload },
    { id: 'preview', label: 'Önizleme', icon: MapPin },
    { id: 'settings', label: 'Ayarlar', icon: Camera },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === step)

  const handleContinue = () => {
    if (step === 'preview' && geojson) {
      setStep('settings')
    }
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link 
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Yeni Proje Oluştur</h1>
            <p className="text-sm text-gray-400">Parsel videonuzu oluşturun</p>
          </div>
        </div>
      </header>

      {/* Step indicators */}
      <div className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${
                  i <= currentStepIndex ? 'text-primary' : 'text-gray-500'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    i < currentStepIndex 
                      ? 'bg-primary text-white' 
                      : i === currentStepIndex 
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-dark-700'
                  }`}>
                    {i < currentStepIndex ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <s.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 sm:w-24 h-0.5 mx-4 ${
                    i < currentStepIndex ? 'bg-primary' : 'bg-dark-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Parsel Dosyanızı Yükleyin</h2>
                <p className="text-gray-400">
                  GeoJSON formatında parsel sınırı dosyanızı yükleyin
                </p>
              </div>

              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                  isDragActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                }`}
              >
                <input {...getInputProps()} />
                
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                
                <h3 className="text-lg font-medium mb-2">
                  {isDragActive ? 'Dosyayı bırakın' : 'Dosya yüklemek için tıklayın'}
                </h3>
                
                <p className="text-gray-400 text-sm mb-4">
                  veya dosyayı buraya sürükleyin
                </p>
                
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <FileJson className="w-4 h-4" />
                  <span>GeoJSON dosyası (.geojson, .json)</span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="glass rounded-xl p-4">
                <h4 className="font-medium mb-2">GeoJSON Formatı</h4>
                <p className="text-sm text-gray-400">
                  Dosyanızın FeatureCollection formatında olması gerekir. 
                  Örnek yapı:
                </p>
                <pre className="mt-3 p-3 bg-dark-700 rounded-lg text-xs text-gray-400 overflow-x-auto">
{`{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[lng, lat], ...]]
    }
  }]
}`}
                </pre>
              </div>
            </motion.div>
          )}

          {step === 'preview' && geojson && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Parsel Önizleme</h2>
                <p className="text-gray-400">
                  Yüklenen parselin harita üzerinde görünümü
                </p>
              </div>

              <div className="glass rounded-2xl overflow-hidden aspect-video">
                {/* Simple map preview placeholder */}
                <div className="w-full h-full bg-dark-800 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
                    <p className="text-gray-400">Harita görünümü</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {geojson.features.length} parsel yüklendi
                    </p>
                  </div>
                </div>
              </div>

              <input
                type="text"
                placeholder="Proje adı (örn: İstanbul Başakşehir Villa)"
                value={parcelName}
                onChange={(e) => setParcelName(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep('upload')}>
                  <ArrowLeft className="w-4 h-4" />
                  Geri
                </Button>
                <Button onClick={handleContinue} disabled={!parcelName.trim()}>
                  Devam Et
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Drone Ayarları</h2>
                <p className="text-gray-400">
                  Video drone kamera hareketini özelleştirin
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Altitude */}
                <div className="glass rounded-xl p-6">
                  <h3 className="font-medium mb-4">İrtifa</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[100, 200, 300, 500].map((alt) => (
                      <button
                        key={alt}
                        className="p-4 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all text-center"
                      >
                        <span className="text-2xl font-bold">{alt}</span>
                        <span className="text-sm text-gray-400 block">metre</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="glass rounded-xl p-6">
                  <h3 className="font-medium mb-4">Video Süresi</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[30, 45, 60].map((dur) => (
                      <button
                        key={dur}
                        className="p-4 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all"
                      >
                        <span className="text-2xl font-bold">{dur}</span>
                        <span className="text-sm text-gray-400 block">saniye</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Camera angle */}
                <div className="glass rounded-xl p-6 md:col-span-2">
                  <h3 className="font-medium mb-4">Kamera Açısı</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: 'northeast', label: 'Kuzeydoğu', icon: '↗️' },
                      { id: 'southwest', label: 'Güneybatı', icon: '↙️' },
                      { id: 'topdown', label: 'Kuşbakışı', icon: '⬇️' },
                      { id: 'lowaltitude', label: 'Alçak', icon: '✈️' },
                    ].map((angle) => (
                      <button
                        key={angle.id}
                        className="p-4 rounded-xl border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all"
                      >
                        <span className="text-2xl">{angle.icon}</span>
                        <span className="text-sm text-gray-400 block mt-1">{angle.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep('preview')}>
                  <ArrowLeft className="w-4 h-4" />
                  Geri
                </Button>
                <Link href="/dashboard">
                  <Button>
                    Projeyi Oluştur
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}