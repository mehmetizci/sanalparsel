'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

interface MapViewProps {
  geoJson: FeatureCollection | Feature | null;
  onParcelSelect?: (feature: Feature) => void;
}

interface ParcelProperties {
  ParselNo?: string;
  Alan?: string;
  Mevkii?: string;
  Nitelik?: string;
  Ada?: string;
  Il?: string;
  Ilce?: string;
  Pafta?: string;
  Mahalle?: string;
}

// Sample GeoJSON for testing
const SAMPLE_GEOJSON: FeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [26.85749, 38.66965],
        [26.85725, 38.66916],
        [26.85733, 38.66911],
        [26.85739, 38.66905],
        [26.85753, 38.66895],
        [26.85764, 38.66889],
        [26.85778, 38.66882],
        [26.85789, 38.66878],
        [26.85793, 38.66887],
        [26.85799, 38.66897],
        [26.85807, 38.66911],
        [26.85829, 38.66955],
        [26.85845, 38.66951],
        [26.85846, 38.66954],
        [26.85847, 38.66956],
        [26.85851, 38.66962],
        [26.85862, 38.66982],
        [26.85843, 38.66987],
        [26.85804, 38.66999],
        [26.85785, 38.67003],
        [26.85783, 38.66996],
        [26.85781, 38.66991],
        [26.85776, 38.66988],
        [26.85773, 38.66986],
        [26.85757, 38.6699],
        [26.85749, 38.66965]
      ]]
    },
    properties: {
      ParselNo: '467',
      Alan: '8.656,88',
      Mevkii: 'Camilimağara',
      Nitelik: 'Kule Ve Beş Zeytinli Tarla',
      Ada: '506130',
      Il: 'İzmir',
      Ilce: 'Foça',
      Pafta: 'K17-C-08-D-1-B',
      Mahalle: 'Hacıveli'
    }
  }]
};

export function MapView({ geoJson, onParcelSelect }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ x: number; y: number; props: ParcelProperties } | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<Feature | null>(null);

  // Use sample GeoJSON if no geoJson provided
  const dataToUse = geoJson || SAMPLE_GEOJSON as FeatureCollection;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: '© Esri'
          }
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [26.857, 38.669],
      zoom: 16,
      pitch: 45, // Google Earth havası için eğim
      bearing: 0,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add GeoJSON source
      map.current.addSource('parcel', {
        type: 'geojson',
        data: dataToUse as any,
        tolerance: 2
      });

      // Fill layer (içi hafif şeffaf kırmızı)
      map.current.addLayer({
        id: 'parcel-fill',
        type: 'fill',
        source: 'parcel',
        paint: {
          'fill-color': 'rgba(255, 0, 0, 0.1)',
          'fill-outline-color': 'rgba(255, 0, 0, 0.3)'
        }
      });

      // Line layer (kırmızı çizgi)
      map.current.addLayer({
        id: 'parcel-line',
        type: 'line',
        source: 'parcel',
        paint: {
          'line-color': '#FF0000',
          'line-width': 3,
          'line-opacity': 0.9
        }
      });

      // Fit bounds to GeoJSON
      const bounds = new maplibregl.LngLatBounds();
      const features = 'features' in dataToUse ? (dataToUse as FeatureCollection).features : [dataToUse as Feature];
      
      for (const feature of features) {
        if (!feature.geometry) continue;
        const geom = feature.geometry as Polygon;
        if (geom.coordinates && geom.coordinates[0]) {
          for (const coord of geom.coordinates[0]) {
            bounds.extend(coord as [number, number]);
          }
        }
      }

      map.current.fitBounds(bounds, {
        padding: 60,
        maxZoom: 17,
        duration: 1500
      });

      setLoading(false);
    });

    // Click event
    map.current.on('click', 'parcel-fill', (e) => {
      if (!e.features || !e.features[0]) return;
      const feature = e.features[0];
      const props = feature.properties as ParcelProperties;
      if (props) {
        setPopup({ x: e.point.x, y: e.point.y, props });
        onParcelSelect?.(feature as Feature);
      }
    });

    // Hover events
    map.current.on('mouseenter', 'parcel-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    
    map.current.on('mouseleave', 'parcel-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
      setHoveredFeature(null);
    });

    map.current.on('mousemove', 'parcel-fill', (e) => {
      if (!e.features || !e.features[0]) return;
      setHoveredFeature(e.features[0] as Feature);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update GeoJSON data when it changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    const source = map.current.getSource('parcel') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(dataToUse as any);
      
      // Re-fit bounds
      const bounds = new maplibregl.LngLatBounds();
      const features = 'features' in dataToUse ? (dataToUse as FeatureCollection).features : [dataToUse as Feature];
      
      for (const feature of features) {
        if (!feature.geometry) continue;
        const geom = feature.geometry as Polygon;
        if (geom.coordinates && geom.coordinates[0]) {
          for (const coord of geom.coordinates[0]) {
            bounds.extend(coord as [number, number]);
          }
        }
      }
      
      map.current.fitBounds(bounds, {
        padding: 60,
        maxZoom: 17,
        duration: 1000
      });
    }
  }, [geoJson]);

  const closePopup = () => setPopup(null);

  return (
    <div className="w-full h-full relative">
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: 3 }} />
            <p className="text-gray-400 text-sm">Harita yükleniyor...</p>
          </div>
        </div>
      )}
      
      {/* Hover tooltip */}
      {hoveredFeature && (hoveredFeature.properties as ParcelProperties) && (
        <div className="absolute top-4 left-4 bg-black/85 px-4 py-3 rounded-lg border border-red-500/50 z-10">
          <h3 className="text-red-500 font-bold">Parsel: {(hoveredFeature.properties as ParcelProperties).ParselNo}</h3>
          <p className="text-gray-400 text-sm">{(hoveredFeature.properties as ParcelProperties).Mahalle}</p>
        </div>
      )}
      
      {/* Click popup */}
      {popup && (
        <div 
          className="absolute z-20 bg-black/95 border border-red-500 rounded-xl p-4 min-w-[280px] shadow-2xl"
          style={{ 
            left: Math.min(popup.x, typeof window !== 'undefined' ? window.innerWidth - 300 : 400), 
            top: popup.y 
          }}
        >
          <button onClick={closePopup} className="absolute top-2 right-2 text-gray-400 hover:text-white">✕</button>
          
          <div className="space-y-3">
            <div className="border-b border-gray-700 pb-2">
              <h3 className="text-red-500 font-bold text-lg">Parsel {popup.props.ParselNo}</h3>
              <p className="text-gray-400 text-sm">{popup.props.Mahalle}, {popup.props.Ilce}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">İl</p>
                <p className="text-white">{popup.props.Il}</p>
              </div>
              <div>
                <p className="text-gray-500">İlçe</p>
                <p className="text-white">{popup.props.Ilce}</p>
              </div>
              <div>
                <p className="text-gray-500">Mahalle</p>
                <p className="text-white">{popup.props.Mahalle}</p>
              </div>
              <div>
                <p className="text-gray-500">Ada</p>
                <p className="text-white">{popup.props.Ada}</p>
              </div>
              <div>
                <p className="text-gray-500">Parsel No</p>
                <p className="text-white">{popup.props.ParselNo}</p>
              </div>
              <div>
                <p className="text-gray-500">Alan</p>
                <p className="text-white">{popup.props.Alan} m²</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Mevkii</p>
                <p className="text-white">{popup.props.Mevkii}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Nitelik</p>
                <p className="text-green-400">{popup.props.Nitelik}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black/85 px-3 py-2 rounded-lg text-xs z-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-1 bg-red-600" />
          <span className="text-gray-400">Parsel Sınırı</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500/20 border border-red-500/30" />
          <span className="text-gray-400">Parsel Alanı</span>
        </div>
      </div>
    </div>
  );
}