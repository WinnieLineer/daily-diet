export const ANALYSIS_DURATION_SECONDS = 15; // 🕒 Adjusted to 15s based on actual generation time
export const IMAGE_MAX_DIMENSION = 1024;    // 📸 Back to 1024px to read labels clearly
export const IMAGE_QUALITY = 0.8;           // 💎 Higher quality
export const APP_VERSION = '3.3.99';         // 🏷️ Application Version (from package.json)
export const ENABLE_520_THEME = false;      // 💖 520 Festive decorations toggle
export const CURRENT_WHATSNEW_ID = 'whatsnew_v3.3.86'; // 📢 Current update card ID (change to show to all users once)

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

/**
 * 📍 驗證是否為有效地理位置名稱（過濾未知、未定位、無等無意義占位符）
 */
export function isValidLocation(loc) {
  if (!loc || typeof loc !== 'string') return false;
  const trimmed = loc.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—') return false;
  const lower = trimmed.toLowerCase();
  if (
    lower === 'unknown' || 
    lower === 'unknown location' || 
    lower === 'null' || 
    lower === 'undefined' ||
    trimmed === '未知' || 
    trimmed === '未知地點' || 
    trimmed === '未知位置' ||
    trimmed === '未定位' ||
    trimmed === '無'
  ) return false;
  return true;
}
