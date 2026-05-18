import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

export function parseGeoJSON(input: string): FeatureCollection {
  const parsed = JSON.parse(input);

  if (parsed.type === 'FeatureCollection') {
    return parsed as FeatureCollection;
  }

  if (parsed.type === 'Feature') {
    return {
      type: 'FeatureCollection',
      features: [parsed as Feature],
    };
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: parsed as Geometry,
      },
    ],
  };
}

export function parseKML(kmlString: string): FeatureCollection {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlString, 'text/xml');
  const placemarks = doc.querySelectorAll('Placemark');
  const features: Feature[] = [];

  placemarks.forEach((placemark) => {
    const coordsEl =
      placemark.querySelector('coordinates') ||
      placemark.querySelector('coord');
    if (!coordsEl?.textContent) return;

    const coordsText = coordsEl.textContent.trim();
    const coords = coordsText
      .split(/\s+/)
      .filter(Boolean)
      .map((c) => {
        const parts = c.split(',').map(Number);
        return [parts[0], parts[1]] as Position;
      });

    if (coords.length >= 3) {
      features.push({
        type: 'Feature',
        properties: {
          name: placemark.querySelector('name')?.textContent || '',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
      });
    } else if (coords.length === 1) {
      features.push({
        type: 'Feature',
        properties: {
          name: placemark.querySelector('name')?.textContent || '',
        },
        geometry: {
          type: 'Point',
          coordinates: coords[0],
        },
      });
    }
  });

  return { type: 'FeatureCollection', features };
}

export function parseCoordinates(input: string): FeatureCollection {
  const lines = input
    .trim()
    .split('\n')
    .filter(Boolean);
  const coords: Position[] = lines.map((line) => {
    const parts = line.split(/[,\s]+/).map(Number);
    return [parts[0], parts[1]];
  });

  if (coords.length < 3) {
    throw new Error('En az 3 koordinat noktası gereklidir');
  }

  if (
    coords[0][0] !== coords[coords.length - 1][0] ||
    coords[0][1] !== coords[coords.length - 1][1]
  ) {
    coords.push([...coords[0]]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
      },
    ],
  };
}

export function getCenter(geojson: FeatureCollection): [number, number] {
  const coords = getAllCoordinates(geojson);
  if (coords.length === 0) return [0, 0];

  const sumLng = coords.reduce((s, c) => s + c[0], 0);
  const sumLat = coords.reduce((s, c) => s + c[1], 0);
  return [sumLng / coords.length, sumLat / coords.length];
}

export function getBounds(
  geojson: FeatureCollection
): [[number, number], [number, number]] {
  const coords = getAllCoordinates(geojson);
  if (coords.length === 0) return [[0, 0], [0, 0]];

  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;

  for (const c of coords) {
    if (c[0] < minLng) minLng = c[0];
    if (c[1] < minLat) minLat = c[1];
    if (c[0] > maxLng) maxLng = c[0];
    if (c[1] > maxLat) maxLat = c[1];
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function getAllCoordinates(geojson: FeatureCollection): Position[] {
  const coords: Position[] = [];

  for (const feature of geojson.features) {
    extractCoords(feature.geometry, coords);
  }

  return coords;
}

function extractCoords(geometry: Geometry, coords: Position[]): void {
  switch (geometry.type) {
    case 'Point':
      coords.push(geometry.coordinates);
      break;
    case 'MultiPoint':
    case 'LineString':
      coords.push(...geometry.coordinates);
      break;
    case 'MultiLineString':
    case 'Polygon':
      for (const ring of geometry.coordinates) {
        coords.push(...ring);
      }
      break;
    case 'MultiPolygon':
      for (const polygon of geometry.coordinates) {
        for (const ring of polygon) {
          coords.push(...ring);
        }
      }
      break;
    case 'GeometryCollection':
      for (const g of geometry.geometries) {
        extractCoords(g, coords);
      }
      break;
  }
}

export function calculateArea(geojson: FeatureCollection): number {
  let totalArea = 0;
  for (const feature of geojson.features) {
    if (
      feature.geometry.type === 'Polygon' ||
      feature.geometry.type === 'MultiPolygon'
    ) {
      totalArea += approximateArea(feature.geometry);
    }
  }
  return totalArea;
}

function approximateArea(
  geometry: Geometry & { type: 'Polygon' | 'MultiPolygon' }
): number {
  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.coordinates;

  let area = 0;
  for (const polygon of polygons) {
    const ring = polygon[0];
    for (let i = 0; i < ring.length - 1; i++) {
      const j = (i + 1) % ring.length;
      const xi = ring[i][0] * (Math.PI / 180);
      const yi = ring[i][1] * (Math.PI / 180);
      const xj = ring[j][0] * (Math.PI / 180);
      const yj = ring[j][1] * (Math.PI / 180);
      area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
    }
  }
  area = (Math.abs(area) * 6371000 * 6371000) / 2;
  return area;
}
