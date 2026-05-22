# SanalParsel - AI Drone Gayrimenkul Video Platformu

AI destekli gayrimenkul drone video ve Auto Reels platformu.

## Özellikler

- **GeoJSON Upload** - Parsel verisini harita üzerinde görselleştirme
- **Cesium 3D Görselleştirme** - 3D arazi ve parsel görüntüleme
- **Sinematik Drone Animasyonları** - 4 farklı kamera hareketi
- **AI Çevre Analizi** - OpenRouter ile çevre analizi
- **ElevenLabs Seslendirme** - Türkçe AI sesli anlatım
- **iyzico Ödeme** - Güvenli ödeme entegrasyonu
- **FFmpeg Video Merge** - Video + ses birleştirme
- **Reels Timeline Engine** - Sosyal medya için kısa video formatı

## Teknolojiler

- **Next.js 14** - React framework
- **TypeScript** - Tip güvenli kod
- **CesiumJS** - 3D harita ve görselleştirme
- **Supabase** - Auth ve veritabanı
- **ElevenLabs** - AI seslendirme
- **OpenRouter** - AI analiz
- **FFmpeg** - Video işleme
- **iyzico** - Ödeme sistemi

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Environment değişkenlerini ayarla
cp .env.example .env.local

# Geliştirme sunucusunu başlat
npm run dev
```

## Environment Değişkenleri

```bash
# Supabase (Auth + Database)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Services
OPENROUTER_API_KEY=your-openrouter-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# Payment
IYZIPAY_API_KEY=your-iyzipay-key
IYZIPAY_SECRET_KEY=your-iyzipay-secret

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Sayfalar

| Route | Açıklama |
|-------|----------|
| `/` | Ana sayfa - platform tanıtımı |
| `/upload` | GeoJSON dosya yükleme |
| `/reels` | Auto Reels oluşturucu |
| `/dashboard` | Proje dashboard |
| `/profile` | Kullanıcı profil ayarları |
| `/api/ai/analyze` | AI çevre analizi endpoint |
| `/api/voice` | ElevenLabs seslendirme |
| `/api/payment/create` | iyzico ödeme başlatma |
| `/api/merge-video` | FFmpeg video + ses merge |

## Supabase Kurulumu

1. [supabase.com](https://supabase.com) hesabı oluşturun
2. Yeni proje oluşturun
3. `supabase/schema.sql` içeriğini SQL Editor'da çalıştırın

## Deploy

### Vercel

```bash
# Vercel CLI ile deploy
vercel --prod
```

### GitHub Actions

1. GitHub repo'da Settings → Secrets ekleyin:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

2. `production-ready` branch'ine push edin

## Lisans

MIT
