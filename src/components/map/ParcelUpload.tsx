'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  parseGeoJSON,
  parseKML,
  parseCoordinates,
  getCenter,
  calculateArea,
} from '@/lib/geojson-utils';
import type { FeatureCollection } from 'geojson';

interface ParcelUploadProps {
  onParcelLoaded: (
    geojson: FeatureCollection,
    center: [number, number],
    area: number
  ) => void;
}

type InputMode = 'upload' | 'coordinates';

export function ParcelUpload({ onParcelLoaded }: ParcelUploadProps) {
  const [mode, setMode] = useState<InputMode>('upload');
  const [coordInput, setCoordInput] = useState('');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const processData = useCallback(
    (geojson: FeatureCollection) => {
      const center = getCenter(geojson);
      const area = calculateArea(geojson);
      onParcelLoaded(geojson, center, area);
    },
    [onParcelLoaded]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setFileName(file.name);
      setError('');

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let geojson: FeatureCollection;

          if (file.name.endsWith('.kml')) {
            geojson = parseKML(content);
          } else {
            geojson = parseGeoJSON(content);
          }

          if (geojson.features.length === 0) {
            setError('Dosyada geçerli parsel verisi bulunamadı');
            return;
          }

          processData(geojson);
        } catch {
          setError('Dosya okunamadı. Lütfen geçerli bir GeoJSON veya KML dosyası yükleyin.');
        }
      };
      reader.readAsText(file);
    },
    [processData]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json', '.geojson'],
      'application/vnd.google-earth.kml+xml': ['.kml'],
    },
    maxFiles: 1,
  });

  const handleCoordinateSubmit = () => {
    setError('');
    try {
      const geojson = parseCoordinates(coordInput);
      processData(geojson);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Koordinatlar geçersiz';
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={mode === 'upload' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setMode('upload')}
        >
          <Upload className="w-4 h-4 mr-2" />
          Dosya Yükle
        </Button>
        <Button
          variant={mode === 'coordinates' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setMode('coordinates')}
        >
          <MapPin className="w-4 h-4 mr-2" />
          Koordinat Gir
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-800 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {mode === 'upload' ? (
        <Card
          className={`border-2 border-dashed transition-all duration-300 ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/30'
          }`}
        >
          <div {...getRootProps()} className="cursor-pointer text-center py-8">
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">
              {isDragActive
                ? 'Dosyayı buraya bırakın'
                : 'GeoJSON veya KML dosyası yükleyin'}
            </p>
            <p className="text-sm text-muted">
              Sürükle & bırak veya tıklayarak dosya seçin
            </p>
            {fileName && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-primary">
                <FileText className="w-4 h-4" />
                {fileName}
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-muted mb-3">
              Her satıra bir koordinat çifti girin (boylam, enlem):
            </p>
            <textarea
              value={coordInput}
              onChange={(e) => setCoordInput(e.target.value)}
              placeholder={`29.0123, 41.0456\n29.0234, 41.0456\n29.0234, 41.0345\n29.0123, 41.0345`}
              className="w-full h-40 px-4 py-3 rounded-xl bg-background border border-border text-foreground font-mono text-sm placeholder:text-muted/50 focus:outline-none focus:border-primary/50 resize-none"
            />
          </Card>
          <Button onClick={handleCoordinateSubmit}>
            <MapPin className="w-4 h-4 mr-2" />
            Parseli Oluştur
          </Button>
        </div>
      )}
    </div>
  );
}
