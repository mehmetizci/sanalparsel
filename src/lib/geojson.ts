import { generateProjectName, generateShortProjectName } from "./projectName"

export function parseParcelGeoJson(geojson: any) {
  const feature = geojson?.features?.[0]
  const properties = feature?.properties || {}
  const coords = feature?.geometry?.coordinates?.[0] || []

  let lat = 0
  let lon = 0

  coords.forEach(([x, y]: number[]) => {
    lon += x
    lat += y
  })

  const center = coords.length
    ? { lat: lat / coords.length, lon: lon / coords.length }
    : null

  return {
    properties,
    projectName: generateProjectName(properties),
    shortProjectName: generateShortProjectName(properties),
    center,
    coordinates: coords
  }
}
