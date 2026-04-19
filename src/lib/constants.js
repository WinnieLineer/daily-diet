import pkg from '../../package.json';

export const ANALYSIS_DURATION_SECONDS = 30; // 🕒 Back to 30s for stability
export const IMAGE_MAX_DIMENSION = 1024;    // 📸 Back to 1024px to read labels clearly
export const IMAGE_QUALITY = 0.8;           // 💎 Higher quality
export const APP_VERSION = pkg.version;      // 🏷️ Application Version (from package.json)
