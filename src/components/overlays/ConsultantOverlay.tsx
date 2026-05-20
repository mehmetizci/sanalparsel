'use client';

import { Card } from '@/components/ui/Card';
import { User, Phone, Building2, MapPin, Award } from 'lucide-react';

interface ConsultantOverlayProps {
  profile: {
    fullName?: string;
    phone?: string;
    companyName?: string;
    officeAddress?: string;
    certificateNumber?: string;
    profilePhotoUrl?: string;
    companyLogoUrl?: string;
  };
  branding: {
    showProfilePhoto: boolean;
    showFullName: boolean;
    showPhoneNumber: boolean;
    showCompanyName: boolean;
    showOfficeAddress: boolean;
    showAuthorizationCertificate: boolean;
    showLogo: boolean;
  };
}

export function ConsultantOverlay({ profile, branding }: ConsultantOverlayProps) {
  const showFullName = branding.showFullName && profile.fullName;
  const showPhone = branding.showPhoneNumber && profile.phone;
  const showCompany = branding.showCompanyName && profile.companyName;
  const showAddress = branding.showOfficeAddress && profile.officeAddress;
  const showCert = branding.showAuthorizationCertificate && profile.certificateNumber;
  const showPhoto = branding.showProfilePhoto && profile.profilePhotoUrl;
  const showLogo = branding.showLogo && profile.companyLogoUrl;

  if (!showFullName && !showPhone && !showCompany && !showAddress && !showCert && !showPhoto && !showLogo) {
    return null;
  }

  return (
    <Card className="glass-strong p-4 max-w-sm">
      <div className="flex items-center gap-4">
        {(showPhoto || showLogo) && (
          <div className="flex-shrink-0">
            {showPhoto && (
              <img
                src={profile.profilePhotoUrl}
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            {showLogo && !showPhoto && (
              <img
                src={profile.companyLogoUrl}
                alt="Logo"
                className="w-12 h-12 object-contain rounded-lg bg-white"
              />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          {showFullName && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-red-500" />
              <p className="font-medium text-sm truncate">{profile.fullName}</p>
            </div>
          )}

          {showPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted" />
              <p className="text-sm text-muted">{profile.phone}</p>
            </div>
          )}

          {showCompany && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted" />
              <p className="text-sm text-muted truncate">{profile.companyName}</p>
            </div>
          )}

          {showAddress && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted" />
              <p className="text-sm text-muted truncate">{profile.officeAddress}</p>
            </div>
          )}

          {showCert && (
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-muted" />
              <p className="text-sm text-muted">Yetki: {profile.certificateNumber}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}