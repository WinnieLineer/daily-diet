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

  // 若尚未儲存目標，向 Gist 雲端資料庫拉取
  if (!cal || !pro || !wat) {
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
              if (gCal && !cal) { cal = Number(gCal); props.setProperty(`CALORIE_GOAL_${userId}`, String(cal)); }
              if (gPro && !pro) { pro = Number(gPro); props.setProperty(`PROTEIN_GOAL_${userId}`, String(pro)); }
              if (gWat && !wat) { wat = Number(gWat); props.setProperty(`WATER_GOAL_${userId}`, String(wat)); }
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
    water: wat || DEFAULT_WATER_GOAL
  };
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

function getTodayLogs(userId, dateStr, props, userGistId) {
  if (!props) props = PropertiesService.getScriptProperties();
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
      return true;
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

    const existingIdx = favorites.findIndex(f => f.dish_name === favItem.dish_name);
    if (existingIdx !== -1) {
      favorites[existingIdx] = favItem;
    } else {
      favorites.unshift(favItem);
    }

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
  if (cachedName) return cachedName;

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
  return userId.length > 8 ? `用戶 (${userId.slice(-4)})` : userId;
}

function recordSystemLog(type, userId, input, aiResult, output, userName, extra) {
  const props = PropertiesService.getScriptProperties();
  const time = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");

  let displayName = userName;
  if (!displayName) {
    displayName = props.getProperty(`USER_NAME_${userId}`);
    if (!displayName && typeof userId === 'string' && userId.startsWith('U')) {
      const channelToken = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
      displayName = getUserDisplayName(userId, channelToken, props);
    }
  }
  if (!displayName) {
    displayName = (userId && userId.length > 8) ? `用戶 (${userId.slice(-4)})` : (userId || '訪客');
  }

  const logItem = {
    time: time,
    userName: displayName,
    userId: displayName,
    rawUserId: (userId || 'unknown').slice(-6),
    type: type,
    input: typeof input === 'object' ? JSON.stringify(input) : String(input || ''),
    aiResult: typeof aiResult === 'object' ? JSON.stringify(aiResult) : String(aiResult || ''),
    output: typeof output === 'object' ? JSON.stringify(output) : String(output || ''),
    ip: (extra && extra.ip) ? String(extra.ip) : '',
    location: (extra && extra.location) ? String(extra.location) : '',
    device: (extra && extra.device) ? String(extra.device) : ''
  };

  Logger.log(`[${logItem.time}] [${logItem.type}] [${displayName}] ${logItem.input} -> ${logItem.output}`);

  // 1. 本地多槽位高速暫存 (Multi-Slot 高速快取，突破 9KB 限制，可容納 180+ 筆)
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
      device: logItem.device
    };
    appendToLocalCachedLogs(cacheItem, props);
  } catch (e) {
    console.error("儲存實時日誌快取失敗:", e);
  }

  // 2. GitHub Gist 永久無損雲端存檔 (透過 PAT，無須額外授權，永不消失)
  try {
    const pat = props.getProperty('GITHUB_PAT');
    if (pat) {
      syncLogToSystemGist(logItem, pat, props);
    }
  } catch (gistErr) {
    console.warn("寫入 Gist 日誌庫失敗:", gistErr);
  }

  // 3. Google 試算表存檔 (備援存檔)
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
        logItem.location
      ]);
    }
  } catch (sheetErr) {
    console.warn("寫入 Google Sheet 日誌失敗:", sheetErr);
  }
}

// ========================================================
// 📊 Multi-Slot 本地快取與 Gist 系統日誌持久化模組
// ========================================================

const LOG_SLOT_COUNT = 6;
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

  // 2. Multi-Slot 分槽讀取 (突破 GAS 9KB 限制)
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

  const trimmed = deduplicateLogs(currentLogs).slice(0, 180); // 本地保留最多 180 筆
  const chunkSize = 30; // 每個 Slot 約 30 筆 (約 5KB~7KB)

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

function getOrCreateSystemLogsGist(pat, props) {
  if (!pat) return '';
  if (!props) props = PropertiesService.getScriptProperties();
  const gistKey = 'SYSTEM_LOGS_GIST_ID';
  let gistId = props.getProperty(gistKey);
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
        description: '📊 Daily Diet System Audit Logs (永久無損雲端日誌庫)',
        public: false,
        files: {
          'daily-diet-system-logs.json': {
            content: JSON.stringify({
              createdAt: new Date().toISOString(),
              retentionPolicy: 'Permanent (GitHub Gist)',
              logs: []
            }, null, 2)
          }
        }
      }),
      muteHttpExceptions: true
    });

    if (createRes.getResponseCode() === 201) {
      const data = JSON.parse(createRes.getContentText());
      gistId = data.id;
      props.setProperty(gistKey, gistId);
      console.log(`✅ [Gist 日誌庫] 成功建立專屬系統審計 Gist: ${gistId}`);
      return gistId;
    }
  } catch (e) {
    console.error("建立系統日誌 Gist 失敗:", e);
  }
  return '';
}

function syncLogToSystemGist(logItem, pat, props) {
  if (!pat) return;
  if (!props) props = PropertiesService.getScriptProperties();
  const gistId = getOrCreateSystemLogsGist(pat, props);
  if (!gistId) return;

  try {
    const gistUrl = `https://api.github.com/gists/${gistId}`;
    const getRes = UrlFetchApp.fetch(gistUrl, {
      headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
      muteHttpExceptions: true
    });

    if (getRes.getResponseCode() === 200) {
      const fileContent = JSON.parse(getRes.getContentText()).files?.['daily-diet-system-logs.json']?.content;
      let logData = { logs: [] };
      if (fileContent) {
        try { logData = JSON.parse(fileContent); } catch (e) {}
      }
      if (!Array.isArray(logData.logs)) logData.logs = [];

      const exists = logData.logs.some(l => 
        l.time === logItem.time && 
        l.userId === logItem.userId && 
        l.type === logItem.type && 
        (l.input || '').slice(0, 30) === (logItem.input || '').slice(0, 30)
      );
      if (!exists) {
        logData.logs.unshift(logItem);
      }

      // 保留多達 3,000 筆紀錄（約 1.5MB，Gist 上限為 100MB）
      if (logData.logs.length > 3000) {
        logData.logs = logData.logs.slice(0, 3000);
      }

      UrlFetchApp.fetch(gistUrl, {
        method: 'patch',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          files: {
            'daily-diet-system-logs.json': {
              content: JSON.stringify(logData)
            }
          }
        }),
        muteHttpExceptions: true
      });
    }
  } catch (e) {
    console.warn("同步日誌至 System Gist 失敗:", e);
  }
}

function getOrCreateLogSheet(props) {
  if (!props) props = PropertiesService.getScriptProperties();
  let sheetId = props.getProperty('LOG_SHEET_ID');
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
    sheet.appendRow(["時間", "用戶名稱", "用戶識別碼", "操作類型", "用戶傳送內容", "AI辨識結果", "回傳內容 / 處理狀態", "IP", "地理位置"]);

    const headerRange = sheet.getRange(1, 1, 1, 9);
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

    return ss;
  } catch (err) {
    console.warn("自動建立 Google Sheet 日誌失敗 (可能是權限未授權):", err);
    return null;
  }
}

/**
 * 取得完整運作日誌：結合 Gist 永久無損存檔、Google 試算表與 Multi-Slot 本地秒級快取
 * @param {number} limit 最大回傳筆數 (預設 1000)
 * @param {number} days 回溯天數 (預設 30 天)
 */
function getRecentLogsData(limit, days) {
  const targetLimit = limit ? Number(limit) : 1000;
  const targetDays = (typeof days !== 'undefined' && days !== null) ? Number(days) : 30; // 預設 30 天
  const props = PropertiesService.getScriptProperties();
  const pat = props.getProperty('GITHUB_PAT');
  let allLogs = [];

  // 1. 優先從 GitHub Gist 讀取（全量永久保存，無損無大小上限）
  if (pat) {
    const gistId = getOrCreateSystemLogsGist(pat, props);
    if (gistId) {
      try {
        const gistUrl = `https://api.github.com/gists/${gistId}`;
        const getRes = UrlFetchApp.fetch(gistUrl, {
          headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
          muteHttpExceptions: true
        });
        if (getRes.getResponseCode() === 200) {
          const fileContent = JSON.parse(getRes.getContentText()).files?.['daily-diet-system-logs.json']?.content;
          if (fileContent) {
            const data = JSON.parse(fileContent);
            if (data.logs && Array.isArray(data.logs)) {
              allLogs = data.logs;
            }
          }
        }
      } catch (e) {
        console.warn("從 System Gist 載入日誌失敗:", e);
      }
    }
  }

  // 2. 備援：若有 Google Sheet 紀錄，雙向合併
  try {
    const ss = getOrCreateLogSheet(props);
    if (ss) {
      const sheet = ss.getSheets()[0];
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const maxFetch = Math.min(lastRow - 1, 1000);
        const startRow = lastRow - maxFetch + 1;
        const rawValues = sheet.getRange(startRow, 1, maxFetch, 9).getValues();
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
            location: String(row[8] || '')
          });
        }
        allLogs = deduplicateLogs(allLogs.concat(sheetLogs));
      }
    }
  } catch (sheetErr) {}

  // 3. 雙向合併 Multi-Slot 快取 (確保最新幾秒尚未 flush 至 Gist 的秒級紀錄即時呈現)
  const localLogs = getLocalCachedLogs(props);
  if (localLogs.length > 0) {
    allLogs = deduplicateLogs(localLogs.concat(allLogs));
  }

  // 4. 自動回填今日用戶飲食紀錄至系統審計流 (確保 10:10 ~ 18:50 所有餐點與補水紀錄 100% 完整重現於後台日誌)
  try {
    const todayStr = getTodayDateString();
    const knownGists = [
      { userId: 'Winnie Lin', gistId: props.getProperty('USER_GIST_U1f5434ad962dfd74e5223a8dfc497c66') || '9a48b4604260e1a58a6d976f38c544b5', isLine: true },
      { userId: '用戶 (Web)', gistId: props.getProperty('USER_GIST_default_user') || '9141ec7d6457090e66188c67c1351eed', isLine: false }
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
                    location: g.isLine ? 'LINE 智慧助理' : 'Web 飲食管家'
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

  // 5. 將所有已合併與回填之日誌全量回寫至 Gist 永久保存
  if (pat && allLogs.length > 0) {
    try {
      const gistId = props.getProperty('SYSTEM_LOGS_GIST_ID');
      if (gistId) {
        UrlFetchApp.fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'patch',
          headers: {
            'Authorization': `Bearer ${pat}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({
            files: {
              'daily-diet-system-logs.json': {
                content: JSON.stringify({
                  updatedAt: new Date().toISOString(),
                  logs: allLogs.slice(0, 3000)
                })
              }
            }
          }),
          muteHttpExceptions: true
        });
      }
    } catch (e) {}
  }

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
    const p = props || PropertiesService.getScriptProperties();
    const today = getTodayDateString();
    const key = 'AI_QUOTA_' + today;
    const raw = p.getProperty(key);
    let stats = raw ? JSON.parse(raw) : { count: 0, success: 0, fail: 0, models: {}, recentErrors: [] };
    if (!stats.models) stats.models = {};

    const m = String(model || 'gemini-2.5-flash-lite');
    if (!stats.models[m]) stats.models[m] = { count: 0, success: 0, fail: 0 };
    stats.lastSuccessfulModel = m;
    stats.currentModel = m;

    stats.lastUpdated = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
    p.setProperty(key, JSON.stringify(stats));
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
        callerName = p.getProperty(`USER_NAME_${callerInfo}`) || `用戶 (${callerInfo.slice(-4)})`;
      } else if (typeof callerInfo === 'object') {
        callerId = callerInfo.userId || '';
        callerName = callerInfo.userName || (callerId ? p.getProperty(`USER_NAME_${callerId}`) : '') || callerInfo.caller || 'LINE 用戶';
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
    recordAiUsageAttempt(model, isSuccess, props);
    if (!isSuccess && errorMsg) {
      recordAiUsageConsolidatedFailure([model], props, errorMsg, callerInfo);
    } else if (isSuccess) {
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
    const successRate = used > 0 ? Math.round((successCount / used) * 100) : 100;

    return {
      today: today,
      currentRpm: currentRpm,
      rpmLimit: rpmLimit,
      rpmPercent: rpmPercent,
      limit: limit,
      used: used,
      successCount: successCount,
      failCount: failCount,
      remaining: remaining,
      successRate: successRate,
      models: stats.models || {},
      recentErrors: stats.recentErrors || [],
      lastUpdated: stats.lastUpdated || Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss"),
      currentModel: stats.currentModel || (PRIMARY_GEMINI_MODELS && PRIMARY_GEMINI_MODELS[0]) || 'gemini-2.5-flash-lite',
      lastSuccessfulModel: stats.lastSuccessfulModel || stats.currentModel || (PRIMARY_GEMINI_MODELS && PRIMARY_GEMINI_MODELS[0]) || 'gemini-2.5-flash-lite'
    };
  } catch (e) {
    return {
      today: getTodayDateString(),
      currentRpm: 0,
      rpmLimit: 15,
      rpmPercent: 0,
      limit: 1500,
      used: 0,
      successCount: 0,
      failCount: 0,
      remaining: 1500,
      successRate: 100,
      models: {},
      recentErrors: [],
      lastUpdated: Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss"),
      currentModel: 'gemini-2.5-flash-lite',
      lastSuccessfulModel: 'gemini-2.5-flash-lite'
    };
  }
}
