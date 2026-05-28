"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "success" 
    ? "bg-success/10 border-success/30" 
    : "bg-warning/10 border-warning/30";
  const iconColor = type === "success" ? "text-success" : "text-warning";
  const icon = type === "success" ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <div
      className={`
        fixed bottom-24 left-4 right-4 z-50 
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
      `}
      style={{ maxWidth: "448px", margin: "0 auto" }}
    >
      <div 
        className={`
          ${bgColor} backdrop-blur-md rounded-xl p-4 
          border shadow-lg shadow-black/20
          flex items-center gap-3
        `}
      >
        <span className={iconColor}>{icon}</span>
        <p className="text-white text-sm font-medium flex-1">{message}</p>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(onClose, 300);
          }}
          className="text-muted hover:text-white transition-colors p-1 -mr-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
