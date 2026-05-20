'use client';

import { useEffect, useRef, useState } from 'react';
import type { Feature, FeatureCollection } from 'geojson';

interface MapViewProps {
  geoJson: FeatureCollection | Feature | null;
  onParcelSelect?: (feature: Feature) => void;
  interactive?: boolean;
}

export function MapView({
  geoJson,
  onParcelSelect,
  interactive = true,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-card">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">Harita yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-full relative"
      style={{
        background: `
          radial-gradient(circle at 30% 30%, rgba(239, 68, 68, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 70% 70%, rgba(100, 100, 100, 0.1) 0%, transparent 50%),
          linear-gradient(135deg, #0a0a0a 0%, #111111 100%)
        `,
      }}
    >
      {/* Placeholder map UI */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-24 h-24 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-12 h-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Harita Görünümü</h3>
          <p className="text-sm text-muted max-w-xs">
            Parsel sınırları 3D harita üzerinde görüntülenecek.
            <br />
            Google Maps / Mapbox entegrasyonu eklenecek.
          </p>
        </div>
      </div>

      {/* Mock controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-card-hover transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-card-hover transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}