'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Film, Calendar, Download, Eye, MapPin, Plus } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  createdAt: string;
  thumbnailUrl?: string;
}

interface ProjectListProps {
  projects: Project[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Taslak', color: 'bg-yellow-400/10 text-yellow-400' },
  rendering: { label: 'İşleniyor', color: 'bg-blue-400/10 text-blue-400' },
  completed: { label: 'Tamamlandı', color: 'bg-green-400/10 text-green-400' },
  failed: { label: 'Başarısız', color: 'bg-red-400/10 text-red-400' },
};

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <Card className="text-center py-12">
        <Film className="w-16 h-16 text-muted/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Henüz projeniz yok</h3>
        <p className="text-sm text-muted mb-6">
          İlk drone videonuzu oluşturmak için yeni bir proje başlatın.
        </p>
        <Link href="/dashboard/new-project">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Proje
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {projects.map((project) => {
        const status = statusLabels[project.status];
        return (
          <Card key={project.id} hover>
            <div className="flex items-center gap-4">
              <div className="w-20 h-14 rounded-lg bg-card-hover flex items-center justify-center shrink-0">
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={project.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <MapPin className="w-6 h-6 text-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{project.name}</h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-muted flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(project.createdAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
                {project.status === 'completed' && (
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
