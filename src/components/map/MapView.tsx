'use client';

import { useEffect, useRef, useState } from 'react';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';

interface MapViewProps {
  geoJson: FeatureCollection | Feature | null;
  onParcelSelect?: (feature: Feature) => void;
}

interface ParcelData {
  center: [number, number];
}

function getCenter(geoJson: FeatureCollection | Feature | null): ParcelData | null {
  if (!geoJson) return null;
  const features = 'features' in geoJson ? geoJson.features : [geoJson];
  let coords: number[][] = [];
  
  for (const f of features) {
    if (!f.geometry) continue;
    const g = f.geometry;
    if (g.type === 'Point') coords.push((g as Point).coordinates as number[]);
    else if (g.type === 'Polygon' && g.coordinates?.[0]) coords.push(...g.coordinates[0]);
    else if (g.type === 'LineString') coords.push(...(g as any).coordinates);
  }
  
  if (coords.length === 0) return null;
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return { center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2] };
}

export function MapView({ geoJson, onParcelSelect }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [parcel, setParcel] = useState<ParcelData | null>(null);
  const [zoom, setZoom] = useState(0.3);
  const [bearing, setBearing] = useState(0);
  const [stage, setStage] = useState<'space' | 'city' | 'parcel'>('space');

  useEffect(() => {
    if (geoJson) {
      setLoading(true);
      const p = getCenter(geoJson);
      setParcel(p);
      setStage('space');
      setZoom(0.1);
      setBearing(0);
      
      // Fly animation
      let f = 0;
      const anim = () => {
        f++;
        const prog = f / 60;
        if (prog < 0.3) setZoom(prog * 0.4);
        else if (prog < 0.6) { setZoom(0.1 + (prog - 0.3) * 1.5); setStage('city'); }
        else { setZoom(0.6 + (prog - 0.6) * 0.3); setStage('parcel'); setBearing((prog - 0.6) * 30); }
        if (f < 60) requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
      setTimeout(() => setLoading(false), 1000);
    }
  }, [geoJson]);

  const handleZoomIn = () => setZoom(z => Math.min(1, z + 0.1));
  const handleZoomOut = () => setZoom(z => Math.max(0.1, z - 0.1));
  const handleRotateR = () => setBearing(b => b + 15);
  const handleRotateL = () => setBearing(b => b - 15);
  const handleReset = () => { setZoom(0.3); setBearing(0); setStage('space'); };

  const styles = {
    transform: `perspective(600px) rotateX(45deg) translateZ(${-zoom * 150}px) rotateY(${bearing}deg)`,
    transformOrigin: '50% 50%',
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Harita yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={container} className="w-full h-full relative overflow-hidden bg-black">
      {/* 3D Terrain */}
      <div className="absolute inset-0 transition-all duration-300" style={styles}>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 100% 60% at 50% 100%, #0a1f0a 0%, transparent 50%), linear-gradient(180deg, #030503 0%, #050a05 50%, #030703 100%)',
        }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(15)].map((_, i) => (
            <div key={`h${i}`} className="absolute w-full h-px bg-green-900" style={{ top: `${(i+1)*6}%` }} />
          ))}
          {[...Array(15)].map((_, i) => (
            <div key={`v${i}`} className="absolute h-full w-px bg-green-900" style={{ left: `${(i+1)*6}%` }} />
          ))}
        </div>
      </div>

      {/* Parcel */}
      {parcel && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-24 h-20 border-2 border-red-600 rounded-lg" style={{ transform: `scale(${zoom * 2})`, boxShadow: '0 0 20px rgba(239,68,68,0.5)' }} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)]" />
      </div>

      {/* Top-Left Info */}
      <div className="absolute top-4 left-4">
        <div className="bg-black/70 px-3 py-2 rounded-lg">
          <p className="text-xs text-red-500 uppercase">{stage} View</p>
          <p className="text-xs text-gray-400 mt-1">
            {parcel ? `${parcel.center[1].toFixed(5)}, ${parcel.center[0].toFixed(5)}` : 'Bekleniyor'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button onClick={handleZoomIn} className="w-9 h-9 bg-red-600 hover:bg-red-500 rounded-lg flex items-center justify-center transition-colors">
          <span className="text-lg font-bold">+</span>
        </button>
        <button onClick={handleZoomOut} className="w-9 h-9 bg-red-600 hover:bg-red-500 rounded-lg flex items-center justify-center transition-colors">
          <span className="text-lg font-bold">−</span>
        </button>
        <button onClick={handleRotateR} className="w-9 h-9 bg-red-600 hover:bg-red-500 rounded-lg flex items-center justify-center transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
        <button onClick={handleRotateL} className="w-9 h-9 bg-red-600 hover:bg-red-500 rounded-lg flex items-center justify-center transition-colors">
          <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
        <button onClick={handleReset} className="w-9 h-9 bg-red-600 hover:bg-red-500 rounded-lg flex items-center justify-center transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      {/* Bottom-Left Coords */}
      {parcel && (
        <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-2 rounded-lg text-xs font-mono">
          <p><span className="text-gray-500">LAT:</span> <span className="text-green-500">{parcel.center[1].toFixed(6)}°</span></p>
          <p><span className="text-gray-500">LNG:</span> <span className="text-green-500">{parcel.center[0].toFixed(6)}°</span></p>
        </div>
      )}

      {!parcel && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500">Parsel verisi yükleyin</p>
        </div>
      )}
    </div>
  );
}