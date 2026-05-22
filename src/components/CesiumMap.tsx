"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { drawParcel, focusParcel } from "@/lib/cesiumParcel"

// Cesium types
declare const Cesium: any

function CesiumMapInner({ geojson }: { geojson?: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState(false)
  const viewerRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return

    // Check if already loaded
    if (!(window as any).Cesium) {
      // Set CESIUM_BASE_URL BEFORE loading
      ;(window as any).CESIUM_BASE_URL = "/cesium"

      // Load CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/cesium/Widgets/widgets.css'
      document.head.appendChild(link)

      // Load Cesium JS
      const script = document.createElement('script')
      script.src = '/cesium/Cesium.js'
      script.async = true
      script.onload = initViewer
      script.onerror = () => setLoadError(true)
      document.head.appendChild(script)

      return () => {
        document.head.removeChild(link)
        document.head.removeChild(script)
      }
    } else {
      initViewer()
    }

    function initViewer() {
      if (!containerRef.current) return
      const Cesium = (window as any).Cesium

      // Destroy existing
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }

      try {
        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
        })

        viewer.imageryLayers.removeAll()
        viewer.imageryLayers.addImageryProvider(
          new Cesium.OpenStreetMapImageryProvider({
            url: "https://tile.openstreetmap.org/"
          })
        )

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(27.06, 38.48, 50000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-30),
            roll: 0
          },
          duration: 0
        })

        viewerRef.current = viewer

        if (geojson) {
          const entity = drawParcel(viewer, geojson)
          if (entity) focusParcel(viewer, entity)
        }
      } catch {
        setLoadError(true)
      }
    }
  }, [geojson])

  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [])

  if (loadError) {
    return (
      <div style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
      }}>
        <p style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>🗺️ 3D Harita</p>
        <p style={{ fontSize: "0.9rem", color: "#888" }}>Harita yüklenemiyor</p>
        <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.5rem" }}>
          WebGL etkin tarayıcı kullanın
        </p>
      </div>
    )
  }

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />
}

export default function CesiumMap({ geojson }: { geojson?: any }) {
  return (
    <Suspense fallback={<div style={{ width: "100%", height: "100vh", background: "#1a1a2e" }} />}>
      <CesiumMapInner geojson={geojson} />
    </Suspense>
  )
}
