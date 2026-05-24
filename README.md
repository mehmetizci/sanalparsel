# SanalParsel

**AI destekli emlak video platformu** - GeoJSON parsel dosyası yükleyerek mobil uyumlu, sinematik drone emlak videoları ve Reels/MP4 çıktısı üreten SaaS platformu.

## 🚀 Özellikler

- 📁 **GeoJSON Upload** - Parsel sınır dosyası yükleme
- 🗺️ **Cesium Parsel Önizleme** - Harita üzerinde parsel görüntüleme
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
4. Parsel Önizleme → Haritada görüntüle
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
