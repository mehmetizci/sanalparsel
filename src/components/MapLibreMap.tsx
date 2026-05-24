/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) {
      return;
    }

    // Destroy existing map if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const initMap = async () => {
      try {
        console.log("MapLibreMap: Starting initialization...");
        
        const map = new maplibregl.Map({
          container: mapContainerRef.current!,
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

        mapRef.current = map;

        map.on('load', () => {
          console.log("MapLibreMap: Map loaded, adding polygon layer...");

          // Add GeoJSON source
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

          // Add fill layer
          map.addLayer({
            id: 'parcel-fill',
            type: 'fill',
            source: 'parcel',
            paint: {
              'fill-color': '#dc2626',
              'fill-opacity': 0.3
            }
          });

          // Add outline layer
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
          markerEl.innerHTML = `
            <div style="
              width: 20px;
              height: 20px;
              background: #06b6d4;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
          `;
          
          new maplibregl.Marker({ element: markerEl })
            .setLngLat([centerLon, centerLat])
            .addTo(map);

          // Fit bounds to polygon
          if (polygonCoordinates.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            polygonCoordinates.forEach(coord => {
              bounds.extend([coord[0], coord[1]]);
            });
            map.fitBounds(bounds, { padding: 50 });
          }

          console.log("MapLibreMap: Polygon added successfully");
          setIsLoaded(true);
          onLoad?.();
        });

        map.on('error', (e) => {
          console.error("MapLibreMap: Map error:", e);
          onError?.("Harita yüklenemedi: " + e.error?.message);
        });

      } catch (error) {
        console.error("MapLibreMap: Initialization error:", error);
        onError?.("Harita başlatılamadı: " + String(error));
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLon]);

  // Update polygon when coordinates change
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const updatePolygon = () => {
      const map = mapRef.current!;
      if (!map.getSource('parcel')) return;

      const geojsonCoords = polygonCoordinates.length > 0 
        ? polygonCoordinates 
        : [[centerLon, centerLat]];
      
      const closedCoords = [...geojsonCoords];
      if (geojsonCoords.length > 0) {
        const first = geojsonCoords[0];
        const last = geojsonCoords[geojsonCoords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          closedCoords.push([...first]);
        }
      }

      (map.getSource('parcel') as any).setData({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [closedCoords]
        },
        properties: {}
      });

      // Fit bounds
      if (polygonCoordinates.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        polygonCoordinates.forEach(coord => {
          bounds.extend([coord[0], coord[1]]);
        });
        map.fitBounds(bounds, { padding: 50 });
      }
    };

    updatePolygon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygonCoordinates, isLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '500px' }} />

      {!isLoaded && (
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
