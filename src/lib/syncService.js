/**
 * Cloud & LINE Bot Synchronization Service
 * 負責將 Web App / PWA 端的所有紀錄與目標即時同步至 GAS 後端與 Gist 雲端
 * 具備請求防抖 (Debounce) 與 序列化防衝突 (Queue & Idempotency) 機制
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxmQC8f0NxOKRAIuLTSTVC-Vinf9lmU0cnb1akR5oKUEYD-3h7XjFV8Zm_LPkv_kdQo/exec';

function getEffectiveIds() {
  let userId = '';
  let gistId = '';
  try {
    userId = localStorage.getItem('line_user_id') || '';
    gistId = localStorage.getItem('gist_backup_id') || '';
    if (typeof window !== 'undefined' && window.location.search) {
      const q = new URLSearchParams(window.location.search);
      if (!userId && q.get('userId')) userId = q.get('userId');
      if (!userId && q.get('user')) userId = q.get('user');
      if (!gistId && q.get('gistId')) gistId = q.get('gistId');
    }
  } catch (e) {}
  return { userId: userId || 'default_user', gistId };
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

// 🛡️ 餐點同步隊列（防止突發多筆記帳造成 Gist 409 衝突與伺服器過載）
const mealSyncQueue = [];
let isProcessingMealQueue = false;

async function processMealSyncQueue() {
  if (isProcessingMealQueue || mealSyncQueue.length === 0) return;
  isProcessingMealQueue = true;

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
}

/**
 * 即時同步單筆餐點至 LINE 後端與 Gist
 */
export async function syncMealToCloud(meal) {
  const { userId, gistId } = getEffectiveIds();
  if (!meal) return;

  const nowTime = meal.time || (meal.timestamp ? new Date(Number(meal.timestamp)).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) : new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const params = new URLSearchParams({
    action: 'saveMeal',
    userId,
    dishName: meal.dish_name || '餐點',
    cal: String(meal.calories || 0),
    pro: String(meal.protein || 0),
    wat: String(meal.water || 0),
    carbs: String(meal.carbs || 0),
    fat: String(meal.fat || 0),
    category: meal.category || '',
    comment: meal.comment || meal.advice || '',
    date: meal.date || new Date().toISOString().split('T')[0],
    time: nowTime,
    id: String(meal.timestamp || meal.id || Date.now())
  });
  if (gistId) params.append('gistId', gistId);

  const task = async () => {
    try {
      fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' });
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
export async function syncDeleteMealToCloud(mealIdOrName) {
  const { userId, gistId } = getEffectiveIds();
  const params = new URLSearchParams({
    action: 'deleteMeal',
    userId,
    dishName: String(mealIdOrName),
    id: String(mealIdOrName)
  });
  if (gistId) params.append('gistId', gistId);

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' });
    console.log(`🗑️ [Web ➔ LINE Sync] 即時同步刪除餐點: ${mealIdOrName}`);
  } catch (err) {}
}

/**
 * 實際執行目標更新
 */
function doSyncGoals(goals) {
  const { userId, gistId } = getEffectiveIds();
  const params = new URLSearchParams({
    action: 'updateGoals',
    userId,
    calories: String(goals.calories || 2000),
    protein: String(goals.protein || 100),
    water: String(goals.water || 2500),
    carbs: String(goals.carbs || 200),
    fat: String(goals.fat || 60),
    show_carbs_fat: String(!!goals.show_carbs_fat)
  });
  if (gistId) params.append('gistId', gistId);

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' });
    console.log(`🎯 [Web ➔ LINE Sync] 即時同步體態目標: ${goals.calories}卡 / ${goals.protein}g蛋 / 碳水:${goals.carbs || 200}g / 脂肪:${goals.fat || 60}g (開啟:${!!goals.show_carbs_fat})`);
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
  const { userId, gistId } = getEffectiveIds();
  const params = new URLSearchParams({
    action: 'updatePersona',
    userId,
    persona: String(persona || 'tsundere')
  });
  if (gistId) params.append('gistId', gistId);

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' });
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
  const { userId, gistId } = getEffectiveIds();
  const validLang = lang === 'en' ? 'en' : 'zh';
  const params = new URLSearchParams({
    action: 'updateLanguage',
    userId,
    lang: validLang
  });
  if (gistId) params.append('gistId', gistId);

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' });
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
