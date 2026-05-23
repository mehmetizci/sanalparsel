'use client'

import { ReactNode } from 'react'
import MobileBottomNav from './MobileBottomNav'

interface AppShellProps {
  children: ReactNode
  showNav?: boolean
  title?: string
  showBack?: boolean
  onBack?: () => void
}

export default function AppShell({ 
  children, 
  showNav = true, 
  title,
  showBack,
  onBack
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#07182F] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#07182F]/95 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {showBack ? (
            <button 
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <h1 className="text-lg font-semibold text-white">SanalParsel</h1>
          )}
          {title && !showBack && (
            <span className="text-sm text-gray-400">{title}</span>
          )}
          <div className="w-10" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Fixed CTA area */}
      <div className="sticky bottom-16 bg-[#07182F]/95 backdrop-blur-md border-t border-white/10 px-4 py-4">
        <div className="max-w-lg mx-auto">
          {/* CTA button will be placed here by child components */}
        </div>
      </div>

      {/* Bottom navigation */}
      {showNav && <MobileBottomNav />}
    </div>
  )
}