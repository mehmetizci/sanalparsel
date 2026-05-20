'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { Play, Download, Eye, Loader2, AlertCircle } from 'lucide-react';

export function RenderPanel() {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const startRender = async () => {
    setIsRendering(true);
    setProgress(0);
    setError(null);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRendering(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const previewVideo = () => {
    alert('Video önizleme özelliği yakında!');
  };

  const downloadVideo = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  if (videoUrl) {
    return (
      <div className="space-y-4">
        <Card className="bg-green-500/10 border-green-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium">Video Hazır!</p>
              <p className="text-sm text-green-400"> İndirmeye hazır</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={previewVideo} variant="secondary">
            <Eye className="w-4 h-4 mr-2" />
            Önizle
          </Button>
          <Button onClick={downloadVideo}>
            <Download className="w-4 h-4 mr-2" />
            İndir
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="w-full"
        >
          Panele Dön
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card className="bg-red-500/10 border-red-500">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="font-medium">Hata Oluştu</p>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        </Card>
        <Button onClick={startRender} className="w-full">
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isRendering ? (
        <>
          <Card>
            <div className="text-center py-4">
              <Loader2 className="w-10 h-10 text-red-500 mx-auto mb-4 animate-spin" />
              <p className="font-medium mb-2">Video Oluşturuluyor</p>
              <p className="text-sm text-muted">
                Lütfen bekleyin... (%
                {progress < 10
                  ? ' hazırlanıyor'
                  : progress < 30
                  ? ' harita oluşturuluyor'
                  : progress < 60
                  ? ' drone hareketleri'
                  : ' video işleniyor'}
                )
              </p>
            </div>
          </Card>
          <div className="h-2 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <Card className="bg-card-hover">
            <div className="text-center">
              <p className="font-medium mb-2">Hazırsınız!</p>
              <p className="text-sm text-muted">
                Video oluşturmaya başlayabilirsiniz.
                <br />
                Tahmini süre: 30-60 saniye
              </p>
            </div>
          </Card>

          <Button onClick={startRender} className="w-full">
            <Play className="w-4 h-4 mr-2" />
            Video Oluştur
          </Button>
        </>
      )}
    </div>
  );
}