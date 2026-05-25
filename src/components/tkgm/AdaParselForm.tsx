"use client";

import { useState, useEffect } from "react";

// Types
interface TKGMIl {
  id: number;
  name: string;
}

interface TKGMIlce {
  id: number;
  name: string;
}

interface TKGMMahalle {
  id: number;
  name: string;
}

interface ParcelQueryResult {
  success: boolean;
  parcel?: {
    adaNo: number;
    parselNo: number;
    alan: string;
    nitelik: string;
    pafta: string;
    il: string;
    ilce: string;
    mahalle: string;
    geometri: GeoJSON.Feature;
    center: { lat: number; lng: number };
  };
  error?: string;
  code?: string;
}

interface AdaParselFormProps {
  onSuccess: (result: ParcelQueryResult["parcel"]) => void;
  onCancel?: () => void;
}

export default function AdaParselForm({ onSuccess, onCancel }: AdaParselFormProps) {
  // Form state
  const [selectedIl, setSelectedIl] = useState<TKGMIl | null>(null);
  const [selectedIlce, setSelectedIlce] = useState<TKGMIlce | null>(null);
  const [selectedMahalle, setSelectedMahalle] = useState<TKGMMahalle | null>(null);
  const [adaNo, setAdaNo] = useState("");
  const [parselNo, setParselNo] = useState("");

  // Data state
  const [iller, setIller] = useState<TKGMIl[]>([]);
  const [ilceler, setIlceler] = useState<TKGMIlce[]>([]);
  const [mahalleler, setMahalleler] = useState<TKGMMahalle[]>([]);

  // Loading state
  const [loadingIller, setLoadingIller] = useState(true);
  const [loadingIlceler, setLoadingIlceler] = useState(false);
  const [loadingMahalleler, setLoadingMahalleler] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch iller on mount
  useEffect(() => {
    const fetchIller = async () => {
      try {
        const response = await fetch("/api/tkgm/iller");
        if (!response.ok) throw new Error("İl listesi alınamadı");
        const data = await response.json();
        setIller(data);
      } catch {
        setError("İl listesi yüklenemedi. Lütfen daha sonra tekrar deneyin.");
      } finally {
        setLoadingIller(false);
      }
    };
    fetchIller();
  }, []);

  // Fetch ilceler when il selected
  useEffect(() => {
    if (!selectedIl) {
      setIlceler([]);
      setSelectedIlce(null);
      return;
    }

    const fetchIlceler = async () => {
      setLoadingIlceler(true);
      try {
        const response = await fetch(`/api/tkgm/ilceler/${selectedIl.id}`);
        if (!response.ok) throw new Error("İlçe listesi alınamadı");
        const data = await response.json();
        setIlceler(data);
      } catch {
        setError("İlçe listesi yüklenemedi.");
      } finally {
        setLoadingIlceler(false);
      }
    };
    fetchIlceler();
  }, [selectedIl]);

  // Fetch mahalleler when ilce selected
  useEffect(() => {
    if (!selectedIlce) {
      setMahalleler([]);
      setSelectedMahalle(null);
      return;
    }

    const fetchMahalleler = async () => {
      setLoadingMahalleler(true);
      try {
        const response = await fetch(`/api/tkgm/mahalleler/${selectedIlce.id}`);
        if (!response.ok) throw new Error("Mahalle listesi alınamadı");
        const data = await response.json();
        setMahalleler(data);
      } catch {
        setError("Mahalle listesi yüklenemedi.");
      } finally {
        setLoadingMahalleler(false);
      }
    };
    fetchMahalleler();
  }, [selectedIlce]);

  const handleQuery = async () => {
    if (!selectedMahalle || !adaNo || !parselNo) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }

    setQuerying(true);
    setError(null);

    try {
      const response = await fetch("/api/tkgm/parcel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mahalleKodu: selectedMahalle.id,
          adaNo: parseInt(adaNo),
          parselNo: parseInt(parselNo),
        }),
      });

      const result: ParcelQueryResult = await response.json();

      if (!result.success || !result.parcel) {
        setError(result.error || "Parsel bulunamadı");
        setQuerying(false);
        return;
      }

      onSuccess(result.parcel);
    } catch {
      setError("Parsel sorgulanamadı. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setQuerying(false);
    }
  };

  const isFormValid = selectedMahalle && adaNo && parselNo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Ada / Parsel ile Sorgula</h2>
        <p className="text-muted text-sm">TKGM tapu veritabanından parsel sorgulayın</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-error mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-error text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-error/80 hover:text-error"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* İl */}
        <div>
          <label className="block text-sm text-muted mb-2">İl *</label>
          {loadingIller ? (
            <div className="h-12 bg-card/50 rounded-xl animate-pulse" />
          ) : (
            <select
              value={selectedIl?.id || ""}
              onChange={(e) => {
                const il = iller.find((i) => i.id === parseInt(e.target.value));
                setSelectedIl(il || null);
                setSelectedIlce(null);
                setSelectedMahalle(null);
              }}
              className="w-full h-12 px-4 bg-card/50 border border-border rounded-xl text-white focus:border-primary focus:outline-none appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23999999'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", backgroundSize: "1.5rem" }}
            >
              <option value="">İl seçin...</option>
              {iller.map((il) => (
                <option key={il.id} value={il.id}>{il.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* İlçe */}
        <div>
          <label className="block text-sm text-muted mb-2">İlçe *</label>
          {loadingIlceler || !selectedIl ? (
            <select
              disabled
              className="w-full h-12 px-4 bg-card/30 border border-border/50 rounded-xl text-muted appearance-none"
            >
              <option value="">Önce il seçin...</option>
            </select>
          ) : (
            <select
              value={selectedIlce?.id || ""}
              onChange={(e) => {
                const ilce = ilceler.find((i) => i.id === parseInt(e.target.value));
                setSelectedIlce(ilce || null);
                setSelectedMahalle(null);
              }}
              className="w-full h-12 px-4 bg-card/50 border border-border rounded-xl text-white focus:border-primary focus:outline-none appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23999999'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", backgroundSize: "1.5rem" }}
            >
              <option value="">İlçe seçin...</option>
              {ilceler.map((ilce) => (
                <option key={ilce.id} value={ilce.id}>{ilce.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Mahalle */}
        <div>
          <label className="block text-sm text-muted mb-2">Mahalle *</label>
          {loadingMahalleler || !selectedIlce ? (
            <select
              disabled
              className="w-full h-12 px-4 bg-card/30 border border-border/50 rounded-xl text-muted appearance-none"
            >
              <option value="">Önce ilçe seçin...</option>
            </select>
          ) : (
            <select
              value={selectedMahalle?.id || ""}
              onChange={(e) => {
                const mahalle = mahalleler.find((m) => m.id === parseInt(e.target.value));
                setSelectedMahalle(mahalle || null);
              }}
              className="w-full h-12 px-4 bg-card/50 border border-border rounded-xl text-white focus:border-primary focus:outline-none appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23999999'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", backgroundSize: "1.5rem" }}
            >
              <option value="">Mahalle seçin...</option>
              {mahalleler.map((mahalle) => (
                <option key={mahalle.id} value={mahalle.id}>{mahalle.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Ada / Parsel */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted mb-2">Ada *</label>
            <input
              type="text"
              inputMode="numeric"
              value={adaNo}
              onChange={(e) => setAdaNo(e.target.value.replace(/\D/g, ""))}
              placeholder="örn: 1234"
              className="w-full h-12 px-4 bg-card/50 border border-border rounded-xl text-white placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-2">Parsel *</label>
            <input
              type="text"
              inputMode="numeric"
              value={parselNo}
              onChange={(e) => setParselNo(e.target.value.replace(/\D/g, ""))}
              placeholder="örn: 56"
              className="w-full h-12 px-4 bg-card/50 border border-border rounded-xl text-white placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 h-12 px-4 bg-card/50 border border-border rounded-xl text-muted hover:text-white hover:border-border/80 transition-colors"
          >
            İptal
          </button>
        )}
        <button
          onClick={handleQuery}
          disabled={!isFormValid || querying}
          className="flex-1 h-12 px-4 bg-primary hover:bg-primary/90 disabled:bg-primary/30 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {querying ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sorgulanıyor...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Parsel Sorgula
            </>
          )}
        </button>
      </div>
    </div>
  );
}
