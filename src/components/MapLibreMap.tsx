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

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const render = () => {
      if (!containerRef.current) return;
      
      const el = containerRef.current;
      const w = el.clientWidth || 600;
      const h = el.clientHeight || 400;
      
      // Calculate bounds
      if (polygonCoordinates.length === 0) return;
      
      let minLon = Infinity, maxLon = -Infinity;
      let minLat = Infinity, maxLat = -Infinity;
      polygonCoordinates.forEach(([lon, lat]) => {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });
      
      minLon -= 0.005;
      maxLon += 0.005;
      minLat -= 0.005;
      maxLat += 0.005;
      
      const toX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * w;
      const toY = (lat: number) => h - ((lat - minLat) / (maxLat - minLat)) * h;
      
      // Build polygon path
      const pathPoints = polygonCoordinates.map(([lon, lat], i) => {
        const x = toX(lon);
        const y = toY(lat);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      }).join(" ");
      const pathD = pathPoints + "Z";
      
      // Center marker
      const cx = toX(centerLon);
      const cy = toY(centerLat);
      
      el.innerHTML = `
        <svg width="${w}" height="${h}" style="display:block;width:100%;height:100%;">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1e3a5f"/>
              <stop offset="100%" stop-color="#0f2744"/>
            </linearGradient>
          </defs>
          <rect width="${w}" height="${h}" fill="url(#bg)"/>
          <g stroke="#2a4a6f" stroke-width="1">
            ${Array.from({length: Math.ceil(w/50)}, (_, i) => `<line x1="${i*50}" y1="0" x2="${i*50}" y2="${h}"/>`).join("")}
            ${Array.from({length: Math.ceil(h/50)}, (_, i) => `<line x1="0" y1="${i*50}" x2="${w}" y2="${i*50}"/>`).join("")}
          </g>
          <path d="${pathD}" fill="rgba(239,68,68,0.3)" stroke="#ef4444" stroke-width="2"/>
          <circle cx="${cx}" cy="${cy}" r="8" fill="#06b6d4" stroke="#fff" stroke-width="2"/>
          <text x="${w/2}" y="20" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">${centerLat.toFixed(4)}, ${centerLon.toFixed(4)}</text>
          <text x="${w/2}" y="${h-10}" text-anchor="middle" fill="#94a3b8" font-size="11">Parsel Haritasi</text>
        </svg>
      `;
    };
    
    const timer = setTimeout(render, 300);
    const observer = new ResizeObserver(render);
    if (containerRef.current) observer.observe(containerRef.current);
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [centerLat, centerLon, polygonCoordinates]);

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: "400px" }} />;
}
