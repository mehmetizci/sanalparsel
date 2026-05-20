import { Card } from '@/components/ui/Card';
import { FolderOpen, Play, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  createdAt: string;
}

interface ProjectListProps {
  projects: Project[];
}

const statusConfig = {
  draft: { icon: Clock, color: 'text-muted', label: 'Taslak' },
  rendering: { icon: Play, color: 'text-blue-500', label: 'Oluşturuluyor' },
  completed: { icon: CheckCircle, color: 'text-green-500', label: 'Tamamlandı' },
  failed: { icon: AlertCircle, color: 'text-red-500', label: 'Başarısız' },
};

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <div className="space-y-3">
      {projects.map((project) => {
        const config = statusConfig[project.status];
        const Icon = config.icon;

        return (
          <Card key={project.id} hover className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-card-hover flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{project.name}</p>
              <p className="text-sm text-muted">
                {new Date(project.createdAt).toLocaleDateString('tr-TR')}
              </p>
            </div>
            <div className={`flex items-center gap-2 ${config.color}`}>
              <Icon className="w-4 h-4" />
              <span className="text-sm">{config.label}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}