'use client';

import { Card } from '@/components/ui/Card';
import { DRONE_ALTITUDES, VIDEO_DURATIONS, VIDEO_RESOLUTIONS } from '@/lib/constants';
import { Plane, Clock, Monitor, Mountain } from 'lucide-react';
import type { DroneSettings } from '@/types';

interface DroneSettingsPanelProps {
  settings: DroneSettings;
  onChange: (settings: Partial<DroneSettings>) => void;
}

export function DroneSettingsPanel({
  settings,
  onChange,
}: DroneSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Video Çözünürlüğü</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {VIDEO_RESOLUTIONS.map((res) => (
            <Card
              key={res.aspectRatio}
              hover
              onClick={() => onChange({ resolution: res })}
              className={`text-center py-4 ${
                settings.resolution?.aspectRatio === res.aspectRatio
                  ? 'border-primary bg-primary/10'
                  : ''
              }`}
            >
              <Monitor className="w-5 h-5 mx-auto mb-2 text-primary" />
              <span className="text-lg font-bold">{res.width}x{res.height}</span>
              <p className="text-xs text-muted mt-1">
                {res.label}
              </p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Mountain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Drone İrtifası</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DRONE_ALTITUDES.map((alt) => (
            <Card
              key={alt}
              hover
              onClick={() => onChange({ altitude: alt })}
              className={`text-center py-4 ${
                settings.altitude === alt
                  ? 'border-primary bg-primary/10'
                  : ''
              }`}
            >
              <Plane className="w-5 h-5 mx-auto mb-2 text-primary" />
              <span className="text-lg font-bold">{alt}m</span>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Video Süresi</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {VIDEO_DURATIONS.map((dur) => (
            <Card
              key={dur}
              hover
              onClick={() => onChange({ duration: dur })}
              className={`text-center py-4 ${
                settings.duration === dur
                  ? 'border-primary bg-primary/10'
                  : ''
              }`}
            >
              <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
              <span className="text-lg font-bold">{dur}s</span>
              <p className="text-xs text-muted mt-1">
                {dur === 30 ? 'Kısa' : dur === 45 ? 'Orta' : 'Uzun'}
              </p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Plane className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium">Kamera Hareketleri</p>
            <p className="text-xs text-muted mt-1">
              Video otomatik olarak 4 farklı açıdan çekim içerecektir:
              Kuzeydoğu, Güneybatı, Kuşbakışı ve Alçak İrtifa Uçuşu
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
