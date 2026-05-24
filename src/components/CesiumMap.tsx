"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamic import for MapLibre to avoid SSR issues
const MapLibreMap = dynamic(() => import("./MapLibreMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-card rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-white text-sm">Harita yükleniyor...</p>
      </div>
    </div>
  ),
});

interface ParcelMapProps {
  centerLat: number;
  centerLon: number;
  polygonCoordinates: number[][];
  properties?: {
    Il?: string;
    Ilce?: string;
    Mahalle?: string;
    Ada?: string;
    ParselNo?: string;
    Alan?: string;
    Nitelik?: string;
  };
  pois?: PoiItem[];
  height?: number;
  onLoad?: () => void;
}

interface PoiItem {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  distance?: string;
}

export default function ParcelMap({ 
  centerLat, 
  centerLon, 
  polygonCoordinates, 
  properties,
  pois = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  height = 300,
}: ParcelMapProps) {
  const [mapError, setMapError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Validate coordinates
  const isValidCoordinates = polygonCoordinates && 
    polygonCoordinates.length > 0 && 
    polygonCoordinates.every(coord => 
      Array.isArray(coord) && 
      coord.length >= 2 && 
      typeof coord[0] === 'number' && 
      typeof coord[1] === 'number' &&
      !isNaN(coord[0]) && 
      !isNaN(coord[1])
    );

  // Validate center coordinates
  const isValidCenter = typeof centerLat === 'number' && 
    typeof centerLon === 'number' && 
    !isNaN(centerLat) && 
    !isNaN(centerLon) &&
    centerLat >= -90 && centerLat <= 90 &&
    centerLon >= -180 && centerLon <= 180;

  if (!isValidCenter) {
    return (
      <div className="w-full h-full min-h-[300px] bg-card rounded-2xl overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-white font-bold mb-2">Geçersiz Koordinat</h3>
          <p className="text-muted text-sm">Harita için geçerli koordinat bilgisi bulunamadı.</p>
        </div>
      </div>
    );
  }

  if (!isValidCoordinates) {
    return (
      <div className="w-full h-full min-h-[300px] bg-card rounded-2xl overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h3 className="text-white font-bold mb-2">Parsel Verisi Yok</h3>
          <p className="text-muted text-sm">GeoJSON parsel bilgisi yüklenemedi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full min-h-[500px] bg-card rounded-2xl overflow-hidden ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      <MapLibreMap
        centerLat={centerLat}
        centerLon={centerLon}
        polygonCoordinates={polygonCoordinates}
      />
      
      {/* Error overlay */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-sm z-20">
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-white font-bold mb-2">Harita Hatası</h3>
            <p className="text-muted text-sm mb-4">{mapError}</p>
            <button 
              onClick={() => setMapError(null)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Top info bar */}
      {properties && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium text-sm">
                  {[properties.Il, properties.Ilce, properties.Mahalle].filter(Boolean).join(" ")}
                </p>
                <p className="text-white/60 text-xs">
                  {[properties.Ada && `${properties.Ada} Ada`, properties.ParselNo && `${properties.ParselNo} Parsel`].filter(Boolean).join(" ")}
                </p>
              </div>
              {properties.Alan && (
                <div className="text-right">
                  <p className="text-primary text-xs">Alan</p>
                  <p className="text-white text-sm font-mono">{parseFloat(properties.Alan).toLocaleString("tr-TR")} m²</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="bg-black/50 backdrop-blur-sm p-2 rounded-lg hover:bg-black/70 transition-colors"
          title="Tam ekran"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-white text-xs">Parsel Aktif</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs">
              {centerLat.toFixed(4)}, {centerLon.toFixed(4)}
            </span>
            {pois.length > 0 && (
              <>
                <span className="text-white/30">|</span>
                <span className="text-cyan-400 text-xs">{pois.length} POI</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}