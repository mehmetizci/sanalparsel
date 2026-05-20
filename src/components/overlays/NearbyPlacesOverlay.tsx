'use client';

import { Card } from '@/components/ui/Card';
import { MapPin, Building2, GraduationCap, ShoppingCart, Palmtree, Store, CircleDot } from 'lucide-react';

interface NearbyPlacesProps {
  places: Array<{
    name: string;
    type: string;
    distance: number;
    unit: string;
  }>;
  animated?: boolean;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  hospital: { icon: Building2, color: 'text-red-500', label: 'Hastane' },
  school: { icon: GraduationCap, color: 'text-blue-500', label: 'Okul' },
  market: { icon: ShoppingCart, color: 'text-green-500', label: 'Market' },
  highway: { icon: MapPin, color: 'text-yellow-500', label: 'Otoyol' },
  beach: { icon: Palmtree, color: 'text-cyan-500', label: 'Plaj' },
  'shopping mall': { icon: Store, color: 'text-purple-500', label: 'AVM' },
  'city center': { icon: CircleDot, color: 'text-orange-500', label: 'Merkez' },
};

const DEFAULT_PLACES = [
  { name: 'Devlet Hastanesi', type: 'hospital', distance: 1.2, unit: 'km' },
  { name: 'İlkyerleşim İlköğretim Okulu', type: 'school', distance: 0.8, unit: 'km' },
  { name: 'A101 Market', type: 'market', distance: 0.5, unit: 'km' },
  { name: 'İzmir-Çeşme Otoyolu', type: 'highway', distance: 2.3, unit: 'km' },
  { name: 'Çeşme Plajı', type: 'beach', distance: 3.1, unit: 'km' },
];

export function NearbyPlacesOverlay({ places, animated = true }: NearbyPlacesProps) {
  const displayPlaces = places.length > 0 ? places : DEFAULT_PLACES;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Çevre Analizi</h3>
      <div className={`space-y-2 ${animated ? 'animate-slide-up' : ''}`}>
        {displayPlaces.map((place, index) => {
          const config = TYPE_CONFIG[place.type] || TYPE_CONFIG['city center'];
          const Icon = config.icon;

          return (
            <Card
              key={`${place.type}-${index}`}
              className="glass-strong flex items-center gap-3 p-3"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-10 h-10 rounded-lg bg-card flex items-center justify-center ${config.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{place.name}</p>
                <p className="text-xs text-muted">{config.label}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">
                  {place.distance.toFixed(1)}
                </p>
                <p className="text-xs text-muted">{place.unit}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}