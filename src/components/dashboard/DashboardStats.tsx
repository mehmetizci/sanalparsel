'use client';

import { Card } from '@/components/ui/Card';
import { Film, Map, Coins, TrendingUp } from 'lucide-react';

interface StatsProps {
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
}: StatsProps) {
  const stats = [
    {
      label: 'Toplam Proje',
      value: totalProjects,
      icon: <Film className="w-5 h-5" />,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Yüklenen Parseller',
      value: totalParcels,
      icon: <Map className="w-5 h-5" />,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Kalan Kredi',
      value: remainingCredits,
      icon: <Coins className="w-5 h-5" />,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
    },
    {
      label: 'Tamamlanan Video',
      value: completedVideos,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}
            >
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
