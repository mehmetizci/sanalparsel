'use client';

import { Card } from '@/components/ui/Card';
import { Folder, MapPin, Download, CreditCard } from 'lucide-react';

interface DashboardStatsProps {
  totalProjects: number;
  totalParcels: number;
  remainingCredits: number;
  completedVideos: number;
}

export function DashboardStats({
  totalProjects,
  totalParcels,
  remainingCredits,
  completedVideos,
}: DashboardStatsProps) {
  const stats = [
    { icon: <Folder className="w-5 h-5" />, label: 'Toplam Proje', value: totalProjects },
    { icon: <MapPin className="w-5 h-5" />, label: 'Toplam Parsel', value: totalParcels },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Kalan Kredi', value: remainingCredits },
    { icon: <Download className="w-5 h-5" />, label: 'İndirilen Video', value: completedVideos },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="text-center">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-3">
            {stat.icon}
          </div>
          <p className="text-2xl font-bold">{stat.value}</p>
          <p className="text-sm text-muted">{stat.label}</p>
        </Card>
      ))}
    </div>
  );
}