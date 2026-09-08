/**
 * ========================================================
 * 00_Config.js - 全域設定與常數定義
 * ========================================================
 */

// 📸 視覺照片辨識模型清單 (必須為 Multimodal 模型，優先使用 RPD 500 之 3.5-flash-lite / 3.1-flash-lite)
const VISION_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash'
];

// 📝 純文字自然語言記餐模型清單 (文字解析 JSON，優先以 3.1-flash-lite 為主，分流減輕 3.5 的負擔)
const TEXT_GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash-lite'
];

// 🐼 教練諮詢與即時通話模型清單 (極速回應優先，採用秒級 gemini-2.5-flash-lite / gemini-2.5-flash)
const ADVICE_GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash'
];

// 🎙️ 語音多模態辨識模型清單 (必須支援 Audio 多模態輸入，優先使用 RPD 500 之 3.5-flash-lite / 3.1-flash-lite)
const AUDIO_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-transcribe',
  'gemini-3.5-flash',
  'gemini-2.5-flash'
];

// 🔄 通用預設模型清單 (相容性與全域預設)
const PRIMARY_GEMINI_MODELS = VISION_GEMINI_MODELS;

// 🎯 預設營養目標 (當使用者尚未自訂目標時使用)
const DEFAULT_CALORIE_GOAL = 2000; // kcal
const DEFAULT_PROTEIN_GOAL = 100;  // grams
const DEFAULT_WATER_GOAL = 2500;   // ml

// 🎨 預設教練性格與語系
const DEFAULT_PERSONA = 'tsundere'; // 'tsundere' | 'gentle' | 'hardcore'
const DEFAULT_LANGUAGE = 'zh';      // 'zh' | 'en'

// 📧 預設開發者與管理員通知信箱
const DEFAULT_ADMIN_EMAIL = 'hi@winnie-lin.space';

// 👑 唯一授權之系統管理員 LINE 帳號尾碼 (防偽權限校驗)
const MASTER_ADMIN_LINE_SUFFIX = '497c66';

// 🖼️ 圖文選單背景圖片來源 (GitHub Raw CDN)
const RICH_MENU_IMAGE_ZH = 'https://raw.githubusercontent.com/WinnieLineer/daily-diet/main/public/richmenu-2500x1686.jpg';
const RICH_MENU_IMAGE_EN = 'https://raw.githubusercontent.com/WinnieLineer/daily-diet/main/public/richmenu-en-2500x1686.jpg';

/**
 * 取得當前日期的 YYYY-MM-DD 字串 (依據台北時間 UTC+8)
 * @param {Date} [dateObj] 可選的日期物件，預設為當前時間
 * @returns {string} 格式如 '2025-03-07'
 */
function getTodayDateString(dateObj) {
  const d = dateObj || new Date();
  try {
    return Utilities.formatDate(d, "Asia/Taipei", "yyyy-MM-dd");
  } catch (e) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

/**
 * 取得當前時間字串 HH:mm (依據台北時間 UTC+8)
 * @param {Date|number} [dateOrTimestamp]
 * @returns {string} 格式如 '12:30'
 */
function formatTime(dateOrTimestamp) {
  try {
    const d = dateOrTimestamp ? new Date(dateOrTimestamp) : new Date();
    return Utilities.formatDate(d, "Asia/Taipei", "HH:mm");
  } catch (e) {
    return '';
  }
}
