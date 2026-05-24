import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";

const features = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    title: "GeoJSON Upload",
    description: "Parsel sınır dosyanızı yükleyin",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    title: "Sinematik Parsel Önizleme",
    description: "Esri uydu haritası üzerinde drone hissi",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "AI Çevre Analizi",
    description: "Yakın çevre bilgilerini otomatik al",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828-2.828" />
      </svg>
    ),
    title: "ElevenLabs Seslendirme",
    description: "Profesyonel AI seslendirme",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: "Remotion Video",
    description: "Sinematik drone videosu",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    title: "MP4/Reels Export",
    description: "Hemen paylaşıma hazır",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[80px]" />
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-card/50 px-4 py-2 rounded-full mb-8 border border-white/10">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-sm text-muted">Yeni nesil emlak videosu platformu</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Parselini AI destekli<br />
            <span className="gradient-text">drone videosuna</span><br />
            dönüştür
          </h1>
          
          <p className="text-xl text-muted mb-10 max-w-2xl mx-auto">
            GeoJSON yükle, cinematic video üret,<br className="hidden md:block" />
            Reels olarak paylaş.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <PrimaryButton size="lg" className="w-full sm:w-auto glow-primary">
                Ücretsiz Dene
              </PrimaryButton>
            </Link>
            <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="font-semibold">Demo Video İzle</span>
            </button>
          </div>
          
          <Link href="/login" className="inline-block mt-6 text-muted hover:text-white transition-colors">
            Hesabın var mı? <span className="text-primary">Giriş yap</span>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Tüm özellikler bir arada
          </h2>
          <p className="text-muted text-center mb-12 max-w-xl mx-auto">
            Emlak danışmanları için tasarlanmış, profesyonel video üretim platformu
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <GlassCard key={index} hover className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  {feature.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted text-sm">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-16 md:py-24 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            Nasıl Çalışır?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "GeoJSON Yükle", desc: "Parsel sınır dosyanı yükle" },
              { step: "2", title: "Ayarları Yap", desc: "Video ve drone ayarlarını seç" },
              { step: "3", title: "AI Oluştursun", desc: "Tanıtım metni ve ses oluştur" },
              { step: "4", title: "İndir & Paylaş", desc: "MP4 video indir" },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary text-white font-bold text-xl flex items-center justify-center">
                  {item.step}
                </div>
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-muted text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Hemen başla, profesyonel videolar üret
          </h2>
          <p className="text-muted text-lg mb-10">
            İlk videonu ücretsiz oluştur, sonuçları gör
          </p>
          <Link href="/register">
            <PrimaryButton size="lg" className="glow-accent">
              Ücretsiz Kaydol
            </PrimaryButton>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-muted text-sm">
            © 2024 SanalParsel. Tüm hakları saklıdır.
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-muted hover:text-white text-sm transition-colors">Gizlilik</a>
            <a href="#" className="text-muted hover:text-white text-sm transition-colors">Kullanım Şartları</a>
            <a href="#" className="text-muted hover:text-white text-sm transition-colors">İletişim</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
