"use client";

import React, { Component, ReactNode } from "react";

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
    if (this.state.hasError) {
      return <ErrorScreen 
        error={this.state.error} 
        stackTrace={this.state.stackTrace} 
        onReset={this.handleReset}
        onCopy={this.copyDebugInfo}
      />;
    }

    return this.props.children;
  }
}

// Error Screen Component - Function Component (uses hooks)
function ErrorScreen({ 
  error, 
  stackTrace, 
  onReset, 
  onCopy 
}: { 
  error: Error | null;
  stackTrace: string;
  onReset: () => void;
  onCopy: () => void;
}) {
  const stateInfo = getStateInfo();

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-lg mx-auto">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-red-400 text-center mb-2">
          Bir Hata Oluştu
        </h1>
        <p className="text-red-300 text-center mb-6">
          Sayfa düzgün yüklenemedi
        </p>

        {/* Error Message */}
        <div className="bg-black/40 rounded-2xl p-4 mb-4">
          <h2 className="text-yellow-400 font-semibold mb-2">Hata Mesajı:</h2>
          <p className="text-white font-mono text-sm break-all">
            {error?.message || "Bilinmeyen hata"}
          </p>
        </div>

        {/* Stack Trace */}
        <div className="bg-black/40 rounded-2xl p-4 mb-4">
          <h2 className="text-yellow-400 font-semibold mb-2">Stack Trace (ilk 10 satır):</h2>
          <pre className="text-yellow-300 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-auto">
            {stackTrace.split("\n").slice(0, 10).join("\n")}
          </pre>
        </div>

        {/* State Info */}
        <div className="bg-black/40 rounded-2xl p-4 mb-4">
          <h2 className="text-blue-400 font-semibold mb-2">Durum Bilgisi:</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <StateItem label="projectConfig" value={stateInfo.projectConfig} />
            <StateItem label="aiNarration" value={stateInfo.aiNarration} />
            <StateItem label="voiceSettings" value={stateInfo.voiceSettings} />
            <StateItem label="cachedAudioUrl" value={stateInfo.cachedAudioUrl} />
          </div>
        </div>

        {/* Copy Button */}
        <button
          onClick={onCopy}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl mb-3 transition-colors"
        >
          Debug Bilgilerini Kopyala
        </button>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}

// State Item Component
function StateItem({ label, value }: { label: string; value: string }) {
  const isExists = value === "true";
  return (
    <div className="bg-black/30 rounded-lg p-2">
      <span className="text-gray-400 text-xs">{label}:</span>
      <span className={`ml-2 font-medium ${isExists ? "text-green-400" : "text-red-400"}`}>
        {value}
      </span>
    </div>
  );
}

// Get state info from localStorage
function getStateInfo(): { projectConfig: string; aiNarration: string; voiceSettings: string; cachedAudioUrl: string } {
  return {
    projectConfig: getProjectConfigExists(),
    aiNarration: getAiNarrationExists(),
    voiceSettings: getVoiceSettingsExists(),
    cachedAudioUrl: getCachedAudioUrlExists(),
  };
}

function getProjectConfigExists(): string {
  try {
    const data = localStorage.getItem("sanalparsel-configs");
    if (data) {
      const configs = JSON.parse(data);
      return Object.keys(configs || {}).length > 0 ? "true" : "false";
    }
  } catch {
    // Ignore
  }
  return "false";
}

function getAiNarrationExists(): string {
  try {
    const data = localStorage.getItem("sanalparsel-configs");
    if (data) {
      const configs = JSON.parse(data) as Record<string, { aiNarration?: { text?: string } }>;
      const firstConfig = Object.values(configs || {})[0];
      return firstConfig?.aiNarration?.text ? "true" : "false";
    }
  } catch {
    // Ignore
  }
  return "false";
}

function getVoiceSettingsExists(): string {
  try {
    const data = localStorage.getItem("sanalparsel-parcel");
    if (data) {
      const state = JSON.parse(data);
      return state?.state?.voiceSettings ? "true" : "false";
    }
  } catch {
    // Ignore
  }
  return "false";
}

function getCachedAudioUrlExists(): string {
  try {
    const data = localStorage.getItem("sanalparsel-parcel");
    if (data) {
      const state = JSON.parse(data);
      return state?.state?.cachedAudioUrl ? "true" : "false";
    }
  } catch {
    // Ignore
  }
  return "false";
}

// Generate debug text for clipboard
function generateDebugText(): string {
  if (typeof window === "undefined") return "SSR";

  const pathname = window.location.pathname;
  const userAgent = navigator.userAgent;
  const stateInfo = getStateInfo();
  
  const localStorageKeys = Object.keys(typeof localStorage !== "undefined" ? localStorage : {});

  return [
    "=== SANALPARSEL DEBUG INFO ===",
    `Time: ${new Date().toISOString()}`,
    `Route: ${pathname}`,
    `User Agent: ${userAgent}`,
    "",
    "=== STATE ===",
    `projectConfig exists: ${stateInfo.projectConfig}`,
    `aiNarration exists: ${stateInfo.aiNarration}`,
    `voiceSettings exists: ${stateInfo.voiceSettings}`,
    `cachedAudioUrl exists: ${stateInfo.cachedAudioUrl}`,
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