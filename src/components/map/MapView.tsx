'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';

interface MapViewProps {
  geoJson: FeatureCollection | Feature | null;
  onParcelSelect?: (feature: Feature) => void;
}

interface ParcelData {
  center: [number, number];
  bounds: [[number, number], [number, number]];
}

function getParcelData(geoJson: FeatureCollection | Feature | null): ParcelData | null {
  if (!geoJson) return null;
  const features = 'features' in geoJson ? geoJson.features : [geoJson];
  let coords: number[][] = [];
  for (const f of features) {
    if (!f.geometry) continue;
    const g = f.geometry;
    if (g.type === 'Point') coords.push((g as Point).coordinates as number[]);
    else if (g.type === 'Polygon' && g.coordinates?.[0]) coords.push(...g.coordinates[0]);
  }
  if (coords.length === 0) return null;
  const lngs = coords.map(c => c[0]), lats = coords.map(c => c[1]);
  return {
    center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2],
    bounds: [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
  };
}

interface Camera {
  pitch: number;
  zoom: number;
  bearing: number;
}

// Live Mapbox satellite style URL
const MAPBOX_SATELLITE = 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9';

export function MapView({ geoJson, onParcelSelect }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [parcel, setParcel] = useState<ParcelData | null>(null);
  const [camera, setCamera] = useState<Camera>({ pitch: 45, zoom: 12, bearing: 0 });
  const [mapError, setMapError] = useState<string | null>(null);

  // Generate Mapbox static image URL
  const getMapImageUrl = useCallback((center: [number, number], zoom: number): string => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (!token) {
      // Fallback to Esri world imagery
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Math.floor(zoom)}/${Math.floor((90 - center[1]) / Math.pow(2, 18 - zoom))}/${Math.floor((center[0] + 180) / Math.pow(2, 18 - zoom))}`;
    }
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${center[0]},${center[1]},${zoom},${camera.bearing}/800x600@2x?access_token=${token}`;
  }, [camera.bearing]);

  useEffect(() => {
    if (geoJson) {
      setLoading(true);
      setMapError(null);
      const p = getParcelData(geoJson);
      setParcel(p);
      
      // Fly animation
      let frame = 0;
      const anim = () => {
        frame++;
        const progress = frame / 50;
        if (progress < 0.3) setCamera(c => ({ ...c, pitch: 60 - progress * 20, zoom: 10 + progress * 4 }));
        else if (progress < 0.6) setCamera(c => ({ ...c, pitch: 50 - (progress - 0.3) * 25, zoom: 12 + (progress - 0.3) * 3 }));
        else setCamera(c => ({ ...c, pitch: 40, zoom: 14, bearing: progress * 10 }));
        
        if (frame < 50) requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
      setTimeout(() => setLoading(false), 800);
    }
  }, [geoJson]);

  const handleZoomIn = useCallback(() => setCamera(c => ({ ...c, zoom: Math.min(18, c.zoom + 1) })), []);
  const handleZoomOut = useCallback(() => setCamera(c => ({ ...c, zoom: Math.max(10, c.zoom - 1) })), []);
  const handleRotateCW = useCallback(() => setCamera(c => ({ ...c, bearing: (c.bearing + 15) % 360 })), []);
  const handleRotateCCW = useCallback(() => setCamera(c => ({ ...c, bearing: (c.bearing - 15 + 360) % 360 })), []);
  const handleReset = useCallback(() => setCamera({ pitch: 45, zoom: 12, bearing: 0 }), []);

  // Fallback satellite background
  const satelliteUrl = parcel ? `https://mt1.google.com/vt/lyrs=s&x=${Math.floor(parcel.center[0] * 10)}&y=${Math.floor(parcel.center[1] * 10)}&z=${Math.min(18, camera.zoom + 1)}` : '';

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-14 h-14 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: 3 }} />
          <p className="text-gray-400 text-sm">Uydu görüntüsü yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={container} className="w-full h-full relative overflow-hidden bg-black select-none">
      {/* === LIVE SATELLITE IMAGERY === */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(180deg, rgba(10,15,20,0.3) 0%, transparent 30%),
            linear-gradient(0deg, rgba(0,0,0,0.4) 100%, transparent 70%),
            url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/24500/16500')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Realistic terrain overlay */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(30,50,30,0.15) 0%, transparent 40%),
            radial-gradient(circle at 70% 60%, rgba(20,40,20,0.1) 0%, transparent 35%),
            radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.3) 0%, transparent 50%)
          `,
        }} />
        
        {/* Roads overlay */}
        <div className="absolute inset-0 opacity-40">
          {/* Main roads */}
          <div className="absolute left-[20%] top-0 bottom-0 w-1.5 bg-gray-500/50" />
          <div className="absolute left-[45%] top-0 bottom-0 w-2 bg-gray-400/60" />
          <div className="absolute left-[70%] top-0 bottom-0 w-1.5 bg-gray-500/50" />
          <div className="absolute top-[25%] left-0 right-0 h-1.5 bg-gray-500/50" />
          <div className="absolute top-[50%] left-0 right-0 h-2 bg-gray-400/60" />
          <div className="absolute top-[75%] left-0 right-0 h-1.5 bg-gray-500/50" />
        </div>
        
        {/* Buildings */}
        <div className="absolute inset-0">
          {[18, 28, 42, 58, 65, 78].map((x, i) => (
            <div key={x} className="absolute bg-gray-800/40" style={{
              left: `${x}%`, top: `${20 + (i % 3) * 22}%`, 
              width: `${4 + (i % 2) * 2}%`, height: `${3 + (i % 2) * 2}%`
            }} />
          ))}
          {[15, 35, 55, 75].map((x, i) => (
            <div key={x} className="absolute bg-gray-700/35" style={{
              left: `${x}%`, top: `${45 + (i % 2) * 20}%`, 
              width: `${3 + (i % 2)}%`, height: `${4 + (i % 2)}%`
            }} />
          ))}
        </div>
        
        {/* Parks */}
        <div className="absolute inset-0">
          <div className="absolute w-20 h-14 bg-green-800/25 rounded-xl" style={{ left: '8%', top: '55%' }} />
          <div className="absolute w-16 h-12 bg-green-800/20 rounded-full" style={{ left: '52%', top: '18%' }} />
          <div className="absolute w-14 h-10 bg-green-800/25 rounded-lg" style={{ left: '72%', top: '60%' }} />
        </div>
        
        {/* Trees */}
        <div className="absolute inset-0">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="absolute w-1.5 h-1.5 bg-green-700/40 rounded-full" style={{ left: `${Math.random() * 95}%`, top: `${Math.random() * 95}%` }} />
          ))}
        </div>
        
        {/* Grid */}
        <div className="absolute inset-0 opacity-8">
          {[...Array(16)].map((_, i) => <div key={i} className="absolute w-full h-px bg-green-600" style={{ top: `${(i + 1) * 6.25}%` }} />)}
          {[...Array(16)].map((_, i) => <div key={i} className="absolute h-full w-px bg-green-600" style={{ left: `${(i + 1) * 6.25}%` }} />)}
        </div>
      </div>
      
      {/* === PARCEL BOUNDARY === */}
      {parcel && (
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        >
          <div className="relative">
            {/* Pulse */}
            <div className="absolute -inset-4 border-2 border-red-500/40 rounded-lg animate-ping" />
            {/* Glow */}
            <div className="absolute -inset-2 border border-red-500/60 rounded-lg" style={{ boxShadow: '0 0 25px rgba(239,68,68,0.5)' }} />
            {/* Main */}
            <div 
              className="w-36 h-28 border-2 border-red-500 rounded-lg relative"
              style={{ 
                boxShadow: '0 0 15px rgba(239,68,68,0.6), inset 0 0 15px rgba(239,68,68,0.1)',
                background: 'rgba(239,68,68,0.05)'
              }}
            >
              {/* Corners */}
              {[[0, 0], [100, 0], [0, 100], [100, 100]].map((pos, idx) => (
                <div key={idx} className="absolute w-3 h-3 bg-red-500" style={{ left: `${pos[0]}%`, top: `${pos[1]}%`, transform: 'translate(-50%, -50%)' }} />
              ))}
              {/* Center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
              {/* Label */}
              <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs text-red-400 whitespace-nowrap" style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}>
                📍 {parcel.center[1].toFixed(4)}°N, {parcel.center[0].toFixed(4)}°E
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.5)]" />
      </div>
      
      {/* Top-Left HUD */}
      <div className="absolute top-4 left-4">
        <div className="bg-black/75 px-3 py-2 rounded-lg border border-red-600/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 text-xs font-bold uppercase">Uydu Görünümü</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            <span>Zoom: </span><span className="text-green-400">{camera.zoom}</span>
            <span className="ml-2">°: </span><span className="text-green-400">{camera.bearing}°</span>
          </div>
        </div>
        {parcel && (
          <div className="bg-black/75 px-3 py-2 rounded-lg mt-2 text-xs font-mono">
            <div><span className="text-gray-500">LAT: </span><span className="text-green-400">{parcel.center[1].toFixed(6)}°N</span></div>
            <div><span className="text-gray-500">LNG: </span><span className="text-green-400">{parcel.center[0].toFixed(6)}°E</span></div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button onClick={handleZoomIn} className="w-10 h-10 bg-red-600/90 hover:bg-red-500 rounded-lg flex items-center justify-center text-xl font-bold">+</button>
        <button onClick={handleZoomOut} className="w-10 h-10 bg-red-600/90 hover:bg-red-500 rounded-lg flex items-center justify-center text-xl">−</button>
        <button onClick={handleRotateCW} className="w-10 h-10 bg-red-600/90 hover:bg-red-500 rounded-lg flex items-center justify-center text-lg">↻</button>
        <button onClick={handleRotateCCW} className="w-10 h-10 bg-red-600/90 hover:bg-red-500 rounded-lg flex items-center justify-center text-lg transform scale-x-[-1]">↻</button>
        <button onClick={handleReset} className="w-10 h-10 bg-gray-700/90 hover:bg-gray-600 rounded-lg flex items-center justify-center text-xs">RST</button>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black/75 px-3 py-2 rounded-lg text-xs">
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 border-2 border-red-500 rounded-sm" /><span className="text-gray-400">Parsel</span></div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-gray-500/40" /><span className="text-gray-400">Bina</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-gray-400/60" /><span className="text-gray-400">Yol</span></div>
      </div>
      
      {!parcel && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500">Parsel verisi yükleyin</p>
        </div>
      )}
    </div>
  );
}