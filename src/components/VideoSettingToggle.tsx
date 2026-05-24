"use client";

interface VideoSettingToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function VideoSettingToggle({ label, description, enabled, onChange }: VideoSettingToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`glass rounded-xl p-4 flex items-center justify-between w-full transition-all duration-200 ${
        enabled
          ? "border-primary/50 bg-primary/5"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex-1 text-left">
        <p className="text-white font-medium">{label}</p>
        {description && (
          <p className="text-muted text-sm mt-1">{description}</p>
        )}
      </div>
      <div
        className={`relative w-12 h-7 rounded-full transition-all duration-200 ${
          enabled ? "bg-primary" : "bg-white/20"
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </div>
    </button>
  );
}