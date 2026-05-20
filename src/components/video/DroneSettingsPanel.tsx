'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface DroneSettings {
  duration: 30 | 45 | 60;
  altitude: 100 | 200 | 300 | 500;
  resolution: { width: number; height: number; label: string };
  cameraAngles: string[];
}

const presets = {
  fast: { duration: 30, altitude: 200, label: 'Hızlı (30 sn)' },
  standard: { duration: 45, altitude: 300, label: 'Standart (45 sn)' },
  cinema: { duration: 60, altitude: 500, label: 'Sinematik (60 sn)' },
};

const cameraAngles = [
  { id: 'orbit', name: 'Orbit', desc: '360° dönüş' },
  { id: 'topdown', name: 'Tepe', desc: 'Dikey görünüm' },
  { id: 'flyover', name: 'Uçuş', desc: 'Alçak geçiş' },
  { id: 'corner', name: 'Köşe', desc: '4 köşe' },
];

export function DroneSettingsPanel() {
  const [settings, setSettings] = useState<DroneSettings>({
    duration: 30,
    altitude: 200,
    resolution: { width: 1080, height: 1920, label: 'HD (1080x1920)' },
    cameraAngles: ['orbit', 'topdown', 'flyover'],
  });

  const toggleAngle = (angleId: string) => {
    setSettings((prev) => ({
      ...prev,
      cameraAngles: prev.cameraAngles.includes(angleId)
        ? prev.cameraAngles.filter((a) => a !== angleId)
        : [...prev.cameraAngles, angleId],
    }));
  };

  const setPreset = (preset: keyof typeof presets) => {
    const p = presets[preset];
    setSettings((prev) => ({
      ...prev,
      duration: p.duration as 30 | 45 | 60,
      altitude: p.altitude as 100 | 200 | 300 | 500,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <label className="block text-sm font-medium text-muted mb-3">Hazır Ayarlar</label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(presets) as [keyof typeof presets, typeof presets.fast][]).map(
            ([key, preset]) => (
              <button
                key={key}
                onClick={() => setPreset(key as keyof typeof presets)}
                className={`p-3 rounded-xl border transition-all ${
                  settings.duration === preset.duration
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-border hover:border-muted'
                }`}
              >
                <p className="text-sm font-medium">{preset.label}</p>
              </button>
            )
          )}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-muted mb-3">Video Süresi</label>
        <div className="flex gap-2">
          {([30, 45, 60] as const).map((d) => (
            <button
              key={d}
              onClick={() => setSettings((prev) => ({ ...prev, duration: d }))}
              className={`flex-1 p-3 rounded-xl border transition-all ${
                settings.duration === d
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-border hover:border-muted'
              }`}
            >
              <p className="text-lg font-bold">{d}</p>
              <p className="text-xs text-muted">saniye</p>
            </button>
          ))}
        </div>
      </div>

      {/* Altitude */}
      <div>
        <label className="block text-sm font-medium text-muted mb-3">Drone Yüksekliği</label>
        <div className="flex gap-2">
          {([100, 200, 300, 500] as const).map((a) => (
            <button
              key={a}
              onClick={() => setSettings((prev) => ({ ...prev, altitude: a }))}
              className={`flex-1 p-3 rounded-xl border transition-all ${
                settings.altitude === a
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-border hover:border-muted'
              }`}
            >
              <p className="text-lg font-bold">{a}</p>
              <p className="text-xs text-muted">metre</p>
            </button>
          ))}
        </div>
      </div>

      {/* Camera Angles */}
      <div>
        <label className="block text-sm font-medium text-muted mb-3">Kamera Açıları</label>
        <div className="grid grid-cols-2 gap-3">
          {cameraAngles.map((angle) => (
            <button
              key={angle.id}
              onClick={() => toggleAngle(angle.id)}
              className={`p-3 rounded-xl border transition-all text-left ${
                settings.cameraAngles.includes(angle.id)
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-border hover:border-muted'
              }`}
            >
              <p className="font-medium">{angle.name}</p>
              <p className="text-xs text-muted">{angle.desc}</p>
              {settings.cameraAngles.includes(angle.id) && (
                <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Resolution */}
      <Card className="bg-card-hover">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Çözünürlük</p>
            <p className="text-sm text-muted">
              {settings.resolution.width}x{settings.resolution.height} px ({settings.resolution.label})
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-red-500">{settings.duration}s</p>
            <p className="text-xs text-muted">Video süresi</p>
          </div>
        </div>
      </Card>
    </div>
  );
}