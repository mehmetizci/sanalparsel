'use client';

import { User, Phone, Building2, Award } from 'lucide-react';
import type { ConsultantProfile } from '@/types';

interface ConsultantOverlayProps {
  profile: Partial<ConsultantProfile>;
  animated?: boolean;
}

export function ConsultantOverlay({
  profile,
  animated = true,
}: ConsultantOverlayProps) {
  if (!profile.fullName) return null;

  return (
    <div
      className={`glass-strong rounded-2xl p-4 max-w-sm ${
        animated ? 'animate-fade-in' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {profile.profilePhotoUrl ? (
          <img
            src={profile.profilePhotoUrl}
            alt={profile.fullName}
            className="w-12 h-12 rounded-full object-cover border-2 border-primary/30"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{profile.fullName}</p>
          {profile.officeName && (
            <p className="text-xs text-muted flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 shrink-0" />
              {profile.officeName}
            </p>
          )}
        </div>
        {profile.companyLogoUrl && (
          <img
            src={profile.companyLogoUrl}
            alt="Logo"
            className="w-10 h-10 rounded-lg object-contain"
          />
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
        {profile.phone && (
          <p className="text-xs text-white/80 flex items-center gap-2">
            <Phone className="w-3 h-3 text-primary" />
            {profile.phone}
          </p>
        )}
        {profile.certificateNumber && (
          <p className="text-xs text-white/60 flex items-center gap-2">
            <Award className="w-3 h-3 text-primary" />
            Yetki No: {profile.certificateNumber}
          </p>
        )}
      </div>
    </div>
  );
}
