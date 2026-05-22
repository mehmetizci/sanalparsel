export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#07182f",
      color: "white",
      padding: 48
    }}>
      <div style={{maxWidth: 1200, margin: "0 auto"}}>
        <header style={{marginBottom: 64}}>
          <h1 style={{fontSize: 64, fontWeight: 700, marginBottom: 16}}>
            SanalParsel
          </h1>
          <p style={{fontSize: 24, color: "#94a3b8", maxWidth: 700}}>
            GeoJSON parsel verisini AI destekli cinematic drone videosuna ve Reels formatına dönüştür.
          </p>
          <div style={{marginTop: 32, display: "flex", gap: 16, flexWrap: "wrap"}}>
            <a href="/upload" style={{
              color: "white",
              background: "#2563eb",
              padding: "14px 28px",
              borderRadius: 12,
              textDecoration: "none",
              fontSize: 18,
              fontWeight: 600
            }}>
              GeoJSON Yükle
            </a>
            <a href="/reels" style={{
              color: "white",
              background: "#7c3aed",
              padding: "14px 28px",
              borderRadius: 12,
              textDecoration: "none",
              fontSize: 18,
              fontWeight: 600
            }}>
              Reels Oluştur
            </a>
            <a href="/dashboard" style={{
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              padding: "14px 28px",
              borderRadius: 12,
              textDecoration: "none",
              fontSize: 18
            }}>
              Dashboard
            </a>
          </div>
        </header>

        <section style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24}}>
          <FeatureCard
            icon="📍"
            title="GeoJSON Upload"
            description="Parsel verisini harita üzerinde görselleştirin"
            href="/upload"
          />
          <FeatureCard
            icon="🎬"
            title="Cinematic Drone"
            description="4 farklı açıdan profesyonel drone kamera hareketleri"
            href="/reels"
          />
          <FeatureCard
            icon="🗣️"
            title="AI Seslendirme"
            description="ElevenLabs ile Türkçe sesli anlatım"
            href="/reels"
          />
          <FeatureCard
            icon="💳"
            title="Ödeme"
            description="iyzico ile güvenli ödeme entegrasyonu"
            href="/dashboard"
          />
          <FeatureCard
            icon="📊"
            title="Çevre Analizi"
            description="AI destekli çevre ve ada analizi"
            href="/upload"
          />
          <FeatureCard
            icon="📱"
            title="Sosyal Medya"
            description="Instagram, TikTok ve YouTube Shorts formatları"
            href="/reels"
          />
        </section>

        <footer style={{marginTop: 80, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.1)"}}>
          <p style={{color: "#64748b"}}>
            SanalParsel © 2024 | AI Drone Gayrimenkul Video Platformu
          </p>
        </footer>
      </div>
    </main>
  )
}

function FeatureCard({icon, title, description, href}: {
  icon: string
  title: string
  description: string
  href: string
}) {
  return (
    <a href={href} style={{
      background: "rgba(255,255,255,0.05)",
      borderRadius: 16,
      padding: 28,
      textDecoration: "none",
      color: "white",
      border: "1px solid rgba(255,255,255,0.1)",
      transition: "transform 0.2s, border-color 0.2s"
    }}>
      <span style={{fontSize: 48}}>{icon}</span>
      <h3 style={{fontSize: 24, fontWeight: 600, marginTop: 16}}>{title}</h3>
      <p style={{color: "#94a3b8", marginTop: 8, lineHeight: 1.6}}>{description}</p>
    </a>
  )
}
