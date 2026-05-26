"use client";

import React, { Component, ReactNode } from "react";
import * as Sentry from "@sentry/react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

export default class SentryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Capture the error with Sentry
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // Also log to console for development
    console.error("[Sentry Error Boundary] Error captured:", error);
    console.error("[Sentry Error Boundary] Event ID:", eventId);

    this.setState({
      hasError: true,
      error,
      eventId,
    });

    // Store event ID for debug screen
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sanalparsel_last_sentry_event", eventId || "");
        localStorage.setItem("sanalparsel_last_error", JSON.stringify({
          message: error.message,
          stack: error.stack || "",
          timestamp: Date.now(),
          type: "sentry_boundary",
          sentryEventId: eventId,
        }));
      } catch {
        // localStorage might not be available
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      eventId: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, render it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI (minimal, no external dependencies)
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#020617",
            color: "white",
            fontFamily: "monospace",
            padding: "20px",
          }}
        >
          <h1 style={{ fontSize: "24px", color: "#ef4444", marginBottom: "20px" }}>
            Uygulama Hatası
          </h1>

          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", color: "#fbbf24", marginBottom: "10px" }}>
              Hata Mesajı:
            </h2>
            <pre
              style={{
                background: "#111827",
                padding: "10px",
                borderRadius: "8px",
                overflow: "auto",
                maxHeight: "150px",
                fontSize: "14px",
              }}
            >
              {this.state.error?.message || "Bilinmeyen hata"}
            </pre>
          </div>

          {this.state.eventId && (
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "16px", color: "#22c55e", marginBottom: "10px" }}>
                Sentry Event ID:
              </h2>
              <code
                style={{
                  background: "#111827",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "#22c55e",
                }}
              >
                {this.state.eventId}
              </code>
            </div>
          )}

          <div style={{ marginTop: "20px" }}>
            <a
              href="/debug"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                background: "#3b82f6",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                marginRight: "10px",
              }}
            >
              Debug Sayfası
            </a>
            <button
              onClick={this.handleReset}
              style={{
                padding: "12px 24px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for manual error capturing
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (error instanceof Error) {
    Sentry.captureException(error, { 
      contexts: context as Sentry.Contexts | undefined 
    });
  } else {
    Sentry.captureMessage(String(error), {
      contexts: context as Sentry.Contexts | undefined,
    });
  }
}

// Hook to get the last Sentry event ID
export function useLastSentryEventId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem("sanalparsel_last_sentry_event");
  } catch {
    return null;
  }
}
