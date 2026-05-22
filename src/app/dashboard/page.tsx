'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Camera, Plus, Video, MapPin, CreditCard, Settings, 
  ChevronRight, Clock, CheckCircle2, AlertCircle, TrendingUp 
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'

// Demo data
const recentProjects = [
  { id: '1', name: 'İstanbul Başakşehir Villa', status: 'completed', date: '2 saat önce' },
  { id: '2', name: 'Ankara Çankaya Arsa', status: 'processing', date: '5 saat önce' },
  { id: '3', name: 'İzmir Alsancak Dükkan', status: 'draft', date: '1 gün önce' },
]

const stats = [
  { label: 'Toplam Proje', value: '12', icon: Video, color: 'text-primary' },
  { label: 'Bu Ay', value: '5', icon: TrendingUp, color: 'text-green-400' },
  { label: 'Kalan Kredi', value: '8', icon: CreditCard, color: 'text-yellow-400' },
]

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-dark-800 border-r border-white/5 transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            {sidebarOpen && <span className="text-xl font-bold gradient-text">SanalParsel</span>}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-2">
          {[
            { icon: Video, label: 'Projelerim', href: '/dashboard', active: true },
            { icon: Plus, label: 'Yeni Proje', href: '/dashboard/new-project' },
            { icon: CreditCard, label: 'Krediler', href: '/dashboard/credits' },
            { icon: Settings, label: 'Ayarlar', href: '/dashboard/settings' },
          ].map((item, i) => (
            <Link 
              key={i}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                item.active 
                  ? 'bg-primary/20 text-primary' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Toggle button */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-white/5 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className={`w-5 h-5 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Projelerim</h1>
              <p className="text-gray-400 text-sm mt-1">Tüm video projelerinizi yönetin</p>
            </div>
            <Link href="/dashboard/new-project">
              <Button>
                <Plus className="w-4 h-4" />
                Yeni Proje
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, i) => (
              <Card key={i} className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-dark-600 flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Projects list */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Son Projeler</h2>
            
            {recentProjects.map((project) => (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card hover className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Video className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{project.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                        <Clock className="w-3 h-3" />
                        {project.date}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                      project.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400'
                        : project.status === 'processing'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {project.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      {project.status === 'processing' && <Clock className="w-3 h-3" />}
                      {project.status === 'draft' && <AlertCircle className="w-3 h-3" />}
                      {project.status === 'completed' ? 'Tamamlandı' : project.status === 'processing' ? 'İşleniyor' : 'Taslak'}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {recentProjects.length === 0 && (
            <Card className="text-center py-12">
              <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Henüz projeniz yok</h3>
              <p className="text-gray-400 mb-6">İlk video projenizi oluşturun</p>
              <Link href="/dashboard/new-project">
                <Button>
                  <Plus className="w-4 h-4" />
                  Yeni Proje Oluştur
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}