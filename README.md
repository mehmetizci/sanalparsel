# DroneView AI - Gayrimenkul Sanal Drone Video Platformu

AI destekli gayrimenkul sanal drone video oluşturma platformu. Parsel verisi yükleyin, dakikalar içinde profesyonel sinematik drone tanıtım videosu alın.

## Özellikler

- **Parsel Yükleme**: GeoJSON, KML dosyası veya koordinat girişi
- **3D Harita Görünümü**: MapLibre GL JS ile interaktif harita, kırmızı parsel sınırları
- **Drone Animasyonu**: 4 farklı açıdan sinematik kamera hareketleri (Kuzeydoğu, Güneybatı, Kuşbakışı, Alçak İrtifa)
- **İrtifa Kontrolü**: 100m, 200m, 300m, 500m seçenekleri
- **Video Süresi**: 30s, 45s, 60s seçenekleri
- **AI Seslendirme**: Türkçe otomatik veya özel metin seslendirme
- **Çevre Analizi**: Yakındaki hastane, okul, market, sahil vb. 5 önemli nokta
- **Danışman Bilgileri**: Profil fotoğrafı, logo, telefon, yetki belgesi overlay
- **Glassmorphism UI**: Premium, futuristik, minimal koyu tema
- **Üyelik Sistemi**: Google ve email/şifre ile giriş (Supabase)
- **Dashboard**: Projeler, parseller, kredi sistemi, ayarlar
- **MP4 İndirme**: Oluşturulan videoyu indirin ve paylaşın
- **QR Kod**: Video için QR kod oluşturma
- **Mobil Uyumlu**: Tam responsive tasarım

## Teknolojiler

- **Frontend**: Next.js 16, React, TailwindCSS v4
- **Harita**: MapLibre GL JS
- **Backend**: Supabase (Auth + Database)
- **Kimlik Doğrulama**: Google Login, Email/Password
- **UI**: Glassmorphism, Framer Motion, Lucide Icons
- **Dil**: TypeScript

## Kurulum

```bash
# Bağımlılıkları yükleyin
npm install

# .env.example'ı kopyalayın ve düzenleyin
cp .env.example .env.local

# Geliştirme sunucusunu başlatın
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresini açın.

## Ortam Değişkenleri

`.env.local` dosyasında aşağıdaki değişkenleri ayarlayın:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key (opsiyonel)
OPENAI_API_KEY=your-openai-api-key (opsiyonel)
```

## Proje Yapısı

```
src/
├── app/                    # Next.js App Router sayfaları
│   ├── api/               # API route handlers
│   ├── auth/              # Giriş/Kayıt sayfaları
│   └── dashboard/         # Dashboard sayfaları
├── components/
│   ├── auth/              # Kimlik doğrulama bileşenleri
│   ├── dashboard/         # Dashboard bileşenleri
│   ├── layout/            # Navbar, footer
│   ├── map/               # Harita ve parsel yükleme
│   ├── overlays/          # Video overlay bileşenleri
│   ├── ui/                # Temel UI bileşenleri
│   └── video/             # Drone, seslendirme, render
├── hooks/                 # React hooks (Auth, ProjectStore)
├── lib/                   # Yardımcı fonksiyonlar
└── types/                 # TypeScript tipleri
```

## Dağıtım

Vercel üzerinde dağıtım için:

```bash
npm run build
```

## Lisans

MIT
