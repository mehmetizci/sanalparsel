/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

interface MapLibreMapProps {
  centerLat: number;
  centerLon: number;
  polygonCoordinates: number[][];
  pois?: Array<{
    id: string;
    name: string;
    type: string;
    lat: number;
    lon: number;
    distance?: string;
  }>;
  height?: number;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export default function MapLibreMap({
  centerLat,
  centerLon,
  polygonCoordinates,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pois = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  height = 300,
  onLoad,
  onError
}: MapLibreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) {
      return;
    }

    const initMap = async () => {
      try {
        console.log("MapLibreMap: Starting initialization...");
        
        const container = mapContainerRef.current;
        if (!container) return;
        
        const canvas = document.createElement("canvas");
        canvas.width = container.clientWidth || 800;
        canvas.height = container.clientHeight || 400;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        container.appendChild(canvas);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error("MapLibreMap: Could not get 2D context");
          onError?.("Canvas 2D context not available");
          return;
        }

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#1a365d");
        gradient.addColorStop(1, "#2d3748");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "#3182ce";
        ctx.lineWidth = 1;
        const gridSize = 50;
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        const coordsToDraw = polygonCoordinates;
        if (coordsToDraw && coordsToDraw.length > 0) {
          const scaleX = canvas.width / 0.01;
          const scaleY = canvas.height / 0.01;
          const offsetX = canvas.width / 2 - centerLon * scaleX + 2700000;
          const offsetY = canvas.height / 2 + centerLat * scaleY - 4200000;

          ctx.beginPath();
          coordsToDraw.forEach((coord, i) => {
            const x = coord[0] * scaleX + offsetX;
            const y = canvas.height - (coord[1] * scaleY + offsetY);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fillStyle = "rgba(220, 38, 38, 0.3)";
          ctx.fill();
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = 3;
          ctx.stroke();

          const centerX = centerLon * scaleX + offsetX;
          const centerY = canvas.height - (centerLat * scaleY + offsetY);
          ctx.beginPath();
          ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
          ctx.fillStyle = "#06b6d4";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "14px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("📍 " + centerLat.toFixed(4) + ", " + centerLon.toFixed(4), canvas.width / 2, 30);
        ctx.fillText("Demo Parsel", canvas.width / 2, canvas.height - 20);

        console.log("MapLibreMap: Canvas map created successfully");
        setIsLoaded(true);
        onLoad?.();

      } catch (error) {
        console.error("MapLibreMap: Initialization error:", error);
        onError?.("Harita başlatılamadı: " + String(error));
      }
    };

    const timer = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLon, polygonCoordinates]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white text-sm">Harita yükleniyor...</p>
          </div>
        </div>
      )}
    </div>
  );
}
