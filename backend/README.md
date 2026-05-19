# SanalParsel Backend

Production-ready Node.js backend for video rendering with FFmpeg. Optimized for Railway deployment.

## Features

- 🎬 Cinematic video rendering with Ken Burns effects
- 📱 Instagram Reel vertical output (1080x1920)
- 🔤 Text overlays
- 🎵 Background music support
- 🎤 Voice narration support
- 🗺️ Map/parsel animations
- 📦 Thumbnail generation
- 🧹 Auto cleanup temp files

## API Endpoints

### POST /render - Generate Video

```bash
curl -X POST https://your-app.railway.app/render \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrls": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ],
    "titleText": "Beautiful Property",
    "voiceAudioUrl": "https://example.com/narration.mp3",
    "backgroundMusicUrl": "https://example.com/music.mp3",
    "duration": 30,
    "width": 1080,
    "height": 1920,
    "quality": "medium"
  }'
```

Response:
```json
{
  "jobId": "uuid-here",
  "status": "processing",
  "message": "Video render started",
  "estimatedTime": 60,
  "statusEndpoint": "/render/uuid-here"
}
```

### GET /render/:jobId - Check Status

```bash
curl https://your-app.railway.app/render/uuid-here
```

Response:
```json
{
  "jobId": "uuid-here",
  "status": "completed",
  "progress": 100,
  "videoUrl": "/output/uuid-here.mp4",
  "downloadUrl": "/output/uuid-here.mp4"
}
```

### POST /thumbnail - Generate Thumbnail

```bash
curl -X POST https://your-app.railway.app/thumbnail \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://example.com/video.mp4",
    "timePosition": "00:00:01",
    "format": "jpg"
  }'
```

### GET /health - Health Check

```bash
curl https://your-app.railway.app/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "ffmpeg": "available"
}
```

## Local Development

### Prerequisites

- Node.js 18+
- FFmpeg installed locally

```bash
# Install dependencies
cd backend
npm install

# Start development server
npm run dev
```

Server runs at http://localhost:8080

## Railway Deployment

### Option 1: Deploy from GitHub

#### Step 1: Push Code to GitHub

```bash
# Create a new repository on GitHub
git init
git add .
git commit -m "Initial commit"

# Create a new branch
git checkout -b main

# Add your GitHub repository
git remote add origin https://github.com/yourusername/sanalparsel.git

# Push
git push -u origin main
```

#### Step 2: Connect to Railway

1. Go to [Railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Select the `backend` folder or create a custom root

#### Step 3: Configure Environment Variables

In Railway dashboard, go to your project → Variables:

```
NODE_ENV=production
PORT=8080
```

![Environment Variables](https://via.placeholder.com/600x400?text=Railway+Variables)

Railway will automatically set:
- `PORT` - The container port
- `RAILWAY_APP_NAME` - Your app name

Optional variables (add if needed):
```
LOG_LEVEL=info
FFPEG_THREADS=1
MAX_CONCURRENT_RENDERS=1
```

#### Step 4: Deploy

Railway will automatically:
1. Detect the Dockerfile
2. Build the Docker image with FFmpeg
3. Start the container
4. Run health checks

Watch the deployment in the "Deployments" tab.

### Option 2: Deploy from CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

## Project Structure

```
backend/
├── Dockerfile              # Railway-compatible Docker build
├── package.json           # Node.js dependencies
├── .env.example          # Environment template
├── railway.json          # Railway config
└── src/
    ├── server.js         # Express server
    ├── routes/
    │   ├── render.js    # Video render API
    │   └── thumbnail.js # Thumbnail API
    ├── services/
    │   └── videoRenderer.js  # FFmpeg processing
    └── utils/
        ├── logger.js    # Logging
        └── cleanup.js   # Temp file cleanup
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | Yes | 8080 | Server port (set by Railway) |
| NODE_ENV | No | production | Environment |
| LOG_LEVEL | No | info | Log level |
| FFPEG_THREADS | No | 1 | FFmpeg threads |
| OUTPUT_PATH | No | ./output | Output directory |

## Troubleshooting

### FFmpeg not found

If you get "ffmpeg not found", ensure the Dockerfile installs ffmpeg correctly:

```dockerfile
RUN apk add --no-cache ffmpeg
```

### Memory issues

Railway has 1GB memory limit. To prevent OOM:

```javascript
// In videoRenderer.js, reduce quality
const qualityPresets = {
  low: { crf: 28, preset: 'veryfast' },
  // ...
};
```

### Timeout issues

Long videos may timeout. Use webhooks:

```javascript
{
  "webhookUrl": "https://your-webhook.com/notify"
}
```

## Cost Optimization

Railway charges for compute. To minimize costs:

1. Use `FFPEG_THREADS=1` (reduces memory)
2. Delete videos after download
3. Use `MAX_CONCURRENT_RENDERS=1`
4. Consider using webhooks instead of polling

## License

MIT