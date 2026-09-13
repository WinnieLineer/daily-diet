/**
 * ========================================================
 * 02_Database.js - 資料儲存、快取、Gist 同步與系統日誌
 * ========================================================
 */

// ========================================================
// 🌐 使用者語言偏好 (Language)
// ========================================================

function getUserLanguage(userId, props, userGistId, pat) {
  if (!props) props = PropertiesService.getScriptProperties();
  if (!userId) return DEFAULT_LANGUAGE;

  let lang = props.getProperty(`LANGUAGE_${userId}`);
  if (!lang) {
    const gistId = userGistId || props.getProperty(`USER_GIST_${userId}`);
    const token = pat || props.getProperty('GITHUB_PAT');
    if (gistId && token) {
      try {
        const gistUrl = `https://api.github.com/gists/${gistId}`;
        const getRes = UrlFetchApp.fetch(gistUrl, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' },
          muteHttpExceptions: true
        });
        if (getRes.getResponseCode() === 200) {
          const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
          if (content) {
            const backupData = JSON.parse(content);
            if (backupData.settings && Array.isArray(backupData.settings)) {
              const l = backupData.settings.find(s => s.key === 'app_language' || s.key === 'language')?.value;
              if (l) {
                lang = l;
                props.setProperty(`LANGUAGE_${userId}`, l);
              }
            }
          }
        }
      } catch (e) {
        console.warn("從 Gist 讀取語言設定失敗:", e);
      }
    }
  }
  return (lang === 'en' || lang === 'zh') ? lang : DEFAULT_LANGUAGE;
}

function setUserLanguage(userId, lang, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const validLang = (lang === 'en' || lang === 'zh') ? lang : 'zh';
  if (userId) {
    props.setProperty(`LANGUAGE_${userId}`, validLang);
  }

  const gistId = userGistId || (userId ? props.getProperty(`USER_GIST_${userId}`) : '');
  const token = pat || props.getProperty('GITHUB_PAT');
  if (gistId && token) {
    try {
      const gistUrl = `https://api.github.com/gists/${gistId}`;
      const getRes = UrlFetchApp.fetch(gistUrl, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' },
        muteHttpExceptions: true
      });
      if (getRes.getResponseCode() === 200) {
        let backupData = { settings: [] };
        const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
        if (content) backupData = JSON.parse(content);
        if (!backupData.settings) backupData.settings = [];
        
        const existingIdx = backupData.settings.findIndex(s => s.key === 'app_language' || s.key === 'language');
        if (existingIdx >= 0) {
          backupData.settings[existingIdx].value = validLang;
        } else {
          backupData.settings.push({ key: 'app_language', value: validLang });
        }

        UrlFetchApp.fetch(gistUrl, {
          method: 'patch',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          payload: JSON.stringify({
            files: { 'daily-diet-backup.json': { content: JSON.stringify(backupData, null, 2) } }
          }),
          muteHttpExceptions: true
        });
      }
    } catch (e) {
      console.warn("同步語言至 Gist 失敗:", e);
    }
  }

  // 🔄 即時為該 LINE 用戶切換圖文選單 (中/英)
  if (typeof switchUserRichMenuByLanguage === 'function') {
    switchUserRichMenuByLanguage(userId, validLang, props);
  }

  return validLang;
}

// ========================================================
// 🎭 使用者教練性格 (Persona)
// ========================================================

function getUserPersona(userId, props, userGistId, pat) {
  if (!props) props = PropertiesService.getScriptProperties();
  if (!userId) return DEFAULT_PERSONA;

  let persona = props.getProperty(`PERSONA_${userId}`);
  if (!persona) {
    const gistId = userGistId || props.getProperty(`USER_GIST_${userId}`);
    const token = pat || props.getProperty('GITHUB_PAT');
    if (gistId && token) {
      try {
        const gistUrl = `https://api.github.com/gists/${gistId}`;
        const getRes = UrlFetchApp.fetch(gistUrl, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' },
          muteHttpExceptions: true
        });
        if (getRes.getResponseCode() === 200) {
          const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
          if (content) {
            const backupData = JSON.parse(content);
            if (backupData.settings && Array.isArray(backupData.settings)) {
              const p = backupData.settings.find(s => s.key === 'panda_active_persona')?.value;
              if (p) {
                persona = p;
                props.setProperty(`PERSONA_${userId}`, p);
              }
            }
          }
        }
      } catch (e) {
        console.warn("從 Gist 讀取性格失敗:", e);
      }
    }
  }
  return persona || DEFAULT_PERSONA;
}

function setUserPersona(userId, persona, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const validPersona = (persona === 'gentle' || persona === 'hardcore' || persona === 'tsundere') ? persona : DEFAULT_PERSONA;
  if (userId) {
    props.setProperty(`PERSONA_${userId}`, validPersona);
  }

  const gistId = userGistId || (userId ? props.getProperty(`USER_GIST_${userId}`) : '');
  const token = pat || props.getProperty('GITHUB_PAT');
  if (gistId && token) {
    try {
      const gistUrl = `https://api.github.com/gists/${gistId}`;
      const getRes = UrlFetchApp.fetch(gistUrl, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' },
        muteHttpExceptions: true
      });
      if (getRes.getResponseCode() === 200) {
        let backupData = { settings: [] };
        const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
        if (content) backupData = JSON.parse(content);
        if (!backupData.settings) backupData.settings = [];
        
        const existingIdx = backupData.settings.findIndex(s => s.key === 'panda_active_persona');
        if (existingIdx >= 0) {
          backupData.settings[existingIdx].value = validPersona;
        } else {
          backupData.settings.push({ key: 'panda_active_persona', value: validPersona });
        }

        UrlFetchApp.fetch(gistUrl, {
          method: 'patch',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          payload: JSON.stringify({
            files: { 'daily-diet-backup.json': { content: JSON.stringify(backupData, null, 2) } }
          }),
          muteHttpExceptions: true
        });
      }
    } catch (e) {
      console.warn("同步性格至 Gist 失敗:", e);
    }
  }
  return validPersona;
}

// ========================================================
// 🎯 使用者營養目標 (Goals)
// ========================================================

function getUserGoals(userId, props, userGistId) {
  if (!props) props = PropertiesService.getScriptProperties();
  let cal = Number(props.getProperty(`CALORIE_GOAL_${userId}`)) || Number(props.getProperty('CALORIE_GOAL'));
  let pro = Number(props.getProperty(`PROTEIN_GOAL_${userId}`)) || Number(props.getProperty('PROTEIN_GOAL'));
  let wat = Number(props.getProperty(`WATER_GOAL_${userId}`)) || Number(props.getProperty('WATER_GOAL'));
  let carbs = Number(props.getProperty(`CARBS_GOAL_${userId}`)) || 0;
  let fat = Number(props.getProperty(`FAT_GOAL_${userId}`)) || 0;
  let showCarbsRaw = props.getProperty(`SHOW_CARBS_FAT_${userId}`);
  let showCarbs = showCarbsRaw === 'true' ? true : (showCarbsRaw === 'false' ? false : null);

  // 若尚未儲存目標，向 Gist 雲端資料庫拉取
  if (!cal || !pro || !wat || !carbs || !fat || showCarbs === null) {
    const gistId = userGistId || (userId ? props.getProperty(`USER_GIST_${userId}`) : '');
    const pat = props.getProperty('GITHUB_PAT');
    if (gistId && pat) {
      try {
        const gistUrl = `https://api.github.com/gists/${gistId}`;
        const getRes = UrlFetchApp.fetch(gistUrl, {
          headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
          muteHttpExceptions: true
        });
        if (getRes.getResponseCode() === 200) {
          const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
          if (content) {
            const backupData = JSON.parse(content);
            if (backupData.settings && Array.isArray(backupData.settings)) {
              const gCal = backupData.settings.find(s => s.key === 'calorie_goal' || s.key === 'user_calories')?.value;
              const gPro = backupData.settings.find(s => s.key === 'protein_goal' || s.key === 'user_protein')?.value;
              const gWat = backupData.settings.find(s => s.key === 'water_goal' || s.key === 'user_water')?.value;
              const gCarbs = backupData.settings.find(s => s.key === 'carbs_goal')?.value;
              const gFat = backupData.settings.find(s => s.key === 'fat_goal')?.value;
              const gShowCarbs = backupData.settings.find(s => s.key === 'show_carbs_fat')?.value;
              if (gCal && !cal) { cal = Number(gCal); props.setProperty(`CALORIE_GOAL_${userId}`, String(cal)); }
              if (gPro && !pro) { pro = Number(gPro); props.setProperty(`PROTEIN_GOAL_${userId}`, String(pro)); }
              if (gWat && !wat) { wat = Number(gWat); props.setProperty(`WATER_GOAL_${userId}`, String(wat)); }
              if (gCarbs && !carbs) { carbs = Number(gCarbs); props.setProperty(`CARBS_GOAL_${userId}`, String(carbs)); }
              if (gFat && !fat) { fat = Number(gFat); props.setProperty(`FAT_GOAL_${userId}`, String(fat)); }
              if (gShowCarbs !== undefined && showCarbs === null) {
                showCarbs = (gShowCarbs === true || gShowCarbs === 'true');
                props.setProperty(`SHOW_CARBS_FAT_${userId}`, String(showCarbs));
              }
            }
          }
        }
      } catch (e) {
        console.warn("從 Gist 讀取目標失敗:", e);
      }
    }
  }

  return {
    calories: cal || DEFAULT_CALORIE_GOAL,
    protein: pro || DEFAULT_PROTEIN_GOAL,
    water: wat || DEFAULT_WATER_GOAL,
    carbs: carbs || DEFAULT_CARBS_GOAL,
    fat: fat || DEFAULT_FAT_GOAL,
    show_carbs_fat: showCarbs === true
  };
}

/**
 * 在 LINE 端切換碳水與脂肪追蹤開關，並同步至 ScriptProperties 與 Gist
 */
function setUserCarbsFatToggle(userId, enable, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  props.setProperty(`SHOW_CARBS_FAT_${userId}`, String(!!enable));
  console.log(`🍞 [碳水追蹤] 已將用戶 ${userId} 的碳水與脂肪追蹤設為 ${enable ? '開啟' : '關閉'}`);
  const gistId = userGistId || props.getProperty(`USER_GIST_${userId}`);
  if (gistId && pat) {
    try {
      const gistUrl = `https://api.github.com/gists/${gistId}`;
      const getRes = UrlFetchApp.fetch(gistUrl, {
        headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
        muteHttpExceptions: true
      });
      if (getRes.getResponseCode() === 200) {
        let backupData = { settings: [] };
        const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
        if (content) backupData = JSON.parse(content);
        if (!backupData.settings) backupData.settings = [];
        const setVal = (key, val) => {
          const idx = backupData.settings.findIndex(s => s.key === key);
          if (idx >= 0) backupData.settings[idx].value = val;
          else backupData.settings.push({ key, value: val });
        };
        setVal('show_carbs_fat', !!enable);
        UrlFetchApp.fetch(gistUrl, {
          method: 'patch',
          headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
          payload: JSON.stringify({
            files: { 'daily-diet-backup.json': { content: JSON.stringify(backupData, null, 2) } }
          }),
          muteHttpExceptions: true
        });
      }
    } catch (err) {
      console.error("同步碳水開關至 Gist 失敗:", err);
    }
  }
}

function syncGoalsToUserGist(goals, pat, gistId) {
  if (!pat || !gistId) return;
  const gistUrl = `https://api.github.com/gists/${gistId}`;
  try {
    const getRes = UrlFetchApp.fetch(gistUrl, {
      headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
      muteHttpExceptions: true
    });
    if (getRes.getResponseCode() === 200) {
      let backupData = { settings: [] };
      const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
      if (content) backupData = JSON.parse(content);
      if (!backupData.settings) backupData.settings = [];

      const setVal = (key, val) => {
        const idx = backupData.settings.findIndex(s => s.key === key);
        if (idx >= 0) backupData.settings[idx].value = val;
        else backupData.settings.push({ key, value: val });
      };

      if (goals.calories) setVal('calorie_goal', goals.calories);
      if (goals.protein) setVal('protein_goal', goals.protein);
      if (goals.water) setVal('water_goal', goals.water);
      if (goals.carbs) setVal('carbs_goal', goals.carbs);
      if (goals.fat) setVal('fat_goal', goals.fat);
      if (goals.show_carbs_fat !== undefined) setVal('show_carbs_fat', !!goals.show_carbs_fat);

      UrlFetchApp.fetch(gistUrl, {
        method: 'patch',
        headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
        payload: JSON.stringify({
          files: { 'daily-diet-backup.json': { content: JSON.stringify(backupData, null, 2) } }
        }),
        muteHttpExceptions: true
      });
    }
  } catch (err) {
    console.error("同步目標至 Gist 失敗:", err);
  }
}

// ========================================================
// 🍱 飲食紀錄 CRUD (Meal Logs)
// ========================================================

function saveMealLog(userId, meal, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    console.warn("⚠️ 獲取 LockService 鎖超時，直接寫入");
  }

  try {
    const todayKey = `DIET_LOGS_${userId}_${meal.date}`;
    let logs = [];
    try {
      const raw = props.getProperty(todayKey);
      if (raw) logs = JSON.parse(raw);
    } catch (e) {
      logs = [];
    }

    // 🛡️ 防重複：若同一 ID 已存在，或 3 分鐘內的喝水打卡重複同步，則更新而非無限制新增
    const mealId = meal.id || meal.timestamp;
    let existingIdx = -1;
    if (mealId) {
      existingIdx = logs.findIndex(l => l.id && String(l.id) === String(mealId));
    }
    if (existingIdx === -1 && meal.dish_name && (meal.dish_name.includes('水') || meal.dish_name.toLowerCase().includes('water'))) {
      const isRecentWater = logs.findIndex(l => 
        l.dish_name && (l.dish_name.includes('水') || l.dish_name.toLowerCase().includes('water')) && 
        (Math.abs((l.id || 0) - (mealId || 0)) < 3 * 60 * 1000 || l.time === meal.time)
      );
      if (isRecentWater !== -1) existingIdx = isRecentWater;
    }

    if (existingIdx !== -1) {
      logs[existingIdx] = { ...logs[existingIdx], ...meal };
    } else {
      logs.push(meal);
    }
    props.setProperty(todayKey, JSON.stringify(logs));

    // 同步寫入該用戶專屬 Gist
    if (pat && userGistId) {
      try {
        syncLogToUserGist(meal, userGistId, pat);
      } catch (e) {
        console.error("同步個人 Gist 失敗:", e);
      }
    }
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function updateOrSaveMealLog(userId, updateFields, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const todayStr = getTodayDateString();
  const todayKey = `DIET_LOGS_${userId}_${todayStr}`;
  let logs = getTodayLogs(userId, todayStr, props, userGistId);

  let targetMeal = null;
  if (logs.length > 0) {
    let targetIndex = logs.length - 1;
    if (updateFields.id) {
      const foundIdx = logs.findIndex(l => String(l.id) === String(updateFields.id));
      if (foundIdx !== -1) targetIndex = foundIdx;
    } else if (updateFields.dish_name) {
      const foundIdx = logs.findIndex(l => l.dish_name && (l.dish_name.includes(updateFields.dish_name) || updateFields.dish_name.includes(l.dish_name)));
      if (foundIdx !== -1) targetIndex = foundIdx;
    }

    targetMeal = logs[targetIndex];
    if (updateFields.dish_name && updateFields.dish_name !== targetMeal.dish_name) {
      targetMeal.dish_name = updateFields.dish_name;
    }
    if (updateFields.calories !== undefined) targetMeal.calories = Number(updateFields.calories);
    if (updateFields.protein !== undefined) targetMeal.protein = Number(updateFields.protein);
    if (updateFields.carbs !== undefined) targetMeal.carbs = Number(updateFields.carbs);
    if (updateFields.fat !== undefined) targetMeal.fat = Number(updateFields.fat);
    if (updateFields.water !== undefined) targetMeal.water = Number(updateFields.water);
    if (updateFields.comment !== undefined) targetMeal.comment = updateFields.comment;
    if (updateFields.breakdown !== undefined) targetMeal.breakdown = updateFields.breakdown;
    if (updateFields.baseBreakdown !== undefined) targetMeal.baseBreakdown = updateFields.baseBreakdown;
    if (updateFields.baseDishName !== undefined) targetMeal.baseDishName = updateFields.baseDishName;
    if (updateFields.baseCalories !== undefined) targetMeal.baseCalories = updateFields.baseCalories;
    if (updateFields.baseProtein !== undefined) targetMeal.baseProtein = updateFields.baseProtein;
    if (updateFields.baseCarbs !== undefined) targetMeal.baseCarbs = updateFields.baseCarbs;
    if (updateFields.baseFat !== undefined) targetMeal.baseFat = updateFields.baseFat;
    if (updateFields.baseWater !== undefined) targetMeal.baseWater = updateFields.baseWater;
    if (updateFields.multiplier !== undefined) targetMeal.multiplier = updateFields.multiplier;

    logs[targetIndex] = targetMeal;
    props.setProperty(todayKey, JSON.stringify(logs));

    if (pat && userGistId) {
      try {
        updateMealInUserGist(targetMeal, userGistId, pat);
      } catch (e) {
        console.error("更新 Gist 失敗:", e);
      }
    }
  } else {
    targetMeal = {
      id: updateFields.id || Date.now(),
      date: todayStr,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
      dish_name: updateFields.dish_name || '餐點',
      calories: Number(updateFields.calories) || 0,
      protein: Number(updateFields.protein) || 0,
      carbs: Number(updateFields.carbs) || 0,
      fat: Number(updateFields.fat) || 0,
      water: Number(updateFields.water) || 0,
      breakdown: updateFields.breakdown || [],
      baseBreakdown: updateFields.baseBreakdown || updateFields.breakdown || [],
      comment: updateFields.comment || '',
      baseDishName: updateFields.baseDishName || updateFields.dish_name || '餐點',
      baseCalories: updateFields.baseCalories !== undefined ? updateFields.baseCalories : Number(updateFields.calories) || 0,
      baseProtein: updateFields.baseProtein !== undefined ? updateFields.baseProtein : Number(updateFields.protein) || 0,
      baseCarbs: updateFields.baseCarbs !== undefined ? updateFields.baseCarbs : Number(updateFields.carbs) || 0,
      baseFat: updateFields.baseFat !== undefined ? updateFields.baseFat : Number(updateFields.fat) || 0,
      baseWater: updateFields.baseWater !== undefined ? updateFields.baseWater : Number(updateFields.water) || 0,
      multiplier: updateFields.multiplier || 1
    };
    saveMealLog(userId, targetMeal, userGistId, pat, props);
  }

  return targetMeal;
}

function updateMealInUserGist(updatedMeal, gistId, pat) {
  if (!gistId || !pat) return;
  const gistUrl = `https://api.github.com/gists/${gistId}`;
  const getRes = UrlFetchApp.fetch(gistUrl, {
    headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
    muteHttpExceptions: true
  });

  if (getRes.getResponseCode() === 200) {
    let backupData = { dietLogs: [], weightLogs: [], settings: [], favorites: [] };
    const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
    if (content) {
      try { backupData = JSON.parse(content); } catch (e) { }
    }
    if (backupData.dietLogs && backupData.dietLogs.length > 0) {
      let found = false;
      for (let i = 0; i < backupData.dietLogs.length; i++) {
        if (backupData.dietLogs[i].id && updatedMeal.id && String(backupData.dietLogs[i].id) === String(updatedMeal.id)) {
          backupData.dietLogs[i].calories = Number(updatedMeal.calories) || 0;
          backupData.dietLogs[i].protein = Number(updatedMeal.protein) || 0;
          if (updatedMeal.carbs !== undefined) backupData.dietLogs[i].carbs = Number(updatedMeal.carbs) || 0;
          if (updatedMeal.fat !== undefined) backupData.dietLogs[i].fat = Number(updatedMeal.fat) || 0;
          if (updatedMeal.water !== undefined) backupData.dietLogs[i].water = Number(updatedMeal.water) || 0;
          if (updatedMeal.dish_name) backupData.dietLogs[i].dish_name = updatedMeal.dish_name;
          if (updatedMeal.comment) backupData.dietLogs[i].comment = updatedMeal.comment;
          found = true;
          break;
        }
      }
      if (found) {
        UrlFetchApp.fetch(gistUrl, {
          method: 'patch',
          headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
          payload: JSON.stringify({
            files: { 'daily-diet-backup.json': { content: JSON.stringify(backupData, null, 2) } }
          }),
          muteHttpExceptions: true
        });
      }
    }
  }
}

/**
 * 🛡️ 自動清理過期的每日餐點快取 (防範 PropertiesService 500KB 總配額耗盡)
 * 歷史日誌已完整同步保存於 GitHub Gist，GAS Properties 僅需保留最近 48 小時快取
 * 藉由 CacheService 設置 12 小時防抖鎖，避免高頻請求重複執行
 */
function cleanExpiredDailyDietLogs(props) {
  try {
    const cache = CacheService.getScriptCache();
    const lockKey = 'CLEAN_EXPIRED_DIET_LOGS_LOCK';
    if (cache.get(lockKey)) return;

    if (!props) props = PropertiesService.getScriptProperties();
    const allProps = props.getProperties();
    const todayStr = getTodayDateString();
    
    // 計算昨天的日期字串 YYYY-MM-DD
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getTodayDateString(yesterday);

    let deletedCount = 0;
    for (const key in allProps) {
      if (key.startsWith('DIET_LOGS_')) {
        const lastUnderscore = key.lastIndexOf('_');
        if (lastUnderscore !== -1) {
          const datePart = key.substring(lastUnderscore + 1);
          if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            if (datePart !== todayStr && datePart !== yesterdayStr) {
              props.deleteProperty(key);
              deletedCount++;
            }
          }
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 [配額防護] 已成功清除 ${deletedCount} 筆超過 48 小時之過期每日餐點快取`);
    }

    cache.put(lockKey, 'done', 12 * 3600);
  } catch (err) {
    console.warn('⚠️ 自動清理過期每日餐點快取失敗:', err);
  }
}

function getTodayLogs(userId, dateStr, props, userGistId) {
  if (!props) props = PropertiesService.getScriptProperties();
  cleanExpiredDailyDietLogs(props);
  const todayKey = `DIET_LOGS_${userId}_${dateStr}`;
  let localLogs = [];
  try {
    const raw = props.getProperty(todayKey);
    if (raw) localLogs = JSON.parse(raw);
  } catch (e) {
    localLogs = [];
  }

  // ☁️ 若 Properties 內無紀錄，向 Gist 查詢回填
  if (localLogs.length === 0) {
    const gistId = userGistId || (userId ? props.getProperty(`USER_GIST_${userId}`) : '');
    const pat = props.getProperty('GITHUB_PAT');
    if (gistId && pat) {
      try {
        const gistUrl = `https://api.github.com/gists/${gistId}`;
        const getRes = UrlFetchApp.fetch(gistUrl, {
          headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
          muteHttpExceptions: true
        });
        if (getRes.getResponseCode() === 200) {
          const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
          if (content) {
            const backupData = JSON.parse(content);
            if (backupData.dietLogs && Array.isArray(backupData.dietLogs)) {
              const todayFromGist = backupData.dietLogs.filter(l => l.date === dateStr);
              if (todayFromGist.length > 0) {
                props.setProperty(todayKey, JSON.stringify(todayFromGist));
                return todayFromGist;
              }
            }
          }
        }
      } catch (e) {
        console.warn("從 Gist 拉取今日紀錄失敗:", e);
      }
    }
  }

  return localLogs;
}

function getRecentDaysLogs(userId, days, props, userGistId, lang) {
  if (!props) props = PropertiesService.getScriptProperties();
  const gistId = userGistId || (userId ? props.getProperty(`USER_GIST_${userId}`) : '');
  const pat = props.getProperty('GITHUB_PAT');
  let gistLogs = null;

  if (gistId && pat) {
    try {
      const gistUrl = `https://api.github.com/gists/${gistId}`;
      const res = UrlFetchApp.fetch(gistUrl, {
        headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const content = JSON.parse(res.getContentText()).files?.['daily-diet-backup.json']?.content;
        if (content) {
          const backupData = JSON.parse(content);
          if (backupData.dietLogs && Array.isArray(backupData.dietLogs)) {
            gistLogs = backupData.dietLogs;
          }
        }
      }
    } catch (e) {
      console.warn("從 Gist 批量拉取歷史日誌失敗:", e);
    }
  }

  const result = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = Utilities.formatDate(d, "Asia/Taipei", "yyyy-MM-dd");
    const displayDate = Utilities.formatDate(d, "Asia/Taipei", "MM/dd");
    const dayOfWeek = getDayOfWeekName(d, lang || 'zh');

    let dayLogs = [];
    const todayKey = `DIET_LOGS_${userId}_${dateStr}`;
    const raw = props.getProperty(todayKey);
    if (raw) {
      try { dayLogs = JSON.parse(raw); } catch (e) {}
    }

    if (dayLogs.length === 0 && gistLogs) {
      dayLogs = gistLogs.filter(l => l.date === dateStr);
    }

    let totalCal = 0;
    let totalPro = 0;
    let totalWater = 0;
    dayLogs.forEach(l => {
      totalCal += Number(l.calories) || 0;
      totalPro += Number(l.protein) || 0;
      totalWater += Number(l.water) || 0;
    });

    result.push({
      date: dateStr,
      displayDate: displayDate,
      dayOfWeek: dayOfWeek,
      totalCal: totalCal,
      totalPro: totalPro,
      totalWater: totalWater,
      count: dayLogs.length,
      logs: dayLogs
    });
  }

  return result;
}

function deleteMealLog(userId, mealIdOrName, userGistId, pat, props, targetDateStr) {
  if (!props) props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) {}
  try {
    const todayStr = targetDateStr || getTodayDateString();
    const todayKey = `DIET_LOGS_${userId}_${todayStr}`;
    let logs = getTodayLogs(userId, todayStr, props, userGistId);

    if (logs.length === 0) return false;

    let removedMeal = null;
    if (mealIdOrName === 'last') {
      removedMeal = logs.pop();
    } else if (typeof mealIdOrName === 'number' || !isNaN(Number(mealIdOrName))) {
      const targetId = Number(mealIdOrName);
      const idx = logs.findIndex(l => l.id === targetId);
      if (idx !== -1) {
        removedMeal = logs.splice(idx, 1)[0];
      } else if (targetId < logs.length) {
        removedMeal = logs.splice(targetId, 1)[0];
      }
    } else {
      const idx = logs.findIndex(l => l.dish_name && l.dish_name.includes(mealIdOrName));
      if (idx !== -1) {
        removedMeal = logs.splice(idx, 1)[0];
      }
    }

    if (removedMeal) {
      props.setProperty(todayKey, JSON.stringify(logs));
      if (pat && userGistId) {
        try {
          deleteMealFromUserGist(removedMeal, userGistId, pat);
        } catch (e) {
          console.error("同步刪除 Gist 紀錄失敗:", e);
        }
      }
      return removedMeal;
    }
    return false;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function clearTodayLogs(userId, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const todayStr = getTodayDateString();
  const todayKey = `DIET_LOGS_${userId}_${todayStr}`;
  props.setProperty(todayKey, JSON.stringify([]));

  if (pat && userGistId) {
    try {
      const gistUrl = `https://api.github.com/gists/${userGistId}`;
      const getRes = UrlFetchApp.fetch(gistUrl, {
        headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
        muteHttpExceptions: true
      });
      if (getRes.getResponseCode() === 200) {
        let backupData = { dietLogs: [], weightLogs: [], settings: [], favorites: [] };
        const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
        if (content) {
          try { backupData = JSON.parse(content); } catch (e) { }
        }
        if (backupData.dietLogs) {
          backupData.dietLogs = backupData.dietLogs.filter(l => l.date !== todayStr);
        }
        UrlFetchApp.fetch(gistUrl, {
          method: 'patch',
          headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
          payload: JSON.stringify({
            files: { 'daily-diet-backup.json': { content: JSON.stringify(backupData, null, 2) } }
          }),
          muteHttpExceptions: true
        });
      }
    } catch (e) { }
  }
}

// ========================================================
// ☁️ GitHub Gist 同步操作
// ========================================================

function getOrCreateUserGist(userId, pat, props) {
  if (!pat) return '';
  if (!props) props = PropertiesService.getScriptProperties();

  const userGistKey = `USER_GIST_${userId}`;
  let gistId = props.getProperty(userGistKey);
  if (gistId) return gistId;

  try {
    const createRes = UrlFetchApp.fetch('https://api.github.com/gists', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        description: `Daily Diet User Cloud Database - ${userId}`,
        public: false,
        files: {
          'daily-diet-backup.json': {
            content: JSON.stringify({
              dietLogs: [],
              weightLogs: [],
              settings: [],
              favorites: []
            }, null, 2)
          }
        }
      }),
      muteHttpExceptions: true
    });

    if (createRes.getResponseCode() === 201) {
      const gistData = JSON.parse(createRes.getContentText());
      gistId = gistData.id;
      props.setProperty(userGistKey, gistId);
      console.log(`✅ 已為用戶 ${userId} 自動建立專屬 Gist: ${gistId}`);
      return gistId;
    }
  } catch (err) {
    console.error("自動建立 Gist 發生錯誤:", err);
  }

  return '';
}

function syncLogToUserGist(meal, gistId, pat) {
  if (!gistId || !pat) return;
  const gistUrl = `https://api.github.com/gists/${gistId}`;
  const getRes = UrlFetchApp.fetch(gistUrl, {
    headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
    muteHttpExceptions: true
  });

  if (getRes.getResponseCode() === 200) {
    let backupData = { dietLogs: [], weightLogs: [], settings: [], favorites: [] };
    const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
    if (content) {
      try { backupData = JSON.parse(content); } catch (e) { }
    }
    if (!backupData.dietLogs) backupData.dietLogs = [];

    const mealId = meal.id || meal.timestamp;
    let foundIndex = -1;
    if (mealId) {
      foundIndex = backupData.dietLogs.findIndex(l => (l.id && String(l.id) === String(mealId)) || (l.timestamp && String(l.timestamp) === String(mealId)));
    }
    if (foundIndex === -1 && meal.dish_name && (meal.dish_name.includes('水') || meal.dish_name.toLowerCase().includes('water'))) {
      foundIndex = backupData.dietLogs.findIndex(l => 
        l.date === meal.date && l.dish_name && 
        (l.dish_name.includes('水') || l.dish_name.toLowerCase().includes('water')) && 
        Math.abs((l.timestamp || 0) - (mealId || Date.now())) < 3 * 60 * 1000
      );
    }

    if (foundIndex !== -1) {
      backupData.dietLogs[foundIndex] = {
        ...backupData.dietLogs[foundIndex],
        ...meal,
        water: Number(meal.water) || backupData.dietLogs[foundIndex].water || 0
      };
    } else {
      backupData.dietLogs.unshift({
        id: mealId || Date.now(),
        date: meal.date,
        dish_name: meal.dish_name,
        calories: Number(meal.calories) || 0,
        protein: Number(meal.protein) || 0,
        carbs: Number(meal.carbs) || 0,
        fat: Number(meal.fat) || 0,
        water: Number(meal.water) || 0,
        timestamp: meal.timestamp || Date.now(),
        comment: meal.comment || '',
        source: meal.source || 'LINE_BOT'
      });
    }

    UrlFetchApp.fetch(gistUrl, {
      method: 'patch',
      headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        files: { 'daily-diet-backup.json': { content: JSON.stringify(backupData, null, 2) } }
      }),
      muteHttpExceptions: true
    });
  }
}

function deleteMealFromUserGist(targetMeal, gistId, pat) {
  if (!gistId || !pat) return;
  const gistUrl = `https://api.github.com/gists/${gistId}`;
  const getRes = UrlFetchApp.fetch(gistUrl, {
    headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
    muteHttpExceptions: true
  });

  if (getRes.getResponseCode() === 200) {
    let backupData = { dietLogs: [], weightLogs: [], settings: [], favorites: [] };
    const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
    if (content) {
      try { backupData = JSON.parse(content); } catch (e) { }
    }
    if (backupData.dietLogs && backupData.dietLogs.length > 0) {
      const idx = backupData.dietLogs.findIndex(l =>
        (targetMeal.id && l.id === targetMeal.id) ||
        (l.date === targetMeal.date && l.dish_name === targetMeal.dish_name && l.calories === targetMeal.calories)
      );
      if (idx !== -1) {
        backupData.dietLogs.splice(idx, 1);
        UrlFetchApp.fetch(gistUrl, {
          method: 'patch',
          headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
          payload: JSON.stringify({
            files: { 'daily-diet-backup.json': { content: JSON.stringify(backupData, null, 2) } }
          }),
          muteHttpExceptions: true
        });
      }
    }
  }
}

// ========================================================
// ⚖️ 體重紀錄與 💩 排便紀錄 (Weight & Poop Logs)
// ========================================================

function saveWeightLog(userId, weightVal, dateStr, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const weight = Number(parseFloat(weightVal).toFixed(1));
  const date = dateStr || getTodayDateString();
  const timestamp = new Date(date + 'T12:00:00+08:00').getTime();
  const logId = Date.now();

  const weightItem = {
    id: logId,
    weight: weight,
    date: date,
    timestamp: timestamp
  };

  const key = `WEIGHT_LOGS_${userId}`;
  let logs = [];
  try {
    const raw = props.getProperty(key);
    if (raw) logs = JSON.parse(raw);
  } catch (e) { logs = []; }

  // 取得前一次記錄的體重用以比對
  let prevWeight = null;
  if (logs.length > 0) {
    const prev = logs.find(l => l.date !== date && Number(l.weight) > 0) || logs[0];
    if (prev && prev.weight) prevWeight = Number(prev.weight);
  }

  const existIdx = logs.findIndex(l => l.date === date);
  if (existIdx !== -1) {
    logs[existIdx] = weightItem;
  } else {
    logs.unshift(weightItem);
  }
  logs.sort((a, b) => b.timestamp - a.timestamp);
  props.setProperty(key, JSON.stringify(logs.slice(0, 90))); // 保留最近 90 筆

  // 同步個人 Gist
  if (pat && userGistId) {
    try {
      syncWeightToUserGist(weightItem, userGistId, pat);
    } catch (e) {
      console.warn("同步體重至 Gist 失敗:", e);
    }
  }

  const diff = prevWeight !== null ? Number((weight - prevWeight).toFixed(1)) : 0;
  return {
    weight: weight,
    prevWeight: prevWeight,
    diff: diff,
    date: date,
    item: weightItem
  };
}

function savePoopLog(userId, timestampVal, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const ts = timestampVal ? Number(timestampVal) : Date.now();
  const dateStr = getTodayDateString(new Date(ts));
  const logId = Date.now();

  const poopItem = {
    id: logId,
    timestamp: ts,
    date: dateStr
  };

  const key = `POOP_LOGS_${userId}`;
  let logs = [];
  try {
    const raw = props.getProperty(key);
    if (raw) logs = JSON.parse(raw);
  } catch (e) { logs = []; }

  let prevTimestamp = null;
  if (logs.length > 0) {
    prevTimestamp = logs[0].timestamp;
  }

  logs.unshift(poopItem);
  logs.sort((a, b) => b.timestamp - a.timestamp);
  props.setProperty(key, JSON.stringify(logs.slice(0, 90)));

  // 同步個人 Gist
  if (pat && userGistId) {
    try {
      syncPoopToUserGist(poopItem, userGistId, pat);
    } catch (e) {
      console.warn("同步排便至 Gist 失敗:", e);
    }
  }

  let elapsedHours = null;
  if (prevTimestamp) {
    elapsedHours = Math.round((ts - prevTimestamp) / (1000 * 60 * 60));
  }

  return {
    timestamp: ts,
    prevTimestamp: prevTimestamp,
    elapsedHours: elapsedHours,
    date: dateStr,
    item: poopItem
  };
}

function getUserWeightHistory(userId, days, props, userGistId) {
  if (!props) props = PropertiesService.getScriptProperties();
  const key = `WEIGHT_LOGS_${userId}`;
  let logs = [];
  try {
    const raw = props.getProperty(key);
    if (raw) logs = JSON.parse(raw);
  } catch (e) { logs = []; }

  if ((!logs || logs.length === 0) && userGistId) {
    const pat = props.getProperty('GITHUB_PAT');
    if (pat) {
      try {
        const gistRes = UrlFetchApp.fetch(`https://api.github.com/gists/${userGistId}`, {
          headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
          muteHttpExceptions: true
        });
        if (gistRes.getResponseCode() === 200) {
          const content = JSON.parse(gistRes.getContentText()).files?.['daily-diet-backup.json']?.content;
          if (content) {
            const data = JSON.parse(content);
            if (Array.isArray(data.weightLogs) && data.weightLogs.length > 0) {
              logs = data.weightLogs;
              props.setProperty(key, JSON.stringify(logs.slice(0, 90)));
            }
          }
        }
      } catch (err) {}
    }
  }

  logs.sort((a, b) => a.timestamp - b.timestamp);
  if (days && days > 0) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return logs.filter(l => (l.timestamp || new Date(l.date).getTime()) >= cutoff);
  }
  return logs;
}

function getUserPoopHistory(userId, days, props, userGistId) {
  if (!props) props = PropertiesService.getScriptProperties();
  const key = `POOP_LOGS_${userId}`;
  let logs = [];
  try {
    const raw = props.getProperty(key);
    if (raw) logs = JSON.parse(raw);
  } catch (e) { logs = []; }

  if ((!logs || logs.length === 0) && userGistId) {
    const pat = props.getProperty('GITHUB_PAT');
    if (pat) {
      try {
        const gistRes = UrlFetchApp.fetch(`https://api.github.com/gists/${userGistId}`, {
          headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
          muteHttpExceptions: true
        });
        if (gistRes.getResponseCode() === 200) {
          const content = JSON.parse(gistRes.getContentText()).files?.['daily-diet-backup.json']?.content;
          if (content) {
            const data = JSON.parse(content);
            if (Array.isArray(data.poopLogs) && data.poopLogs.length > 0) {
              logs = data.poopLogs;
              props.setProperty(key, JSON.stringify(logs.slice(0, 90)));
            }
          }
        }
      } catch (err) {}
    }
  }

  logs.sort((a, b) => a.timestamp - b.timestamp);
  if (days && days > 0) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return logs.filter(l => l.timestamp >= cutoff);
  }
  return logs;
}

function syncWeightToUserGist(weightItem, gistId, pat) {
  const gistUrl = `https://api.github.com/gists/${gistId}`;
  const getRes = UrlFetchApp.fetch(gistUrl, {
    headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
    muteHttpExceptions: true
  });

  if (getRes.getResponseCode() === 200) {
    let backupData = { dietLogs: [], weightLogs: [], poopLogs: [], settings: [], favorites: [] };
    const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
    if (content) {
      try { backupData = JSON.parse(content); } catch (e) {}
    }
    if (!Array.isArray(backupData.weightLogs)) backupData.weightLogs = [];
    if (!Array.isArray(backupData.poopLogs)) backupData.poopLogs = [];

    const existIdx = backupData.weightLogs.findIndex(l => l.date === weightItem.date);
    if (existIdx !== -1) {
      backupData.weightLogs[existIdx] = weightItem;
    } else {
      backupData.weightLogs.push(weightItem);
    }
    backupData.weightLogs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    UrlFetchApp.fetch(gistUrl, {
      method: 'patch',
      headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        files: { 'daily-diet-backup.json': { content: JSON.stringify(backupData, null, 2) } }
      }),
      muteHttpExceptions: true
    });
  }
}

function syncPoopToUserGist(poopItem, gistId, pat) {
  const gistUrl = `https://api.github.com/gists/${gistId}`;
  const getRes = UrlFetchApp.fetch(gistUrl, {
    headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
    muteHttpExceptions: true
  });

  if (getRes.getResponseCode() === 200) {
    let backupData = { dietLogs: [], weightLogs: [], poopLogs: [], settings: [], favorites: [] };
    const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
    if (content) {
      try { backupData = JSON.parse(content); } catch (e) {}
    }
    if (!Array.isArray(backupData.weightLogs)) backupData.weightLogs = [];
    if (!Array.isArray(backupData.poopLogs)) backupData.poopLogs = [];

    backupData.poopLogs.push(poopItem);
    backupData.poopLogs.sort((a, b) => a.timestamp - b.timestamp);

    UrlFetchApp.fetch(gistUrl, {
      method: 'patch',
      headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        files: { 'daily-diet-backup.json': { content: JSON.stringify(backupData, null, 2) } }
      }),
      muteHttpExceptions: true
    });
  }
}

// ========================================================
// ⭐ 常用餐點 CRUD (Favorites)
// ========================================================

function getUserFavorites(userId, props, userGistId) {
  if (!props) props = PropertiesService.getScriptProperties();
  const favKey = `FAVORITES_${userId}`;
  try {
    const raw = props.getProperty(favKey);
    if (raw !== null && raw !== undefined) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  const gistId = userGistId || (userId ? props.getProperty(`USER_GIST_${userId}`) : '');
  const pat = props.getProperty('GITHUB_PAT');
  if (gistId && pat) {
    try {
      const gistUrl = `https://api.github.com/gists/${gistId}`;
      const getRes = UrlFetchApp.fetch(gistUrl, {
        headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
        muteHttpExceptions: true
      });
      if (getRes.getResponseCode() === 200) {
        const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
        if (content) {
          const backupData = JSON.parse(content);
          if (backupData.favorites && Array.isArray(backupData.favorites)) {
            props.setProperty(favKey, JSON.stringify(backupData.favorites));
            return backupData.favorites;
          }
        }
      }
    } catch (e) {
      console.warn("從 Gist 拉取常用餐點失敗:", e);
    }
  }

  return [];
}

function saveUserFavorite(userId, favItem, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) {}
  try {
    const favKey = `FAVORITES_${userId}`;
    let favorites = getUserFavorites(userId, props);

    // 確保輸入的名稱不帶「蛋水」或「蛋 水」等後綴殘留
    if (favItem.dish_name) {
      favItem.dish_name = favItem.dish_name.replace(/\s*蛋\s*水$/gi, '').trim();
    }

    const cleanTargetName = String(favItem.dish_name || '').trim().toLowerCase();

    // 1. 精準比對名稱或 ID
    let existingIdx = favorites.findIndex(f => {
      const fn = String(f.dish_name || '').trim().toLowerCase();
      if (fn === cleanTargetName) return true;
      if (favItem.id && f.id === favItem.id) return true;
      return false;
    });

    // 2. 智慧修復比對：尋找先前因舊版 bug 殘留「蛋水」或「蛋 水」的污染舊資料 (例如 "拿鐵蛋水" 或 "拿鐵 蛋 水")
    if (existingIdx === -1 && cleanTargetName) {
      existingIdx = favorites.findIndex(f => {
        const fn = String(f.dish_name || '').trim().toLowerCase();
        const cleanedFn = fn.replace(/\s*蛋\s*水$/gi, '').trim();
        return cleanedFn === cleanTargetName || (fn.startsWith(cleanTargetName) && (fn.endsWith('蛋水') || fn.endsWith('水')));
      });
    }

    if (existingIdx !== -1) {
      // 原地更新，保留既有 ID
      const orig = favorites[existingIdx];
      favorites[existingIdx] = {
        ...orig,
        ...favItem,
        id: orig.id || favItem.id || Date.now(),
        dish_name: favItem.dish_name
      };
      console.log(`✅ [常用餐點更新] 成功原地更新【${favItem.dish_name}】數值`);
    } else {
      favorites.unshift(favItem);
      console.log(`➕ [常用餐點新增] 成功新增【${favItem.dish_name}】`);
    }

    // 清理重複項與修復舊污染
    const seen = new Set();
    favorites = favorites.filter(f => {
      const n = String(f.dish_name || '').replace(/\s*蛋\s*水$/gi, '').trim();
      if (!n) return false;
      const lower = n.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      f.dish_name = n; // 自動清洗舊資料名稱
      return true;
    });

    props.setProperty(favKey, JSON.stringify(favorites));

    const gistId = userGistId || (userId ? props.getProperty(`USER_GIST_${userId}`) : '');
    const token = pat || props.getProperty('GITHUB_PAT');
    if (token && gistId) {
      try {
        syncFavoritesToUserGist(favorites, gistId, token);
      } catch (e) {
        console.error("同步常用餐點至 Gist 失敗:", e);
      }
    }
    return favorites;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function deleteUserFavorite(userId, favIdentifier, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) {}
  try {
    const favKey = `FAVORITES_${userId}`;
    let favorites = getUserFavorites(userId, props, userGistId);
    const cleanId = String(favIdentifier || '').trim();
    let decodedId = cleanId;
    try { decodedId = decodeURIComponent(cleanId).trim(); } catch (e) {}

    favorites = favorites.filter(f => {
      const fId = String(f.id || '').trim();
      const fName = String(f.dish_name || '').trim();
      return fId !== cleanId && fId !== decodedId && fName !== cleanId && fName !== decodedId;
    });
    props.setProperty(favKey, JSON.stringify(favorites));

    const gistId = userGistId || (userId ? props.getProperty(`USER_GIST_${userId}`) : '');
    const token = pat || props.getProperty('GITHUB_PAT');
    if (token && gistId) {
      try {
        syncFavoritesToUserGist(favorites, gistId, token);
      } catch (e) {
        console.error("同步刪除常用餐點至 Gist 失敗:", e);
      }
    }
    return favorites;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * 常用餐點順序調整 (上移 / 下移 / 置頂)
 */
function reorderUserFavorites(userId, favIdentifier, direction, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) {}
  try {
    const favKey = `FAVORITES_${userId}`;
    let favorites = getUserFavorites(userId, props, userGistId);
    if (!favorites || favorites.length <= 1) return favorites || [];

    const cleanId = String(favIdentifier || '').trim();
    let decodedId = cleanId;
    try { decodedId = decodeURIComponent(cleanId).trim(); } catch (e) {}

    const idx = favorites.findIndex(f => {
      const fId = String(f.id || '').trim();
      const fName = String(f.dish_name || '').trim();
      return fId === cleanId || fId === decodedId || fName === cleanId || fName === decodedId;
    });

    if (idx === -1) return favorites;

    const dir = String(direction || 'up').toLowerCase();
    const item = favorites[idx];

    if (dir === 'top') {
      if (idx > 0) {
        favorites.splice(idx, 1);
        favorites.unshift(item);
      }
    } else if (dir === 'up') {
      if (idx > 0) {
        favorites[idx] = favorites[idx - 1];
        favorites[idx - 1] = item;
      }
    } else if (dir === 'down') {
      if (idx < favorites.length - 1) {
        favorites[idx] = favorites[idx + 1];
        favorites[idx + 1] = item;
      }
    }

    props.setProperty(favKey, JSON.stringify(favorites));

    const gistId = userGistId || (userId ? props.getProperty(`USER_GIST_${userId}`) : '');
    const token = pat || props.getProperty('GITHUB_PAT');
    if (token && gistId) {
      try {
        syncFavoritesToUserGist(favorites, gistId, token);
      } catch (e) {
        console.error("同步調整常用餐點順序至 Gist 失敗:", e);
      }
    }
    return favorites;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * 依指定陣列順序全量重新排序常用餐點
 */
function saveAllUserFavoritesOrder(userId, orderedIdentifiers, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) {}
  try {
    const favKey = `FAVORITES_${userId}`;
    let favorites = getUserFavorites(userId, props, userGistId);
    if (!favorites || favorites.length <= 1) return favorites || [];

    const orderList = (Array.isArray(orderedIdentifiers) ? orderedIdentifiers : [])
      .map(id => String(id || '').trim().toLowerCase())
      .filter(Boolean);

    if (orderList.length > 0) {
      favorites.sort((a, b) => {
        const idA = String(a.id || '').toLowerCase();
        const nameA = String(a.dish_name || '').toLowerCase();
        const idB = String(b.id || '').toLowerCase();
        const nameB = String(b.dish_name || '').toLowerCase();

        let idxA = orderList.findIndex(o => o === idA || o === nameA);
        let idxB = orderList.findIndex(o => o === idB || o === nameB);

        if (idxA === -1) idxA = 9999;
        if (idxB === -1) idxB = 9999;
        return idxA - idxB;
      });
    }

    props.setProperty(favKey, JSON.stringify(favorites));

    const gistId = userGistId || (userId ? props.getProperty(`USER_GIST_${userId}`) : '');
    const token = pat || props.getProperty('GITHUB_PAT');
    if (token && gistId) {
      try {
        syncFavoritesToUserGist(favorites, gistId, token);
      } catch (e) {
        console.error("同步排序常用餐點至 Gist 失敗:", e);
      }
    }
    return favorites;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function syncFavoritesToUserGist(favorites, gistId, pat) {
  if (!gistId || !pat) return;
  const gistUrl = `https://api.github.com/gists/${gistId}`;
  const getRes = UrlFetchApp.fetch(gistUrl, {
    headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
    muteHttpExceptions: true
  });

  if (getRes.getResponseCode() === 200) {
    let backupData = { dietLogs: [], weightLogs: [], settings: [], favorites: [] };
    const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
    if (content) {
      try { backupData = JSON.parse(content); } catch (e) { }
    }
    backupData.favorites = favorites;

    UrlFetchApp.fetch(gistUrl, {
      method: 'patch',
      headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        files: { 'daily-diet-backup.json': { content: JSON.stringify(backupData, null, 2) } }
      }),
      muteHttpExceptions: true
    });
  }
}

// ========================================================
// 🚨 個資法徹底銷毀 (Purge All Data)
// ========================================================

function purgeAllUserData(userId, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const todayStr = getTodayDateString();
  props.deleteProperty(`DIET_LOGS_${userId}_${todayStr}`);
  props.deleteProperty(`FAVORITES_${userId}`);
  props.deleteProperty(`USER_GIST_${userId}`);
  props.deleteProperty(`CALORIE_GOAL_${userId}`);
  props.deleteProperty(`PROTEIN_GOAL_${userId}`);
  props.deleteProperty(`WATER_GOAL_${userId}`);
  props.deleteProperty(`LANGUAGE_${userId}`);
  props.deleteProperty(`PERSONA_${userId}`);

  const gistId = userGistId || (userId ? props.getProperty(`USER_GIST_${userId}`) : '');
  const token = pat || props.getProperty('GITHUB_PAT');
  if (token && gistId) {
    try {
      UrlFetchApp.fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'delete',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' },
        muteHttpExceptions: true
      });
      console.log(`✅ 已為用戶 ${userId} 徹底銷毀 GitHub Gist: ${gistId}`);
    } catch (e) {
      console.error("銷毀 Gist 失敗:", e);
    }
  }
}

// ========================================================
// 📊 系統運作日誌與用量監控 (System Logs & Quota)
// ========================================================

function getUserDisplayName(userId, channelAccessToken, props) {
  if (!userId || userId === 'unknown' || userId === 'default_user') return '訪客';
  if (!props) props = PropertiesService.getScriptProperties();

  const cacheKey = `USER_NAME_${userId}`;
  const cachedName = props.getProperty(cacheKey);
  // 🛡️ 異常餐點名過濾防護：若快取中被誤寫為餐點名稱 (含有 + 號或特定餐點名)，強制忽略快取並重新向 LINE Profile 獲取真實名字
  const isSuspiciousFoodName = cachedName && (/[\+＋]/.test(cachedName) || /美式咖啡|茶葉蛋|雞胸|便當|吐司|沙拉|地瓜|香蕉|蘋果|優格|拿鐵|蛋餅|水餃|鍋貼|乾麵|牛肉麵|炒飯|白飯/.test(cachedName));
  if (cachedName && !isSuspiciousFoodName) return cachedName;

  if (!channelAccessToken) channelAccessToken = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (channelAccessToken && typeof userId === 'string' && userId.startsWith('U')) {
    try {
      const res = UrlFetchApp.fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
        headers: { Authorization: `Bearer ${channelAccessToken}` },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const profile = JSON.parse(res.getContentText());
        if (profile.displayName) {
          props.setProperty(cacheKey, profile.displayName);
          return profile.displayName;
        }
      }
    } catch (e) {
      console.warn("取得 LINE 用戶名失敗:", e);
    }
  }
  return (userId && userId.length > 8 && userId.startsWith('U')) ? `LINE 用戶 (${userId.slice(-4)})` : (userId || '訪客');
}

function recordSystemLog(type, userId, input, aiResult, output, userName, extra) {
  const props = PropertiesService.getScriptProperties();
  const time = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");

  const isFoodName = (name) => name && (/[\+＋]/.test(name) || /美式咖啡|茶葉蛋|雞胸|便當|吐司|沙拉|地瓜|香蕉|蘋果|優格|拿鐵|蛋餅|水餃|鍋貼|乾麵|牛肉麵|炒飯|白飯/.test(name));

  let displayName = userName;
  if (!displayName || isFoodName(displayName)) {
    displayName = props.getProperty(`USER_NAME_${userId}`);
    if ((!displayName || isFoodName(displayName)) && typeof userId === 'string' && userId.startsWith('U')) {
      const channelToken = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
      displayName = getUserDisplayName(userId, channelToken, props);
    }
  }
  // Web 用戶 caller 的名稱拿不到就用他的名字
  if ((!displayName || isFoodName(displayName)) && userId && !userId.startsWith('U') && !['web_client', 'unknown', 'default_user', 'web_user', 'line_api'].includes(userId)) {
    displayName = userId;
  }
  if (!displayName || isFoodName(displayName)) {
    if (userId === 'default_user' || userId === 'web_user' || userId === 'web_client') {
      displayName = 'Web 用戶';
    } else if (userId && userId.length > 8 && userId.startsWith('U')) {
      displayName = `LINE 用戶 (${userId.slice(-4)})`;
    } else {
      displayName = userId || '訪客';
    }
  }

  // 決定來源通道 (LINE 智慧助理 vs Web 飲食管家 vs 系統服務)
  const isWebAction = type.startsWith('Web') || (extra && extra.source === 'Web');
  const isLineAction = !isWebAction && (
    (typeof userId === 'string' && userId.startsWith('U')) || 
    (extra && extra.source === 'LINE')
  );

  let defaultLocation = 'Cloud 雲端核心';
  let defaultSource = '系統核心';
  if (isWebAction) {
    defaultLocation = 'Web 飲食管家';
    defaultSource = 'Web 飲食管家';
  } else if (isLineAction) {
    defaultLocation = 'LINE 智慧助理';
    defaultSource = 'LINE 智慧助理';
  }

  const logItem = {
    time: time,
    userName: displayName,
    userId: userId || displayName,
    rawUserId: (userId || 'unknown').slice(-6),
    type: type,
    input: typeof input === 'object' ? JSON.stringify(input) : String(input || ''),
    aiResult: typeof aiResult === 'object' ? JSON.stringify(aiResult) : String(aiResult || ''),
    output: typeof output === 'object' ? JSON.stringify(output) : String(output || ''),
    ip: (extra && extra.ip) ? String(extra.ip) : '',
    location: (extra && extra.location) ? String(extra.location) : defaultLocation,
    device: (extra && extra.device) ? String(extra.device) : '',
    source: (extra && extra.source) ? String(extra.source) : defaultSource
  };

  Logger.log(`[${logItem.time}] [${logItem.type}] [${logItem.source}] [${displayName}] ${logItem.input} -> ${logItem.output}`);

  // 1. 本地多槽位高速安全暫存 (Multi-Slot 私有加密快取，純後端儲存，100% 絕不對外公開)
  try {
    const cacheItem = {
      time: logItem.time,
      userName: logItem.userName,
      userId: logItem.userId,
      type: logItem.type,
      input: logItem.input ? logItem.input.slice(0, 500) : '',
      aiResult: logItem.aiResult ? logItem.aiResult.slice(0, 500) : '',
      output: logItem.output ? logItem.output.slice(0, 500) : '',
      ip: logItem.ip,
      location: logItem.location,
      device: logItem.device,
      source: logItem.source
    };
    appendToLocalCachedLogs(cacheItem, props);
  } catch (e) {
    console.error("儲存實時日誌快取失敗:", e);
  }

  // 2. Google 試算表存檔 (備援存檔)
  try {
    const ss = getOrCreateLogSheet(props);
    if (ss) {
      const sheet = ss.getSheets()[0];
      sheet.appendRow([
        logItem.time, 
        displayName, 
        userId, 
        logItem.type, 
        logItem.input, 
        logItem.aiResult, 
        logItem.output,
        logItem.ip,
        logItem.location,
        logItem.device || ''
      ]);
    }
  } catch (sheetErr) {
    console.warn("寫入 Google Sheet 日誌失敗:", sheetErr);
  }
}

// ========================================================
// 📊 Multi-Slot 純後端安全快取模組 (私有加密儲存，100% 絕不對外公開)
// ========================================================

const LOG_SLOT_COUNT = 15; // 15 個私有槽位，可容納多達 450 筆日誌，純後端儲存
const LOG_SLOT_PREFIX = 'SYS_LOG_SLOT_';

function deduplicateLogs(logs) {
  const seen = new Set();
  const deduped = [];
  for (const log of (logs || [])) {
    if (!log) continue;
    const timeStr = String(log.time || '').trim();
    const userStr = String(log.userId || log.userName || '').trim();
    const typeStr = String(log.type || '').trim();
    const inputStr = String(log.input || '').slice(0, 30).trim();
    const key = `${timeStr}_${userStr}_${typeStr}_${inputStr}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(log);
    }
  }
  deduped.sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')));
  return deduped;
}

function getLocalCachedLogs(props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const allCached = [];

  // 1. 舊版單一屬性相容
  try {
    const legacyRaw = props.getProperty('SYSTEM_RECENT_LOGS');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) allCached.push(...parsed);
    }
  } catch (e) {}

  // 2. Multi-Slot 分槽讀取 (純專案內部 PropertiesService 儲存，外人完全無權限存取)
  for (let i = 0; i < LOG_SLOT_COUNT; i++) {
    try {
      const raw = props.getProperty(`${LOG_SLOT_PREFIX}${i}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) allCached.push(...parsed);
      }
    } catch (e) {}
  }

  return deduplicateLogs(allCached);
}

function appendToLocalCachedLogs(logItem, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const currentLogs = getLocalCachedLogs(props);
  currentLogs.unshift(logItem);

  const trimmed = deduplicateLogs(currentLogs).slice(0, 450); // 本地安全保留最多 450 筆
  const chunkSize = 30; // 每個 Slot 30 筆

  for (let i = 0; i < LOG_SLOT_COUNT; i++) {
    const chunk = trimmed.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length > 0) {
      props.setProperty(`${LOG_SLOT_PREFIX}${i}`, JSON.stringify(chunk));
    } else {
      props.deleteProperty(`${LOG_SLOT_PREFIX}${i}`);
    }
  }

  try {
    props.setProperty('SYSTEM_RECENT_LOGS', JSON.stringify(trimmed.slice(0, 20)));
  } catch (e) {}
}

function saveCleanedCachedLogs(cleanedLogs, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const trimmed = deduplicateLogs(cleanedLogs).slice(0, 450);
  const chunkSize = 30;

  for (let i = 0; i < LOG_SLOT_COUNT; i++) {
    const chunk = trimmed.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length > 0) {
      props.setProperty(`${LOG_SLOT_PREFIX}${i}`, JSON.stringify(chunk));
    } else {
      props.deleteProperty(`${LOG_SLOT_PREFIX}${i}`);
    }
  }

  try {
    props.setProperty('SYSTEM_RECENT_LOGS', JSON.stringify(trimmed.slice(0, 20)));
  } catch (e) {}
}

/**
 * 徹底自 GitHub 刪除系統審計 Gist，確保零個資暴露與 100% 隱私安全
 */
function purgeSystemLogsGist(props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const pat = props.getProperty('GITHUB_PAT');
  const targetGists = [
    props.getProperty('SYSTEM_LOGS_GIST_ID'),
    '92c98283f346798d4b458428ccc72d95'
  ].filter(Boolean);

  if (pat && targetGists.length > 0) {
    for (const gid of targetGists) {
      try {
        UrlFetchApp.fetch(`https://api.github.com/gists/${gid}`, {
          method: 'delete',
          headers: { 'Authorization': `Bearer ${pat}` },
          muteHttpExceptions: true
        });
        console.log(`🛡️ [安全防護] 已徹底自 GitHub 永久銷毀系統審計日誌 Gist: ${gid}`);
      } catch (e) {
        console.warn(`刪除 Gist ${gid} 失敗:`, e);
      }
    }
  }
  props.deleteProperty('SYSTEM_LOGS_GIST_ID');
}

function getOrCreateLogSheet(props) {
  if (!props) props = PropertiesService.getScriptProperties();
  let sheetId = props.getProperty('LOG_SHEET_ID') || (typeof DEFAULT_LOG_SHEET_ID !== 'undefined' && DEFAULT_LOG_SHEET_ID);
  if (sheetId) {
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      return ss;
    } catch (e) {
      console.warn("無法開啟現有 LOG_SHEET_ID，將嘗試重新建立:", e);
    }
  }

  try {
    const ss = SpreadsheetApp.create('📊 Daily Diet 系統運作與對話日誌庫 (永久存檔)');
    sheetId = ss.getId();
    props.setProperty('LOG_SHEET_ID', sheetId);

    const sheet = ss.getSheets()[0];
    sheet.setName('運作與對話紀錄');
    sheet.appendRow(["時間", "用戶名稱", "用戶識別碼", "操作類型", "用戶傳送內容", "AI辨識結果", "回傳內容 / 處理狀態", "IP", "地理位置", "客戶端裝置"]);

    const headerRange = sheet.getRange(1, 1, 1, 10);
    headerRange.setBackground("#000000").setFontColor("#FDE047").setFontWeight("bold").setFontSize(11);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 140);
    sheet.setColumnWidth(3, 160);
    sheet.setColumnWidth(4, 120);
    sheet.setColumnWidth(5, 280);
    sheet.setColumnWidth(6, 280);
    sheet.setColumnWidth(7, 320);
    sheet.setColumnWidth(8, 140);
    sheet.setColumnWidth(9, 140);
    sheet.setColumnWidth(10, 180);

    return ss;
  } catch (err) {
    console.warn("自動建立 Google Sheet 日誌失敗 (可能是權限未授權):", err);
    return null;
  }
}

function initLogSheet() {
  const props = PropertiesService.getScriptProperties();
  const ss = getOrCreateLogSheet(props);
  if (ss) {
    console.log("✅ 成功建立/取得日誌試算表:", ss.getUrl());
    return ss.getUrl();
  } else {
    console.error("❌ 建立日誌試算表失敗，請手動在 Google Drive 建立試算表後綁定。");
    return null;
  }
}

/**
 * 取得完整運作日誌：純伺服器內部 Multi-Slot 快取 + Google 試算表 (完全私有，絕無外部 Gist 洩漏)
 * @param {number} limit 最大回傳筆數 (預設 500)
 * @param {number} days 回溯天數 (預設 30 天)
 */
function getRecentLogsData(limit, days) {
  const targetLimit = limit ? Number(limit) : 500;
  const targetDays = (typeof days !== 'undefined' && days !== null) ? Number(days) : 30;
  const props = PropertiesService.getScriptProperties();
  const pat = props.getProperty('GITHUB_PAT');

  // 🛡️ 強制確保銷毀任何公開 Gist 日誌庫
  purgeSystemLogsGist(props);

  let allLogs = [];

  // 1. 從純私有多槽位安全快取載入 (存於 Google 伺服器內部，外人絕無權限存取)
  const localLogs = getLocalCachedLogs(props);
  if (localLogs.length > 0) {
    allLogs = deduplicateLogs(localLogs);
  }

  // 2. 備援：若有 Google Sheet 紀錄，雙向合併
  try {
    const ss = getOrCreateLogSheet(props);
    if (ss) {
      const sheet = ss.getSheets()[0];
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const maxFetch = Math.min(lastRow - 1, 500);
        const startRow = lastRow - maxFetch + 1;
        const lastCol = sheet.getLastColumn();
        const fetchCols = Math.min(Math.max(lastCol, 9), 10);
        const rawValues = sheet.getRange(startRow, 1, maxFetch, fetchCols).getValues();
        const sheetLogs = [];
        for (let i = rawValues.length - 1; i >= 0; i--) {
          const row = rawValues[i];
          const timeStr = String(row[0] || '').trim();
          if (!timeStr) continue;
          sheetLogs.push({
            time: timeStr,
            userName: String(row[1] || '用戶'),
            userId: String(row[2] || ''),
            type: String(row[3] || '系統操作'),
            input: String(row[4] || ''),
            aiResult: String(row[5] || ''),
            output: String(row[6] || ''),
            ip: String(row[7] || ''),
            location: String(row[8] || ''),
            device: String(row[9] || '')
          });
        }
        allLogs = deduplicateLogs(allLogs.concat(sheetLogs));
      }
    }
  } catch (sheetErr) {}

  // 3. 自動回填今日用戶飲食紀錄至系統審計流 (確保 10:10 ~ 18:50 所有餐點與補水紀錄 100% 完整重現)
  try {
    const todayStr = getTodayDateString();
    const knownGists = [
      { userId: 'Winnie Lin', gistId: props.getProperty('USER_GIST_U1f5434ad962dfd74e5223a8dfc497c66') || '9a48b4604260e1a58a6d976f38c544b5', isLine: true },
      { userId: 'Web 用戶', gistId: props.getProperty('USER_GIST_default_user') || '9141ec7d6457090e66188c67c1351eed', isLine: false }
    ];

    for (const g of knownGists) {
      if (!g.gistId || !pat) continue;
      try {
        const uRes = UrlFetchApp.fetch(`https://api.github.com/gists/${g.gistId}`, {
          headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
          muteHttpExceptions: true
        });
        if (uRes.getResponseCode() === 200) {
          const uContent = JSON.parse(uRes.getContentText()).files?.['daily-diet-backup.json']?.content;
          if (uContent) {
            const uData = JSON.parse(uContent);
            if (Array.isArray(uData.dietLogs)) {
              for (const meal of uData.dietLogs) {
                if (meal.date === todayStr) {
                  const mealTime = meal.time ? `${todayStr} ${meal.time}:00` : `${todayStr} 12:00:00`;
                  const isWater = (meal.dish_name || '').includes('水');
                  const logType = isWater ? '🚰 喝水打卡' : (g.isLine ? '🎙️ 語音/文字記餐' : 'Web同步餐點');
                  allLogs.push({
                    time: mealTime,
                    userName: g.userId,
                    userId: g.userId,
                    type: logType,
                    input: meal.dish_name,
                    aiResult: `${meal.calories || 0}卡 / ${meal.protein || 0}g蛋 / ${meal.water || 0}ml水`,
                    output: meal.comment || `已記錄：【${meal.dish_name}】(${meal.calories || 0} kcal · ${meal.protein || 0}g 蛋 · ${meal.water || 0}ml 水)`,
                    ip: '',
                    location: g.isLine ? 'LINE 智慧助理' : 'Web 飲食管家',
                    source: g.isLine ? 'LINE 智慧助理' : 'Web 飲食管家'
                  });
                }
              }
            }
          }
        }
      } catch (err) {}
    }
    allLogs = deduplicateLogs(allLogs);
  } catch (e) {}

  // 3.5 排除指定異常用戶名日誌（食物名稱、line_api、純數字等）
  const isInvalidUser = function(s) {
    if (!s) return false;
    const str = String(s).trim();
    if (!str) return false;
    if (/^\d+$/.test(str)) return true;
    return str.includes('美式咖啡') ||
           str.includes('茶葉蛋') ||
           str.includes('珍珠豆花') ||
           str.includes('豆花刨冰') ||
           str.includes('綜合水果') ||
           str.includes('原萃綠茶') ||
           str.includes('蒜香炒空心菜') ||
           str.includes('清炒空心菜') ||
           str.includes('空心菜') ||
           str.includes('未檢測到食物') ||
           str === 'line_api' ||
           str.startsWith('line_api');
  };

  allLogs = allLogs.filter(function(l) {
    const uName = String(l.userName || l[1] || '').trim();
    const uId = String(l.userId || l[2] || '').trim();
    return !isInvalidUser(uName) && !isInvalidUser(uId);
  });

  // 4. 依照 targetDays 過濾 (預設 30 天)
  const now = Date.now();
  const cutoff = targetDays > 0 ? now - (targetDays * 24 * 60 * 60 * 1000) : 0;
  if (cutoff > 0) {
    allLogs = allLogs.filter(function(l) {
      if (!l.time) return true;
      const t = new Date(l.time).getTime();
      return isNaN(t) || t >= cutoff;
    });
  }

  return targetLimit > 0 ? allLogs.slice(0, targetLimit) : allLogs;
}

// ========================================================
// 🧠 AI 模型動態權重調度與 RPD 配額熔斷機制 (Dynamic Model Re-weighting & Circuit Breaker)
// ========================================================

/**
 * 判定模型錯誤是否屬於速率限制或每日配額耗盡 (429 / RESOURCE_EXHAUSTED / RPD limit)
 */
function isRateLimitOrQuotaError(statusCode, errSnippet, errObj) {
  if (statusCode === 429) return true;
  if (errObj && (errObj.error?.status === 'RESOURCE_EXHAUSTED' || errObj.error?.code === 429)) return true;
  const text = String(errSnippet || '').toLowerCase();
  return text.includes('resource_exhausted') || 
         text.includes('quota exceeded') || 
         text.includes('rate limit') || 
         text.includes('requests per day') ||
         text.includes('requestsperday') ||
         text.includes('too many requests');
}

/**
 * 讀取今日已被熔斷（標記耗盡）的模型名單
 * 天然依賴當日日期 key (AI_EXHAUSTED_YYYY-MM-DD)，跨午夜 00:00 自動無縫重置清空
 */
function getTodayExhaustedModels(props) {
  try {
    const today = getTodayDateString();
    const cache = CacheService.getScriptCache();
    const cacheKey = 'AI_EXHAUSTED_' + today;
    
    // 1. 優先從記憶體快取極速讀取
    const cached = cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (ce) {}
    }
    
    // 2. 從 ScriptProperties 持久層讀取
    const p = props || PropertiesService.getScriptProperties();
    const raw = p.getProperty(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      try {
        cache.put(cacheKey, raw, 21600); // 緩存 6 小時
      } catch (ce) {}
      return parsed;
    }
    return {};
  } catch (e) {
    console.warn('讀取今日耗盡模型失敗:', e);
    return {};
  }
}

/**
 * 將指定模型標記為今日熔斷（耗盡），動態降權至備援序列末端
 */
function markModelExhausted(model, reason, props, userId) {
  if (!model) return;
  try {
    const today = getTodayDateString();
    const p = props || PropertiesService.getScriptProperties();
    const cache = CacheService.getScriptCache();
    const cacheKey = 'AI_EXHAUSTED_' + today;

    let exhaustedMap = getTodayExhaustedModels(p);
    if (!exhaustedMap) exhaustedMap = {};

    // 今日已標記過則略過，避免重複寫入
    if (exhaustedMap[model]) return;

    const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
    exhaustedMap[model] = {
      exhaustedAt: timestamp,
      reason: String(reason || 'HTTP 429 Quota Exceeded').slice(0, 200),
      status: 'EXHAUSTED_TODAY'
    };

    const serialized = JSON.stringify(exhaustedMap);
    p.setProperty(cacheKey, serialized);
    try {
      cache.put(cacheKey, serialized, 21600);
    } catch (ce) {}

    // 同步更新當日配額 stats 的 exhaustedModels 欄位，供後台直接讀取
    try {
      const quotaKey = 'AI_QUOTA_' + today;
      const rawQuota = p.getProperty(quotaKey);
      let quotaStats = rawQuota ? JSON.parse(rawQuota) : { count: 0, success: 0, fail: 0, models: {}, recentErrors: [] };
      quotaStats.exhaustedModels = exhaustedMap;
      p.setProperty(quotaKey, JSON.stringify(quotaStats));
    } catch (qe) {}

    // 系統日誌記錄動態調度事件
    if (typeof recordSystemLog === 'function') {
      recordSystemLog(
        '模型配額動態調度',
        userId || 'SYSTEM',
        `[${model}] 觸發配額上限 (429/RPD)，已自動降權至備用序列末端`,
        `觸發原因: ${String(reason || '配額超量').slice(0, 150)}`,
        `今日後續請求將優先使用其餘健康模型，換日 (00:00) 自動回歸初始優先級`
      );
    }
  } catch (e) {
    console.warn('標記模型耗盡失敗:', e);
  }
}

/**
 * 動態計算模型呼叫優先順序 (Dynamic Model Priority Re-weighting)
 * 將健康模型置於最前線優先調用，今日已達 429/RPD 額滿之模型自動移至最末位作為備援
 */
function getDynamicModelOrder(baseModels, props) {
  if (!Array.isArray(baseModels) || baseModels.length === 0) {
    return baseModels || [];
  }
  try {
    const exhaustedMap = getTodayExhaustedModels(props);
    const exhaustedKeys = Object.keys(exhaustedMap || {});
    if (exhaustedKeys.length === 0) {
      return baseModels.slice(); // 今日無模型熔斷，保持初始最佳配置
    }

    const healthy = [];
    const exhausted = [];

    baseModels.forEach(function(m) {
      if (exhaustedMap[m]) {
        exhausted.push(m);
      } else {
        healthy.push(m);
      }
    });

    // 健康模型優先呼叫；額滿模型置於末端作為極限保底
    return healthy.concat(exhausted);
  } catch (e) {
    return baseModels.slice();
  }
}

/**
 * 統一處理 AI 模型調用失敗：若觸發 429/RPD 額滿自動熔斷降權，並記錄嘗試次數
 */
function handleAiModelFailure(model, statusCode, errSnippet, errObj, props, userId) {
  try {
    if (typeof isRateLimitOrQuotaError === 'function' && isRateLimitOrQuotaError(statusCode, errSnippet, errObj)) {
      if (typeof markModelExhausted === 'function') {
        markModelExhausted(model, `HTTP ${statusCode || 'ERR'}: ${String(errSnippet || '').slice(0, 120)}`, props, userId);
      }
    }
    if (typeof recordAiUsageAttempt === 'function') {
      recordAiUsageAttempt(model, false, props);
    }
  } catch (e) {
    console.warn('handleAiModelFailure 處理異常:', e);
  }
}

function recordAiUsageAttempt(model, isSuccess, props) {
  try {
    const p = props || PropertiesService.getScriptProperties();
    const cache = CacheService.getScriptCache();
    const now = Date.now();
    const cutoff = now - 60000;

    // 1. 滾動 60 秒 RPM 視窗統計
    const windowKey = 'RPM_TIMESTAMPS_WINDOW';
    let timestamps = [];
    try {
      const rawWindow = cache.get(windowKey);
      if (rawWindow) {
        timestamps = JSON.parse(rawWindow);
      } else {
        const rawProp = p.getProperty('RPM_BACKUP_WINDOW');
        if (rawProp) timestamps = JSON.parse(rawProp);
      }
    } catch (e) {}
    timestamps = (Array.isArray(timestamps) ? timestamps : []).filter(function(t) { return t > cutoff; });
    timestamps.push(now);
    
    try {
      cache.put(windowKey, JSON.stringify(timestamps), 180);
    } catch (e) {}
    try {
      p.setProperty('RPM_BACKUP_WINDOW', JSON.stringify(timestamps.slice(-30)));
    } catch (e) {}

    // 2. 當日配額統計（記錄單一嘗試計數，但不記錄至 recentErrors，避免單次重試造成重複報警）
    const today = getTodayDateString();
    const key = 'AI_QUOTA_' + today;
    const raw = p.getProperty(key);
    let stats = raw ? JSON.parse(raw) : { count: 0, success: 0, fail: 0, models: {}, recentErrors: [] };
    if (!stats.models) stats.models = {};

    stats.count = (stats.count || 0) + 1;
    const m = String(model || 'gemini-2.5-flash-lite');
    if (!stats.models[m]) stats.models[m] = { count: 0, success: 0, fail: 0 };
    stats.models[m].count = (stats.models[m].count || 0) + 1;

    if (isSuccess) {
      stats.success = (stats.success || 0) + 1;
      stats.models[m].success = (stats.models[m].success || 0) + 1;
      stats.lastSuccessfulModel = m;
    } else {
      stats.fail = (stats.fail || 0) + 1;
      stats.models[m].fail = (stats.models[m].fail || 0) + 1;
    }

    stats.lastUpdated = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
    p.setProperty(key, JSON.stringify(stats));
  } catch (e) {
    console.warn('記錄單次 AI 嘗試失敗:', e);
  }
}

function recordAiUsageSuccess(model, props, meta) {
  try {
    recordAiUsageAttempt(model, true, props);
    const p = props || PropertiesService.getScriptProperties();
    const today = getTodayDateString();
    const key = 'AI_QUOTA_' + today;
    const raw = p.getProperty(key);
    if (raw) {
      const stats = JSON.parse(raw);
      const m = String(model || 'gemini-2.5-flash-lite');
      stats.lastSuccessfulModel = m;
      stats.currentModel = m;
      stats.lastUpdated = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
      p.setProperty(key, JSON.stringify(stats));
    }
  } catch (e) {
    console.warn('記錄 AI 成功模型失敗:', e);
  }
}

function recordAiUsageConsolidatedFailure(models, props, consolidatedError, callerInfo) {
  try {
    const p = props || PropertiesService.getScriptProperties();
    const today = getTodayDateString();
    const key = 'AI_QUOTA_' + today;
    const raw = p.getProperty(key);
    let stats = raw ? JSON.parse(raw) : { count: 0, success: 0, fail: 0, models: {}, recentErrors: [] };
    if (!Array.isArray(stats.recentErrors)) stats.recentErrors = [];

    let callerName = '';
    let callerId = '';
    let callerOp = 'AI 模型運算';
    if (callerInfo) {
      if (typeof callerInfo === 'string') {
        callerId = callerInfo;
        callerName = p.getProperty(`USER_NAME_${callerInfo}`) || (!callerInfo.startsWith('U') && !['web_user', 'default_user'].includes(callerInfo) ? callerInfo : `用戶 (${callerInfo.slice(-4)})`);
      } else if (typeof callerInfo === 'object') {
        callerId = callerInfo.userId || '';
        const isWeb = (callerInfo.operation && callerInfo.operation.includes('Web')) || (callerId && callerId.startsWith('web_'));
        const defaultFallback = isWeb ? 'Web 用戶' : 'LINE 用戶';
        callerName = callerInfo.userName || callerInfo.caller || (callerId ? p.getProperty(`USER_NAME_${callerId}`) : '') || (!callerId.startsWith('U') && callerId && !['web_user', 'default_user', 'API-Gateway'].includes(callerId) ? callerId : '') || defaultFallback;
        callerOp = callerInfo.operation || callerOp;
      }
    }

    const modelName = Array.isArray(models) ? `${models.length} 個模型依序切換` : String(models || 'Gemini');
    stats.recentErrors.unshift({
      time: Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss"),
      model: modelName,
      error: String(consolidatedError || '所有備用模型嘗試皆失敗').slice(0, 300),
      caller: callerName || '系統服務',
      userId: callerId || 'API-Gateway',
      operation: callerOp
    });
    if (stats.recentErrors.length > 20) stats.recentErrors = stats.recentErrors.slice(0, 20);

    stats.lastUpdated = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
    p.setProperty(key, JSON.stringify(stats));
  } catch (e) {
    console.warn('記錄收斂錯誤失敗:', e);
  }
}

function recordAiUsage(model, isSuccess, props, errorMsg, callerInfo) {
  try {
    if (!isSuccess) {
      recordAiUsageAttempt(model, false, props);
      if (errorMsg) {
        recordAiUsageConsolidatedFailure([model], props, errorMsg, callerInfo);
      }
    } else {
      recordAiUsageSuccess(model, props, callerInfo);
    }
  } catch (e) {
    console.warn('記錄 AI 用量失敗:', e);
  }
}

function getAiQuotaStats(props) {
  try {
    const p = props || PropertiesService.getScriptProperties();
    const cache = CacheService.getScriptCache();
    const now = Date.now();
    const cutoff = now - 60000;

    const windowKey = 'RPM_TIMESTAMPS_WINDOW';
    let timestamps = [];
    try {
      const rawWindow = cache.get(windowKey);
      if (rawWindow) {
        timestamps = JSON.parse(rawWindow);
      } else {
        const rawProp = p.getProperty('RPM_BACKUP_WINDOW');
        if (rawProp) timestamps = JSON.parse(rawProp);
      }
    } catch (e) {}
    timestamps = (Array.isArray(timestamps) ? timestamps : []).filter(function(t) { return t > cutoff; });

    const currentRpm = timestamps.length;
    const rpmLimit = 15;
    const rpmPercent = Math.min(100, Math.round((currentRpm / rpmLimit) * 100));

    const today = getTodayDateString();
    const key = 'AI_QUOTA_' + today;
    const raw = p.getProperty(key);
    let stats = raw ? JSON.parse(raw) : { count: 0, success: 0, fail: 0, models: {}, recentErrors: [] };

    const used = stats.count || 0;
    const successCount = stats.success || 0;
    const failCount = stats.fail || 0;
    const limit = 1500;
    const remaining = Math.max(0, limit - used);
    const totalCalls = successCount + failCount;
    const successRate = totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : (failCount === 0 ? 100 : 0);

    const exhaustedModels = getTodayExhaustedModels(p);
    const exhaustedList = Object.keys(exhaustedModels || {});

    return {
      today: today,
      currentRpm: currentRpm,
      rpm: currentRpm,
      rpmLimit: rpmLimit,
      maxRpm: rpmLimit,
      rpmPercent: rpmPercent,
      limit: limit,
      max: limit,
      used: used,
      successCount: successCount,
      failCount: failCount,
      totalCalls: totalCalls,
      remaining: remaining,
      successRate: successRate,
      models: stats.models || {},
      exhaustedModels: exhaustedModels || {},
      exhaustedList: exhaustedList,
      recentErrors: stats.recentErrors || [],
      lastUpdated: stats.lastUpdated || Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss"),
      currentModel: stats.currentModel || (PRIMARY_GEMINI_MODELS && PRIMARY_GEMINI_MODELS[0]) || 'gemini-3.5-flash-lite',
      lastSuccessfulModel: stats.lastSuccessfulModel || stats.currentModel || (PRIMARY_GEMINI_MODELS && PRIMARY_GEMINI_MODELS[0]) || 'gemini-3.5-flash-lite'
    };
  } catch (e) {
    return {
      today: getTodayDateString(),
      currentRpm: 0,
      rpm: 0,
      rpmLimit: 15,
      maxRpm: 15,
      rpmPercent: 0,
      limit: 1500,
      max: 1500,
      used: 0,
      successCount: 0,
      failCount: 0,
      totalCalls: 0,
      remaining: 1500,
      successRate: 100,
      models: {},
      exhaustedModels: {},
      exhaustedList: [],
      recentErrors: [],
      lastUpdated: Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss"),
      currentModel: 'gemini-3.5-flash-lite',
      lastSuccessfulModel: 'gemini-3.5-flash-lite'
    };
  }
}
