"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className = "", variant = "primary", size = "md", loading = false, fullWidth = false, disabled, children, ...props }, ref) => {
    const baseStyles = "font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
    
    const variantStyles = {
      primary: "bg-gradient-to-r from-primary to-blue-600 text-white hover:from-blue-600 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-primary/40",
      secondary: "bg-card text-white border border-white/10 hover:bg-card/80 hover:border-white/20",
      ghost: "text-muted hover:text-white hover:bg-white/5",
    };
    
    const sizeStyles = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base min-h-[48px]",
      lg: "px-8 py-4 text-lg min-h-[56px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Yükleniyor...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

PrimaryButton.displayName = "PrimaryButton";

export default PrimaryButton;