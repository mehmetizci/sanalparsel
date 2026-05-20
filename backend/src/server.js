/**
 * SanalParsel Backend - Express Server
 * Railway Production Ready
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';

import renderRouter from './routes/render.js';
import thumbnailRouter from './routes/thumbnail.js';
import { setupCleanup } from './utils/cleanup.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for output
app.use('/output', express.static(path.join(__dirname, '../output')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    ffmpeg: checkFFmpeg()
  });
});

// Check FFmpeg availability
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { encoding: 'utf-8', stdio: 'pipe' });
    return 'available';
  } catch {
    return 'not_found';
  }
}

// API Routes
app.use('/render', renderRouter);
app.use('/thumbnail', thumbnailRouter);

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'sanalparsel-backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    ffmpeg: checkFFmpeg(),
    features: {
      videoRender: true,
      thumbnail: true,
      textOverlay: true,
      audioSupport: true
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`FFmpeg: ${checkFFmpeg()}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Setup periodic cleanup
  setupCleanup();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  process.exit(0);
});

export default app;