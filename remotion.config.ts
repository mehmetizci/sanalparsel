/**
 * Remotion Configuration for SanalParsel Cinematic Video Renderer
 * 
 * This configuration defines the video composition settings and
 * enables server-side rendering of cinematic drone footage.
 */

import { Config } from "@remotion/cli/config";

// Set the default composition settings
Config.setVideoImageFormat("jpeg");
Config.setConcurrency(4);