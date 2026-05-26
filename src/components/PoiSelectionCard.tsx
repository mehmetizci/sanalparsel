"use client";

import { useState } from "react";
import { EnvironmentItem } from "@/types";

interface PoiSelectionCardProps {
  items: EnvironmentItem[];
  onToggleItem: (id: string) => void;
  maxSelections?: number;
}

// Category priority for sorting
const CATEGORY_PRIORITY: Record<string, number> = {
  hospital: 1,
  transport: 2,
  market: 3,
  school: 4,
  restaurant: 5,
  cafe: 6,
  pharmacy: 7,
  university: 8,
  bank: 9,
  atm: 10,
  highway: 11,
  marketplace: 12,
};

const typeLabels: Record<string, string> = {
  hospital: "Hastane",
  school: "Okul",
  university: "Üniversite",
  market: "Market",
  pharmacy: "Eczane",
  transport: "Toplu Taşıma",
  highway: "Ana Yol",
  marketplace: "Pazar Yeri",
  cafe: "Kafe",
  restaurant: "Restoran",
  bank: "Banka",
  atm: "ATM",
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
  cafe: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h1a4 4 0 110 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zm5-5h2a3 3 0 016 0v3a3 3 0 01-6 0V3z" />
    </svg>
  ),
  restaurant: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18" />
    </svg>
  ),
  bank: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  atm: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

// Sort items by category priority, then by distance
function sortItems(items: EnvironmentItem[]): EnvironmentItem[] {
  return [...items].sort((a, b) => {
    const priorityA = CATEGORY_PRIORITY[a.type] || 999;
    const priorityB = CATEGORY_PRIORITY[b.type] || 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Parse distance for sorting (e.g., "450 m yakınında" -> 450, "1.2 km mesafede" -> 1200)
    const parseDistance = (d: string) => {
      const kmMatch = d.match(/([\d.]+)\s*km/);
      const mMatch = d.match(/(\d+)\s*m/);
      if (kmMatch) return parseFloat(kmMatch[1]) * 1000;
      if (mMatch) return parseInt(mMatch[1]);
      return 9999;
    };
    return parseDistance(a.distance) - parseDistance(b.distance);
  });
}

// Parse distance text for display (remove suffix)
function getDistanceLabel(distanceText: string): string {
  return distanceText;
}

// Animated check icon component - softer premium style
function AnimatedCheck({ isSelected }: { isSelected: boolean }) {
  return (
    <div
      className={`relative w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${
        isSelected
          ? "border-blue-400/60 bg-blue-500/30 scale-100"
          : "border-white/20 scale-90"
      }`}
    >
      <div
        className={`transition-all duration-300 ${
          isSelected ? "opacity-100 scale-100" : "opacity-0 scale-0"
        }`}
      >
        <svg className="w-3 h-3 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  );
}

export default function PoiSelectionCard({ items, onToggleItem, maxSelections = 7 }: PoiSelectionCardProps) {
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const sortedItems = sortItems(items);
  const selectedCount = sortedItems.filter((i) => i.selected).length;
  const canSelectMore = selectedCount < maxSelections;

  const handleToggle = (id: string) => {
    if (!sortedItems.find(i => i.id === id)?.selected && !canSelectMore) return;
    setLastSelectedId(id);
    onToggleItem(id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-white font-semibold">Yakın Çevre Bilgileri</label>
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium">
              {selectedCount}
            </span>
            <span className="text-xs text-white/60">
              Videoda Gösterilecek
            </span>
          </div>
        ) : (
          <span className="text-xs text-white/40">
            Seçim yapın
          </span>
        )}
      </div>
      
      {sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-5">
            <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-white/70 text-sm font-medium mb-2">
            Bu bölgede uygun çevre bilgisi bulunamadı
          </p>
          <p className="text-white/40 text-xs">
            Yakındaki lokasyonları görmek için çevre taramasını başlatın.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleToggle(item.id)}
              disabled={!item.selected && !canSelectMore}
              className={`
                relative w-full rounded-xl p-4 flex items-center gap-4 
                transition-all duration-300 ease-out
                ${item.selected
                  ? "bg-blue-500/[0.06] border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.08)] hover:bg-blue-500/[0.08] hover:shadow-[0_0_16px_rgba(59,130,246,0.1)]"
                  : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]"
                }
                ${!item.selected && !canSelectMore ? "opacity-30 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]"}
                ${lastSelectedId === item.id ? "scale-[1.01]" : ""}
              `}
            >
              {/* Category Icon */}
              <div className={`flex-shrink-0 transition-colors duration-300 ${
                item.selected ? "text-blue-400/80" : "text-white/30"
              }`}>
                {typeIcons[item.type] || typeIcons.market}
              </div>
              
              {/* Content */}
              <div className="flex-1 text-left min-w-0">
                <p className={`font-medium transition-colors duration-300 ${
                  item.selected ? "text-white/90" : "text-white/60"
                }`}>
                  {item.name}
                </p>
                <p className="text-white/40 text-xs flex items-center gap-1.5">
                  <span>{typeLabels[item.type] || item.type}</span>
                  <span className="text-white/20">·</span>
                  <span>{item.distance}</span>
                </p>
              </div>
              
              {/* Animated Check */}
              <AnimatedCheck isSelected={item.selected} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}