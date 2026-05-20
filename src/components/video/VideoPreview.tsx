'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Download, Share2, 
  MapPin, Building2, GraduationCap, ShoppingCart, Palmtree, Store, 
  User, Phone, Award, ChevronRight, ChevronLeft
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
    profilePhotoUrl?: string;
    companyLogoUrl?: string;
  };
  settings?: {
    duration: 30 | 45 | 60;
    altitude: number;
    cameraAngle?: 'orbit' | 'topdown' | 'flyover';
  };
}

// Sample drone path for animation
const DRONE_PATH = [
  { lng: 26.857, lat: 38.669, alt: 500, pitch: 45, bearing: 0 },
  { lng: 26.857, lat: 38.6695, alt: 400, pitch: 50, bearing: 15 },
  { lng: 26.8575, lat: 38.6695, alt: 300, pitch: 55, bearing: 30 },
  { lng: 26.8575, lat: 38.669, alt: 200, pitch: 60, bearing: 45 },
  { lng: 26.857, lat: 38.669, alt: 150, pitch: 50, bearing: 60 },
];

const ENV_PLACES = [
  { name: 'Foça Devlet Hastanesi', type: 'hospital', distance: 4.2, icon: Building2, color: 'text-red-500' },
  { name: 'Hacıveli İlkokulu', type: 'school', distance: 1.8, icon: GraduationCap, color: 'text-blue-500' },
  { name: 'A101 Market', type: 'market', distance: 0.9, icon: ShoppingCart, color: 'text-green-500' },
  { name: 'İzmir-Çeşme Otoyolu', type: 'highway', distance: 5.5, icon: MapPin, color: 'text-yellow-500' },
  { name: 'Foça Plajı', type: 'beach', distance: 3.2, icon: Palmtree, color: 'text-cyan-500' },
  { name: 'Foça AVM', type: 'mall', distance: 6.1, icon: Store, color: 'text-purple-500' },
];

export function VideoPreview({ 
  parcelName, 
  parcelProps, 
  branding = {
    showProfilePhoto: true,
    showFullName: true, 
    showPhoneNumber: true,
    showCompanyName: false,
    showOfficeAddress: false,
    showAuthorizationCertificate: false,
    showLogo: false
  },
  consultant = {
    fullName: 'Ahmet Yılmaz',
    phone: '+90 532 123 45 67',
    companyName: 'XYZ Gayrimenkul'
  },
  settings = { duration: 30, altitude: 150 }
}: VideoPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const animationRef = useRef<number>(0);
  const [showEnvPlaces, setShowEnvPlaces] = useState(false);

  const duration = settings.duration || 30;
  const progress = (currentTime / duration) * 100;

  // Initialize map for video
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: '© Esri'
          }
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [26.857, 38.669],
      zoom: 15,
      pitch: 45,
      bearing: 0,
      interactive: false
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Add parcel source
      map.current?.addSource('parcel', {
        type: 'geojson',
        data: {
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
            properties: {}
          }]
        }
      });

      // Fill layer
      map.current?.addLayer({
        id: 'parcel-fill',
        type: 'fill',
        source: 'parcel',
        paint: {
          'fill-color': 'rgba(255, 0, 0, 0.08)',
          'fill-outline-color': 'rgba(255, 0, 0, 0.3)'
        }
      });

      // Line layer
      map.current?.addLayer({
        id: 'parcel-line',
        type: 'line',
        source: 'parcel',
        paint: {
          'line-color': '#FF0000',
          'line-width': 3,
          'line-opacity': 0.9
        }
      });

      // Fit bounds
      map.current?.fitBounds([
        [26.857, 38.668],
        [26.8588, 38.6705]
      ], { padding: 80, maxZoom: 16, duration: 1500 });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !mapLoaded) return;

    let frame = 0;
    const animate = () => {
      frame++;
      const frameProgress = (frame % 300) / 300;
      
      // Update time
      setCurrentTime(frameProgress * duration);
      
      // Animate camera
      const pathIndex = Math.floor(frameProgress * DRONE_PATH.length);
      const pathPoint = DRONE_PATH[Math.min(pathIndex, DRONE_PATH.length - 1)];
      
      if (map.current) {
        map.current.setPaintProperty('parcel-line', 'line-opacity', 0.5 + Math.sin(frameProgress * 10) * 0.4);
      }
      
      // Show env places after 2 seconds
      if (frameProgress > 0.15) setShowEnvPlaces(true);

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, mapLoaded, duration]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) setCurrentTime(0);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const seekTo = (seconds: number) => {
    setCurrentTime(seconds);
    map.current?.flyTo({
      center: [26.857, 38.669 + (seconds / duration) * 0.0005],
      zoom: 15 + (seconds / duration) * 0.5,
      pitch: 45 + (seconds / duration) * 15,
      duration: 500
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        {/* Video Preview - 9:16 ratio */}
        <div 
          className="relative w-full aspect-[9/16] bg-black overflow-hidden"
          style={{ maxHeight: '75vh' }}
        >
          {/* MapLibre Map */}
          <div ref={mapContainer} className="absolute inset-0" />
          
          {/* Gradient overlays */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.6)]" />
          </div>

          {/* === TOP-LEFT: Drone Info === */}
          <div className="absolute top-4 left-4 z-10">
            <div className="glass-strong px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 font-bold text-xs uppercase tracking-wider">Drone View</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span>Alt: <span className="text-green-500">{settings.altitude || 150}m</span></span>
                <span>•</span>
                <span>Pitch: <span className="text-green-500">45°</span></span>
              </div>
            </div>
          </div>

          {/* === TOP-RIGHT: Timer === */}
          <div className="absolute top-4 right-4 z-10">
            <div className="glass-strong px-3 py-2 rounded-lg">
              <span className="text-green-500 font-mono text-sm">
                {String(Math.floor(currentTime / 60)).padStart(2, '0')}:
                {String(Math.floor(currentTime % 60)).padStart(2, '0')}
              </span>
              <span className="text-gray-500 text-xs"> / {duration}s</span>
            </div>
          </div>

          {/* === BOTTOM-LEFT: Consultant Branding === */}
          {(branding.showProfilePhoto || branding.showFullName || branding.showPhoneNumber || branding.showCompanyName) && (
            <div className="absolute bottom-24 left-4 z-10">
              <div className="glass-strong p-3 rounded-lg flex items-center gap-3 max-w-[180px]">
                {branding.showProfilePhoto && consultant.profilePhotoUrl && (
                  <img src={consultant.profilePhotoUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                )}
                {!consultant.profilePhotoUrl && branding.showProfilePhoto && (
                  <div className="w-10 h-10 rounded-full bg-red-600/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-red-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {branding.showFullName && (
                    <p className="text-white font-medium text-sm truncate">{consultant.fullName}</p>
                  )}
                  {branding.showPhoneNumber && (
                    <p className="text-gray-400 text-xs">{consultant.phone}</p>
                  )}
                  {branding.showCompanyName && (
                    <p className="text-gray-400 text-xs truncate">{consultant.companyName}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* === BOTTOM-RIGHT: Environment Analysis === */}
          <div className="absolute bottom-24 right-4 z-10">
            <div className="glass-strong p-3 rounded-lg max-w-[160px]">
              <p className="text-red-500 text-xs font-medium mb-2">Yakın Çevre</p>
              <div className="space-y-1.5">
                {ENV_PLACES.slice(0, 5).map((place, i) => {
                  const Icon = place.icon;
                  return (
                    <div 
                      key={i} 
                      className="flex items-center gap-2 opacity-0 animate-slide-up"
                      style={{ animationDelay: `${0.2 + i * 0.1}s`, animationFillMode: 'forwards' }}
                    >
                      <Icon className={`w-3 h-3 ${place.color}`} />
                      <span className="text-gray-300 text-xs truncate flex-1">{place.name}</span>
                      <span className="text-green-500 text-xs">{place.distance}km</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* === PARCEL INFO === */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="glass-strong px-4 py-3 rounded-lg text-center">
              <p className="text-green-500 font-bold text-lg">{parcelProps?.ParselNo || '467'}</p>
              <p className="text-gray-300 text-sm">{parcelProps?.Mahalle || 'Hacıveli'}</p>
              <p className="text-gray-400 text-xs mt-1">{parcelProps?.Alan || '8.656,88'} m²</p>
            </div>
          </div>

          {/* === TIMELINE === */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="glass-strong px-2 py-2 rounded-lg">
              {/* Progress bar */}
              <div 
                className="h-1 bg-gray-700 rounded-full overflow-hidden mb-2 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  seekTo(percent * duration);
                }}
              >
                <div 
                  className="h-full bg-red-500 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              {/* Controls */}
              <div className="flex items-center justify-between">
                <button onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-white/10">
                  {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-gray-400" />}
                </button>
                
                <div className="flex items-center gap-2">
                  <button onClick={() => seekTo(Math.max(0, currentTime - 5))} className="p-1.5 rounded-lg hover:bg-white/10">
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  <button onClick={togglePlay} className="p-2.5 rounded-full bg-red-600 hover:bg-red-500">
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                  </button>
                  
                  <button onClick={() => seekTo(Math.min(duration, currentTime + 5))} className="p-1.5 rounded-lg hover:bg-white/10">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                
                <button className="p-1.5 rounded-lg hover:bg-white/10">
                  <Maximize2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="secondary" onClick={() => setIsPlaying(!isPlaying)}>
          <Play className="w-4 h-4 mr-2" />
          {isPlaying ? 'Durdur' : 'Önizle'}
        </Button>
        <Button onClick={() => alert('İndirme özelliği yakında!')}>
          <Download className="w-4 h-4 mr-2" />
          İndir
        </Button>
        <Button variant="ghost" onClick={() => alert('Paylaşım özelliği yakında!')}>
          <Share2 className="w-4 h-4 mr-2" />
          Paylaş
        </Button>
      </div>
    </div>
  );
}