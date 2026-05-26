"use client";

import { motion } from "framer-motion";
import { VideoTone } from "@/types";

interface NarrationEditorProps {
  text: string;
  onChange: (text: string) => void;
  tone: VideoTone;
  onToneChange: (tone: VideoTone) => void;
  disabled?: boolean;
}

const modeLabels: Record<VideoTone, string> = {
  corporate: "Kurumsal",
  investment: "Yatırım",
  social: "Sosyal",
  short: "Kısa",
  premium: "Premium",
};

export default function NarrationEditor({ text, onChange, tone, onToneChange, disabled }: NarrationEditorProps) {
  const duration = Math.ceil(text.length / 15);
  
  return (
    <div className="space-y-5">
      {/* AI Badge - OUTSIDE textarea, above the card */}
      {text.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 w-fit"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-primary text-xs font-medium">AI tarafından oluşturuldu</span>
          <span className="text-white/20 text-xs">•</span>
          <span className="text-white/60 text-xs">{modeLabels[tone]}</span>
        </motion.div>
      )}

      {/* Text Area - Cinematic glass card */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="AI ile tanıtım metni oluşturmak için yukarıdaki butona tıklayın..."
          className="w-full h-32 sm:h-40 bg-[rgba(15,23,42,0.6)] border border-white/[0.08] rounded-2xl p-4 text-white/90 placeholder-white/20 text-sm leading-relaxed focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 resize-none transition-all duration-200 disabled:opacity-50"
          style={{
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3), 0 0 40px rgba(37,99,235,0.05)"
          }}
        />
      </div>

      {/* Duration - More visually important */}
      <div className="flex items-center justify-between px-1">
        <span className="text-white/40 text-xs">{text.length} karakter</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${duration > 30 ? "text-warning" : "text-primary"}`}>
            ~{duration} sn
          </span>
        </div>
      </div>

      {/* Single Mode Selector - Premium linear/tesla style chips */}
      <div className="pt-2">
        <label className="text-white/60 text-xs font-medium mb-3 block">Metin Modu</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(modeLabels) as VideoTone[]).map((mode, index) => {
            const isActive = tone === mode;
            return (
              <motion.button
                key={mode}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onToneChange(mode)}
                disabled={disabled}
                className={`
                  px-3 py-1.5 text-xs font-medium transition-all duration-200
                  ${disabled ? "opacity-40 pointer-events-none" : ""}
                  ${isActive 
                    ? "bg-primary/15 text-primary border border-primary/30" 
                    : "bg-white/[0.03] text-white/50 border border-transparent hover:bg-white/[0.06] hover:text-white/70"
                  }
                `}
              >
                {modeLabels[mode]}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}