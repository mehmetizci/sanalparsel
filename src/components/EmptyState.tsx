"use client";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && (
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-white font-bold text-xl mb-2">{title}</h3>
      {description && (
        <p className="text-muted mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {action}
    </div>
  );
}