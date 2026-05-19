/**
 * Cleanup Utility
 * Periodic cleanup of temp files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempDir = path.join(__dirname, '../../tmp');
const outputDir = path.join(__dirname, '../../output');

// Maximum age for temp files (30 minutes)
const MAX_FILE_AGE = 30 * 60 * 1000;

/**
 * Setup periodic cleanup
 */
export function setupCleanup() {
  // Run cleanup every 10 minutes
  setInterval(cleanupTempFiles, 10 * 60 * 1000);
  
  logger.info('Cleanup scheduled', { interval: '10m', maxAge: MAX_FILE_AGE });
}

/**
 * Clean up old temp files
 */
export async function cleanupTempFiles(files = []) {
  const now = Date.now();
  let cleaned = 0;
  let freed = 0;
  
  // Clean specific files
  for (const file of files) {
    try {
      const stats = fs.statSync(file);
      const size = stats.size;
      fs.unlinkSync(file);
      cleaned++;
      freed += size;
    } catch {}
  }
  
  // Clean temp directory
  try {
    const tempFiles = fs.readdirSync(tempDir);
    for (const file of tempFiles) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > MAX_FILE_AGE) {
          const size = stats.size;
          fs.unlinkSync(filePath);
          cleaned++;
          freed += size;
        }
      } catch {}
    }
  } catch {}
  
  // Clean output directory (older files only - keep recent ones)
  try {
    const outputFiles = fs.readdirSync(outputDir);
    for (const file of outputFiles) {
      const filePath = path.join(outputDir, file);
      try {
        const stats = fs.statSync(filePath);
        // Keep for 2 hours, then delete
        if (now - stats.mtimeMs > 2 * 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch {}
    }
  } catch {}
  
  if (cleaned > 0) {
    logger.info('Cleanup completed', { cleaned, freed: `${(freed / 1024 / 1024).toFixed(2)}MB` });
  }
}

/**
 * Clean specific files by job ID
 */
export async function cleanupJobFiles(jobId) {
  const files = [
    path.join(tempDir, `frames_${jobId}`),
    path.join(tempDir, `*_${jobId}.*`),
    path.join(outputDir, `${jobId}.*`),
    path.join(outputDir, `thumb_${jobId}.*`)
  ];
  
  for (const pattern of files) {
    try {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        const tempFiles = fs.readdirSync(tempDir).filter(f => regex.test(f));
        for (const file of tempFiles) {
          fs.unlinkSync(path.join(tempDir, file));
        }
      } else {
        fs.rmSync(pattern, { recursive: true, force: true });
      }
    } catch {}
  }
}