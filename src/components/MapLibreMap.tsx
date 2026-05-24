"use client";

import { useEffect, useRef } from "react";

interface MapLibreMapProps {
  centerLat: number;
  centerLon: number;
  polygonCoordinates: number[][];
}

export default function MapLibreMap({
  centerLat,
  centerLon,
  polygonCoordinates,
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRendered = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasRendered.current) return;
    
    const timer = setTimeout(() => {
      try {
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        const width = container.clientWidth || 600;
        const height = container.clientHeight || 400;
        
        container.innerHTML = "";
        
        const canvas = window.document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.style.cssText = "width:100%;height:100%;display:block;";
        container.appendChild(canvas);
        
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#1e3a5f");
        gradient.addColorStop(1, "#0f2744");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = "#2a4a6f";
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 50) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, height);
          ctx.stroke();
        }
        for (let i = 0; i < height; i += 50) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(width, i);
          ctx.stroke();
        }
        
        if (polygonCoordinates.length > 0) {
          // Calculate bounds
          let minLon = Infinity, maxLon = -Infinity;
          let minLat = Infinity, maxLat = -Infinity;
          polygonCoordinates.forEach(([lon, lat]) => {
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          });
          
          // Add padding
          minLon -= 0.002;
          maxLon += 0.002;
          minLat -= 0.002;
          maxLat += 0.002;
          
          // Transform functions
          const toX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * width;
          const toY = (lat: number) => height - ((lat - minLat) / (maxLat - minLat)) * height;
          
          // Draw polygon
          ctx.beginPath();
          polygonCoordinates.forEach(([lon, lat], i) => {
            const x = toX(lon);
            const y = toY(lat);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
          ctx.fill();
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw center marker
          const cx = toX(centerLon);
          const cy = toY(centerLat);
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.fillStyle = "#06b6d4";
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw text
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${centerLat.toFixed(4)}, ${centerLon.toFixed(4)}`, width / 2, 20);
          ctx.font = "11px sans-serif";
          ctx.fillStyle = "#94a3b8";
          ctx.fillText("Parsel Haritasi", width / 2, height - 10);
        }
        
        hasRendered.current = true;
      } catch (err) {
        console.error("Map render error:", err);
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [centerLat, centerLon, polygonCoordinates]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full" 
      style={{ minHeight: "400px", background: "#0f2744" }} 
    />
  );
}
