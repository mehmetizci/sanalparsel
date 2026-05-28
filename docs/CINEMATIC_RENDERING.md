# Cinematic Satellite Rendering

High-quality satellite video rendering system using Remotion, Mapbox GL JS, and FFmpeg.

## Features

### Remotion Video Composition
- **Real MP4 video rendering** - Not a fake preview or animation
- **Server-side render support** - Async render jobs with progress tracking
- **H264 codec** - Industry standard video encoding
- **Audio sync** - TTS word timing integrated with video timeline

### Camera Modes
1. **Orbit 360** - Circular orbit around the parcel with smooth rotation
2. **Spiral Descent** - High to low spiral animation
3. **Top View** - Bird's eye view with gentle drift
4. **Low Pass** - Low altitude fly-through
5. **Four Corners** - Views from 4 different angles

### Camera Feel
- **Yumuşak (Soft)** - Slow, smooth movement for elegant shots
- **Sinematik (Cinematic)** - Dramatic easing with professional motion
- **Dinamik (Dynamic)** - Fast, energetic movement for reels

### Video Quality
- **Premium HD**: 1080x1920, 30 FPS, 20 Mbps bitrate
- **Hızlı Render**: 720x1280, 24 FPS, optimized bitrate

## Usage

### Render API

```typescript
// POST /api/render
const response = await fetch('/api/render', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'project-123',
    compositionProps: {
      projectId: 'project-123',
      parcelName: '2406 Ada / 9 Parsel',
      parcelArea: '1234',
      parcelCenter: [38.4238, 27.1428],
      duration: 30,
      cameraModes: ['orbit360', 'spiralDescend'],
      cameraFeel: 'cinematic',
      narrationText: 'İzmir bölgesinde...',
      wordTimings: [
        { word: 'İzmir', start: 1.2, end: 1.5 },
        { word: 'bölgesinde', start: 1.6, end: 2.0 }
      ],
      consultantName: 'Ahmet Yılmaz',
      consultantPhone: '+90 555 123 4567',
      width: 1080,
      height: 1920,
      fps: 30,
      quality: 'premium',
      primaryColor: '#3b82f6'
    }
  })
});

const { renderId, status } = await response.json();
// Poll /api/render/status?id={renderId} for progress
```

### CinematicVideoPlayer Component

```tsx
import CinematicVideoPlayer from "@/components/CinematicVideoPlayer";

<CinematicVideoPlayer
  projectId="project-123"
  onRenderComplete={(outputUrl) => {
    console.log('Video ready:', outputUrl);
  }}
/>
```

### RenderProgressUI Component

```tsx
import { RenderProgressUI } from "@/components/RenderProgressUI";

<RenderProgressUI
  renderId="render_123_1234567890"
  onComplete={(url) => downloadVideo(url)}
  onCancel={() => cancelRender()}
/>
```

## API Reference

### POST /api/render
Starts a new render job. Returns a renderId for tracking.

### GET /api/render/status?id={renderId}
Returns current render status and progress:
```json
{
  "renderId": "render_xxx",
  "status": "rendering",
  "progress": 45,
  "phase": "capturing"
}
```

## Rendering Pipeline

1. **User creates project** → Select parcel, camera, narration
2. **AI generates text** → Create narration script
3. **TTS creates audio** → Generate speech with word timings
4. **User starts render** → POST to /api/render
5. **Remotion composition** → Build video timeline
6. **Frame capture** → Mapbox canvas capture
7. **MP4 encoding** → FFmpeg H264 compression
8. **Upload to storage** → Supabase Storage
9. **User downloads** → Final MP4 video

## Video Composition Structure

```
VideoComposition
├── MapCanvas (base layer)
│   ├── Camera animation
│   ├── Parcel visualization
│   └── Map/satellite imagery
├── POILayer (overlay)
│   ├── POI markers
│   ├── Distance labels
│   └── Audio-reactive glow
├── CinematicOverlay
│   ├── Parcel info
│   ├── Narration text
│   └── Audio visualizer
├── CinematicIntro (0-3s)
│   ├── Logo reveal
│   └── Consultant name
└── Outro (last 5s)
    ├── Avatar
    ├── Contact info
    └── CTA
```

## Constants

```typescript
// Video quality presets
VIDEO_QUALITY_PRESETS = {
  premium: {
    width: 1080, height: 1920,
    fps: 30, bitrate: 20, crf: 18
  },
  fast: {
    width: 720, height: 1280,
    fps: 24, bitrate: 10, crf: 24
  }
}

// Camera feel configuration
CAMERA_FEELS = {
  soft: { speed: 0.7, intensity: 0.6, easing: 'easeInOut' },
  cinematic: { speed: 1.0, intensity: 1.0, easing: 'cinematic' },
  dynamic: { speed: 1.4, intensity: 1.3, easing: 'linear' }
}

// Camera mode keyframes
CAMERA_MODES = {
  orbit360: { keyframes: 36, bearingRange: 360 },
  spiralDescend: { keyframes: 24, zoomRange: [13, 17] },
  topView: { keyframes: 12, pitch: 89 },
  lowPass: { keyframes: 18, pitchRange: [30, 50] },
  fourCorners: { keyframes: 4, corners: [-45, 45, 135, 225] }
}
```

## FFmpeg Command Generation

```typescript
import { generateFFmpegCommand } from "@/lib/video-renderer";

const cmd = generateFFmpegCommand({
  inputPattern: "frames/frame_%06d.png",
  output: "output.mp4",
  width: 1080,
  height: 1920,
  fps: 30,
  bitrate: 20,
  preset: "high",
});
```

## TTS Word Timing

```typescript
import { generateMockWordTimings, parseVTTTiming } from "@/lib/tts-timing";

// Generate mock timings for development
const timings = generateMockWordTimings("İzmir bölgesinde bulunan parsel.", 30);

// Parse VTT format from Edge TTS
const parsed = parseVTTTiming(vttContent);
```

## Visual Quality Targets

The system is designed to produce videos comparable to:
- Google Earth Studio
- Apple Maps cinematic flyover
- Tesla UI
- ArcGIS cinematic export
- Luxury real estate reels
- Netflix documentary intro
