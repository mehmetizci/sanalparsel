'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  GraduationCap, 
  ShoppingCart, 
  Highway, 
  Waves, 
  Store, 
  Building 
} from 'lucide-react';
import type { NearbyPlace } from '@/types';

interface NearbyPlacesProps {
  places: NearbyPlace[];
  animated?: boolean;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  hospital: Building2,
  school: GraduationCap,
  market: ShoppingCart,
  highway: Highway,
  beach: Waves,
  'shopping mall': Store,
  'city center': Building,
};

const TYPE_LABELS: Record<string, string> = {
  hospital: 'Hastane',
  school: 'Okul',
  market: 'Market',
  highway: 'Otoyol',
  beach: 'Plaj',
  'shopping mall': 'AVM',
  'city center': 'Merkez',
};

export function NearbyPlacesOverlay({ places, animated = true }: NearbyPlacesProps) {
  const [visibleCount, setVisibleCount] = useState(animated ? 0 : places.length);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!animated) return;

    intervalRef.current = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= places.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 600);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [places.length, animated]);

  const formatDistance = (distance: number, unit: string) => {
    if (unit === 'km') return `${distance.toFixed(1)} km`;
    return `${distance} m`;
  };

  return (
    <motion.div 
      className="flex flex-col gap-2"
      initial={animated ? { opacity: 0, x: -30 } : undefined}
      animate={animated ? { opacity: 1, x: 0 } : undefined}
      transition={{ duration: 0.4 }}
    >
      {places.slice(0, 5).map((place, index) => {
        const IconComponent = TYPE_ICONS[place.type] || Building2;
        const typeLabel = TYPE_LABELS[place.type] || place.type;

        return (
          <motion.div
            key={`${place.type}-${index}`}
            className={`
              flex items-center gap-3 px-4 py-2.5 glass rounded-xl transition-all duration-500
              ${index < visibleCount
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-10'
              }
            `}
            style={{ transitionDelay: `${index * 100}ms` }}
            initial={animated ? { opacity: 0, x: -20 } : undefined}
            animate={animated ? { opacity: 1, x: 0 } : undefined}
          >
            <div className="p-2 rounded-lg bg-red-500/10">
              <IconComponent className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{place.name}</p>
              <p className="text-xs text-muted">{typeLabel}</p>
            </div>
            <span className="text-xs text-red-500 font-semibold whitespace-nowrap">
              {formatDistance(place.distance, place.unit)}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
