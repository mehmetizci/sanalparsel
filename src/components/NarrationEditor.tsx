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

const toneLabels: Record<VideoTone, { label: string; icon: string }> = {
  corporate: { label: "Kurumsal", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  investment: { label: "Yatırım", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  social: { label: "Sosyal Medya", icon: "M7 4V2m0 2v2m0-2h6M7 6H5m2 0a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0M17 8V6m0 2v2m0-2h-6m2 0H17M7 16v2m0-2h10m0 0v2" },
  short: { label: "Kısa", icon: "M4 6h16M4 12h8m-8 6h16" },
  premium: { label: "Premium", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
};

export default function NarrationEditor({ text, onChange, tone, onToneChange, disabled }: NarrationEditorProps) {
  return (
    <div className="space-y-6">
      {/* Text Area Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-white/90 font-semibold text-sm">Metin İçeriği</label>
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs">{text.length} karakter</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${text.length > 400 ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}>
              ~{Math.ceil(text.length / 15)} sn
            </span>
          </div>
        </div>
        
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="AI tarafından oluşturulan tanıtım metnini düzenleyin..."
            className="w-full h-36 bg-[rgba(15,23,42,0.5)] border border-white/10 rounded-xl p-4 pr-10 text-white/90 placeholder-white/20 text-sm leading-relaxed focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 resize-none transition-all duration-200 disabled:opacity-50"
          />
          
          {/* AI Badge - shown when text exists */}
          {text.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/20 to-blue-500/20 border border-primary/30"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-primary text-[10px] font-medium">AI tarafından oluşturuldu</span>
              <span className="text-white/30 text-[10px]">•</span>
              <span className="text-white/60 text-[10px] capitalize">{tone}</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Text Mode Selection - Premium Segmented Chips */}
      <div>
        <label className="text-white/90 font-semibold text-sm mb-3 block">Metin Modu</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(toneLabels) as VideoTone[]).map((mode, index) => {
            const isActive = tone === mode;
            return (
              <motion.button
                key={mode}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onToneChange(mode)}
                disabled={disabled}
                className={`
                  relative px-4 py-2 rounded-full font-medium text-xs transition-all duration-300
                  ${disabled ? "opacity-50 pointer-events-none" : ""}
                  ${isActive 
                    ? "bg-gradient-to-r from-primary/20 to-blue-500/20 border border-primary/50 text-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                    : "bg-[rgba(15,23,42,0.4)] border border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <svg 
                    className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-white/40"}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={toneLabels[mode].icon} />
                  </svg>
                  <span>{toneLabels[mode].label}</span>
                  {isActive && (
                    <motion.svg 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3.5 h-3.5 text-primary" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </motion.svg>
                  )}
                </div>
                
                {/* Active glow effect */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-md -z-10" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}