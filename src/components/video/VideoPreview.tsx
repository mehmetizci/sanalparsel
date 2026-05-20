'use client';

import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Download, Share2, 
  Building2, GraduationCap, ShoppingCart, Palmtree, Store, ChevronLeft, ChevronRight, X
} from 'lucide-react';

interface VideoPreviewProps {
  parcelName?: string;
  geoJson?: any;
  parcelProps?: {
    Il?: string;
    Ilce?: string;
    Mahalle?: string;
    Ada?: string;
    ParselNo?: string;
    Alan?: string;
    Mevkii?: string;
    Nitelik?: string;
  };
  branding?: {
    showProfilePhoto: boolean;
    showFullName: boolean;
    showPhoneNumber: boolean;
    showCompanyName: boolean;
    showOfficeAddress: boolean;
    showAuthorizationCertificate: boolean;
    showLogo: boolean;
  };
  consultant?: {
    fullName?: string;
    phone?: string;
    companyName?: string;
    officeAddress?: string;
    certificateNumber?: string;
  };
  settings?: {
    duration: 30 | 45 | 60;
    altitude: number;
  };
}

// Default sample GeoJSON (Hacıveli 467)
const SAMPLE_GEOJSON = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [26.85749, 38.66965], [26.85725, 38.66916], [26.85733, 38.66911],
        [26.85739, 38.66905], [26.85753, 38.66895], [26.85764, 38.66889],
        [26.85778, 38.66882], [26.85789, 38.66878], [26.85793, 38.66887],
        [26.85799, 38.66897], [26.85807, 38.66911], [26.85829, 38.66955],
        [26.85845, 38.66951], [26.85846, 38.66954], [26.85847, 38.66956],
        [26.85851, 38.66962], [26.85862, 38.66982], [26.85843, 38.66987],
        [26.85804, 38.66999], [26.85785, 38.67003], [26.85783, 38.66996],
        [26.85781, 38.66991], [26.85776, 38.66988], [26.85773, 38.66986],
        [26.85757, 38.6699], [26.85749, 38.66965]
      ]]
    },
    properties: {
      ParselNo: '467',
      Mahalle: 'Hacıveli',
      Ilce: 'Foça',
      Il: 'İzmir',
      Ada: '506130',
      Alan: '8.656,88',
      Mevkii: 'Camilimağara',
      Nitelik: 'Kule Ve Beş Zeytinli Tarla'
    }
  }]
};

// Environment places
const ENV_PLACES = [
  { name: 'Foça Devlet Hastanesi', type: 'hospital', distance: 4.2, icon: Building2, color: 'text-red-500' },
  { name: 'Hacıveli İlkokulu', type: 'school', distance: 1.8, icon: GraduationCap, color: 'text-blue-500' },
  { name: 'A101 Market', type: 'market', distance: 0.9, icon: ShoppingCart, color: 'text-green-500' },
  { name: 'İzmir-Çeşme Otoyolu', type: 'highway', distance: 5.5, icon: Palmtree, color: 'text-yellow-500' },
  { name: 'Foça Plajı', type: 'beach', distance: 3.2, icon: Store, color: 'text-cyan-500' },
];

// Easing functions
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function VideoPreview({ 
  parcelName, 
  geoJson,
  parcelProps, 
  branding = { showProfilePhoto: true, showFullName: true, showPhoneNumber: true, showCompanyName: false, showOfficeAddress: false, showAuthorizationCertificate: false, showLogo: false },
  consultant = { fullName: 'Ahmet Yılmaz', phone: '+90 532 123 45 67', companyName: 'XYZ Gayrimenkul' },
  settings = { duration: 30, altitude: 150 }
}: VideoPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [cameraInfo, setCameraInfo] = useState({ zoom: 12, pitch: 45, bearing: 0, alt: 500 });
  const animationRef = useRef<number>(0);
  const startTime = useRef<number>(0);
  
  const duration = settings.duration || 30;
  const geoData = geoJson || SAMPLE_GEOJSON;
  const parcelProperties = geoData.features?.[0]?.properties || parcelProps || {};

  // Get centroid from GeoJSON
  const getCentroid = (gj: any) => {
    const coords: number[][] = [];
    const features = gj.features || [];
    for (const f of features) {
      if (f.geometry?.type === 'Polygon' && f.geometry.coordinates?.[0]) {
        coords.push(...f.geometry.coordinates[0]);
      }
    }
    if (coords.length === 0) return [26.857, 38.669];
    const lngs = coords.map(c => c[0]), lats = coords.map(c => c[1]);
    return [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
  };

  const centroid = getCentroid(geoData);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '© Esri'
          }
        },
        layers: [{ id: 'satellite', type: 'raster', source: 'esri-satellite', minzoom: 0, maxzoom: 19 }]
      },
      center: centroid as [number, number],
      zoom: 16,
      pitch: 45,
      bearing: 0,
      interactive: true
    });

    map.current.on('load', () => {
      if (!map.current) return;
      setMapLoaded(true);

      // Add GeoJSON source
      map.current.addSource('parcel', { type: 'geojson', data: geoData });

      // Fill layer
      map.current.addLayer({
        id: 'parcel-fill',
        type: 'fill',
        source: 'parcel',
        paint: { 'fill-color': 'rgba(255, 0, 0, 0.1)', 'fill-outline-color': 'rgba(255, 0, 0, 0.3)' }
      });

      // Line layer
      map.current.addLayer({
        id: 'parcel-line',
        type: 'line',
        source: 'parcel',
        paint: { 'line-color': '#FF0000', 'line-width': 3, 'line-opacity': 0.9 }
      });

      // Fit bounds
      const bounds = new maplibregl.LngLatBounds();
      for (const f of geoData.features || []) {
        if (f.geometry?.type === 'Polygon' && f.geometry.coordinates?.[0]) {
          for (const c of f.geometry.coordinates[0]) bounds.extend(c as [number, number]);
        }
      }
      map.current.fitBounds(bounds, { padding: 100, maxZoom: 16, duration: 0 });

      // Click event
      map.current.on('click', 'parcel-fill', (e) => {
        if (e.features?.[0]) setShowPopup(true);
      });

      map.current.on('mouseenter', 'parcel-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'parcel-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });

    return () => {
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, [geoJson]);

  // Drone flight animation
  useEffect(() => {
    if (!isPlaying || !mapLoaded || !map.current) {
      if (isPlaying) setIsPlaying(false);
      return;
    }

    startTime.current = Date.now();
    setShowPopup(false);
    
    const animate = () => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      setCurrentTime(progress * duration);

      // Camera animation phases
      let zoom: number, pitch: number, bearing: number, center: [number, number];

      if (progress < 0.15) {
        // Phase 1: Wide establishing shot (0-15%)
        const p = progress / 0.15;
        zoom = 12 + easeOutCubic(p) * 2;
        pitch = 45;
        bearing = easeInOutCubic(p) * 30;
        center = centroid as [number, number];
      } else if (progress < 0.3) {
        // Phase 2: GeoJSON focus zoom (15-30%)
        const p = (progress - 0.15) / 0.15;
        zoom = 14 + easeInOutCubic(p) * 3;
        pitch = 45;
        bearing = 30;
        center = centroid as [number, number];
      } else if (progress < 0.5) {
        // Phase 3: 360° orbit (30-50%)
        const p = (progress - 0.3) / 0.2;
        zoom = 16 + Math.sin(p * Math.PI) * 0.5;
        pitch = 45 + Math.sin(p * Math.PI * 2) * 10;
        bearing = 30 + p * 360;
        center = centroid as [number, number];
      } else if (progress < 0.8) {
        // Phase 4: Spiral descent - Hero Shot (50-80%)
        const p = (progress - 0.5) / 0.3;
        zoom = 16 + easeInOutCubic(p) * 3;
        pitch = 45 - easeInOutCubic(p) * 10;
        bearing = p * 720; // 2 full rotations
        center = centroid as [number, number];
      } else {
        // Phase 5: Low altitude reveal + hover (80-100%)
        const p = (progress - 0.8) / 0.2;
        zoom = 18.5 + easeInOutCubic(p) * 0.5;
        pitch = 35 + easeInOutCubic(p) * 10;
        bearing = 720 + p * 45;
        center = centroid as [number, number];
      }

      // Update camera
      map.current?.flyTo({
        center,
        zoom,
        pitch,
        bearing,
        duration: 0
      });

      // Update HUD
      setCameraInfo({ 
        zoom: Math.round(zoom * 10) / 10, 
        pitch: Math.round(pitch), 
        bearing: Math.round(bearing % 360),
        alt: Math.round(500 - (zoom - 12) * 40)
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, mapLoaded, duration, geoData, centroid]);

  const togglePlay = () => {
    if (isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (currentTime >= duration - 0.5) setCurrentTime(0);
    }
  };

  const seekTo = (seconds: number) => {
    setCurrentTime(seconds);
    if (!map.current) return;
    
    const progress = seconds / duration;
    const zoom = 12 + progress * 7;
    map.current.flyTo({ center: centroid as [number, number], zoom, pitch: 45, bearing: progress * 360, duration: 500 });
    setCameraInfo({ zoom: Math.round(zoom * 10) / 10, pitch: 45, bearing: Math.round(progress * 360) % 360, alt: Math.round(500 - (zoom - 12) * 40) });
  };

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <div className="relative w-full aspect-[9/16] bg-black overflow-hidden" style={{ maxHeight: '75vh' }}>
          {/* Map */}
          <div ref={mapContainer} className="absolute inset-0" />
          
          {/* Overlays - allow pointer events on map */}
          <div className="absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
            <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.6)] pointer-events-none" />
          </div>

          {/* Drone HUD - Top Left */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="glass-strong px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 font-bold text-xs uppercase tracking-wider">Drone View</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 mt-1 text-xs text-gray-400">
                <span>Alt: <span className="text-green-500">{cameraInfo.alt}m</span></span>
                <span>Pitch: <span className="text-green-500">{cameraInfo.pitch}°</span></span>
                <span>Zoom: <span className="text-green-500">{cameraInfo.zoom}</span></span>
                <span>Bearing: <span className="text-green-500">{cameraInfo.bearing}°</span></span>
              </div>
            </div>
          </div>

          {/* Timer - Top Right */}
          <div className="absolute top-4 right-4 z-10">
            <div className="glass-strong px-3 py-2 rounded-lg">
              <span className="text-green-500 font-mono text-sm">
                {String(Math.floor(currentTime / 60)).padStart(2, '0')}:
                {String(Math.floor(currentTime % 60)).padStart(2, '0')}
              </span>
              <span className="text-gray-500 text-xs"> / {duration}s</span>
            </div>
          </div>

          {/* Parcel Info Card - Center */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="glass-strong px-4 py-3 rounded-lg text-center">
              <p className="text-green-500 font-bold text-lg">{parcelProperties.ParselNo || parcelProps?.ParselNo || '467'}</p>
              <p className="text-gray-300 text-sm">{parcelProperties.Mahalle || parcelProps?.Mahalle || 'Hacıveli'}</p>
              <p className="text-gray-400 text-xs mt-1">{parcelProperties.Alan || parcelProps?.Alan || '8.656,88'} m²</p>
            </div>
          </div>

          {/* Environment Places - Bottom Right */}
          <div className="absolute bottom-24 right-4 z-10">
            <div className="glass-strong p-3 rounded-lg max-w-[160px]">
              <p className="text-red-500 text-xs font-medium mb-2">Yakın Çevre</p>
              <div className="space-y-1">
                {ENV_PLACES.slice(0, 4).map((place, i) => {
                  const Icon = place.icon;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <Icon className={`w-3 h-3 ${place.color}`} />
                      <span className="text-gray-300 text-xs truncate flex-1">{place.name}</span>
                      <span className="text-green-500 text-xs">{place.distance}km</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Consultant Branding - Bottom Left */}
          {(branding.showFullName || branding.showPhoneNumber) && (
            <div className="absolute bottom-24 left-4 z-10">
              <div className="glass-strong p-3 rounded-lg">
                {branding.showFullName && <p className="text-white font-medium text-sm">{consultant.fullName}</p>}
                {branding.showPhoneNumber && <p className="text-gray-400 text-xs">{consultant.phone}</p>}
              </div>
            </div>
          )}

          {/* Timeline - Bottom */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="glass-strong px-2 py-2 rounded-lg">
              {/* Progress */}
              <div 
                className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  seekTo((e.clientX - rect.left) / rect.width * duration);
                }}
              >
                <div className="h-full bg-red-500 transition-all" style={{ width: `${(currentTime / duration) * 100}%` }} />
              </div>
              
              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 rounded-lg hover:bg-white/10">
                  {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-gray-400" />}
                </button>
                <button onClick={() => seekTo(Math.max(0, currentTime - 5))} className="p-1.5 rounded-lg hover:bg-white/10">
                  <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
                <button onClick={togglePlay} className="p-2.5 rounded-full bg-red-600 hover:bg-red-500">
                  {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                </button>
                <button onClick={() => seekTo(Math.min(duration, currentTime + 5))} className="p-1.5 rounded-lg hover:bg-white/10">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-white/10">
                  <Maximize2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Popup */}
          {showPopup && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="glass-strong p-4 rounded-xl min-w-[250px]">
                <button onClick={() => setShowPopup(false)} className="absolute top-2 right-2 text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-red-500 font-bold text-lg mb-3">Parsel {parcelProperties.ParselNo}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-gray-500">İl</p><p className="text-white">{parcelProperties.Il || '-'}</p></div>
                  <div><p className="text-gray-500">İlçe</p><p className="text-white">{parcelProperties.Ilce || '-'}</p></div>
                  <div><p className="text-gray-500">Mahalle</p><p className="text-white">{parcelProperties.Mahalle || '-'}</p></div>
                  <div><p className="text-gray-500">Ada</p><p className="text-white">{parcelProperties.Ada || '-'}</p></div>
                  <div><p className="text-gray-500">Alan</p><p className="text-white">{parcelProperties.Alan || '-'} m²</p></div>
                  <div><p className="text-gray-500">Nitelik</p><p className="text-green-500">{parcelProperties.Nitelik || '-'}</p></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="secondary" onClick={togglePlay}>
          <Play className="w-4 h-4 mr-2" />
          {isPlaying ? 'Durdur' : 'Önizle'}
        </Button>
        <Button onClick={() => alert('İndirme yakında!')}>
          <Download className="w-4 h-4 mr-2" />İndir
        </Button>
        <Button variant="ghost" onClick={() => alert('Paylaş yakında!')}>
          <Share2 className="w-4 h-4 mr-2" />Paylaş
        </Button>
      </div>
    </div>
  );
}