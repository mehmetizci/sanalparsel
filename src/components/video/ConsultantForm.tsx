'use client';

import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { User, Building2, Phone, MapPin, Award, ImageIcon } from 'lucide-react';
import type { ConsultantProfile } from '@/types';

interface ConsultantFormProps {
  profile: Partial<ConsultantProfile>;
  onChange: (profile: Partial<ConsultantProfile>) => void;
}

export function ConsultantForm({ profile, onChange }: ConsultantFormProps) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Danışman Bilgileri</h3>
        </div>
        <div className="space-y-4">
          <Input
            label="Ad Soyad"
            value={profile.fullName || ''}
            onChange={(e) => onChange({ fullName: e.target.value })}
            placeholder="Mehmet Yılmaz"
          />
          <Input
            label="Telefon"
            value={profile.phone || ''}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+90 532 123 4567"
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Ofis Bilgileri</h3>
        </div>
        <div className="space-y-4">
          <Input
            label="Gayrimenkul Ofisi Adı"
            value={profile.officeName || ''}
            onChange={(e) => onChange({ officeName: e.target.value })}
            placeholder="ABC Gayrimenkul"
          />
          <Input
            label="Ofis Adresi"
            value={profile.officeAddress || ''}
            onChange={(e) => onChange({ officeAddress: e.target.value })}
            placeholder="İstanbul, Beşiktaş"
          />
          <Input
            label="Yetki Belgesi No"
            value={profile.certificateNumber || ''}
            onChange={(e) => onChange({ certificateNumber: e.target.value })}
            placeholder="12345678"
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Görseller</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              Profil Fotoğrafı URL
            </label>
            <input
              type="url"
              value={profile.profilePhotoUrl || ''}
              onChange={(e) => onChange({ profilePhotoUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              Şirket Logosu URL
            </label>
            <input
              type="url"
              value={profile.companyLogoUrl || ''}
              onChange={(e) => onChange({ companyLogoUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 text-sm"
            />
          </div>
        </div>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Video Üzerinde Görünecekler</p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: <User className="w-3 h-3" />, label: 'Profil Fotoğrafı' },
                { icon: <Building2 className="w-3 h-3" />, label: 'Şirket Logosu' },
                { icon: <Phone className="w-3 h-3" />, label: 'Telefon' },
                { icon: <MapPin className="w-3 h-3" />, label: 'Ofis Adı' },
                { icon: <Award className="w-3 h-3" />, label: 'Yetki Belgesi' },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                >
                  {item.icon}
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
