"use client";

import { VideoTone } from "@/types";

interface NarrationEditorProps {
  text: string;
  onChange: (text: string) => void;
  tone: VideoTone;
  onToneChange: (tone: VideoTone) => void;
  disabled?: boolean;
}

const toneLabels: Record<VideoTone, { label: string; description: string }> = {
  corporate: { label: "Kurumsal", description: "Profesyonel ve resmi ton" },
  investment: { label: "Yatırım Odlı", description: "Yatırım değeri vurgulu" },
  social: { label: "Sosyal Medya", description: "Reels ve sosyal medya için" },
  short: { label: "Kısa", description: "Özet ve etkili" },
  premium: { label: "Premium", description: "Lüks ve yüksek segment" },
};

export default function NarrationEditor({ text, onChange, tone, onToneChange, disabled }: NarrationEditorProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-white font-semibold mb-3 block">Metin İçeriği</label>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="AI tarafından oluşturulan tanıtım metnini düzenleyin..."
          className="w-full h-40 bg-card/50 border border-white/10 rounded-xl p-4 text-white placeholder-muted/50 focus:outline-none focus:border-primary/50 resize-none disabled:opacity-50"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-muted text-sm">Karakter: {text.length}</span>
          <span className={`text-sm ${text.length > 400 ? "text-warning" : "text-success"}`}>
            ~{Math.ceil(text.length / 15)} sn
          </span>
        </div>
      </div>

      <div>
        <label className="text-white font-semibold mb-3 block">Metin Modu</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(toneLabels) as VideoTone[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onToneChange(mode)}
              disabled={disabled}
              className={`glass rounded-xl p-3 text-center transition-all duration-200 ${
                tone === mode
                  ? "border-primary bg-primary/10"
                  : "border-white/10 hover:border-white/20"
              } ${disabled ? "opacity-50" : ""}`}
            >
              <p className="text-white font-medium">{toneLabels[mode].label}</p>
              <p className="text-muted text-xs mt-1">{toneLabels[mode].description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}