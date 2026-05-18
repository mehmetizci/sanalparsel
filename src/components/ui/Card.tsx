'use client';

import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, glass, hover, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl p-6',
        glass
          ? 'glass'
          : 'bg-card border border-border',
        hover && 'hover:bg-card-hover hover:border-primary/20 transition-all duration-300 cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
