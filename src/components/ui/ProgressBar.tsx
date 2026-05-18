'use client';

interface ProgressBarProps {
  progress: number;
  label?: string;
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-muted">{label}</span>
          <span className="text-foreground font-medium">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="h-2 bg-card rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary-hover rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
