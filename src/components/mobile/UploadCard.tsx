'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface UploadCardProps {
  onUpload: (file: File) => void
  accept?: Record<string, string[]>
  label?: string
  hint?: string
}

export default function UploadCard({ 
  onUpload, 
  accept = { 'application/json': ['.json', '.geojson'] },
  label = 'Dosya Seç',
  hint = '.geojson / .json'
}: UploadCardProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0])
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false
  })

  return (
    <div 
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        isDragActive 
          ? 'border-[#2563EB] bg-[#2563EB]/10' 
          : 'border-white/20 hover:border-white/40 bg-white/5'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[#2563EB]/20 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div>
          <p className="text-white font-medium">Dosyanı buraya yükle</p>
          <p className="text-gray-400 text-sm mt-1">{hint}</p>
        </div>
        <button 
          type="button"
          className="mt-2 px-6 py-3 bg-white/10 rounded-xl text-white font-medium hover:bg-white/20 transition-colors"
        >
          {label}
        </button>
      </div>
    </div>
  )
}