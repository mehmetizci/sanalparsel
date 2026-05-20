'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Download, Settings, Share2 } from 'lucide-react';

interface VideoPreviewProps {
  parcelName?: string;
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
  settings?: {
    duration: 30 | 45 | 60;
    altitude: number;
  };
}

const NearbyPlacesSample = [
  { name: 'Foça Devlet Hastanesi', type: 'hospital', distance: 4.2, unit: 'km' },
  { name: 'Hacıveli İlkokulu', type: 'school', distance: 1.8, unit: 'km' },
  { name: 'A101 Market', type: 'market', distance: 0.9, unit: 'km' },
  { name: 'İzmir-Çeşme Otoyolu', type: 'highway', distance: 5.5, unit: 'km' },
  { name: 'Foça Plajı', type: 'beach', distance: 3.2, unit: 'km' },
];

export function VideoPreview({ parcelName, parcelProps, branding, settings }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const duration = settings?.duration || 30;

  // Simulate playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        {/* Video Preview Area - 9:16 aspect ratio */}
        <div 
          className="relative w-full aspect-[9/16] bg-black"
          style={{ maxHeight: '70vh' }}
        >
          {/* Simulated drone footage */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0" style={{
              background: `
                radial-gradient(ellipse 140% 90% at 50% 110%, #1a2f1a 0%, transparent 50%),
                radial-gradient(ellipse 80% 60% at 30% 70%, #152515 0%, transparent 40%),
                linear-gradient(180deg, #0a150a 0%, #080d08 100%)
              `
            }} />
            
            {/* Roads */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute left-[20%] top-0 bottom-0 w-1 bg-gray-500/50" />
              <div className="absolute left-[50%] top-0 bottom-0 w-1.5 bg-gray-400/60" />
              <div className="absolute left-[80%] top-0 bottom-0 w-1 bg-gray-500/50" />
              <div className="absolute top-[30%] left-0 right-0 h-1 bg-gray-500/50" />
              <div className="absolute top-[60%] left-0 right-0 h-1 bg-gray-500/50" />
            </div>
            
            {/* Buildings */}
            <div className="absolute inset-0">
              {[18, 28, 42, 58, 68, 78].map((x, i) => (
                <div key={x} className="absolute bg-gray-700/30" style={{
                  left: `${x}%`, top: `${20 + (i % 3) * 20}%`, 
                  width: `${3 + (i % 2) * 2}%`, height: `${3 + (i % 2) * 2}%`
                }} />
              ))}
            </div>
            
            {/* Parcel boundary - animated */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="absolute -inset-3 border border-red-500/30 rounded-lg animate-ping" style={{ animationDuration: '2s' }} />
                <div className="w-28 h-20 border-2 border-red-500 rounded-lg" style={{
                  boxShadow: '0 0 20px rgba(239,68,68,0.5)'
                }} />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 bg-red-500 rounded-full" />
                </div>
              </div>
            </div>
            
            {/* Overlays */}
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
            
            {/* Top-left overlay - Drone info */}
            <div className="absolute top-4 left-4">
              <div className="bg-black/70 px-3 py-2 rounded-lg border border-red-500/30">
                <div className="text-xs">
                  <span className="text-red-500">● </span>
                  <span className="text-green-500 font-mono">DRONE VIEW</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  <span>Alt: {settings?.altitude || 150}m</span>
                </div>
              </div>
            </div>
            
            {/* Top-right - Duration */}
            <div className="absolute top-4 right-4">
              <div className="bg-black/70 px-3 py-2 rounded-lg">
                <span className="text-xs font-mono text-green-500">
                  {Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-gray-500 text-xs"> / {duration}s</span>
              </div>
            </div>
            
            {/* Bottom-left - Parcel info */}
            <div className="absolute bottom-20 left-4">
              <Card className="glass-strong p-2 max-w-[180px]">
                <p className="text-green-400 text-xs font-medium">{parcelName || 'Parsel ' + (parcelProps?.ParselNo || '467')}</p>
                <p className="text-gray-400 text-xs">
                  {parcelProps?.Mahalle || 'Hacıveli'}, {parcelProps?.Ilce || 'Foça'}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {parcelProps?.Alan || '8.656,88'} m²
                </p>
              </Card>
            </div>
            
            {/* Bottom-right - Nearby places */}
            <div className="absolute bottom-20 right-4">
              <Card className="glass-strong p-2 max-w-[160px]">
                <p className="text-red-500 text-xs mb-2">Yakın Çevre</p>
                {NearbyPlacesSample.slice(0, 3).map((place, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-400 truncate">{place.name}</span>
                    <span className="text-green-500">{place.distance}km</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
          
          {/* Video controls */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
            <button onClick={toggleMute} className="p-2 rounded-full bg-black/50 hover:bg-black/70">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button onClick={togglePlay} className="p-3 rounded-full bg-red-600 hover:bg-red-500">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button className="p-2 rounded-full bg-black/50 hover:bg-black/70">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
      
      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="secondary" onClick={() => {}}>
          <Play className="w-4 h-4 mr-2" />
          Önizle
        </Button>
        <Button onClick={() => {}}>
          <Download className="w-4 h-4 mr-2" />
          İndir
        </Button>
        <Button variant="ghost" onClick={() => {}}>
          <Share2 className="w-4 h-4 mr-2" />
          Paylaş
        </Button>
      </div>
    </div>
  );
}