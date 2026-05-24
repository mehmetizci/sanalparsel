"use client";

import { ReactNode } from "react";

interface StepHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function StepHeader({ step, totalSteps, title, description, children }: StepHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < step ? "bg-primary" : i === step ? "bg-primary/50" : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {description && (
            <p className="text-muted mt-1 text-sm">{description}</p>
          )}
        </div>
        <span className="text-sm text-muted">
          {step + 1}/{totalSteps}
        </span>
      </div>
      {children}
    </div>
  );
}