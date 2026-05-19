'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Download, Eye, Film, Share2, QrCode } from 'lucide-react';

interface RenderPanelProps {
  onRender: () => void;
  isRendering: boolean;
  renderProgress: number;
  videoUrl: string | null;
}

export function RenderPanel({
  onRender,
  isRendering,
  renderProgress,
  videoUrl,
}: RenderPanelProps) {
  const [showQR, setShowQR] = useState(false);
  const progressRef = useRef(renderProgress);

  useEffect(() => {
    progressRef.current = renderProgress;
  }, [renderProgress]);

  const handleDownload = async () => {
    if (!videoUrl) return;
    
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sanalparsel-1080x1920.mp4';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {!videoUrl && !isRendering && (
        <Card className="text-center py-8">
          <Film className="w-16 h-16 text-primary/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Video Oluşturmaya Hazır</h3>
          <p className="text-sm text-muted mb-2">
            Çözünürlük: <span className="text-primary font-semibold">1080x1920px (Dikey)</span>
          </p>
          <p className="text-sm text-muted mb-6 max-w-md mx-auto">
            Tüm ayarlarınız tamamlandı. Profesyonel drone videosunu oluşturmak için
            aşağıdaki butona tıklayın.
          </p>
          <Button size="lg" onClick={onRender} className="animate-pulse-glow">
            <Film className="w-5 h-5 mr-2" />
            Video Oluştur
          </Button>
        </Card>
      )}

      {isRendering && (
        <Card>
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold">Video Oluşturuluyor...</h3>
            <p className="text-sm text-muted mt-1">
              1080x1920px çözünürlüğünde işleniyor...
            </p>
          </div>
          <ProgressBar progress={renderProgress} label="İşlem Durumu" />
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: 'Harita', done: renderProgress > 10 },
              { label: 'Animasyon', done: renderProgress > 35 },
              { label: 'Seslendirme', done: renderProgress > 60 },
              { label: 'Birleştirme', done: renderProgress > 85 },
            ].map((step) => (
              <div
                key={step.label}
                className={`text-center p-2 rounded-lg text-xs ${
                  step.done
                    ? 'bg-primary/10 text-primary'
                    : 'bg-card text-muted'
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>
        </Card>
      )}

      {videoUrl && (
        <div className="space-y-4">
          <Card>
            <div className="flex justify-center mb-4">
              {/* 1080x1920 portrait container for video player */}
              <div className="rounded-xl overflow-hidden bg-black border border-border" style={{ width: '1080px', aspectRatio: '9/16' }}>
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="secondary">
                <Eye className="w-4 h-4 mr-2" />
                Önizleme
              </Button>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                MP4 İndir (1080x1920)
              </Button>
              <Button variant="ghost" onClick={() => setShowQR(!showQR)}>
                <QrCode className="w-4 h-4 mr-2" />
                QR Kod
              </Button>
              <Button variant="ghost">
                <Share2 className="w-4 h-4 mr-2" />
                Paylaş
              </Button>
            </div>
          </Card>

          {showQR && (
            <Card className="text-center">
              <p className="text-sm text-muted mb-3">Video QR Kodu</p>
              <div className="w-40 h-40 bg-white rounded-xl mx-auto flex items-center justify-center">
                <QrCode className="w-24 h-24 text-black" />
              </div>
              <p className="text-xs text-muted mt-3">
                Bu QR kodu taratarak videoya erişebilirsiniz.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
