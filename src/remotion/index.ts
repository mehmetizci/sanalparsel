/**
 * Remotion Entry Point
 * 
 * This file registers all compositions for the SanalParsel
 * cinematic video renderer.
 */

import { registerRoot } from "remotion";
import { VideoComposition } from "./VideoComposition";

// Register with default empty props for Remotion CLI
// eslint-disable-next-line @typescript-eslint/no-explicit-any
registerRoot(VideoComposition as any);