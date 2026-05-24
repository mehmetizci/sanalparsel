"use client";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ 
  title = "Bir Hata Oluştu", 
  message = "GeoJSON dosyası okunamadı. Lütfen parsel sınırı içeren geçerli bir dosya yükleyin.",
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-white font-bold text-xl mb-2">{title}</h3>
      <p className="text-muted mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/80 transition-colors"
        >
          Tekrar Dene
        </button>
      )}
    </div>
  );
}