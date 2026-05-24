"use client";

interface UploadCardProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export default function UploadCard({ onFileSelect, accept = ".geojson,.json", disabled = false }: UploadCardProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "geojson" || ext === "json") {
        onFileSelect(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <label
      className={`block w-full cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="glass rounded-2xl p-8 text-center border-2 border-dashed border-white/10 hover:border-primary/50 transition-all duration-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-lg">GeoJSON Dosyası Yükle</p>
            <p className="text-muted text-sm mt-1">Sürükle bırak veya tıkla</p>
            <p className="text-muted/60 text-xs mt-2">.geojson veya .json formatında</p>
          </div>
        </div>
      </div>
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
    </label>
  );
}