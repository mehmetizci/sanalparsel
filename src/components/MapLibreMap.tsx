/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface MapLibreMapProps {
  centerLat: number;
  centerLon: number;
  polygonCoordinates: number[][];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pois?: Array<{
    id: string;
    name: string;
    type: string;
    lat: number;
    lon: number;
    distance?: string;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  height?: number;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export default function MapLibreMap({
  centerLat,
  centerLon,
  polygonCoordinates,
  onLoad
}: MapLibreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const initMap = async () => {
      try {
        console.log("MapLibreMap: Starting initialization...");
        console.log("MapLibreMap: centerLat:", centerLat, "centerLon:", centerLon);
        console.log("MapLibreMap: polygonCoordinates:", polygonCoordinates);
        
        // Dynamic import MapLibre
        const maplibregl = (await import("maplibre-gl")).default;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await import("maplibre-gl/dist/maplibre-gl.css");

        if (!mapContainerRef.current) return;

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {
              'osm': {
                type: 'raster',
                tiles: [
                  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                ],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
              }
            },
            layers: [
              {
                id: 'osm',
                type: 'raster',
                source: 'osm',
                minzoom: 0,
                maxzoom: 19
              }
            ]
          },
          center: [centerLon, centerLat],
          zoom: 15,
          maxZoom: 19,
          minZoom: 3
        });

        mapInstanceRef.current = map;

        map.on('load', () => {
          console.log("MapLibreMap: Map loaded, adding polygon layer...");

          const geojsonCoords = polygonCoordinates.length > 0 
            ? polygonCoordinates 
            : [[centerLon, centerLat]];
          
          // Close the polygon if not already closed
          const closedCoords = [...geojsonCoords];
          if (geojsonCoords.length > 0) {
            const first = geojsonCoords[0];
            const last = geojsonCoords[geojsonCoords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
              closedCoords.push([...first]);
            }
          }

          map.addSource('parcel', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [closedCoords]
              },
              properties: {}
            }
          });

          map.addLayer({
            id: 'parcel-fill',
            type: 'fill',
            source: 'parcel',
            paint: {
              'fill-color': '#dc2626',
              'fill-opacity': 0.3
            }
          });

          map.addLayer({
            id: 'parcel-outline',
            type: 'line',
            source: 'parcel',
            paint: {
              'line-color': '#dc2626',
              'line-width': 3
            }
          });

          // Add center marker
          const markerEl = document.createElement('div');
          markerEl.innerHTML = `<div style="width:20px;height:20px;background:#06b6d4;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`;
          
          new maplibregl.Marker({ element: markerEl })
            .setLngLat([centerLon, centerLat])
            .addTo(map);

          if (polygonCoordinates.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            polygonCoordinates.forEach(coord => {
              bounds.extend([coord[0], coord[1]]);
            });
            map.fitBounds(bounds, { padding: 50 });
          }

          console.log("MapLibreMap: Polygon added successfully");
          setIsLoaded(true);
          setUseFallback(false);
          onLoad?.();
        });

        map.on('error', (e: any) => {
          console.error("MapLibreMap: Map error:", e);
          setUseFallback(true);
        });

      } catch (error) {
        console.error("MapLibreMap: Initialization error:", error);
        setUseFallback(true);
        setIsLoaded(true);
        onLoad?.();
      }
    };

    // Small delay to ensure client-side rendering
    const timer = setTimeout(initMap, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Map cleanup error:", e);
        }
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLon]);

  // Canvas fallback renderer
  const renderFallback = useCallback(() => {
    if (!mapContainerRef.current) return;
    
    const container = mapContainerRef.current;
    container.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth || 800;
    canvas.height = container.clientHeight || 500;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a365d');
    gradient.addColorStop(1, '#2d3748');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;
    const gridSize = 40;
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

    // Draw polygon
    if (polygonCoordinates.length > 0) {
      const coords = polygonCoordinates;
      
      // Calculate bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      coords.forEach(coord => {
        minX = Math.min(minX, coord[0]);
        maxX = Math.max(maxX, coord[0]);
        minY = Math.min(minY, coord[1]);
        maxY = Math.max(maxY, coord[1]);
      });

      const scaleX = (canvas.width - 100) / (maxX - minX || 0.01);
      const scaleY = (canvas.height - 100) / (maxY - minY || 0.01);
      const scale = Math.min(scaleX, scaleY);
      
      const offsetX = (canvas.width - (maxX - minX) * scale) / 2 - minX * scale;
      const offsetY = (canvas.height - (maxY - minY) * scale) / 2 - minY * scale;

      // Transform coordinates to screen space
      const toScreen = (lon: number, lat: number) => ({
        x: lon * scale + offsetX,
        y: canvas.height - (lat * scale + offsetY)
      });

      // Draw filled polygon
      ctx.beginPath();
      coords.forEach((coord, i) => {
        const { x, y } = toScreen(coord[0], coord[1]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(220, 38, 38, 0.4)';
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw center point
      const center = toScreen(centerLon, centerLat);
      ctx.beginPath();
      ctx.arc(center.x, center.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw coordinates info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`📍 ${centerLat.toFixed(5)}, ${centerLon.toFixed(5)}`, canvas.width / 2, 30);
    ctx.font = '14px system-ui';
    ctx.fillStyle = '#a0aec0';
    ctx.fillText('Parsel Haritası (Statik Görüntü)', canvas.width / 2, canvas.height - 20);
  }, [centerLat, centerLon, polygonCoordinates]);

  useEffect(() => {
    if (useFallback && mapContainerRef.current) {
      renderFallback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useFallback, polygonCoordinates]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '500px' }} />

      {!isLoaded && !useFallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm z-10">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white text-sm">Harita yükleniyor...</p>
          </div>
        </div>
      )}
    </div>
  );
}
