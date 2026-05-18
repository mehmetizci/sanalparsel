'use client';

import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ProjectList } from '@/components/dashboard/ProjectList';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

const demoProjects = [
  {
    id: '1',
    name: 'İzmir Urla - Deniz Manzaralı Arsa',
    status: 'completed' as const,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Antalya Konyaaltı - Yatırımlık Arsa',
    status: 'rendering' as const,
    createdAt: '2024-01-14T14:30:00Z',
  },
  {
    id: '3',
    name: 'Muğla Bodrum - Tarla',
    status: 'draft' as const,
    createdAt: '2024-01-13T09:00:00Z',
  },
];

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Panel</h1>
          <p className="text-sm text-muted mt-1">
            Projelerinizi yönetin ve yeni videolar oluşturun.
          </p>
        </div>
        <Link href="/dashboard/new-project">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Proje
          </Button>
        </Link>
      </div>

      <div className="space-y-8">
        <DashboardStats
          totalProjects={3}
          totalParcels={5}
          remainingCredits={7}
          completedVideos={1}
        />

        <div>
          <h2 className="text-lg font-semibold mb-4">Son Projeler</h2>
          <ProjectList projects={demoProjects} />
        </div>
      </div>
    </div>
  );
}
