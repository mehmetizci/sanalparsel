'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { defaultBrandingOptions, type VideoBrandingOptions } from '@/types';
import { User, Phone, Building2, MapPin, Award, Image } from 'lucide-react';

const brandingOptions: { key: keyof VideoBrandingOptions; label: string; icon: React.ElementType; default: boolean }[] = [
  { key: 'showProfilePhoto', label: 'Profil Fotoğrafı', icon: User, default: true },
  { key: 'showFullName', label: 'Ad Soyad', icon: User, default: true },
  { key: 'showPhoneNumber', label: 'Telefon Numarası', icon: Phone, default: true },
  { key: 'showCompanyName', label: 'Şirket Adı', icon: Building2, default: false },
  { key: 'showOfficeAddress', label: 'Ofis Adresi', icon: MapPin, default: false },
  { key: 'showAuthorizationCertificate', label: 'Yetki Belgesi', icon: Award, default: false },
  { key: 'showLogo', label: 'Logo', icon: Image, default: false },
];

export function BrandingTogglePanel() {
  const [options, setOptions] = useState<VideoBrandingOptions>(defaultBrandingOptions);

  const toggle = (key: keyof VideoBrandingOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const countOn = Object.values(options).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {brandingOptions.map((option) => {
          const Icon = option.icon;
          const isOn = options[option.key];
          const isDefault = option.default;

          return (
            <button
              key={option.key}
              onClick={() => toggle(option.key)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isOn
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-border hover:border-muted'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isOn ? 'bg-red-500 text-white' : 'bg-card text-muted'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{option.label}</p>
                {isDefault && isOn && (
                  <p className="text-xs text-green-500">Varsayılan açık</p>
                )}
              </div>
              <div className={`ml-auto w-10 h-6 rounded-full transition-colors ${
                isOn ? 'bg-red-500' : 'bg-card'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white m-1 transition-transform ${
                  isOn ? 'translate-x-4' : ''
                }`} />
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-muted text-center">
        {countOn} seçenek seçildi
      </p>

      <Card className="bg-card-hover">
        <h4 className="font-medium mb-3">Önizleme</h4>
        <div className="aspect-[9/16] max-w-[200px] mx-auto rounded-xl bg-background border border-border p-4">
          <div className="space-y-2">
            {options.showProfilePhoto && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-500/20" />
                <div className="flex-1">
                  {options.showFullName && (
                    <div className="h-3 w-20 bg-card rounded" />
                  )}
                </div>
              </div>
            )}
            {options.showCompanyName && (
              <div className="h-3 w-24 bg-card rounded" />
            )}
            {options.showPhoneNumber && (
              <div className="h-2 w-16 bg-card rounded" />
            )}
            {options.showOfficeAddress && (
              <div className="h-2 w-28 bg-card rounded" />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}