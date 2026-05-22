'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Camera, ArrowLeft, User, Lock, Key, Globe, Database,
  Check, Copy, ExternalLink, AlertCircle, CheckCircle2
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [copied, setCopied] = useState('')

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const envVars = [
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      label: 'Supabase URL',
      description: 'Supabase projenizin URL adresi',
      example: 'https://xxxxx.supabase.co',
      required: true,
      icon: Database,
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      label: 'Supabase Anon Key',
      description: 'Supabase anon anahtarınız',
      example: 'eyJhbGciOiJIUzI1NiIs...',
      required: true,
      icon: Key,
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      label: 'Supabase Service Role Key',
      description: 'Supabase service role anahtarı (sunucu tarafı)',
      example: 'eyJhbGciOiJIUzI1NiIs...',
      required: false,
      icon: Lock,
    },
    {
      key: 'ELEVENLABS_API_KEY',
      label: 'ElevenLabs API Key',
      description: 'AI seslendirme için ElevenLabs API anahtarı',
      example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: false,
      icon: Key,
    },
    {
      key: 'ELEVENLABS_VOICE_ID',
      label: 'ElevenLabs Voice ID',
      description: 'Kullanılacak sesin ID si (opsiyonel)',
      example: '21m00Tcm4TlvDq8ikWAM',
      required: false,
      icon: User,
    },
    {
      key: 'OPENROUTER_API_KEY',
      label: 'OpenRouter API Key',
      description: 'AI metin üretimi için OpenRouter API anahtarı',
      example: 'sk-or-v1-xxxxxxxxxxxx',
      required: false,
      icon: Key,
    },
    {
      key: 'NEXT_PUBLIC_CESIUM_ION_TOKEN',
      label: 'Cesium Ion Token',
      description: '3D arazi görünümü için Cesium Ion token',
      example: 'eyJhbGciOiJIUzI1NiIs...',
      required: false,
      icon: Globe,
    },
  ]

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Güvenlik', icon: Lock },
    { id: 'api-keys', label: 'API Anahtarları', icon: Key },
  ]

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link 
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Ayarlar</h1>
              <p className="text-sm text-gray-400">Hesap ve uygulama ayarları</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-6">Profil Bilgileri</h2>
              
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 rounded-xl bg-primary/20 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <Button variant="secondary" size="sm">Fotoğraf Değiştir</Button>
                  <p className="text-xs text-gray-500 mt-2">JPG, PNG. Maksimum 2MB</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Ad Soyad" defaultValue="Demo Kullanıcı" />
                <Input label="E-posta" defaultValue="demo@sanalparsel.com" type="email" />
                <Input label="Telefon" defaultValue="+90 5XX XXX XX XX" />
                <Input label="Şirket (opsiyonel)" placeholder="Şirket adı" />
              </div>

              <div className="mt-6 flex justify-end">
                <Button>Değişiklikleri Kaydet</Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-6">Şifre Değiştir</h2>
              <div className="space-y-4 max-w-md">
                <Input label="Mevcut Şifre" type="password" placeholder="••••••••" />
                <Input label="Yeni Şifre" type="password" placeholder="••••••••" />
                <Input label="Yeni Şifre Tekrar" type="password" placeholder="••••••••" />
                <Button>Şifreyi Güncelle</Button>
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">İki Faktörlü Doğrulama</h2>
              <p className="text-gray-400 text-sm mb-4">
                Hesabınızı ekstra güvenlik için 2FA ile koruyun.
              </p>
              <Button variant="secondary">2FA Ayarla (Yakında)</Button>
            </div>
          </div>
        )}

        {activeTab === 'api-keys' && (
          <div className="space-y-6">
            {/* Info banner */}
            <div className="flex items-start gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-400">Çevresel Değişkenler</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Bu değişkenleri Vercel Dashboard {'->'} Settings {'->'} Environment Variables 
                  {' '}bölümünden ekleyin.
                </p>
              </div>
            </div>

            {/* Env vars list */}
            <div className="space-y-4">
              {envVars.map((env) => (
                <div key={env.key} className="glass rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                        <env.icon className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{env.label}</h3>
                          {env.required ? (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                              Zorunlu
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded">
                              Opsiyonel
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">{env.description}</p>
                      </div>
                    </div>
                    <a
                      href="https://vercel.com/docs/environment-variables"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-dark-700 rounded-lg text-sm text-gray-300 truncate">
                      {env.key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(env.key, env.key)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                    >
                      {copied === env.key ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Örnek: <code className="text-gray-400">{env.example}</code>
                  </p>
                </div>
              ))}
            </div>

            {/* Supabase setup guide */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Supabase Kurulum</h2>
              <ol className="space-y-3 text-sm text-gray-400">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">1</span>
                  <span><a href="https://supabase.com" target="_blank" className="text-primary hover:underline">supabase.com</a> adresinde hesap oluşturun</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">2</span>
                  <span>Yeni proje oluşturun ve Project Settings {'->'} API bölümüne gidin</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">3</span>
                  <span>Project URL ve anon public anahtarını kopyalayın</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">4</span>
                  <span>SQL Editor'da aşağıdaki şemayı çalıştırın:</span>
                </li>
              </ol>
              <pre className="mt-4 p-4 bg-dark-700 rounded-xl text-xs text-gray-400 overflow-x-auto">
{`-- Projects table
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

-- Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);`}
              </pre>
            </div>

            {/* ElevenLabs setup */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">ElevenLabs Kurulum</h2>
              <ol className="space-y-3 text-sm text-gray-400">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">1</span>
                  <span><a href="https://elevenlabs.io" target="_blank" className="text-primary hover:underline">elevenlabs.io</a> adresinde hesap oluşturun</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">2</span>
                  <span>Profile {'->'} API Key bölümüne gidin</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">3</span>
                  <span>API key'i kopyalayın ve ELEVENLABS_API_KEY olarak kaydedin</span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}