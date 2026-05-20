'use client';

import { motion } from 'framer-motion';
import { User, Phone, Building2, Award, MapPin } from 'lucide-react';
import type { ConsultantProfile, VideoBrandingOptions } from '@/types';

interface ConsultantOverlayProps {
  profile: Partial<ConsultantProfile>;
  brandingOptions?: VideoBrandingOptions;
  animated?: boolean;
}

export function ConsultantOverlay({
  profile,
  brandingOptions,
  animated = true,
}: ConsultantOverlayProps) {
  const defaultBranding: VideoBrandingOptions = {
    showProfilePhoto: true,
    showFullName: true,
    showPhoneNumber: true,
    showCompanyName: false,
    showOfficeAddress: false,
    showAuthorizationCertificate: false,
    showLogo: false,
  };

  const options = brandingOptions || defaultBranding;

  if (!options.showFullName && !profile.fullName) return null;

  const containerVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: 'easeOut' as const }
    }
  };

  return (
    <motion.div
      className={`glass-strong rounded-2xl p-4 max-w-sm ${
        animated ? 'animate-slide-in-left' : ''
      }`}
      variants={animated ? containerVariants : undefined}
      initial={animated ? 'hidden' : undefined}
      animate={animated ? 'visible' : undefined}
    >
      <div className="flex items-center gap-3">
        {options.showProfilePhoto && profile.profilePhotoUrl ? (
          <img
            src={profile.profilePhotoUrl}
            alt={profile.fullName}
            className="w-12 h-12 rounded-full object-cover border-2 border-red-500/30"
          />
        ) : options.showProfilePhoto ? (
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <User className="w-6 h-6 text-red-500" />
          </div>
        ) : null}
        <div className="flex-1 min-w-0">
          {options.showFullName && (
            <p className="text-sm font-bold text-white truncate">{profile.fullName}</p>
          )}
          {options.showCompanyName && profile.officeName && (
            <p className="text-xs text-muted flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 shrink-0" />
              {profile.officeName}
            </p>
          )}
        </div>
        {options.showLogo && profile.companyLogoUrl && (
          <img
            src={profile.companyLogoUrl}
            alt="Logo"
            className="w-10 h-10 rounded-lg object-contain"
          />
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
        {options.showPhoneNumber && profile.phone && (
          <p className="text-xs text-white/80 flex items-center gap-2">
            <Phone className="w-3 h-3 text-red-500" />
            {profile.phone}
          </p>
        )}
        {options.showOfficeAddress && profile.officeAddress && (
          <p className="text-xs text-white/60 flex items-center gap-2">
            <MapPin className="w-3 h-3 text-red-500" />
            {profile.officeAddress}
          </p>
        )}
        {options.showAuthorizationCertificate && profile.certificateNumber && (
          <p className="text-xs text-white/60 flex items-center gap-2">
            <Award className="w-3 h-3 text-red-500" />
            Yetki No: {profile.certificateNumber}
          </p>
        )}
      </div>
    </motion.div>
  );
}
