"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"

const CesiumViewer = dynamic(() => import("@/components/CesiumMap"), {
  ssr: false,
  loading: () => (
    <div 
      style={{ 
        width: "100%", 
        height: "100vh", 
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        display: "flex", 
        flexDirection: "column",
        alignItems: "center", 
        justifyContent: "center", 
        color: "#fff"
      }}
    >
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-4" />
      <p style={{ fontSize: "18px", marginTop: "16px" }}>Harita yükleniyor...</p>
      <p style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>Cesium Globe initializing</p>
    </div>
  ),
})

export default function UploadPage() {
  const [geojson, setGeojson] = useState<any>(null)
  const [center, setCenter] = useState<any>(null)

  const handleUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    const parsed = JSON.parse(await file.text())
    setGeojson(parsed)
    
    // Calculate center
    if (parsed?.features?.[0]?.geometry?.coordinates) {
      const coords = parsed.features[0].geometry.coordinates[0].flat()
      const lons = []
      const lats = []
      for (let i = 0; i < coords.length; i += 2) {
        lons.push(coords[i])
        lats.push(coords[i + 1])
      }
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
      setCenter({ lat: centerLat, lon: centerLon })
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 340, padding: 24, borderRight: "1px solid #333", background: "#0f0f23" }}>
        <h2 style={{ color: "#fff", fontSize: "24px", marginBottom: "24px" }}>GeoJSON Yükle</h2>
        <input 
          type="file" 
          accept=".json,.geojson" 
          onChange={handleUpload}
          style={{ 
            background: "#1a1a2e",
            color: "#fff",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #333",
            width: "100%"
          }}
        />
        {center && (
          <div style={{ marginTop: 20, color: "#fff" }}>
            <b>Merkez Koordinat:</b>
            <p style={{ fontFamily: "monospace", fontSize: "14px" }}>
              {center.lat.toFixed(6)}, {center.lon.toFixed(6)}
            </p>
          </div>
        )}
      </aside>
      <section style={{ flex: 1 }}>
        <CesiumViewer geojson={geojson} />
      </section>
    </div>
  )
}
