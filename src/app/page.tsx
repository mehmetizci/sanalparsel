'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Upload,
  Sparkles,
  Download,
  MapPin,
  Plane,
  Mic,
  Eye,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Drone,
} from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: <Upload className="w-6 h-6" />,
      title: 'Parsel Yükleme',
      desc: 'GeoJSON, KML veya koordinat girişi ile parsel verisi yükleyin.',
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: '3D Harita Görünümü',
      desc: 'Parsel sınırları kırmızı çerçeve ile 3D haritada görüntülenir.',
    },
    {
      icon: <Plane className="w-6 h-6" />,
      title: 'Drone Animasyonu',
      desc: '4 farklı açıdan sinematik drone kamera hareketleri.',
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: 'AI Seslendirme',
      desc: 'Türkçe AI seslendirme ile profesyonel tanıtım metni.',
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: 'Çevre Analizi',
      desc: 'Yakındaki hastane, okul, market gibi önemli noktalar.',
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: 'MP4 İndirme',
      desc: 'Oluşturulan videoyu MP4 formatında indirin ve paylaşın.',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Parsel Yükleyin',
      desc: 'GeoJSON, KML dosyası veya koordinatları girin.',
    },
    {
      step: '02',
      title: 'Bilgileri Ayarlayın',
      desc: 'Danışman bilgileri, drone ayarları ve seslendirme.',
    },
    {
      step: '03',
      title: 'Video Oluşturun',
      desc: 'AI otomatik olarak profesyonel drone videosu oluşturur.',
    },
    {
      step: '04',
      title: 'İndirin & Paylaşın',
      desc: 'MP4 videoyu indirin, QR kod veya sosyal medyada paylaşın.',
    },
  ];

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-red-500 mb-8">
              <Sparkles className="w-4 h-4" />
              AI Destekli Drone Video Platformu
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="gradient-text">Gayrimenkul</span> İçin
              <br />
              Sanal Drone Videoları
            </h1>

            <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10">
              Parsel verisi yükleyin, dakikalar içinde profesyonel sinematik
              drone tanıtım videosu alın. AI seslendirme, çevre analizi ve
              danışman bilgileri dahil.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="text-base">
                  <Drone className="w-5 h-5 mr-2" />
                  Ücretsiz Başlayın
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="secondary" size="lg" className="text-base">
                  Giriş Yap
                </Button>
              </Link>
            </div>
          </div>

          {/* Demo preview */}
          <div className="mt-20 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-red-500/20 via-primary/10 to-primary/20 rounded-3xl blur-xl" />
            <div className="relative aspect-video max-w-5xl mx-auto rounded-2xl overflow-hidden border border-border bg-card">
              <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-primary/5 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <Drone className="w-10 h-10 text-red-500" />
                  </div>
                  <p className="text-lg font-semibold">Video Önizleme</p>
                  <p className="text-sm text-muted mt-1">
                    Proje oluşturarak drone video önizlemesini görebilirsiniz
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Güçlü <span className="gradient-text">Özellikler</span>
            </h2>
            <p className="text-muted max-w-2xl mx-auto">
              Profesyonel gayrimenkul tanıtım videoları oluşturmak için
              ihtiyacınız olan her şey tek bir platformda.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} hover className="group">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Nasıl <span className="gradient-text">Çalışır</span>?
            </h2>
            <p className="text-muted max-w-2xl mx-auto">
              4 basit adımda profesyonel drone videonuzu oluşturun.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, i) => (
              <div key={item.step} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-red-500/30 to-transparent" />
                )}
                <div className="text-5xl font-black text-red-500/10 mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-8 h-8" />,
                title: 'Hızlı Oluşturma',
                desc: '30-60 saniye içinde profesyonel drone videosu.',
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: 'Güvenli Platform',
                desc: 'Verileriniz güvende, Supabase altyapısı ile.',
              },
              {
                icon: <Globe className="w-8 h-8" />,
                title: 'Türkçe Destek',
                desc: 'Tamamen Türkçe arayüz ve AI seslendirme.',
              },
            ].map((item) => (
              <Card key={item.title} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Hemen <span className="gradient-text">Başlayın</span>
          </h2>
          <p className="text-muted mb-8">
            Gayrimenkul tanıtımlarınızı bir üst seviyeye taşıyın.
            AI destekli drone videoları ile fark yaratın.
          </p>
          <Link href="/auth/register">
            <Button size="lg">
              <Sparkles className="w-5 h-5 mr-2" />
              Ücretsiz Hesap Oluştur
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
                <Drone className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold">DroneView AI</span>
            </div>
            <p className="text-xs text-muted">
              &copy; {new Date().getFullYear()} DroneView AI. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
