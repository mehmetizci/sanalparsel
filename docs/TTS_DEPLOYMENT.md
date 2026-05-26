# TTS Universal Architecture - Deployment Guide

## Overview

This system provides a universal TTS (Text-to-Speech) architecture that works on:
- Localhost
- Vercel
- Render
- Netlify

## Architecture

```
Frontend (Next.js)
    │
    ├── No env var: /api/generate-tts (Vercel/Netlify serverless)
    │
    └── VITE_TTS_API_URL set: https://sanalparsel.onrender.com/generate-tts (Render backend)
```

## Files Changed

### Backend (Render)

- `server/index.js` - Express server with:
  - GET /health - Health check endpoint
  - POST /generate-tts - TTS generation endpoint
  - CORS enabled for all origins

### Frontend

- `src/lib/ttsClient.ts` - Updated to use `VITE_TTS_API_URL` environment variable
- `src/components/VoiceSelector.tsx` - Updated with debug buttons (Health, Test TTS, Full Test)
- `src/vite-env.d.ts` - Added TypeScript type definitions for `import.meta.env`

### Configuration

- `render.yaml` - Render deployment blueprint
- `.env.example` - Added `VITE_TTS_API_URL=https://sanalparsel.onrender.com`

## Deployment

### Render Deployment

1. Push changes to GitHub
2. Connect repository to Render
3. Create new Web Service with:
   - Build Command: `npm install`
   - Start Command: `npm run server`
   - Health Check Path: `/health`

Or use render.yaml for automatic deployment.

### Environment Variables

For Render backend, set:
- `NODE_ENV=production`
- `PORT=3001`

For Frontend, set:
- `VITE_TTS_API_URL=https://your-render-backend.onrender.com`

## Usage

### Local Development

```bash
# Start frontend
npm run dev

# Start TTS backend (separate terminal)
npm run server
```

### Test Endpoints

The VoiceSelector component has three debug buttons:

1. **Health (🟢)** - Tests the /health endpoint
2. **Test TTS (🔵)** - Tests the /generate-tts endpoint with `test: true`
3. **Full Test (🔧)** - Generates actual audio using Edge TTS

## Voice Mapping

| Frontend Type | Backend Voice |
|---------------|---------------|
| female | tr-TR-EmelNeural |
| male | tr-TR-AhmetNeural |
| corporate | tr-TR-AhmetNeural |

## API Response Format

Both Render backend and Vercel API return JSON:

```json
{
  "success": true,
  "audioUrl": "data:audio/mpeg;base64,...",
  "audioData": "base64_encoded_audio",
  "duration": 5,
  "voice": "tr-TR-AhmetNeural",
  "textLength": 100
}
```

## Error Handling

When TTS generation fails, debug info is displayed showing:
- Endpoint URL
- HTTP Status
- Backend Response
- Selected Voice
- Request Body

## Important Notes

1. Edge TTS requires `--experimental-strip-types` flag when running with Node.js
2. The Render backend uses dynamic imports to handle ES modules
3. CORS is enabled for all origins to allow requests from any domain