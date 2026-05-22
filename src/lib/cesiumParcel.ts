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

    // Handle different coordinate structures
    let coordinates = geojson.features[0].geometry.coordinates
    
    // If it's a Polygon with ring as array of [lon, lat] pairs
    if (Array.isArray(coordinates[0][0])) {
      // coordinates is [[lon, lat, ...], ...] for Polygon
      coordinates = coordinates[0] // Get the outer ring
    }
    
    // Convert to Cesium Cartesian3 positions
    const positions: any[] = coordinates.map((coord: number[]) => {
      return Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
    })

    if (positions.length === 0) {
      console.error("No valid positions found in GeoJSON")
      return undefined
    }

    const entity = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        material: Cesium.Color.RED.withAlpha(0.4),
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
    try {
      viewer.flyTo(entity, { duration: 2 })
        .catch(() => console.error("FlyTo failed"))
    } catch (flyError) {
      console.error("FlyTo also failed:", flyError)
    }
  }
}
