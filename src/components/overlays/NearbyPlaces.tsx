'use client';

import { useEffect, useRef, useState } from 'react';
import type { NearbyPlace } from '@/types';

interface NearbyPlacesProps {
  places: NearbyPlace[];
  animated?: boolean;
}

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
    if (unit === 'km') return `${distance} km`;
    return `${distance} m`;
  };

  return (
    <div className="flex flex-col gap-2">
      {places.slice(0, 5).map((place, index) => (
        <div
          key={`${place.type}-${index}`}
          className={`flex items-center gap-3 px-4 py-2.5 glass rounded-xl transition-all duration-500 ${
            index < visibleCount
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-10'
          }`}
          style={{ transitionDelay: `${index * 100}ms` }}
        >
          <span className="text-lg">{place.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{place.name}</p>
          </div>
          <span className="text-xs text-primary font-semibold whitespace-nowrap">
            {formatDistance(place.distance, place.unit)}
          </span>
        </div>
      ))}
    </div>
  );
}
