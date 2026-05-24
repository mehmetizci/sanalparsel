/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

interface MapLibreMapProps {
  centerLat: number;
  centerLon: number;
  polygonCoordinates: number[][];
  onLoad?: () => void;
}

export default function MapLibreMap({
  centerLat,
  centerLon,
  polygonCoordinates,
  onLoad
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const drawMap = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 500;

      // Clear container
      container.innerHTML = "";

      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.style.cssText = "width:100%;height:100%;display:block;";
      container.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsLoading(false);
        return;
      }

      // Calculate bounds from polygon
      if (polygonCoordinates.length > 0) {
        let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
        polygonCoordinates.forEach(([lon, lat]) => {
          minLon = Math.min(minLon, lon);
          maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });

        // Add padding
        const padding = 0.003;
        minLon -= padding;
        maxLon += padding;
        minLat -= padding;
        maxLat += padding;

        // Helper functions
        const toCanvasX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * width;
        const toCanvasY = (lat: number) => height - ((lat - minLat) / (maxLat - minLat)) * height;

        // Draw background gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, "#1a365d");
        bgGradient.addColorStop(1, "#2d3748");
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = "#3d4a5c";
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Draw polygon
        ctx.beginPath();
        polygonCoordinates.forEach(([lon, lat], i) => {
          const x = toCanvasX(lon);
          const y = toCanvasY(lat);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        
        // Fill polygon with semi-transparent red
        ctx.fillStyle = "rgba(220, 38, 38, 0.4)";
        ctx.fill();
        
        // Draw polygon outline
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw center marker
        const cx = toCanvasX(centerLon);
        const cy = toCanvasY(centerLat);
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fillStyle = "#06b6d4";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw coordinates text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${centerLat.toFixed(4)}, ${centerLon.toFixed(4)}`, width / 2, 30);
        
        ctx.font = "12px system-ui, sans-serif";
        ctx.fillStyle = "#a0aec0";
        ctx.fillText("Parsel Haritasi", width / 2, height - 20);
      }

      setIsLoading(false);
      onLoad?.();
    };

    // Delay to ensure container has rendered
    const timer = setTimeout(drawMap, 200);
    return () => clearTimeout(timer);
  }, [centerLat, centerLon, polygonCoordinates, onLoad]);

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ minHeight: "500px" }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card rounded-2xl z-10">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-white/70 text-sm">Harita yukleniyor...</p>
          </div>
        </div>
      )}
    </div>
  );
}
