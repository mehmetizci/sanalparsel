"use client"

import { useEffect, useRef } from "react"
import * as Cesium from "cesium"
import "cesium/Build/Cesium/Widgets/widgets.css"
import { drawParcel, focusParcel } from "@/lib/cesiumParcel"

// Set CESIUM_BASE_URL for production - must be before CesiumViewer is used
if (typeof window !== "undefined") {
  (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = "/static/cesium"
}

export default function CesiumMap({ geojson }: { geojson?: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!containerRef.current) return
    
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
  }, [geojson])
  
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
