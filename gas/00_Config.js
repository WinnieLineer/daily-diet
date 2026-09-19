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

// 🐼 教練諮詢與即時通話模型清單 (優先使用 RPD 500 之 3.5-flash-lite / 3.1-flash-lite，次選 2.5 系列)
const ADVICE_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash'
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
const DEFAULT_CARBS_GOAL = 200;    // grams
const DEFAULT_FAT_GOAL = 60;       // grams

// ⏰ 預設進食窗口設定 (16:8 輕斷食)
const DEFAULT_FASTING_ENABLED = false;
const DEFAULT_FASTING_START = '12:00';
const DEFAULT_FASTING_END = '20:00';

// 🎨 預設教練性格與語系
const DEFAULT_PERSONA = 'tsundere'; // 'tsundere' | 'gentle' | 'hardcore'
const DEFAULT_LANGUAGE = 'zh';      // 'zh' | 'en'

// 📧 預設開發者與管理員通知信箱 (收件者)
const DEFAULT_ADMIN_EMAIL = 'matainer@winnie-lin.space';

// 📮 預設系統自動化發信信箱 (寄件者)
const DEFAULT_SENDER_EMAIL = 'auto-message@winnie-lin.space';

// 📊 系統日誌 Google 試算表 ID (留空則嘗試自動建立或由 bindLogSheet 綁定)
const DEFAULT_LOG_SHEET_ID = '';

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

/**
 * 🛡️ 判定是否為泛用或匿名佔位符用戶 ID
 * 避免通用名稱（如 web_user, default_user）造成跨用戶資料污染或共用 Gist
 * @param {string} uid
 * @returns {boolean}
 */
function isGenericUserId(uid) {
  if (!uid || typeof uid !== 'string') return true;
  const clean = uid.trim().toLowerCase();
  return clean === 'web_user' || 
         clean === 'default_user' || 
         clean === 'web_guest' || 
         clean === 'web_client' || 
         clean === 'unknown' || 
         clean === 'system' || 
         clean === 'undefined' || 
         clean === 'null' ||
         clean.startsWith('client_') ||
         clean.startsWith('guest_');
}

/**
 * 🔑 產生暫態 HMAC-SHA256 維護者會話權杖 (Session Token)
 * 每日滾動更新，不向瀏覽器洩露主管理員密碼
 * @param {string} configuredUser
 * @param {string} configuredPass
 * @param {number} [dayOffset=0]
 * @returns {string}
 */
function generateSessionToken(configuredUser, configuredPass, dayOffset) {
  if (!configuredPass) return '';
  const offset = dayOffset || 0;
  const dayEpoch = Math.floor(Date.now() / 86400000) + offset;
  const rawSignature = `${(configuredUser || 'Winnie').trim().toLowerCase()}_${dayEpoch}`;
  try {
    const signatureBytes = Utilities.computeHmacSha256Signature(rawSignature, configuredPass);
    return Utilities.base64Encode(signatureBytes);
  } catch (e) {
    return '';
  }
}

/**
 * 🛡️ 嚴格校驗 GitHub Gist ID 格式
 * 防止路徑遍歷 (Path Traversal) 與 SSRF 攻擊
 * @param {string} gistId
 * @returns {boolean}
 */
function isValidGistId(gistId) {
  if (!gistId || typeof gistId !== 'string') return false;
  const clean = gistId.trim();
  // 標準 GitHub Gist ID 為 8~64 字元之純英數字雜湊，絕不包含斜線、反斜線、問號或小數點
  return /^[0-9a-zA-Z]{8,64}$/.test(clean) && !clean.includes('.') && !clean.includes('/') && !clean.includes('\\');
}

/**
 * 🛡️ 驗證 Gist 是否屬於當前用戶或未被其他原生 LINE 用戶綁定
 * 防範 IDOR (越權存取)、格式注入與跨用戶資料污染
 * @param {string} userGistId
 * @param {string} userId
 * @param {GoogleAppsScript.Properties.Properties} [props]
 * @returns {boolean} true 表示合法或未被其他用戶佔用，false 表示檢測到越權存取或非法格式
 */
function verifyGistOwnership(userGistId, userId, props) {
  if (!userGistId) return true;
  const cleanGist = String(userGistId).trim();
  if (!cleanGist || cleanGist === 'undefined' || cleanGist === 'null') return true;

  // 🛡️ 格式安全防護：拒絕任何包含路徑遍歷或非英數字元的惡意 Gist ID
  if (!isValidGistId(cleanGist)) {
    console.warn(`🚨 [非法 Gist ID 格式攔截] 傳入之 Gist ID 格式不合法或含有非法字元: ${cleanGist}`);
    return false;
  }

  if (!props) props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();

  // 檢查所有已綁定 Gist 的 LINE 原生用戶 (USER_GIST_U...)
  for (const k in allProps) {
    if (k.startsWith('USER_GIST_') && allProps[k] === cleanGist) {
      const ownerId = k.replace('USER_GIST_', '');
      // 若該 Gist 已明確登記為某真實 LINE 用戶 (U 開頭)
      if (ownerId.startsWith('U')) {
        const adminLineId = props.getProperty('ADMIN_LINE_USER_ID');
        const isMaintainer = userId && adminLineId && userId === adminLineId;
        // 如果呼叫者不是該用戶本人，且不是維護者，一律判定為越權存取！
        if (userId !== ownerId && !isMaintainer) {
          console.warn(`🚨 [Gist 越權存取攔截] 用戶 ${userId || '匿名/Web'} 企圖存取/覆寫屬於 LINE 用戶 ${ownerId} 的 Gist ${cleanGist}`);
          return false;
        }
      }
    }
  }
  return true;
}
