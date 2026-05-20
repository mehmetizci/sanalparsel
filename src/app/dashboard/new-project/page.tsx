'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { MapView } from '@/components/map/MapView';
import { BrandingTogglePanel } from '@/components/video/BrandingTogglePanel';
import { DroneSettingsPanel } from '@/components/video/DroneSettingsPanel';
import { NarrationPanel } from '@/components/video/NarrationPanel';
import { RenderPanel } from '@/components/video/RenderPanel';
import { Upload, MapPin, Settings, Mic, Play, ArrowLeft, ArrowRight } from 'lucide-react';

type Step = 'upload' | 'map' | 'branding' | 'drone' | 'narration' | 'render';

const steps: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'upload', label: 'Parsel Yükle', icon: Upload },
  { key: 'map', label: 'Harita', icon: MapPin },
  { key: 'branding', label: 'Markalama', icon: Settings },
  { key: 'drone', label: 'Drone', icon: Play },
  { key: 'narration', label: 'Seslendirme', icon: Mic },
  { key: 'render', label: 'Oluştur', icon: Play },
];

export default function NewProjectPage() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [parcelName, setParcelName] = useState('');
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const router = useRouter();

  const stepIndex = steps.findIndex((s) => s.key === currentStep);

  const goNext = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < steps.length) {
      setCurrentStep(steps[nextIdx].key);
    }
  };

  const goBack = () => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) {
      setCurrentStep(steps[prevIdx].key);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === stepIndex;
          const isComplete = idx < stepIndex;

          return (
            <button
              key={step.key}
              onClick={() => idx <= stepIndex && setCurrentStep(step.key)}
              disabled={idx > stepIndex}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-red-500 text-white'
                  : isComplete
                  ? 'bg-card-hover text-green-500'
                  : 'text-muted opacity-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Upload Step */}
          {currentStep === 'upload' && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Parsel Verisi Yükle</h2>
              <p className="text-sm text-muted mb-6">
                Parsel verilerinizi GeoJSON veya KML formatında yükleyin veya koordinat girin.
              </p>

              <div className="space-y-4">
                <Input
                  label="Parsel Adı"
                  value={parcelName}
                  onChange={(e) => setParcelName(e.target.value)}
                  placeholder="Örn: İzmir Urla - Deniz Manzaralı Arsa"
                />

                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Upload className="w-8 h-8 text-muted mx-auto mb-4" />
                  <p className="text-sm mb-2">Dosya yüklemek için tıklayın</p>
                  <p className="text-xs text-muted">GeoJSON, KML desteklenir</p>
                </div>

                <div className="text-center text-sm text-muted">veya</div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Enlem" placeholder="38.4237" />
                  <Input label="Boylam" placeholder="27.1428" />
                </div>
              </div>
            </Card>
          )}

          {/* Map Step */}
          {currentStep === 'map' && (
            <Card className="p-0 overflow-hidden">
              <div className="h-[500px] bg-card">
                <MapView
                  geoJson={geoJson}
                  onParcelSelect={(feature) => console.log(feature)}
                />
              </div>
            </Card>
          )}

          {/* Branding Step */}
          {currentStep === 'branding' && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Video Markalama</h2>
              <p className="text-sm text-muted mb-6">
                Videoda görünecek bilgileri seçin.
              </p>
              <BrandingTogglePanel />
            </Card>
          )}

          {/* Drone Step */}
          {currentStep === 'drone' && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Drone Ayarları</h2>
              <p className="text-sm text-muted mb-6">
                Kamera hareketlerini ve video ayarlarını yapılandırın.
              </p>
              <DroneSettingsPanel />
            </Card>
          )}

          {/* Narration Step */}
          {currentStep === 'narration' && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">AI Seslendirme</h2>
              <p className="text-sm text-muted mb-6">
                Tanıtım metni oluşturun veya kendiniz yazın.
              </p>
              <NarrationPanel parcelName={parcelName} />
            </Card>
          )}

          {/* Render Step */}
          {currentStep === 'render' && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Video Oluştur</h2>
              <p className="text-sm text-muted mb-6">
                Videoyu oluşturmaya hazır mısınız?
              </p>
              <RenderPanel />
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold mb-3">Proje Özeti</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Parsel:</span>
                <span>{parcelName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Format:</span>
                <span>1080x1920 (9:16)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Süre:</span>
                <span>30 saniye</span>
              </div>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={goBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
            <Button onClick={goNext} className="flex-1" disabled={stepIndex === steps.length - 1}>
              İleri
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}