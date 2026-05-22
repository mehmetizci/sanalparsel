'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Camera, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const passwordRequirements = [
    { met: password.length >= 8, text: 'En az 8 karakter' },
    { met: /[A-Z]/.test(password), text: 'Büyük harf içermeli' },
    { met: /[0-9]/.test(password), text: 'Rakam içermeli' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor')
      setIsLoading(false)
      return
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess(true)
      
      // In production, use Supabase auth:
      // const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    } catch (err) {
      setError('Kayıt olurken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Kayıt Başarılı!</h1>
            <p className="text-gray-400 mb-6">
              E-posta adresinize doğrulama linki gönderildi.
            </p>
            <Link href="/auth/login">
              <Button>Giriş Yap</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="relative w-full max-w-md">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </Link>

        <div className="glass rounded-2xl p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold gradient-text">SanalParsel</span>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">Hesap Oluşturun</h1>
          <p className="text-gray-400 text-center mb-8">
            Ücretsiz başlayın, profesyonel videolar oluşturun
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <Input
              type="text"
              label="Ad Soyad"
              placeholder="Ahmet Yılmaz"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User className="w-5 h-5" />}
              required
            />

            <Input
              type="email"
              label="E-posta"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-5 h-5" />}
              required
            />

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                label="Şifre"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-5 h-5" />}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password requirements */}
            <div className="space-y-2">
              {passwordRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className={`w-4 h-4 rounded flex items-center justify-center ${req.met ? 'bg-green-500/20 text-green-400' : 'bg-dark-600 text-gray-500'}`}>
                    {req.met && <Check className="w-3 h-3" />}
                  </div>
                  <span className={req.met ? 'text-green-400' : 'text-gray-500'}>{req.text}</span>
                </div>
              ))}
            </div>

            <Input
              type="password"
              label="Şifre Tekrar"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock className="w-5 h-5" />}
              required
            />

            <label className="flex items-start gap-3 text-sm text-gray-400">
              <input type="checkbox" className="mt-1 rounded border-gray-600" required />
              <span>
                <Link href="/terms" className="text-primary hover:text-primary/80">Kullanım Şartları</Link> ve{' '}
                <Link href="/privacy" className="text-primary hover:text-primary/80">Gizlilik Politikası</Link>'nı okudum ve kabul ediyorum
              </span>
            </label>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Hesap Oluştur
            </Button>
          </form>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Zaten hesabınız var mı?{' '}
            <Link href="/auth/login" className="text-primary hover:text-primary/80">
              Giriş Yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}