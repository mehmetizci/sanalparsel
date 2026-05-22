"use client"

import { useEffect, useRef, useState } from "react"
import { drawParcel, focusParcel } from "@/lib/cesiumParcel"

// Cesium types
declare const Cesium: any

export default function CesiumMap({ geojson }: { geojson?: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const viewerRef = useRef<any>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || hasInitialized.current) return
    hasInitialized.current = true

    // Check WebGL support first
    const testCanvas = document.createElement('canvas')
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
    
    if (!gl) {
      console.log('WebGL not supported')
      setIsLoading(false)
      setHasError(true)
      return
    }

    // Set CESIUM_BASE_URL
    ;(window as any).CESIUM_BASE_URL = "/cesium"

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/cesium/Widgets/widgets.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = '/cesium/Cesium.js'
    script.async = true
    script.onload = initViewer
    script.onerror = () => {
      setIsLoading(false)
      setHasError(true)
    }
    document.head.appendChild(script)

    function initViewer() {
      if (!containerRef.current) return
      const Cesium = (window as any).Cesium

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
        setIsLoading(false)

        if (geojson) {
          const entity = drawParcel(viewer, geojson)
          if (entity) focusParcel(viewer, entity)
        }
      } catch (error) {
        console.error('Viewer init failed:', error)
        setIsLoading(false)
        setHasError(true)
      }
    }

    return () => {
      document.head.removeChild(link)
      document.head.removeChild(script)
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [geojson])

  if (hasError) {
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

  if (isLoading) {
    return (
      <div style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
      }}>
        <p style={{ fontSize: "1rem" }}>🗺️ 3D Harita yükleniyor...</p>
      </div>
    )
  }

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />
}
