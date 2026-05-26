"use client";

import { ReactNode } from "react";
import MobileBottomNav from "./MobileBottomNav";
import { VideoPreparingOverlay } from "./LoadingRenderState";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function AppShell({ children, showNav = true }: AppShellProps) {
  return (
    <>
      {/* Global video preparing overlay - only shows when video rendering is active */}
      <VideoPreparingOverlay />
      
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <main className="w-full">{children}</main>
        {showNav && <MobileBottomNav />}
      </div>
    </>
  );
}