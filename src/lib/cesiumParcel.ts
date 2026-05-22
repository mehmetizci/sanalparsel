// cesiumParcel.ts - Helper functions for drawing parcels on Cesium map
// Cesium is loaded dynamically via script tag in CesiumMap component

export function drawParcel(viewer: any, geojson: any): any {
  try {
    if (!geojson?.features?.[0]?.geometry?.coordinates?.[0]) {
      console.error("Invalid GeoJSON structure")
      return undefined
    }

    const Cesium = (window as any).Cesium
    if (!Cesium) {
      console.error("Cesium not loaded")
      return undefined
    }

    const coordinates = geojson.features[0].geometry.coordinates[0]
    // Flatten nested arrays if needed (handle Polygon vs MultiPolygon)
    const flatCoords = Array.isArray(coordinates[0][0]) 
      ? coordinates[0].flat(Infinity) 
      : coordinates.flat(Infinity)

    // Convert to Cesium positions
    const positions: any[] = []
    for (let i = 0; i < flatCoords.length; i += 2) {
      const lon = flatCoords[i]
      const lat = flatCoords[i + 1]
      if (typeof lon === 'number' && typeof lat === 'number') {
        positions.push(Cesium.Cartesian3.fromDegrees(lon, lat))
      }
    }

    if (positions.length === 0) {
      console.error("No valid positions found in GeoJSON")
      return undefined
    }

    const entity = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        material: Cesium.Color.RED.withAlpha(0.35),
        outline: true,
        outlineColor: Cesium.Color.WHITE,
      },
    })

    return entity
  } catch (error) {
    console.error("Error drawing parcel:", error)
    return undefined
  }
}

export function focusParcel(viewer: any, entity: any): void {
  if (!entity) return
  try {
    viewer.zoomTo(entity)
  } catch (error) {
    console.error("Error focusing on parcel:", error)
    // Fallback: fly to the polygon
    try {
      viewer.flyTo(entity, { duration: 2 })
        .catch(() => console.error("FlyTo failed"))
    } catch (flyError) {
      console.error("FlyTo also failed:", flyError)
    }
  }
}
