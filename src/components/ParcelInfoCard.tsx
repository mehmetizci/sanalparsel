"use client";

import { ParcelProperties } from "@/types";
import { formatArea } from "@/lib/geojson";

interface ParcelInfoCardProps {
  properties: ParcelProperties;
  shortTitle: string;
  onCustomNoteChange?: (note: string) => void;
}

export default function ParcelInfoCard({ properties, shortTitle, onCustomNoteChange }: ParcelInfoCardProps) {
  const infoRows = [
    { label: "İl", value: properties.Il },
    { label: "İlçe", value: properties.Ilce },
    { label: "Mahalle", value: properties.Mahalle },
    { label: "Mevkii", value: properties.Mevkii },
    { label: "Ada", value: properties.Ada },
    { label: "Parsel", value: properties.ParselNo },
    { label: "Alan", value: formatArea(properties.Alan) },
    { label: "Nitelik", value: properties.Nitelik },
  ].filter(row => row.value);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-4 border-b border-white/10">
        <h3 className="text-white font-bold text-lg">{shortTitle}</h3>
      </div>
      <div className="p-4 space-y-3">
        {infoRows.map((row) => (
          <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
            <span className="text-muted text-sm">{row.label}</span>
            <span className="text-white font-medium">{row.value}</span>
          </div>
        ))}
      </div>
      {onCustomNoteChange && (
        <div className="p-4 border-t border-white/10">
          <label className="block">
            <span className="text-muted text-sm mb-2 block">Özel Tanıtım Notu (Opsiyonel)</span>
            <textarea
              onChange={(e) => onCustomNoteChange(e.target.value)}
              placeholder="Bu parsel için özel bir not ekleyin..."
              className="w-full bg-card/50 border border-white/10 rounded-xl p-3 text-white placeholder-muted/50 focus:outline-none focus:border-primary/50 resize-none"
              rows={3}
            />
          </label>
        </div>
      )}
    </div>
  );
}