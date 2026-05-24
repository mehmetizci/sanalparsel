"use client";

import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function PreviewPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <AppShell>
      <ErrorBoundary
        fallback={
          <div className="p-4 m-4 bg-red-900/20 border border-red-500/30 rounded-xl">
            <h2 className="text-red-400 font-bold mb-2">Something went wrong</h2>
            <p className="text-red-300 text-sm">An error occurred loading this page.</p>
          </div>
        }
      >
        <div className="px-4 py-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-4">Preview Page</h1>
          <p className="text-muted">Project ID: {id}</p>
          <p className="text-muted mt-4">This is a simplified preview page.</p>
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}