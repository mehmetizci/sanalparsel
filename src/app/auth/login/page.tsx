"use client"
import {useState} from "react"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Auth logic will be implemented with Supabase
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#07182f",
      padding: 20
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)",
        borderRadius: 16,
        padding: 40,
        maxWidth: 400,
        width: "100%",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <h1 style={{fontSize: 32, marginBottom: 8, color: "white"}}>Giriş Yap</h1>
        <p style={{color: "#94a3b8", marginBottom: 32}}>
          Hesabınız yok mu? <Link href="/auth/register" style={{color: "#3b82f6"}}>Kayıt Ol</Link>
        </p>
        <form onSubmit={handleSubmit} style={{display: "flex", flexDirection: "column", gap: 20}}>
          <div>
            <label style={{display: "block", color: "#94a3b8", marginBottom: 8}}>E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.05)",
                color: "white",
                fontSize: 16
              }}
              placeholder="ornek@email.com"
            />
          </div>
          <div>
            <label style={{display: "block", color: "#94a3b8", marginBottom: 8}}>Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.05)",
                color: "white",
                fontSize: 16
              }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: 14,
              borderRadius: 8,
              background: loading ? "#1d4ed8" : "#2563eb",
              color: "white",
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              border: "none"
            }}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
        <p style={{marginTop: 24, textAlign: "center"}}>
          <Link href="/" style={{color: "#94a3b8"}}>← Ana Sayfa</Link>
        </p>
      </div>
    </div>
  )
}
