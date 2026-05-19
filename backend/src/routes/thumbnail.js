/**
 * POST /thumbnail - Generate video thumbnail
 * GET /thumbnail/:jobId - Get thumbnail status
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

import { generateThumbnail } from '../services/videoRenderer.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// POST /thumbnail
router.post('/', async (req, res, next) => {
  try {
    const jobId = uuidv4();
    
    const { videoUrl, timePosition = '00:00:01', format = 'jpg' } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl is required' });
    }
    
    logger.info(`Thumbnail job started: ${jobId}`);
    
    const outputDir = path.join(__dirname, '../../output');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, `thumb_${jobId}.${format}`);
    
    try {
      await generateThumbnail(videoUrl, outputPath, { timePosition, format });
      
      res.json({
        jobId,
        status: 'completed',
        thumbnailUrl: `/output/thumb_${jobId}.${format}`
      });
      
    } catch (err) {
      const errorFile = path.join(outputDir, `thumb_${jobId}.error`);
      await fs.writeFile(errorFile, err.message);
      
      res.status(500).json({
        jobId,
        status: 'failed',
        error: err.message
      });
    }
    
  } catch (err) {
    next(err);
  }
});

// GET /thumbnail/:jobId
router.get('/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const outputDir = path.join(__dirname, '../../output');
    
    // Check for thumbnail
    const thumbJpg = path.join(outputDir, `thumb_${jobId}.jpg`);
    const thumbPng = path.join(outputDir, `thumb_${jobId}.png`);
    const errorFile = path.join(outputDir, `thumb_${jobId}.error`);
    
    try {
      await fs.access(thumbJpg);
      res.json({ jobId, status: 'completed', thumbnailUrl: `/output/thumb_${jobId}.jpg` });
    } catch {
      try {
        await fs.access(thumbPng);
        res.json({ jobId, status: 'completed', thumbnailUrl: `/output/thumb_${jobId}.png` });
      } catch {
        try {
          const errorContent = await fs.readFile(errorFile, 'utf-8');
          res.status(500).json({ jobId, status: 'failed', error: errorContent });
        } catch {
          res.json({ jobId, status: 'processing' });
        }
      }
    }
  } catch (err) {
    next(err);
  }
});

export default router;