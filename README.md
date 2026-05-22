# SanalParsel - AI Drone Gayrimenkul Video Platformu

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-Auth-brightgreen?style=flat-square&logo=supabase" alt="Supabase" />
</div>

---

AI destekli drone video platformu ile gayrimenkulünüzü profesyonelce tanıtın. Parsel verisi yükleyin, sinematik drone videolar oluşturun.

## ✨ Özellikler

- **Parsel Yükleme**: GeoJSON dosyası yükleyerek parselinizi harita üzerinde görselleştirin
- **3D Harita Görünümü**: MapLibre GL JS ile interaktif harita, kırmızı parsel sınırları
- **Sinematik Drone**: 4 farklı açıdan profesyonel drone kamera hareketleri
- **İrtifa Kontrolü**: 100m, 200m, 300m, 500m seçenekleri
- **Video Süresi**: 30s, 45s, 60s seçenekleri
- **AI Seslendirme**: Türkçe ElevenLabs sesi ile otomatik anlatım
- **Çevre Analizi**: Yakındaki hastane, okul, market, sahil vb. önemli noktalar
- **Danışman Bilgileri**: Profil fotoğrafı, logo, telefon overlay
- **Glassmorphism UI**: Premium, futuristik, koyu tema
- **Üyelik Sistemi**: Email/şifre ile giriş (Supabase)
- **Dashboard**: Projeler, kredi sistemi, ayarlar
- **MP4 İndirme**: Oluşturulan videoyu indirin

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js 18+
- npm veya yarn
- Supabase hesabı (opsiyonel)
- ElevenLabs API key (opsiyonel)

### Kurulum

```bash
# Projeyi klonlayın
git clone https://github.com/mehmetizci/sanalparsel.git
cd sanalparsel

# Bağımlılıkları yükleyin
npm install

# .env.example'ı kopyalayın ve düzenleyin
cp .env.example .env.local
```

### Environment Variables (.env.local)

```bash
# Supabase (Zorunlu)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ElevenLabs (AI Voice - Opsiyonel)
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# OpenRouter (AI Text - Opsiyonel)
OPENROUTER_API_KEY=your-openrouter-api-key

# Cesium Ion (3D Terrain - Opsiyonel)
NEXT_PUBLIC_CESIUM_ION_TOKEN=your-cesium-ion-token
```

### Geliştirme

```bash
# Development server başlat
npm run dev

# Production build
npm run build

# Production server başlat
npm start
```

[http://localhost:3000](http://localhost:3000) adresini açın.

## 📁 Proje Yapısı

```
sanalparsel/
├── src/
│   ├── app/                    # Next.js App Router sayfaları
│   │   ├── auth/               # Giriş/Kayıt sayfaları
│   │   ├── dashboard/          # Dashboard sayfaları
│   │   └── page.tsx            # Ana sayfa
│   ├── components/
│   │   ├── ui/                 # Button, Card, Input
│   │   ├── map/                # MapView
│   │   ├── video/              # Video bileşenleri
│   │   └── overlays/           # Glassmorphism overlay
│   ├── lib/                    # Supabase, AI servisleri
│   └── types/                  # TypeScript tipleri
├── public/                     # Statik dosyalar
├── tailwind.config.ts          # TailwindCSS yapılandırması
└── next.config.ts              # Next.js yapılandırması
```

## 🎨 Teknolojiler

| Kategori | Teknoloji |
|----------|-----------|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | TailwindCSS 3.4, Framer Motion |
| Maps | MapLibre GL JS, Cesium |
| Backend | Supabase (Auth + Database) |
| AI | ElevenLabs, OpenRouter |
| Payments | iyzico |

## 🌐 Dağıtım

### Vercel (Önerilen)

1. [Vercel](https://vercel.com) hesabı oluşturun
2. GitHub repo'nuzu bağlayın
3. Environment variables ekleyin (Settings → Environment Variables)
4. Deploy butonuna tıklayın

### Manuel Dağıtım

```bash
npm run build
vercel --prod
```

## 🔧 Kurulum Kılavuzları

### Supabase Kurulum

1. [supabase.com](https://supabase.com) adresinde hesap oluşturun
2. Yeni proje oluşturun
3. Project Settings → API bölümünde:
   - Project URL kopyalayın → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key kopyalayın → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. SQL Editor'da aşağıdaki şemayı çalıştırın:

```sql
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geojson_data JSONB,
  drone_settings JSONB,
  branding JSONB,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);
```

### ElevenLabs Kurulum

1. [elevenlabs.io](https://elevenlabs.io) adresinde hesap oluşturun
2. Profile → API Key bölümüne gidin
3. API key'i kopyalayın → `ELEVENLABS_API_KEY`

## 📱 Responsive Tasarım

| Breakpoint | Açıklama |
|------------|----------|
| sm (640px) | Mobil cihazlar |
| md (768px) | Tabletler |
| lg (1024px) | Laptoplar |
| xl (1280px) | Desktoplar |

## 🐛 Sorun Giderme

### MapLibre haritası yüklenmiyor
- `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` ayarlandığından emin olun

### AI seslendirme çalışmıyor
- `ELEVENLABS_API_KEY` ayarlandığından emin olun
- ElevenLabs hesabınızda yeterli kredi olduğunu kontrol edin

### Build hatası
- Node.js sürümünün 18+ olduğunu kontrol edin
- `npm cache clean --force` çalıştırın
- `node_modules` klasörünü silip yeniden `npm install` çalıştırın

## 📄 Lisans

MIT License

## 👨‍💻 Geliştirici

**Mehmet İzci** - [GitHub](https://github.com/mehmetizci)
