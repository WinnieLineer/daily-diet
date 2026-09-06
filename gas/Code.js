// ========================================================
// 🐼 Daily Diet LINE Bot - Google Apps Script (多用戶自動 Gist 綁定與同步版)
// ========================================================

const PRIMARY_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_CALORIE_GOAL = 2000; // 每日預設熱量目標 (kcal)
const DEFAULT_PROTEIN_GOAL = 100;  // 每日預設蛋白質目標 (g)
const DEFAULT_WATER_GOAL = 2000;    // 每日預設水分目標 (ml)

// ========================================================
// 🤖 Gemini AI 用量統計與額度監控 (Free Tier: 1500 RPD / 15 RPM)
// ========================================================

function recordAiUsage(model, isSuccess, props) {
  try {
    const p = props || PropertiesService.getScriptProperties();
    const cache = CacheService.getScriptCache();
    const now = Date.now();
    const cutoff = now - 60000;

    // ⚡ 1. 記錄 60 秒 RPM 滾動窗口
    const windowKey = 'RPM_TIMESTAMPS_WINDOW';
    let rawWindow = cache.get(windowKey);
    let timestamps = rawWindow ? JSON.parse(rawWindow) : [];
    timestamps = timestamps.filter(function(t) { return t > cutoff; });
    timestamps.push(now);
    cache.put(windowKey, JSON.stringify(timestamps), 120);

    // 2. 每日累計記錄
    const today = getTodayDateString();
    const key = 'AI_QUOTA_' + today;
    const raw = p.getProperty(key);
    let stats = raw ? JSON.parse(raw) : { count: 0, success: 0, fail: 0, models: {} };
    stats.count = (stats.count || 0) + 1;
    if (isSuccess) stats.success = (stats.success || 0) + 1;
    else stats.fail = (stats.fail || 0) + 1;
    const m = model || PRIMARY_GEMINI_MODEL;
    stats.models = stats.models || {};
    stats.models[m] = (stats.models[m] || 0) + 1;
    p.setProperty(key, JSON.stringify(stats));
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

    // ⚡ 計算目前 60 秒內的真實 RPM
    const windowKey = 'RPM_TIMESTAMPS_WINDOW';
    let rawWindow = cache.get(windowKey);
    let timestamps = rawWindow ? JSON.parse(rawWindow) : [];
    timestamps = timestamps.filter(function(t) { return t > cutoff; });

    // 輔助容錯：若 Cache 剛啟動，從近 30 筆日誌計算 60 秒內請求
    if (timestamps.length === 0) {
      const logs = getRecentLogsData(30);
      logs.forEach(function(l) {
        if (l.time) {
          const logT = new Date(l.time.replace(' ', 'T') + '+08:00').getTime();
          if (now - logT <= 60000 && (l.type && (l.type.indexOf('照片') >= 0 || l.type.indexOf('文字') >= 0 || l.aiResult))) {
            timestamps.push(logT);
          }
        }
      });
    }

    const currentRpm = timestamps.length;
    const rpmLimit = 15; // Gemini Flash 15 RPM
    const rpmPercent = Math.min(100, Math.round((currentRpm / rpmLimit) * 100));

    // 每日統計
    const today = getTodayDateString();
    const key = 'AI_QUOTA_' + today;
    const raw = p.getProperty(key);
    let stats = raw ? JSON.parse(raw) : { count: 0, success: 0, fail: 0, models: {} };

    if (!stats.count) {
      const logs = getRecentLogsData(300);
      let aiCount = 0;
      logs.forEach(function(l) {
        if (l.time && l.time.indexOf(today) === 0) {
          if (l.type && (l.type.indexOf('照片') >= 0 || l.type.indexOf('文字') >= 0 || l.aiResult)) {
            aiCount++;
          }
        }
      });
      if (aiCount > 0) {
        stats.count = aiCount;
        stats.success = aiCount;
      }
    }

    const used = stats.count || 0;
    const limit = 1500;
    const remaining = Math.max(0, limit - used);
    const successRate = used > 0 ? Math.round(((stats.success || used) / used) * 100) : 100;

    return {
      today: today,
      currentRpm: currentRpm,
      rpmLimit: rpmLimit,
      rpmPercent: rpmPercent,
      limit: limit,
      used: used,
      remaining: remaining,
      successRate: successRate,
      currentModel: PRIMARY_GEMINI_MODEL
    };
  } catch (e) {
    return {
      today: getTodayDateString(),
      currentRpm: 0,
      rpmLimit: 15,
      rpmPercent: 0,
      limit: 1500,
      used: 0,
      remaining: 1500,
      successRate: 100,
      currentModel: PRIMARY_GEMINI_MODEL
    };
  }
}


function doGet(e) {
  const action = e?.parameter?.action;
  let userId = e?.parameter?.userId;
  const incomingGist = e?.parameter?.gistId;

  const props = PropertiesService.getScriptProperties();
  const pat = props.getProperty('GITHUB_PAT');

  // 🔗 若 userId 為空或為 default_user，但有帶 Gist ID，透過 Gist ID 反查 LINE 用戶綁定
  if ((!userId || userId === 'default_user' || userId === 'undefined') && incomingGist) {
    const allProps = props.getProperties();
    for (const k in allProps) {
      if (k.startsWith('USER_GIST_') && allProps[k] === incomingGist) {
        userId = k.replace('USER_GIST_', '');
        console.log(`🔗 [Gist 反查綁定] Gist ${incomingGist} 成功對應至 LINE 用戶 ${userId}`);
        break;
      }
    }
  }
  if (!userId) userId = 'default_user';

  // 🚀 0. 觸發一鍵部署原生相機圖文選單 (LINE Messaging API 官方相機直開)
  if (action === 'deployRichMenu') {
    const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN');
    const liffId = props.getProperty('LINE_LIFF_ID') || props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';
    try {
      const richMenuId = setupNativeCameraRichMenu(token, liffId, props);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', richMenuId, message: '原生相機圖文選單已成功部署並設為全域預設！' }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 1. 查詢/綁定個人 Gist ID
  if (action === 'getGistId' && userId) {
    if (incomingGist) props.setProperty(`USER_GIST_${userId}`, incomingGist);
    const gistId = getOrCreateUserGist(userId, pat, props);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', userId, gistId }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. 查詢個人今日飲食紀錄、目標與 Gist (支援 Web App 開啟時即時雙向同步)
  if (action === 'getLogs' && userId) {
    if (incomingGist) {
      props.setProperty(`USER_GIST_${userId}`, incomingGist);
      console.log(`☁️ [Web 端連動] 已自動將用戶 ${userId} 綁定 Gist ID: ${incomingGist}`);
    }
    const incomingCal = Number(e?.parameter?.cal);
    const incomingPro = Number(e?.parameter?.pro);
    const incomingWat = Number(e?.parameter?.wat);
    if (incomingCal) props.setProperty(`CALORIE_GOAL_${userId}`, String(incomingCal));
    if (incomingPro) props.setProperty(`PROTEIN_GOAL_${userId}`, String(incomingPro));
    if (incomingWat) props.setProperty(`WATER_GOAL_${userId}`, String(incomingWat));

    const todayStr = getTodayDateString();
    const todayLogs = getTodayLogs(userId, todayStr, props, incomingGist);
    const gistId = getOrCreateUserGist(userId, pat, props);
    const goals = getUserGoals(userId, props, incomingGist);
    const persona = getUserPersona(userId, props, incomingGist, pat);

    const userLanguage = getUserLanguage(userId, props, incomingGist, pat);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      userId,
      gistId,
      todayLogs,
      goals,
      persona,
      language: userLanguage,
      favorites: getUserFavorites(userId, props, incomingGist)
    })).setMimeType(ContentService.MimeType.JSON);
  }


  // 3. Web App 觸發記錄/新增餐點 (即時雙向同步至 LINE 今日快取與 Gist 雲端)
  if ((action === 'saveMeal' || action === 'addMeal') && userId) {
    const dishName = e?.parameter?.dishName || e?.parameter?.name || '美味餐點';
    const calories = Number(e?.parameter?.calories || e?.parameter?.cal || 0);
    const protein = Number(e?.parameter?.protein || e?.parameter?.pro || 0);
    const water = Number(e?.parameter?.water || e?.parameter?.wat || 0);
    const carbs = Number(e?.parameter?.carbs || 0);
    const fat = Number(e?.parameter?.fat || 0);
    const category = e?.parameter?.category || '';
    const comment = e?.parameter?.comment || '';
    const date = e?.parameter?.date || getTodayDateString();
    const time = e?.parameter?.time || new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' });
    const id = Number(e?.parameter?.id || Date.now());

    const meal = { id, date, time, dish_name: dishName, calories, protein, carbs, fat, water, category, comment, source: 'WEB_APP' };
    const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
    saveMealLog(userId, meal, userGistId, pat, props);
    recordSystemLog('Web同步餐點', userId, dishName, `${calories}卡 / ${protein}g蛋 / ${water}ml水`, '已即時寫入 LINE 與 Gist');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', meal }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 4. Web App 觸發刪除指定餐點
  if (action === 'deleteMeal' && userId) {
    const dishName = e?.parameter?.dishName;
    const targetId = e?.parameter?.id;
    const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
    deleteMealLog(userId, targetId || dishName, userGistId, pat, props);
    recordSystemLog('Web刪除餐點', userId, dishName || targetId, '', '已自雲端刪除');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 5. Web App 觸發清空今日紀錄
  if (action === 'clearToday' && userId) {
    const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
    clearTodayLogs(userId, userGistId, pat, props);
    recordSystemLog('Web清空今日', userId, '清空今日餐點', '', '已清空今日');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 6. Web App 觸發新增常用餐點
  if (action === 'addFavorite' && userId) {
    const dishName = e?.parameter?.dishName || e?.parameter?.name || '常用餐點';
    const calories = Number(e?.parameter?.calories) || Number(e?.parameter?.cal) || 0;
    const protein = Number(e?.parameter?.protein) || Number(e?.parameter?.pro) || 0;
    const water = Number(e?.parameter?.water) || Number(e?.parameter?.wat) || 0;
    const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
    const favItem = { id: Date.now(), dish_name: dishName, calories, protein, water };
    saveUserFavorite(userId, favItem, userGistId, pat, props);
    recordSystemLog('Web加常用', userId, dishName, `${calories}卡 / ${protein}g蛋`, '已同步常用庫');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 7. Web App 觸發刪除常用餐點
  if (action === 'deleteFavorite' && userId) {
    const favId = e?.parameter?.id || e?.parameter?.favId || e?.parameter?.dishName || e?.parameter?.name;
    const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
    deleteUserFavorite(userId, favId, userGistId, pat, props);
    recordSystemLog('Web刪除常用', userId, favId, '', '已自常用庫移除');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 8. Web App 觸發更新個人飲食目標
  if (action === 'updateGoals' && userId) {
    const calories = Number(e?.parameter?.calories);
    const protein = Number(e?.parameter?.protein);
    const water = Number(e?.parameter?.water);
    if (calories) props.setProperty(`CALORIE_GOAL_${userId}`, String(calories));
    if (protein) props.setProperty(`PROTEIN_GOAL_${userId}`, String(protein));
    if (water) props.setProperty(`WATER_GOAL_${userId}`, String(water));
    const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
    if (pat && userGistId) {
      syncGoalsToUserGist({ calories, protein, water }, userGistId, pat);
    }
    recordSystemLog('Web更新目標', userId, `${calories}卡 / ${protein}g蛋 / ${water}ml水`, '', '已同步更新');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 9. Web App 觸發更新教練性格
  if (action === 'updatePersona' && userId) {
    const persona = e?.parameter?.persona || 'tsundere';
    const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
    setUserPersona(userId, persona, userGistId, pat, props);
    recordSystemLog('Web更新性格', userId, persona, '', '已同步更新教練性格');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', persona }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 10. Web App 觸發更新語言偏好 (支援中英雙語)
  if (action === 'updateLanguage' && userId) {
    const lang = e?.parameter?.lang || 'zh';
    const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
    const updated = setUserLanguage(userId, lang, userGistId, pat, props);
    recordSystemLog('Web更新語言', userId, updated, '', '已同步更新用戶語言為 ' + updated);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', language: updated }))
      .setMimeType(ContentService.MimeType.JSON);
  }


  // 6. 實時運作日誌 API (提供 JSON)
  if (action === 'getRecentLogs') {
    const logs = getRecentLogsData(Number(e?.parameter?.limit) || 300);
    const sheetId = props.getProperty('LOG_SHEET_ID');
    const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : '';
    const aiQuota = getAiQuotaStats(props);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', logs, sheetUrl, aiQuota }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 6. 實時運作日誌儀表板 (直接在瀏覽器查看所有用戶傳入的訊息與 AI 回應)
  if (action === 'logs' || action === 'viewLogs' || action === 'log') {
    const initialLogs = getRecentLogsData(300);
    const sheetId = props.getProperty('LOG_SHEET_ID');
    const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : '';
    const aiQuota = getAiQuotaStats(props);
    return HtmlService.createHtmlOutput(generateDashboardHtml(initialLogs, sheetUrl, aiQuota))
      .setTitle("🐼 Daily Diet 實時對話與運作日誌")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return ContentService.createTextOutput("Daily Diet LINE Bot is running! 🐼");
}

function getRecentLogsData(fetchLimit) {
  const props = PropertiesService.getScriptProperties();
  const limit = fetchLimit || 300;

  // 優先從永久 Google Sheet 讀取最新紀錄
  const sheetId = props.getProperty('LOG_SHEET_ID');
  if (sheetId) {
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheets()[0];
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const startRow = Math.max(2, lastRow - limit + 1);
        const numRows = lastRow - startRow + 1;
        const values = sheet.getRange(startRow, 1, numRows, 7).getValues();
        const logs = [];
        for (let i = values.length - 1; i >= 0; i--) {
          const row = values[i];
          logs.push({
            time: row[0] instanceof Date ? Utilities.formatDate(row[0], "Asia/Taipei", "yyyy-MM-dd HH:mm:ss") : String(row[0] || ''),
            userId: String(row[1] || '用戶'),
            rawUserId: String(row[2] || '').slice(-6),
            type: String(row[3] || '一般'),
            input: String(row[4] || ''),
            aiResult: String(row[5] || ''),
            output: String(row[6] || '')
          });
        }
        return logs;
      }
    } catch (e) {
      console.warn("從 Sheet 讀取日誌失敗，降級至快取:", e);
    }
  }

  const raw = props.getProperty('SYSTEM_RECENT_LOGS');
  return raw ? JSON.parse(raw) : [];
}

function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!rawBody || !signature || !channelSecret) return false;
  try {
    const byteSignature = Utilities.computeHmacSha256Signature(rawBody, channelSecret);
    const calculatedSignature = Utilities.base64Encode(byteSignature);
    return calculatedSignature === signature;
  } catch (err) {
    console.error("🚨 [簽章校驗例外]:", err);
    return false;
  }
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const props = PropertiesService.getScriptProperties();

  let currentReplyToken = null;
  let currentToken = null;

  try {
    let data = {};
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      data = {};
    }

    const action = e.parameter?.action || data?.action;
    const GEMINI_API_KEY = props.getProperty('GEMINI_API_KEY');

    // 🌟 1. Web App 專屬安全通道：Gemini AI 辨識 API (含防盜刷、時戳驗證與頻率防護)
    if (action === 'analyzeMeal' || action === 'analyzeFoodImage' || action === 'analyzeText' || action === 'analyzeFoodText' || action === 'completeText' || action === 'getPandaAdvice') {
      const sec = verifyWebAIRequest(data, e);
      if (!sec.valid) {
        console.warn(`🚨 [Web AI 安全攔截] ${sec.reason}`);
        recordSystemLog('安全攔截', 'web_client', 'Web AI 盜刷防護', sec.reason, '已拒絕處理');
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: `Forbidden: ${sec.reason}` }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      if (action === 'analyzeMeal' || action === 'analyzeFoodImage') {
        const base64 = data?.image || data?.base64Image || e.parameter?.image;
        const result = analyzeMealWithGeminiFull(base64, GEMINI_API_KEY, data?.context, data?.language);
        return ContentService.createTextOutput(JSON.stringify({ status: 'ok', data: result }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'analyzeText' || action === 'analyzeFoodText') {
        const text = data?.text || data?.textInstruction || e.parameter?.text;
        const result = parseTextWithGeminiFull(text, GEMINI_API_KEY, data?.context, data?.language);
        return ContentService.createTextOutput(JSON.stringify({ status: 'ok', data: result }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'completeText' || action === 'getPandaAdvice') {
        const prompt = data?.prompt || e.parameter?.prompt;
        const result = generateGeminiText(prompt, GEMINI_API_KEY);
        return ContentService.createTextOutput(JSON.stringify({ status: 'ok', text: result }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 🛡️ LINE Webhook 事件安全驗證
    const CHANNEL_SECRET = props.getProperty('LINE_CHANNEL_SECRET');
    if (CHANNEL_SECRET) {
      const incomingSecret = e.parameter?.secret || e.parameter?.token;
      if (incomingSecret && incomingSecret !== CHANNEL_SECRET) {
        console.warn("🚨 [安全攔截] 收到未經授權的 Webhook 請求！URL Secret 不符。");
        recordSystemLog('安全攔截', 'unknown', '偽造Webhook請求', 'HTTP 403', '已拒絕處理');
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Forbidden: Invalid secret' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    const events = data.events || [];

    if (events.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const CHANNEL_ACCESS_TOKEN = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
    const GITHUB_PAT = props.getProperty('GITHUB_PAT');
    const LIFF_ID = props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';
    currentToken = CHANNEL_ACCESS_TOKEN;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const replyToken = event.replyToken;
      currentReplyToken = replyToken;
      const userId = event.source?.userId || 'default_user';

      console.log(`\n========================================`);
      console.log(`📩 [LINE 事件收到] 用戶 ID: ${userId} | 類型: ${event.type}`);

      // 🌟 強制為用戶綁定最新圖文選單 (直接推送到該用戶手機，突破 LINE App 本地快取與個人優先權限制)
      const currentRichMenuId = props.getProperty('CURRENT_RICH_MENU_ID');
      if (currentRichMenuId && userId && userId !== 'default_user') {
        try {
          UrlFetchApp.fetch('https://api.line.me/v2/bot/user/' + userId + '/richmenu/' + currentRichMenuId, {
            method: 'post',
            headers: { 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN },
            muteHttpExceptions: true
          });
        } catch (rmErr) {}
      }

      if (!CHANNEL_ACCESS_TOKEN) throw new Error("LINE_CHANNEL_ACCESS_TOKEN 尚未設定！");
      if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY 尚未設定！");

      // 🔍 自動取得或為該用戶建立專屬 Gist ID
      let userGistId = '';
      if (GITHUB_PAT) {
        try {
          userGistId = getOrCreateUserGist(userId, GITHUB_PAT, props);
          console.log(`☁️ [Gist 綁定] 用戶 Gist ID: ${userGistId || '未建立'}`);
        } catch (gistErr) {
          console.error("取得使用者 Gist 失敗:", gistErr);
        }
      } else {
        console.warn("⚠️ [提示] GITHUB_PAT 尚未在指令碼屬性中設定，Gist 雲端同步暫時關閉。");
      }

      // 🌟 Case 0: 首次加入好友 (Follow 事件)
      if (event.type === 'follow') {
        recordSystemLog('新用戶加入', userId, '加入好友', '', '發送精美圖文歡迎卡片與免責聲明');
        const welcomeFlex = generateWelcomeFlex(userId, LIFF_ID, userGistId);
        replyFlexMessage(replyToken, welcomeFlex, CHANNEL_ACCESS_TOKEN, userId, props);
        continue;
      }

      // 🔘 Case 1: 用戶點擊按鈕 (Postback 事件)
      if (event.type === 'postback') {
        let payload = {};
        try {
          payload = JSON.parse(event.postback.data);
        } catch (e) {
          payload = {};
        }

        console.log(`🔘 [按鈕點擊] 動作: ${payload.action} | 內容:`, JSON.stringify(payload));

        // 🐣 / 🌐 新舊用戶分流引導
        if (payload.action === 'onboarding') {
          if (payload.type === 'new') {
            recordSystemLog('新手引導', userId, '點擊全新用戶', '', '發送新手30秒引導卡片');
            const newGuideFlex = generateNewUserGuideFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, newGuideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          } else if (payload.type === 'web_user') {
            recordSystemLog('老用戶連動', userId, '點擊Web舊用戶', '', '發送Web綁定引導卡片');
            const webGuideFlex = generateWebUserGuideFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, webGuideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }
        }

        // 🎯 體態目標推薦導引
        if (payload.action === 'goalGuide') {
          recordSystemLog('目標推薦導引', userId, '點擊目標推薦', '', '發送 AI 體態目標推薦導引卡片');
          const guideFlex = generateGoalGuideFlex(userId, LIFF_ID, userGistId);
          replyFlexMessage(replyToken, guideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 📖 查看完整操作指令手冊
        if (payload.action === 'showHelp' || payload.action === 'help') {
          recordSystemLog('指令手冊', userId, '點擊查看指令手冊', '', '發送操作指令手冊卡片');
          const helpFlex = generateCommandMenuFlex(userId, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, helpFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🌐 語言設定 Postback
        if (payload.action === 'setLanguage') {
          const chosen = setUserLanguage(userId, payload.lang, userGistId, GITHUB_PAT, props);
          if (chosen === 'en') {
            replyTextMessage(replyToken, "🌐 Language switched to English! 🐼✨\nFrom now on, Panda Coach will analyze your meals, estimate nutrients, and respond in English!\n\n(Type \"中文\" anytime to switch back)", CHANNEL_ACCESS_TOKEN, userId, props);
          } else {
            replyTextMessage(replyToken, "🌐 語言已成功切換為繁體中文！ 🐼✨\n熊貓教練會以繁體中文為您分析餐點與計算營養囉！\n\n（輸入「English」可隨時切換為英文）", CHANNEL_ACCESS_TOKEN, userId, props);
          }
          continue;
        }

        if (payload.action === 'chooseLanguage') {
          const curLang = getUserLanguage(userId, props, userGistId, GITHUB_PAT);
          const langFlex = generateLanguageSelectionFlex(userId, LIFF_ID, userGistId, curLang);
          replyFlexMessage(replyToken, langFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🎭 點擊按鈕【挑選教練性格】
        if (payload.action === 'choosePersona') {
          recordSystemLog('切換性格', userId, '點擊切換教練性格', '', '發送教練性格選擇卡片');
          const personaFlex = generatePersonaSelectionFlex(userId, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, personaFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🎭 按下【切換教練性格】
        if (payload.action === 'setPersona') {
          const newPersona = payload.persona || 'tsundere';
          setUserPersona(userId, newPersona, userGistId, GITHUB_PAT, props);
          const personaNames = { tsundere: '傲嬌毒舌教練 🐼😡', gentle: '治癒天使 🐼🥰', hardcore: '魔鬼士官長 🐼🔥' };
          recordSystemLog('切換性格', userId, newPersona, '', `已切換為 ${personaNames[newPersona] || newPersona}`);
          replyTextMessage(replyToken, `🎭 已成功將熊貓教練性格切換為【${personaNames[newPersona] || '傲嬌毒舌'}】！\n\n現在傳送餐點照片或輸入食物，教練就會以全新性格為您專業分析與吐槽囉 🐼✨`, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // ✅ 按下【儲存紀錄】
        // 💾 按下【儲存 / 查看今日總結】
        if (payload.action === 'save') {

          console.log(`💾 [查看今日總結] 用戶: ${userId}`);
          recordSystemLog('查看總結', userId, payload.name || '今日總結', '', '已發送總結卡片');
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
          continue;
        }

        // 📅 按下【選擇歷史日期】(LINE 原生 datetimepicker 滾輪選擇)
        if (payload.action === 'pickDate' || (event.postback.params && event.postback.params.date)) {
          const targetDate = (event.postback.params && event.postback.params.date) || payload.date;
          if (targetDate) {
            console.log(`📅 [選擇歷史日期] ${targetDate} 用戶: ${userId}`);
            recordSystemLog('選擇日期', userId, targetDate, '', `已發送 ${targetDate} 歷史總結`);
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, targetDate);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }
        }

        // 📋 按下【管理紀錄】(支援當日與歷史日期)
        if (payload.action === 'manageMeals' || payload.action === 'manage') {
          const targetDate = payload.date || null;
          console.log(`📋 [管理紀錄] 日期: ${targetDate || '今日'} 用戶: ${userId}`);
          recordSystemLog('管理清單', userId, targetDate ? `管理 ${targetDate}` : '點擊管理紀錄', '', '已發送管理面板');
          const mgmtFlex = generateMealManagementFlex(userId, LIFF_ID, userGistId, props, targetDate);
          replyFlexMessage(replyToken, mgmtFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 📈 按下【查看 7 日趨勢週報】
        if (payload.action === 'viewWeeklyTrends' || payload.action === 'weeklyTrends') {
          console.log(`📈 [查看週報] 用戶: ${userId}`);
          recordSystemLog('週報趨勢', userId, '點擊7日週報', '', '已發送7日趨勢週報');
          const weeklyFlex = generateWeeklyTrendsFlex(userId, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, weeklyFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 💧 按下【快速補水】
        if (payload.action === 'quickWater') {
          const amount = Number(payload.amount) || 500;
          const meal = {
            id: Date.now(),
            date: getTodayDateString(),
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
            dish_name: `💧 喝水 ${amount}ml`,
            calories: 0,
            protein: 0,
            water: amount,
            comment: '💧 快速補水打卡'
          };
          console.log(`💧 [快速補水] +${amount}ml 用戶: ${userId}`);
          recordSystemLog('快速喝水', userId, `喝水 ${amount}ml`, `+${amount}ml`, '已即時記錄至資料庫');
          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
          const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // ⭐ 按下【加入常用】
        if (payload.action === 'saveFavorite') {
          const favItem = {
            id: Date.now(),
            dish_name: payload.name || '常用餐點',
            calories: Number(payload.cal) || 0,
            protein: Number(payload.pro) || 0,
            water: Number(payload.wat) || 0
          };
          console.log(`⭐ [加入常用] ${favItem.dish_name} | ${favItem.calories} kcal`);
          recordSystemLog('加入常用', userId, favItem.dish_name, `${favItem.calories}卡 / ${favItem.protein}g蛋`, '已收藏至常用庫');
          saveUserFavorite(userId, favItem, userGistId, GITHUB_PAT, props);
          const favAddedFlex = generateFavoriteAddedFlex(favItem, LIFF_ID, userGistId);
          replyFlexMessage(replyToken, favAddedFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // ⚡ 按下【一鍵記錄常用餐點】
        if (payload.action === 'quickLogFavorite') {
          const meal = {
            id: Date.now(),
            date: getTodayDateString(),
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
            dish_name: payload.name ? decodeURIComponent(payload.name) : '常用餐點',
            calories: Number(payload.cal) || 0,
            protein: Number(payload.pro) || 0,
            water: Number(payload.wat) || 0,
            comment: '⭐ 常用快捷記錄'
          };
          console.log(`⚡ [一鍵記錄常用] ${meal.dish_name} | ${meal.calories} kcal`);
          recordSystemLog('快捷記錄', userId, meal.dish_name, `${meal.calories}卡 / ${meal.protein}g蛋 / ${meal.water}ml水`, '已快捷記錄並回傳總結');
          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
          const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 按下【刪除單筆餐點】(支援當日與歷史日期)
        if (payload.action === 'deleteMeal') {
          const targetDate = payload.date || null;
          console.log(`🗑️ [刪除單筆餐點] 日期: ${targetDate || '今日'} 標識: ${payload.id || payload.index}`);
          recordSystemLog('刪除餐點', userId, `餐點標識: ${payload.id || payload.index} (${targetDate || '今日'})`, '', '已刪除單筆紀錄');
          deleteMealLog(userId, payload.id || payload.index, userGistId, GITHUB_PAT, props, targetDate);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, targetDate);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 按下【移除常用餐點】
        if (payload.action === 'deleteFavorite') {
          console.log(`🗑️ [移除常用] 標識: ${payload.favId || payload.name}`);
          recordSystemLog('移除常用', userId, `標識: ${payload.favId || payload.name}`, '', '已自常用庫移除');
          deleteUserFavorite(userId, payload.favId || payload.name, userGistId, GITHUB_PAT, props);
          const favListFlex = generateFavoritesCarouselFlex(userId, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, favListFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 按下【清空今日確認】
        if (payload.action === 'clearTodayConfirm') {
          const confirmFlex = generateClearConfirmFlex(LIFF_ID, userGistId);
          replyFlexMessage(replyToken, confirmFlex, CHANNEL_ACCESS_TOKEN);
          continue;
        }

        // 🗑️ 按下【確定清空今日】
        if (payload.action === 'clearToday') {
          console.log(`🗑️ [清空今日] 用戶: ${userId}`);
          recordSystemLog('清空今日', userId, '清空今日所有紀錄', '', '已清空今日紀錄');
          clearTodayLogs(userId, userGistId, GITHUB_PAT, props);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
          continue;
        }

        // 🚨 按下【徹底銷毀所有個人資料 (被遺忘權)】
        if (payload.action === 'destroyAllData') {
          console.log(`🚨 [徹底銷毀帳號資料] 用戶: ${userId}`);
          recordSystemLog('銷毀所有資料', userId, '使用者要求徹底銷毀所有資料', '', '已銷毀全部數據');
          purgeAllUserData(userId, userGistId, GITHUB_PAT, props);
          replyTextMessage(replyToken, "🗑️ 您的所有飲食紀錄、體態目標、常用餐點庫及專屬雲端 Gist 已徹底銷毀並解除綁定。\n\n感謝您的使用，若未來需重新記錄，隨時傳送照片或訊息即可重新啟用！🐼", CHANNEL_ACCESS_TOKEN);
          continue;
        }

        // 🗑️ 按下【撤回這筆紀錄】
        else if (payload.action === 'cancel') {
          if (payload.id || payload.name) {
            deleteMealLog(userId, payload.id || payload.name, userGistId, GITHUB_PAT, props);
            recordSystemLog('撤回紀錄', userId, payload.name || payload.id, '', '已自資料庫撤回並刪除此筆餐點');
            replyTextMessage(replyToken, "👌 已成功為您撤回並刪除此筆餐點紀錄。您可以隨時再傳送照片或文字！🐼", CHANNEL_ACCESS_TOKEN, userId, props);
          } else {
            replyTextMessage(replyToken, "👌 已取消此操作。您可以隨時再傳送照片或文字！🐼", CHANNEL_ACCESS_TOKEN, userId, props);
          }
          continue;
        }
      }

      // 💬 Case 2: 用戶發送訊息 (圖片或文字)
      else if (event.type === 'message') {
        // 📸 照片辨識
        if (event.message.type === 'image') {
          sendLineLoadingAnimation(userId, CHANNEL_ACCESS_TOKEN, 25);
          const messageId = event.message.id;
          console.log(`📸 [收到餐點照片] Message ID: ${messageId}`);
          const imageBlob = getLineImageBlob(messageId, CHANNEL_ACCESS_TOKEN);
          const base64Image = Utilities.base64Encode(imageBlob.getBytes());

          const analysis = analyzeMealWithGemini(base64Image, GEMINI_API_KEY, userId, props, userGistId, GITHUB_PAT);
          console.log(`🤖 [照片 AI 辨識結果]`, JSON.stringify(analysis));

          const meal = {
            id: Date.now(),
            date: getTodayDateString(),
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
            dish_name: analysis.dish_name || '美味餐點',
            calories: Number(analysis.calories) || 0,
            protein: Number(analysis.protein) || 0,
            carbs: Number(analysis.carbs) || 0,
            fat: Number(analysis.fat) || 0,
            water: Number(analysis.water) || 0,
            breakdown: analysis.breakdown || [],
            calculation_note: analysis.calculation_note || '',
            comment: analysis.panda_comment || ''
          };

          // ⚡ 即時秒寫入資料庫（無時間差 GAP）
          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
          recordSystemLog('照片辨識', userId, `傳送照片 (ID: ${messageId})`, `${analysis.dish_name} (${analysis.calories}卡 / ${analysis.protein}g蛋 / ${analysis.water || 0}ml水)`, '已即時寫入資料庫並發送卡片');
          replyMealConfirmCard(replyToken, meal, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }
        // 💬 文字訊息
        else if (event.message.type === 'text') {
          const userText = event.message.text.trim();
          console.log(`💬 [收到用戶文字] "${userText}"`);

          // 🌐 雙語切換 (支援中文/英文雙向切換)
          if (userText === '切換語言' || userText === '換語言' || userText === '語言' || userText === '雙語' || userText.toLowerCase() === 'language' || userText.toLowerCase() === 'switch language') {
            const curLang = getUserLanguage(userId, props, userGistId, GITHUB_PAT);
            recordSystemLog('切換語言', userId, userText, curLang, '發送語言選擇卡片');
            const langFlex = generateLanguageSelectionFlex(userId, LIFF_ID, userGistId, curLang);
            replyFlexMessage(replyToken, langFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          if (userText.toLowerCase() === 'english' || userText === '英文' || userText === '切換英文' || userText === '切換成英文') {
            setUserLanguage(userId, 'en', userGistId, GITHUB_PAT, props);
            replyTextMessage(replyToken, "🌐 Language switched to English! 🐼✨\nFrom now on, Panda Coach will analyze your meals, calculate nutrition, and reply in English!\n\n(Tip: Type \"中文\" anytime to switch back to Chinese)", CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          if (userText === '中文' || userText === '繁體中文' || userText.toLowerCase() === 'chinese' || userText === '切換中文' || userText === '切換成中文') {
            setUserLanguage(userId, 'zh', userGistId, GITHUB_PAT, props);
            replyTextMessage(replyToken, "🌐 語言已成功切換為繁體中文！ 🐼✨\n熊貓教練將會以繁體中文為您分析飲食與計算營養囉！\n\n（隨時輸入「English」可切換為英文）", CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🎭 切換教練性格 (例如: "切換性格", "挑選性格", "選擇性格", "挑選教練性格", "換性格", "換教練", "性格", "溫柔模式", "傲嬌模式", "鐵血模式")
          if (userText === '切換性格' || userText === '挑選性格' || userText === '選擇性格' || userText === '挑選教練性格' || userText === '換性格' || userText === '改性格' || userText === '換教練' || userText === '教練性格' || userText === '性格' || userText === '教練' || userText === '多重性格' || userText.toLowerCase() === 'persona') {
            recordSystemLog('切換性格', userId, userText, '', '發送教練性格選擇卡片');
            const personaFlex = generatePersonaSelectionFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, personaFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          if (userText.startsWith('切換') || userText.startsWith('換成') || userText.startsWith('模式') || userText.startsWith('設定性格') || userText.includes('教練')) {
            let targetPersona = '';
            if (userText.includes('溫柔') || userText.includes('天使') || userText.includes('治癒')) targetPersona = 'gentle';
            else if (userText.includes('鐵血') || userText.includes('魔鬼') || userText.includes('熱血') || userText.includes('斯巴達')) targetPersona = 'hardcore';
            else if (userText.includes('傲嬌') || userText.includes('毒舌') || userText.includes('預設')) targetPersona = 'tsundere';

            if (targetPersona) {
              setUserPersona(userId, targetPersona, userGistId, GITHUB_PAT, props);
              const personaNames = { tsundere: '傲嬌毒舌教練 🐼😡', gentle: '治癒天使 🐼🥰', hardcore: '魔鬼士官長 🐼🔥' };
              recordSystemLog('切換性格', userId, targetPersona, '', `已切換為 ${personaNames[targetPersona]}`);
              replyTextMessage(replyToken, `🎭 已成功將教練性格切換為【${personaNames[targetPersona]}】！\n快傳送照片或打字測試看看吧 🐼✨`, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 🐛 問題回報 / Bug Report / 意見反饋 (與 Web 端相同表單提交邏輯)
          if (userText.startsWith('回報') || userText.startsWith('bug') || userText.startsWith('Bug') || userText.startsWith('BUG') || userText.startsWith('問題') || userText.startsWith('建議') || userText.startsWith('反饋') || userText.startsWith('報錯')) {
            console.log(`🐛 [收到問題回報] 用戶 ${userId}: ${userText}`);
            recordSystemLog('問題回報', userId, userText, '', '已成功記錄用戶問題回報並提交 Web3Forms');

            // 🚀 與 Web 端 100% 相同邏輯：透過 Web3Forms 提交表單至團隊信箱
            try {
              UrlFetchApp.fetch('https://api.web3forms.com/submit', {
                method: 'post',
                contentType: 'application/json',
                payload: JSON.stringify({
                  access_key: '72d7f10c-b6c8-42f2-9c40-fc5fac45cad0',
                  subject: `[Daily-Diet LINE] 問題回報 (${userId.slice(-6)})`,
                  message: userText,
                  from_name: `LINE Bot User (${userId.slice(-6)})`,
                  device: 'LINE Messaging API'
                }),
                muteHttpExceptions: true
              });
            } catch (web3Err) {
              console.warn('Web3Forms 提交失敗:', web3Err);
            }

            const ackFlex = generateBugReportAckFlex(userText, LIFF_ID, userGistId);
            replyFlexMessage(replyToken, ackFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 💡 說明 / 指令 / 教學 / 歡迎 / 功能清單 / 免責聲明 (呼叫所有功能選項)
          if (userText === '說明' || userText === 'help' || userText === '使用說明' || userText === '開始' || userText === '教學' || userText === '免責聲明' || userText === '歡迎' || userText === '指令' || userText === '功能' || userText === '功能清單' || userText === '全部功能' || userText === '操作說明' || userText === '指南') {
            recordSystemLog('使用說明', userId, userText, '', '發送操作說明與功能手冊卡片');
            const helpFlex = generateCommandMenuFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, helpFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }


          // 🚀 建立/更新原生相機圖文選單 (點擊直接滑出開相機)
          if (userText === '更新相機選單' || userText === '設定相機選單' || userText === '更新選單' || userText === '部署選單' || userText === '新選單' || userText === '換選單' || userText === '重整選單') {
            recordSystemLog('部署選單', userId, userText, '', '觸發原生相機圖文選單部署');
            try {
              const richMenuId = setupNativeCameraRichMenu(CHANNEL_ACCESS_TOKEN, LIFF_ID, props);
              replyTextMessage(replyToken, `🎉 【原生相機圖文選單】已成功建立並設為全域預設！\n\n📸 左上角【📸 拍照辨識】已綁定 LINE 原生相機動作，現在點擊會「直接滑出相機」0秒拍照！\n\n💡 若手機尚未更新畫面：\n請關閉並重新打開此 LINE 聊天室即可看見全新選單 🐼✨`, CHANNEL_ACCESS_TOKEN, userId, props);
            } catch (err) {
              replyTextMessage(replyToken, `❌ 部署圖文選單失敗：${err.message}`, CHANNEL_ACCESS_TOKEN, userId, props);
            }
            continue;
          }

          // 📸 拍照記帳導引 (例如從 Rich Menu 點擊 "拍照" 或 "拍照辨識")
          if (userText === '拍照' || userText === '拍照辨識' || userText === '拍照記帳' || userText === '拍餐點') {
            recordSystemLog('拍照引導', userId, userText, '', '發送拍照指引');
            replyTextMessage(replyToken, "📸 請點擊下方輸入框左側的【📷 相機】或【🖼️ 相簿】圖示，直接拍照或挑選餐點照片傳給我，AI 熊貓立刻為您分析熱量與營養素！🐼✨", CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 查詢今日總結
          if (userText === '今天' || userText === '總結' || userText === '統計' || userText === '今日' || userText === '今日總結') {
            recordSystemLog('查詢總結', userId, userText, '', '已發送今日總結');
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📊 查詢 7 日趨勢與歷史週報
          if (userText === '週報' || userText === '趨勢' || userText === '圖表' || userText === '歷史' || userText === '歷史紀錄' || userText === '戰報' || userText === '7天' || userText === '七天' || userText === '分析') {
            recordSystemLog('週報趨勢', userId, userText, '', '已發送7日趨勢週報');
            const weeklyFlex = generateWeeklyTrendsFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, weeklyFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📅 查詢昨日/前天歷史紀錄
          if (userText === '昨天' || userText === '昨日') {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const dateStr = Utilities.formatDate(yesterday, "Asia/Taipei", "yyyy-MM-dd");
            recordSystemLog('查詢歷史', userId, userText, dateStr, '已發送昨天總結');
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, dateStr);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          if (userText === '前天') {
            const dayBefore = new Date(Date.now() - 48 * 60 * 60 * 1000);
            const dateStr = Utilities.formatDate(dayBefore, "Asia/Taipei", "yyyy-MM-dd");
            recordSystemLog('查詢歷史', userId, userText, dateStr, '已發送前天總結');
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, dateStr);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📅 查詢指定歷史日期 (例如: "2026-09-03", "9/3", "9月3日", "查 9/3", "歷史 9/3")
          const dateMatch = userText.match(/^(?:查|歷史|紀錄)?\s*(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/) ||
                            userText.match(/^(?:查|歷史|紀錄)?\s*(\d{1,2})[-/.月](\d{1,2})日?$/);
          if (dateMatch) {
            const now = new Date();
            let year = now.getFullYear();
            let month = 0;
            let day = 0;
            if (dateMatch.length === 4) {
              year = parseInt(dateMatch[1]);
              month = parseInt(dateMatch[2]);
              day = parseInt(dateMatch[3]);
            } else if (dateMatch.length === 3) {
              month = parseInt(dateMatch[1]);
              day = parseInt(dateMatch[2]);
            }
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
              const mm = String(month).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const targetDateStr = `${year}-${mm}-${dd}`;
              recordSystemLog('查詢歷史日期', userId, userText, targetDateStr, `發送 ${targetDateStr} 歷史總結`);
              const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, targetDateStr);
              replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 💧 快速喝水打卡 (例如: "喝水 500", "喝水 250ml", "+500水", "喝水")
          const waterMatch = userText.match(/^(?:喝水|補水|\+)\s*(\d+)?\s*(?:ml|cc|水)?$/i) || userText.match(/^(\d+)\s*(?:ml|cc)\s*(?:水)?$/i);
          if (waterMatch || userText === '喝水' || userText === '補水') {
            const amount = (waterMatch && waterMatch[1]) ? Number(waterMatch[1]) : 500;
            const meal = {
              id: Date.now(),
              date: getTodayDateString(),
              time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
              dish_name: `💧 喝水 ${amount}ml`,
              calories: 0,
              protein: 0,
              water: amount,
              comment: '💧 快速補水打卡'
            };
            recordSystemLog('文字喝水', userId, userText, `+${amount}ml 水分`, '已即時記錄至資料庫');
            saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
            const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // ☁️ 手動綁定既有的 GitHub Gist ID (跨裝置 / 外面 Web 轉移至 LINE)
          if (userText.startsWith('綁定') || userText.startsWith('連動') || userText.toLowerCase().startsWith('gist')) {
            const cleanGistId = userText.replace(/^(?:綁定|連動|gist)\s*/i, '').replace(/^(?:id)?[:：\s]*/i, '').trim();
            if (cleanGistId && cleanGistId.length >= 8) {
              props.setProperty(`USER_GIST_${userId}`, cleanGistId);
              recordSystemLog('綁定Gist', userId, userText, cleanGistId, '已成功綁定個人 Gist ID');
              
              let extraMsg = '';
              let favCount = 0;
              if (GITHUB_PAT) {
                try {
                  const gistUrl = `https://api.github.com/gists/${cleanGistId}`;
                  const getRes = UrlFetchApp.fetch(gistUrl, {
                    headers: { 'Authorization': `Bearer ${GITHUB_PAT}`, 'Accept': 'application/vnd.github+json' },
                    muteHttpExceptions: true
                  });
                  if (getRes.getResponseCode() === 200) {
                    const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
                    if (content) {
                      const backupData = JSON.parse(content);
                      if (backupData.settings) {
                        const cal = backupData.settings.find(s => s.key === 'calorie_goal' || s.key === 'user_calories')?.value;
                        const pro = backupData.settings.find(s => s.key === 'protein_goal' || s.key === 'user_protein')?.value;
                        const wat = backupData.settings.find(s => s.key === 'water_goal' || s.key === 'user_water')?.value;
                        if (cal) props.setProperty(`CALORIE_GOAL_${userId}`, String(cal));
                        if (pro) props.setProperty(`PROTEIN_GOAL_${userId}`, String(pro));
                        if (wat) props.setProperty(`WATER_GOAL_${userId}`, String(wat));
                      }
                      if (backupData.favorites && Array.isArray(backupData.favorites) && backupData.favorites.length > 0) {
                        props.setProperty(`FAVORITES_${userId}`, JSON.stringify(backupData.favorites));
                        favCount = backupData.favorites.length;
                      }
                      extraMsg = `\n📦 已偵測到您在 Web 端的歷史紀錄、體態目標與 ${favCount} 筆常用餐點，已全面即時連動！`;
                    }
                  }
                } catch (e) {
                  console.error("Gist 同步失敗:", e);
                }
              }

              replyTextMessage(replyToken, `🎉 恭喜！已成功將您的 LINE 帳號連動至 Gist 雲端庫：\n🔑 Gist ID: ${cleanGistId}${extraMsg}\n\n現在在 LINE 輸入「常用」或「目標」，隨時都能取用您在 Web 建立的自訂常用餐點！🐼✨`, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 開啟選單 (帶個人專屬 Gist ID 自動綁定)
          if (userText === '選單' || userText === 'App' || userText === '主選單' || userText === '日記') {
            const appUrl = `https://liff.line.me/${LIFF_ID}?userId=${userId}${userGistId ? `&gistId=${userGistId}` : ''}`;
            recordSystemLog('開啟App', userId, userText, '', '已發送 App 連結');
            replyTextMessage(replyToken, `🐼 點擊開啟您的個人飲食日記（已自動連動個人雲端）：\n${appUrl}`, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📋 管理今日紀錄
          if (userText === '管理' || userText === '管理紀錄' || userText === '紀錄管理' || userText === '清單' || userText === '今日清單' || userText === '紀錄') {
            recordSystemLog('管理清單', userId, userText, '', '已發送管理面板');
            const mgmtFlex = generateMealManagementFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, mgmtFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // ⭐ 常用餐點與補水輪播庫 (左右滑動 Carousel)
          if (userText === '常用' || userText === '快捷' || userText === '收藏' || userText === '常用清單' || userText === '我的常用' || userText === '常用餐點' || userText === '快捷輪播') {
            recordSystemLog('常用輪播', userId, userText, '', '已發送左右滑動常用輪播');
            const favCarousel = generateFavoritesCarouselFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, favCarousel, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // ⭐ 新增常用餐點 (例如: "加常用 拿鐵 150卡 8蛋 350水" 或 "新增常用 雞胸肉 200卡 40蛋")
          if (userText.startsWith('加常用') || userText.startsWith('新增常用') || userText.startsWith('加入常用') || userText.startsWith('收藏常用')) {
            const cleanStr = userText.replace(/^(?:加常用|新增常用|加入常用|收藏常用)\s*/, '');
            const calMatch = cleanStr.match(/(\d+)\s*(?:kcal|卡|大卡)/i) || (cleanStr.includes('熱量') ? cleanStr.match(/熱量\s*(\d+)/i) : null);
            const proMatch = cleanStr.match(/(\d+(?:\.\d+)?)\s*(?:g|克|蛋|蛋白質)/i) || (cleanStr.includes('蛋白質') ? cleanStr.match(/蛋白質\s*(\d+(?:\.\d+)?)/i) : null);
            const watMatch = cleanStr.match(/(\d+)\s*(?:ml|cc|水|水分)/i) || (cleanStr.includes('水分') ? cleanStr.match(/水分\s*(\d+)/i) : null);

            let dishName = cleanStr
              .replace(/(\d+)\s*(?:kcal|卡|大卡)/gi, '')
              .replace(/(?:熱量)?\s*(\d+)\s*(?:kcal|卡|大卡)?/gi, '')
              .replace(/(\d+(?:\.\d+)?)\s*(?:g|克|蛋|蛋白質)/gi, '')
              .replace(/(\d+)\s*(?:ml|cc|水|水分)/gi, '')
              .trim() || '常用餐點';

            const favItem = {
              id: Date.now(),
              dish_name: dishName,
              calories: calMatch ? Number(calMatch[1]) : 0,
              protein: proMatch ? Number(proMatch[1]) : 0,
              water: watMatch ? Number(watMatch[1]) : 0
            };

            recordSystemLog('文字加常用', userId, userText, `${favItem.dish_name} (${favItem.calories}卡 / ${favItem.protein}g蛋)`, '已收藏至常用庫');
            saveUserFavorite(userId, favItem, userGistId, GITHUB_PAT, props);
            const favAddedFlex = generateFavoriteAddedFlex(favItem, LIFF_ID, userGistId);
            replyFlexMessage(replyToken, favAddedFlex, CHANNEL_ACCESS_TOKEN);
            continue;
          }

          // 🚨 徹底銷毀所有個人資料 (被遺忘權)
          if (userText === '刪除所有資料' || userText === '清除所有資料' || userText === '銷毀所有資料' || userText === '刪除帳號' || userText === '重設資料' || userText === '清空全部') {
            const destroyConfirmFlex = generateDestroyAllDataConfirmFlex();
            replyFlexMessage(replyToken, destroyConfirmFlex, CHANNEL_ACCESS_TOKEN);
            continue;
          }

          // 🗑️ 刪除最後一筆 / 刪除指定餐點
          if (userText === '刪除最後一筆' || userText === '刪除上一筆' || userText === '刪除最後' || userText === '復原' || userText === '撤銷' || userText === '刪除') {
            const deleted = deleteMealLog(userId, 'last', userGistId, GITHUB_PAT, props);
            recordSystemLog('文字刪除', userId, userText, '', deleted ? '已刪除最後一筆' : '無紀錄可刪');
            if (deleted) {
              const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
              replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            } else {
              replyTextMessage(replyToken, "🐼 今天目前沒有任何飲食紀錄可以刪除喔！", CHANNEL_ACCESS_TOKEN, userId, props);
            }
            continue;
          }

          if (userText.startsWith('刪除') || userText.startsWith('移除')) {
            const targetName = userText.replace(/^(?:刪除|移除)\s*/, '').trim();
            if (targetName) {
              const deleted = deleteMealLog(userId, targetName, userGistId, GITHUB_PAT, props);
              recordSystemLog('文字刪除', userId, userText, `目標: ${targetName}`, deleted ? '已成功刪除' : '找不到餐點');
              if (deleted) {
                const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
                replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              } else {
                replyTextMessage(replyToken, `🐼 找不到今日名稱為「${targetName}」的餐點紀錄。`, CHANNEL_ACCESS_TOKEN, userId, props);
              }
              continue;
            }
          }

          // 🍱 來自 App / LIFF 微調儲存的餐點同步
          if (userText.startsWith('🍱 已在 App 記錄餐點：') || userText.startsWith('🍱 已記錄餐點：')) {
            const nameMatch = userText.match(/：(.*?)(?:\s*\(|$)/);
            const calMatch = userText.match(/(\d+)\s*kcal/i);
            const proMatch = userText.match(/蛋白質\s*(\d+(?:\.\d+)?)\s*g/i);
            const watMatch = userText.match(/水分\s*(\d+)\s*ml/i) || userText.match(/水\s*(\d+)\s*ml/i);
            const cmtMatch = userText.match(/備註:\s*(.*?)(?:\)|$)/);

            const dishName = nameMatch ? nameMatch[1].trim() : '餐點';
            const calories = calMatch ? Number(calMatch[1]) : 0;
            const protein = proMatch ? Number(proMatch[1]) : 0;
            const water = watMatch ? Number(watMatch[1]) : 0;
            const comment = cmtMatch ? cmtMatch[1].trim() : '';

            const meal = {
              id: Date.now(),
              date: getTodayDateString(),
              time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
              dish_name: dishName,
              calories: calories,
              protein: protein,
              water: water,
              comment: comment
            };

            recordSystemLog('App同步', userId, dishName, `${calories}卡 / ${protein}g蛋 / ${water}ml水`, '已同步記錄');
            saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
            const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
            continue;
          }

          // 🎯 1. 查看目前飲食目標 (例如: "目標", "我的目標", "查看目標", "目前目標")
          if (userText === '目標' || userText === '我的目標' || userText === '查看目標' || userText === '目前目標' || userText === '每日目標') {
            const goals = getUserGoals(userId, props, userGistId);
            recordSystemLog('查看目標', userId, userText, `${goals.calories}卡 / ${goals.protein}g蛋 / ${goals.water}ml水`, '發送目前目標卡片');
            const goalFlex = generateCurrentGoalFlex(userId, goals, LIFF_ID, userGistId);
            replyFlexMessage(replyToken, goalFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🎯 2. 設定目標導引 (若用戶只輸入「設定目標」、「改目標」、「推薦目標」、「智能目標」等，但未提供身高體重或數值，發送智能引導卡片)
          const isGoalGuideRequest = userText === '設定目標' ||
            userText === '改目標' ||
            userText === '修改目標' ||
            userText === '調整目標' ||
            userText === '目標設定' ||
            userText === '推薦目標' ||
            userText === '目標推薦' ||
            userText === '智能目標' ||
            userText === '體態目標' ||
            userText === '如何設定目標' ||
            ((userText.startsWith('改目標') || userText.startsWith('設定目標') || userText.startsWith('修改目標')) && !/\d+/.test(userText));

          if (isGoalGuideRequest) {
            recordSystemLog('目標推薦導引', userId, userText, '', '發送 AI 體態目標推薦導引卡片');
            const guideFlex = generateGoalGuideFlex(userId, LIFF_ID, userGistId);
            replyFlexMessage(replyToken, guideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🎯 3. 設定/修改體態目標與客製化建議 (例如: "改目標 165cm 55kg 女 減脂", "設定目標 1800卡 120蛋 2500水")
          const isGoalUpdate = userText.startsWith('改目標') ||
            userText.startsWith('設定目標') ||
            userText.startsWith('修改目標') ||
            userText.startsWith('調整目標') ||
            (userText.includes('目標') && (userText.includes('減脂') || userText.includes('增肌') || userText.includes('減重') || userText.includes('維持') || userText.includes('卡') || userText.includes('kcal'))) ||
            ((userText.includes('身高') || userText.includes('體重')) && (userText.includes('減脂') || userText.includes('增肌') || userText.includes('減重') || userText.includes('維持') || userText.includes('建議')));

          if (isGoalUpdate) {
            sendLineLoadingAnimation(userId, CHANNEL_ACCESS_TOKEN, 15);
            recordSystemLog('體態目標', userId, userText, '計算BMR/TDEE', '發送目標卡片');
            handleGoalSettingWithAI(replyToken, userId, userText, userGistId, GITHUB_PAT, props, LIFF_ID, CHANNEL_ACCESS_TOKEN, GEMINI_API_KEY);
            continue;
          }

          // ✏️ 直接在 LINE 文字修改餐點數值 (例如: "改 600卡 30蛋 500水" 或 "改 排骨便當 650卡 35蛋")
          if (userText.startsWith('改') || userText.startsWith('修改') || userText.startsWith('改成')) {
            const calMatch = userText.match(/(\d+)\s*(?:kcal|卡|大卡)/i) || (userText.includes('熱量') ? userText.match(/熱量\s*(\d+)/i) : null);
            const proMatch = userText.match(/(\d+(?:\.\d+)?)\s*(?:g|克|蛋|蛋白質)/i) || (userText.includes('蛋白質') ? userText.match(/蛋白質\s*(\d+(?:\.\d+)?)/i) : null);
            const watMatch = userText.match(/(\d+)\s*(?:ml|cc|水|水分)/i) || (userText.includes('水分') ? userText.match(/水分\s*(\d+)/i) : null);

            let cleanName = userText.replace(/^(?:改|修改|改成)\s*/, '')
              .replace(/(\d+)\s*(?:kcal|卡|大卡)/gi, '')
              .replace(/(?:熱量)?\s*(\d+)\s*(?:kcal|卡|大卡)?/gi, '')
              .replace(/(\d+(?:\.\d+)?)\s*(?:g|克|蛋|蛋白質)/gi, '')
              .replace(/(\d+)\s*(?:ml|cc|水|水分)/gi, '')
              .trim();

            const updateFields = {};
            if (cleanName && cleanName !== '熱量' && cleanName !== '蛋白質' && cleanName !== '水分') {
              updateFields.dish_name = cleanName;
            }
            if (calMatch) updateFields.calories = Number(calMatch[1]);
            if (proMatch) updateFields.protein = Number(proMatch[1]);
            if (watMatch) updateFields.water = Number(watMatch[1]);

            if (Object.keys(updateFields).length > 0) {
              const updatedMeal = updateOrSaveMealLog(userId, updateFields, userGistId, GITHUB_PAT, props);
              recordSystemLog('修改數值', userId, userText, `${updatedMeal.dish_name} (${updatedMeal.calories}卡 / ${updatedMeal.protein}g)`, '已更新餐點');
              const summaryFlex = generateDailySummaryFlex(userId, updatedMeal, LIFF_ID, userGistId, props);
              replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
              continue;
            }
          }

          // 飲食文字辨識 / 日常對話
          sendLineLoadingAnimation(userId, CHANNEL_ACCESS_TOKEN, 15);
          const analysis = parseTextWithGemini(userText, GEMINI_API_KEY, userId, props, userGistId, GITHUB_PAT);
          if (analysis.is_food === false) {

            recordSystemLog('日常對話', userId, userText, '非食物訊息', analysis.reply || '已回覆');
            replyTextMessage(replyToken, analysis.reply || "哈囉！我是您的 AI 熊貓飲食教練 🐼，隨時傳送餐點照片或輸入食物名稱，我來幫您計算熱量與記錄！", CHANNEL_ACCESS_TOKEN, userId, props);
          } else {
            const meal = {
              id: Date.now(),
              date: getTodayDateString(),
              time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
              dish_name: analysis.dish_name || '美味餐點',
              calories: Number(analysis.calories) || 0,
              protein: Number(analysis.protein) || 0,
              carbs: Number(analysis.carbs) || 0,
              fat: Number(analysis.fat) || 0,
              water: Number(analysis.water) || 0,
              breakdown: analysis.breakdown || [],
              calculation_note: analysis.calculation_note || '',
              comment: analysis.panda_comment || ''
            };

            // ⚡ 即時秒寫入資料庫（無時間差 GAP）
            saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
            recordSystemLog('文字辨識', userId, userText, `${analysis.dish_name} (${analysis.calories}卡 / ${analysis.protein}g蛋 / ${analysis.water || 0}ml水)`, '已即時寫入資料庫並發送卡片');
            replyMealConfirmCard(replyToken, meal, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId, props);
          }
        }
      }
    }
  } catch (err) {
    console.error("處理請求時發生錯誤:", err);
    recordSystemLog('系統異常', 'system', err.message || err.toString(), '', '異常報警');
    if (currentReplyToken && currentToken) {
      try {
        replyTextMessage(currentReplyToken, `⚠️ 熊貓教練提示：\n\n${err.message || err.toString()}`, currentToken);
      } catch (replyErr) { }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================================
// ☁️ 多用戶 Gist 自動分配與管理核心
// ========================================================

function getOrCreateUserGist(userId, pat, props) {
  if (!pat) return '';

  // 1. 檢查是否已有該用戶的專屬 Gist ID
  const userGistKey = `USER_GIST_${userId}`;
  let gistId = props.getProperty(userGistKey);
  if (gistId) return gistId;

  // 2. 若無，自動向 GitHub 建立一組全新專屬 Gist
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

// ========================================================
// 🍱 1. 辨識確認卡片 (附帶個人 Gist 專屬網址與常用按鈕)
// ========================================================

function replyMealConfirmCard(replyToken, analysis, liffId, userGistId, accessToken, userId, props) {
  const postbackSaveData = JSON.stringify({
    action: 'save',
    id: analysis.id,
    name: (analysis.dish_name || '餐點').slice(0, 30)
  });

  const postbackFavData = JSON.stringify({
    action: 'saveFavorite',
    name: (analysis.dish_name || '餐點').slice(0, 30),
    cal: Number(analysis.calories) || 0,
    pro: Number(analysis.protein) || 0,
    wat: Number(analysis.water) || 0
  });

  const postbackCancelData = JSON.stringify({
    action: 'cancel',
    id: analysis.id,
    name: (analysis.dish_name || '餐點').slice(0, 30)
  });
  const encodedName = encodeURIComponent(analysis.dish_name || '餐點');
  const encodedCmt = encodeURIComponent(analysis.panda_comment || '');
  const appTargetUrl = `https://liff.line.me/${liffId}?action=editMeal&name=${encodedName}&cal=${Number(analysis.calories) || 0}&pro=${Number(analysis.protein) || 0}&wat=${Number(analysis.water) || 0}&cmt=${encodedCmt}${userId ? `&userId=${userId}` : ''}${userGistId ? `&gistId=${userGistId}` : ''}`;

  const userPersona = getUserPersona(userId, props, userGistId);
  const displayComment = (analysis.panda_comment && analysis.panda_comment.trim()) ? analysis.panda_comment.trim() : generateFallbackComment(analysis.dish_name || '餐點', Number(analysis.calories) || 0, Number(analysis.protein) || 0, userPersona);

  const flexMessage = {
    type: "flex",
    altText: `🍱 AI 已記錄：${analysis.dish_name} (${analysis.calories} kcal)`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#FDE047",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🐼 DAILY DIET", weight: "bold", size: "sm", color: "#000000" },
              { type: "text", text: "AI 即時記錄", weight: "bold", size: "xs", color: "#713F12", align: "end" }
            ]
          },
          {
            type: "text",
            text: "✅ 已即時記錄至資料庫！",
            weight: "bold",
            size: "md",
            color: "#000000",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: analysis.dish_name || "美味餐點",
            weight: "bold",
            size: "lg",
            color: "#000000",
            wrap: true
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "xs",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FFF1F2",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isEn ? "🔥 Calories" : "🔥 熱量", size: "xxs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${analysis.calories}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "kcal", size: "xxs", color: "#881337", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#EFF6FF",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isEn ? "🥩 Protein" : "🥩 蛋白質", size: "xxs", color: "#2563EB", weight: "bold" },
                  { type: "text", text: `${analysis.protein}g`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: isEn ? "grams" : "克", size: "xxs", color: "#1E3A8A", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#ECFEFF",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isEn ? "💧 Water" : "💧 水分", size: "xxs", color: "#0891B2", weight: "bold" },
                  { type: "text", text: `${analysis.water || 0}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "ml", size: "xxs", color: "#164E63", weight: "bold" }
                ]
              }
            ]
          },

          // 🧮 估算過程拆解 (份量與熱量依據)
          ...((() => {
            const breakdownList = (analysis.breakdown && Array.isArray(analysis.breakdown)) ? analysis.breakdown : [];
            const breakdownRows = breakdownList.slice(0, 5).map(item => ({
              type: "box",
              layout: "horizontal",
              margin: "xs",
              contents: [
                {
                  type: "text",
                  text: `• ${item.name || '項目'} ${item.portion ? `(${item.portion})` : ''}`,
                  size: "xxs",
                  color: "#1E293B",
                  weight: "bold",
                  flex: 6,
                  wrap: true
                },
                {
                  type: "text",
                  text: `${Number(item.calories) || 0} kcal${Number(item.protein) > 0 ? ` / ${item.protein}g蛋` : ''}`,
                  size: "xxs",
                  color: "#E11D48",
                  weight: "bold",
                  align: "end",
                  flex: 4
                }
              ]
            }));

            const calcNote = analysis.calculation_note || '';

            if (breakdownRows.length > 0) {
              return [{
                type: "box",
                layout: "vertical",
                backgroundColor: "#F8FAFC",
                cornerRadius: "10px",
                borderColor: "#E2E8F0",
                borderWidth: "1px",
                paddingAll: "10px",
                spacing: "xs",
                contents: [
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      { type: "text", text: "🧮 估算拆解明細", size: "xxs", color: "#475569", weight: "bold", flex: 1 },
                      { type: "text", text: "估算熱量 / 蛋白質", size: "xxs", color: "#94A3B8", align: "end" }
                    ]
                  },
                  ...breakdownRows,
                  ...(calcNote ? [{
                    type: "text",
                    text: `💡 公式：${calcNote}`,
                    size: "xxs",
                    color: "#64748B",
                    wrap: true,
                    margin: "xs"
                  }] : [])
                ]
              }];
            } else if (calcNote) {
              return [{
                type: "box",
                layout: "vertical",
                backgroundColor: "#F8FAFC",
                cornerRadius: "10px",
                borderColor: "#E2E8F0",
                borderWidth: "1px",
                paddingAll: "8px",
                contents: [
                  { type: "text", text: `🧮 估算過程：${calcNote}`, size: "xxs", color: "#475569", wrap: true }
                ]
              }];
            }
            return [];
          })()),

          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FEF9C3",
            cornerRadius: "10px",
            paddingAll: "10px",
            contents: [
              {
                type: "text",
                text: `💬 熊貓短評：${displayComment}`,
                size: "xs",
                color: "#713F12",
                weight: "bold",
                wrap: true
              }
            ]
          },

          {
            type: "text",
            text: "⚡ 餐點已自動入帳！數值有誤差可點擊微調：",
            size: "xxs",
            color: "#71717A",
            align: "center",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#000000",
            action: {
              type: "postback",
              label: "📊 查看今日總結",
              data: postbackSaveData,
              displayText: "📊 查看今日總結"
            }
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "secondary",
                height: "sm",
                flex: 1,
                color: "#F4F4F5",
                action: {
                  type: "postback",
                  label: "✏️ 微調內容",
                  data: JSON.stringify({ action: 'fillEdit' }),
                  inputOption: "openKeyboard",
                  fillInText: `改 ${analysis.dish_name} ${analysis.calories}卡 ${analysis.protein || 0}蛋 ${analysis.water || 0}水`
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                flex: 1,
                color: "#FEF9C3",
                action: {
                  type: "postback",
                  label: "⭐ 存為常用",
                  data: postbackFavData,
                  displayText: `⭐ 存為常用：${analysis.dish_name}`
                }
              }
            ]
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#FFF1F2",
            action: {
              type: "postback",
              label: "🗑️ 撤回這筆紀錄",
              data: postbackCancelData,
              displayText: "🗑️ 撤回這筆紀錄"
            }
          }
        ]
      }
    }
  };

  replyFlexMessage(replyToken, flexMessage, accessToken, userId, props);
}

// ========================================================
// 📊 2. 今日飲食進度總結卡片
// ========================================================

function generateDailySummaryFlex(userId, justSavedMeal, liffId, userGistId, props, targetDateStr) {
  const todayStr = targetDateStr || getTodayDateString();
  const isToday = todayStr === getTodayDateString();
  const allLogs = getTodayLogs(userId, todayStr, props, userGistId);
  const goals = getUserGoals(userId, props, userGistId);

  let totalCal = 0;
  let totalPro = 0;
  let totalWater = 0;
  let mealItems = [];

  allLogs.forEach((log) => {
    totalCal += Number(log.calories) || 0;
    totalPro += Number(log.protein) || 0;
    totalWater += Number(log.water) || 0;

    let timeText = log.time || '';
    if (!timeText && log.timestamp) {
      try {
        timeText = Utilities.formatDate(new Date(Number(log.timestamp)), "Asia/Taipei", "HH:mm");
      } catch (e) {}
    }

    const catEmojiMap = {
      'breakfast': '🍳',
      'lunch': '🍱',
      'dinner': '🍲',
      'snack': '☕',
      'water': '🚰'
    };
    const catPrefix = log.category && catEmojiMap[log.category] ? `${catEmojiMap[log.category]} ` : '';
    const timePrefix = timeText ? `${timeText} ` : '';
    const displayName = log.dish_name || '美味餐點';

    mealItems.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: `• ${timePrefix}${catPrefix}${displayName}`, size: "xs", color: "#18181B", weight: "bold", flex: 4, wrap: true },
        { type: "text", text: `${Number(log.calories) || 0} kcal`, size: "xs", color: "#E11D48", weight: "bold", flex: 2, align: "end" }
      ]
    });
  });

  const calGoal = goals.calories;
  const proGoal = goals.protein;
  const watGoal = goals.water;
  const remainingCal = Math.max(0, calGoal - totalCal);
  const calPercent = Math.min(100, Math.round((totalCal / calGoal) * 100));

  let coachTip = "飲食紀錄養成中，繼續保持！🐼";
  if (isToday) {
    if (totalCal > calGoal) {
      coachTip = "今日熱量已達標，晚點多喝水散步消化喔！🔥";
    } else if (remainingCal <= 400) {
      coachTip = "熱量控制得非常剛好，即將完美達標！💪";
    } else {
      coachTip = `今天還可以再補充約 ${remainingCal} kcal 的營養餐點！🥗`;
    }
  } else {
    coachTip = `這是 ${todayStr} 的歷史戰報！當天總熱量達成率為 ${calPercent}% 🐼`;
  }

  const appTargetUrl = userGistId ? `https://liff.line.me/${liffId}?gistId=${userGistId}` : `https://liff.line.me/${liffId}`;

  const headerTitle = isToday
    ? (justSavedMeal ? "✅ 紀錄成功！今日總結" : "📊 今日飲食進度看板")
    : `📅 ${todayStr} 歷史總結`;

  return {
    type: "flex",
    altText: isToday
      ? `📊 今日飲食總結：已攝取 ${totalCal} / ${calGoal} kcal`
      : `📅 ${todayStr} 飲食總結：已攝取 ${totalCal} / ${calGoal} kcal`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#000000",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🐼 DAILY DIET", color: "#FDE047", weight: "bold", size: "sm" },
              { type: "text", text: `📅 ${todayStr}`, color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: headerTitle,
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "xs",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FFF1F2",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isToday ? "🔥 今日總熱量" : "🔥 當日總熱量", size: "xxs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${totalCal}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: `kcal (${calPercent}%)`, size: "xxs", color: "#881337", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#EFF6FF",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isToday ? "🥩 今日蛋白質" : "🥩 當日蛋白質", size: "xxs", color: "#2563EB", weight: "bold" },
                  { type: "text", text: `${totalPro}g`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: `/ ${proGoal}g`, size: "xxs", color: "#71717A", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#ECFEFF",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isToday ? "💧 今日水分" : "💧 當日水分", size: "xxs", color: "#0891B2", weight: "bold" },
                  { type: "text", text: `${totalWater}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: `ml`, size: "xxs", color: "#164E63", weight: "bold" }
                ]
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F4F4F5",
            cornerRadius: "10px",
            paddingAll: "10px",
            spacing: "xs",
            contents: [
              { type: "text", text: isToday ? `🍱 今日已記 ${allLogs.length} 餐：` : `🍱 該日已記 ${allLogs.length} 餐：`, size: "xs", weight: "bold", color: "#000000" },
              ...(mealItems.length > 0 ? mealItems : [{ type: "text", text: isToday ? "今日尚未有飲食紀錄" : "該日尚未有飲食紀錄", size: "xs", color: "#A1A1AA" }])
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FEF9C3",
            cornerRadius: "10px",
            paddingAll: "10px",
            contents: [
              { type: "text", text: `💬 熊貓教練：${coachTip}`, size: "xs", color: "#713F12", weight: "bold", wrap: true }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#000000",
            action: {
              type: "postback",
              label: isToday ? "📋 管理今日紀錄" : `📋 管理 ${todayStr} 紀錄`,
              data: JSON.stringify({ action: 'manageMeals', date: todayStr }),
              displayText: isToday ? "📋 管理今日紀錄" : `📋 管理 ${todayStr} 紀錄`
            }
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#EFF6FF",
                flex: 1,
                action: {
                  type: "datetimepicker",
                  label: "📅 查日期",
                  data: JSON.stringify({ action: 'pickDate' }),
                  mode: "date",
                  initial: todayStr,
                  max: getTodayDateString()
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#FEF9C3",
                flex: 1,
                action: {
                  type: "postback",
                  label: "📊 7 日週報",
                  data: JSON.stringify({ action: 'viewWeeklyTrends' }),
                  displayText: "📊 查看 7 日趨勢週報"
                }
              }
            ]
          }
        ]
      }
    }
  };
}

// ========================================================
// 💾 3. 儲存紀錄至個人專屬 Gist
// ========================================================

function saveMealLog(userId, meal, userGistId, pat, props) {
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
    logs.push(meal);
    props.setProperty(todayKey, JSON.stringify(logs));

    // 同步寫入該用戶專屬的 Gist
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

function getUserGoals(userId, props, userGistId) {
  if (!props) props = PropertiesService.getScriptProperties();
  let cal = Number(props.getProperty(`CALORIE_GOAL_${userId}`)) || Number(props.getProperty('CALORIE_GOAL'));
  let pro = Number(props.getProperty(`PROTEIN_GOAL_${userId}`)) || Number(props.getProperty('PROTEIN_GOAL'));
  let wat = Number(props.getProperty(`WATER_GOAL_${userId}`)) || Number(props.getProperty('WATER_GOAL'));

  // ☁️ 若尚未在 Properties 儲存目標，主動向 Gist 雲端資料庫拉取 Web 設定
  if (!cal || !pro || !wat) {
    const gistId = userGistId || props.getProperty(`USER_GIST_${userId}`);
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

function getUserPersona(userId, props, userGistId, pat) {
  if (!props) props = PropertiesService.getScriptProperties();
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
  return persona || 'tsundere';
}

function setUserPersona(userId, persona, userGistId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const validPersona = (persona === 'gentle' || persona === 'hardcore' || persona === 'tsundere') ? persona : 'tsundere';
  props.setProperty(`PERSONA_${userId}`, validPersona);

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

function getPersonaInstruction(persona) {
  if (persona === 'gentle') {
    return `Persona Style: Sweet, gentle, supportive, and healing partner (無比溫柔、體貼、溫馨且鼓勵感滿滿的療癒小幫手熊貓). Praise user, show empathy, encourage with warm tone, never use harsh words.`;
  }
  if (persona === 'hardcore') {
    return `Persona Style: Fiery, energetic, hardcore gym personal trainer (熱血、鐵血健身教練熊貓). Push strictly like a drill sergeant, use gym fitness slang ('動起來！', '把熱量燃燒掉！', '再一組！'), demand strict discipline.`;
  }
  // Default: tsundere
  return `Persona Style: Tsundere Elite Registered Dietitian (毒舌且傲嬌的菁英營養師熊貓). Witty, professional, sarcastic and tsundere (口嫌體正直，犀利吐槽但給予專家飲食建議與 1 個具體改善叮嚀).`;
}

function generateFallbackComment(dishName, calories, protein, persona = 'tsundere') {
  if (persona === 'gentle') {
    if (calories > 700) return `這餐份量很充足呢！記得多喝水幫助代謝，下一餐可以多吃點綠色蔬菜喔 🐼💚`;
    if (protein >= 25) return `蛋白質補充得很棒呢！你今天也很用心照顧自己的身體，繼續加油喔 🐼✨`;
    if (calories < 300) return `吃得比較輕量呢，如果容易餓記得隨時補充健康小點心與水分喔 🐼🌸`;
    return `已經為你記錄好「${dishName}」囉！每一餐都要好好享受，記得補充水分 🐼`;
  }
  if (persona === 'hardcore') {
    if (calories > 700) return `熱量破 ${calories} 大卡了！等下給我深蹲跳繩把多餘熱量全部燃燒掉！🔥💪`;
    if (protein >= 25) return `蛋白質有 ${protein}g 非常到位！肌肉正在修復生長，繼續保持這個訓練強度！🏋️‍♂️`;
    if (calories < 300) return `吃這麼少哪來的力氣重訓？下一餐給我把優質碳水和蛋白質補齊！👊`;
    return `紀錄完畢！吃飽了就別躺在沙發上偷懶，準備動起來！🔥`;
  }
  // tsundere (default)
  if (calories > 700) return `熱量居然飆到 ${calories} 大卡…哼，等下別忘了多喝水，下一餐多吃點青菜贖罪！🐼`;
  if (protein >= 25) return `蛋白質有 ${protein}g 算你過關啦，可別以為這樣就能放肆偷吃甜點喔！🐼`;
  if (calories < 300) return `吃這麼少是想成仙嗎？小心掉肌肉，下一餐給我好好吃正餐！🐼`;
  return `哼，勉強幫你記下「${dishName}」了，下一餐記得多補充點蔬菜跟水分！🐼`;
}

function generateLanguageSelectionFlex(userId, liffId, userGistId, curLang) {
  const isEn = curLang === 'en';
  const appTargetUrl = (liffId ? `https://liff.line.me/${liffId}?tab=profile` : '') + (userGistId ? `&gistId=${userGistId}` : '');

  return {
    type: "flex",
    altText: "🌐 語言設定 / Select Language",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#000000",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🐼 DAILY DIET", color: "#FDE047", weight: "bold", size: "sm" },
              { type: "text", text: "🌐 LANGUAGE", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: "🌐 語言設定 / Select Language",
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            margin: "xs"
          },
          {
            type: "text",
            text: "請選擇您偏好的語言模式 / Choose preferred language",
            color: "#A1A1AA",
            size: "xxs",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: !isEn ? "#FEF9C3" : "#F8FAFC",
            borderColor: "#000000",
            borderWidth: !isEn ? "3px" : "1.5px",
            cornerRadius: "14px",
            paddingAll: "12px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                alignItems: "center",
                contents: [
                  { type: "text", text: "🇹🇼 繁體中文 (Traditional Chinese)", weight: "bold", size: "sm", color: "#000000", flex: 1 },
                  ...(!isEn ? [{ type: "text", text: "✓ 使用中", weight: "bold", size: "xs", color: "#854D0E", align: "end" }] : [])
                ]
              },
              {
                type: "text",
                text: "適合台灣/港澳使用者，提供貼切的生活化飲食分析與道地教練點評。",
                size: "xxs",
                color: "#64748B",
                wrap: true,
                margin: "xs"
              },
              {
                type: "button",
                style: !isEn ? "primary" : "secondary",
                height: "sm",
                color: !isEn ? "#FDE047" : "#FFFFFF",
                margin: "sm",
                action: {
                  type: "postback",
                  label: !isEn ? "✅ 保持繁體中文" : "切換至繁體中文",
                  data: JSON.stringify({ action: 'setLanguage', lang: 'zh' }),
                  displayText: "切換成中文"
                }
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: isEn ? "#FEF9C3" : "#F8FAFC",
            borderColor: "#000000",
            borderWidth: isEn ? "3px" : "1.5px",
            cornerRadius: "14px",
            paddingAll: "12px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                alignItems: "center",
                contents: [
                  { type: "text", text: "🇺🇸 English (Bilingual Mode)", weight: "bold", size: "sm", color: "#000000", flex: 1 },
                  ...(isEn ? [{ type: "text", text: "✓ Active", weight: "bold", size: "xs", color: "#854D0E", align: "end" }] : [])
                ]
              },
              {
                type: "text",
                text: "Food names, portion breakdowns, and coach commentary will be analyzed and delivered in English.",
                size: "xxs",
                color: "#64748B",
                wrap: true,
                margin: "xs"
              },
              {
                type: "button",
                style: isEn ? "primary" : "secondary",
                height: "sm",
                color: isEn ? "#FDE047" : "#FFFFFF",
                margin: "sm",
                action: {
                  type: "postback",
                  label: isEn ? "✅ Active (English)" : "Switch to English",
                  data: JSON.stringify({ action: 'setLanguage', lang: 'en' }),
                  displayText: "Switch to English"
                }
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          ...(appTargetUrl ? [{
            type: "button",
            style: "primary",
            height: "sm",
            color: "#000000",
            action: {
              type: "uri",
              label: "📱 開啟 Web App 完整設定",
              uri: appTargetUrl
            }
          }] : [])
        ]
      }
    }
  };
}

function generatePersonaSelectionFlex(userId, liffId, userGistId, props) {
  const currentPersona = getUserPersona(userId, props, userGistId);
  const personas = [
    { id: 'tsundere', name: '傲嬌毒舌教練', desc: '口嫌體正直、犀利吐槽與專業飲食點評', emoji: '🐼😡', color: '#FEF08A' },
    { id: 'gentle', name: '治癒天使教練', desc: '溫柔體貼、溫馨鼓勵與同理陪伴', emoji: '🐼🥰', color: '#DCFCE7' },
    { id: 'hardcore', name: '魔鬼士官長', desc: '熱血斯巴達、嚴格鞭策燃燒卡路里', emoji: '🐼🔥', color: '#FEE2E2' }
  ];

  const bubbles = personas.map(p => {
    const isCurrent = currentPersona === p.id;
    return {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: p.color,
        paddingAll: "14px",
        contents: [
          { type: "text", text: p.emoji, size: "3xl", align: "center" },
          { type: "text", text: p.name, weight: "bold", size: "md", align: "center", color: "#000000", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          { type: "text", text: p.desc, size: "xs", color: "#52525B", wrap: true, align: "center" },
          {
            type: "text",
            text: isCurrent ? "✅ 目前使用中" : "點擊立即切換",
            size: "xxs",
            weight: "bold",
            color: isCurrent ? "#16A34A" : "#A1A1AA",
            align: "center",
            margin: "md"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: isCurrent ? "secondary" : "primary",
            color: isCurrent ? "#E4E4E7" : "#000000",
            height: "sm",
            action: {
              type: "postback",
              label: isCurrent ? "使用中" : "切換至此性格",
              data: JSON.stringify({ action: 'setPersona', persona: p.id }),
              displayText: `切換教練性格：${p.name}`
            }
          }
        ]
      }
    };
  });

  return {
    type: "flex",
    altText: "🎭 請選擇您偏好的熊貓教練性格",
    contents: {
      type: "carousel",
      contents: bubbles
    }
  };
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

  // ☁️ 若 Properties 內無今日紀錄 (例如用戶都在 Web 記錄)，向 Gist 查詢今日紀錄回填
  if (localLogs.length === 0) {
    const gistId = userGistId || props.getProperty(`USER_GIST_${userId}`);
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

function getTodayDateString() {
  return Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd");
}

function syncLogToUserGist(meal, gistId, pat) {
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

    // 插入新紀錄 (相容 Dexie 格式)
    backupData.dietLogs.unshift({
      date: meal.date,
      dish_name: meal.dish_name,
      calories: Number(meal.calories) || 0,
      protein: Number(meal.protein) || 0,
      carbs: Number(meal.carbs) || 0,
      fat: Number(meal.fat) || 0,
      water: Number(meal.water) || 0,
      timestamp: Date.now(),
      comment: meal.comment || '',
      source: 'LINE_BOT'
    });

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
// 🤖 4. Gemini 辨識與 LINE API 工具
// ========================================================

function getLineImageBlob(messageId, accessToken) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error(`下載 LINE 照片失敗 (${res.getResponseCode()})`);
  }
  return res.getBlob();
}

function updateOrSaveMealLog(userId, updateFields, userGistId, pat, props) {
  const todayStr = getTodayDateString();
  const todayKey = `DIET_LOGS_${userId}_${todayStr}`;
  let logs = getTodayLogs(userId, todayStr, props);

  let targetMeal = null;
  if (logs.length > 0) {
    let targetIndex = logs.length - 1;
    if (updateFields.dish_name) {
      const foundIdx = logs.findIndex(l => l.dish_name && (l.dish_name.includes(updateFields.dish_name) || updateFields.dish_name.includes(l.dish_name)));
      if (foundIdx !== -1) targetIndex = foundIdx;
    }

    targetMeal = logs[targetIndex];
    if (updateFields.dish_name && updateFields.dish_name !== targetMeal.dish_name) {
      targetMeal.dish_name = updateFields.dish_name;
    }
    if (updateFields.calories !== undefined) targetMeal.calories = Number(updateFields.calories);
    if (updateFields.protein !== undefined) targetMeal.protein = Number(updateFields.protein);
    if (updateFields.water !== undefined) targetMeal.water = Number(updateFields.water);
    if (updateFields.comment !== undefined) targetMeal.comment = updateFields.comment;

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
      id: Date.now(),
      date: todayStr,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
      dish_name: updateFields.dish_name || '餐點',
      calories: Number(updateFields.calories) || 0,
      protein: Number(updateFields.protein) || 0,
      water: Number(updateFields.water) || 0,
      comment: updateFields.comment || ''
    };
    saveMealLog(userId, targetMeal, userGistId, pat, props);
  }

  return targetMeal;
}

function updateMealInUserGist(updatedMeal, gistId, pat) {
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
        if (backupData.dietLogs[i].id && updatedMeal.id && backupData.dietLogs[i].id === updatedMeal.id) {
          backupData.dietLogs[i].calories = Number(updatedMeal.calories) || 0;
          backupData.dietLogs[i].protein = Number(updatedMeal.protein) || 0;
          backupData.dietLogs[i].water = Number(updatedMeal.water) || 0;
          if (updatedMeal.dish_name) backupData.dietLogs[i].dish_name = updatedMeal.dish_name;
          found = true;
          break;
        }
      }
      if (!found && backupData.dietLogs.length > 0) {
        backupData.dietLogs[0].calories = Number(updatedMeal.calories) || 0;
        backupData.dietLogs[0].protein = Number(updatedMeal.protein) || 0;
        backupData.dietLogs[0].water = Number(updatedMeal.water) || 0;
        if (updatedMeal.dish_name) backupData.dietLogs[0].dish_name = updatedMeal.dish_name;
      }
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

function analyzeMealWithGemini(base64Image, apiKey, userId, props, userGistId, pat) {
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-2.5-flash'
  ];

  const userPersona = getUserPersona(userId, props, userGistId, pat);
  const personaInstruction = getPersonaInstruction(userPersona);
  const userLang = getUserLanguage(userId, props, userGistId, pat);
  const isEn = userLang === 'en';

  const langDirective = isEn 
    ? `LANGUAGE REQUIREMENT: Output strictly in ENGLISH (US English).
- "dish_name": English name of the meal (e.g. "Crispy Fried Chicken with Rice and Cabbage").
- "breakdown": item names and portion estimates in English (e.g. "Fried chicken drumstick ~180g", "Steamed white rice ~160g").
- "calculation_note": full calculation formula in English.
- "panda_comment": keep strictly under 35 English words, in your designated persona style.`
    : `LANGUAGE REQUIREMENT: Output strictly in TRADITIONAL CHINESE (繁體中文).
- "dish_name": 餐點名稱 (繁體中文).
- "breakdown": 食材名稱與份量估算 (繁體中文).
- "calculation_note": 計算公式簡述 (繁體中文).
- "panda_comment": 繁體中文 35 字以內，符合性格設定。`;

  const prompt = `You are a professional nutrition expert panda. Analyze this food image. Return STRICTLY a raw JSON object. NO MARKDOWN.
${personaInstruction}
${langDirective}

CRITICAL NUTRITIONAL EVALUATION RULES FOR "panda_comment":
1. NEVER give generic polite compliments. Never say generic "looks balanced" unless the meal truly contains high dietary fiber/vegetables, lean quality protein, and unprocessed complex carbs.
2. Critically inspect the meal:
   - High oil / deep-fried / greasy / high sodium: roast the grease/sodium in character, warn about excess fat calories, and demand drinking water.
   - High refined sugar / dessert / sweet beverage: roast the blood sugar spike and lack of satiety.
   - Heavy carbs with little protein/veg: point out the muscle-wasting protein deficit and lack of fiber.
   - High protein: acknowledge the good protein intake in character, but check if veggies/fiber are missing.
   - If truly balanced: praise specific good components.
3. Provide EXACTLY 1 actionable, practical improvement tip for the next meal or rest of the day.

Required Schema:
{
  "dish_name": "Meal Name (${isEn ? 'English' : 'Traditional Chinese'})",
  "calories": <integer calories in kcal, 0 if unknown>,
  "protein": <integer protein in grams, 0 if unknown>,
  "carbs": <integer estimated carbohydrates in grams, 0 if unknown>,
  "fat": <integer estimated total fat in grams, 0 if unknown>,
  "water": <integer estimated water/liquid intake in ml, e.g. 500 for soup/beverage, or 0 if dry food>,
  "breakdown": [
    {
      "name": "食材/餐點品項名稱 (e.g. 炸雞腿, 白飯, 炒青菜)",
      "portion": "估計份量 (e.g. 1 支約 180g, 1 碗約 160g)",
      "calories": <integer calories in kcal>,
      "protein": <integer protein in grams>
    }
  ],
  "calculation_note": "計算過程簡述 (Traditional Chinese, e.g. 炸雞腿1支約380卡 + 白飯1碗約220卡 + 炒高麗菜約50卡 = 總計650卡)",
  "panda_comment": "<Concise, witty, critical nutritional evaluation matching selected persona in Traditional Chinese, max 35 characters>"
}`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json"
    }
  };

  let lastError = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      if (res.getResponseCode() !== 200) throw new Error(res.getContentText());

      const data = JSON.parse(res.getContentText());
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      recordAiUsage(model, true, props);

      const dishName = parsed.dish_name || "美味餐點";
      const cal = Number(parsed.calories) || 0;
      const pro = Number(parsed.protein) || 0;
      const carbs = Number(parsed.carbs) || 0;
      const fat = Number(parsed.fat) || 0;
      const water = Number(parsed.water) || 0;
      const breakdown = Array.isArray(parsed.breakdown) ? parsed.breakdown : [];
      const calculationNote = parsed.calculation_note || '';
      const comment = (parsed.panda_comment && parsed.panda_comment.trim()) ? parsed.panda_comment.trim() : generateFallbackComment(dishName, cal, pro, userPersona);

      return {
        dish_name: dishName,
        calories: cal,
        protein: pro,
        carbs: carbs,
        fat: fat,
        water: water,
        breakdown: breakdown,
        calculation_note: calculationNote,
        panda_comment: comment
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Gemini 辨識失敗：${lastError?.message || '未知錯誤'}`);
}

function parseTextWithGemini(text, apiKey, userId, props, userGistId, pat) {
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-2.5-flash'
  ];

  const userPersona = getUserPersona(userId, props, userGistId, pat);
  const personaInstruction = getPersonaInstruction(userPersona);

  const prompt = `You are a professional nutrition expert panda for a diet tracking app. Analyze this user message: "${text}".
${personaInstruction}

Determine if the user is describing food, a drink, or a meal they ate/drank.

If it IS food/meal/drink:
Return ONLY raw JSON:
{
  "is_food": true,
  "dish_name": "餐點名稱 (Traditional Chinese)",
  "calories": <integer estimated calories in kcal, 0 if unknown>,
  "protein": <integer estimated protein in grams, 0 if unknown>,
  "carbs": <integer estimated carbohydrates in grams, 0 if unknown>,
  "fat": <integer estimated total fat in grams, 0 if unknown>,
  "water": <integer estimated liquid/water intake in ml, e.g. 500 for coffee/tea/water/soup, or 0 if dry food>,
  "breakdown": [
    {
      "name": "食材/餐點品項名稱 (e.g. 滷蛋, 陽春麵)",
      "portion": "估計份量 (e.g. 1 顆約 50g, 1 碗約 200g)",
      "calories": <integer calories in kcal>,
      "protein": <integer protein in grams>
    }
  ],
  "calculation_note": "計算過程簡述 (e.g. 陽春麵1碗約350卡 + 滷蛋1顆約75卡 = 總計425卡)",
  "panda_comment": "<Critical, witty nutritional evaluation with 1 actionable tip matching selected persona in Traditional Chinese, max 35 characters. DO NOT generically say 營養均衡 unless truly balanced with greens and lean protein>"
}

If it is NOT food (e.g. "XD", laughter, greetings "你好", questions, casual chat):
Return ONLY raw JSON:
{
  "is_food": false,
  "reply": "符合選擇性格（${userPersona}）的繁體中文親切幽默回覆，並提醒可以傳送照片或輸入吃了什麼來記錄 🐼"
}
Do NOT wrap in markdown backticks.`;

  for (let i = 0; i < models.length; i++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${models[i]}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, response_mime_type: "application/json" } }),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed.is_food === false) {
          return {
            is_food: false,
            reply: parsed.reply || (userPersona === 'gentle' ? "哈囉！我是您的治癒系飲食小幫手 🐼🥰，今天吃了什麼美味好料呢？隨時傳送照片或打字跟我分享喔！" : userPersona === 'hardcore' ? "嘿！我是你的魔鬼教練 🐼🔥！吃了什麼趕快老實報上來，別想偷吃垃圾食物！" : "哈囉！我是您的 AI 傲嬌教練 🐼，隨時傳送餐點照片或打字告訴我吃了什麼，我來幫您嚴格把關！")
          };
        }

        const dishName = parsed.dish_name || text;
        const cal = Number(parsed.calories) || 0;
        const pro = Number(parsed.protein) || 0;
        const carbs = Number(parsed.carbs) || 0;
        const fat = Number(parsed.fat) || 0;
        const water = Number(parsed.water) || 0;
        const breakdown = Array.isArray(parsed.breakdown) ? parsed.breakdown : [];
        const calculationNote = parsed.calculation_note || '';
        const comment = (parsed.panda_comment && parsed.panda_comment.trim()) ? parsed.panda_comment.trim() : generateFallbackComment(dishName, cal, pro, userPersona);

        return {
          is_food: true,
          dish_name: dishName,
          calories: cal,
          protein: pro,
          carbs: carbs,
          fat: fat,
          water: water,
          breakdown: breakdown,
          calculation_note: calculationNote,
          panda_comment: comment
        };
      }
    } catch (e) { }
  }
  return {
    is_food: false,
    reply: "收到！我是您的 AI 熊貓飲食教練 🐼，隨時傳送餐點照片或輸入食物名稱，我來為您分析營養！"
  };
}


function attachQuickReply(message, userId, props) {
  if (!userId || !props) return message;
  try {
    const favorites = getUserFavorites(userId, props);
    const items = [];

    // 🌟 1. 飲控人最常用：⭐ 常用餐點永遠擺在第一顆最前面！
    items.push({
      type: "action",
      action: {
        type: "message",
        label: "⭐ 常用餐點",
        text: "常用"
      }
    });

    // 🌟 2. 若用戶有存常用餐點，直接奉上前 3~4 顆一鍵記帳膠囊 (0秒入帳)！
    if (favorites && favorites.length > 0) {
      favorites.slice(0, 4).forEach(fav => {
        items.push({
          type: "action",
          action: {
            type: "postback",
            label: `⭐ ${(fav.dish_name || '常用').slice(0, 8)}`,
            data: JSON.stringify({
              action: 'quickLogFavorite',
              name: encodeURIComponent(fav.dish_name),
              cal: fav.calories,
              pro: fav.protein,
              wat: fav.water || 0
            }),
            displayText: `⚡ 快捷記錄：${fav.dish_name}`
          }
        });
      });
    }

    // 💧 3. 補水打卡
    items.push({
      type: "action",
      action: {
        type: "postback",
        label: "💧 補水 500",
        data: JSON.stringify({ action: 'quickWater', amount: 500 }),
        displayText: "💧 喝水 500ml"
      }
    });

    // 📊 4. 今日總結
    items.push({
      type: "action",
      action: {
        type: "message",
        label: "📊 今日總結",
        text: "今日"
      }
    });

    // 📅 5. 查歷史日期 (原生滾輪)
    items.push({
      type: "action",
      action: {
        type: "datetimepicker",
        label: "📅 查日期",
        data: JSON.stringify({ action: 'pickDate' }),
        mode: "date",
        initial: getTodayDateString(),
        max: getTodayDateString()
      }
    });

    // 💡 6. 全部功能說明
    items.push({
      type: "action",
      action: {
        type: "message",
        label: "💡 全部功能",
        text: "說明"
      }
    });

    message.quickReply = { items: items.slice(0, 13) };
  } catch (e) {
    console.error("attachQuickReply error:", e);
  }
  return message;
}

function replyFlexMessage(replyToken, flexMessage, accessToken, userId, props) {
  try {
    if (userId && props) {
      attachQuickReply(flexMessage, userId, props);
    }
    const res = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      payload: JSON.stringify({
        replyToken: replyToken,
        messages: [flexMessage]
      }),
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    if (code !== 200) {
      const errBody = res.getContentText();
      console.error(`🚨 [LINE Flex 錯誤] Status: ${code}, Body:`, errBody);
      recordSystemLog('LINE發送失敗', 'line_api', flexMessage.altText || 'Flex卡片', `HTTP ${code}`, errBody);
    }
  } catch (err) {
    console.error("🚨 [LINE Flex 發送失敗]:", err);
    recordSystemLog('LINE連線異常', 'line_api', '網路例外', '', err.message);
  }
}

function replyTextMessage(replyToken, text, accessToken, userId, props) {
  try {
    const textMsg = { type: "text", text: text };
    if (userId && props) {
      attachQuickReply(textMsg, userId, props);
    }
    const res = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      payload: JSON.stringify({
        replyToken: replyToken,
        messages: [textMsg]
      }),
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    if (code !== 200) {
      const errBody = res.getContentText();
      console.error(`🚨 [LINE 文字錯誤] Status: ${code}, Body:`, errBody);
      recordSystemLog('LINE發送失敗', 'line_api', text.slice(0, 30), `HTTP ${code}`, errBody);
    }
  } catch (err) {
    console.error("🚨 [LINE 文字發送失敗]:", err);
  }
}

function sendLineLoadingAnimation(userId, accessToken, loadingSeconds) {
  if (!userId || !accessToken || !userId.startsWith('U')) return;
  try {
    const seconds = Math.min(60, Math.max(5, Math.round((loadingSeconds || 20) / 5) * 5));
    const res = UrlFetchApp.fetch("https://api.line.me/v2/bot/chat/loading/start", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      payload: JSON.stringify({
        chatId: userId,
        loadingSeconds: seconds
      }),
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    if (code !== 202 && code !== 200) {
      console.warn(`[Loading Animation] Status: ${code}, Body: ${res.getContentText()}`);
    } else {
      console.log(`⚡ [Loading Animation] 已成功為用戶 ${userId} 啟動 ${seconds}s 正在輸入中動畫`);
    }
  } catch (e) {
    console.warn("發送 Loading 動畫失敗:", e);
  }
}

// ========================================================
// 🎯 5. AI 個人化體態目標分析與修改核心
// ========================================================

function handleGoalSettingWithAI(replyToken, userId, userText, userGistId, pat, props, liffId, channelAccessToken, apiKey) {
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-2.5-flash'
  ];

  const prompt = `You are an expert fitness and nutrition coach panda for a diet tracking app.
The user is sending a message to set/adjust their diet goals or asking for body transformation advice: "${userText}".

Analyze the message to extract or estimate:
- gender ("男" or "女", default "男")
- height (cm, default 170)
- weight (kg, default 65)
- age (years, default 28)
- goal_type: "減脂" (fat loss), "增肌" (muscle gain), "維持體態" (maintain/recomp), "極速減脂" (fast cut)
- If user directly gave numerical targets (e.g. 1800卡 120蛋 2500水), respect those targets.

Scientific Formulas:
- BMR = 10 * weight + 6.25 * height - 5 * age + (gender === '男' ? 5 : -161)
- TDEE = Math.round(BMR * 1.375) (assuming moderate activity)
- Target Calories: 
    減脂: TDEE - 400 ~ 500 kcal
    增肌: TDEE + 300 ~ 400 kcal
    維持: TDEE
- Target Protein:
    減脂: Math.round(weight * 2.0) g
    增肌: Math.round(weight * 2.0) g
    維持: Math.round(weight * 1.6) g
- Target Water: Math.round(weight * 35) ml
- panda_advice: 繁體中文，溫暖專業的熊貓教練個人化建議（約 60-100 字），說明針對其體型與目標規劃的熱量缺口/盈餘、蛋白質與水分攝取重點、以及預期的體型變化方向。

Return ONLY a raw JSON object with keys:
{
  "calories": <integer>,
  "protein": <integer>,
  "water": <integer>,
  "goal_type": "減脂 / 增肌 / 維持體態",
  "summary": "175cm / 70kg / 男 ➔ 減脂雕塑",
  "bmr": <integer>,
  "tdee": <integer>,
  "panda_advice": "針對您的體重 70kg 與減脂需求，規劃每日熱量缺口約 450 kcal，同時拉高蛋白質至 140g 保留肌肉量。記得每天喝足 2500ml 水分加速代謝喔！🐼"
}
Do NOT wrap in markdown backticks.`;

  for (let i = 0; i < models.length; i++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${models[i]}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        const calories = Number(parsed.calories) || DEFAULT_CALORIE_GOAL;
        const protein = Number(parsed.protein) || DEFAULT_PROTEIN_GOAL;
        const water = Number(parsed.water) || DEFAULT_WATER_GOAL;

        // 1. 儲存至 PropertiesService (個人專屬目標)
        props.setProperty(`CALORIE_GOAL_${userId}`, String(calories));
        props.setProperty(`PROTEIN_GOAL_${userId}`, String(protein));
        props.setProperty(`WATER_GOAL_${userId}`, String(water));

        // 2. 同步至雲端 Gist
        if (pat && userGistId) {
          try {
            syncGoalsToUserGist({ calories, protein, water }, userGistId, pat);
          } catch (e) {
            console.error("同步目標至 Gist 失敗:", e);
          }
        }

        // 3. 回覆 Flex 卡片
        const goalFlex = generateGoalSettingFlex(parsed, calories, protein, water, liffId, userGistId);
        replyFlexMessage(replyToken, goalFlex, channelAccessToken);
        return true;
      }
    } catch (e) {
      console.error("設定目標失敗:", e);
    }
  }

  // Fallback
  replyTextMessage(replyToken, "🐼 熊貓教練提示：請輸入您的身高、體重、性別與目標，例如：\n「改目標 175cm 70kg 男 減脂」\n或直接輸入：「改目標 1800卡 120蛋 2500水」", channelAccessToken);
  return false;
}

function generateGoalSettingFlex(info, cal, pro, wat, liffId, userGistId) {
  const appTargetUrl = userGistId ? `https://liff.line.me/${liffId}?gistId=${userGistId}` : `https://liff.line.me/${liffId}`;

  return {
    type: "flex",
    altText: `🎯 個人飲食目標已更新：${cal} kcal / 蛋白質 ${pro}g / 水分 ${wat}ml`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#000000",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🐼 DAILY DIET", color: "#FDE047", weight: "bold", size: "sm" },
              { type: "text", text: info.goal_type ? `🎯 ${info.goal_type}` : "🎯 目標設定", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: "✅ 個人專屬體態目標已生效！",
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            margin: "xs"
          },
          {
            type: "text",
            text: info.summary || "客製化科學營養規劃",
            color: "#A1A1AA",
            size: "xxs",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "xs",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FFF1F2",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "🔥 每日熱量", size: "xxs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${cal}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "kcal / 天", size: "xxs", color: "#881337", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#EFF6FF",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "🥩 蛋白質", size: "xxs", color: "#2563EB", weight: "bold" },
                  { type: "text", text: `${pro}g`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "克 / 天", size: "xxs", color: "#1E3A8A", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#ECFEFF",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "💧 每日水分", size: "xxs", color: "#0891B2", weight: "bold" },
                  { type: "text", text: `${wat}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "ml / 天", size: "xxs", color: "#164E63", weight: "bold" }
                ]
              }
            ]
          },
          ...(info.bmr && info.tdee ? [{
            type: "box",
            layout: "horizontal",
            backgroundColor: "#F4F4F5",
            cornerRadius: "10px",
            paddingAll: "10px",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "🧬 基礎代謝 (BMR)", size: "xxs", color: "#71717A", weight: "bold" },
                  { type: "text", text: `${info.bmr} kcal`, size: "xs", color: "#18181B", weight: "bold", margin: "xs" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "⚡ 每日消耗 (TDEE)", size: "xxs", color: "#71717A", weight: "bold" },
                  { type: "text", text: `${info.tdee} kcal`, size: "xs", color: "#18181B", weight: "bold", margin: "xs" }
                ]
              }
            ]
          }] : []),
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FEF9C3",
            cornerRadius: "10px",
            paddingAll: "10px",
            contents: [
              { type: "text", text: "🐼 熊貓教練體態變化建議：", size: "xs", color: "#713F12", weight: "bold" },
              {
                type: "text",
                text: info.panda_advice || "持之以恆記錄飲食，熊貓教練會陪您一起達成理想身材！",
                size: "xs",
                color: "#18181B",
                wrap: true,
                margin: "xs"
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#FDE047",
            action: {
              type: "uri",
              label: "📱 開啟 App 查看目標進度",
              uri: appTargetUrl
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#F4F4F5",
            action: {
              type: "postback",
              label: "✏️ 填入輸入框自訂調整",
              data: JSON.stringify({ action: 'fillGoal' }),
              inputOption: "openKeyboard",
              fillInText: `改目標 ${cal}卡 ${pro}蛋 ${wat}水`
            }
          }
        ]
      }
    }
  };
}

function generateGoalGuideFlex(userId, liffId, userGistId) {
  const appTargetUrl = userGistId ? `https://liff.line.me/${liffId}?tab=goals&gistId=${userGistId}` : `https://liff.line.me/${liffId}?tab=goals`;

  return {
    type: "flex",
    altText: "🎯 AI 智能體態目標推薦導引：告訴教練身高體重與目標，自動規劃！",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#000000",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🐼 DAILY DIET", color: "#FDE047", weight: "bold", size: "sm" },
              { type: "text", text: "🪄 AI 智能推薦", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: "🎯 AI 體態目標自動推薦",
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            margin: "xs"
          },
          {
            type: "text",
            text: "不需要自己算熱量！告訴教練身材，AI 自動規劃",
            color: "#A1A1AA",
            size: "xxs",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FEF9C3",
            cornerRadius: "12px",
            paddingAll: "12px",
            borderColor: "#000000",
            borderWidth: "2px",
            contents: [
              {
                type: "text",
                text: "💡 什麼是智能推薦？",
                weight: "bold",
                size: "xs",
                color: "#854D0E"
              },
              {
                type: "text",
                text: "不必自己計算熱量！只要告訴熊貓教練您的【身高、體重、性別與期望目標】，AI 將依據醫學 BMR/TDEE 公式與活動量，自動規劃每日熱量赤字/盈餘、蛋白質與飲水建議！",
                size: "xxs",
                color: "#713F12",
                wrap: true,
                margin: "xs"
              }
            ]
          },
          {
            type: "text",
            text: "👇 點擊下方快速範例，帶入後微調送出：",
            weight: "bold",
            size: "xs",
            color: "#000000"
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#DCFCE7",
                flex: 1,
                action: {
                  type: "postback",
                  label: "🏃‍♀️ 女生減脂",
                  data: JSON.stringify({ action: 'fillGoal' }),
                  inputOption: "openKeyboard",
                  fillInText: "改目標 160cm 52kg 女 減脂"
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#FEF08A",
                flex: 1,
                action: {
                  type: "postback",
                  label: "🥗 男生減脂",
                  data: JSON.stringify({ action: 'fillGoal' }),
                  inputOption: "openKeyboard",
                  fillInText: "改目標 175cm 75kg 男 減脂"
                }
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#EFF6FF",
                flex: 1,
                action: {
                  type: "postback",
                  label: "💪 男生增肌",
                  data: JSON.stringify({ action: 'fillGoal' }),
                  inputOption: "openKeyboard",
                  fillInText: "改目標 175cm 68kg 男 增肌"
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#F3E8FF",
                flex: 1,
                action: {
                  type: "postback",
                  label: "🧘 維持體態",
                  data: JSON.stringify({ action: 'fillGoal' }),
                  inputOption: "openKeyboard",
                  fillInText: "改目標 165cm 55kg 女 維持體態"
                }
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F4F4F5",
            cornerRadius: "10px",
            paddingAll: "10px",
            contents: [
              {
                type: "text",
                text: "✏️ 若已有專屬菜單，也可以直接指定數值：\n「改目標 1800卡 120蛋 2500水」",
                size: "xxs",
                color: "#52525B",
                wrap: true
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#FDE047",
            action: {
              type: "uri",
              label: "⚙️ 開啟 App 完整目標設定 (TDEE)",
              uri: appTargetUrl
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#F4F4F5",
            action: {
              type: "postback",
              label: "💬 填入我的身材數據",
              data: JSON.stringify({ action: 'fillGoal' }),
              inputOption: "openKeyboard",
              fillInText: "改目標 165cm 55kg 女 減脂"
            }
          }
        ]
      }
    }
  };
}

function generateCurrentGoalFlex(userId, goals, liffId, userGistId) {
  const cal = goals.calories || 2000;
  const pro = goals.protein || 100;
  const wat = goals.water || 2500;
  const appTargetUrl = userGistId ? `https://liff.line.me/${liffId}?tab=goals&gistId=${userGistId}` : `https://liff.line.me/${liffId}?tab=goals`;

  return {
    type: "flex",
    altText: `🎯 目前每日飲食目標：${cal} kcal / 蛋白質 ${pro}g / 水分 ${wat}ml`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#000000",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🐼 DAILY DIET", color: "#FDE047", weight: "bold", size: "sm" },
              { type: "text", text: "🎯 目前設定目標", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: "🎯 您的每日營養目標進度",
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "xs",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FFF1F2",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "🔥 每日熱量", size: "xxs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${cal}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "kcal / 天", size: "xxs", color: "#881337", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#EFF6FF",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "🥩 蛋白質", size: "xxs", color: "#2563EB", weight: "bold" },
                  { type: "text", text: `${pro}g`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "克 / 天", size: "xxs", color: "#1E3A8A", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#ECFEFF",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "💧 每日水分", size: "xxs", color: "#0891B2", weight: "bold" },
                  { type: "text", text: `${wat}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "ml / 天", size: "xxs", color: "#164E63", weight: "bold" }
                ]
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F4F4F5",
            cornerRadius: "10px",
            paddingAll: "10px",
            contents: [
              {
                type: "text",
                text: "💡 如何修改目標？\n不需自己算熱量！直接輸入「改目標 165cm 55kg 女 減脂」，AI 自動推薦最佳熱量與蛋白質！\n也可手動指定：「改目標 1800卡 120蛋 2500水」",
                size: "xxs",
                color: "#52525B",
                wrap: true
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#FDE047",
            action: {
              type: "uri",
              label: "⚙️ 開啟 App 完整目標設定",
              uri: appTargetUrl
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#F4F4F5",
            action: {
              type: "postback",
              label: "🪄 依身材智能推薦目標",
              data: JSON.stringify({ action: 'goalGuide' }),
              displayText: "設定目標"
            }
          }
        ]
      }
    }
  };
}

function syncGoalsToUserGist(goals, gistId, pat) {
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
    if (!backupData.settings) backupData.settings = [];

    const upsertSetting = (key, val) => {
      const idx = backupData.settings.findIndex(s => s.key === key);
      if (idx !== -1) backupData.settings[idx].value = val;
      else backupData.settings.push({ key, value: val });
    };

    if (goals.calories) {
      upsertSetting('calorie_goal', goals.calories);
      upsertSetting('user_calories', goals.calories);
    }
    if (goals.protein) {
      upsertSetting('protein_goal', goals.protein);
      upsertSetting('user_protein', goals.protein);
    }
    if (goals.water) {
      upsertSetting('water_goal', goals.water);
      upsertSetting('user_water', goals.water);
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

// ========================================================
// 📋 6. 今日餐點管理面板 (Neo-Brutalist 視覺設計)
// ========================================================

function generateMealManagementFlex(userId, liffId, userGistId, props, targetDateStr) {
  const todayStr = targetDateStr || getTodayDateString();
  const isToday = todayStr === getTodayDateString();
  const allLogs = getTodayLogs(userId, todayStr, props, userGistId);
  const appTargetUrl = `https://liff.line.me/${liffId}?userId=${userId}${userGistId ? `&gistId=${userGistId}` : ''}`;

  let totalCal = 0;
  const mealBoxes = [];

  if (allLogs.length === 0) {
    mealBoxes.push({
      type: "box",
      layout: "vertical",
      backgroundColor: "#FEF9C3",
      cornerRadius: "12px",
      paddingAll: "16px",
      alignItems: "center",
      contents: [
        { type: "text", text: isToday ? "🍱 今日尚未記錄任何餐點喔！" : `🍱 ${todayStr} 無任何飲食紀錄喔！`, size: "sm", color: "#713F12", weight: "bold" },
        { type: "text", text: "傳送照片或輸入菜名，熊貓教練幫您記錄！🐼", size: "xs", color: "#A16207", margin: "xs" }
      ]
    });
  } else {
    allLogs.forEach((log, index) => {
      totalCal += Number(log.calories) || 0;
      const dishName = log.dish_name || '餐點';
      const encodedName = encodeURIComponent(dishName);
      const editAppUrl = `https://liff.line.me/${liffId}?action=editMeal&name=${encodedName}&cal=${log.calories}&pro=${log.protein}&wat=${log.water || 0}&userId=${userId}${userGistId ? `&gistId=${userGistId}` : ''}`;

      let timeText = log.time || '';
      if (!timeText && log.timestamp) {
        try {
          timeText = Utilities.formatDate(new Date(Number(log.timestamp)), "Asia/Taipei", "HH:mm");
        } catch (e) {}
      }

      const catEmojiMap = {
        'breakfast': '🍳 早餐',
        'lunch': '🍱 午餐',
        'dinner': '🍲 晚餐',
        'snack': '☕ 點心',
        'water': '🚰 補水'
      };
      const catPrefix = log.category && catEmojiMap[log.category] ? `[${catEmojiMap[log.category]}] ` : '';

      mealBoxes.push({
        type: "box",
        layout: "vertical",
        backgroundColor: "#FFFFFF",
        cornerRadius: "12px",
        borderColor: "#E4E4E7",
        borderWidth: "1px",
        paddingAll: "12px",
        spacing: "sm",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: `${index + 1}. ${catPrefix}${dishName}`, size: "sm", color: "#18181B", weight: "bold", flex: 3, wrap: true },
              { type: "text", text: timeText, size: "xxs", color: "#A1A1AA", flex: 1, align: "end" }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "xs",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                backgroundColor: "#FFF1F2",
                cornerRadius: "6px",
                paddingStart: "6px",
                paddingEnd: "6px",
                paddingTop: "2px",
                paddingBottom: "2px",
                contents: [{ type: "text", text: `🔥 ${log.calories} kcal`, size: "xxs", color: "#E11D48", weight: "bold" }]
              },
              {
                type: "box",
                layout: "horizontal",
                backgroundColor: "#EFF6FF",
                cornerRadius: "6px",
                paddingStart: "6px",
                paddingEnd: "6px",
                paddingTop: "2px",
                paddingBottom: "2px",
                contents: [{ type: "text", text: `🥩 ${log.protein}g`, size: "xxs", color: "#2563EB", weight: "bold" }]
              },
              {
                type: "box",
                layout: "horizontal",
                backgroundColor: "#ECFEFF",
                cornerRadius: "6px",
                paddingStart: "6px",
                paddingEnd: "6px",
                paddingTop: "2px",
                paddingBottom: "2px",
                contents: [{ type: "text", text: `💧 ${log.water || 0}ml`, size: "xxs", color: "#0891B2", weight: "bold" }]
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            margin: "xs",
            contents: [
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#F4F4F5",
                flex: 1,
                action: {
                  type: "postback",
                  label: "✏️ 微調",
                  data: JSON.stringify({ action: 'fillEdit', id: log.id }),
                  inputOption: "openKeyboard",
                  fillInText: `改 ${dishName} ${log.calories}卡 ${log.protein || 0}蛋 ${log.water || 0}水`
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#FFF1F2",
                flex: 1,
                action: {
                  type: "postback",
                  label: "🗑️ 刪除",
                  data: JSON.stringify({ action: 'deleteMeal', id: log.id, index: index, date: todayStr }),
                  displayText: `🗑️ 刪除餐點：${log.dish_name}`
                }
              }
            ]
          }
        ]
      });
    });
  }

  return {
    type: "flex",
    altText: `📋 ${isToday ? '今日' : todayStr} 餐點管理清單（共 ${allLogs.length} 餐，累計 ${totalCal} kcal）`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#000000",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🐼 DAILY DIET", color: "#FDE047", weight: "bold", size: "sm" },
              { type: "text", text: `📅 ${todayStr}`, color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: isToday ? "📋 今日餐點管理清單" : `📋 ${todayStr} 餐點管理清單`,
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            margin: "xs"
          },
          {
            type: "text",
            text: `${isToday ? '今日' : '該日'}已記錄 ${allLogs.length} 餐 ｜ 累計攝取 ${totalCal} kcal`,
            color: "#FDE047",
            size: "xxs",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        backgroundColor: "#FAFAFA",
        contents: mealBoxes
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#000000",
            action: {
              type: "postback",
              label: isToday ? "📊 查看今日總結" : `📊 查看 ${todayStr} 總結`,
              data: JSON.stringify({ action: 'pickDate', date: todayStr }),
              displayText: isToday ? "📊 查看今日總結" : `📊 查看 ${todayStr} 總結`
            }
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#EFF6FF",
                flex: 1,
                action: {
                  type: "datetimepicker",
                  label: "📅 換日期",
                  data: JSON.stringify({ action: 'pickDate' }),
                  mode: "date",
                  initial: todayStr,
                  max: getTodayDateString()
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#FEF9C3",
                flex: 1,
                action: {
                  type: "postback",
                  label: "📈 7 日週報",
                  data: JSON.stringify({ action: 'viewWeeklyTrends' }),
                  displayText: "📊 查看 7 日趨勢週報"
                }
              }
            ]
          },
          ...(isToday && allLogs.length > 0 ? [{
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#FFF1F2",
            action: {
              type: "postback",
              label: "🗑️ 清空今日所有紀錄",
              data: JSON.stringify({ action: 'clearTodayConfirm' }),
              displayText: "🗑️ 清空今日紀錄"
            }
          }] : [])
        ]
      }
    }
  };
}

// ========================================================
// 📊 6.5. 7 日飲食趨勢與歷史週報 (Neo-Brutalist 視覺圖表)
// ========================================================

function getRecentDaysLogs(userId, days, props, userGistId) {
  if (!props) props = PropertiesService.getScriptProperties();
  const gistId = userGistId || props.getProperty(`USER_GIST_${userId}`);
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
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = Utilities.formatDate(d, "Asia/Taipei", "yyyy-MM-dd");
    const displayDate = Utilities.formatDate(d, "Asia/Taipei", "MM/dd");
    const dayOfWeek = weekdays[d.getDay()];

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

function generateWeeklyTrendsFlex(userId, liffId, userGistId, props) {
  const daysData = getRecentDaysLogs(userId, 7, props, userGistId);
  const goals = getUserGoals(userId, props, userGistId);
  const goalCal = Number(goals.calories) || 2000;
  const goalPro = Number(goals.protein) || 100;

  let totalCalSum = 0;
  let totalProSum = 0;
  let loggedDaysCount = 0;
  let targetMetDays = 0;

  daysData.forEach(d => {
    if (d.totalCal > 0) {
      totalCalSum += d.totalCal;
      totalProSum += d.totalPro;
      loggedDaysCount++;
      if (d.totalCal <= goalCal * 1.15 && d.totalCal >= goalCal * 0.7) {
        targetMetDays++;
      }
    }
  });

  const avgCal = loggedDaysCount > 0 ? Math.round(totalCalSum / loggedDaysCount) : 0;
  const avgPro = loggedDaysCount > 0 ? Math.round(totalProSum / loggedDaysCount) : 0;

  // 繪製 7 天水平長條圖
  const chartRows = daysData.map(d => {
    const isToday = d.date === getTodayDateString();
    const pct = goalCal > 0 ? Math.min(100, Math.round((d.totalCal / goalCal) * 100)) : 0;
    
    let barColor = "#10B981"; // 理想綠
    if (d.totalCal === 0) {
      barColor = "#E4E4E7"; // 無紀錄
    } else if (d.totalCal > goalCal * 1.15) {
      barColor = "#F43F5E"; // 超標紅
    } else if (d.totalCal < goalCal * 0.7) {
      barColor = "#F59E0B"; // 偏低黃
    }

    return {
      type: "box",
      layout: "horizontal",
      alignItems: "center",
      spacing: "sm",
      margin: "xs",
      contents: [
        {
          type: "text",
          text: `${d.dayOfWeek} ${d.displayDate}${isToday ? '★' : ''}`,
          size: "xs",
          color: isToday ? "#000000" : "#52525B",
          weight: isToday ? "bold" : "regular",
          flex: 4
        },
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#F4F4F5",
          cornerRadius: "6px",
          height: "12px",
          flex: 5,
          contents: [
            {
              type: "box",
              layout: "vertical",
              backgroundColor: barColor,
              cornerRadius: "6px",
              height: "12px",
              width: `${Math.max(6, pct)}%`,
              contents: [{ type: "filler" }]
            }
          ]
        },
        {
          type: "text",
          text: d.totalCal > 0 ? `${d.totalCal} kcal` : "-",
          size: "xs",
          weight: "bold",
          color: d.totalCal > goalCal * 1.15 ? "#E11D48" : "#18181B",
          align: "end",
          flex: 4
        }
      ]
    };
  });

  let coachComment = "養成規律記錄是體態改變的第一步，繼續保持！🐼";
  if (loggedDaysCount >= 5 && targetMetDays >= 4) {
    coachComment = `太強了！本週有 ${targetMetDays} 天完美達標，飲食自律度拉滿！🔥`;
  } else if (avgCal > goalCal * 1.15) {
    coachComment = `這週日均熱量 (${avgCal} kcal) 稍微偏高囉，多喝水並適度增加活動量！🐼`;
  } else if (loggedDaysCount < 3) {
    coachComment = "這週打卡天數比較少喔，吃什麼隨手拍照給教練，幫你把關！🐼✨";
  }

  return {
    type: "flex",
    altText: `📈 7 日飲食趨勢週報：日均 ${avgCal} kcal ｜ 達標 ${targetMetDays}/7 天`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#000000",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🐼 DAILY DIET", color: "#FDE047", weight: "bold", size: "sm" },
              { type: "text", text: "7 日趨勢週報", color: "#A1A1AA", size: "xs", align: "end", weight: "bold" }
            ]
          },
          {
            type: "text",
            text: "📈 飲食歷程與趨勢圖表",
            color: "#FFFFFF",
            weight: "bold",
            size: "lg",
            margin: "xs"
          },
          {
            type: "text",
            text: `🎯 每日目標：${goalCal} kcal ｜ ${goalPro}g 蛋白質`,
            color: "#FDE047",
            size: "xxs",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FFF1F2",
                cornerRadius: "10px",
                paddingAll: "8px",
                alignItems: "center",
                flex: 1,
                contents: [
                  { type: "text", text: "🔥 日均熱量", size: "xxs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${avgCal}`, size: "md", color: "#000000", weight: "bold", margin: "xs" },
                  { type: "text", text: "kcal / 天", size: "xxs", color: "#881337" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#EFF6FF",
                cornerRadius: "10px",
                paddingAll: "8px",
                alignItems: "center",
                flex: 1,
                contents: [
                  { type: "text", text: "🥩 日均蛋白", size: "xxs", color: "#2563EB", weight: "bold" },
                  { type: "text", text: `${avgPro}g`, size: "md", color: "#000000", weight: "bold", margin: "xs" },
                  { type: "text", text: "克 / 天", size: "xxs", color: "#1E3A8A" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#ECFDF5",
                cornerRadius: "10px",
                paddingAll: "8px",
                alignItems: "center",
                flex: 1,
                contents: [
                  { type: "text", text: "🎯 達標天數", size: "xxs", color: "#059669", weight: "bold" },
                  { type: "text", text: `${targetMetDays} / 7`, size: "md", color: "#000000", weight: "bold", margin: "xs" },
                  { type: "text", text: "天達標", size: "xxs", color: "#065F46" }
                ]
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FAFAFA",
            cornerRadius: "12px",
            paddingAll: "12px",
            borderColor: "#E4E4E7",
            borderWidth: "1px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "📊 7日熱量圖", size: "xs", color: "#18181B", weight: "bold", flex: 1 },
                  { type: "text", text: `目標 ${goalCal}k`, size: "xxs", color: "#71717A", align: "end" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                margin: "sm",
                spacing: "xs",
                contents: chartRows
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FEF9C3",
            cornerRadius: "10px",
            paddingAll: "10px",
            contents: [
              { type: "text", text: `💬 熊貓週評：${coachComment}`, size: "xs", color: "#713F12", weight: "bold", wrap: true }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#000000",
            action: {
              type: "postback",
              label: "📋 管理今日紀錄",
              data: JSON.stringify({ action: 'manageMeals' }),
              displayText: "📋 管理今日紀錄"
            }
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#EFF6FF",
                flex: 1,
                action: {
                  type: "datetimepicker",
                  label: "📅 查日期",
                  data: JSON.stringify({ action: 'pickDate' }),
                  mode: "date",
                  initial: getTodayDateString(),
                  max: getTodayDateString()
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                color: "#FEF9C3",
                flex: 1,
                action: {
                  type: "postback",
                  label: "📊 今日總結",
                  data: JSON.stringify({ action: 'save' }),
                  displayText: "📊 查看今日總結"
                }
              }
            ]
          }
        ]
      }
    }
  };
}

// ========================================================
// ⭐ 7. 常用餐點清單與一鍵快捷記錄 (Neo-Brutalist 視覺設計)
// ========================================================

function generateFavoritesCarouselFlex(userId, liffId, userGistId, props) {
  const favorites = getUserFavorites(userId, props, userGistId);
  const appTargetUrl = `https://liff.line.me/${liffId}?userId=${userId}${userGistId ? `&gistId=${userGistId}` : ''}`;
  const bubbles = [];

  // 💧 Bubble 1: 快速補水卡
  bubbles.push({
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#06B6D4",
      paddingAll: "14px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "💧 快速補水站", weight: "bold", size: "sm", color: "#FFFFFF" },
            { type: "text", text: "一鍵打卡", weight: "bold", size: "xs", color: "#CFFAFE", align: "end" }
          ]
        },
        {
          type: "text",
          text: "點擊下方快速記錄水分",
          size: "xxs",
          color: "#E0F2FE",
          margin: "xs"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "14px",
      backgroundColor: "#F0FDFA",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          color: "#0891B2",
          action: {
            type: "postback",
            label: "💧 喝水 +500ml",
            data: JSON.stringify({ action: 'quickWater', amount: 500 }),
            displayText: "💧 喝水 +500ml"
          }
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          color: "#CCFBF1",
          action: {
            type: "postback",
            label: "💧 喝水 +250ml",
            data: JSON.stringify({ action: 'quickWater', amount: 250 }),
            displayText: "💧 喝水 +250ml"
          }
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          color: "#CCFBF1",
          action: {
            type: "postback",
            label: "💧 喝水 +1000ml",
            data: JSON.stringify({ action: 'quickWater', amount: 1000 }),
            displayText: "💧 喝水 +1000ml"
          }
        }
      ]
    }
  });

  // ⭐ Bubbles 2..N: 各常用餐點
  if (favorites.length === 0) {
    bubbles.push({
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#FEF9C3",
        paddingAll: "14px",
        contents: [
          { type: "text", text: "⭐ 尚未建立常用餐點", weight: "bold", size: "sm", color: "#713F12" },
          { type: "text", text: "隨時建立您的專屬美食庫", size: "xxs", color: "#A16207", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          {
            type: "text",
            text: "💡 提示：拍照辨識後點擊「⭐ 存為常用」，或點擊下方直接填入自訂指令！",
            size: "xs",
            color: "#71717A",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "10px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#000000",
            action: {
              type: "postback",
              label: "➕ 填入新增指令",
              data: JSON.stringify({ action: 'fillFav' }),
              inputOption: "openKeyboard",
              fillInText: "加常用 美式咖啡+茶葉蛋 160卡 14蛋 450水"
            }
          }
        ]
      }
    });
  } else {
    favorites.slice(0, 10).forEach(fav => {
      bubbles.push({
        type: "bubble",
        size: "kilo",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#FDE047",
          paddingAll: "12px",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "⭐ 常用餐點", weight: "bold", size: "xs", color: "#000000" },
                { type: "text", text: "左右滑動", size: "xxs", color: "#713F12", align: "end" }
              ]
            },
            {
              type: "text",
              text: fav.dish_name,
              weight: "bold",
              size: "md",
              color: "#000000",
              wrap: true,
              margin: "xs"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          paddingAll: "12px",
          backgroundColor: "#FFFFFF",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              spacing: "xs",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#FFF1F2",
                  cornerRadius: "6px",
                  paddingAll: "6px",
                  flex: 1,
                  alignItems: "center",
                  contents: [
                    { type: "text", text: "🔥 熱量", size: "xxs", color: "#E11D48", weight: "bold" },
                    { type: "text", text: `${fav.calories}`, size: "xs", color: "#000000", weight: "bold" }
                  ]
                },
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#EFF6FF",
                  cornerRadius: "6px",
                  paddingAll: "6px",
                  flex: 1,
                  alignItems: "center",
                  contents: [
                    { type: "text", text: "🥩 蛋白質", size: "xxs", color: "#2563EB", weight: "bold" },
                    { type: "text", text: `${fav.protein}g`, size: "xs", color: "#000000", weight: "bold" }
                  ]
                },
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#ECFEFF",
                  cornerRadius: "6px",
                  paddingAll: "6px",
                  flex: 1,
                  alignItems: "center",
                  contents: [
                    { type: "text", text: "💧 水分", size: "xxs", color: "#0891B2", weight: "bold" },
                    { type: "text", text: `${fav.water || 0}ml`, size: "xs", color: "#000000", weight: "bold" }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          paddingAll: "10px",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "sm",
              color: "#000000",
              action: {
                type: "postback",
                label: "⚡ 一鍵記錄這餐",
                data: JSON.stringify({
                  action: 'quickLogFavorite',
                  name: encodeURIComponent(fav.dish_name),
                  cal: fav.calories,
                  pro: fav.protein,
                  wat: fav.water || 0
                }),
                displayText: `⚡ 快捷記錄：${fav.dish_name}`
              }
            },
            {
              type: "button",
              style: "secondary",
              height: "sm",
              color: "#FFF1F2",
              action: {
                type: "postback",
                label: "🗑️ 移除常用",
                data: JSON.stringify({ action: 'deleteFavorite', favId: fav.id, name: fav.dish_name }),
                displayText: `🗑️ 移除常用：${fav.dish_name}`
              }
            }
          ]
        }
      });
    });

    // ➕ Bubble Last: 新增常用
    bubbles.push({
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#18181B",
        paddingAll: "12px",
        contents: [
          { type: "text", text: "➕ 新增常用餐點", weight: "bold", size: "sm", color: "#FDE047" },
          { type: "text", text: "自訂常用餐點指令", size: "xxs", color: "#A1A1AA", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#FDE047",
            action: {
              type: "postback",
              label: "✏️ 填入新增指令",
              data: JSON.stringify({ action: 'fillFav' }),
              inputOption: "openKeyboard",
              fillInText: "加常用 燕麥奶拿鐵 180卡 6蛋 350水"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#F4F4F5",
            action: {
              type: "uri",
              label: "📱 開啟 App 管理",
              uri: appTargetUrl
            }
          }
        ]
      }
    });
  }

  return {
    type: "flex",
    altText: `⭐ 常用餐點與補水站（左右滑動選擇）`,
    contents: {
      type: "carousel",
      contents: bubbles
    }
  };
}


// ========================================================
// 🐼 8. 歡迎卡片、新舊用戶導引與全功能指令手冊 (Neo-Brutalist 旗艦設計)
// ========================================================

function generateWelcomeFlex(userId, liffId, userGistId) {
  const appTargetUrl = 'https://liff.line.me/' + liffId + '?userId=' + userId + (userGistId ? '&gistId=' + userGistId : '');
  const heroImageUrl = "https://raw.githubusercontent.com/WinnieLineer/daily-diet/main/public/cover-photo.jpg";

  return {
    type: "flex",
    altText: "🐼 歡迎使用 Daily Diet 飲食管理助手！",
    contents: {
      type: "bubble",
      size: "mega",
      hero: {
        type: "image",
        url: heroImageUrl,
        size: "full",
        aspectRatio: "20:11",
        aspectMode: "cover"
      },
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#000000",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🐼 DAILY DIET", color: "#FDE047", weight: "bold", size: "sm" },
              { type: "text", text: "AI 智能教練", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: "✨ 您的個人專屬 AI 飲食記錄教練",
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          // ❓ 1. 新舊用戶分流選擇區 (清楚詢問用戶，給予直接點選按鈕)
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#EFF6FF",
            borderColor: "#3B82F6",
            borderWidth: "2px",
            cornerRadius: "12px",
            paddingAll: "12px",
            spacing: "xs",
            contents: [
              {
                type: "text",
                text: "❓ 請問您是新用戶，還是使用過 Web 版？",
                weight: "bold",
                size: "xs",
                color: "#1E3A8A",
                wrap: true
              },
              {
                type: "text",
                text: "點擊下方符合您的身份，教練將立即引導專屬設定：",
                size: "xxs",
                color: "#2563EB",
                wrap: true
              },
              {
                type: "box",
                layout: "vertical",
                spacing: "xs",
                margin: "sm",
                contents: [
                  {
                    type: "button",
                    style: "primary",
                    height: "sm",
                    color: "#2563EB",
                    action: {
                      type: "postback",
                      label: "🐣 我是全新用戶 (快速上手引導)",
                      data: JSON.stringify({ action: 'onboarding', type: 'new' }),
                      displayText: "🐣 我是全新用戶"
                    }
                  },
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#DBEAFE",
                    action: {
                      type: "postback",
                      label: "🌐 我用過 Web 版 (資料綁定同步)",
                      data: JSON.stringify({ action: 'onboarding', type: 'web_user' }),
                      displayText: "🌐 我用過 Web 版"
                    }
                  }
                ]
              }
            ]
          },

          // 🛠️ 2. 目前所有可以調整的項目說明 (完整清單)
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FAFAFA",
            borderColor: "#000000",
            borderWidth: "1.5px",
            cornerRadius: "12px",
            paddingAll: "12px",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                alignItems: "center",
                contents: [
                  { type: "text", text: "🛠️ 目前可調整與自訂項目", weight: "bold", size: "xs", color: "#000000", flex: 4, wrap: true },
                  { type: "text", text: "完整指令", size: "xxs", color: "#71717A", align: "end", flex: 1 }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                spacing: "xs",
                contents: [
                  {
                    type: "text",
                    text: "🎯 體態目標：輸入「改目標 1800卡 80蛋」或「目標」",
                    size: "xxs",
                    color: "#18181B",
                    wrap: true
                  },
                  {
                    type: "text",
                    text: "🎭 教練語氣：輸入「切換性格」挑選傲嬌、溫柔、士官長",
                    size: "xxs",
                    color: "#18181B",
                    wrap: true
                  },
                  {
                    type: "text",
                    text: "⭐ 常用餐點：輸入「常用」輪播或「加常用 拿鐵 150卡」",
                    size: "xxs",
                    color: "#18181B",
                    wrap: true
                  },
                  {
                    type: "text",
                    text: "✏️ 修正紀錄：輸入「改 400卡 35蛋」微調前一餐",
                    size: "xxs",
                    color: "#18181B",
                    wrap: true
                  },
                  {
                    type: "text",
                    text: "💧 快速補水：輸入「喝水」或「+500水」打卡",
                    size: "xxs",
                    color: "#18181B",
                    wrap: true
                  },
                  {
                    type: "text",
                    text: "📅 歷史管理：輸入「9/3」、「昨日」或「管理」刪改餐點",
                    size: "xxs",
                    color: "#18181B",
                    wrap: true
                  }
                ]
              }
            ]
          },
          {
            type: "text",
            text: "💡 提示：隨時輸入「說明」或「指令」，可再次呼叫所有功能操作面板！",
            size: "xxs",
            color: "#A1A1AA",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#000000",
            action: {
              type: "uri",
              label: "📱 開啟個人飲食日記 (Web App)",
              uri: appTargetUrl
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#FEF9C3",
            action: {
              type: "postback",
              label: "📖 查看所有操作指令清單",
              data: JSON.stringify({ action: 'showHelp' }),
              displayText: "說明"
            }
          }
        ]
      }
    }
  };
}

// 🐣 全新用戶專屬引導卡片
function generateNewUserGuideFlex(userId, liffId, userGistId, props) {
  const appTargetUrl = 'https://liff.line.me/' + liffId + '?userId=' + userId + (userGistId ? '&gistId=' + userGistId : '');

  return {
    type: "flex",
    altText: "🐣 歡迎新朋友！30 秒快速上手指南",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#FDE047",
        paddingAll: "14px",
        contents: [
          { type: "text", text: "🐣 歡迎新朋友加入 Daily Diet！", weight: "bold", size: "md", color: "#000000" },
          { type: "text", text: "只要 30 秒，教練帶您輕鬆掌握飲食紀錄 🐼✨", size: "xxs", color: "#713F12", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  { type: "text", text: "1️⃣", size: "sm", flex: 0 },
                  { type: "text", text: "拍照辨識：點下方相機拍下餐點，AI 自動算熱量與三大營養素！", size: "xs", color: "#18181B", weight: "bold", flex: 1, wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  { type: "text", text: "2️⃣", size: "sm", flex: 0 },
                  { type: "text", text: "文字或語音：輸入「雞肉便當 650卡 35蛋」也能精準記帳！", size: "xs", color: "#18181B", weight: "bold", flex: 1, wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  { type: "text", text: "3️⃣", size: "sm", flex: 0 },
                  { type: "text", text: "智能目標：輸入身高體重與效果（如「改目標 165cm 55kg 女 減脂」），AI 自動算 BMR/TDEE 推薦熱量！", size: "xs", color: "#18181B", weight: "bold", flex: 1, wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  { type: "text", text: "4️⃣", size: "sm", flex: 0 },
                  { type: "text", text: "切換語氣：喜歡毒舌吐槽還是溫柔治癒？隨時可自由換！", size: "xs", color: "#18181B", weight: "bold", flex: 1, wrap: true }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#000000",
            action: {
              type: "postback",
              label: "🎯 智能目標推薦 (依身材)",
              data: JSON.stringify({ action: 'goalGuide' }),
              displayText: "設定目標"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#FEF08A",
            action: {
              type: "postback",
              label: "🎭 挑選教練性格 (傲嬌/溫柔/士官長)",
              data: JSON.stringify({ action: 'choosePersona' }),
              displayText: "切換性格"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#EFF6FF",
            action: {
              type: "uri",
              label: "📱 開啟個人飲食日記 (Web App)",
              uri: appTargetUrl
            }
          }
        ]
      }
    }
  };
}

// 🌐 Web 舊用戶無縫連動引導卡片
function generateWebUserGuideFlex(userId, liffId, userGistId, props) {
  const appTargetUrl = 'https://liff.line.me/' + liffId + '?userId=' + userId + (userGistId ? '&gistId=' + userGistId : '');

  return {
    type: "flex",
    altText: "🌐 歡迎老朋友！Web 紀錄無縫同步指南",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#18181B",
        paddingAll: "14px",
        contents: [
          { type: "text", text: "🌐 歡迎老朋友！無縫連動 Web 紀錄", weight: "bold", size: "md", color: "#FDE047" },
          { type: "text", text: "綁定 Gist ID，讓歷史餐點與目標 100% 雙向同步！", size: "xxs", color: "#E4E4E7", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            backgroundColor: "#FEF9C3",
            cornerRadius: "10px",
            paddingAll: "12px",
            contents: [
              { type: "text", text: "📌 簡單 3 步驟完成連動：", weight: "bold", size: "xs", color: "#854D0E" },
              { type: "text", text: "1. 點擊下方按鈕開啟 Web 版 Daily Diet", size: "xxs", color: "#713F12" },
              { type: "text", text: "2. 前往右上角「⚙️ 設定」➔「雲端備份」複製 Gist ID", size: "xxs", color: "#713F12" },
              { type: "text", text: "3. 點擊下方「填入綁定指令」，送出「綁定 您的GistID」即可！", size: "xxs", color: "#713F12" }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#000000",
            action: {
              type: "uri",
              label: "📱 開啟 Web App 複製 Gist ID",
              uri: appTargetUrl
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#FEF08A",
            action: {
              type: "postback",
              label: "☁️ 填入「綁定 Gist」指令",
              data: JSON.stringify({ action: 'fillGist' }),
              inputOption: "openKeyboard",
              fillInText: "綁定 "
            }
          }
        ]
      }
    }
  };
}

// 🛠️ 操作說明與所有功能手冊清單 (輸入「說明」或「指令」即刻呼叫全部選項)

function generateBugReportAckFlex(userText, liffId, userGistId) {
  const feedbackUrl = (liffId ? `https://liff.line.me/${liffId}?tab=feedback` : '') + (userGistId ? `&gistId=${userGistId}` : '');

  return {
    type: "flex",
    altText: "🛠️ 感謝您的問題回報！已同步以表單提交至開發團隊",
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#18181B",
        paddingAll: "14px",
        contents: [
          { type: "text", text: "🛠️ 問題回報已送達！", weight: "bold", size: "md", color: "#FDE047" },
          { type: "text", text: "已同步表單提交至工程團隊信箱 🐼❤️", size: "xxs", color: "#A1A1AA", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          {
            type: "text",
            text: "✅ 已同步透過 Web3Forms 表單提交：",
            size: "xs",
            color: "#15803D",
            weight: "bold"
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FEF2F2",
            borderColor: "#FECACA",
            borderWidth: "1.5px",
            cornerRadius: "8px",
            paddingAll: "10px",
            contents: [
              {
                type: "text",
                text: userText || '無文字詳情',
                size: "xs",
                color: "#991B1B",
                wrap: true,
                weight: "bold"
              }
            ]
          },
          {
            type: "text",
            text: "若需要更詳細描述問題或建議，也可點擊下方開啟 Web 表單填寫完整內容！",
            size: "xxs",
            color: "#71717A",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "10px",
        contents: [
          ...(feedbackUrl ? [{
            type: "button",
            style: "primary",
            height: "sm",
            color: "#FDE047",
            action: {
              type: "uri",
              label: "📝 開啟 Web 完整回報表單",
              uri: feedbackUrl
            }
          }] : []),
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#F4F4F5",
            action: {
              type: "message",
              label: "💡 查看全功能手冊",
              text: "說明"
            }
          }
        ]
      }
    }
  };
}

function generateCommandMenuFlex(userId, liffId, userGistId, props) {
  const appTargetUrl = 'https://liff.line.me/' + liffId + '?userId=' + userId + (userGistId ? '&gistId=' + userGistId : '');
  const todayStr = getTodayDateString();

  return {
    type: "flex",
    altText: "🛠️ Daily Diet 操作說明與所有功能指令手冊",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#000000",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🛠️ DAILY DIET", color: "#FDE047", weight: "bold", size: "sm" },
              { type: "text", text: "全功能操作手冊", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: "點擊下方任何按鈕，直接執行對應操作 🐼👇",
            color: "#FFFFFF",
            weight: "bold",
            size: "xs",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "14px",
        contents: [
          // 區塊 1: 常用與記錄 (2 欄按鈕，寬度充裕不截斷)
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: [
              { type: "text", text: "⚡ 快速記錄與補水", weight: "bold", size: "xs", color: "#000000" },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#FEF08A",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: "⭐ 常用餐點",
                      data: JSON.stringify({ action: 'viewFavorites' }),
                      displayText: "常用"
                    }
                  },
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#FEE2E2",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: "📸 拍照指引",
                      data: JSON.stringify({ action: 'guideCamera' }),
                      displayText: "拍照辨識"
                    }
                  }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                margin: "xs",
                contents: [
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#E0F2FE",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: "💧 補水 500",
                      data: JSON.stringify({ action: 'quickWater', amount: 500 }),
                      displayText: "💧 喝水 +500ml"
                    }
                  },
                  {
                    type: "button",
                    style: "primary",
                    height: "sm",
                    color: "#000000",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: "📊 今日總結",
                      data: JSON.stringify({ action: 'save' }),
                      displayText: "今日"
                    }
                  }
                ]
              }
            ]
          },

          // 區塊 2: 歷史與趨勢分析
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: [
              { type: "text", text: "📈 歷程與歷史回顧", weight: "bold", size: "xs", color: "#000000" },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#FEF9C3",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: "📈 7 日週報",
                      data: JSON.stringify({ action: 'viewWeeklyTrends' }),
                      displayText: "週報"
                    }
                  },
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#EFF6FF",
                    flex: 1,
                    action: {
                      type: "datetimepicker",
                      label: "📅 選擇日期",
                      data: JSON.stringify({ action: 'pickDate' }),
                      mode: "date",
                      initial: todayStr,
                      max: todayStr
                    }
                  }
                ]
              }
            ]
          },

          // 區塊 3: 個性化目標與管理
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: [
              { type: "text", text: "⚙️ 目標設定與管理", weight: "bold", size: "xs", color: "#000000" },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#DCFCE7",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: "🎯 智能目標推薦",
                      data: JSON.stringify({ action: 'goalGuide' }),
                      displayText: "設定目標"
                    }
                  },
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#F3E8FF",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: "🎭 切換性格",
                      data: JSON.stringify({ action: 'choosePersona' }),
                      displayText: "切換性格"
                    }
                  }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                margin: "xs",
                contents: [
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#FEE2E2",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: "📋 管理刪改",
                      data: JSON.stringify({ action: 'manageMeals' }),
                      displayText: "管理"
                    }
                  },
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#F1F5F9",
                    flex: 1,
                    action: {
                      type: "uri",
                      label: "🐛 回報問題 (表單)",
                      uri: userGistId ? `https://liff.line.me/${liffId}?tab=feedback&gistId=${userGistId}` : `https://liff.line.me/${liffId}?tab=feedback`
                    }
                  }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                margin: "xs",
                contents: [
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#E0F2FE",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: "🌐 語言 / Language",
                      data: JSON.stringify({ action: 'chooseLanguage' }),
                      displayText: "切換語言"
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#000000",
            action: {
              type: "uri",
              label: "📱 開啟個人飲食日記 (Web App)",
              uri: appTargetUrl
            }
          }
        ]
      }
    }
  };
}

function generateFavoritesListFlex(userId, liffId, userGistId, props) {
  return generateFavoritesCarouselFlex(userId, liffId, userGistId, props);
}

function generateFavoriteAddedFlex(favItem, liffId, userGistId) {
  const appTargetUrl = `https://liff.line.me/${liffId}?userId=${favItem.userId || ''}${userGistId ? `&gistId=${userGistId}` : ''}`;
  return {
    type: "flex",
    altText: `⭐ 已成功收藏為常用餐點：${favItem.dish_name}`,
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "⭐ 已成功收藏至常用餐點！", weight: "bold", size: "sm", color: "#15803D" },
          { type: "text", text: favItem.dish_name, weight: "bold", size: "md", color: "#000000" },
          {
            type: "box",
            layout: "horizontal",
            spacing: "xs",
            margin: "xs",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                backgroundColor: "#FFF1F2",
                cornerRadius: "6px",
                paddingStart: "6px",
                paddingEnd: "6px",
                paddingTop: "2px",
                paddingBottom: "2px",
                contents: [{ type: "text", text: `🔥 ${favItem.calories} kcal`, size: "xxs", color: "#E11D48", weight: "bold" }]
              },
              {
                type: "box",
                layout: "horizontal",
                backgroundColor: "#EFF6FF",
                cornerRadius: "6px",
                paddingStart: "6px",
                paddingEnd: "6px",
                paddingTop: "2px",
                paddingBottom: "2px",
                contents: [{ type: "text", text: `🥩 ${favItem.protein}g`, size: "xxs", color: "#2563EB", weight: "bold" }]
              },
              {
                type: "box",
                layout: "horizontal",
                backgroundColor: "#ECFEFF",
                cornerRadius: "6px",
                paddingStart: "6px",
                paddingEnd: "6px",
                paddingTop: "2px",
                paddingBottom: "2px",
                contents: [{ type: "text", text: `💧 ${favItem.water || 0}ml`, size: "xxs", color: "#0891B2", weight: "bold" }]
              }
            ]
          },
          {
            type: "text",
            text: "隨時在對話框輸入「常用」即可一鍵快捷記錄！🐼",
            size: "xxs",
            color: "#71717A",
            margin: "sm"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        paddingAll: "10px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#000000",
            action: {
              type: "message",
              label: "⭐ 查看常用庫",
              text: "常用"
            }
          }
        ]
      }
    }
  };
}

function generateClearConfirmFlex(liffId, userGistId) {
  return {
    type: "flex",
    altText: "⚠️ 確定要清空今日所有紀錄嗎？",
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        contents: [
          { type: "text", text: "⚠️ 清空今日飲食紀錄確認", weight: "bold", size: "md", color: "#E11D48" },
          {
            type: "text",
            text: "確定要清除今天的所有餐點紀錄嗎？此動作無法復原喔！",
            size: "xs",
            color: "#52525B",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#E11D48",
            action: {
              type: "postback",
              label: "🗑️ 確定清空",
              data: JSON.stringify({ action: 'clearToday' }),
              displayText: "🗑️ 確定清空今日所有紀錄"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#F4F4F5",
            action: {
              type: "postback",
              label: "❌ 取消",
              data: JSON.stringify({ action: 'cancel' }),
              displayText: "❌ 取消"
            }
          }
        ]
      }
    }
  };
}

// ========================================================
// 💾 8. 常用餐點與紀錄管理資料處理核心 (Properties + Gist)
// ========================================================

function getUserFavorites(userId, props, userGistId) {
  if (!props) props = PropertiesService.getScriptProperties();
  const favKey = `FAVORITES_${userId}`;
  try {
    const raw = props.getProperty(favKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  // ☁️ 若尚未快取常用餐點，主動向 Gist 雲端資料庫拉取 Web 端的常用清單
  const gistId = userGistId || props.getProperty(`USER_GIST_${userId}`);
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
          if (backupData.favorites && Array.isArray(backupData.favorites) && backupData.favorites.length > 0) {
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
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) {}
  try {
    const favKey = `FAVORITES_${userId}`;
    let favorites = getUserFavorites(userId, props);

    // 檢查是否已存在同名餐點
    const existingIdx = favorites.findIndex(f => f.dish_name === favItem.dish_name);
    if (existingIdx !== -1) {
      favorites[existingIdx] = favItem;
    } else {
      favorites.unshift(favItem);
    }

    props.setProperty(favKey, JSON.stringify(favorites));

    if (pat && userGistId) {
      try {
        syncFavoritesToUserGist(favorites, userGistId, pat);
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
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) {}
  try {
    const favKey = `FAVORITES_${userId}`;
    let favorites = getUserFavorites(userId, props);
    favorites = favorites.filter(f => f.id != favIdentifier && f.dish_name !== favIdentifier);
    props.setProperty(favKey, JSON.stringify(favorites));

    if (pat && userGistId) {
      try {
        syncFavoritesToUserGist(favorites, userGistId, pat);
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

function deleteMealLog(userId, mealIdOrName, userGistId, pat, props, targetDateStr) {
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
  const todayStr = getTodayDateString();
  const todayKey = `DIET_LOGS_${userId}_${todayStr}`;
  props.setProperty(todayKey, JSON.stringify([]));

  if (pat && userGistId) {
    try {
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

function deleteMealFromUserGist(targetMeal, gistId, pat) {
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
// 📊 9. 實時日誌持久化與查詢核心 (PropertiesService + Console + Logger)
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

function recordSystemLog(type, userId, input, aiResult, output, userName) {
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
    userId: displayName,
    rawUserId: (userId || 'unknown').slice(-6),
    type: type,
    input: typeof input === 'object' ? JSON.stringify(input) : String(input || ''),
    aiResult: typeof aiResult === 'object' ? JSON.stringify(aiResult) : String(aiResult || ''),
    output: typeof output === 'object' ? JSON.stringify(output) : String(output || '')
  };

  Logger.log(`[${logItem.time}] [${logItem.type}] [${displayName}] ${logItem.input} -> ${logItem.output}`);
  console.log(`[${logItem.time}] [${logItem.type}] [${displayName}] ${logItem.input} -> ${logItem.output}`);

  // 1. 高速暫存快取 (保留最新 100 筆)
  try {
    let recentLogs = [];
    const raw = props.getProperty('SYSTEM_RECENT_LOGS');
    if (raw) recentLogs = JSON.parse(raw);
    recentLogs.unshift(logItem);
    if (recentLogs.length > 100) recentLogs = recentLogs.slice(0, 100);
    props.setProperty('SYSTEM_RECENT_LOGS', JSON.stringify(recentLogs));
  } catch (e) {
    console.error("儲存實時日誌失敗:", e);
  }

  // 2. 永久 Google 試算表存檔庫 (自動建立與保存所有紀錄，永不刪除)
  try {
    const ss = getOrCreateLogSheet(props);
    if (ss) {
      const sheet = ss.getSheets()[0];
      sheet.appendRow([logItem.time, displayName, userId, logItem.type, logItem.input, logItem.aiResult, logItem.output]);
    }
  } catch (sheetErr) {
    console.error("寫入 Google Sheet 日誌失敗:", sheetErr);
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
    sheet.appendRow(["時間", "用戶名稱", "用戶識別碼", "操作類型", "用戶傳送內容", "AI辨識結果", "處理狀態"]);

    // 美化試算表標題列
    const headerRange = sheet.getRange(1, 1, 1, 7);
    headerRange.setBackground("#000000").setFontColor("#FDE047").setFontWeight("bold").setFontSize(11);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 140);
    sheet.setColumnWidth(3, 160);
    sheet.setColumnWidth(4, 120);
    sheet.setColumnWidth(5, 280);
    sheet.setColumnWidth(6, 280);
    sheet.setColumnWidth(7, 200);

    return ss;
  } catch (err) {
    console.error("自動建立 Google Sheet 日誌失敗:", err);
    return null;
  }
}

// ========================================================
// 🚨 10. GDPR / 個資法「被遺忘權」徹底銷毀個人資料核心
// ========================================================

function generateDestroyAllDataConfirmFlex() {
  return {
    type: "flex",
    altText: "🚨 警告：確定要徹底銷毀您的所有資料嗎？",
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        contents: [
          { type: "text", text: "🚨 徹底銷毀所有個人資料", weight: "bold", size: "md", color: "#E11D48" },
          {
            type: "text",
            text: "此動作將徹底清空您所有的飲食紀錄、自訂體態目標、常用餐點庫，並銷毀個人私有雲端 Gist 資料庫。\n\n⚠️ 此操作無法復原，確定要執行嗎？",
            size: "xs",
            color: "#52525B",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#E11D48",
            action: {
              type: "postback",
              label: "🗑️ 確定徹底銷毀",
              data: JSON.stringify({ action: 'destroyAllData' }),
              displayText: "🗑️ 確定徹底銷毀我的所有資料"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#F4F4F5",
            action: {
              type: "postback",
              label: "❌ 取消",
              data: JSON.stringify({ action: 'cancel' }),
              displayText: "❌ 取消"
            }
          }
        ]
      }
    }
  };
}

function purgeAllUserData(userId, userGistId, pat, props) {
  const todayStr = getTodayDateString();
  props.deleteProperty(`DIET_LOGS_${userId}_${todayStr}`);
  props.deleteProperty(`FAVORITES_${userId}`);
  props.deleteProperty(`USER_GIST_${userId}`);
  props.deleteProperty(`CALORIE_GOAL_${userId}`);
  props.deleteProperty(`PROTEIN_GOAL_${userId}`);
  props.deleteProperty(`WATER_GOAL_${userId}`);

  if (pat && userGistId) {
    try {
      UrlFetchApp.fetch(`https://api.github.com/gists/${userGistId}`, {
        method: 'delete',
        headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' },
        muteHttpExceptions: true
      });
      console.log(`✅ 已為用戶 ${userId} 徹底銷毀 GitHub Gist: ${userGistId}`);
    } catch (e) {
      console.error("銷毀 Gist 失敗:", e);
    }
  }
}

function getOrCreateUserGist(userId, pat, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const gistKey = `USER_GIST_${userId}`;
  let gistId = props.getProperty(gistKey);
  if (gistId) return gistId;
  if (!pat) return '';

  try {
    const payload = {
      description: `Daily Diet User Cloud Backup - ${userId}`,
      public: false,
      files: {
        'daily-diet-backup.json': {
          content: JSON.stringify({
            version: '3.0.0',
            updatedAt: new Date().toISOString(),
            userId: userId,
            dietLogs: [],
            weightLogs: [],
            settings: [],
            favorites: []
          }, null, 2)
        }
      }
    };

    const res = UrlFetchApp.fetch('https://api.github.com/gists', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 201) {
      const data = JSON.parse(res.getContentText());
      gistId = data.id;
      props.setProperty(gistKey, gistId);
      console.log(`🎉 成功為用戶 ${userId} 建立專屬 Gist 備份庫: ${gistId}`);
      return gistId;
    }
  } catch (e) {
    console.error("建立 Gist 備份失敗:", e);
  }
  return '';
}

function analyzeMealWithGeminiFull(base64Image, apiKey, context, language) {
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-2.5-flash'
  ];
  const langDisplay = language === 'en' ? 'English' : 'Traditional Chinese';
  const prompt = `Analyze this food image. Return STRICTLY a raw JSON object with keys:
"dish_name" (${langDisplay} string),
"calories" (integer kcal),
"protein" (integer grams),
"carbs" (integer carbohydrates grams),
"fat" (integer total fat grams),
"water" (integer liquid ml, 0 if dry food),
"breakdown" (array of objects, each with "name", "portion", "calories", "protein"),
"calculation_note" (string formula in ${langDisplay} e.g. "炸雞腿約380卡 + 白飯約220卡 + 炒青菜約50卡 = 650 kcal"),
"description" (${langDisplay} nutritional overview),
"fun_fact" (${langDisplay} science fact),
"roast" (${langDisplay} sarcastic burn),
"panda_comment" (${langDisplay} professional tip, max 35 words).
No markdown backticks.`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json"
    }
  };

  let lastError = null;
  for (let i = 0; i < models.length; i++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${models[i]}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Gemini Vision analysis failed: ${lastError?.message || 'Unknown'}`);
}

function parseTextWithGeminiFull(text, apiKey, context, language) {
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-2.5-flash'
  ];
  const langDisplay = language === 'en' ? 'English' : 'Traditional Chinese';
  const prompt = `You are an expert nutritionist panda. Analyze: "${text}".
Return STRICTLY a raw JSON object with keys:
"dish_name" (${langDisplay}),
"calories" (integer kcal),
"protein" (integer grams),
"carbs" (integer carbohydrates grams),
"fat" (integer total fat grams),
"water" (integer liquid ml),
"description" (${langDisplay}),
"fun_fact" (${langDisplay}),
"roast" (${langDisplay}),
"panda_comment" (${langDisplay}).
No markdown backticks.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json"
    }
  };

  let lastError = null;
  for (let i = 0; i < models.length; i++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${models[i]}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Gemini Text analysis failed: ${lastError?.message || 'Unknown'}`);
}

function generateGeminiText(prompt, apiKey) {
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-2.5-flash'
  ];
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3 }
  };
  for (let i = 0; i < models.length; i++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${models[i]}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    } catch (e) {}
  }
  return '繼續保持健康飲控節奏喔！🐼✨';
}

// ========================================================
// 🛡️ 13. Web App 專屬防盜刷安全驗證 (時戳防重放 + 專屬權杖 + 頻率流控)
// ========================================================

function verifyWebAIRequest(data, e) {
  const WEB_AI_SECRET = "DD_WEB_AI_SECURE_KEY_2026";
  const client = data?.client || e?.parameter?.client;
  const timestamp = Number(data?.timestamp || e?.parameter?.timestamp);
  const nonce = data?.nonce || e?.parameter?.nonce;
  const appToken = data?.appToken || e?.parameter?.appToken;

  if (client !== 'daily-diet-web' || !timestamp || !nonce || !appToken) {
    return { valid: false, reason: '缺少專屬授權權杖 (Missing Client Token)' };
  }

  // 1. 防重放攻擊：時戳需在 5 分鐘內
  const now = Date.now();
  if (Math.abs(now - timestamp) > 300000) {
    return { valid: false, reason: '請求權杖已過期 (Expired Timestamp)' };
  }

  // 2. 驗證防偽簽章
  const signatureRaw = `DD_AI_${timestamp}_${nonce}_${WEB_AI_SECRET}`;
  const expectedToken = Utilities.base64Encode(signatureRaw).substring(0, 32);
  if (appToken !== expectedToken) {
    return { valid: false, reason: '防偽簽章校驗失敗 (Invalid Signature)' };
  }

  // 3. 頻率流控限制 (Rate Limiting: 60 秒內最多 30 次)
  try {
    const cache = CacheService.getScriptCache();
    const rateKey = `RATE_AI_${String(nonce).substring(0, 4)}`;
    const currentCount = Number(cache.get(rateKey) || 0);
    if (currentCount > 30) {
      return { valid: false, reason: '調用頻率過高，請稍候 (Rate Limit Exceeded)' };
    }
    cache.put(rateKey, String(currentCount + 1), 60);
  } catch (err) {}

  return { valid: true };
}

// ========================================================
// 📊 14. 實時運作日誌儀表板 UI (Authentic Neo-Brutalism Design matching Web App)
// ========================================================

function generateDashboardHtml(initialLogs, sheetUrl, initialAiQuota) {
  const aiQuotaJson = JSON.stringify(initialAiQuota || getAiQuotaStats()).replace(/</g, '\\u003c');
  const initialJson = JSON.stringify(initialLogs || []).replace(/</g, '\\u003c');
  const safeSheetUrl = sheetUrl || '';

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>🐼 Daily Diet 實時對話與運作日誌</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Outfit:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F8FAFC;
      --black: #000000;
      --white: #FFFFFF;
      --yellow: #FDE047;
      --yellow-hover: #FACC15;
      --purple: #EDE9FE;
      --purple-text: #6D28D9;
      --blue: #E0F2FE;
      --blue-text: #0369A1;
      --green: #DCFCE7;
      --green-text: #15803D;
      --red: #FFE4E6;
      --red-text: #BE123C;
      --amber: #FEF9C3;
      --amber-text: #854D0E;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
      background-color: var(--bg);
      background-image: radial-gradient(#CBD5E1 1.5px, transparent 1.5px);
      background-size: 24px 24px;
      color: var(--black);
      min-height: 100vh;
      padding: 20px;
      -webkit-font-smoothing: antialiased;
    }

    .app-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* 🏷️ Neo-Brutalist 卡片容器基礎 */
    .neo-box {
      background: var(--white);
      border: 3px solid var(--black);
      border-radius: 20px;
      box-shadow: 4px 4px 0px 0px var(--black);
      transition: all 0.15s ease;
    }

    /* 頂部 Header */
    .header-panel {
      padding: 20px 24px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      background: #FFFFFF;
      border: 4px solid var(--black);
      border-radius: 24px;
      box-shadow: 6px 6px 0px 0px var(--black);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      font-size: 32px;
      background: var(--yellow);
      border: 3px solid var(--black);
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      box-shadow: 3px 3px 0px 0px var(--black);
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: var(--black);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .brand-subtitle {
      font-size: 13px;
      color: #52525B;
      font-weight: 700;
      margin-top: 2px;
    }

    /* 狀態徽章 */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--green);
      color: var(--green-text);
      border: 2px solid var(--black);
      box-shadow: 2px 2px 0px 0px var(--black);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      background: #16A34A;
      border-radius: 50%;
      border: 1px solid var(--black);
      animation: pulse 1.6s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(0.8); opacity: 0.5; }
    }

    /* 按鈕群組 */
    .btn-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .neo-btn {
      background: var(--white);
      color: var(--black);
      border: 3px solid var(--black);
      box-shadow: 3px 3px 0px 0px var(--black);
      padding: 8px 16px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.1s ease;
      text-decoration: none;
      user-select: none;
    }
    .neo-btn:hover {
      transform: translate(-1px, -1px);
      box-shadow: 4px 4px 0px 0px var(--black);
    }
    .neo-btn:active {
      transform: translate(2px, 2px);
      box-shadow: 1px 1px 0px 0px var(--black);
    }
    .neo-btn-primary {
      background: var(--yellow);
    }
    .neo-btn-primary:hover {
      background: var(--yellow-hover);
    }
    .neo-btn-green {
      background: var(--green);
      color: var(--green-text);
    }
    .neo-btn-blue {
      background: var(--blue);
      color: var(--blue-text);
    }

    /* 📊 遙測統計卡片 Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }
    .metric-card {
      padding: 16px 18px;
      border: 3px solid var(--black);
      border-radius: 18px;
      box-shadow: 4px 4px 0px 0px var(--black);
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: transform 0.15s ease;
    }
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 5px 5px 0px 0px var(--black);
    }
    .metric-label {
      font-size: 12px;
      font-weight: 900;
      color: var(--black);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .metric-val {
      font-size: 28px;
      font-weight: 900;
      font-family: 'JetBrains Mono', 'Inter', monospace;
      color: var(--black);
      letter-spacing: -1px;
    }

    /* 🔍 搜尋與分類篩選工具列 */
    .toolbar-panel {
      padding: 14px 18px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      border: 3px solid var(--black);
      border-radius: 18px;
      box-shadow: 4px 4px 0px 0px var(--black);
    }
    .search-box {
      flex: 1;
      min-width: 260px;
      position: relative;
    }
    .search-input {
      width: 100%;
      background: #F8FAFC;
      border: 3px solid var(--black);
      border-radius: 14px;
      padding: 10px 14px 10px 40px;
      color: var(--black);
      font-size: 13px;
      font-weight: 800;
      outline: none;
      box-shadow: 2px 2px 0px 0px var(--black);
      transition: all 0.15s ease;
    }
    .search-input:focus {
      background: #FFFFFF;
      box-shadow: 3px 3px 0px 0px var(--black);
      border-color: var(--black);
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 15px;
      color: var(--black);
    }

    .filter-pills {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .pill-btn {
      background: var(--white);
      border: 2px solid var(--black);
      box-shadow: 2px 2px 0px 0px var(--black);
      color: var(--black);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.1s ease;
    }
    .pill-btn:hover {
      transform: translate(-1px, -1px);
      box-shadow: 3px 3px 0px 0px var(--black);
    }
    .pill-btn:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0px 0px var(--black);
    }
    .pill-btn.active {
      background: var(--black);
      color: var(--yellow);
      border-color: var(--black);
    }

    /* 📋 表格樣式 */
    .table-container {
      background: var(--white);
      border: 4px solid var(--black);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 6px 6px 0px 0px var(--black);
    }
    .log-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .log-table th {
      background: var(--black);
      color: var(--white);
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 14px 16px;
      border-bottom: 3px solid var(--black);
    }
    .log-table td {
      padding: 14px 16px;
      font-size: 13px;
      border-bottom: 2px solid #E2E8F0;
      vertical-align: middle;
      color: var(--black);
    }
    .log-table tr:hover td {
      background: #F8FAFC;
    }

    /* 標籤徽章 */
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 9px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 900;
      border: 2px solid var(--black);
      box-shadow: 2px 2px 0px 0px var(--black);
      white-space: nowrap;
    }
    .tag-photo { background: var(--purple); color: var(--purple-text); }
    .tag-text { background: var(--blue); color: var(--blue-text); }
    .tag-goal { background: var(--amber); color: var(--amber-text); }
    .tag-sec { background: var(--red); color: var(--red-text); }
    .tag-sync { background: var(--green); color: var(--green-text); }
    .tag-mgmt { background: #F1F5F9; color: #1E293B; }

    .time-cell {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 800;
      color: #64748B;
      white-space: nowrap;
    }
    .user-cell {
      font-weight: 900;
      color: var(--black);
      white-space: nowrap;
    }
    .input-cell {
      font-weight: 800;
      color: var(--black);
      word-break: break-word;
      max-width: 320px;
    }
    .ai-cell {
      font-weight: 700;
      color: #2563EB;
      word-break: break-word;
      max-width: 300px;
    }
    .output-cell {
      font-weight: 700;
      color: #15803D;
      word-break: break-word;
    }

    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: #64748B;
    }
    .empty-state-icon { font-size: 44px; margin-bottom: 12px; }

    /* Footer */
    .footer-bar {
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #64748B;
      font-weight: 800;
      padding: 0 6px;
      flex-wrap: wrap;
      gap: 8px;
    }

    @media (max-width: 768px) {
      body { padding: 12px; }
      .header-panel { padding: 16px; border-radius: 18px; }
      .brand-title { font-size: 18px; }
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .log-table th:nth-child(5), .log-table td:nth-child(5) { display: none; }
    }
  </style>
</head>
<body>
  <div class="app-container">
    <!-- 頂部面板 -->
    <header class="header-panel">
      <div class="brand">
        <div class="brand-logo">🐼</div>
        <div>
          <div class="brand-title">
            DAILY DIET 實時對話與運作日誌
            <span class="status-badge"><span class="live-dot"></span> LIVE</span>
          </div>
          <div class="brand-subtitle">Gemini 多模態視覺辨識 · Google 試算表永久存檔 · 防盜刷即時遙測</div>
        </div>
      </div>
      <div class="btn-group">
        <button class="neo-btn neo-btn-primary" onclick="triggerManualRefresh()">🔄 立即刷新</button>
        <button class="neo-btn neo-btn-blue" onclick="exportLogsToCsv()">📥 匯出 CSV</button>
        <a id="sheetLinkBtn" href="${safeSheetUrl || '#'}" target="_blank" class="neo-btn neo-btn-green" style="${safeSheetUrl ? '' : 'display:none;'}">📊 永久雲端試算表</a>
        <button class="neo-btn" id="toggleAutoBtn" onclick="toggleAutoRefresh()">⏸️ 暫停輪詢</button>
        <a href="https://winnielineer.github.io/daily-diet/privacy.html" target="_blank" class="neo-btn">🛡️ 隱私政策</a>
      </div>
    </header>

    <!-- ⚡ Gemini AI 即時速率監控 (RPM Monitor) -->
    <div class="ai-quota-panel neo-box" style="background:#FFFFFF; border:3.5px solid var(--black); border-radius:22px; padding:18px 22px; margin-bottom:18px; box-shadow:5px 5px 0px 0px var(--black);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:26px; background:var(--yellow); border:3px solid var(--black); border-radius:12px; width:48px; height:48px; display:flex; align-items:center; justify-content:center; box-shadow:2px 2px 0px var(--black);">⚡</div>
          <div>
            <div style="font-size:18px; font-weight:900; color:var(--black); display:flex; align-items:center; gap:10px;">
              Gemini AI 即時速率監控 (RPM)
              <span id="aiBadge" class="status-badge" style="background:var(--green); color:var(--green-text); font-size:11px;">🟢 速率極佳</span>
            </div>
            <div style="font-size:12px; color:#52525B; font-weight:700; margin-top:2px;">
              模型：<code id="aiModelName" style="background:#F1F5F9; padding:2px 6px; border-radius:6px; font-family:'JetBrains Mono'; font-weight:800; color:#000;">gemini-3.5-flash-lite</code> ｜ 免費上限 15 次/分 (60 秒滑動窗口)
            </div>
          </div>
        </div>
        <div style="display:flex; gap:14px; align-items:center;">
          <div style="text-align:right;">
            <div style="font-size:11px; font-weight:800; color:#71717A;">⚡ 即時調用速率 (RPM)</div>
            <div style="font-size:26px; font-weight:900; font-family:'JetBrains Mono'; color:#15803D;" id="aiRpmHero">0 <span style="font-size:15px; color:#71717A; font-weight:800;">/ 15 RPM</span></div>
          </div>
        </div>
      </div>

      <!-- RPM 即時速率條 (0~15 RPM) -->
      <div style="background:#F1F5F9; border:3px solid var(--black); border-radius:999px; height:20px; position:relative; overflow:hidden; box-shadow:2px 2px 0px var(--black);">
        <div id="aiProgressBar" style="background:var(--green); height:100%; width:0%; border-right:2px solid var(--black); transition:width 0.4s ease, background-color 0.4s ease;"></div>
      </div>

      <!-- RPM 指標卡片群 -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px; margin-top:14px;">
        <div style="background:#DCFCE7; border:2.5px solid var(--black); border-radius:14px; padding:10px 14px; box-shadow:3px 3px 0px var(--black);">
          <div style="font-size:11px; font-weight:800; color:#15803D;">當前速率 (Current RPM)</div>
          <div style="font-size:20px; font-weight:900; font-family:'JetBrains Mono'; color:#15803D;" id="aiCurrentRpm">0 / 15</div>
        </div>
        <div style="background:#EFF6FF; border:2.5px solid var(--black); border-radius:14px; padding:10px 14px; box-shadow:3px 3px 0px var(--black);">
          <div style="font-size:11px; font-weight:800; color:#1D4ED8;">今日累計 (RPD)</div>
          <div style="font-size:20px; font-weight:900; font-family:'JetBrains Mono'; color:#1D4ED8;" id="aiUsedCount">0 / 1,500</div>
        </div>
        <div style="background:#FEF9C3; border:2.5px solid var(--black); border-radius:14px; padding:10px 14px; box-shadow:3px 3px 0px var(--black);">
          <div style="font-size:11px; font-weight:800; color:#854D0E;">冷卻狀態 (Status)</div>
          <div style="font-size:20px; font-weight:900; font-family:'JetBrains Mono'; color:#854D0E;" id="aiStatusText">無排隊阻塞</div>
        </div>
        <div style="background:#F3E8FF; border:2.5px solid var(--black); border-radius:14px; padding:10px 14px; box-shadow:3px 3px 0px var(--black);">
          <div style="font-size:11px; font-weight:800; color:#7E22CE;">調用成功率</div>
          <div style="font-size:20px; font-weight:900; font-family:'JetBrains Mono'; color:#7E22CE;" id="aiSuccessRate">100%</div>
        </div>
      </div>
    </div>

    <!-- 📊 統計指標卡片 (Neo-Brutalist Colors) -->
    <div class="metrics-grid">
      <div class="metric-card" style="background:#FFFFFF;">
        <div class="metric-label"><span>總歷史筆數 (Total)</span><span>📦</span></div>
        <div class="metric-val" id="metricTotal">0</div>
      </div>
      <div class="metric-card" style="background:var(--purple);">
        <div class="metric-label"><span>📸 照片視覺辨識</span><span style="color:var(--purple-text);">Vision</span></div>
        <div class="metric-val" id="metricPhoto" style="color:var(--purple-text);">0</div>
      </div>
      <div class="metric-card" style="background:var(--blue);">
        <div class="metric-label"><span>💬 文字與記餐</span><span style="color:var(--blue-text);">Text</span></div>
        <div class="metric-val" id="metricText" style="color:var(--blue-text);">0</div>
      </div>
      <div class="metric-card" style="background:var(--amber);">
        <div class="metric-label"><span>🎯 目標與同步</span><span style="color:var(--amber-text);">Sync</span></div>
        <div class="metric-val" id="metricSync" style="color:var(--amber-text);">0</div>
      </div>
      <div class="metric-card" style="background:var(--red);">
        <div class="metric-label"><span>🛡️ 安全防禦阻擋</span><span style="color:var(--red-text);">Shield</span></div>
        <div class="metric-val" id="metricSec" style="color:var(--red-text);">0</div>
      </div>
    </div>

    <!-- 🔍 搜尋與分類篩選工具列 -->
    <div class="toolbar-panel neo-box">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="searchInput" class="search-input" placeholder="搜尋用戶名稱、輸入文字、辨識結果..." oninput="handleSearch()">
      </div>
      <div class="filter-pills">
        <button class="pill-btn active" data-filter="all" onclick="setFilter('all', this)">全部紀錄</button>
        <button class="pill-btn" data-filter="photo" onclick="setFilter('photo', this)">📸 照片辨識</button>
        <button class="pill-btn" data-filter="text" onclick="setFilter('text', this)">💬 文字紀錄</button>
        <button class="pill-btn" data-filter="goal" onclick="setFilter('goal', this)">🎯 體態目標</button>
        <button class="pill-btn" data-filter="sync" onclick="setFilter('sync', this)">⚡ Web同步</button>
        <button class="pill-btn" data-filter="sec" onclick="setFilter('sec', this)">🛡️ 安全攔截</button>
      </div>
    </div>

    <!-- 📋 日誌主表格 -->
    <div class="table-container">
      <table class="log-table">
        <thead>
          <tr>
            <th style="width: 150px;">時間</th>
            <th style="width: 140px;">用戶</th>
            <th style="width: 130px;">操作類型</th>
            <th>用戶傳送內容</th>
            <th>AI 辨識結果</th>
            <th>處理與回應狀態</th>
          </tr>
        </thead>
        <tbody id="logTableBody"></tbody>
      </table>
    </div>

    <!-- 底部資訊欄 -->
    <div class="footer-bar">
      <div>最後更新時間：<span id="lastUpdatedTime" style="font-family:'JetBrains Mono'; color:var(--black); font-weight:900;">--:--:--</span> (每 3 秒自動更新 · 永久保留所有歷史紀錄)</div>
      <div>Daily Diet v3.1 Engine · Neo-Brutalism Architecture</div>
    </div>
  </div>

  <script>
    let allLogs = ${initialJson};
    let currentAiQuota = ${aiQuotaJson};
    let currentFilter = 'all';
    let searchQuery = '';
    let autoRefreshActive = true;
    let refreshTimer = null;
    let sheetUrl = '${safeSheetUrl}';

    function escapeHtml(str) {
      return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getBadgeClass(type) {
      if (!type) return 'tag-mgmt';
      if (type.includes('照片') || type.includes('圖片')) return 'tag-photo';
      if (type.includes('文字') || type.includes('對話')) return 'tag-text';
      if (type.includes('目標') || type.includes('體態')) return 'tag-goal';
      if (type.includes('安全') || type.includes('攔截') || type.includes('防盜刷')) return 'tag-sec';
      if (type.includes('Web') || type.includes('同步') || type.includes('常用')) return 'tag-sync';
      return 'tag-mgmt';
    }

    function updateMetrics(logs) {
      const list = logs || [];
      document.getElementById('metricTotal').textContent = list.length;
      
      let photo = 0, text = 0, sync = 0, sec = 0;
      list.forEach(l => {
        const t = l.type || '';
        if (t.includes('照片') || t.includes('圖片')) photo++;
        else if (t.includes('文字') || t.includes('對話')) text++;
        else if (t.includes('目標') || t.includes('體態') || t.includes('Web') || t.includes('常用') || t.includes('同步')) sync++;
        else if (t.includes('安全') || t.includes('攔截') || t.includes('防盜刷') || t.includes('失敗')) sec++;
      });

      document.getElementById('metricPhoto').textContent = photo;
      document.getElementById('metricText').textContent = text;
      document.getElementById('metricSync').textContent = sync;
      document.getElementById('metricSec').textContent = sec;
    }

    function updateAiQuotaUI(quota) {
      if (!quota) return;
      const currentRpm = quota.currentRpm || 0;
      const rpmLimit = quota.rpmLimit || 15;
      const rpmPercent = Math.min(100, Math.round((currentRpm / rpmLimit) * 100));
      const dailyUsed = quota.used || 0;
      const dailyLimit = quota.limit || 1500;
      const successRate = quota.successRate !== undefined ? quota.successRate : 100;
      
      const progressBar = document.getElementById('aiProgressBar');
      if (progressBar) {
        progressBar.style.width = Math.max(currentRpm > 0 ? 5 : 0, rpmPercent) + '%';
        if (currentRpm >= 13) progressBar.style.background = '#EF4444';
        else if (currentRpm >= 9) progressBar.style.background = '#F59E0B';
        else progressBar.style.background = '#10B981';
      }

      const rpmHero = document.getElementById('aiRpmHero');
      if (rpmHero) {
        const color = currentRpm >= 13 ? '#DC2626' : (currentRpm >= 9 ? '#D97706' : '#15803D');
        rpmHero.innerHTML = currentRpm + ' <span style="font-size:15px; color:#71717A; font-weight:800;">/ ' + rpmLimit + ' RPM</span>';
        rpmHero.style.color = color;
      }

      const currentRpmEl = document.getElementById('aiCurrentRpm');
      if (currentRpmEl) currentRpmEl.textContent = currentRpm + ' / ' + rpmLimit;

      const usedCount = document.getElementById('aiUsedCount');
      if (usedCount) usedCount.textContent = dailyUsed + ' / ' + dailyLimit.toLocaleString();

      const sRate = document.getElementById('aiSuccessRate');
      if (sRate) sRate.textContent = successRate + '%';

      const statusText = document.getElementById('aiStatusText');
      if (statusText) {
        if (currentRpm >= 13) statusText.textContent = '接近限流 (警戒)';
        else if (currentRpm >= 9) statusText.textContent = '速率偏高';
        else statusText.textContent = '無排隊阻塞';
      }

      const badge = document.getElementById('aiBadge');
      if (badge) {
        if (currentRpm >= 13) {
          badge.textContent = '🔴 接近限流 (' + currentRpm + '/15)';
          badge.style.background = '#FEE2E2';
          badge.style.color = '#B91C1C';
        } else if (currentRpm >= 9) {
          badge.textContent = '🟡 速率注意 (' + currentRpm + '/15)';
          badge.style.background = '#FEF9C3';
          badge.style.color = '#854D0E';
        } else {
          badge.textContent = '🟢 速率安全 (' + currentRpm + '/15)';
          badge.style.background = '#DCFCE7';
          badge.style.color = '#15803D';
        }
      }

      const modelName = document.getElementById('aiModelName');
      if (modelName && quota.currentModel) {
        modelName.textContent = quota.currentModel;
      }
    }


    function renderTable() {
      const tbody = document.getElementById('logTableBody');
      if (!tbody) return;

      const q = searchQuery.toLowerCase().trim();
      const filtered = allLogs.filter(item => {
        // 類別篩選
        if (currentFilter === 'photo' && !item.type.includes('照片')) return false;
        if (currentFilter === 'text' && !item.type.includes('文字') && !item.type.includes('對話')) return false;
        if (currentFilter === 'goal' && !item.type.includes('目標')) return false;
        if (currentFilter === 'sync' && !item.type.includes('Web') && !item.type.includes('常用') && !item.type.includes('同步')) return false;
        if (currentFilter === 'sec' && !item.type.includes('安全') && !item.type.includes('攔截')) return false;

        // 搜尋篩選
        if (q) {
          const matchUser = (item.userId || '').toLowerCase().includes(q);
          const matchType = (item.type || '').toLowerCase().includes(q);
          const matchInput = (item.input || '').toLowerCase().includes(q);
          const matchAi = (item.aiResult || '').toLowerCase().includes(q);
          const matchOutput = (item.output || '').toLowerCase().includes(q);
          return matchUser || matchType || matchInput || matchAi || matchOutput;
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🐼</div><div style="font-weight:900; font-size:16px; color:#000000; margin-bottom:6px;">尚無符合的對話紀錄</div><div>在 LINE 聊天室發送照片或文字，即時遙測將即刻顯示於此！</div></div></td></tr>';
        return;
      }

      let rows = '';
      filtered.forEach(l => {
        const badgeCls = getBadgeClass(l.type);

        rows += '<tr>' +
          '<td class="time-cell" title="' + escapeHtml(l.time) + '">' + escapeHtml(l.time) + '</td>' +
          '<td class="user-cell">👤 ' + escapeHtml(l.userId || '用戶') + '</td>' +
          '<td><span class="tag ' + badgeCls + '">' + escapeHtml(l.type) + '</span></td>' +
          '<td class="input-cell">' + escapeHtml(l.input) + '</td>' +
          '<td class="ai-cell">' + escapeHtml(l.aiResult) + '</td>' +
          '<td class="output-cell">' + escapeHtml(l.output) + '</td>' +
        '</tr>';
      });

      tbody.innerHTML = rows;
    }

    function setFilter(type, btn) {
      currentFilter = type;
      document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      renderTable();
    }

    function handleSearch() {
      searchQuery = document.getElementById('searchInput').value;
      renderTable();
    }

    function updateLogs(newLogs, newSheetUrl, newAiQuota) {
      if (newLogs && Array.isArray(newLogs)) {
        allLogs = newLogs;
        updateMetrics(allLogs);
        renderTable();
        updateAiQuotaUI(currentAiQuota);
        document.getElementById('lastUpdatedTime').textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false });
      }
      if (newAiQuota) updateAiQuotaUI(newAiQuota);
      if (newSheetUrl) {
        sheetUrl = newSheetUrl;
        const btn = document.getElementById('sheetLinkBtn');
        if (btn) {
          btn.href = sheetUrl;
          btn.style.display = 'inline-flex';
        }
      }
    }

    function fetchLogs() {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(function(data) {
          updateLogs(data.logs, data.sheetUrl, data.aiQuota);
        }).getRecentLogsData(300);
      } else {
        fetch('?action=getRecentLogs&limit=300')
          .then(r => r.json())
          .then(data => {
            if (data.status === 'ok') updateLogs(data.logs, data.sheetUrl, data.aiQuota);
          })
          .catch(e => console.warn('Fetch logs error:', e));
      }
    }

    function triggerManualRefresh() {
      fetchLogs();
    }

    function toggleAutoRefresh() {
      autoRefreshActive = !autoRefreshActive;
      const btn = document.getElementById('toggleAutoBtn');
      if (autoRefreshActive) {
        btn.innerHTML = '⏸️ 暫停輪詢';
        refreshTimer = setInterval(fetchLogs, 3000);
      } else {
        btn.innerHTML = '▶️ 啟動輪詢';
        if (refreshTimer) clearInterval(refreshTimer);
      }
    }

    function exportLogsToCsv() {
      if (!allLogs || allLogs.length === 0) {
        alert('尚無任何日誌可供匯出！');
        return;
      }
      let csvContent = "\\uFEFF時間,用戶名稱,操作類型,用戶傳送內容,AI辨識結果,處理狀態\\n";
      allLogs.forEach(l => {
        const escapeCsv = (str) => '"' + String(str || '').replace(/"/g, '""') + '"';
        csvContent += [
          escapeCsv(l.time),
          escapeCsv(l.userId),
          escapeCsv(l.type),
          escapeCsv(l.input),
          escapeCsv(l.aiResult),
          escapeCsv(l.output)
        ].join(',') + '\\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'Daily_Diet_Logs_' + new Date().toISOString().slice(0, 10) + '.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // 初始化渲染
    updateMetrics(allLogs);
    renderTable();
    document.getElementById('lastUpdatedTime').textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    refreshTimer = setInterval(fetchLogs, 3000);
  </script>
</body>
</html>`;
}

// ========================================================
// 📸 12. 原生相機圖文選單 API 部署核心 (LINE Messaging API)
// ========================================================

function setupNativeCameraRichMenu(channelAccessToken, liffId, props) {
  if (!channelAccessToken) {
    throw new Error("缺少 CHANNEL_ACCESS_TOKEN");
  }

  // 1. 定義 6 宮格 Rich Menu 物件 (2500 x 1686)
  // A 格 (左上) 綁定原生 camera 動作，點擊瞬間直接滑出手機相機！
  const richMenuPayload = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "Daily Diet 6-Grid Native Menu",
    chatBarText: "點我開啟飲食選單 🐼",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: "camera" }
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: "message", text: "常用" }
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "喝水 500" }
      },
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "今日總結" }
      },
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: "message", text: "說明" }
      },
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: "uri", uri: `https://liff.line.me/${liffId || '2011098313-nFOisgmf'}` }
      }
    ]
  };

  // 2. 透過 LINE API 建立 Rich Menu
  const createRes = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${channelAccessToken}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(richMenuPayload),
    muteHttpExceptions: true
  });

  const createStatus = createRes.getResponseCode();
  const createBody = JSON.parse(createRes.getContentText() || '{}');
  if (createStatus !== 200 || !createBody.richMenuId) {
    throw new Error(`建立選單失敗 (HTTP ${createStatus}): ${createRes.getContentText()}`);
  }
  const richMenuId = createBody.richMenuId;
  console.log(`✅ Rich Menu 建立成功，ID: ${richMenuId}`);

  // 3. 自 GitHub 下載 2500x1686 圖片並上傳至 LINE
  const imageUrl = 'https://raw.githubusercontent.com/WinnieLineer/daily-diet/main/public/richmenu-2500x1686.jpg';
  const imgRes = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true });
  if (imgRes.getResponseCode() !== 200) {
    throw new Error(`下載選單圖片失敗: HTTP ${imgRes.getResponseCode()}`);
  }
  const imageBlob = imgRes.getBlob().setContentType('image/jpeg');

  const uploadRes = UrlFetchApp.fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${channelAccessToken}`
    },
    payload: imageBlob,
    muteHttpExceptions: true
  });

  if (uploadRes.getResponseCode() !== 200) {
    throw new Error(`上傳選單圖片至 LINE 失敗: HTTP ${uploadRes.getResponseCode()} - ${uploadRes.getContentText()}`);
  }
  console.log(`✅ 選單背景圖片上傳成功！`);

  // 4. 設定為所有使用者的全局預設圖文選單
  const setDefaultRes = UrlFetchApp.fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${channelAccessToken}`
    },
    muteHttpExceptions: true
  });

  if (setDefaultRes.getResponseCode() !== 200) {
    throw new Error(`設定預設選單失敗: HTTP ${setDefaultRes.getResponseCode()}`);
  }
  console.log(`✅ 已成功將 ${richMenuId} 設定為全局預設圖文選單！`);

  if (props) {
    props.setProperty('CURRENT_RICH_MENU_ID', richMenuId);
  }

  return richMenuId;
}






