"use client";

import React, { Component, ReactNode } from "react";

// Global error listeners - set up immediately
if (typeof window !== "undefined") {
  // Global window error listener
  window.addEventListener("error", (event) => {
    try {
      localStorage.setItem("sanalparsel_last_error", JSON.stringify({
        message: event.error?.message || "Unknown error",
        stack: event.error?.stack || "",
        timestamp: Date.now(),
        type: "window_error"
      }));
    } catch {
      // localStorage might not be available
    }
  });

  // Unhandled promise rejection listener
  window.addEventListener("unhandledrejection", (event) => {
    try {
      localStorage.setItem("sanalparsel_last_error", JSON.stringify({
        message: String(event.reason),
        stack: event.reason?.stack || "",
        timestamp: Date.now(),
        type: "unhandled_rejection"
      }));
    } catch {
      // localStorage might not be available
    }
  });
}

// Global error state - shared across the app
let globalErrorState: { hasError: boolean; error: Error | null; stackTrace: string } = {
  hasError: false,
  error: null,
  stackTrace: "",
};

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  stackTrace: string;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: globalErrorState.hasError, 
      error: globalErrorState.error, 
      stackTrace: globalErrorState.stackTrace 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Store error in localStorage
    try {
      localStorage.setItem("sanalparsel_last_error", JSON.stringify({
        message: error.message,
        stack: error.stack || "",
        timestamp: Date.now(),
        type: "react_boundary"
      }));
    } catch {
      // Ignore
    }

    globalErrorState = {
      hasError: true,
      error,
      stackTrace: error.stack || "",
    };
    return { ...globalErrorState };
  }

  componentDidCatch(error: Error) {
    console.error("=== GLOBAL ERROR ===");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack?.substring(0, 500));
    console.error("====================");

    globalErrorState = {
      hasError: true,
      error,
      stackTrace: error.stack || "",
    };
    
    this.setState({ ...globalErrorState });
  }

  handleReset = () => {
    globalErrorState = { hasError: false, error: null, stackTrace: "" };
    this.setState({ hasError: false, error: null, stackTrace: "" });
  };

  copyDebugInfo = () => {
    const debugInfo = generateDebugText();
    try {
      navigator.clipboard.writeText(debugInfo);
      alert("Debug bilgileri kopyalandı!");
    } catch {
      prompt("Debug bilgilerini kopyalayın:", debugInfo);
    }
  };

  render() {
    // Full screen error overlay - plain HTML fallback
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: "20px", 
          color: "white", 
          background: "#020617", 
          minHeight: "100vh",
          fontFamily: "monospace"
        }}>
          <h1 style={{ fontSize: "24px", color: "#ef4444", marginBottom: "20px" }}>
            Uygulama Hatası
          </h1>
          
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", color: "#fbbf24", marginBottom: "10px" }}>
              Hata Mesajı:
            </h2>
            <pre style={{ 
              background: "#111827", 
              padding: "10px", 
              borderRadius: "8px",
              overflow: "auto",
              maxHeight: "150px",
              fontSize: "14px"
            }}>
              {this.state.error?.message || "Bilinmeyen hata"}
            </pre>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", color: "#fbbf24", marginBottom: "10px" }}>
              Stack Trace:
            </h2>
            <pre style={{ 
              background: "#111827", 
              padding: "10px", 
              borderRadius: "8px",
              overflow: "auto",
              maxHeight: "300px",
              fontSize: "12px"
            }}>
              {(this.state.error?.stack || "No stack trace").split("\n").slice(0, 15).join("\n")}
            </pre>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <a 
              href="/debug" 
              style={{ 
                display: "inline-block",
                padding: "12px 24px",
                background: "#3b82f6",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                marginRight: "10px"
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
                cursor: "pointer"
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

// Generate debug text for clipboard
function generateDebugText(): string {
  if (typeof window === "undefined") return "SSR";

  const pathname = window.location.pathname;
  const userAgent = navigator.userAgent;
  const localStorageKeys = Object.keys(localStorage);

  // Inline helper functions
  const getProjectConfigInfo = (): string => {
    try {
      const data = localStorage.getItem("sanalparsel_project_config");
      if (data) {
        const configs = JSON.parse(data);
        const keys = Object.keys(configs);
        return keys.length > 0 ? "true" : "false";
      }
    } catch { /* ignore */ }
    return "false";
  };

  const getAiNarrationInfo = (): string => {
    try {
      const data = localStorage.getItem("sanalparsel_project_config");
      if (data) {
        const configs = JSON.parse(data) as Record<string, { aiNarration?: { text?: string } }>;
        const firstConfig = Object.values(configs)[0];
        return firstConfig?.aiNarration?.text ? "true" : "false";
      }
    } catch { /* ignore */ }
    return "false";
  };

  const getVoiceSettingsInfo = (): string => {
    try {
      const data = localStorage.getItem("sanalparsel-parcel");
      if (data) {
        const state = JSON.parse(data);
        return state?.state?.voiceSettings ? "true" : "false";
      }
    } catch { /* ignore */ }
    return "false";
  };

  return [
    "=== SANALPARSEL DEBUG INFO ===",
    `Time: ${new Date().toISOString()}`,
    `Route: ${pathname}`,
    `User Agent: ${userAgent}`,
    "",
    "=== STATE ===",
    `projectConfig exists: ${getProjectConfigInfo()}`,
    `aiNarration exists: ${getAiNarrationInfo()}`,
    `voiceSettings exists: ${getVoiceSettingsInfo()}`,
    "",
    "=== LOCAL STORAGE KEYS ===",
    ...localStorageKeys.map(k => `  ${k}`),
  ].join("\n");
}

// Debug Panel Component - for ?debug=1 mode
export function DebugPanel() {
  const [debugText, setDebugText] = React.useState("");
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setVisible(params.has("debug"));
      setDebugText(generateDebugText());
    }
  }, []);

  if (!visible) return null;

  const copyDebug = () => {
    try {
      navigator.clipboard.writeText(debugText);
      alert("Debug bilgileri kopyalandı!");
    } catch {
      prompt("Debug bilgilerini kopyalayın:", debugText);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t-2 border-yellow-500 p-4 max-h-64 overflow-auto">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-yellow-400 font-bold text-sm">🔧 DEBUG MODE</span>
          <button
            onClick={copyDebug}
            className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-lg hover:bg-yellow-500/30"
          >
            Kopyala
          </button>
        </div>
        <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
          {debugText}
        </pre>
      </div>
    </div>
  );
}