# SanalParsel

**AI destekli emlak video platformu** - GeoJSON parsel dosyası yükleyerek mobil uyumlu, sinematik drone emlak videoları ve Reels/MP4 çıktısı üreten SaaS platformu.

## 🚀 Özellikler

- 📁 **GeoJSON Upload** - Parsel sınır dosyası yükleme
- 🗺️ **MapLibre + Esri Uydu Önizleme** - Esri World Imagery üzerinde sinematik parsel görüntüleme (pitch / bearing / drone hissi)
- 🤖 **AI Çevre Analizi** - Yakın çevre bilgilerini otomatik alma (OpenStreetMap)
- 🔊 **ElevenLabs Seslendirme** - Profesyonel AI seslendirme
- 🎬 **Remotion Video** - Sinematik drone videosu kompozisyonu
- 📱 **MP4/Reels Export** - Hemen paylaşıma hazır video çıktısı

## 🛠️ Teknolojiler

- **Frontend**: Next.js 14 App Router + TypeScript
- **UI**: Mobile-first, dark premium SaaS tasarımı
- **Styling**: Tailwind CSS + Glassmorphism
- **Backend**: Supabase (Auth + PostgreSQL + Storage)
- **AI**: OpenRouter API
- **Voice**: ElevenLabs API
- **Payment**: iyzico kredi sistemi
- **Deploy**: Vercel

## 🎥 Sinematik Harita Teknolojisi

### Mapbox GL JS
High-quality satellite rendering with Mapbox GL JS:
- **Mapbox Satellite Streets** - Premium satellite imagery with labels
- **Style**: `mapbox://styles/mapbox/satellite-streets-v12`
- **Antialiasing** - Crisp edge rendering
- **preserveDrawingBuffer** - Frame capture for video export
- **pitch: 60°** - Cinematic drone-like viewing angle
- **Bearing animation** - Continuous rotation for dynamic feel

### GeoJSON Parcel Support
- Upload GeoJSON files directly
- Automatic parcel polygon rendering
- Red outline with transparent fill
- Fit bounds to uploaded parcel

### Token Configuration
```bash
# .env.local
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
```

If token is missing, a clear warning screen appears (no crash).

### Video Render Pipeline
```
┌─────────────┐    ┌──────────────┐    ┌────────────┐    ┌─────────┐
│ Cinematic   │───▶│ Frame Capture │───▶│ Image Sequence │───▶│ FFmpeg  │
│ Animation   │    │ (30 FPS)      │    │ (PNG/JPEG)    │    │ H264    │
└─────────────┘    └──────────────┘    └────────────┘    └─────────┘
```

**Video Spesifikasyonları:**
- Format: H264 MP4
- FPS: 30
- Bitrate: 20 Mbps minimum
- Resolution: 1080x1920 (9:16 Reels) veya 1920x1080 (Landscape)
- Rendering: Frame-by-frame (realtime canvas recording yok)

## 📦 Kurulum

### Gereksinimler

- Node.js 18+
- npm veya yarn
- Supabase hesabı

### Adımlar

1. **Projeyi klonlayın:**
```bash
git clone <repo-url>
cd sanalparsel
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Environment değişkenlerini ayarlayın:**
```bash
cp .env.example .env.local
```

4. **Supabase veritabanını ayarlayın:**
- Supabase SQL Editor'da `supabase/schema.sql` dosyasını çalıştırın

5. **Geliştirme sunucusunu başlatın:**
```bash
npm run dev
```

## 📁 Proje Yapısı

```
src/
├── app/                    # Next.js App Router sayfaları
│   ├── (auth)/            # Auth sayfaları (login, register)
│   ├── (dashboard)/       # Dashboard sayfaları
│   ├── projects/          # Proje wizard akışı
│   └── api/               # API route'ları
├── components/             # React bileşenleri
├── lib/                   # Yardımcı fonksiyonlar
├── types/                  # TypeScript tipleri
└── styles/                 # Global stiller
```

## 📱 Kullanıcı Akışı

1. Landing Page → Kayıt/Giriş
2. Dashboard → Yeni Proje Oluştur
3. GeoJSON Yükle → Parsel bilgilerini oku
4. Parsel Önizleme → MapLibre + Esri uydu haritasında sinematik drone görünümü
5. Drone Ayarları → Video süresi, yükseklik, kamera modu
6. Video Ayarları → Format ve bilgi göstergeleri
7. Çevre Bilgileri → PoI seçimi
8. AI Tanıtım Metni → OpenRouter ile metin üretimi
9. Seslendirme → ElevenLabs ile ses oluşturma
10. Video Önizleme → Render durumu
11. MP4 İndirme → Kredi sistemi ile indirme

## 🔧 Geliştirme

### Build
```bash
npm run build
```

### Production
```bash
npm run start
```

## 📄 Lisans

Bu proje özel kullanım için tasarlanmıştır.

---

**SanalParsel** - Emlak danışmanları için profesyonel video üretim platformu 🚀
