"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("=== ERROR BOUNDARY CAUGHT ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("==============================");

    this.setState({
      hasError: true,
      error,
      errorInfo: errorInfo.componentStack || null,
    });

    // Call optional error handler
    this.props.onError?.(error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "Bilinmeyen hata";
      const errorStack = this.state.error?.stack || "";

      return (
        <div className="p-4 m-4 bg-red-900/30 border border-red-500/50 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h2 className="text-red-400 font-bold mb-2">Seslendirme ekranı yüklenirken hata oluştu</h2>
              <p className="text-red-300 text-sm mb-3">{errorMessage}</p>
              
              {/* Error Details (collapsible) */}
              {process.env.NODE_ENV === "development" && errorStack && (
                <details className="mt-2">
                  <summary className="text-red-400 text-xs cursor-pointer hover:text-red-300">
                    Hata Detayı (Development)
                  </summary>
                  <pre className="mt-2 p-2 bg-black/30 rounded text-red-300 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                    {errorStack}
                  </pre>
                </details>
              )}

              {/* Try Again Button */}
              <button
                onClick={this.handleReset}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Safe wrapper for components that might crash
 */
export function SafeComponent({ 
  children, 
  fallback = null,
  componentName = "Bileşen"
}: { 
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        fallback || (
          <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-300 text-sm">
              {componentName} yüklenemedi. Lütfen sayfayı yenileyin.
            </p>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}