#!/usr/bin/env node
/**
 * Sync release-dashboard.canvas.tsx from version.json + build-manifest.json.
 */
import { syncReleaseCanvas } from "./lib/version-core.mjs";

syncReleaseCanvas();
