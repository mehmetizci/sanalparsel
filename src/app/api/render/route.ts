import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { parcelGeoJSON, droneSettings, consultantProfile } = body;

    if (!parcelGeoJSON || !droneSettings || !consultantProfile) {
      return NextResponse.json(
        { error: 'Eksik parametreler' },
        { status: 400 }
      );
    }

    const projectId = crypto.randomUUID();

    return NextResponse.json({
      projectId,
      status: 'queued',
      message: 'Video render işlemi kuyruğa alındı',
      estimatedTime: droneSettings.duration * 2,
    });
  } catch {
    return NextResponse.json(
      { error: 'Render isteği işlenemedi' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID gerekli' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    projectId,
    status: 'completed',
    progress: 100,
    videoUrl: '/demo-video.mp4',
  });
}
