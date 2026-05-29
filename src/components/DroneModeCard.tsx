"use client";

interface CameraModeOption {
  mode: string;
  label: string;
  selected: boolean;
}

interface DroneModeCardProps {
  modes: CameraModeOption[];
  onToggle: (mode: string) => void;
}

const cameraModeIcons: Record<string, React.ReactNode> = {
  "hero_zoom": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
  ),
  "orbit_360": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  "spiral_descent": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  "top_view": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  "low_fly": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
  "four_corners": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  ),
};

export default function DroneModeCard({ modes, onToggle }: DroneModeCardProps) {
  return (
    <div className="space-y-3">
      <label className="text-white font-semibold">Kamera Modu</label>
      <div className="grid grid-cols-1 gap-3">
        {modes.map(({ mode, label, selected }) => (
          <button
            key={mode}
            onClick={() => onToggle(mode)}
            className={`glass rounded-xl p-4 flex items-center gap-4 transition-all duration-200 ${
              selected
                ? "border-primary bg-primary/10"
                : "border-white/10 hover:border-white/20"
            }`}
          >
            <div className={`${selected ? "text-primary" : "text-muted"}`}>
              {cameraModeIcons[mode]}
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-medium">{label}</p>
            </div>
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                selected
                  ? "border-primary bg-primary"
                  : "border-white/30"
              }`}
            >
              {selected && (
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