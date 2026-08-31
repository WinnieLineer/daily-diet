/**
 * Cloud & LINE Bot Synchronization Service
 * 負責將 Web App / PWA 端的所有紀錄與目標即時同步至 GAS 後端與 Gist 雲端
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

/**
 * 即時同步單筆餐點至 LINE 後端與 Gist
 */
export async function syncMealToCloud(meal) {
  const { userId, gistId } = getEffectiveIds();
  if (!meal) return;

  const params = new URLSearchParams({
    action: 'saveMeal',
    userId,
    dishName: meal.dish_name || '餐點',
    cal: String(meal.calories || 0),
    pro: String(meal.protein || 0),
    wat: String(meal.water || 0),
    carbs: String(meal.carbs || 0),
    fat: String(meal.fat || 0),
    comment: meal.comment || meal.advice || '',
    date: meal.date || new Date().toISOString().split('T')[0],
    time: meal.time || new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }),
    id: String(meal.timestamp || meal.id || Date.now())
  });
  if (gistId) params.append('gistId', gistId);

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' });
    console.log(`📤 [Web ➔ LINE Sync] 即時同步餐點成功: ${meal.dish_name} (${meal.calories} kcal)`);
  } catch (err) {
    console.warn("[Web ➔ LINE Sync] 同步失敗:", err);
  }
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
 * 即時同步飲食目標至 LINE 後端與 Gist
 */
export async function syncGoalsToCloud(goals) {
  const { userId, gistId } = getEffectiveIds();
  const params = new URLSearchParams({
    action: 'updateGoals',
    userId,
    calories: String(goals.calories || 2000),
    protein: String(goals.protein || 100),
    water: String(goals.water || 2500)
  });
  if (gistId) params.append('gistId', gistId);

  try {
    fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' });
    console.log(`🎯 [Web ➔ LINE Sync] 即時同步體態目標: ${goals.calories}卡 / ${goals.protein}g蛋`);
  } catch (err) {}
}
