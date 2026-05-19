'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection } from 'geojson';
import { DEFAULT_MAP_STYLE } from '@/lib/constants';

interface MapViewProps {
  geojson?: FeatureCollection | null;
  center?: [number, number] | null;
  zoom?: number;
  className?: string;
  interactive?: boolean;
  onMapReady?: (map: maplibregl.Map) => void;
}

export function MapView({
  geojson,
  center,
  zoom = 14,
  className = '',
  interactive = true,
  onMapReady,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const addParcelLayer = useCallback((map: maplibregl.Map, data: FeatureCollection) => {
    if (map.getSource('parcel')) {
      (map.getSource('parcel') as maplibregl.GeoJSONSource).setData(data);
      return;
    }

    map.addSource('parcel', { type: 'geojson', data });

    map.addLayer({
      id: 'parcel-fill',
      type: 'fill',
      source: 'parcel',
      paint: {
        'fill-color': '#22c55e',
        'fill-opacity': 0.15,
      },
    });

    map.addLayer({
      id: 'parcel-border',
      type: 'line',
      source: 'parcel',
      paint: {
        'line-color': '#22c55e',
        'line-width': 3,
        'line-opacity': 1,
        'line-dasharray': [2, 2],
      },
    });

    map.addLayer({
      id: 'parcel-border-glow',
      type: 'line',
      source: 'parcel',
      paint: {
        'line-color': '#4ade80',
        'line-width': 6,
        'line-opacity': 0.3,
        'line-blur': 2,
        'line-dasharray': [2, 2],
      },
    });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DEFAULT_MAP_STYLE,
      center: center || [29.0, 41.0],
      zoom,
      interactive,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      if (geojson) {
        addParcelLayer(map, geojson);
      }
      onMapReady?.(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;

    if (map.isStyleLoaded()) {
      addParcelLayer(map, geojson);
    } else {
      map.on('load', () => addParcelLayer(map, geojson));
    }
  }, [geojson, addParcelLayer]);

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.flyTo({ center, zoom, duration: 2000 });
    }
  }, [center, zoom]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full rounded-xl overflow-hidden ${className}`}
    />
  );
}
