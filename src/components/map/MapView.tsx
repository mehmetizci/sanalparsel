'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Feature, FeatureCollection, Point, Polygon, LineString } from 'geojson';

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
    else if (g.type === 'LineString') coords.push(...(g as LineString).coordinates);
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
  altitude: number;
}

// Google Earth-style terrain colors
const TERRAIN = {
  darkGreen: '#0d1f0d',
  green: '#142814',
  lightGreen: '#1a3a1a',
  mountain: '#1a2a1a',
  water: '#0a1a1f',
  road: '#2a2a2a',
  building: '#1a1a1a',
};

export function MapView({ geoJson, onParcelSelect }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [parcel, setParcel] = useState<ParcelData | null>(null);
  const [camera, setCamera] = useState<Camera>({ pitch: 60, zoom: 0.1, bearing: 0, altitude: 500 });
  const [autoRotate, setAutoRotate] = useState(false);

  // Cinematic fly-in animation on parcel load
  useEffect(() => {
    if (geoJson) {
      setLoading(true);
      const p = getParcelData(geoJson);
      setParcel(p);
      
      // Fly from space to parcel
      let frame = 0;
      const maxFrames = 60;
      const anim = () => {
        frame++;
        const progress = frame / maxFrames;
        
        if (progress < 0.25) {
          // Space view - high altitude
          setCamera({ pitch: 60, zoom: progress * 0.2, bearing: progress * 5, altitude: 500 - progress * 300 });
        } else if (progress < 0.5) {
          // City approach
          setCamera({ pitch: 55 - (progress - 0.25) * 30, zoom: 0.05 + (progress - 0.25) * 0.8, bearing: progress * 10, altitude: 200 - (progress - 0.25) * 150 });
        } else if (progress < 0.75) {
          // Low approach
          setCamera({ pitch: 40 - (progress - 0.5) * 10, zoom: 0.3 + (progress - 0.5) * 0.8, bearing: 5 + (progress - 0.5) * 15, altitude: 50 - (progress - 0.5) * 30 });
        } else {
          // Parcel hover
          setCamera({ pitch: 35, zoom: 0.6 + (progress - 0.75) * 0.4, bearing: 8, altitude: 20 });
        }
        
        if (frame < maxFrames) requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
      setTimeout(() => setLoading(false), 1000);
    }
  }, [geoJson]);

  // Controls
  const handleZoomIn = useCallback(() => setCamera(c => ({ ...c, zoom: Math.min(1.2, c.zoom + 0.1), altitude: Math.max(10, c.altitude - 20) })), []);
  const handleZoomOut = useCallback(() => setCamera(c => ({ ...c, zoom: Math.max(0.1, c.zoom - 0.1), altitude: Math.min(500, c.altitude + 20) })), []);
  const handleRotateCW = useCallback(() => setCamera(c => ({ ...c, bearing: (c.bearing + 15) % 360 })), []);
  const handleRotateCCW = useCallback(() => setCamera(c => ({ ...c, bearing: (c.bearing - 15 + 360) % 360 })), []);
  const handleTilt = useCallback(() => setCamera(c => ({ ...c, pitch: Math.max(20, c.pitch - 5) })), []);
  const handleReset = useCallback(() => setCamera({ pitch: 45, zoom: 0.3, bearing: 0, altitude: 200 }), []);

  // 3D transform
  const transform = `perspective(800px) rotateX(${camera.pitch}deg) translateZ(${-camera.zoom * 80}px) rotateY(${camera.bearing}deg)`;
  const boundarySize = 60 + camera.zoom * 40;

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-14 h-14 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: 3 }} />
          <p className="text-gray-400 text-sm">Google Earth yükleniyor...</p>
          <p className="text-gray-600 text-xs mt-1">Uydu görüntüleri alınıyor</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={container} className="w-full h-full relative overflow-hidden bg-black select-none">
      {/* === GOOGLE EARTH-STYLE SATELLITE TERRAIN === */}
      <div className="absolute inset-0 transition-transform duration-300" style={{ transform, transformOrigin: '50% 60%' }}>
        
        {/* Base satellite imagery - layered gradients for realistic terrain */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 140% 90% at 50% 110%, #1a2f1a 0%, transparent 50%),
            radial-gradient(ellipse 100% 70% at 25% 60%, #152515 0%, transparent 40%),
            radial-gradient(ellipse 90% 60% at 75% 70%, #101a10 0%, transparent 35%),
            radial-gradient(ellipse 110% 60% at 40% 20%, #0f1f0f 0%, transparent 30%),
            radial-gradient(circle at 65% 25%, #0a150a 0%, transparent 25%),
            linear-gradient(180deg, #050805 0%, #0a0f0a 30%, #080d08 60%, #0a100a 100%)
          `
        }} />
        
        {/* Mountain terrain shadows */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 w-1/3 h-1/3 bg-gradient-to-br from-black/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-1/4 h-1/4 bg-gradient-to-bl from-black/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 left-1/4 w-1/3 h-1/3 bg-gradient-to-tr from-black/35 to-transparent rounded-full blur-3xl" />
        </div>
        
        {/* Terrain texture - roads network */}
        <div className="absolute inset-0 opacity-80">
          {/* Main highways */}
          <div className="absolute left-[20%] top-0 bottom-0 w-[3px] bg-gray-700/60" />
          <div className="absolute left-[45%] top-0 bottom-0 w-[4px] bg-gray-600/70" />
          <div className="absolute left-[70%] top-0 bottom-0 w-[3px] bg-gray-700/60" />
          <div className="absolute top-[25%] left-0 right-0 h-[3px] bg-gray-700/60" />
          <div className="absolute top-[50%] left-0 right-0 h-[4px] bg-gray-600/70" />
          <div className="absolute top-[75%] left-0 right-0 h-[3px] bg-gray-700/60" />
          
          {/* Minor roads */}
          <div className="absolute left-[32%] top-0 bottom-0 w-[1.5px] bg-gray-800/40" />
          <div className="absolute left-[58%] top-0 bottom-0 w-[1.5px] bg-gray-800/40" />
          <div className="absolute top-[38%] left-0 right-0 h-[1.5px] bg-gray-800/40" />
          <div className="absolute top-[62%] left-0 right-0 h-[1.5px] bg-gray-800/40" />
          
          {/* Dashed center lines */}
          <div className="absolute left-[45%] top-[25%] top-[50%] w-[1px] h-2 bg-yellow-900/30" style={{ boxShadow: '0 8px 0 #000, 0 16px 0 #000' }} />
        </div>
        
        {/* Buildings - 3D extruded blocks */}
        <div className="absolute inset-0">
          {/* Building complexes with shadows */}
          {[8, 22, 38, 55, 62, 78, 85].map((x, i) => (
            <div key={x} className="absolute" style={{ left: `${x}%`, top: `${15 + (i % 3) * 20}%`, width: `${4 + (i % 2) * 2}%`, height: `${3 + (i % 2) * 2}%`, background: '#0f1a0f', boxShadow: '2px 2px 8px rgba(0,0,0,0.5)' }}>
              <div className="absolute inset-0 border border-green-950/30" />
              {/* Roof detail */}
              <div className="absolute inset-0.5 bg-green-950/20" />
            </div>
          ))}
          {[12, 28, 48, 68, 82].map((x, i) => (
            <div key={x} className="absolute" style={{ left: `${x}%`, top: `${40 + (i % 2) * 20}%`, width: `${3 + (i % 2)}%`, height: `${4 + (i % 2)}%`, background: '#0a150a', boxShadow: '3px 3px 10px rgba(0,0,0,0.6)' }}>
              <div className="absolute inset-0 border border-green-900/20" />
            </div>
          ))}
        </div>
        
        {/* Parks and green areas */}
        <div className="absolute inset-0">
          <div className="absolute w-16 h-12 bg-green-900/25 rounded-xl" style={{ left: '10%', top: '60%' }} />
          <div className="absolute w-20 h-16 bg-green-900/20 rounded-full" style={{ left: '55%', top: '15%' }} />
          <div className="absolute w-12 h-10 bg-green-900/30 rounded-lg" style={{ left: '70%', top: '65%' }} />
        </div>
        
        {/* Trees/vegetation */}
        <div className="absolute inset-0">
          {[...Array(40)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-green-800/50 rounded-full" style={{ left: `${Math.random() * 95}%`, top: `${Math.random() * 95}%` }} />
          ))}
        </div>
        
        {/* Water features */}
        <div className="absolute bottom-0 left-0 right-0 h-1/4" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(20,40,40,0.15) 30%, rgba(10,30,35,0.2) 100%)' }} />
        
        {/* Grid overlay for GIS feel */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(16)].map((_, i) => <div key={i} className="absolute w-full h-px bg-green-700" style={{ top: `${(i + 1) * 6.25}%` }} />)}
          {[...Array(16)].map((_, i) => <div key={i} className="absolute h-full w-px bg-green-700" style={{ left: `${(i + 1) * 6.25}%` }} />)}
        </div>
      </div>
      
      {/* === PARCEL BOUNDARY - HIGHLIGHTED === */}
      {parcel && (
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ transform: `translate(-50%, -50%) scale(${0.5 + camera.zoom * 0.5})` }}
        >
          <div className="relative">
            {/* Animated pulse ring */}
            <div 
              className="absolute -inset-4 border-2 border-red-500/40 rounded-lg animate-ping"
              style={{ animationDuration: '2s' }}
            />
            {/* Outer glow */}
            <div 
              className="absolute -inset-2 border border-red-500/60 rounded-lg"
              style={{ boxShadow: '0 0 30px rgba(239,68,68,0.4), 0 0 60px rgba(239,68,68,0.2)' }}
            />
            {/* Main boundary */}
            <div 
              className="w-36 h-28 border-2 border-red-500 rounded-lg relative"
              style={{ 
                boxShadow: '0 0 20px rgba(239,68,68,0.6), inset 0 0 20px rgba(239,68,68,0.1)',
                background: 'rgba(239,68,68,0.05)'
              }}
            >
              {/* Corner markers */}
              {[[0, 0], [100, 0], [0, 100], [100, 100]].map((pos, idx) => (
                <div
                  key={idx}
                  className="absolute w-3 h-3 bg-red-500 rounded-sm"
                  style={{ left: `${pos[0]}%`, top: `${pos[1]}%`, transform: 'translate(-50%, -50%)', boxShadow: '0 0 6px rgba(239,68,68,0.8)' }}
                />
              ))}
              
              {/* Center marker - pulsing dot */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 15px rgba(239,68,68,0.7)' }}>
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
                <div className="absolute -inset-2 w-6 h-6 border border-red-400 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
              </div>
              
              {/* Label */}
              <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs text-red-400 whitespace-nowrap" style={{ textShadow: '0 0 10px rgba(239,68,68,0.8)' }}>
                📍 {parcel.center[1].toFixed(4)}°N, {parcel.center[0].toFixed(4)}°E
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* === ATMOSPHERIC OVERLAYS === */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Sky gradient */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
        {/* Ground gradient */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
        {/* Cinematic vignette */}
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.6)]" />
      </div>
      
      {/* === TOP-LEFT: DRONE HUD === */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-red-600/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 text-xs font-bold uppercase tracking-wider">Drone View</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            <span>Alt: </span><span className="text-green-400">{camera.altitude}m</span>
            <span className="ml-2">Pitch: </span><span className="text-green-400">{camera.pitch}°</span>
          </div>
        </div>
        
        {parcel && (
          <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg">
            <div className="text-xs font-mono">
              <div><span className="text-gray-500">LAT: </span><span className="text-green-400">{parcel.center[1].toFixed(6)}°N</span></div>
              <div><span className="text-gray-500">LNG: </span><span className="text-green-400">{parcel.center[0].toFixed(6)}°E</span></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <span>Bounds: </span>
              <span className="text-green-600">{(parcel.bounds[1][0] - parcel.bounds[0][0]).toFixed(4)}° × {(parcel.bounds[1][1] - parcel.bounds[0][1]).toFixed(4)}°</span>
            </div>
          </div>
        )}
      </div>
      
      {/* === TOP-RIGHT: CONTROLS === */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button onClick={handleZoomIn} className="w-10 h-10 bg-red-600/90 hover:bg-red-500 rounded-lg flex items-center justify-center font-bold text-xl transition-all hover:scale-105 active:scale-95" title="Yakınlaştır">
          +
        </button>
        <button onClick={handleZoomOut} className="w-10 h-10 bg-red-600/90 hover:bg-red-500 rounded-lg flex items-center justify-center text-xl transition-all hover:scale-105 active:scale-95" title="Uzaklaştır">
          −
        </button>
        <button onClick={handleRotateCW} className="w-10 h-10 bg-red-600/90 hover:bg-red-500 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-105 active:scale-95" title="Sağa döndür">
          ↻
        </button>
        <button onClick={handleRotateCCW} className="w-10 h-10 bg-red-600/90 hover:bg-red-500 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-105 active:scale-95 transform scale-x-[-1]" title="Sola döndür">
          ↻
        </button>
        <button onClick={handleTilt} className="w-10 h-10 bg-red-600/90 hover:bg-red-500 rounded-lg flex items-center justify-center text-xs transition-all hover:scale-105 active:scale-95" title="Eğ">
          ↓°
        </button>
        <button onClick={handleReset} className="w-10 h-10 bg-gray-700/90 hover:bg-gray-600 rounded-lg flex items-center justify-center text-xs transition-all hover:scale-105 active:scale-95" title="Sıfırla">
          RST
        </button>
      </div>
      
      {/* === BOTTOM-LEGEND === */}
      <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 border-2 border-red-500 rounded-sm" />
          <span className="text-gray-400">Parsel Sınırı</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-green-950 border border-green-900" />
          <span className="text-gray-400">Bina</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-gray-600" />
          <span className="text-gray-400">Yol</span>
        </div>
      </div>
      
      {/* NO PARCEL MESSAGE */}
      {!parcel && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-600/30">🗺️</div>
            <p className="text-gray-500">Parsel verisi yükleyin</p>
          </div>
        </div>
      )}
    </div>
  );
}