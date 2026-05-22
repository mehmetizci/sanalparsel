import Link from 'next/link'
import { Camera, MapPin, Zap, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-dark-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold gradient-text">SanalParsel</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-sm text-gray-400 hover:text-white transition-colors">
              Özellikler
            </Link>
            <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
              Fiyatlandırma
            </Link>
            <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">
              Dokümantasyon
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link 
              href="/auth/login"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Giriş Yap
            </Link>
            <Link 
              href="/auth/register"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-all hover:shadow-glow"
            >
              Ücretsiz Dene
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">AI Destekli Video Platformu</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            Gayrimenkulünüzü{' '}
            <span className="gradient-text">Sinematik</span> 
            {' '}Videoya Dönüştürün
          </h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            GeoJSON yükleyin, dakikalar içinde profesyonel drone tanıtım videoları oluşturun. 
            AI seslendirme, çevre analizi ve premium efektlerle satışlarınızı artırın.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link 
              href="/auth/register"
              className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all hover:shadow-glow-lg flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Hemen Başla
            </Link>
            <Link 
              href="/demo"
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5" />
              Demo İzle
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          {[
            {
              icon: MapPin,
              title: 'Parsel Yükleme',
              description: 'GeoJSON dosyası yükleyerek parselinizi harita üzerinde görselleştirin'
            },
            {
              icon: Camera,
              title: 'Sinematik Drone',
              description: '4 farklı açıdan profesyonel drone kamera hareketleri'
            },
            {
              icon: Sparkles,
              title: 'AI Seslendirme',
              description: 'Türkçe ElevenLabs sesi ile otomatik anlatım'
            }
          ].map((feature, index) => (
            <div 
              key={index}
              className="glass-light rounded-2xl p-6 hover:bg-white/[0.08] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          © 2024 SanalParsel. Tüm hakları saklıdır.
        </div>
      </footer>
    </main>
  )
}