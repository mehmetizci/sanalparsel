import * as Sentry from "@sentry/nextjs";

// Initialize Sentry for client-side error monitoring
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  
  // Only enable in production
  enabled: process.env.NODE_ENV === "production",
  
  // Performance monitoring - sample 10% of transactions
  tracesSampleRate: 0.1,
  
  // Environment
  environment: process.env.NODE_ENV || "development",
  
  // Ignore errors from these paths/patterns
  ignoreErrors: [
    // Ignore third-party scripts
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "PPB_Unavailable",
    "RPC_E_ABORTED",
    // Ignore React hydration warnings (common, not actionable)
    "Warning:",
  ],
  
  // Deny lists for URLs
  denyUrls: [
    // Ignore browser extensions
    /extensions/i,
    /chrome-extension:/i,
    /moz-extension:/i,
    /safari-extension:/i,
  ],
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV !== "production",
  
  // Before send hook for filtering/modifying events
  beforeSend(event) {
    // Don't send events without an exception
    if (!event.exception) {
      return event;
    }
    
    // Store event ID in localStorage for debug page
    if (typeof window !== "undefined" && event.event_id) {
      try {
        localStorage.setItem("sanalparsel_last_sentry_event", event.event_id);
      } catch {
        // localStorage might not be available
      }
    }
    
    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.log("[Sentry] Captured event:", event.event_id);
    }
    
    return event;
  },
});

// Export for use in components
export { Sentry };
