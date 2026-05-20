/**
 * POST /render - Video rendering endpoint
 * Accepts: image URLs, GeoJSON, title text, voice audio URL
 * Returns: downloadable video URL
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

import { renderVideo } from '../services/videoRenderer.js';
import { logger } from '../utils/logger.js';
import { cleanupTempFiles } from '../utils/cleanup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Validation helper
function validateRenderRequest(body) {
  const errors = [];
  
  if (!body.imageUrls || !Array.isArray(body.imageUrls) || body.imageUrls.length === 0) {
    errors.push('imageUrls array is required');
  }
  
  if (body.geoJson && typeof body.geoJson !== 'object') {
    errors.push('geoJson must be a valid GeoJSON object');
  }
  
  if (body.duration && (typeof body.duration !== 'number' || body.duration < 5 || body.duration > 120)) {
    errors.push('duration must be between 5 and 120 seconds');
  }
  
  return errors;
}

// POST /render
router.post('/', async (req, res, next) => {
  try {
    const startTime = Date.now();
    const jobId = uuidv4();
    
    logger.info(`Render job started: ${jobId}`, { 
      body: { ...req.body, imageUrls: req.body.imageUrls?.length } 
    });
    
    // Validate request
    const errors = validateRenderRequest(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
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
    } = req.body;
    
    // Create job status
    const job = {
      id: jobId,
      status: 'processing',
      progress: 0,
      createdAt: new Date().toISOString(),
      params: { imageUrls: imageUrls.length, titleText, duration, width, height }
    };
    
    // Process video in background
    processVideo(jobId, imageUrls, geoJson, titleText, voiceAudioUrl, backgroundMusicUrl, {
      duration,
      width,
      height,
      quality
    }).then(async (outputPath) => {
      const elapsed = Date.now() - startTime;
      logger.info(`Render job completed: ${jobId}`, { elapsed, outputPath });
      
      // Clean temp files after delay
      setTimeout(() => cleanupTempFiles([outputPath]), 60000);
      
    }).catch(async (err) => {
      logger.error(`Render job failed: ${jobId}`, { error: err.message });
    });
    
    // Return immediately with job ID
    res.status(202).json({
      jobId,
      status: 'processing',
      message: 'Video render started',
      estimatedTime: duration * 2,
      statusEndpoint: `/render/${jobId}`,
      webhookUrl: req.body.webhookUrl
    });
    
  } catch (err) {
    next(err);
  }
});

// GET /render/:jobId - Get render status
router.get('/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    // Check if output exists
    const outputDir = path.join(__dirname, '../../output');
    const outputFile = path.join(outputDir, `${jobId}.mp4`);
    
    try {
      await fs.access(outputFile);
      
      res.json({
        jobId,
        status: 'completed',
        progress: 100,
        videoUrl: `/output/${jobId}.mp4`,
        downloadUrl: `/output/${jobId}.mp4`
      });
    } catch {
      // Check for error file
      const errorFile = path.join(outputDir, `${jobId}.error`);
      
      try {
        const errorContent = await fs.readFile(errorFile, 'utf-8');
        res.status(500).json({
          jobId,
          status: 'failed',
          error: errorContent
        });
      } catch {
        res.json({
          jobId,
          status: 'processing',
          progress: Math.min(Date.now() % 100, 99),
          message: 'Video is being created'
        });
      }
    }
  } catch (err) {
    next(err);
  }
});

// GET /render/:jobId/download - Download video
router.get('/:jobId/download', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const outputDir = path.join(__dirname, '../../output');
    const outputFile = path.join(outputDir, `${jobId}.mp4`);
    
    try {
      await fs.access(outputFile);
      res.download(outputFile, `${jobId}.mp4`);
    } catch {
      res.status(404).json({ error: 'Video not found' });
    }
  } catch (err) {
    next(err);
  }
});

// Async video processing
async function processVideo(jobId, imageUrls, geoJson, titleText, voiceAudioUrl, musicUrl, params) {
  const outputDir = path.join(__dirname, '../../output');
  
  // Ensure output directory exists
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch {}
  
  const outputPath = path.join(outputDir, `${jobId}.mp4`);
  
  try {
    await renderVideo({
      imageUrls,
      geoJson,
      titleText,
      voiceAudioUrl,
      backgroundMusicUrl: musicUrl,
      ...params
    }, outputPath);
    
    return outputPath;
  } catch (err) {
    // Write error file
    const errorFile = path.join(outputDir, `${jobId}.error`);
    await fs.writeFile(errorFile, err.message);
    throw err;
  }
}

export default router;