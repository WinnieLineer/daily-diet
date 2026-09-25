/**
 * Cloud & LINE Bot Synchronization Service
 * 負責將 Web App / PWA 端的所有紀錄與目標即時同步至 GAS 後端與 Gist 雲端
 * 具備請求防抖 (Debounce) 與 序列化防衝突 (Queue & Idempotency) 機制
 */

import { getLocalDateString } from './constants';
import { liffService } from './liffService';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxmQC8f0NxOKRAIuLTSTVC-Vinf9lmU0cnb1akR5oKUEYD-3h7XjFV8Zm_LPkv_kdQo/exec';

export function getOrCreateClientId() {
  if (typeof window === 'undefined') return 'client_node';
  try {
    let cid = localStorage.getItem('daily_diet_client_id');
    const isGeneric = !cid || cid === 'web_user' || cid === 'default_user' || cid === 'web_client' || cid === 'unknown';
    if (isGeneric) {
      cid = 'client_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('daily_diet_client_id', cid);
    }
    return cid;
  } catch (e) {
    return 'client_' + Math.random().toString(36).substring(2, 9);
  }
}

export function getEffectiveIds() {
  let userId = '';
  let gistId = '';
  let userName = '';
  const isGeneric = (s) => !s || ['web_user', 'default_user', 'web_client', 'unknown'].includes(String(s).trim().toLowerCase());
  const isGistId = (s) => s && (/^[0-9a-fA-F]{20,40}$/.test(String(s).trim()) || /^gist[-_]/i.test(String(s).trim()));

  try {
    userId = localStorage.getItem('line_user_id') || '';
    userName = localStorage.getItem('line_user_name') || localStorage.getItem('user_name') || '';
    gistId = localStorage.getItem('gist_backup_id') || '';
    if (typeof window !== 'undefined' && window.location.search) {
      const q = new URLSearchParams(window.location.search);
      const rawQUser = q.get('userId') || q.get('user');
      if (rawQUser) {
        if (rawQUser.startsWith('U')) {
          // 🛡️ 只有在本地已存有該 LINE 帳號授權態時，才允許使用 U 開頭之原生 LINE 帳號 ID
          if (userId === rawQUser) {
            userId = rawQUser;
          }
        } else if (!userId) {
          userId = rawQUser;
        }
      }
      if (!userName && q.get('userName')) userName = q.get('userName');
      if (!userName && q.get('name')) userName = q.get('name');
      if (!gistId && q.get('gistId')) gistId = q.get('gistId');
    }
    // Web 用戶：若 caller 名稱拿不到，就用他的名字（排除 Gist ID 誤當用戶名）
    if (isGistId(userName)) {
      userName = '';
    }
    if (!userName && userId && !userId.startsWith('U') && !isGeneric(userId) && !isGistId(userId)) {
      userName = userId;
    }
    // 🛡️ 若維護者姓名存在 MAINTAINER_NAME_KEY，優先補全
    if (!userName) {
      const maintainerName = localStorage.getItem('daily_diet_maintainer_name');
      if (maintainerName && !isGistId(maintainerName)) {
        userName = maintainerName;
      }
    }
  } catch (e) {}

  const effectiveUserId = (userId && !isGeneric(userId) && !isGistId(userId)) 
    ? userId 
    : (userName && !isGeneric(userName) && !isGistId(userName) ? userName : getOrCreateClientId());
  const effectiveUserName = (userName && !isGistId(userName) && !isGeneric(userName)) 
    ? userName 
    : (userId && !userId.startsWith('U') && !isGistId(userId) && !isGeneric(userId) ? userId : '');

  let idToken = null;
  try {
    idToken = liffService.getIDToken();
  } catch (e) {}

  return { 
    userId: isGistId(effectiveUserId) ? getOrCreateClientId() : effectiveUserId, 
    userName: effectiveUserName, 
    gistId,
    idToken
  };
}

/**
 * 🛡️ 統一建構攜帶授權憑證之雲端同步 URLSearchParams (包含 idToken 鑑別防禦 IDOR)
 */
export function buildSyncParams(action, customParams = {}) {
  const { userId, userName, gistId, idToken } = getEffectiveIds();
  const params = new URLSearchParams({
    action,
    userId,
    ...customParams
  });
  if (userName) {
    params.append('userName', userName);
    params.append('caller', userName);
  }
  if (gistId) params.append('gistId', gistId);
  if (idToken) params.append('idToken', idToken);
  return params;
}

// ⏱️ 輕量防抖工具函數
function debounce(fn, waitMs = 350) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, waitMs);
  };
}

export function notifySyncStatus(status) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-sync-status', { detail: { status } }));
  }
}

// 🛡️ 餐點同步隊列（防止突發多筆記帳造成 Gist 409 衝突與伺服器過載）
const mealSyncQueue = [];
let isProcessingMealQueue = false;

async function processMealSyncQueue() {
  if (isProcessingMealQueue || mealSyncQueue.length === 0) return;
  isProcessingMealQueue = true;
  notifySyncStatus('syncing');

  while (mealSyncQueue.length > 0) {
    const nextTask = mealSyncQueue.shift();
    try {
      await nextTask();
    } catch (e) {
      console.warn('[SyncService] Task failed:', e);
    }
    if (mealSyncQueue.length > 0) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  isProcessingMealQueue = false;
  notifySyncStatus('synced');
}

/**
 * 即時同步單筆餐點至 LINE 後端與 Gist
 */
export async function syncMealToCloud(meal) {
  if (!meal) return;
  const { userName } = getEffectiveIds();
  const nowTime = meal.time || (meal.timestamp ? new Date(Number(meal.timestamp)).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) : new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const params = buildSyncParams('saveMeal', {
    dishName: String(meal.dish_name || '餐點').slice(0, 100),
    cal: String(meal.calories || 0),
    pro: String(meal.protein || 0),
    wat: String(meal.water || 0),
    carbs: String(meal.carbs || 0),
    fat: String(meal.fat || 0),
    category: String(meal.category || '').slice(0, 50),
    comment: String(meal.comment || meal.advice || '').slice(0, 200),
    date: meal.date || getLocalDateString(),
    time: nowTime,
    id: String(meal.timestamp || meal.id || Date.now())
  });

  const task = async () => {
    try {
      await fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' });
      console.log(`📤 [Web ➔ LINE Sync] 即時同步餐點成功: ${meal.dish_name} (${meal.calories} kcal)`);
    } catch (err) {
      console.warn("[Web ➔ LINE Sync] 同步失敗:", err);
    }
  };

  mealSyncQueue.push(task);
  processMealSyncQueue();
}

/**
 * 即時同步刪除餐點至 LINE 後端與 Gist
 */
export async function syncDeleteMealToCloud(targetOrId, optionalDishName) {
  let targetId = '';
  let dishName = '';

  if (targetOrId && typeof targetOrId === 'object') {
    targetId = targetOrId.timestamp || targetOrId.id || '';
    dishName = targetOrId.dish_name || '';
  } else {
    targetId = targetOrId || '';
    dishName = optionalDishName || (isNaN(Number(targetOrId)) ? targetOrId : '');
  }

  const params = buildSyncParams('deleteMeal', {
    dishName: String(dishName || targetId),
    id: String(targetId || dishName)
  });

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' })
      .catch(e => console.warn('[Web ➔ LINE Sync] 即時同步刪除異常:', e?.message));
    console.log(`🗑️ [Web ➔ LINE Sync] 即時同步刪除餐點: ${dishName || targetId}`);
  } catch (err) {}
}

/**
 * 實際執行目標更新
 */
function doSyncGoals(goals) {
  const params = buildSyncParams('updateGoals', {
    calories: String(goals.calories || 2000),
    protein: String(goals.protein || 100),
    water: String(goals.water || 2500),
    carbs: String(goals.carbs || 200),
    fat: String(goals.fat || 60),
    show_carbs_fat: String(!!goals.show_carbs_fat),
    fasting_enabled: String(!!goals.fasting_enabled),
    fasting_start: String(goals.fasting_start || '12:00'),
    fasting_end: String(goals.fasting_end || '20:00')
  });

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' })
      .catch(e => console.warn('[Web ➔ LINE Sync] 即時同步目標異常:', e?.message));
    console.log(`🎯 [Web ➔ LINE Sync] 即時同步體態與進食窗口目標: ${goals.calories}卡 / ${goals.protein}g蛋 / 碳水:${goals.carbs || 200}g / 脂肪:${goals.fat || 60}g | 進食窗口:${goals.fasting_start || '12:00'}~${goals.fasting_end || '20:00'} (開啟:${!!goals.fasting_enabled})`);
  } catch (err) {}
}

const debouncedGoalsSync = debounce(doSyncGoals, 400);

/**
 * 即時同步飲食目標至 LINE 後端與 Gist (支援防抖，避免拉桿連續觸發)
 */
export function syncGoalsToCloud(goals, immediate = false) {
  if (immediate) {
    doSyncGoals(goals);
  } else {
    debouncedGoalsSync(goals);
  }
}

/**
 * 實際執行教練性格更新
 */
function doSyncPersona(persona) {
  const params = buildSyncParams('updatePersona', {
    persona: String(persona || 'tsundere')
  });

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' })
      .catch(e => console.warn('[Web ➔ LINE Sync] 即時同步性格異常:', e?.message));
    console.log(`🎭 [Web ➔ LINE Sync] 即時同步教練性格: ${persona}`);
  } catch (err) {}
}

const debouncedPersonaSync = debounce(doSyncPersona, 300);

/**
 * 即時同步教練性格至 LINE 後端與 Gist
 */
export function syncPersonaToCloud(persona, immediate = false) {
  if (immediate) {
    doSyncPersona(persona);
  } else {
    debouncedPersonaSync(persona);
  }
}

/**
 * 實際執行語言更新
 */
function doSyncLanguage(lang) {
  const validLang = lang === 'en' ? 'en' : 'zh';
  const params = buildSyncParams('updateLanguage', {
    lang: validLang
  });

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' })
      .catch(e => console.warn('[Web ➔ LINE Sync] 即時同步語言異常:', e?.message));
    console.log(`🌐 [Web ➔ LINE Sync] 即時同步語言設定: ${validLang} (已向 LINE 後端發出選單與回覆語言切換指令)`);
  } catch (err) {}
}

const debouncedLanguageSync = debounce(doSyncLanguage, 300);

/**
 * 即時同步語言偏好至 LINE 後端與 Gist，並觸發 LINE 圖文選單換檔 (中/英)
 */
export function syncLanguageToCloud(lang, immediate = false) {
  if (immediate) {
    doSyncLanguage(lang);
  } else {
    debouncedLanguageSync(lang);
  }
}

/**
 * 即時同步單筆體重至 LINE 後端與 Gist
 */
export async function syncWeightToCloud(weightLog) {
  if (!weightLog || !weightLog.weight) return;

  const params = buildSyncParams('saveWeight', {
    weight: String(weightLog.weight),
    date: weightLog.date || getLocalDateString(),
    timestamp: String(weightLog.timestamp || Date.now())
  });

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' })
      .catch(e => console.warn('[Web ➔ LINE Sync] 即時同步體重異常:', e?.message));
    console.log(`⚖️ [Web ➔ LINE Sync] 即時同步體重成功: ${weightLog.weight} kg (${weightLog.date})`);
  } catch (err) {}
}

/**
 * 即時同步單筆排便打卡至 LINE 後端與 Gist
 */
export async function syncPoopToCloud(poopLog) {
  if (!poopLog) return;

  const params = buildSyncParams('savePoop', {
    timestamp: String(poopLog.timestamp || Date.now()),
    date: poopLog.date || getLocalDateString()
  });

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' })
      .catch(e => console.warn('[Web ➔ LINE Sync] 即時同步排便異常:', e?.message));
    console.log(`💩 [Web ➔ LINE Sync] 即時同步排便打卡成功: ${poopLog.timestamp}`);
  } catch (err) {}
}

/**
 * 即時同步新增常用餐點至 LINE 後端與 Gist
 */
export function syncAddFavorite(favItem) {
  if (!favItem) return;
  const params = buildSyncParams('addFavorite', {
    name: favItem.dish_name || favItem.name || '常用餐點',
    cal: String(favItem.calories || 0),
    pro: String(favItem.protein || 0),
    wat: String(favItem.water || 0)
  });

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' })
      .catch(e => console.warn('[Web ➔ LINE Sync] 新增常用異常:', e?.message));
    console.log(`⭐ [Web ➔ LINE Sync] 新增常用成功: ${favItem.dish_name || favItem.name}`);
  } catch (err) {}
}

/**
 * 即時同步刪除常用餐點至 LINE 後端與 Gist
 */
export function syncDeleteFavorite(favNameOrId) {
  if (!favNameOrId) return;
  const params = buildSyncParams('deleteFavorite', {
    name: String(favNameOrId)
  });

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' })
      .catch(e => console.warn('[Web ➔ LINE Sync] 刪除常用異常:', e?.message));
    console.log(`🗑️ [Web ➔ LINE Sync] 刪除常用成功: ${favNameOrId}`);
  } catch (err) {}
}

/**
 * 即時同步常用餐點排序至 LINE 後端與 Gist
 */
export function syncReorderFavorites(orderNames) {
  if (!orderNames) return;
  const params = buildSyncParams('reorderFavorites', {
    order: String(orderNames)
  });

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' })
      .catch(e => console.warn('[Web ➔ LINE Sync] 常用排序異常:', e?.message));
    console.log(`🔀 [Web ➔ LINE Sync] 常用排序同步成功`);
  } catch (err) {}
}

