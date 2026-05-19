'use client';

import { useState, useCallback } from 'react';
import type { FeatureCollection } from 'geojson';
import type { ConsultantProfile, DroneSettings, NearbyPlace } from '@/types';
import { ParcelUpload } from '@/components/map/ParcelUpload';
import { MapView } from '@/components/map/MapView';
import { DroneSettingsPanel } from '@/components/video/DroneSettingsPanel';
import { ConsultantForm } from '@/components/video/ConsultantForm';
import { NarrationPanel } from '@/components/video/NarrationPanel';
import { VideoPreview } from '@/components/video/VideoPreview';
import { RenderPanel } from '@/components/video/RenderPanel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Settings,
  User,
  Mic,
  Eye,
  Film,
} from 'lucide-react';

const defaultDroneSettings: DroneSettings = {
  altitude: 200,
  duration: 45,
  resolution: { width: 1080, height: 1920, label: 'Dikey (9:16)', aspectRatio: '9:16' },
  cameraAngles: [
    { name: 'Kuzeydoğu', heading: 45, pitch: -30, altitude: 200, duration: 10 },
    { name: 'Güneybatı', heading: 225, pitch: -30, altitude: 200, duration: 10 },
    { name: 'Kuşbakışı', heading: 0, pitch: -90, altitude: 300, duration: 10 },
    { name: 'Alçak Uçuş', heading: 90, pitch: -15, altitude: 100, duration: 10 },
  ],
};

const defaultNearbyPlaces: NearbyPlace[] = [
  { name: 'Hastane', type: 'hospital', distance: 2, unit: 'km', icon: '🏥' },
  { name: 'Okul', type: 'school', distance: 1.5, unit: 'km', icon: '🏫' },
  { name: 'Market', type: 'supermarket', distance: 800, unit: 'm', icon: '🛒' },
  { name: 'Sahil', type: 'beach', distance: 5, unit: 'km', icon: '🏖️' },
  { name: 'Şehir Merkezi', type: 'city_center', distance: 3, unit: 'km', icon: '🏙️' },
];

const steps = [
  { icon: <MapPin className="w-4 h-4" />, label: 'Parsel' },
  { icon: <Settings className="w-4 h-4" />, label: 'Drone' },
  { icon: <User className="w-4 h-4" />, label: 'Danışman' },
  { icon: <Mic className="w-4 h-4" />, label: 'Seslendirme' },
  { icon: <Eye className="w-4 h-4" />, label: 'Önizleme' },
  { icon: <Film className="w-4 h-4" />, label: 'Oluştur' },
];

export default function NewProjectPage() {
  const [step, setStep] = useState(0);
  const [parcelGeoJSON, setParcelGeoJSON] = useState<FeatureCollection | null>(null);
  const [parcelCenter, setParcelCenter] = useState<[number, number] | null>(null);
  const [parcelName, setParcelName] = useState('');
  const [parcelArea, setParcelArea] = useState(0);
  const [droneSettings, setDroneSettings] = useState<DroneSettings>(defaultDroneSettings);
  const [consultantProfile, setConsultantProfile] = useState<Partial<ConsultantProfile>>({});
  const [customDescription, setCustomDescription] = useState('');
  const [narrationText, setNarrationText] = useState('');
  const [nearbyPlaces] = useState<NearbyPlace[]>(defaultNearbyPlaces);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleParcelLoaded = useCallback(
    (geojson: FeatureCollection, center: [number, number], area: number) => {
      setParcelGeoJSON(geojson);
      setParcelCenter(center);
      setParcelArea(area);
    },
    []
  );

  const handleRender = async () => {
    if (!parcelGeoJSON || !parcelCenter) {
      alert('Lütfen önce parsel yükleyin');
      return;
    }

    setIsRendering(true);
    setRenderProgress(0);
    setVideoUrl(null);

    try {
      // Call Railway backend
      const response = await fetch('https://sanalparsel-backend-production.up.railway.app/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: [`https://tile.googleapis.com/v1/ortho?projectId=${parcelCenter[1]},${parcelCenter[0]},16`],
          geoJson: parcelGeoJSON,
          titleText: consultantProfile.companyName || 'SanalParsel',
          duration: droneSettings.duration,
          width: droneSettings.resolution.width,
          height: droneSettings.resolution.height,
        }),
      });

      if (!response.ok) {
        throw new Error('Render failed');
      }

      const result = await response.json();
      const jobId = result.jobId;

      // Poll for status
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(`https://sanalparsel-backend-production.up.railway.app/render/${jobId}`);
        const status = await statusResponse.json();

        setRenderProgress(status.progress);

        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setVideoUrl(`https://sanalparsel-backend-production.up.railway.app${status.videoUrl}`);
          setIsRendering(false);
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setIsRendering(false);
          alert('Video oluşturma hatası: ' + status.error);
        }
      }, 2000);
    } catch (error) {
      console.error('Render error:', error);
      setIsRendering(false);
      alert('Video oluşturma sırasında hata oluştu');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!parcelGeoJSON;
      case 1:
        return true;
      case 2:
        return !!consultantProfile.fullName;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <button
                onClick={() => i <= step && setStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  i === step
                    ? 'bg-primary text-white'
                    : i < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-card text-muted'
                }`}
              >
                {s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-px mx-1 ${
                    i < step ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left panel - Form */}
        <div>
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-2">Parsel Yükleme</h2>
                <p className="text-sm text-muted">
                  GeoJSON, KML dosyası yükleyin veya koordinatları manuel girin.
                </p>
              </div>

              <Input
                label="Parsel Adı"
                value={parcelName}
                onChange={(e) => setParcelName(e.target.value)}
                placeholder="İzmir Urla - Deniz Manzaralı Arsa"
              />

              <ParcelUpload onParcelLoaded={handleParcelLoaded} />

              {parcelGeoJSON && (
                <Card className="bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">Parsel yüklendi</span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Alan: ~{Math.round(parcelArea)} m² | Merkez: {parcelCenter?.[1].toFixed(4)}, {parcelCenter?.[0].toFixed(4)}
                  </p>
                </Card>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-2">Drone Ayarları</h2>
                <p className="text-sm text-muted">
                  İrtifa ve video süresini seçin.
                </p>
              </div>
              <DroneSettingsPanel
                settings={droneSettings}
                onChange={(s) => setDroneSettings((prev) => ({ ...prev, ...s }))}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-2">Danışman Bilgileri</h2>
                <p className="text-sm text-muted">
                  Video üzerinde görünecek danışman bilgilerini girin.
                </p>
              </div>
              <ConsultantForm
                profile={consultantProfile}
                onChange={(p) =>
                  setConsultantProfile((prev) => ({ ...prev, ...p }))
                }
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-2">Seslendirme</h2>
                <p className="text-sm text-muted">
                  Özel açıklama girin veya AI&apos;ın otomatik oluşturmasına izin verin.
                </p>
              </div>
              <NarrationPanel
                customDescription={customDescription}
                onCustomDescriptionChange={setCustomDescription}
                narrationText={narrationText}
                onNarrationGenerated={setNarrationText}
                parcelName={parcelName}
                nearbyPlaces={nearbyPlaces}
              />
            </div>
          )}

          {step === 4 && parcelGeoJSON && parcelCenter && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-2">Video Önizleme</h2>
                <p className="text-sm text-muted">
                  Drone animasyonunu önizleyin. Play butonuna basarak izleyin.
                </p>
              </div>
              <VideoPreview
                geojson={parcelGeoJSON}
                center={parcelCenter}
                droneSettings={droneSettings}
                consultantProfile={consultantProfile}
                nearbyPlaces={nearbyPlaces}
                parcelName={parcelName}
              />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-2">Video Oluştur</h2>
                <p className="text-sm text-muted">
                  Profesyonel drone videonuzu oluşturun ve indirin.
                </p>
              </div>
              <RenderPanel
                onRender={handleRender}
                isRendering={isRendering}
                renderProgress={renderProgress}
                videoUrl={videoUrl}
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Geri
            </Button>
            {step < steps.length - 1 && (
              <Button
                onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
                disabled={!canProceed()}
              >
                İleri
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Right panel - Map preview */}
        <div className="hidden lg:block">
          <Card className="sticky top-24 h-[calc(100vh-8rem)] p-0 overflow-hidden">
            <MapView
              geojson={parcelGeoJSON}
              center={parcelCenter}
              zoom={14}
              className="h-full"
            />
            {!parcelGeoJSON && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/80">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-muted/30 mx-auto mb-3" />
                  <p className="text-sm text-muted">
                    Parsel verisi yüklendiğinde harita burada görünecek
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
