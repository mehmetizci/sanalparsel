/**
 * Video Rendering Service
 * FFmpeg-powered video creation with cinematic effects
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main video rendering function
 * Creates cinematic drone-style video from images
 */
export async function renderVideo(options, outputPath) {
  const {
    imageUrls = [],
    geoJson = null,
    titleText = '',
    voiceAudioUrl = null,
    backgroundMusicUrl = null,
    duration = 30,
    width = 1080,
    height = 1920,
    quality = 'medium'
  } = options;
  
  logger.info('Starting video render', { 
    imageCount: imageUrls.length, 
    duration, 
    width, 
    height 
  });
  
  const tempDir = path.join(__dirname, '../../tmp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const jobId = uuidv4();
  const framesDir = path.join(tempDir, `frames_${jobId}`);
  await fs.mkdir(framesDir, { recursive: true });
  
  try {
    // Step 1: Download and prepare images
    const downloadedImages = await downloadAndPrepareImages(imageUrls, framesDir);
    
    // Step 2: Create slide durations based on total duration
    const slideDuration = Math.floor(duration / downloadedImages.length);
    
    // Step 3: Generate image sequence with Ken Burns effect
    const slideshowPath = await createSlideshow(downloadedImages, framesDir, {
      slideDuration,
      width,
      height,
      titleText
    });
    
    // Step 4: Add audio track if provided
    let finalVideoPath = slideshowPath;
    if (voiceAudioUrl || backgroundMusicUrl) {
      finalVideoPath = await addAudioTrack(slideshowPath, {
        voiceAudioUrl,
        backgroundMusicUrl
      });
    }
    
    // Step 5: Export final video
    const outputResult = await exportFinalVideo(finalVideoPath, outputPath, {
      quality,
      width,
      height
    });
    
    // Cleanup temp files
    await cleanupTempDirectory(framesDir);
    
    logger.info('Video render completed', { outputPath });
    return outputPath;
    
  } catch (err) {
    await cleanupTempDirectory(framesDir);
    throw err;
  }
}

/**
 * Download and prepare images for processing
 */
async function downloadAndPrepareImages(imageUrls, framesDir) {
  const downloadedImages = [];
  const { execSync } = require('child_process');
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const outputFile = path.join(framesDir, `input_${i.toString().padStart(3, '0')}.jpg`);
    
    try {
      // Download image using curl
      const curlCmd = `curl -s -L "${imageUrl}" -o ${outputFile}`;
      execSync(curlCmd, { stdio: 'pipe' });
      
      // Verify file exists and is valid
      await fs.access(outputFile);
      const stats = await fs.stat(outputFile);
      
      if (stats.size > 1000) {
        downloadedImages.push(outputFile);
      }
    } catch (err) {
      logger.warn(`Failed to download image: ${imageUrl}`);
    }
  }
  
  if (downloadedImages.length === 0) {
    // Create a placeholder black frame if no images available
    const placeholderPath = path.join(framesDir, 'placeholder.jpg');
    execSync(`ffmpeg -f lavfi -i color=c=black:s=${1080}x${1920}:d=1 -frames:v 1 ${placeholderPath}`, {
      stdio: 'pipe'
    });
    downloadedImages.push(placeholderPath);
  }
  
  return downloadedImages;
}

/**
 * Create slideshow with Ken Burns effect
 */
async function createSlideshow(images, framesDir, params) {
  const { slideDuration, width, height, titleText } = params;
  const { execSync } = require('child_process');
  
  const concatFile = path.join(framesDir, 'concat.txt');
  const outputFile = path.join(framesDir, 'slideshow.mp4');
  
  // Create concat file
  let concatContent = '';
  for (let i = 0; i < images.length; i++) {
    // Add fade transition
    const inputFile = images[i];
    const duration = slideDuration;
    const fadeDuration = 1;
    
    // Apply Ken Burns effect (slow zoom and pan)
    const filter = `zoompan=z='min(zoom+0.001,1.2)':d=${duration*25}:s=${width}x${height}:fps=25,format=yuv420p`;
    
    try {
      execSync(`ffmpeg -y -loop 1 -i ${inputFile} -vf "${filter}" -c:v libx264 -t ${duration} -pix_fmt yuv420p ${path.join(framesDir, `slide_${i}.mp4`)}`, {
        stdio: 'pipe'
      });
      concatContent += `file '${path.join(framesDir, `slide_${i}.mp4`)}'\n`;
    } catch (err) {
      logger.warn(`Failed to process slide ${i}: ${err.message}`);
    }
  }
  
  await fs.writeFile(concatFile, concatContent);
  
  // Concatenate videos
  try {
    execSync(`ffmpeg -y -f concat -safe 0 -i ${concatFile} -c copy ${outputFile}`, {
      stdio: 'pipe'
    });
  } catch {
    // Fallback: just use first image
    execSync(`ffmpeg -y -loop 1 -i ${images[0]} -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -t ${slideDuration} -pix_fmt yuv420p ${outputFile}`, {
      stdio: 'pipe'
    });
  }
  
  return outputFile;
}

/**
 * Add voice narration and background music
 */
async function addAudioTrack(videoPath, options) {
  const { voiceAudioUrl, backgroundMusicUrl } = options;
  const { execSync } = require('child_process');
  const outputPath = videoPath.replace('.mp4', '_audio.mp4');
  
  let audioFilter = '';
  let audioInputs = [`-i ${videoPath}`];
  
  if (voiceAudioUrl) {
    // Download voice audio
    try {
      const voicePath = path.join(__dirname, '../../tmp', `voice_${Date.now()}.mp3`);
      execSync(`curl -s -L "${voiceAudioUrl}" -o ${voicePath}`);
      audioInputs.push(`-i ${voicePath}`);
      audioFilter = '[1:a]volume=0.8[a1];[0:a][a1]amix=inputs=2:dropout_transition=2[a]';
    } catch {}
  }
  
  if (backgroundMusicUrl) {
    // Download and mix background music
    try {
      const musicPath = path.join(__dirname, '../../tmp', `music_${Date.now()}.mp3`);
      execSync(`curl -s -L "${backgroundMusicUrl}" -o ${musicPath}`);
      audioInputs.push(`-i ${musicPath}`);
      if (!audioFilter) {
        audioFilter = '[1:a]volume=0.3[a1];[0:a][a1]amix=inputs=2:dropout_transition=2[a]';
      } else {
        audioFilter = '[1:a]volume=0.3[a1];[2:a]volume=0.3[a2];[a1][a2]amix=inputs=2:dropout_transition=2[a]';
      }
    } catch {}
  }
  
  if (audioFilter) {
    try {
      execSync(`ffmpeg -y ${audioInputs.join(' ')} -filter_complex "${audioFilter}" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 128k ${outputPath}`, {
        stdio: 'pipe'
      });
    } catch {
      // Keep original if mixing fails
      return videoPath;
    }
  }
  
  return outputPath;
}

/**
 * Export final video
 */
async function exportFinalVideo(inputPath, outputPath, options) {
  const { quality, width, height } = options;
  const { execSync } = require('child_process');
  
  // Quality presets
  const qualityPresets = {
    low: { crf: 28, preset: 'veryfast' },
    medium: { crf: 23, preset: 'medium' },
    high: { crf: 18, preset: 'slow' }
  };
  
  const preset = qualityPresets[quality] || qualityPresets.medium;
  
  try {
    execSync(`ffmpeg -y -i ${inputPath} -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset ${preset.preset} -crf ${preset.crf} -c:a aac -b:a 128k -movflags +faststart ${outputPath}`, {
      stdio: 'pipe'
    });
  } catch (err) {
    // Simpler fallback
    execSync(`ffmpeg -y -i ${inputPath} -c:v libx264 -crf 23 -c:a aac ${outputPath}`, {
      stdio: 'pipe'
    });
  }
  
  return outputPath;
}

/**
 * Generate thumbnail from video
 */
export async function generateThumbnail(videoUrl, outputPath, options) {
  const { timePosition = '00:00:01', format = 'jpg' } = options;
  const { execSync } = require('child_process');
  
  // Download video if it's a URL
  let videoPath = videoUrl;
  if (videoUrl.startsWith('http')) {
    const tempVideo = path.join(__dirname, '../../tmp', `video_${Date.now()}.mp4`);
    execSync(`curl -s -L "${videoUrl}" -o ${tempVideo}`);
    videoPath = tempVideo;
  }
  
  try {
    execSync(`ffmpeg -y -ss ${timePosition} -i ${videoPath} -vframes 1 -vf "thumbnail,scale=640:-1" -q:v 2 ${outputPath}`, {
      stdio: 'pipe'
    });
  } catch (err) {
    throw new Error(`Thumbnail generation failed: ${err.message}`);
  }
  
  return outputPath;
}

/**
 * Cleanup temp directory
 */
async function cleanupTempDirectory(dirPath) {
  try {
    const fs = await import('fs');
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {}
}