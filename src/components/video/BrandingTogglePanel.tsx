'use client';

import { motion } from 'framer-motion';
import { 
  User, 
  Phone, 
  Building2, 
  MapPin, 
  Award, 
  ImageIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { VideoBrandingOptions } from '@/types';
import { defaultBrandingOptions } from '@/types';

interface BrandingTogglePanelProps {
  options: VideoBrandingOptions;
  onChange: (options: VideoBrandingOptions) => void;
}

const BRANDING_ITEMS = [
  {
    key: 'showProfilePhoto' as keyof VideoBrandingOptions,
    label: 'Profil Fotoğrafı',
    icon: User,
    default: true,
  },
  {
    key: 'showFullName' as keyof VideoBrandingOptions,
    label: 'Ad Soyad',
    icon: User,
    default: true,
  },
  {
    key: 'showPhoneNumber' as keyof VideoBrandingOptions,
    label: 'Telefon',
    icon: Phone,
    default: true,
  },
  {
    key: 'showCompanyName' as keyof VideoBrandingOptions,
    label: 'Şirket Adı',
    icon: Building2,
    default: false,
  },
  {
    key: 'showOfficeAddress' as keyof VideoBrandingOptions,
    label: 'Ofis Adresi',
    icon: MapPin,
    default: false,
  },
  {
    key: 'showAuthorizationCertificate' as keyof VideoBrandingOptions,
    label: 'Yetki Belgesi',
    icon: Award,
    default: false,
  },
  {
    key: 'showLogo' as keyof VideoBrandingOptions,
    label: 'Şirket Logosu',
    icon: ImageIcon,
    default: false,
  },
];

export function BrandingTogglePanel({ options, onChange }: BrandingTogglePanelProps) {
  const handleToggle = (key: keyof VideoBrandingOptions) => {
    onChange({
      ...options,
      [key]: !options[key],
    });
  };

  const activeCount = Object.values(options).filter(Boolean).length;

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold">Video Markalama Seçenekleri</h3>
        </div>
        <span className="text-sm text-muted">
          {activeCount}/{BRANDING_ITEMS.length} aktif
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BRANDING_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = options[item.key];

          return (
            <motion.button
              key={item.key}
              onClick={() => handleToggle(item.key)}
              className={`
                relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
                ${isActive 
                  ? 'border-red-500 bg-red-500/10' 
                  : 'border-border bg-background hover:border-muted'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`
                p-2 rounded-full transition-colors
                ${isActive ? 'bg-red-500/20 text-red-500' : 'bg-muted/10 text-muted'}
              `}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`
                text-sm font-medium transition-colors
                ${isActive ? 'text-foreground' : 'text-muted'}
              `}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"
                >
                  <Eye className="w-2.5 h-2.5 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <button
          onClick={() => onChange(defaultBrandingOptions)}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Varsayılanlara sıfırla
        </button>
      </div>
    </Card>
  );
}