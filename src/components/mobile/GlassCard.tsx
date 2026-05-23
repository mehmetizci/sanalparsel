import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export default function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div 
      className={`bg-[#102544]/80 backdrop-blur-md rounded-2xl border border-white/10 p-4 ${className}`}
    >
      {children}
    </div>
  )
}