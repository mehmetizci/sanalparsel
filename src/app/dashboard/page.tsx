'use client'

import Link from 'next/link'
import { AppShell, StepHeader } from '@/components/layout'
import { GlassCard } from '@/components/mobile'
import { Plus, Video, Clock, CheckCircle2 } from 'lucide-react'

const recentProjects = [
  { id: '1', name: 'Büyük Çiğli 21645/4', status: 'completed', date: '2 saat önce' },
  { id: '2', name: 'Alsancak 1234/5', status: 'processing', date: '5 saat önce' },
]

const stats = [
  { label: 'Toplam Proje', value: '12' },
  { label: 'Bu Ay', value: '5' },
  { label: 'Kalan Kredi', value: '8' },
]

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Merhaba 👋</h1>
        <p className="text-gray-400 mt-1">12 video kredin var</p>
      </div>

      {/* New Project Button */}
      <Link href="/projects/new">
        <GlassCard className="flex items-center justify-between mb-6 cursor-pointer hover:bg-[#143660] transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#2563EB]/20 flex items-center justify-center">
              <Plus className="w-6 h-6 text-[#2563EB]" />
            </div>
            <div>
              <p className="font-semibold text-white">Yeni Proje Oluştur</p>
              <p className="text-sm text-gray-400">GeoJSON yükle ve videoyu oluştur</p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </GlassCard>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map((stat, i) => (
          <GlassCard key={i}>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Recent Projects */}
      <StepHeader title="Son Projeler" />
      <div className="space-y-3">
        {recentProjects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}/preview`}>
            <GlassCard className="flex items-center justify-between cursor-pointer hover:bg-[#143660] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-white">{project.name}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <Clock className="w-3 h-3" />
                    {project.date}
                  </div>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                project.status === 'completed' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {project.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                {project.status === 'completed' ? 'Tamamlandı' : 'İşleniyor'}
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </AppShell>
  )
}