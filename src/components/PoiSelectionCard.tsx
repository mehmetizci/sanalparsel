"use client";

import { EnvironmentItem } from "@/types";

interface PoiSelectionCardProps {
  items: EnvironmentItem[];
  onToggleItem: (id: string) => void;
  maxSelections?: number;
}

const typeLabels: Record<string, string> = {
  hospital: "Hastane",
  school: "Okul",
  university: "Üniversite",
  market: "Market",
  pharmacy: "Eczane",
  transport: "Toplu Taşıma",
  highway: "Ana Yol",
  marketplace: "Pazar Yeri",
};

const typeIcons: Record<string, React.ReactNode> = {
  hospital: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  school: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  university: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  market: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  pharmacy: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  transport: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  highway: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  marketplace: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
};

export default function PoiSelectionCard({ items, onToggleItem, maxSelections = 7 }: PoiSelectionCardProps) {
  const selectedCount = items.filter((i) => i.selected).length;
  const canSelectMore = selectedCount < maxSelections;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-white font-semibold">Yakın Çevre Bilgileri</label>
        <span className="text-sm text-muted">
          {selectedCount}/{maxSelections} seçili
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (!item.selected && !canSelectMore) return;
              onToggleItem(item.id);
            }}
            disabled={!item.selected && !canSelectMore}
            className={`glass rounded-xl p-4 flex items-center gap-4 w-full transition-all duration-200 ${
              item.selected
                ? "border-primary/50 bg-primary/5"
                : "border-white/10 hover:border-white/20"
            } ${!item.selected && !canSelectMore ? "opacity-50" : ""}`}
          >
            <div className={`${item.selected ? "text-primary" : "text-muted"}`}>
              {typeIcons[item.type] || typeIcons.market}
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-medium">{item.name}</p>
              <p className="text-muted text-sm">{typeLabels[item.type]} · {item.distance}</p>
            </div>
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                item.selected ? "border-primary bg-primary" : "border-white/30"
              }`}
            >
              {item.selected && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}