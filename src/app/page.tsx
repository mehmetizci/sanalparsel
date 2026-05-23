import Link from 'next/link'

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#07182F",
      color: "white",
      padding: 24,
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ fontSize: 42, marginTop: 48 }}>SanalParsel</h1>
      <p style={{ fontSize: 20, color: "#CBD5E1", lineHeight: 1.5 }}>
        Parselini AI destekli drone videosuna dönüştür.
      </p>
      <div style={{ display: "grid", gap: 12, marginTop: 32 }}>
        <Link href="/dashboard" style={{
          background: "linear-gradient(135deg,#2563EB,#7C3AED)",
          padding: 16,
          borderRadius: 16,
          color: "white",
          textAlign: "center",
          textDecoration: "none"
        }}>
          Ücretsiz Dene
        </Link>
        <Link href="/auth/login" style={{
          border: "1px solid rgba(255,255,255,.25)",
          padding: 16,
          borderRadius: 16,
          color: "white",
          textAlign: "center",
          textDecoration: "none"
        }}>
          Giriş Yap
        </Link>
      </div>
    </main>
  )
}
