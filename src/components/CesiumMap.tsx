"use client"

import { useEffect, useRef, useState } from "react"
import * as Cesium from "cesium"
import { drawParcel, focusParcel } from "@/lib/cesiumParcel"

// Set CESIUM_BASE_URL for production - must be before CesiumViewer is used
if (typeof window !== "undefined") {
  (window as any).CESIUM_BASE_URL = "/static/cesium"
}

export default function CesiumMap({ geojson }: { geojson?: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [cssLoaded, setCssLoaded] = useState(false)
  
  // Load Cesium CSS dynamically
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/static/cesium/Widgets/widgets.css'
    link.onload = () => setCssLoaded(true)
    document.head.appendChild(link)
    
    return () => {
      document.head.removeChild(link)
    }
  }, [])
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  useEffect(() => {
    if (!isMounted || !cssLoaded || !containerRef.current) return
    
    // Clean up any existing viewer
    if ((window as any).sanalparselViewer) {
      (window as any).sanalparselViewer.destroy()
    }
    
    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: true,
      navigationHelpButton: false,
    })
    
    viewer.scene.globe.enableLighting = true
    viewer.scene.highDynamicRange = true
    
    if (geojson) {
      const entity = drawParcel(viewer, geojson)
      focusParcel(viewer, entity)
    }
    
    ;(window as any).sanalparselViewer = viewer
    
    return () => {
      if ((window as any).sanalparselViewer) {
        (window as any).sanalparselViewer.destroy()
        delete (window as any).sanalparselViewer
      }
    }
  }, [geojson, isMounted, cssLoaded])
  
  if (!isMounted) {
    return (
      <div 
        style={{ 
          width: "100%", 
          height: "100vh",
          position: "relative",
          background: "#1a1a2e",
        }} 
      />
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
