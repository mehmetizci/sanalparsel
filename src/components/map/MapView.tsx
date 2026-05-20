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

function getParcelData(geoJson: FeatureCollection | Feature | null): ParcelData | null {
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
  const lngs = coords.map(c => c[0]), lats = coords.map(c => c[1]);
  return { center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2] };
}

function Building({ x, y, w, h, z }: { x: number; y: number; w: number; h: number; z: number }) {
  return (
    <div
      className="absolute bg-green-950 border border-green-800/50"
      style={{
        left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`,
        boxShadow: `0 ${z * 3}px ${z * 4}px rgba(0,0,0,0.5)`,
        transform: `translateY(-${z * 2}%)`,
      }}
    >
      <div className="absolute inset-1 bg-green-900/30" />
    </div>
  );
}

function Road({ x1, y1, x2, y2, w }: { x1: number; y1: number; x2: number; y2: number; w: number }) {
  const isVert = x1 === x2;
  return (
    <div
      className="absolute bg-gray-800/60"
      style={{
        left: isVert ? `${x1}%` : '0%',
        top: isVert ? '0%' : `${y1}%`,
        width: isVert ? `${w}%` : '100%',
        height: isVert ? '100%' : `${w}%`,
      }}
    />
  );
}

function Park({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <div className="absolute bg-green-900/40 rounded-full" style={{
      left: `${x}%`, top: `${y}%`, width: `${r * 2}%`, height: `${r * 2}%`,
      transform: 'translate(-50%, -50%)',
    }} />
  );
}

export function MapView({ geoJson }: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [parcel, setParcel] = useState<ParcelData | null>(null);
  const [view, setView] = useState({ zoom: 0.1, rotX: 70, rotY: 0 });

  useEffect(() => {
    if (geoJson) {
      setLoading(true);
      setParcel(getParcelData(geoJson));
      let f = 0;
      const anim = () => {
        f++;
        const p = f / 50;
        if (p < 0.3) setView({ zoom: p * 0.3, rotX: 70 - p * 10, rotY: p * 5 });
        else if (p < 0.6) setView({ zoom: 0.1 + (p - 0.3) * 1, rotX: 60 - (p - 0.3) * 20, rotY: p * 10 });
        else setView({ zoom: 0.5 + (p - 0.6) * 0.6, rotX: 40 + (p - 0.6) * 10, rotY: 5 });
        if (f < 50) requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
      setTimeout(() => setLoading(false), 800);
    }
  }, [geoJson]);

  const zIn = () => setView(v => ({ ...v, zoom: Math.min(1, v.zoom + 0.15) }));
  const zOut = () => setView(v => ({ ...v, zoom: Math.max(0.15, v.zoom - 0.15) }));
  const rotR = () => setView(v => ({ ...v, rotY: v.rotY + 20 }));
  const rotL = () => setView(v => ({ ...v, rotY: v.rotY - 20 }));
  const reset = () => setView({ zoom: 0.1, rotX: 70, rotY: 0 });
  const transform = `perspective(500px) rotateX(${view.rotX}deg) translateZ(${-view.zoom * 100}px) rotateY(${view.rotY}deg)`;

  if (loading) return <div className="w-full h-full flex items-center justify-center bg-black"><div className="text-center"><div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-gray-400">Harita yükleniyor...</p></div></div>;

  return (
    <div ref={ref} className="w-full h-full relative overflow-hidden bg-black">
      {/* TERRAIN LAYER */}
      <div className="absolute inset-0 transition-all duration-300" style={{ transform, transformOrigin: '50% 50%' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 120% 80% at 50% 120%, #14321a 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 30% 70%, #0f2a14 0%, transparent 40%), linear-gradient(180deg, #0a1a0a 0%, #050f05 100%)' }} />
        
        {/* Roads */}
        <Road x1={0} y1={30} x2={100} y2={30} w={1.5} />
        <Road x1={0} y1={50} x2={100} y2={50} w={1.2} />
        <Road x1={25} y1={0} x2={25} y2={100} w={1} />
        <Road x1={50} y1={0} x2={50} y2={100} w={1.5} />
        
        {/* Parks */}
        <Park x={5} y={5} r={8} />
        <Park x={60} y={10} r={6} />
        <Park x={40} y={70} r={10} />
        
        {/* Buildings */}
        <Building x={10} y={15} w={8} h={6} z={3} />
        <Building x={25} y={20} w={6} h={8} z={4} />
        <Building x={40} y={12} w={10} h={5} z={2} />
        <Building x={55} y={25} w={7} h={7} z={3} />
        <Building x={70} y={18} w={9} h={6} z={2} />
        <Building x={15} y={35} w={5} h={5} z={2} />
        <Building x={30} y={40} w={8} h={4} z={1} />
        <Building x={50} y={38} w={6} h={6} z={2} />
        <Building x={65} y={42} w={7} h={5} z={1} />
        <Building x={80} y={35} w={10} h={7} z={3} />
        
        {/* Trees */}
        {[...Array(25)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 bg-green-800/50 rounded-full" style={{ left: `${5 + (i * 3.8) % 90}%`, top: `${5 + (i * 2.7) % 90}%` }} />
        ))}
        
        {/* Grid */}
        <div className="absolute inset-0 opacity-15">
          {[...Array(20)].map((_, i) => <div key={i} className="absolute w-full h-px bg-green-800" style={{ top: `${(i + 1) * 5}%` }} />)}
          {[...Array(20)].map((_, i) => <div key={i} className="absolute h-full w-px bg-green-800" style={{ left: `${(i + 1) * 5}%` }} />)}
        </div>
      </div>
      
      {/* Parcel */}
      {parcel && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative" style={{ transform: `scale(${view.zoom * 2.5})` }}>
            <div className="absolute -inset-6 border border-red-600/30 rounded-lg animate-ping" />
            <div className="w-32 h-24 border-2 border-red-600 rounded-lg" style={{ boxShadow: '0 0 25px rgba(239,68,68,0.6)' }} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.6)]" />
      </div>
      
      {/* Top-Left */}
      <div className="absolute top-4 left-4">
        <div className="bg-black/80 px-3 py-2 rounded-lg border border-red-600/30">
          <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /><span className="text-red-500 uppercase">Drone View</span></div>
          <p className="text-xs text-gray-400 mt-1 font-mono">{parcel ? `${parcel.center[1].toFixed(5)}, ${parcel.center[0].toFixed(5)}` : 'Bekleniyor'}</p>
        </div>
      </div>
      
      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button onClick={zIn} className="w-9 h-9 bg-red-600/80 hover:bg-red-500 rounded-lg flex items-center justify-center font-bold text-lg">+</button>
        <button onClick={zOut} className="w-9 h-9 bg-red-600/80 hover:bg-red-500 rounded-lg flex items-center justify-center text-lg">−</button>
        <button onClick={rotR} className="w-9 h-9 bg-red-600/80 hover:bg-red-500 rounded-lg flex items-center justify-center">↻</button>
        <button onClick={rotL} className="w-9 h-9 bg-red-600/80 hover:bg-red-500 rounded-lg flex items-center justify-center transform scale-x-[-1]">↻</button>
        <button onClick={reset} className="w-9 h-9 bg-red-600/80 hover:bg-red-500 rounded-lg flex items-center justify-center text-xs">RST</button>
      </div>
      
      {/* Coords */}
      {parcel && (
        <div className="absolute bottom-4 left-4 bg-black/80 px-3 py-2 rounded-lg text-xs font-mono">
          <p><span className="text-gray-500">LAT:</span> <span className="text-green-500">{parcel.center[1].toFixed(6)}°N</span></p>
          <p><span className="text-gray-500">LNG:</span> <span className="text-green-500">{parcel.center[0].toFixed(6)}°E</span></p>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black/80 px-3 py-2 rounded-lg text-xs">
        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 bg-red-600 rounded-sm" /><span className="text-gray-400">Parsel</span></div>
        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 bg-green-950 border border-green-800" /><span className="text-gray-400">Bina</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-gray-800" /><span className="text-gray-400">Yol</span></div>
      </div>
    </div>
  );
}