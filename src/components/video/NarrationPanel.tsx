'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Mic, Sparkles, FileText } from 'lucide-react';
import type { NearbyPlace } from '@/types';

interface NarrationPanelProps {
  customDescription: string;
  onCustomDescriptionChange: (desc: string) => void;
  narrationText: string;
  onNarrationGenerated: (text: string) => void;
  parcelName: string;
  nearbyPlaces: NearbyPlace[];
}

export function NarrationPanel({
  customDescription,
  onCustomDescriptionChange,
  narrationText,
  onNarrationGenerated,
  parcelName,
  nearbyPlaces,
}: NarrationPanelProps) {
  const [generating, setGenerating] = useState(false);

  const generateNarration = () => {
    setGenerating(true);

    const placesText = nearbyPlaces
      .slice(0, 5)
      .map((p) => `${p.name} (${p.distance} ${p.unit})`)
      .join(', ');

    let text: string;

    if (customDescription.trim()) {
      text = customDescription;
    } else {
      text = `${parcelName || 'Bu değerli arsa'}, stratejik konumu ile dikkat çekmektedir. `;
      if (placesText) {
        text += `Çevresinde ${placesText} gibi önemli noktalar bulunmaktadır. `;
      }
      text +=
        'Yatırım değeri yüksek bu parsel, gelecek vadeden konumu ile hem konut hem de ticari projeler için ideal bir fırsat sunmaktadır.';
    }

    setTimeout(() => {
      onNarrationGenerated(text);
      setGenerating(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Özel Açıklama (İsteğe Bağlı)</h3>
        </div>
        <textarea
          value={customDescription}
          onChange={(e) => onCustomDescriptionChange(e.target.value)}
          placeholder="Parsel hakkında özel bir açıklama girin. Boş bırakırsanız otomatik oluşturulacaktır..."
          className="w-full h-32 px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-primary/50 resize-none"
        />
      </Card>

      <Button
        onClick={generateNarration}
        loading={generating}
        className="w-full"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {customDescription.trim()
          ? 'Seslendirme Metnini Onayla'
          : 'AI ile Seslendirme Metni Oluştur'}
      </Button>

      {narrationText && (
        <Card className="bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium text-primary">Seslendirme Metni</p>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed italic">
            &ldquo;{narrationText}&rdquo;
          </p>
          <p className="text-xs text-muted mt-3">
            Bu metin AI seslendirme motoru tarafından Türkçe olarak seslendirilecektir.
          </p>
        </Card>
      )}
    </div>
  );
}
