"use client"

import { useEffect, useRef, useState } from "react"
import { drawParcel, focusParcel } from "@/lib/cesiumParcel"

// Cesium types
declare const Cesium: any

export default function CesiumMap({ geojson }: { geojson?: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const viewerRef = useRef<any>(null)

  // Load Cesium from public/cesium folder
  useEffect(() => {
    if (typeof window === "undefined") return

    // Set CESIUM_BASE_URL before loading
    ;(window as any).CESIUM_BASE_URL = "/cesium"

    // Check if already loaded
    if ((window as any).Cesium) {
      setIsReady(true)
      return
    }

    // Load CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/cesium/Widgets/widgets.css'
    document.head.appendChild(link)

    // Load Cesium JS
    const script = document.createElement('script')
    script.src = '/cesium/Cesium.js'
    script.async = true
    script.onload = () => {
      console.log('Cesium loaded successfully')
      setIsReady(true)
    }
    script.onerror = (e) => {
      console.error('Failed to load Cesium:', e)
      setLoadError('Cesium yüklenemedi')
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(link)
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!isReady || !containerRef.current || !(window as any).Cesium) return

    const Cesium = (window as any).Cesium

    // Destroy existing viewer
    if (viewerRef.current) {
      viewerRef.current.destroy()
      viewerRef.current = null
    }

    try {
      const viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
      })

      viewer.scene.globe.enableLighting = true
      viewerRef.current = viewer

      if (geojson) {
        const entity = drawParcel(viewer, geojson)
        if (entity) {
          focusParcel(viewer, entity)
        }
      }
    } catch (error) {
      console.error('Viewer creation failed:', error)
      setLoadError('Harita görünümü oluşturulamadı')
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [isReady, geojson])

  if (loadError) {
    return (
      <div style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1a2e",
        color: "#ef4444"
      }}>
        {loadError}
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: "100%", 
        height: "100vh",
        position: "relative",
      }} 
    />
  )
}
