'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GeoJSONData } from '@/types'

interface MapViewProps {
  geojson?: GeoJSONData
  onParcelSelect?: (coordinates: [number, number]) => void
  center?: [number, number]
  zoom?: number
}

export default function MapView({ 
  geojson, 
  onParcelSelect,
  center = [28.9784, 41.0082], // Istanbul
  zoom = 15 
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const initMap = useCallback(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center,
      zoom
    })

    map.current.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      'top-right'
    )
    map.current.addControl(
      new maplibregl.ScaleControl({ maxWidth: 100 }),
      'bottom-left'
    )

    map.current.on('load', () => {
      setMapLoaded(true)
    })
  }, [center, zoom])

  useEffect(() => {
    initMap()
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [initMap])

  // Add/Update GeoJSON layer
  useEffect(() => {
    if (!map.current || !mapLoaded || !geojson) return

    const sourceId = 'parcel-source'
    const layerId = 'parcel-layer'

    // Remove existing if present
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId)
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId)
    }

    // Add new source and layer
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: geojson as GeoJSON.FeatureCollection
    })

    // Fill layer
    map.current.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#ef4444',
        'fill-opacity': 0.3
      }
    })

    // Outline layer
    map.current.addLayer({
      id: `${layerId}-outline`,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#ef4444',
        'line-width': 3
      }
    })

    // Click handler
    map.current.on('click', layerId, (e) => {
      if (e.lngLat) {
        onParcelSelect?.([e.lngLat.lng, e.lngLat.lat])
      }
    })

    // Cursor change on hover
    map.current.on('mouseenter', layerId, () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer'
    })
    map.current.on('mouseleave', layerId, () => {
      if (map.current) map.current.getCanvas().style.cursor = ''
    })

  }, [geojson, mapLoaded, onParcelSelect])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-800">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Harita yükleniyor...</span>
          </div>
        </div>
      )}
    </div>
  )
}