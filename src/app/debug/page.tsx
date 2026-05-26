"use client";

// Debug page - NO imports from other parts of the app
// Must work even if everything else is broken

export default function DebugPage() {
  // Get all data directly from localStorage without any helpers
  let lastError = "No error stored";
  let projectConfig = "No config stored";
  let parcelState = "No parcel state stored";
  let currentUrl = "Unknown";
  let userAgent = "Unknown";
  let allKeys: string[] = [];

  if (typeof window !== "undefined") {
    currentUrl = window.location.href;
    userAgent = navigator.userAgent;
    allKeys = Object.keys(localStorage);

    try {
      const errorData = localStorage.getItem("sanalparsel_last_error");
      lastError = errorData ? JSON.stringify(JSON.parse(errorData), null, 2) : "No error stored";
    } catch {
      lastError = "Error reading last_error";
    }

    try {
      const configData = localStorage.getItem("sanalparsel_project_config");
      if (configData) {
        const parsed = JSON.parse(configData);
        const keys = Object.keys(parsed);
        projectConfig = `Found ${keys.length} project(s): ${keys.join(", ")}`;
        if (keys.length > 0) {
          projectConfig += "\n\nFirst project keys: " + Object.keys(parsed[keys[0]]).join(", ");
        }
      } else {
        projectConfig = "No config stored";
      }
    } catch {
      projectConfig = "Error reading project config";
    }

    try {
      const parcelData = localStorage.getItem("sanalparsel-parcel");
      if (parcelData) {
        const parsed = JSON.parse(parcelData);
        const keys = Object.keys(parsed).filter(k => k !== "state");
        parcelState = `Keys: ${keys.join(", ")}`;
        if (parsed.state) {
          parcelState += "\nState keys: " + Object.keys(parsed.state).join(", ");
        }
      } else {
        parcelState = "No parcel state stored";
      }
    } catch {
      parcelState = "Error reading parcel state";
    }
  }

  return (
    <div style={{ 
      padding: "20px", 
      color: "white", 
      background: "#020617", 
      minHeight: "100vh",
      fontFamily: "monospace"
    }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px", color: "#ef4444" }}>
        🔧 Debug Sayfası
      </h1>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", color: "#fbbf24", marginBottom: "10px" }}>
          URL & Browser
        </h2>
        <div style={{ background: "#111827", padding: "10px", borderRadius: "8px" }}>
          <p><strong style={{ color: "#9ca3af" }}>URL:</strong> {currentUrl}</p>
          <p><strong style={{ color: "#9ca3af" }}>User Agent:</strong> {userAgent}</p>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", color: "#ef4444", marginBottom: "10px" }}>
          Last Error (sanalparsel_last_error)
        </h2>
        <pre style={{ 
          background: "#111827", 
          padding: "10px", 
          borderRadius: "8px",
          overflow: "auto",
          maxHeight: "200px",
          fontSize: "12px"
        }}>
          {lastError}
        </pre>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", color: "#22c55e", marginBottom: "10px" }}>
          Project Config (sanalparsel_project_config)
        </h2>
        <pre style={{ 
          background: "#111827", 
          padding: "10px", 
          borderRadius: "8px",
          overflow: "auto",
          maxHeight: "200px",
          fontSize: "12px"
        }}>
          {projectConfig}
        </pre>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", color: "#3b82f6", marginBottom: "10px" }}>
          Parcel State (sanalparsel-parcel)
        </h2>
        <pre style={{ 
          background: "#111827", 
          padding: "10px", 
          borderRadius: "8px",
          overflow: "auto",
          maxHeight: "200px",
          fontSize: "12px"
        }}>
          {parcelState}
        </pre>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", color: "#a855f7", marginBottom: "10px" }}>
          All localStorage Keys
        </h2>
        <div style={{ background: "#111827", padding: "10px", borderRadius: "8px" }}>
          {allKeys.length === 0 ? (
            <p style={{ color: "#9ca3af" }}>No keys found</p>
          ) : (
            allKeys.map((key, i) => (
              <p key={i} style={{ margin: "2px 0" }}>{key}</p>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: "20px", padding: "10px", background: "#1f2937", borderRadius: "8px" }}>
        <p style={{ fontSize: "12px", color: "#9ca3af" }}>
          Sayfayı yenilemek için: <button 
            onClick={() => window.location.reload()} 
            style={{ color: "#3b82f6", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
          >
            Yenile
          </button>
        </p>
      </div>
    </div>
  );
}