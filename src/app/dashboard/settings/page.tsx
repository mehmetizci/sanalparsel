'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { User, Building2, CreditCard, Save } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    fullName: '',
    phone: '',
    officeName: '',
    officeAddress: '',
    certificateNumber: '',
    profilePhotoUrl: '',
    companyLogoUrl: '',
  });

  const handleSave = () => {
    // Save to Supabase when connected
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Hesap Ayarları</h1>
        <p className="text-sm text-muted mt-1">
          Profil ve danışman bilgilerinizi yönetin.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Kişisel Bilgiler</h2>
          </div>
          <div className="space-y-4">
            <Input
              label="Ad Soyad"
              value={profile.fullName}
              onChange={(e) =>
                setProfile({ ...profile, fullName: e.target.value })
              }
              placeholder="Mehmet Yılmaz"
            />
            <Input
              label="Telefon"
              value={profile.phone}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
              placeholder="+90 532 123 4567"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Profil Fotoğrafı URL"
                value={profile.profilePhotoUrl}
                onChange={(e) =>
                  setProfile({ ...profile, profilePhotoUrl: e.target.value })
                }
                placeholder="https://..."
              />
              <Input
                label="Şirket Logosu URL"
                value={profile.companyLogoUrl}
                onChange={(e) =>
                  setProfile({ ...profile, companyLogoUrl: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Ofis Bilgileri</h2>
          </div>
          <div className="space-y-4">
            <Input
              label="Gayrimenkul Ofisi Adı"
              value={profile.officeName}
              onChange={(e) =>
                setProfile({ ...profile, officeName: e.target.value })
              }
              placeholder="ABC Gayrimenkul"
            />
            <Input
              label="Ofis Adresi"
              value={profile.officeAddress}
              onChange={(e) =>
                setProfile({ ...profile, officeAddress: e.target.value })
              }
              placeholder="İstanbul, Beşiktaş"
            />
            <Input
              label="Yetki Belgesi No"
              value={profile.certificateNumber}
              onChange={(e) =>
                setProfile({ ...profile, certificateNumber: e.target.value })
              }
              placeholder="12345678"
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Abonelik</h2>
          </div>
          <div className="flex items-center justify-between p-4 bg-card-hover rounded-xl">
            <div>
              <p className="font-medium">Ücretsiz Plan</p>
              <p className="text-sm text-muted">10 kredi / ay</p>
            </div>
            <Button variant="secondary" size="sm">
              Planı Yükselt
            </Button>
          </div>
        </Card>

        <Button onClick={handleSave} size="lg" className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Değişiklikleri Kaydet
        </Button>
      </div>
    </div>
  );
}
