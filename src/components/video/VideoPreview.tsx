'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection } from 'geojson';
import type { ConsultantProfile, DroneSettings, NearbyPlace } from '@/types';
import { NearbyPlacesOverlay } from '@/components/overlays/NearbyPlaces';
import { ConsultantOverlay } from '@/components/overlays/ConsultantOverlay';
import { DEFAULT_MAP_STYLE } from '@/lib/constants';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface VideoPreviewProps {
  geojson: FeatureCollection;
  center: [number, number];
  droneSettings: DroneSettings;
  consultantProfile: Partial<ConsultantProfile>;
  nearbyPlaces: NearbyPlace[];
  parcelName: string;
}

export function VideoPreview({
  geojson,
  center,
  droneSettings,
  consultantProfile,
  nearbyPlaces,
  parcelName,
}: VideoPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOverlays, setShowOverlays] = useState(false);

  const addParcelLayer = useCallback((map: maplibregl.Map) => {
    if (map.getSource('parcel')) return;

    map.addSource('parcel', { type: 'geojson', data: geojson });

    map.addLayer({
      id: 'parcel-fill',
      type: 'fill',
      source: 'parcel',
      paint: { 'fill-color': '#dc2626', 'fill-opacity': 0.25 },
    });

    map.addLayer({
      id: 'parcel-border',
      type: 'line',
      source: 'parcel',
      paint: { 'line-color': '#dc2626', 'line-width': 3 },
    });
  }, [geojson]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DEFAULT_MAP_STYLE,
      center,
      zoom: 14,
      pitch: 45,
      bearing: 0,
      interactive: false,
      attributionControl: false,
    });

    map.on('load', () => addParcelLayer(map));
    mapRef.current = map;

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateDrone = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const totalDuration = droneSettings.duration * 1000;
    const startTime = performance.now();
    setShowOverlays(true);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / totalDuration, 1);
      setProgress(t * 100);

      const phases = [
        { start: 0, end: 0.25, heading: 45, pitch: -30, zoom: 15 },
        { start: 0.25, end: 0.5, heading: 225, pitch: -30, zoom: 15.5 },
        { start: 0.5, end: 0.75, heading: 0, pitch: -60, zoom: 16 },
        { start: 0.75, end: 1.0, heading: 90, pitch: -15, zoom: 14.5 },
      ];

      const currentPhase = phases.find(
        (p) => t >= p.start && t < p.end
      ) || phases[phases.length - 1];

      const phaseT =
        (t - currentPhase.start) / (currentPhase.end - currentPhase.start);
      const eased = 0.5 - Math.cos(phaseT * Math.PI) / 2;

      const prevPhase =
        phases[phases.indexOf(currentPhase) - 1] || currentPhase;

      map.jumpTo({
        center,
        bearing: prevPhase.heading + (currentPhase.heading - prevPhase.heading) * eased,
        pitch: prevPhase.pitch + (currentPhase.pitch - prevPhase.pitch) * eased,
        zoom:
          (prevPhase.zoom || 15) +
          ((currentPhase.zoom || 15) - (prevPhase.zoom || 15)) * eased,
      });

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [center, droneSettings.duration]);

  const handlePlay = () => {
    if (isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    setProgress(0);
    animateDrone();
  };

  const handleReset = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsPlaying(false);
    setProgress(0);
    setShowOverlays(false);
    mapRef.current?.jumpTo({
      center,
      zoom: 14,
      pitch: 45,
      bearing: 0,
    });
  };

  return (
    <div className="flex justify-center w-full">
      {/* 1080x1920 portrait container (9:16 aspect ratio) */}
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border" style={{ width: '1080px', aspectRatio: '9/16' }}>
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Title overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
          <div className="glass rounded-xl px-4 py-2">
            <p className="text-xs text-muted">PARSEL</p>
            <p className="text-sm font-semibold text-white">{parcelName || 'İsimsiz Parsel'}</p>
          </div>
          <div className="glass rounded-xl px-3 py-1.5">
            <p className="text-xs text-primary font-mono">
              {droneSettings.altitude}m | {droneSettings.duration}s
            </p>
          </div>
        </div>

        {/* Nearby places - left side */}
        {showOverlays && nearbyPlaces.length > 0 && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-32 pointer-events-none">
            <NearbyPlacesOverlay places={nearbyPlaces} animated />
          </div>
        )}

        {/* Consultant overlay - bottom right */}
        {showOverlays && consultantProfile.fullName && (
          <div className="absolute bottom-16 right-4 pointer-events-none">
            <ConsultantOverlay profile={consultantProfile} animated />
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 left-4 right-4">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePlay}
              className="glass border-0"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              className="glass border-0"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <span className="text-xs text-white/60 ml-2">
              {Math.round((progress / 100) * droneSettings.duration)}s / {droneSettings.duration}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
