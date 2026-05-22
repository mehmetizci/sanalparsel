"use client"

import { useEffect, useRef, useState } from "react"
import { drawParcel, focusParcel } from "@/lib/cesiumParcel"

// Declare Cesium types
declare const Cesium: any

export default function CesiumMap({ geojson }: { geojson?: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const viewerRef = useRef<any>(null)

  useEffect(() => {
    // Load Cesium CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/static/cesium/Widgets/widgets.css'
    link.onload = () => {
      console.log('Cesium CSS loaded')
    }
    document.head.appendChild(link)

    // Set CESIUM_BASE_URL
    ;(window as any).CESIUM_BASE_URL = '/static/cesium'

    // Load Cesium dynamically
    const script = document.createElement('script')
    script.src = '/static/cesium/Cesium.js'
    script.onload = () => {
      console.log('Cesium JS loaded')
      setIsReady(true)
    }
    script.onerror = (e) => {
      console.error('Failed to load Cesium:', e)
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(link)
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!isReady || !containerRef.current || typeof Cesium === 'undefined') return

    // Destroy existing viewer
    if (viewerRef.current) {
      viewerRef.current.destroy()
      viewerRef.current = null
    }

    // Create new viewer
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

      // Remove default Ion imagery and use OpenStreetMap
      viewer.imageryLayers.removeAll()
      viewer.imageryLayers.addImageryProvider(
        new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org',
        })
      )

      viewerRef.current = viewer

      // Draw parcel if geojson provided
      if (geojson) {
        const entity = drawParcel(viewer, geojson)
        if (entity) {
          focusParcel(viewer, entity)
        }
      }
    } catch (error) {
      console.error('Cesium viewer creation failed:', error)
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [isReady, geojson])

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
