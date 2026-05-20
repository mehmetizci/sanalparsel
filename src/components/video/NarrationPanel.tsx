'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { generateNarration } from '@/lib/openrouter';
import { Loader2, Sparkles, Mic } from 'lucide-react';

interface NarrationPanelProps {
  parcelName: string;
  nearbyPlaces?: Array<{ name: string; type: string; distance: number }>;
}

export function NarrationPanel({ parcelName, nearbyPlaces = [] }: NarrationPanelProps) {
  const [description, setDescription] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);

  const generateText = async () => {
    setLoading(true);
    try {
      const result = await generateNarration({
        parcelName,
        description: description || undefined,
        nearbyPlaces,
      });
      setGeneratedText(result.text);
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Custom description */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">
          Özel Tanıtım Metni (Opsiyonel)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder=" Kendi metninizi yazabilir veya AI'ın otomatik oluşturmasını sağlayabilirsiniz..."
          className="w-full h-32 px-4 py-3 rounded-xl bg-background border border-border resize-none focus:outline-none focus:border-red-500/50"
        />
      </div>

      {/* Generate button */}
      <Button onClick={generateText} disabled={loading || !parcelName} className="w-full">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Oluşturuluyor...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI ile Metin Oluştur
          </>
        )}
      </Button>

      {/* Generated text */}
      {generatedText && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium">Oluşturulan Metin</span>
          </div>
          <p className="text-sm leading-relaxed">{generatedText}</p>
          <div className="flex gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setDescription(generatedText)}>
              Düzenle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(generatedText)}
            >
              Kopyala
            </Button>
          </div>
        </Card>
      )}

      {/* Voice selection placeholder */}
      <Card className="bg-card-hover">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Seslendirme</p>
            <p className="text-sm text-muted">Türkçe erkek sesi (Varsayılan)</p>
          </div>
          <Button variant="secondary" size="sm">
            Değiştir
          </Button>
        </div>
      </Card>
    </div>
  );
}