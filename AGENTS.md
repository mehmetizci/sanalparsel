<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SanalParsel - AI Cinematic Real Estate Video Platform

## Project Overview
- **Name**: SanalParsel (Türk Gayrimenkul Sinematik Video Platformu)
- **Tech Stack**: Next.js 16, TypeScript, TailwindCSS 4, Supabase, Remotion, OpenRouter, ElevenLabs
- **Theme**: Dark theme with red (#ef4444) accent colors, glassmorphism UI

## Key Features
- Browser-first video rendering (Remotion)
- Default branding: Profile Photo, Full Name, Phone Number = ON; others = OFF
- Video format: 1080x1920 px (vertical 9:16), optional 720x1280 px
- AI Text: OpenRouter Qwen model (Turkish)
- AI Voice: ElevenLabs (Premium Turkish voices)
- Auth: Email + Password (NO Google Login)
- Environment analysis: 5 nearby places (hospital, school, market, highway, beach, shopping mall, city center)

## Architecture
- `src/lib/` - AI services (openrouter.ts, elevenlabs.ts)
- `src/types/` - TypeScript types (includes VideoBrandingOptions, defaultBrandingOptions)
- `src/components/video/` - Video components (RemotionComposition, BrandingTogglePanel)
- `src/components/overlays/` - Glassmorphism overlays (ConsultantOverlay, NearbyPlacesOverlay)
