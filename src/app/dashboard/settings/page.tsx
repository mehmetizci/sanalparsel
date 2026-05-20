'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import type { ConsultantProfile } from '@/types';
import { User, Phone, Building2, MapPin, Award, Image, Loader2, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState<Partial<ConsultantProfile>>({
    fullName: '',
    phone: '',
    officeName: '',
    officeAddress: '',
    certificateNumber: '',
    companyLogoUrl: '',
    profilePhotoUrl: '',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('consultant_profiles')
        .select('*')
        .eq('userId', user?.id)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase
        .from('consultant_profiles')
        .upsert({
          userId: user?.id,
          ...profile,
          updatedAt: new Date().toISOString(),
        });

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ConsultantProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-sm text-muted mt-1">
          Danışman profilinizi ve hesap ayarlarınızı yönetin.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Photo */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Profil Fotoğrafı</h2>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-card flex items-center justify-center">
                {profile.profilePhotoUrl ? (
                  <img
                    src={profile.profilePhotoUrl}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <User className="w-8 h-8 text-muted" />
                )}
              </div>
              <div className="flex-1">
                <Input
                  label="Fotoğraf URL"
                  value={profile.profilePhotoUrl || ''}
                  onChange={(e) => updateField('profilePhotoUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </Card>

          {/* Personal Info */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Kişisel Bilgiler</h2>
            <div className="space-y-4">
              <Input
                label="Ad Soyad"
                value={profile.fullName || ''}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Ahmet Yılmaz"
              />
              <Input
                label="Telefon"
                value={profile.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+90 532 123 45 67"
              />
            </div>
          </Card>

          {/* Company Info */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Şirket Bilgileri</h2>
            <div className="space-y-4">
              <Input
                label="Şirket Adı"
                value={profile.officeName || ''}
                onChange={(e) => updateField('officeName', e.target.value)}
                placeholder="XYZ Gayrimenkul"
              />
              <Input
                label="Ofis Adresi"
                value={profile.officeAddress || ''}
                onChange={(e) => updateField('officeAddress', e.target.value)}
                placeholder="İstanbul, Türkiye"
              />
              <Input
                label="Yetki Belgesi Numarası"
                value={profile.certificateNumber || ''}
                onChange={(e) => updateField('certificateNumber', e.target.value)}
                placeholder="2024/001"
              />
            </div>
          </Card>

          {/* Logo */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Şirket Logosu</h2>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-card flex items-center justify-center">
                {profile.companyLogoUrl ? (
                  <img
                    src={profile.companyLogoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <Image className="w-8 h-8 text-muted" />
                )}
              </div>
              <div className="flex-1">
                <Input
                  label="Logo URL"
                  value={profile.companyLogoUrl || ''}
                  onChange={(e) => updateField('companyLogoUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <Button onClick={saveProfile} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : saved ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Kaydedildi!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Kaydet
                </>
              )}
            </Button>
          </div>

          {/* Account */}
          <Card className="border-red-500/30">
            <h2 className="text-lg font-semibold mb-4 text-red-500">Hesap</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">E-posta:</span>
                <span>{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Üyelik:</span>
                <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}