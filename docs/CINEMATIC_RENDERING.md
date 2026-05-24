# Cinematic Satellite Rendering

High-quality satellite video rendering system using MapLibre GL JS and Esri World Imagery.

## Features

### Map Quality
- **Esri World Imagery** - High-resolution satellite tiles
- **Antialiasing** - Crisp edges for professional quality
- **512px tile size** - Better quality than default 256px
- **maxZoom 22** - Maximum detail level
- **Contrast enhancement (1.15x)** - Sharper imagery
- **Saturation boost (1.2x)** - Cinematic warmth

### Cinematic Camera
- **Pitch range 55-65°** - Dramatic aerial perspective
- **Smooth flyTo animations** - Natural camera movement
- **Cinematic easing** - Custom cubic easing curves
- **Subtle atmospheric fog** - Depth and atmosphere
- **Orbit keyframes** - Smooth circular camera paths

### Video Rendering
- **Frame-by-frame capture** - No realtime canvas recording
- **H264 MP4 encoding** - Industry standard
- **30 FPS** - Smooth motion
- **20 Mbps minimum bitrate** - High quality output
- **Preload tiles before recording** - Prevent blurry frames

## Usage

### Basic Map with Cinematic Settings

```tsx
import { ParcelMap } from "@/components";

<ParcelMap
  parcel={parcelFeature}
  properties={parcelProperties}
  cinematic={true}
  droneHeight={300}
  showOverlays={true}
/>
```

### Video Render Mode

```tsx
import { CinematicMapRenderer } from "@/components";

<CinematicMapRenderer
  parcel={parcelFeature}
  duration={30}
  fps={30}
  droneHeight={300}
  onFrameCapture={(frame, timestamp) => {
    // Collect frames for encoding
  }}
  onRenderComplete={(frames) => {
    // Encode frames to video
  }}
  onProgress={(progress, phase) => {
    console.log(`${phase}: ${progress}%`);
  }}
/>
```

### Direct Frame Capture

```tsx
const [captureFrame, setCaptureFrame] = useState<() => ImageData | null>(null);

<ParcelMap
  parcel={parcelFeature}
  videoRenderMode={true}
  onMapReadyForCapture={setCaptureFrame}
/>

// Later: capture frames at 30fps
const frame = captureFrame?.();
```

## API Reference

### buildCinematicStyle(config?)
```typescript
const style = buildCinematicStyle({
  contrast: 1.15,        // Image sharpness
  saturation: 1.2,       // Color intensity
  fogColor: [0.78, 0.85, 0.94, 0.3], // Fog color [r,g,b,a]
  fogAttenuation: 0.15,   // Fog intensity
  antialias: true,        // Enable antialiasing
});
```

### generateOrbitKeyframes(center, bounds, options?)
```typescript
const keyframes = generateOrbitKeyframes(
  [lon, lat],
  { minLon, minLat, maxLon, maxLat },
  {
    startPitch: 60,
    endPitch: 55,
    duration: 5000,
    orbitCount: 0.5,
  }
);
```

### runCinematicAnimation(map, options)
```typescript
const animation = runCinematicAnimation(map, {
  keyframes,
  onFrame: (frame, timestamp) => {},
  onComplete: () => {},
});

// Cancel if needed
animation.cancel();
```

### FFmpeg Command Generation

```typescript
import { generateFFmpegCommand } from "@/lib/video-renderer";

const cmd = generateFFmpegCommand({
  inputPattern: "frames/frame_%06d.png",
  output: "output.mp4",
  width: 1920,
  height: 1080,
  fps: 30,
  bitrate: 20,
  preset: "high", // or "balanced", "fast"
});
```

## Rendering Pipeline

1. **Preload tiles** - `preloadTilesForPath()` loads tiles in the camera path
2. **Generate keyframes** - Create camera path with `generateOrbitKeyframes()`
3. **Run animation** - Execute camera movement with `runCinematicAnimation()`
4. **Capture frames** - Use `requestAnimationFrame` loop to capture at target FPS
5. **Encode video** - Use FFmpeg for H264 encoding:

```bash
ffmpeg -framerate 30 -i frames/frame_%06d.png \
  -c:v libx264 -preset slow -crf 18 \
  -b:v 20M -pix_fmt yuv420p \
  -movflags +faststart output.mp4
```

## Quality Settings

| Quality | CRF | Preset | Bitrate |
|---------|-----|--------|---------|
| High | 18 | slow | 20+ Mbps |
| Balanced | 22 | medium | 15+ Mbps |
| Fast | 26 | fast | 10+ Mbps |

## Preventing Blurry Rendering

1. **Preload tiles** before recording starts
2. **Use maxZoom 22** for maximum detail
3. **Use tileSize 512** for high-resolution tiles
4. **Wait for idle** state before capturing
5. **Use antialias: true** for crisp edges

## Constants

```typescript
// Cinematic pitch range
CINEMATIC_PITCH = { min: 55, max: 65 }

// Easing functions
CINEMATIC_EASING = {
  flyTo: (t) => 1 - Math.pow(1 - t, 3),
  pan: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  zoom: (t) => Math.sin((t * Math.PI) / 2),
}
```
