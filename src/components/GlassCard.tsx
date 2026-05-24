"use client";

import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function GlassCard({ children, className = "", onClick, hover = false }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`glass rounded-2xl p-6 transition-all duration-200 ${
        hover ? "hover:bg-card/90 hover:border-white/20 hover:scale-[1.02] cursor-pointer" : ""
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}