import { NextRequest, NextResponse } from 'next/server';

interface RenderJob {
  id: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

const jobs = new Map<string, RenderJob>();

const generateJobId = () => `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, settings } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const jobId = generateJobId();
    const job: RenderJob = {
      id: jobId,
      projectId,
      status: 'pending',
      progress: 0,
      startedAt: new Date().toISOString(),
    };

    jobs.set(jobId, job);

    startRenderJob(jobId);

    return NextResponse.json({ jobId, status: job.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create render job' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { error: 'jobId is required' },
      { status: 400 }
    );
  }

  const job = jobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    videoUrl: job.videoUrl,
    error: job.error,
  });
}

async function startRenderJob(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  
  let progress = 0;
  const stages = [
    { label: 'Harita hazırlanıyor', increment: 20 },
    { label: 'Parsel görselleştiriliyor', increment: 20 },
    { label: 'Drone hareketleri oluşturuluyor', increment: 20 },
    { label: 'Seslendirme işleniyor', increment: 20 },
    { label: 'Video render ediliyor', increment: 20 },
  ];

  for (const stage of stages) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    progress += stage.increment;
    job.progress = progress;
    jobs.set(jobId, job);
  }

  job.status = 'completed';
  job.progress = 100;
  job.videoUrl = `/downloads/sample-${jobId}.mp4`;
  job.completedAt = new Date().toISOString();
  jobs.set(jobId, job);
}