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

    // Check if already loaded
    if ((window as any).Cesium) {
      setIsReady(true)
      return
    }

    // Set CESIUM_BASE_URL BEFORE loading Cesium script
    // This MUST be set before Cesium.js loads
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
    script.onload = () => {
      console.log('Cesium loaded successfully')
      console.log('CESIUM_BASE_URL:', (window as any).CESIUM_BASE_URL)
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
      console.log('Creating Cesium viewer...')
      console.log('CESIUM_BASE_URL:', (window as any).CESIUM_BASE_URL)
      console.log('Container:', containerRef.current)
      console.log('Cesium:', Cesium)
      console.log('OpenStreetMapImageryProvider:', Cesium.OpenStreetMapImageryProvider)
      
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
      console.log('Viewer created:', viewer)
      
      // Remove default imagery and use OpenStreetMap
      viewer.imageryLayers.removeAll()
      const osm = new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/'
      })
      viewer.imageryLayers.addImageryProvider(osm)
      
      viewer.scene.globe.enableLighting = true
      viewerRef.current = viewer
      console.log('Viewer setup complete')

      if (geojson) {
        const entity = drawParcel(viewer, geojson)
        if (entity) {
          focusParcel(viewer, entity)
        }
      }
    } catch (error: any) {
      console.error('Viewer creation failed:', error)
      console.error('Error message:', error?.message)
      console.error('Error stack:', error?.stack)
      setLoadError('Harita görünümü oluşturulamadı: ' + (error?.message || 'Bilinmeyen hata'))
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
