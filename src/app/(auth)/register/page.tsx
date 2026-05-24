"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Kayıt olurken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <GlassCard className="max-w-md text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Hoş Geldiniz!</h2>
          <p className="text-muted mb-6">
            E-posta adresinize doğrulama bağlantısı gönderildi. Lütfen e-postanızı kontrol edin.
          </p>
          <Link href="/login">
            <PrimaryButton>Giriş Yap</PrimaryButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold gradient-text">SanalParsel</h1>
          </Link>
          <p className="text-muted mt-2">Yeni hesap oluşturun</p>
        </div>

        <GlassCard className="p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-warning text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-white font-medium mb-2">Ad Soyad</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ahmet Yılmaz"
                required
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3 text-white placeholder-muted/50 focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3 text-white placeholder-muted/50 focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-card/50 border border-white/10 rounded-xl p-3 text-white placeholder-muted/50 focus:outline-none focus:border-primary/50"
              />
              <p className="text-muted text-xs mt-1">En az 6 karakter</p>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 w-4 h-4 rounded border-white/20 bg-card/50 text-primary focus:ring-primary"
              />
              <label htmlFor="terms" className="text-sm text-muted">
                <Link href="/terms" className="text-primary hover:underline">Kullanım Şartları</Link> ve{" "}
                <Link href="/privacy" className="text-primary hover:underline">Gizlilik Politikası</Link>nı kabul ediyorum
              </label>
            </div>

            <PrimaryButton type="submit" fullWidth loading={loading}>
              Hesap Oluştur
            </PrimaryButton>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-4 text-muted">veya</span>
            </div>
          </div>

          <button
            onClick={handleGoogleRegister}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google ile Kayıt Ol
          </button>
        </GlassCard>

        <p className="text-center text-muted mt-6">
          Zaten hesabınız var mı?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}