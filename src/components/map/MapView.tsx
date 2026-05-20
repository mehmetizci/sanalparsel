'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Maximize2, Navigation } from 'lucide-react';

interface MapViewProps {
  geoJson: FeatureCollection | Feature | null;
  onParcelSelect?: (feature: Feature) => void;
  interactive?: boolean;
}

interface CameraState {
  zoom: number;
  rotation: number;
  pitch: number;
  x: number;
  y: number;
}

interface ParcelGeometry {
  center: [number, number];
  bounds: [[number, number], [number, number]];
}

function extractParcelGeometry(geoJson: FeatureCollection | Feature | null): ParcelGeometry | null {
  if (!geoJson) return null;

  const features = 'features' in geoJson ? geoJson.features : [geoJson];
  
  let allCoords: number[][] = [];
  
  for (const feature of features) {
    if (!feature.geometry) continue;
    
    const geom = feature.geometry;
    
    if (geom.type === 'Point') {
      allCoords.push((geom as Point).coordinates as number[]);
    } else if (geom.type === 'Polygon') {
      const coords = (geom as Polygon).coordinates;
      if (coords?.[0]) {
        allCoords = [...allCoords, ...coords[0]];
      }
    } else if (geom.type === 'LineString') {
      allCoords = [...allCoords, ...(geom as any).coordinates];
    }
  }

  if (allCoords.length === 0) return null;

  const lngs = allCoords.map(c => c[0]);
  const lats = allCoords.map(c => c[1]);

  const center: [number, number] = [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2,
  ];

  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];

  return { center, bounds };
}

export function MapView({
  geoJson,
  onParcelSelect,
  interactive = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [parcelGeom, setParcelGeom] = useState<ParcelGeometry | null>(null);
  const [camera, setCamera] = useState<CameraState>({
    zoom: 0,
    rotation: 0,
    pitch: 0,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (geoJson) {
      const geom = extractParcelGeometry(geoJson);
      setParcelGeom(geom);
      
      if (geom) {
        let frame = 0;
        const maxFrames = 60;
        
        const animate = () => {
          frame++;
          const progress = frame / maxFrames;
          
          setCamera({
            zoom: progress * 0.8,
            rotation: progress * 15,
            pitch: progress * 10,
            x: Math.sin(progress * Math.PI * 2) * 5 * (1 - progress),
            y: (1 - progress) * 30,
          });
          
          if (frame < maxFrames) {
            requestAnimationFrame(animate);
          } else {
            setCamera({ zoom: 0.8, rotation: 15, pitch: 10, x: 0, y: 0 });
          }
        };
        
        requestAnimationFrame(animate);
      }
    }
    
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [geoJson]);

  const handleZoom = (delta: number) => {
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0, Math.min(1, prev.zoom + delta * 0.1)),
    }));
  };

  const resetView = () => {
    setCamera({ zoom: 0, rotation: 0, pitch: 0, x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-card">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">Harita yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      {/* Google Earth-style satellite background */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          transform: `perspective(1000px) rotateX(${camera.pitch}deg) translateY(${camera.y}%) rotate(${camera.rotation}deg)`,
          transformOrigin: '50% 60%',
        }}
      >
        <div
          className="absolute inset-4 rounded-lg overflow-hidden"
          style={{
            background: `
              radial-gradient(ellipse at 50% 120%, #1a3a1a 0%, transparent 50%),
              radial-gradient(ellipse at 30% 80%, #2a4a2a 0%, transparent 40%),
              radial-gradient(ellipse at 70% 90%, #1a2a1a 0%, transparent 40%),
              linear-gradient(180deg, #0a1510 0%, #0a1a15 30%, #05100a 60%, #0a150a 100%)
            `,
          }}
        >
          {/* Terrain grid */}
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={`h-${i}`} className="absolute w-full h-px bg-green-800/50" style={{ top: `${(i + 1) * 5}%` }} />
            ))}
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={`v-${i}`} className="absolute h-full w-px bg-green-800/50" style={{ left: `${(i + 1) * 5}%` }} />
            ))}
          </div>

          {/* Terrain shadow */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Parcel boundary - Red border */}
          {parcelGeom && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="w-32 h-24 relative">
                  <div className="absolute inset-0 border-2 border-red-500 rounded-lg animate-pulse" />
                  <div className="absolute inset-0 border border-red-400/50 rounded-lg scale-110 animate-ping" />
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-red-400 whitespace-nowrap">
                  📍 {parcelGeom.center[1].toFixed(4)}°, {parcelGeom.center[0].toFixed(4)}°
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Atmospheric overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background/60 to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
      </div>

      {/* Drone camera info */}
      <div className="absolute top-4 left-4 glass px-3 py-2 rounded-lg">
        <div className="flex items-center gap-2 text-xs">
          <Navigation className="w-4 h-4 text-red-500" />
          <span className="text-green-400">DRONE VIEW</span>
        </div>
        <p className="text-xs text-muted mt-1">
          {parcelGeom ? `${parcelGeom.center[1].toFixed(4)}°N, ${parcelGeom.center[0].toFixed(4)}°E` : 'Bekleniyor...'}
        </p>
      </div>

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button onClick={() => handleZoom(1)} className="w-8 h-8 rounded-lg glass flex items-center justify-center cursor-pointer" title="Yakınlaştır">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => handleZoom(-1)} className="w-8 h-8 rounded-lg glass flex items-center justify-center cursor-pointer" title="Uzaklaştır">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={resetView} className="w-8 h-8 rounded-lg glass flex items-center justify-center cursor-pointer" title="Sıfırla">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Coordinates */}
      {parcelGeom && (
        <div className="absolute bottom-4 left-4 glass px-3 py-2 rounded-lg text-xs">
          <div className="flex gap-4">
            <div>
              <span className="text-muted">ENLEM:</span>
              <span className="ml-2 text-green-400">{parcelGeom.center[1].toFixed(6)}°</span>
            </div>
            <div>
              <span className="text-muted">BOYLAM:</span>
              <span className="ml-2 text-green-400">{parcelGeom.center[0].toFixed(6)}°</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 glass px-3 py-2 rounded-lg text-xs">
        <p className="text-red-500 mb-1">● Parsel Sınırı</p>
        <p className="text-green-500/70">● Konum</p>
      </div>
    </div>
  );
}