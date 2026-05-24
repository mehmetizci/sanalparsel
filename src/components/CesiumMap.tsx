"use client";

import { useState } from "react";

interface CesiumMapProps {
  centerLat: number;
  centerLon: number;
  polygonCoordinates: number[][];
  onLoad?: () => void;
}

export default function CesiumMap({ centerLat, centerLon, polygonCoordinates, onLoad }: CesiumMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="relative w-full h-full min-h-[300px] bg-card rounded-2xl overflow-hidden">
      {/* Map Placeholder - Cesium integration will be added */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center p-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h3 className="text-white font-bold mb-2">Harita Önizleme</h3>
          <p className="text-muted text-sm">
            Koordinat: {centerLat.toFixed(6)}, {centerLon.toFixed(6)}
          </p>
          <p className="text-muted text-xs mt-1">
            {polygonCoordinates.length} nokta
          </p>
        </div>
      </div>
      
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="glass p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Tam ekran"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          onClick={onLoad}
          className="glass p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Yenile"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      <div className="absolute bottom-4 left-4 right-4">
        <div className="glass rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-white text-sm font-medium">Parsel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-success text-xs">Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
}