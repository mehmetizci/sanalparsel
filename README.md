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

### Rendering Kalitesi
MapLibre GL JS ile yüksek kaliteli uydu görüntüsü:
- **Esri World Imagery** - Yüksek çözünürlüklü uydu haritası
- **512px Tile Boyutu** - 256px yerine daha net görüntü
- **Antialiasing** - Keskin kenar yumuşatma
- **maxZoom 22** - Maksimum detay seviyesi
- **Pitch 55-65°** - Sinematik açı (drone hissi)
- **Atmospheric Fog** - Derinlik için sis efekti
- **Contrast 1.15 / Saturation 1.2** - Görüntü iyileştirme

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

### Tile Preloading
Video kaydı öncesi tüm tiles preload edilir:
- Zoom seviyeleri: 14, 16, 18, 20
- Parcel çevresi + buffer bölge
- 30 saniye timeout ile yükleme bekleme

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
