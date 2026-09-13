export const ANALYSIS_DURATION_SECONDS = 15; // 🕒 Adjusted to 15s based on actual generation time
export const IMAGE_MAX_DIMENSION = 1024;    // 📸 Back to 1024px to read labels clearly
export const IMAGE_QUALITY = 0.8;           // 💎 Higher quality
export const APP_VERSION = '3.2.73';         // 🏷️ Application Version (from package.json)
export const ENABLE_520_THEME = false;      // 💖 520 Festive decorations toggle

/**
 * 📅 取得設備本地日期的 YYYY-MM-DD 字串
 * 嚴格以本地時區計算年/月/日，避免 toISOString().split('T')[0] 在東八區早晨 (00:00-07:59) 落入昨日 UTC 日期的時差問題
 */
export function getLocalDateString(d = new Date()) {
  const dateObj = typeof d === 'number' || typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
