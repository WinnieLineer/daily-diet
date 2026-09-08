/**
 * ========================================================
 * 07_Webhook.js - LINE Bot Webhook / Web API 路由與主調度核心
 * 包含：doGet(e), doPost(e), handleGoalSettingWithAI, Web3Forms 異常通報
 * ========================================================
 */

// ========================================================
// 🌐 1. doGet(e) - Web App 雙向同步、管理日誌與部署端點
// ========================================================

function doGet(e) {
  try {
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

    // 🚀 0. 觸發一鍵部署原生相機圖文選單 (支援中英文雙語選單)
    if (action === 'deployRichMenu' || action === 'setupRichMenu') {
      const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN');
      const liffId = props.getProperty('LINE_LIFF_ID') || props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';
      try {
        const richMenuId = setupNativeCameraRichMenu(token, liffId, props);
        let enRichMenuId = '';
        try {
          enRichMenuId = setupEnglishNativeCameraRichMenu(token, liffId, props);
        } catch (enErr) {
          console.warn('部署英文選單警告:', enErr);
        }
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'ok', 
          richMenuId, 
          enRichMenuId, 
          message: '中英文原生相機圖文選單已成功部署！' 
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'deployEnglishRichMenu') {
      const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN');
      const liffId = props.getProperty('LINE_LIFF_ID') || props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';
      try {
        const enRichMenuId = setupEnglishNativeCameraRichMenu(token, liffId, props);
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'ok', 
          enRichMenuId, 
          message: '英文原生相機圖文選單已成功部署！' 
        })).setMimeType(ContentService.MimeType.JSON);
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
      recordSystemLog('Web同步餐點', userId, dishName, `${calories}卡 / ${protein}g蛋 / ${water}ml水`, `已同步儲存：【${dishName}】${calories} kcal · ${protein}g 蛋 · ${water}ml 水`);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', meal }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Web App 觸發刪除指定餐點
    if (action === 'deleteMeal' && userId) {
      const dishName = e?.parameter?.dishName;
      const targetId = e?.parameter?.id;
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      deleteMealLog(userId, targetId || dishName, userGistId, pat, props);
      recordSystemLog('Web刪除餐點', userId, dishName || targetId, '', `已自雲端資料庫刪除紀錄：${dishName || targetId}`);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Web App 觸發清空今日紀錄
    if (action === 'clearToday' && userId) {
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      clearTodayLogs(userId, userGistId, pat, props);
      recordSystemLog('Web清空今日', userId, '清空今日餐點', '', '已清空今日所有餐點與補水紀錄');
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
      recordSystemLog('Web加常用', userId, dishName, `${calories}卡 / ${protein}g蛋`, `已新增至常用清單：【${dishName}】${calories} kcal · ${protein}g 蛋`);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 7. Web App 觸發刪除常用餐點
    if (action === 'deleteFavorite' && userId) {
      const favId = e?.parameter?.id || e?.parameter?.favId || e?.parameter?.dishName || e?.parameter?.name;
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      deleteUserFavorite(userId, favId, userGistId, pat, props);
      recordSystemLog('Web刪除常用', userId, favId, '', `已自常用庫移除標識：${favId}`);
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
      recordSystemLog('Web更新目標', userId, `${calories}卡 / ${protein}g蛋 / ${water}ml水`, '', `已更新體態目標：每日熱量 ${calories} kcal · 蛋白質 ${protein}g · 水分 ${water}ml`);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 9. Web App 觸發更新教練性格
    if (action === 'updatePersona' && userId) {
      const persona = e?.parameter?.persona || 'tsundere';
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      setUserPersona(userId, persona, userGistId, pat, props);
      recordSystemLog('Web更新性格', userId, persona, '', `已更新教練性格為「${persona}」`);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', persona }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 10. Web App 觸發更新語言偏好 (支援中英雙語，並即時切換用戶 LINE 圖文選單)
    if (action === 'updateLanguage') {
      const lang = e?.parameter?.lang || 'zh';
      const rawUserId = userId || e?.parameter?.userId || '';
      const userGistId = incomingGist || (rawUserId ? getOrCreateUserGist(rawUserId, pat, props) : '');
      const updated = setUserLanguage(rawUserId || 'web_user', lang, userGistId, pat, props);
      switchUserRichMenuByLanguage(rawUserId, updated, props);

      const lastLineUser = props.getProperty('LAST_ACTIVE_LINE_USER_ID');
      if (lastLineUser && lastLineUser !== rawUserId) {
        setUserLanguage(lastLineUser, lang, null, pat, props);
        switchUserRichMenuByLanguage(lastLineUser, updated, props);
        console.log(`🌐 [Web 語言切換] 同步為最後活躍 LINE 用戶 ${lastLineUser} 切換語系與 Rich Menu 至 ${updated}`);
      }

      recordSystemLog('Web更新語言', rawUserId || lastLineUser || 'unknown', updated, '', `已更新用戶語言為「${updated}」並同步切換 LINE 選單`);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', language: updated, lineUserId: lastLineUser }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 11. 實時運作日誌 API (提供 JSON，預設回傳至少 30 天/最多 1000 筆紀錄)
    if (action === 'getRecentLogs') {
      const limit = Number(e?.parameter?.limit) || 1000;
      const days = typeof e?.parameter?.days !== 'undefined' ? Number(e?.parameter?.days) : 30;
      const logs = getRecentLogsData(limit, days);
      const sheetId = props.getProperty('LOG_SHEET_ID');
      const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : '';
      const aiQuota = getAiQuotaStats(props);
      let lastMaintainerLogin = null;
      try {
        const rawLogin = props.getProperty('LAST_MAINTAINER_LOGIN');
        if (rawLogin) lastMaintainerLogin = JSON.parse(rawLogin);
      } catch (e) {}
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'ok', 
        logs, 
        sheetUrl, 
        aiQuota, 
        lastMaintainerLogin,
        retentionPolicy: 'Google Sheets 永久存檔 (最少留存 30 天以上)',
        daysRequested: days,
        totalLogsReturned: logs.length 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 12. 實時運作日誌儀表板 (已全面遷移至 Web 前端專屬維護者密碼保護端點，自動轉導)
    if (action === 'logs' || action === 'viewLogs' || action === 'log') {
      return HtmlService.createHtmlOutput(generateDashboardHtml())
        .setTitle("🛡️ 轉導至維護者監控中心")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // 13. 測試郵件發送診斷端點 (方便開發者直接透過瀏覽器驗證 MailApp 權限與連線)
    if (action === 'testMail' || action === 'testEmail') {
      const targetEmail = e?.parameter?.email || (typeof DEFAULT_ADMIN_EMAIL !== 'undefined' && DEFAULT_ADMIN_EMAIL) || 'hi@winnie-lin.space';
      const timeNow = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
      const testSub = `🐼 Daily-Diet 郵件發送診斷測試 (${timeNow})`;
      const testBody = `這是一封來自 Daily-Diet LINE Bot 的測試郵件！\n\n⏰ 測試時間：${timeNow} (UTC+8)\n📬 收件信箱：${targetEmail}\n\n若您收到此信，代表 Google Apps Script 郵件發送服務（MailApp）運作 100% 正常！`;

      let isSent = false;
      let errDetail = '';
      try {
        MailApp.sendEmail({ to: targetEmail, subject: testSub, body: testBody });
        isSent = true;
      } catch (mErr) {
        errDetail = mErr.message || String(mErr);
        try {
          GmailApp.sendEmail(targetEmail, testSub, testBody);
          isSent = true;
          errDetail = '';
        } catch (gErr) {
          errDetail = `MailApp: ${errDetail} | GmailApp: ${gErr.message || String(gErr)}`;
        }
      }

      if (isSent) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'ok',
          message: `✅ 測試信件已成功寄送至 ${targetEmail}！請檢查您的收件匣或垃圾郵件。`
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          error: errDetail,
          hint: '若出現權限錯誤，代表 Apps Script 需要進行一次性授權：請在 Google Apps Script 編輯器中選擇 testMailAuthorization 函式並點擊「執行 (Run)」完成 Google 帳號授權。'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 14. 維護者登入安全遙測與裝置資訊登記 (核發永久通行證)
    if (action === 'recordMaintainerLogin') {
      const ip = e?.parameter?.ip || '未知 IP';
      const location = e?.parameter?.location || '未知位置';
      const device = e?.parameter?.device || '未知裝置';
      const browser = e?.parameter?.browser || '';
      const os = e?.parameter?.os || '';
      const token = e?.parameter?.token || '';
      const userName = e?.parameter?.userName || e?.parameter?.user || '系統維護者';
      const timeStr = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");

      const auditRecord = {
        time: timeStr,
        userName: userName,
        ip: ip,
        location: location,
        device: device,
        browser: browser,
        os: os,
        tokenPrefix: token ? token.substring(0, 12) + '...' : 'none'
      };

      props.setProperty('LAST_MAINTAINER_LOGIN', JSON.stringify(auditRecord));
      recordSystemLog(
        '維護者登入', 
        'Maintainer', 
        `IP: ${ip} · 位置: ${location}`, 
        `OS: ${os} · 瀏覽器: ${browser} · 螢幕: ${device}`, 
        `✅ 永久通行證已核發 (${timeStr})`, 
        userName,
        { ip: ip, location: location, device: `${os} · ${browser}` }
      );

      try {
        sendErrorAlertToWeb3Forms({
          error: { message: `【維護者登入安全通知】維護者: ${userName} | IP: ${ip} (${location}) 於 ${timeStr} 成功登入監控中心` },
          userId: 'Maintainer',
          userName: userName,
          operation: '維護者後台登入',
          userInput: `維護者: ${userName} | IP: ${ip} | 地理位置: ${location} | 作業系統: ${os} | 瀏覽器: ${browser} | 螢幕規格: ${device}`,
          source: 'Web 維護者後台 (#/admin)'
        });
      } catch (mailErr) {
        console.warn('發送登入通知失敗:', mailErr);
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'ok', 
        message: '維護者登入日誌已記錄', 
        audit: auditRecord 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput("Daily Diet LINE Bot is running! 🐼");
  } catch (err) {
    console.error("doGet 處理時發生錯誤:", err);
    sendErrorAlertToWeb3Forms({
      error: err,
      userId: e?.parameter?.userId || 'web_user',
      operation: `Web API GET (action: ${e?.parameter?.action || 'none'})`,
      userInput: JSON.stringify(e?.parameter || {}),
      source: 'Web App ➔ GAS doGet'
    });
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message || err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================================
// 📩 2. doPost(e) - LINE Webhook 事件處理核心
// ========================================================

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const props = PropertiesService.getScriptProperties();

  let currentReplyToken = null;
  let currentToken = null;
  let currentUserId = 'system';
  let currentOperation = '接收請求';
  let currentUserInput = '';

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
        if (result && typeof recordSystemLog === 'function') {
          const mUsed = result.model_used || 'Gemini';
          const fallbackNote = (result.failed_attempts && result.failed_attempts.length > 0)
            ? ` (前序 ${result.failed_attempts.length} 次重試)`
            : '';
          recordSystemLog(
            'Web照片辨識', 
            data?.userId || 'web_user', 
            '上傳餐點照片辨識', 
            `[${mUsed}${fallbackNote}] ${result.dish_name || '餐點'} (${result.calories || 0}卡 / ${result.protein || 0}g蛋)`, 
            `[模型: ${mUsed}] 回傳分析結果：【${result.dish_name || '美味餐點'}】${result.calories || 0} kcal · ${result.protein || 0}g 蛋 · ${result.carbs || 0}g 碳 · ${result.fat || 0}g 脂${result.panda_comment ? ' · 教練：「' + result.panda_comment + '」' : ''}`
          );
        }
        return ContentService.createTextOutput(JSON.stringify({ status: 'ok', data: result }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'analyzeText' || action === 'analyzeFoodText') {
        const text = data?.text || data?.textInstruction || e.parameter?.text;
        const result = parseTextWithGeminiFull(text, GEMINI_API_KEY, data?.context, data?.language);
        if (result && typeof recordSystemLog === 'function') {
          const mUsed = result.model_used || 'Gemini';
          const fallbackNote = (result.failed_attempts && result.failed_attempts.length > 0)
            ? ` (前序 ${result.failed_attempts.length} 次重試)`
            : '';
          recordSystemLog(
            'Web文字辨識', 
            data?.userId || 'web_user', 
            text || '輸入餐點文字辨識', 
            `[${mUsed}${fallbackNote}] ${result.dish_name || '餐點'} (${result.calories || 0}卡 / ${result.protein || 0}g蛋)`, 
            `[模型: ${mUsed}] 回傳分析結果：【${result.dish_name || '美味餐點'}】${result.calories || 0} kcal · ${result.protein || 0}g 蛋 · ${result.carbs || 0}g 碳 · ${result.fat || 0}g 脂${result.panda_comment ? ' · 教練：「' + result.panda_comment + '」' : ''}`
          );
        }
        return ContentService.createTextOutput(JSON.stringify({ status: 'ok', data: result }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'completeText' || action === 'getPandaAdvice') {
        const prompt = data?.prompt || e.parameter?.prompt;
        const result = generateGeminiText(prompt, GEMINI_API_KEY);
        if (typeof recordSystemLog === 'function') {
          recordSystemLog(
            'Web教練諮詢', 
            data?.userId || 'web_user', 
            typeof prompt === 'string' ? prompt : '教練諮詢', 
            '', 
            `回傳教練建議：${typeof result === 'string' ? result : ''}`
          );
        }
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

    const CHANNEL_ACCESS_TOKEN = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN');
    const GITHUB_PAT = props.getProperty('GITHUB_PAT');
    const LIFF_ID = props.getProperty('LINE_LIFF_ID') || props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';
    currentToken = CHANNEL_ACCESS_TOKEN;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const replyToken = event.replyToken;
      currentReplyToken = replyToken;
      const userId = event.source?.userId || 'default_user';
      currentUserId = userId;
      currentOperation = `LINE 事件 (${event.type})`;
      currentUserInput = '';

      console.log(`\n========================================`);
      console.log(`📩 [LINE 事件收到] 用戶 ID: ${userId} | 類型: ${event.type}`);

      // 🌟 記錄最後活躍 LINE 原生用戶，並強制依語系綁定正確圖文選單 (突破 LINE App 本地快取)
      if (userId && userId.startsWith('U') && userId.length >= 20) {
        props.setProperty('LAST_ACTIVE_LINE_USER_ID', userId);
        const userLang = getUserLanguage(userId, props);
        const targetMenuId = (userLang === 'en')
          ? props.getProperty('ENGLISH_RICH_MENU_ID')
          : props.getProperty('CURRENT_RICH_MENU_ID');
        if (targetMenuId) {
          try {
            UrlFetchApp.fetch('https://api.line.me/v2/bot/user/' + userId + '/richmenu/' + targetMenuId, {
              method: 'post',
              headers: { 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN },
              muteHttpExceptions: true
            });
          } catch (rmErr) {}
        }
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

      const userLang = getUserLanguage(userId, props, userGistId, GITHUB_PAT);
      const isEn = userLang === 'en';

      // 👑 自動識別並快取系統管理員 LINE ID (唯一限定末尾 497c66 之 Winnie Lin)
      const adminSuffix = (typeof MASTER_ADMIN_LINE_SUFFIX !== 'undefined' && MASTER_ADMIN_LINE_SUFFIX) || '497c66';
      if (userId && userId.endsWith(adminSuffix)) {
        if (props.getProperty('ADMIN_LINE_USER_ID') !== userId) {
          props.setProperty('ADMIN_LINE_USER_ID', userId);
          console.log(`👑 [管理員識別] 已自動鎖定唯一 ADMIN_LINE_USER_ID = ${userId}`);
        }
      }

      // 🌟 Case 0: 首次加入好友 (Follow 事件)
      if (event.type === 'follow') {
        currentOperation = '首次加入好友 (Follow)';
        currentUserInput = '加入好友';
        recordSystemLog('新用戶加入', userId, '加入好友', '', '回傳精美圖文歡迎卡片、新手30秒引導與免責聲明');
        const welcomeFlex = generateWelcomeFlex(userId, LIFF_ID, userGistId, userLang);
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

        currentOperation = `點擊按鈕: ${payload.action || '未知動作'}`;
        currentUserInput = event.postback?.data || '';

        console.log(`🔘 [按鈕點擊] 動作: ${payload.action} | 內容:`, JSON.stringify(payload));

        // 🐣 / 🌐 新舊用戶分流引導
        if (payload.action === 'onboarding') {
          if (payload.type === 'new') {
            recordSystemLog('新手引導', userId, '點擊全新用戶', '', '回傳新手30秒操作引導卡片');
            const newGuideFlex = generateCommandMenuFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, newGuideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          } else if (payload.type === 'web_user') {
            recordSystemLog('老用戶連動', userId, '點擊Web舊用戶', '', '回傳Web舊用戶資料連動引導卡片');
            const webGuideFlex = generateWebUserGuideFlex(userId, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, webGuideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }
        }

        // 🎯 體態目標推薦導引
        if (payload.action === 'goalGuide') {
          recordSystemLog('目標推薦導引', userId, '點擊目標推薦', '', '回傳 AI 體態目標推薦導引卡片');
          const guideFlex = generateGoalGuideFlex(userId, LIFF_ID, userGistId, userLang);
          replyFlexMessage(replyToken, guideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 📖 查看完整操作指令手冊
        if (payload.action === 'showHelp' || payload.action === 'help') {
          recordSystemLog('指令手冊', userId, '點擊查看指令手冊', '', '回傳完整操作指令手冊卡片');
          const helpFlex = generateCommandMenuFlex(userId, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, helpFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🌐 語言設定 Postback
        if (payload.action === 'setLanguage') {
          const chosen = setUserLanguage(userId, payload.lang, userGistId, GITHUB_PAT, props);
          switchUserRichMenuByLanguage(userId, chosen, props);
          const langReply = (chosen === 'en')
            ? "🌐 Language switched to English! 🐼✨\nFrom now on, Panda Coach will analyze your meals, estimate nutrients, and respond in English!\nYour Rich Menu has also been updated to English.\n\n(Type \"中文\" anytime to switch back)"
            : "🌐 語言已成功切換為繁體中文！ 🐼✨\n熊貓教練會以繁體中文為您分析餐點與計算營養囉！\n圖文選單也已為您切換為繁體中文。\n\n（輸入「English」可隨時切換為英文）";
          recordSystemLog('切換語言', userId, `點擊切換為 ${chosen}`, chosen, `回傳提示：${langReply.slice(0, 120)}`);
          replyTextMessage(replyToken, langReply, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        if (payload.action === 'chooseLanguage') {
          const curLang = getUserLanguage(userId, props, userGistId, GITHUB_PAT);
          recordSystemLog('切換語言', userId, '點擊切換語言', curLang, '回傳語言選擇卡片 (繁體中文/English)');
          const langFlex = generateLanguageSelectionFlex(userId, LIFF_ID, userGistId, curLang);
          replyFlexMessage(replyToken, langFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🐛 問題回報引導 Postback
        if (payload.action === 'bugReport') {
          const promptMsg = isEn
            ? "🐛 【Bug Report】\nPlease reply directly with your issue description starting with 'Bug: '!\nExample:\n`Bug: The protein calculation seems off` 🐼"
            : "🐛 【問題與建議回報】\n請直接在下方對話框輸入「回報」加上您的問題內容喔！\n例如：\n`回報 照片辨識蛋白質有誤` 🐼";
          recordSystemLog('問題回報指引', userId, '點擊問題回報按鈕', '', `回傳指引提示：${promptMsg.slice(0, 100)}`);
          replyTextMessage(replyToken, promptMsg, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🎭 挑選教練性格
        if (payload.action === 'choosePersona') {
          recordSystemLog('切換性格', userId, '點擊切換教練性格', '', '回傳教練性格選擇卡片 (傲嬌/溫柔/魔鬼)');
          const personaFlex = generatePersonaSelectionFlex(userId, LIFF_ID, userGistId, props, userLang);
          replyFlexMessage(replyToken, personaFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🎭 設定教練性格
        if (payload.action === 'setPersona') {
          const newPersona = payload.persona || 'tsundere';
          setUserPersona(userId, newPersona, userGistId, GITHUB_PAT, props);
          const personaNamesZh = { tsundere: '傲嬌毒舌教練 🐼😡', gentle: '治癒天使 🐼🥰', hardcore: '魔鬼士官長 🐼🔥' };
          const personaNamesEn = { tsundere: 'Tsundere Coach 🐼😡', gentle: 'Healing Angel 🐼🥰', hardcore: 'Drill Sergeant 🐼🔥' };
          const pName = isEn ? (personaNamesEn[newPersona] || newPersona) : (personaNamesZh[newPersona] || newPersona);
          
          const replyMsg = isEn
            ? `🎭 Successfully switched Panda Coach persona to 【${pName}】!\nSend a meal photo or food name to see your coach's unique critique 🐼✨`
            : `🎭 已成功將熊貓教練性格切換為【${pName}】！\n現在傳送餐點照片或輸入食物，教練就會以全新性格為您專業分析與吐槽囉 🐼✨`;
          recordSystemLog('切換性格', userId, newPersona, '', `回傳確認：${replyMsg.slice(0, 120)}`);
          replyTextMessage(replyToken, replyMsg, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🔢 餐點倍數調整 (0.5x, 1x, 1.5x, 2x, 自訂等)
        if (payload.action === 'setMultiplier') {
          const m = Number(payload.m) || 1;
          const todayStr = getTodayDateString();
          const logs = getTodayLogs(userId, todayStr, props, userGistId);
          let targetMeal = null;
          if (logs.length > 0) {
            let targetIndex = logs.length - 1;
            if (payload.id) {
              const idx = logs.findIndex(l => String(l.id) === String(payload.id));
              if (idx !== -1) targetIndex = idx;
            }
            targetMeal = logs[targetIndex];
          }

          const baseCal = Number(payload.baseCal) || (targetMeal ? (Number(targetMeal.baseCalories) || Number(targetMeal.calories)) : 0);
          const basePro = (payload.basePro !== undefined && !isNaN(Number(payload.basePro)) && payload.basePro !== '') ? Number(payload.basePro) : (targetMeal ? (Number(targetMeal.baseProtein) || Number(targetMeal.protein) || 0) : 0);
          const baseCarb = (payload.baseCarb !== undefined && !isNaN(Number(payload.baseCarb)) && payload.baseCarb !== '') ? Number(payload.baseCarb) : (targetMeal ? (Number(targetMeal.baseCarbs) || Number(targetMeal.carbs) || 0) : 0);
          const baseFat = (payload.baseFat !== undefined && !isNaN(Number(payload.baseFat)) && payload.baseFat !== '') ? Number(payload.baseFat) : (targetMeal ? (Number(targetMeal.baseFat) || Number(targetMeal.fat) || 0) : 0);
          const baseWat = (payload.baseWat !== undefined && !isNaN(Number(payload.baseWat)) && payload.baseWat !== '') ? Number(payload.baseWat) : (targetMeal ? (Number(targetMeal.baseWater) || Number(targetMeal.water) || 0) : 0);
          
          let baseName = payload.baseName ? decodeURIComponent(payload.baseName) : (targetMeal ? (targetMeal.baseDishName || targetMeal.dish_name) : (isEn ? 'Meal' : '餐點'));
          baseName = (baseName || (isEn ? 'Meal' : '餐點')).replace(/^[0-9]+(?:\.[0-9]+)?(?:倍的|x\s*)/i, '').replace(/\s*\(.*倍.*份量\)/g, '').trim();

          const newCal = Math.round(baseCal * m);
          const newPro = Number((basePro * m).toFixed(1));
          const newCarb = Number((baseCarb * m).toFixed(1));
          const newFat = Number((baseFat * m).toFixed(1));
          const newWat = Math.round(baseWat * m);
          const newName = m === 1 ? baseName : (isEn ? `${m}x ${baseName}` : `${m}倍的${baseName}`);

          const baseBreakdown = (targetMeal && targetMeal.baseBreakdown && Array.isArray(targetMeal.baseBreakdown) && targetMeal.baseBreakdown.length > 0)
            ? targetMeal.baseBreakdown
            : (targetMeal && targetMeal.breakdown && Array.isArray(targetMeal.breakdown) ? targetMeal.breakdown : []);

          const scaledBreakdown = baseBreakdown.map(item => ({
            ...item,
            calories: Math.round((item.calories || 0) * m),
            protein: Number(((item.protein || 0) * m).toFixed(1))
          }));

          const updateFields = {
            id: payload.id || (targetMeal ? targetMeal.id : Date.now()),
            dish_name: newName,
            calories: newCal,
            protein: newPro,
            carbs: newCarb,
            fat: newFat,
            water: newWat,
            breakdown: scaledBreakdown.length > 0 ? scaledBreakdown : (targetMeal ? targetMeal.breakdown : []),
            baseBreakdown: baseBreakdown.length > 0 ? baseBreakdown : undefined,
            comment: (targetMeal && targetMeal.comment ? targetMeal.comment.replace(/\s*\(.*倍.*份量\)/g, '').replace(/\s*\(.*x portion\)/gi, '') : '') + (m === 1 ? '' : (isEn ? ` (${m}x portion)` : ` (${m}倍份量)`)),
            baseDishName: baseName,
            baseCalories: baseCal,
            baseProtein: basePro,
            baseCarbs: baseCarb,
            baseFat: baseFat,
            baseWater: baseWat,
            multiplier: m
          };

          const updatedMeal = updateOrSaveMealLog(userId, updateFields, userGistId, GITHUB_PAT, props);
          recordSystemLog('倍數調整', userId, `${baseName} -> x${m}`, `${newCal}卡 / ${newPro}g蛋`, `回傳調整卡片：【${newName}】${newCal} kcal · ${newPro}g 蛋 (${m}倍份量)`);
          replyMealConfirmCard(replyToken, updatedMeal, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // ✏️ 自訂倍數點擊 Fallback (若用戶客戶端不支援 openKeyboard)
        if (payload.action === 'fillCustomMult') {
          replyTextMessage(replyToken, isEn 
            ? "✏️ Please type your desired portion multiplier, e.g.:\n• 2x or double (Double portion)\n• 0.5x or half (Half portion)\n• 1.2x (or type '改 1.2倍')"
            : "✏️ 請直接輸入您想調整的整份倍數，例如：\n• 2倍 或 雙倍 / 兩倍 (整份雙倍)\n• 一半 或 半份 (0.5倍)\n• 改 1.2倍 (指定倍數)",
            CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🍚 碳水減半 / 飯吃一半 (-50% 碳水)
        if (payload.action === 'halveCarbs') {
          const logs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
          if (logs.length > 0) {
            const lastMeal = logs[logs.length - 1];
            const oldCarbs = Number(lastMeal.carbs) || 60;
            const newCarbs = Math.round(oldCarbs / 2);
            const savedCals = (oldCarbs - newCarbs) * 4;
            const newCals = Math.max(0, (Number(lastMeal.calories) || 0) - savedCals);
            const updateFields = {
              carbs: newCarbs,
              calories: newCals,
              comment: (lastMeal.comment || '') + (isEn ? ' (🍚 Halved rice / -50% carbs)' : ' (🍚 飯量已減半 -50% 碳水)')
            };
            const updatedMeal = updateOrSaveMealLog(userId, updateFields, userGistId, GITHUB_PAT, props);
            recordSystemLog('碳水減半', userId, payload.name || lastMeal.dish_name, `碳水 ${oldCarbs}g ➔ ${newCarbs}g (-${savedCals} kcal)`, `回傳今日總結卡片：已將【${lastMeal.dish_name}】碳水減半扣除 ${savedCals} kcal`);
            const summaryFlex = generateDailySummaryFlex(userId, updatedMeal, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }
        }

        // 💾 查看今日總結
        if (payload.action === 'save') {
          console.log(`💾 [查看今日總結] 用戶: ${userId}`);
          const todayLogs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
          let totCal = 0, totPro = 0, totWat = 0;
          todayLogs.forEach(l => { totCal += Number(l.calories)||0; totPro += Number(l.protein)||0; totWat += Number(l.water)||0; });
          recordSystemLog('查看總結', userId, payload.name || '今日總結', `累計: ${totCal}卡 / ${totPro}g蛋 / ${totWat}ml水`, `回傳今日總結卡片 (共 ${todayLogs.length} 餐 · 累計 ${totCal} kcal · ${totPro}g 蛋 · ${totWat}ml 水)`);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 📅 選擇歷史日期 (LINE 原生 datetimepicker)
        if (payload.action === 'pickDate' || (event.postback.params && event.postback.params.date)) {
          const targetDate = (event.postback.params && event.postback.params.date) || payload.date;
          if (targetDate) {
            console.log(`📅 [選擇歷史日期] ${targetDate} 用戶: ${userId}`);
            recordSystemLog('選擇日期', userId, targetDate, '', `回傳 ${targetDate} 歷史飲食總結卡片`);
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, targetDate);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }
        }

        // 📋 管理紀錄 (當日或歷史日期)
        if (payload.action === 'manageMeals' || payload.action === 'manage') {
          const targetDate = payload.date || null;
          console.log(`📋 [管理紀錄] 日期: ${targetDate || '今日'} 用戶: ${userId}`);
          recordSystemLog('管理清單', userId, targetDate ? `管理 ${targetDate}` : '點擊管理紀錄', '', `回傳餐點管理面板卡片 (${targetDate || '今日'})`);
          const mgmtFlex = generateManageMealsFlex(userId, targetDate, LIFF_ID, userGistId, props, userLang);
          replyFlexMessage(replyToken, mgmtFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 📈 查看 7 日趨勢週報
        if (payload.action === 'viewWeeklyTrends' || payload.action === 'weeklyTrends') {
          console.log(`📈 [查看週報] 用戶: ${userId}`);
          recordSystemLog('週報趨勢', userId, '點擊7日週報', '', '回傳近 7 日飲食趨勢與熱量分析卡片');
          const weeklyFlex = generateWeeklyTrendsFlex(userId, LIFF_ID, userGistId, props, userLang);
          replyFlexMessage(replyToken, weeklyFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 💧 快速補水
        if (payload.action === 'quickWater') {
          const amount = Number(payload.amount) || 500;
          const meal = {
            id: Date.now(),
            date: getTodayDateString(),
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
            dish_name: isEn ? `💧 Drink Water ${amount}ml` : `💧 喝水 ${amount}ml`,
            calories: 0,
            protein: 0,
            water: amount,
            comment: isEn ? '💧 Fast Hydration Log' : '💧 快速補水打卡'
          };
          console.log(`💧 [快速補水] +${amount}ml 用戶: ${userId}`);
          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
          const todayLogs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
          let totWat = 0;
          todayLogs.forEach(l => { totWat += Number(l.water)||0; });
          recordSystemLog('快速喝水', userId, `喝水 ${amount}ml`, `+${amount}ml`, `回傳補水卡片：已記錄補水 +${amount}ml (今日累計 ${totWat}ml)`);
          const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // ⭐ 加入常用餐點
        if (payload.action === 'saveFavorite') {
          const favItem = {
            id: Date.now(),
            dish_name: payload.name || (isEn ? 'Favorite Meal' : '常用餐點'),
            calories: Number(payload.cal) || 0,
            protein: Number(payload.pro) || 0,
            water: Number(payload.wat) || 0
          };
          console.log(`⭐ [加入常用] ${favItem.dish_name} | ${favItem.calories} kcal`);
          recordSystemLog('加入常用', userId, favItem.dish_name, `${favItem.calories}卡 / ${favItem.protein}g蛋`, `回傳收藏卡片：【${favItem.dish_name}】(${favItem.calories} kcal) 已加入常用清單`);
          saveUserFavorite(userId, favItem, userGistId, GITHUB_PAT, props);
          const favAddedFlex = generateFavoriteAddedFlex(favItem, LIFF_ID, userGistId, userLang);
          replyFlexMessage(replyToken, favAddedFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // ⚡ 一鍵記錄常用餐點
        if (payload.action === 'quickLogFavorite') {
          const meal = {
            id: Date.now(),
            date: getTodayDateString(),
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
            dish_name: payload.name ? decodeURIComponent(payload.name) : (isEn ? 'Favorite Meal' : '常用餐點'),
            calories: Number(payload.cal) || 0,
            protein: Number(payload.pro) || 0,
            water: Number(payload.wat) || 0,
            comment: isEn ? '⭐ Favorite Quick Log' : '⭐ 常用快捷記錄'
          };
          console.log(`⚡ [一鍵記錄常用] ${meal.dish_name} | ${meal.calories} kcal`);
          recordSystemLog('快捷記錄', userId, meal.dish_name, `${meal.calories}卡 / ${meal.protein}g蛋 / ${meal.water}ml水`, `回傳總結卡片：已快捷記錄【${meal.dish_name}】(${meal.calories} kcal)`);
          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
          const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
          attachMealMultiplierQuickReply(summaryFlex, meal, userId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 刪除單筆餐點
        if (payload.action === 'deleteMeal') {
          const targetDate = payload.date || null;
          console.log(`🗑️ [刪除單筆餐點] 日期: ${targetDate || '今日'} 標識: ${payload.id || payload.index}`);
          recordSystemLog('刪除餐點', userId, `餐點標識: ${payload.id || payload.index} (${targetDate || '今日'})`, '', `回傳總結卡片：已刪除指定紀錄 (${payload.id || payload.index})`);
          deleteMealLog(userId, payload.id || payload.index, userGistId, GITHUB_PAT, props, targetDate);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, targetDate);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 移除常用餐點
        if (payload.action === 'deleteFavorite') {
          console.log(`🗑️ [移除常用] 標識: ${payload.favId || payload.name}`);
          recordSystemLog('移除常用', userId, `標識: ${payload.favId || payload.name}`, '', `回傳更新後清單：已自常用庫移除「${payload.favId || payload.name}」`);
          deleteUserFavorite(userId, payload.favId || payload.name, userGistId, GITHUB_PAT, props);
          if (payload.returnView === 'manage') {
            const mgmtFavFlex = generateManageFavoritesFlex(userId, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, mgmtFavFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          } else {
            const favListFlex = generateFavoritesCarouselFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, favListFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          }
          continue;
        }

        // 📋 常用餐點管理面板
        if (payload.action === 'manageFavorites') {
          console.log(`📋 [常用餐點管理] 用戶: ${userId}`);
          recordSystemLog('常用管理', userId, '常用管理面板', '', '回傳常用餐點管理卡片');
          const mgmtFavFlex = generateManageFavoritesFlex(userId, LIFF_ID, userGistId, props, userLang);
          replyFlexMessage(replyToken, mgmtFavFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 清空今日確認
        if (payload.action === 'clearTodayConfirm') {
          const confirmFlex = generateClearConfirmFlex(LIFF_ID, userGistId, userLang);
          replyFlexMessage(replyToken, confirmFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 確定清空今日
        if (payload.action === 'clearToday') {
          console.log(`🗑️ [清空今日] 用戶: ${userId}`);
          recordSystemLog('清空今日', userId, '清空今日所有紀錄', '', '回傳總結卡片：已清空今日所有餐點紀錄');
          clearTodayLogs(userId, userGistId, GITHUB_PAT, props);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🚨 徹底銷毀所有個人資料
        if (payload.action === 'destroyAllData') {
          console.log(`🚨 [徹底銷毀帳號資料] 用戶: ${userId}`);
          purgeAllUserData(userId, userGistId, GITHUB_PAT, props);
          const purgeReply = isEn
            ? "🗑️ All your meal logs, body targets, favorite items and private cloud Gist have been permanently deleted and unlinked.\nThank you for using Daily Diet! You can restart anytime by sending a photo or text message! 🐼"
            : "🗑️ 您的所有飲食紀錄、體態目標、常用餐點庫及專屬雲端 Gist 已徹底銷毀並解除綁定。\n\n感謝您的使用，若未來需重新記錄，隨時傳送照片或訊息即可重新啟用！🐼";
          recordSystemLog('銷毀所有資料', userId, '使用者要求徹底銷毀所有資料', '', `回傳訊息：${purgeReply.slice(0, 100)}`);
          replyTextMessage(replyToken, purgeReply, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 撤回這筆紀錄
        if (payload.action === 'cancel') {
          if (payload.id || payload.name) {
            deleteMealLog(userId, payload.id || payload.name, userGistId, GITHUB_PAT, props);
            const cancelMsg = isEn
              ? "👌 Successfully cancelled and removed this meal record. Feel free to send new photos or text anytime! 🐼"
              : "👌 已成功為您撤回並刪除此筆餐點紀錄。您可以隨時再傳送照片或文字！🐼";
            recordSystemLog('撤回紀錄', userId, payload.name || payload.id, '', `回傳訊息：${cancelMsg}`);
            replyTextMessage(replyToken, cancelMsg, CHANNEL_ACCESS_TOKEN, userId, props);
          } else {
            const cancelMsg = isEn ? "👌 Cancelled. You can send photos or messages anytime! 🐼" : "👌 已取消此操作。您可以隨時再傳送照片或文字！🐼";
            recordSystemLog('撤回紀錄', userId, '取消操作', '', `回傳訊息：${cancelMsg}`);
            replyTextMessage(replyToken, cancelMsg, CHANNEL_ACCESS_TOKEN, userId, props);
          }
          continue;
        }
      }

      // 💬 Case 2: 用戶發送訊息 (圖片或文字)
      else if (event.type === 'message') {
        // 📸 照片辨識
        if (event.message.type === 'image') {
          currentOperation = '傳送餐點照片進行 AI 分析';
          currentUserInput = `照片 Message ID: ${event.message.id}`;
          sendLineLoadingAnimation(userId, CHANNEL_ACCESS_TOKEN, 25);
          const messageId = event.message.id;
          console.log(`📸 [收到餐點照片] Message ID: ${messageId}`);
          const imageBlob = getLineImageBlob(messageId, CHANNEL_ACCESS_TOKEN);
          const base64Image = Utilities.base64Encode(imageBlob.getBytes());

          const analysis = analyzeMealWithGemini(base64Image, GEMINI_API_KEY, userId, props, userGistId, GITHUB_PAT);
          console.log(`🤖 [照片 AI 辨識結果]`, JSON.stringify(analysis));

          const usedModel = analysis.model_used || 'Gemini';
          const meal = {
            id: Date.now(),
            date: getTodayDateString(),
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
            dish_name: analysis.dish_name || (isEn ? 'Meal' : '美味餐點'),
            calories: Number(analysis.calories) || 0,
            protein: Number(analysis.protein) || 0,
            carbs: Number(analysis.carbs) || 0,
            fat: Number(analysis.fat) || 0,
            water: Number(analysis.water) || 0,
            breakdown: analysis.breakdown || [],
            calculation_note: analysis.calculation_note || '',
            comment: analysis.panda_comment || '',
            baseDishName: analysis.dish_name || (isEn ? 'Meal' : '美味餐點'),
            baseCalories: Number(analysis.calories) || 0,
            baseProtein: Number(analysis.protein) || 0,
            baseCarbs: Number(analysis.carbs) || 0,
            baseFat: Number(analysis.fat) || 0,
            baseWater: Number(analysis.water) || 0,
            multiplier: 1,
            model_used: usedModel
          };

          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
          const fallbackNote = (analysis.failed_attempts && analysis.failed_attempts.length > 0)
            ? ` (前序 ${analysis.failed_attempts.length} 次重試)`
            : '';
          recordSystemLog(
            '照片辨識', 
            userId, 
            `傳送照片 (ID: ${messageId})`, 
            `[${usedModel}${fallbackNote}] ${analysis.dish_name} (${analysis.calories}卡 / ${analysis.protein}g蛋 / ${analysis.water || 0}ml水)`, 
            `[模型: ${usedModel}] 回傳確認卡片：【${analysis.dish_name}】${analysis.calories} kcal · ${analysis.protein}g 蛋 · ${analysis.carbs || 0}g 碳 · ${analysis.fat || 0}g 脂${analysis.panda_comment ? ' · 教練：「' + analysis.panda_comment + '」' : ''}`
          );
          replyMealConfirmCard(replyToken, meal, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🎙️ 語音訊息 (Audio Message - 語音轉文字後無縫串接所有指令與飲食分析)
        if (event.message.type === 'audio') {
          currentOperation = '傳送語音訊息進行 AI 語音轉文字';
          currentUserInput = `語音 Message ID: ${event.message.id}`;
          sendLineLoadingAnimation(userId, CHANNEL_ACCESS_TOKEN, 25);
          const messageId = event.message.id;
          console.log(`🎙️ [收到用戶語音] Message ID: ${messageId}`);

          let transcribedText = '';
          try {
            const audioBlob = getLineAudioBlob(messageId, CHANNEL_ACCESS_TOKEN);
            const contentType = audioBlob.getContentType() || 'audio/mp4';
            const base64Audio = Utilities.base64Encode(audioBlob.getBytes());
            transcribedText = transcribeAudioWithGemini(base64Audio, contentType, GEMINI_API_KEY);
            console.log(`🎙️ [語音轉錄結果] "${transcribedText}"`);
          } catch (audioErr) {
            console.error("🚨 語音下載或辨識失敗:", audioErr);
            recordSystemLog('語音辨識異常', userId, `語音 ID: ${messageId}`, '', `語音下載或辨識失敗: ${audioErr.message}`);
          }

          if (!transcribedText || !transcribedText.trim()) {
            recordSystemLog('語音辨識', userId, `語音 ID: ${messageId}`, '無可辨識語音內容', '回傳重試提示');
            const noVoiceMsg = (userLang === 'en')
              ? "🎙️ Sorry, Panda Coach couldn't hear that clearly. Please try speaking again or send text directly! 🐼"
              : "🎙️ 抱歉，熊貓教練沒有聽清楚您的語音內容～請再說一次，或直接輸入文字記錄喔！🐼✨";
            replyTextMessage(replyToken, noVoiceMsg, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          recordSystemLog('語音辨識', userId, `語音 ID: ${messageId}`, transcribedText, `語音轉錄成功：「${transcribedText}」，自動執行對應功能`);

          // 🔄 無縫轉交文字處理分支
          event.message.type = 'text';
          event.message.text = transcribedText.trim();
          event._isAudioInput = true;
          event._rawAudioText = transcribedText.trim();
        }

        // 💬 文字訊息 (亦承接由語音轉錄而來的文字指令)
        if (event.message.type === 'text') {
          const userText = event.message.text.trim();
          currentOperation = '傳送文字訊息';
          currentUserInput = userText;
          console.log(`💬 [收到用戶文字] "${userText}"`);

          // 🌐 雙語切換 (支援中文/英文雙向切換)
          if (userText === '切換語言' || userText === '換語言' || userText === '語言' || userText === '雙語' || userText.toLowerCase() === 'language' || userText.toLowerCase() === 'switch language') {
            const curLang = getUserLanguage(userId, props, userGistId, GITHUB_PAT);
            recordSystemLog('切換語言', userId, userText, curLang, '回傳語言選擇卡片 (繁體中文/English)');
            const langFlex = generateLanguageSelectionFlex(userId, LIFF_ID, userGistId, curLang);
            replyFlexMessage(replyToken, langFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          if (userText.toLowerCase() === 'english' || userText === '英文' || userText === '切換英文' || userText === '切換成英文') {
            setUserLanguage(userId, 'en', userGistId, GITHUB_PAT, props);
            switchUserRichMenuByLanguage(userId, 'en', props);
            recordSystemLog('切換語言', userId, userText, 'en', '回傳提示：已成功切換為英文，並更新圖文選單');
            replyTextMessage(replyToken, "🌐 Language switched to English! 🐼✨\nFrom now on, Panda Coach will analyze your meals, calculate nutrition, and reply in English!\nYour Rich Menu has also been updated to English.\n\n(Tip: Type \"中文\" anytime to switch back to Chinese)", CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          if (userText === '中文' || userText === '繁體中文' || userText.toLowerCase() === 'chinese' || userText === '切換中文' || userText === '切換成中文') {
            setUserLanguage(userId, 'zh', userGistId, GITHUB_PAT, props);
            switchUserRichMenuByLanguage(userId, 'zh', props);
            recordSystemLog('切換語言', userId, userText, 'zh', '回傳提示：已成功切換為繁體中文，並更新圖文選單');
            replyTextMessage(replyToken, "🌐 語言已成功切換為繁體中文！ 🐼✨\n熊貓教練將會以繁體中文為您分析飲食與計算營養囉！\n圖文選單也已為您切換為繁體中文。\n\n（隨時輸入「English」可切換為英文）", CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🎭 切換教練性格
          if (userText === '切換性格' || userText === '挑選性格' || userText === '選擇性格' || userText === '挑選教練性格' || userText === '換性格' || userText === '改性格' || userText === '換教練' || userText === '教練性格' || userText === '性格' || userText === '教練' || userText === '多重性格' || userText.toLowerCase() === 'persona') {
            recordSystemLog('切換性格', userId, userText, '', '回傳教練性格選擇卡片 (傲嬌/溫柔/魔鬼)');
            const personaFlex = generatePersonaSelectionFlex(userId, LIFF_ID, userGistId, props, userLang);
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
              const personaNamesZh = { tsundere: '傲嬌毒舌教練 🐼😡', gentle: '治癒天使 🐼🥰', hardcore: '魔鬼士官長 🐼🔥' };
              const personaNamesEn = { tsundere: 'Tsundere Coach 🐼😡', gentle: 'Healing Angel 🐼🥰', hardcore: 'Drill Sergeant 🐼🔥' };
              const pName = isEn ? (personaNamesEn[targetPersona] || targetPersona) : (personaNamesZh[targetPersona] || targetPersona);
              const replyMsg = isEn
                ? `🎭 Successfully switched Panda Coach persona to 【${pName}】!\nSend a meal photo or food name to test it out 🐼✨`
                : `🎭 已成功將教練性格切換為【${pName}】！\n快傳送照片或打字測試看看吧 🐼✨`;
              recordSystemLog('切換性格', userId, targetPersona, '', `回傳提示：${replyMsg.slice(0, 100)}`);
              replyTextMessage(replyToken, replyMsg, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 🐛 問題回報 / Bug Report / 意見反饋 (直接在 LINE 聊天室回報，並發送信件給開發團隊)
          const reportPrefixRegex = /^(?:問題回報|bug\s*report|回報|bug|問題|建議|反饋|報錯)[\s:：、,]*(.*)$/is;
          const reportMatch = userText.match(reportPrefixRegex);
          if (reportMatch) {
            const issueDetails = (reportMatch[1] || '').trim();
            if (!issueDetails) {
              const promptMsg = isEn
                ? "🐛 【Bug Report】\nPlease include your issue or suggestion after 'Bug:'!\nExample: `Bug: The protein count seems off` 🐼"
                : "🐛 【問題與建議回報】\n請在「回報」後方加上您的問題或建議說明喔！\n例如：`回報 雞胸肉蛋白質計算有誤差` 🐼";
              replyTextMessage(replyToken, promptMsg, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }

            console.log(`🐛 [收到問題回報] 用戶 ${userId}: ${issueDetails}`);

            const persona = getUserPersona(userId, props, userGistId, GITHUB_PAT);
            const userDisplayName = getUserDisplayName(userId, CHANNEL_ACCESS_TOKEN, props) || `LINE用戶 (${userId.slice(-6)})`;

            // 🚀 1. 發送郵件通報 (雙重機制：GAS 原生 MailApp 直送 + Web3Forms 備援)
            const sendResult = sendBugReportNotification({
              userId,
              userName: userDisplayName,
              issueDetails,
              userLang,
              persona,
              userGistId,
              props
            });

            // 🚀 2. LINE 管理員專屬即時推播通知 (手機秒震動彈出卡片)
            notifyAdminViaLine({
              reporterName: userDisplayName,
              reporterId: userId,
              content: issueDetails,
              userLang: userLang,
              props: props,
              accessToken: CHANNEL_ACCESS_TOKEN
            });

            const isSuccess = sendResult.success;
            const logNote = isSuccess 
              ? `已成功記錄用戶問題回報並寄出通知信件 (${sendResult.recipients || 'hi@winnie-lin.space'})` 
              : `已記錄用戶問題回報，但郵件寄送失敗: ${sendResult.error || '未授權或阻擋'}`;

            recordSystemLog('問題回報', userId, issueDetails, '', `回傳確認卡片：${logNote}`);

            const ackFlex = generateBugReportAckFlex(issueDetails, isSuccess, userLang);
            replyFlexMessage(replyToken, ackFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 💡 說明 / 指令 / 教學 / 歡迎 / 功能清單
          if (userText === '說明' || userText.toLowerCase() === 'help' || userText.toLowerCase() === 'guide' || userText === '使用說明' || userText === '開始' || userText === '教學' || userText === '免責聲明' || userText === '歡迎' || userText === '指令' || userText === '功能' || userText === '功能清單' || userText === '全部功能' || userText === '操作說明' || userText === '指南') {
            recordSystemLog('使用說明', userId, userText, '', '回傳操作說明與功能手冊卡片');
            const helpFlex = generateCommandMenuFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, helpFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🚀 建立/更新原生相機圖文選單
          if (userText === '更新相機選單' || userText === '設定相機選單' || userText === '更新選單' || userText === '部署選單' || userText === '新選單' || userText === '換選單' || userText === '重整選單') {
            recordSystemLog('部署選單', userId, userText, '', '觸發原生相機圖文選單部署並回傳通知');
            try {
              const richMenuId = setupNativeCameraRichMenu(CHANNEL_ACCESS_TOKEN, LIFF_ID, props);
              let enRichMenuId = '';
              try {
                enRichMenuId = setupEnglishNativeCameraRichMenu(CHANNEL_ACCESS_TOKEN, LIFF_ID, props);
              } catch (eErr) {
                console.warn('部署英文選單失敗:', eErr);
              }
              const repMsg = isEn
                ? `🎉 Dual Native Camera Rich Menus deployed successfully!\n\n🇨🇳 Chinese Menu ID: ${richMenuId}\n🇺🇸 English Menu ID: ${enRichMenuId || 'Active'}\n\n📸 Top-left button is bound to LINE Native Camera!\nWhen switching languages, the Rich Menu adapts automatically 🐼✨`
                : `🎉 【原生相機圖文選單】已成功建立！\n\n🇨🇳 中文選單 ID: ${richMenuId}\n🇺🇸 英文選單 ID: ${enRichMenuId || '已建立'}\n\n📸 左上角已綁定 LINE 原生相機動作，點擊直接開相機！\n當切換語言至 English 時，系統會自動將圖文選單切換至英文版本 🐼✨\n\n💡 若手機尚未更新畫面：請關閉並重新打開此 LINE 聊天室即可！`;
              replyTextMessage(replyToken, repMsg, CHANNEL_ACCESS_TOKEN, userId, props);
            } catch (err) {
              replyTextMessage(replyToken, `❌ 部署圖文選單失敗：${err.message}`, CHANNEL_ACCESS_TOKEN, userId, props);
            }
            continue;
          }

          // 📸 拍照記帳導引
          if (userText === '拍照' || userText === '拍照辨識' || userText === '拍照記帳' || userText === '拍餐點' || userText.toLowerCase() === 'camera' || userText.toLowerCase() === 'ai camera') {
            const cameraGuideText = isEn
              ? "📸 Please tap the 【📷 Camera】or 【🖼️ Album】icon to the left of the message input box to send a meal photo! AI Panda will analyze calories and nutrients immediately! 🐼✨"
              : "📸 請點擊下方輸入框左側的【📷 相機】或【🖼️ 相簿】圖示，直接拍照或挑選餐點照片傳給我，AI 熊貓立刻為您分析熱量與營養素！🐼✨";
            recordSystemLog('拍照引導', userId, userText, '', `回傳指引提示：${cameraGuideText.slice(0, 100)}`);
            replyTextMessage(replyToken, cameraGuideText, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 查詢今日總結
          if (userText === '今天' || userText === '總結' || userText === '統計' || userText === '今日' || userText === '今日總結' || userText.toLowerCase() === 'summary' || userText.toLowerCase() === 'today' || userText.toLowerCase() === 'daily summary') {
            const todayLogs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
            let totCal = 0, totPro = 0, totWat = 0;
            todayLogs.forEach(l => { totCal += Number(l.calories)||0; totPro += Number(l.protein)||0; totWat += Number(l.water)||0; });
            recordSystemLog('查詢總結', userId, userText, `累計: ${totCal}卡 / ${totPro}g蛋 / ${totWat}ml水`, `回傳今日總結卡片 (共 ${todayLogs.length} 餐 · 累計 ${totCal} kcal · ${totPro}g 蛋 · ${totWat}ml 水)`);
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📊 查詢 7 日趨勢與歷史週報
          if (userText === '週報' || userText === '趨勢' || userText === '圖表' || userText === '歷史' || userText === '歷史紀錄' || userText === '戰報' || userText === '7天' || userText === '七天' || userText === '分析' || userText.toLowerCase() === 'weekly' || userText.toLowerCase() === 'trend') {
            recordSystemLog('週報趨勢', userId, userText, '', '回傳近 7 日趨勢歷史週報與熱量統計卡片');
            const weeklyFlex = generateWeeklyTrendsFlex(userId, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, weeklyFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📅 查詢昨日/前天歷史紀錄
          if (userText === '昨天' || userText === '昨日' || userText.toLowerCase() === 'yesterday') {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const dateStr = Utilities.formatDate(yesterday, "Asia/Taipei", "yyyy-MM-dd");
            recordSystemLog('查詢歷史', userId, userText, dateStr, `回傳昨日 (${dateStr}) 歷史飲食總結卡片`);
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, dateStr);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          if (userText === '前天') {
            const dayBefore = new Date(Date.now() - 48 * 60 * 60 * 1000);
            const dateStr = Utilities.formatDate(dayBefore, "Asia/Taipei", "yyyy-MM-dd");
            recordSystemLog('查詢歷史', userId, userText, dateStr, `回傳前天 (${dateStr}) 歷史飲食總結卡片`);
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, dateStr);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📅 查詢指定歷史日期 (例如: "2026-09-03", "9/3", "9月3日")
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
              recordSystemLog('查詢歷史日期', userId, userText, targetDateStr, `回傳指定日期 (${targetDateStr}) 歷史飲食總結卡片`);
              const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, targetDateStr);
              replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 💧 快速喝水打卡 (例如: "喝水 500", "喝水 250ml", "+500水", "water 500", "water")
          const waterMatch = userText.match(/^(?:喝水|補水)\s*(\d{2,4})?\s*(?:ml|cc|水)?$/i) 
            || userText.match(/^\+(\d{2,4})\s*(?:ml|cc|水)?$/i) 
            || userText.match(/^(\d{2,4})\s*(?:ml|cc)\s*(?:水)?$/i)
            || userText.match(/^(?:water|drink\s*water)\s*(\d{2,4})?\s*(?:ml|cc)?$/i)
            || userText.match(/^\+?(\d{2,4})\s*(?:ml|cc)?\s*water$/i);
          if (waterMatch || userText === '喝水' || userText === '補水' || userText.toLowerCase() === 'water') {
            const amount = (waterMatch && waterMatch[1]) ? Number(waterMatch[1]) : 500;

            const lastWaterKey = `LAST_WATER_${userId}`;
            const lastWaterTime = Number(props.getProperty(lastWaterKey) || 0);
            const nowMs = Date.now();
            if (nowMs - lastWaterTime < 15000) {
              const dupText = isEn
                ? `💧 Hydration was already logged just now! Please take a sip and log again later 🐼✨\n(You just added ${amount}ml water)`
                : `💧 剛剛已為您記錄過喝水囉！請稍候再打卡 🐼✨\n（您剛才已補充 ${amount}ml 水分）`;
              replyTextMessage(replyToken, dupText, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
            props.setProperty(lastWaterKey, String(nowMs));

            const meal = {
              id: Date.now(),
              date: getTodayDateString(),
              time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
              dish_name: isEn ? `💧 Drink Water ${amount}ml` : `💧 喝水 ${amount}ml`,
              calories: 0,
              protein: 0,
              water: amount,
              comment: isEn ? '💧 Fast Hydration Log' : '💧 快速補水打卡'
            };
            saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
            const todayLogs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
            let totWat = 0;
            todayLogs.forEach(l => { totWat += Number(l.water)||0; });
            recordSystemLog('文字喝水', userId, userText, `+${amount}ml 水分`, `回傳補水卡片：已記錄補水 +${amount}ml (今日累計 ${totWat}ml)`);
            const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // ☁️ 手動綁定既有的 GitHub Gist ID
          if (userText.startsWith('綁定') || userText.startsWith('連動') || userText.toLowerCase().startsWith('gist') || userText.toLowerCase().startsWith('bind')) {
            const cleanGistId = userText.replace(/^(?:綁定|連動|gist|bind)\s*/i, '').replace(/^(?:id)?[:：\s]*/i, '').trim();
            if (cleanGistId && cleanGistId.length >= 8) {
              props.setProperty(`USER_GIST_${userId}`, cleanGistId);
              recordSystemLog('綁定Gist', userId, userText, cleanGistId, `回傳綁定成功訊息：已成功連動個人 Gist 雲端庫 (${cleanGistId})`);
              
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
                      extraMsg = isEn 
                        ? `\n📦 Synced Web logs, nutrition targets & ${favCount} favorite meals in real-time!`
                        : `\n📦 已偵測到您在 Web 端的歷史紀錄、體態目標與 ${favCount} 筆常用餐點，已全面即時連動！`;
                    }
                  }
                } catch (e) {
                  console.error("Gist 同步失敗:", e);
                }
              }

              const bindReply = isEn
                ? `🎉 Congratulations! Successfully linked your LINE account to Gist Cloud:\n🔑 Gist ID: ${cleanGistId}${extraMsg}\n\nType "Favorites" or "Goals" anytime in LINE to use your custom Web data! 🐼✨`
                : `🎉 恭喜！已成功將您的 LINE 帳號連動至 Gist 雲端庫：\n🔑 Gist ID: ${cleanGistId}${extraMsg}\n\n現在在 LINE 輸入「常用」或「目標」，隨時都能取用您在 Web 建立的自訂常用餐點！🐼✨`;
              replyTextMessage(replyToken, bindReply, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 開啟選單 (帶個人專屬 Gist ID)
          if (userText === '選單' || userText === 'App' || userText === '主選單' || userText === '日記' || userText.toLowerCase() === 'menu' || userText.toLowerCase() === 'app') {
            const appUrl = `https://liff.line.me/${LIFF_ID}?userId=${userId}${userGistId ? `&gistId=${userGistId}` : ''}`;
            recordSystemLog('開啟App', userId, userText, '', `回傳 App 連結訊息：${appUrl}`);
            const appReply = isEn
              ? `🐼 Tap to open your Personal Diet Diary (auto-synced with cloud):\n${appUrl}`
              : `🐼 點擊開啟您的個人飲食日記（已自動連動個人雲端）：\n${appUrl}`;
            replyTextMessage(replyToken, appReply, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📋 管理今日紀錄
          if (userText === '管理' || userText === '管理紀錄' || userText === '紀錄管理' || userText === '清單' || userText === '今日清單' || userText === '紀錄' || userText.toLowerCase() === 'manage') {
            recordSystemLog('管理清單', userId, userText, '', '回傳餐點管理面板卡片 (今日)');
            const mgmtFlex = generateManageMealsFlex(userId, getTodayDateString(), LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, mgmtFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // ⭐ 常用餐點與補水輪播庫 (Carousel)
          if (userText === '常用' || userText === '快捷' || userText === '收藏' || userText === '常用清單' || userText === '我的常用' || userText === '常用餐點' || userText === '快捷輪播' || userText.toLowerCase() === 'favorites' || userText.toLowerCase() === 'favorite' || userText.toLowerCase() === 'fav') {
            recordSystemLog('常用輪播', userId, userText, '', '回傳常用餐點與補水快捷輪播卡片');
            const favCarousel = generateFavoritesCarouselFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, favCarousel, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📋 常用餐點管理面板 (例如: "常用管理", "管理常用", "常用庫管理")
          if (
            userText === '常用管理' || 
            userText === '管理常用' || 
            userText === '常用庫管理' || 
            userText === '管理常用庫' || 
            userText === '常用清單管理' ||
            userText.toLowerCase() === 'manage fav' ||
            userText.toLowerCase() === 'manage favorites' ||
            userText.toLowerCase() === 'fav manager'
          ) {
            recordSystemLog('常用管理', userId, userText, '', '回傳常用餐點管理面板卡片');
            const mgmtFavFlex = generateManageFavoritesFlex(userId, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, mgmtFavFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // ⭐ 新增或調整常用餐點 (例如: "加常用 拿鐵 150卡 8蛋 350水", "改常用 拿鐵 180卡 10蛋", "調整常用 ...")
          if (
            userText.startsWith('加常用') || 
            userText.startsWith('新增常用') || 
            userText.startsWith('加入常用') || 
            userText.startsWith('收藏常用') || 
            userText.startsWith('改常用') || 
            userText.startsWith('調整常用') || 
            userText.startsWith('修改常用') || 
            userText.startsWith('編輯常用') || 
            userText.toLowerCase().startsWith('add fav') ||
            userText.toLowerCase().startsWith('edit fav') ||
            userText.toLowerCase().startsWith('update fav')
          ) {
            const cleanStr = userText.replace(/^(?:加常用|新增常用|加入常用|收藏常用|改常用|調整常用|修改常用|編輯常用|add\s*fav(?:orite)?|edit\s*fav(?:orite)?|update\s*fav(?:orite)?)\s*/i, '');
            const calMatch = cleanStr.match(/(\d+)\s*(?:kcal|cal|卡|大卡)/i) || (cleanStr.includes('熱量') ? cleanStr.match(/熱量\s*(\d+)/i) : null);
            const proMatch = cleanStr.match(/(\d+(?:\.\d+)?)\s*(?:g|克|蛋|蛋白質|pro(?:tein)?)/i) || (cleanStr.includes('蛋白質') ? cleanStr.match(/蛋白質\s*(\d+(?:\.\d+)?)/i) : null);
            const watMatch = cleanStr.match(/(\d+)\s*(?:ml|cc|水|水分|wat(?:er)?)/i) || (cleanStr.includes('水分') ? cleanStr.match(/水分\s*(\d+)/i) : null);

            let dishName = cleanStr
              .replace(/(\d+)\s*(?:kcal|cal|卡|大卡)/gi, '')
              .replace(/(?:熱量)?\s*(\d+)\s*(?:kcal|cal|卡|大卡)?/gi, '')
              .replace(/(\d+(?:\.\d+)?)\s*(?:g|克|蛋|蛋白質|pro(?:tein)?)/gi, '')
              .replace(/(\d+)\s*(?:ml|cc|水|水分|wat(?:er)?)/gi, '')
              .trim() || (isEn ? 'Favorite Meal' : '常用餐點');

            const favItem = {
              id: Date.now(),
              dish_name: dishName,
              calories: calMatch ? Number(calMatch[1]) : 0,
              protein: proMatch ? Number(proMatch[1]) : 0,
              water: watMatch ? Number(watMatch[1]) : 0
            };

            const isEdit = userText.startsWith('改') || userText.startsWith('調') || userText.startsWith('編') || userText.startsWith('修') || userText.toLowerCase().startsWith('edit') || userText.toLowerCase().startsWith('update');
            recordSystemLog(isEdit ? '調整常用' : '文字加常用', userId, userText, `${favItem.dish_name} (${favItem.calories}卡 / ${favItem.protein}g蛋)`, `回傳常用收藏卡片：【${favItem.dish_name}】(${favItem.calories} kcal) ${isEdit ? '已成功調整數值' : '已加入常用庫'}`);
            saveUserFavorite(userId, favItem, userGistId, GITHUB_PAT, props);
            const favAddedFlex = generateFavoriteAddedFlex(favItem, LIFF_ID, userGistId, userLang);
            replyFlexMessage(replyToken, favAddedFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🗑️ 文字指令：刪除/移除常用餐點 (例如: "刪除常用 美式咖啡" 或單純輸入 "刪除常用")
          if (
            userText.startsWith('刪除常用') || 
            userText.startsWith('移除常用') || 
            userText.startsWith('丟棄常用') || 
            userText.toLowerCase().startsWith('del fav') || 
            userText.toLowerCase().startsWith('delete fav') ||
            userText.toLowerCase().startsWith('remove fav')
          ) {
            const targetName = userText.replace(/^(?:刪除常用|移除常用|丟棄常用|del\s*fav(?:orite)?|delete\s*fav(?:orite)?|remove\s*fav(?:orite)?)\s*/i, '').trim();
            if (targetName) {
              recordSystemLog('文字移除常用', userId, userText, targetName, `回傳常用輪播：已自常用庫移除「${targetName}」`);
              deleteUserFavorite(userId, targetName, userGistId, GITHUB_PAT, props);
              const favListFlex = generateFavoritesCarouselFlex(userId, LIFF_ID, userGistId, props);
              replyFlexMessage(replyToken, favListFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            } else {
              recordSystemLog('常用管理', userId, userText, '', '回傳常用餐點管理面板供點擊刪除');
              const mgmtFavFlex = generateManageFavoritesFlex(userId, LIFF_ID, userGistId, props, userLang);
              replyFlexMessage(replyToken, mgmtFavFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 🚨 徹底銷毀所有個人資料
          if (userText === '刪除所有資料' || userText === '清除所有資料' || userText === '銷毀所有資料' || userText === '刪除帳號' || userText === '重設資料' || userText === '清空全部') {
            const destroyFlex = generateClearConfirmFlex(LIFF_ID, userGistId, userLang);
            replyFlexMessage(replyToken, destroyFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🗑️ 刪除最後一筆 / 刪除指定餐點
          if (userText === '刪除最後一筆' || userText === '刪除上一筆' || userText === '刪除最後' || userText === '復原' || userText === '撤銷' || userText === '刪除' || userText.toLowerCase() === 'undo' || userText.toLowerCase() === 'delete last') {
            const deleted = deleteMealLog(userId, 'last', userGistId, GITHUB_PAT, props);
            const noLogMsg = isEn ? "🐼 No meal logs recorded today to delete!" : "🐼 今天目前沒有任何飲食紀錄可以刪除喔！";
            recordSystemLog('文字刪除', userId, userText, '', deleted ? '回傳今日總結卡片 (已刪除最後一筆紀錄)' : `回傳提示：${noLogMsg}`);
            if (deleted) {
              const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
              replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            } else {
              replyTextMessage(replyToken, noLogMsg, CHANNEL_ACCESS_TOKEN, userId, props);
            }
            continue;
          }

          if (userText.startsWith('刪除') || userText.startsWith('移除') || userText.toLowerCase().startsWith('delete')) {
            const targetName = userText.replace(/^(?:刪除|移除|delete)\s*/i, '').trim();
            if (targetName) {
              const deleted = deleteMealLog(userId, targetName, userGistId, GITHUB_PAT, props);
              const notFoundMsg = isEn ? `🐼 Cannot find any meal log named "${targetName}" today.` : `🐼 找不到今日名稱為「${targetName}」的餐點紀錄。`;
              recordSystemLog('文字刪除', userId, userText, `目標: ${targetName}`, deleted ? `回傳今日總結卡片 (已刪除「${targetName}」)` : `回傳提示：${notFoundMsg}`);
              if (deleted) {
                const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
                replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              } else {
                replyTextMessage(replyToken, notFoundMsg, CHANNEL_ACCESS_TOKEN, userId, props);
              }
              continue;
            }
          }

          // 🎯 1. 查看目前飲食目標 (例如: "目標", "我的目標", "查看目標", "目前目標", "goals")
          if (userText === '目標' || userText === '我的目標' || userText === '查看目標' || userText === '目前目標' || userText === '每日目標' || userText.toLowerCase() === 'goals' || userText.toLowerCase() === 'goal') {
            const goals = getUserGoals(userId, props, userGistId);
            recordSystemLog('查看目標', userId, userText, `${goals.calories}卡 / ${goals.protein}g蛋 / ${goals.water}ml水`, `回傳目標卡片：每日熱量 ${goals.calories} kcal · 蛋白質 ${goals.protein}g · 水分 ${goals.water}ml`);
            const goalFlex = generateCurrentGoalFlex(userId, goals, LIFF_ID, userGistId, userLang);
            replyFlexMessage(replyToken, goalFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🎯 2. 設定目標導引
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
            userText.toLowerCase() === 'set goal' ||
            ((userText.startsWith('改目標') || userText.startsWith('設定目標') || userText.startsWith('修改目標')) && !/\d+/.test(userText));

          if (isGoalGuideRequest) {
            recordSystemLog('目標推薦導引', userId, userText, '', '回傳 AI 體態目標推薦導引卡片');
            const guideFlex = generateGoalGuideFlex(userId, LIFF_ID, userGistId, userLang);
            replyFlexMessage(replyToken, guideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🎯 3. 設定/修改體態目標與客製化建議
          const isGoalUpdate = userText.startsWith('改目標') ||
            userText.startsWith('設定目標') ||
            userText.startsWith('修改目標') ||
            userText.startsWith('調整目標') ||
            userText.toLowerCase().startsWith('set goal') ||
            (userText.includes('目標') && (userText.includes('減脂') || userText.includes('增肌') || userText.includes('減重') || userText.includes('維持') || userText.includes('卡') || userText.includes('kcal'))) ||
            ((userText.includes('身高') || userText.includes('體重') || userText.toLowerCase().includes('cm') || userText.toLowerCase().includes('kg')) && (userText.includes('減脂') || userText.includes('增肌') || userText.includes('減重') || userText.includes('維持') || userText.includes('建議')));

          if (isGoalUpdate) {
            sendLineLoadingAnimation(userId, CHANNEL_ACCESS_TOKEN, 15);
            recordSystemLog('體態目標', userId, userText, '計算BMR/TDEE中', '正在呼叫 AI 計算體態目標與個人化教練建議');
            handleGoalSettingWithAI(replyToken, userId, userText, userGistId, GITHUB_PAT, props, LIFF_ID, CHANNEL_ACCESS_TOKEN, GEMINI_API_KEY, userLang);
            continue;
          }

          // 🔢 整份倍數調整 (支援: 兩倍, 雙倍, 一半, 半份, 吃一半, 整份兩倍, 0.5x, 1.5倍, 改 2倍, double, half, x0.5 等)
          let detectedMultiplier = null;
          const cleanText = userText.trim().toLowerCase();
          
          if (/^(?:change\s+)?(?:to\s+)?(half|0\.5x|x0\.5)(?:\s+portion)?$/i.test(cleanText) ||
              /^(?:改|修改|改成|吃)?\s*(?:整份)?(一半|半份|0\.5倍)(?:份量)?$/.test(userText)) {
            detectedMultiplier = 0.5;
          } else if (/^(?:change\s+)?(?:to\s+)?(double|2x|x2)(?:\s+portion)?$/i.test(cleanText) ||
              /^(?:改|修改|改成|吃)?\s*(?:整份)?(兩倍|双倍|雙倍|二倍|大份|加大|2倍)(?:份量)?$/.test(userText)) {
            detectedMultiplier = 2.0;
          } else if (/^(?:change\s+)?(?:to\s+)?(1\.5x|x1\.5)(?:\s+portion)?$/i.test(cleanText) ||
              /^(?:改|修改|改成)?\s*(?:整份)?1\.5倍(?:份量)?$/.test(userText)) {
            detectedMultiplier = 1.5;
          } else if (/^(?:change\s+)?(?:to\s+)?(1x|1\.0x|normal)(?:\s+portion)?$/i.test(cleanText) ||
              /^(?:改|修改|改成)?\s*(?:整份)?(?:1倍|1\.0倍|原份|正常|原份量)$/.test(userText)) {
            detectedMultiplier = 1.0;
          } else {
            const numMatch = userText.match(/^(?:改|修改|改成|change)?\s*(?:to\s+)?(?:x|X)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:倍|x|X)?(?:的)?(?:份量)?$/i);
            if (numMatch && numMatch[1]) {
              const parsedVal = parseFloat(numMatch[1]);
              const hasKeyword = /倍|x|X|改|change/i.test(userText);
              if (!isNaN(parsedVal) && parsedVal >= 0.1 && parsedVal <= 10 && (hasKeyword || userText.length <= 4)) {
                detectedMultiplier = parsedVal;
              }
            }
          }

          if (detectedMultiplier !== null) {
            const m = detectedMultiplier;
            const todayStr = getTodayDateString();
            const logs = getTodayLogs(userId, todayStr, props, userGistId);
            if (logs.length > 0) {
              const lastMeal = logs[logs.length - 1];
              const baseCal = Number(lastMeal.baseCalories) || Number(lastMeal.calories) || 0;
              const basePro = (lastMeal.baseProtein !== undefined && !isNaN(Number(lastMeal.baseProtein))) ? Number(lastMeal.baseProtein) : (Number(lastMeal.protein) || 0);
              const baseCarb = (lastMeal.baseCarbs !== undefined && !isNaN(Number(lastMeal.baseCarbs))) ? Number(lastMeal.baseCarbs) : (Number(lastMeal.carbs) || 0);
              const baseFat = (lastMeal.baseFat !== undefined && !isNaN(Number(lastMeal.baseFat))) ? Number(lastMeal.baseFat) : (Number(lastMeal.fat) || 0);
              const baseWat = (lastMeal.baseWater !== undefined && !isNaN(Number(lastMeal.baseWater))) ? Number(lastMeal.baseWater) : (Number(lastMeal.water) || 0);
              const baseName = (lastMeal.baseDishName || lastMeal.dish_name || (isEn ? 'Meal' : '餐點'))
                .replace(/^[0-9]+(?:\.[0-9]+)?(?:倍的|x\s*)/i, '')
                .replace(/\s*\(.*倍.*份量\)/g, '')
                .trim();

              const newCal = Math.round(baseCal * m);
              const newPro = Number((basePro * m).toFixed(1));
              const newCarb = Number((baseCarb * m).toFixed(1));
              const newFat = Number((baseFat * m).toFixed(1));
              const newWat = Math.round(baseWat * m);
              const newName = m === 1 ? baseName : (isEn ? `${m}x ${baseName}` : `${m}倍的${baseName}`);

              const baseBreakdown = (lastMeal.baseBreakdown && Array.isArray(lastMeal.baseBreakdown) && lastMeal.baseBreakdown.length > 0)
                ? lastMeal.baseBreakdown
                : (lastMeal.breakdown && Array.isArray(lastMeal.breakdown) ? lastMeal.breakdown : []);

              const scaledBreakdown = baseBreakdown.map(item => ({
                ...item,
                calories: Math.round((item.calories || 0) * m),
                protein: Number(((item.protein || 0) * m).toFixed(1))
              }));

              const updateFields = {
                id: lastMeal.id,
                dish_name: newName,
                calories: newCal,
                protein: newPro,
                carbs: newCarb,
                fat: newFat,
                water: newWat,
                breakdown: scaledBreakdown.length > 0 ? scaledBreakdown : lastMeal.breakdown,
                baseBreakdown: baseBreakdown.length > 0 ? baseBreakdown : undefined,
                comment: (lastMeal.comment ? lastMeal.comment.replace(/\s*\(.*倍.*份量\)/g, '').replace(/\s*\(.*x portion\)/gi, '') : '') + (m === 1 ? '' : (isEn ? ` (${m}x portion)` : ` (${m}倍份量)`)),
                baseDishName: baseName,
                baseCalories: baseCal,
                baseProtein: basePro,
                baseCarbs: baseCarb,
                baseFat: baseFat,
                baseWater: baseWat,
                multiplier: m
              };

              const updatedMeal = updateOrSaveMealLog(userId, updateFields, userGistId, GITHUB_PAT, props);
              recordSystemLog('文字倍數調整', userId, userText, `${newName} (${newCal}卡 / ${newPro}g蛋)`, `回傳調整卡片：【${newName}】${newCal} kcal · ${newPro}g 蛋 (${m}倍份量)`);
              replyMealConfirmCard(replyToken, updatedMeal, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // ✏️ 直接文字修改餐點數值 (例如: "改 600卡 30蛋 500水" 或 "Change 600cal 30pro")
          if (userText.startsWith('改') || userText.startsWith('修改') || userText.startsWith('改成') || userText.toLowerCase().startsWith('change')) {
            const isHalveCarbs = userText.includes('碳水減半') || userText.includes('飯減半') || userText.includes('飯吃一半') || userText.includes('半碗飯');

            const calMatch = userText.match(/(\d+)\s*(?:kcal|cal|卡|大卡)/i) || (userText.includes('熱量') ? userText.match(/熱量\s*(\d+)/i) : null);
            const proMatch = userText.match(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:蛋|蛋白質|pro(?:tein)?)/i) || (userText.includes('蛋白質') ? userText.match(/蛋白質\s*(\d+(?:\.\d+)?)/i) : null);
            const carbsMatch = userText.match(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:碳|碳水|醣|carb(?:s)?)/i) || (userText.includes('碳水') ? userText.match(/碳水\s*(\d+(?:\.\d+)?)/i) : null);
            const fatMatch = userText.match(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:脂|脂肪|油|fat)/i) || (userText.includes('脂肪') ? userText.match(/脂肪\s*(\d+(?:\.\d+)?)/i) : null);
            const watMatch = userText.match(/(\d+)\s*(?:ml|cc|水|水分|wat(?:er)?)/i) || (userText.includes('水分') ? userText.match(/水分\s*(\d+)/i) : null);

            let cleanName = userText.replace(/^(?:改|修改|改成|change)\s*/i, '')
              .replace(/碳水減半|飯減半|飯吃一半|半碗飯/g, '')
              .replace(/(\d+)\s*(?:kcal|cal|卡|大卡)/gi, '')
              .replace(/(?:熱量)?\s*(\d+)\s*(?:kcal|cal|卡|大卡)?/gi, '')
              .replace(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:蛋|蛋白質|pro(?:tein)?)/gi, '')
              .replace(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:碳|碳水|醣|carb(?:s)?)/gi, '')
              .replace(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:脂|脂肪|油|fat)/gi, '')
              .replace(/(\d+)\s*(?:ml|cc|水|水分|wat(?:er)?)/gi, '')
              .trim();

            const updateFields = {};
            if (cleanName && cleanName !== '熱量' && cleanName !== '蛋白質' && cleanName !== '水分' && cleanName !== '碳水' && cleanName !== '脂肪') {
              updateFields.dish_name = cleanName;
            }
            if (calMatch) updateFields.calories = Number(calMatch[1]);
            if (proMatch) updateFields.protein = Number(proMatch[1]);
            if (carbsMatch) updateFields.carbs = Number(carbsMatch[1]);
            if (fatMatch) updateFields.fat = Number(fatMatch[1]);
            if (watMatch) updateFields.water = Number(watMatch[1]);

            if (isHalveCarbs) {
              const logs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
              if (logs.length > 0) {
                const lastMeal = logs[logs.length - 1];
                const oldCarbs = Number(lastMeal.carbs) || 60;
                const newCarbs = Math.round(oldCarbs / 2);
                updateFields.carbs = newCarbs;
                const savedCals = (oldCarbs - newCarbs) * 4;
                if (!calMatch) {
                  updateFields.calories = Math.max(0, (Number(lastMeal.calories) || 0) - savedCals);
                }
                updateFields.comment = (lastMeal.comment || '') + (isEn ? ' (🍚 Halved rice / -50% carbs)' : ' (🍚 飯/碳水已減半 -50%)');
              }
            } else if (!calMatch && (carbsMatch || fatMatch || proMatch)) {
              const logs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
              if (logs.length > 0) {
                const lastMeal = logs[logs.length - 1];
                const p = updateFields.protein !== undefined ? updateFields.protein : (Number(lastMeal.protein) || 0);
                const c = updateFields.carbs !== undefined ? updateFields.carbs : (Number(lastMeal.carbs) || 0);
                const f = updateFields.fat !== undefined ? updateFields.fat : (Number(lastMeal.fat) || 0);
                if (c > 0 || f > 0 || p > 0) {
                  updateFields.calories = Math.round(p * 4 + c * 4 + f * 9);
                }
              }
            }

            if (Object.keys(updateFields).length > 0) {
              const updatedMeal = updateOrSaveMealLog(userId, updateFields, userGistId, GITHUB_PAT, props);
              recordSystemLog('修改數值', userId, userText, `${updatedMeal.dish_name} (${updatedMeal.calories}卡 / ${updatedMeal.protein}g蛋 / ${updatedMeal.carbs || 0}g碳)`, `回傳今日總結卡片：已更新【${updatedMeal.dish_name}】數值`);
              const summaryFlex = generateDailySummaryFlex(userId, updatedMeal, LIFF_ID, userGistId, props);
              replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          sendLineLoadingAnimation(userId, CHANNEL_ACCESS_TOKEN, 15);
          const analysis = parseTextWithGemini(userText, GEMINI_API_KEY, userId, props, userGistId, GITHUB_PAT);
          const usedModel = analysis.model_used || 'Gemini';
          const fallbackNote = (analysis.failed_attempts && analysis.failed_attempts.length > 0)
            ? ` (前序 ${analysis.failed_attempts.length} 次重試)`
            : '';

          if (analysis.is_food === false) {
            const defaultReply = isEn 
              ? "Hello! I am your AI Panda Nutrition Coach 🐼. Send me a meal photo or type a food name anytime, and I'll calculate calories and nutrients for you!"
              : "哈囉！我是您的 AI 熊貓飲食教練 🐼，隨時傳送餐點照片或輸入食物名稱，我來幫您計算熱量與記錄！";
            let finalReply = analysis.reply || defaultReply;
            if (isEn && /[\u4e00-\u9fa5]/.test(finalReply)) {
              finalReply = defaultReply;
            }
            if (event._isAudioInput) {
              finalReply = `🎙️ 聽到了：「${event._rawAudioText}」\n\n${finalReply}`;
            }
            recordSystemLog(event._isAudioInput ? '語音對話' : '日常對話', userId, event._isAudioInput ? `🎙️ 語音: "${userText}"` : userText, `[${usedModel}${fallbackNote}] 非食物訊息`, `[模型: ${usedModel}] 回傳文字：${finalReply}`);
            replyTextMessage(replyToken, finalReply, CHANNEL_ACCESS_TOKEN, userId, props);
          } else {
            const meal = {
              id: Date.now(),
              date: getTodayDateString(),
              time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
              dish_name: analysis.dish_name || (isEn ? 'Meal' : '美味餐點'),
              calories: Number(analysis.calories) || 0,
              protein: Number(analysis.protein) || 0,
              carbs: Number(analysis.carbs) || 0,
              fat: Number(analysis.fat) || 0,
              water: Number(analysis.water) || 0,
              breakdown: analysis.breakdown || [],
              calculation_note: analysis.calculation_note || '',
              comment: (event._isAudioInput && analysis.panda_comment)
                ? `🎙️「${event._rawAudioText}」\n${analysis.panda_comment}`
                : (analysis.panda_comment || ''),
              baseDishName: analysis.dish_name || (isEn ? 'Meal' : '美味餐點'),
              baseCalories: Number(analysis.calories) || 0,
              baseProtein: Number(analysis.protein) || 0,
              baseCarbs: Number(analysis.carbs) || 0,
              baseFat: Number(analysis.fat) || 0,
              baseWater: Number(analysis.water) || 0,
              multiplier: 1,
              model_used: usedModel
            };

            saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
            const logType = event._isAudioInput ? '語音記餐' : '文字辨識';
            const logInput = event._isAudioInput ? `🎙️ 語音: "${userText}"` : userText;
            recordSystemLog(
              logType, 
              userId, 
              logInput, 
              `[${usedModel}${fallbackNote}] ${analysis.dish_name} (${analysis.calories}卡 / ${analysis.protein}g蛋 / ${analysis.water || 0}ml水)`, 
              `[模型: ${usedModel}] 回傳確認卡片：【${analysis.dish_name}】${analysis.calories} kcal · ${analysis.protein}g 蛋 · ${analysis.carbs || 0}g 碳 · ${analysis.fat || 0}g 脂${analysis.panda_comment ? ' · 教練：「' + analysis.panda_comment + '」' : ''}`
            );
            replyMealConfirmCard(replyToken, meal, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId, props);
          }
        }
      }
    }
  } catch (err) {
    console.error("處理請求時發生錯誤:", err);
    recordSystemLog('系統異常', currentUserId || 'system', err.message || err.toString(), '', '異常報警');
    
    sendErrorAlertToWeb3Forms({
      error: err,
      userId: currentUserId,
      operation: currentOperation,
      userInput: currentUserInput,
      source: 'LINE Bot / GAS doPost'
    });

    if (currentReplyToken && currentToken) {
      try {
        replyTextMessage(currentReplyToken, `⚠️ 熊貓教練提示 / Panda Coach Notice:\n\n${err.message || err.toString()}`, currentToken);
      } catch (replyErr) { }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================================
// 🚨 4. 系統異常與問題回報自動郵件通報模組
// ========================================================

/**
 * 📧 發送用戶問題回報通知 (優先使用 Google Apps Script 原生 MailApp 直送信箱，突破 Web3Forms 免費版伺服端限制)
 */
function sendBugReportNotification(params) {
  const { userId, userName, issueDetails, userLang, persona, userGistId, props } = params;
  const timeStr = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
  const isEn = (userLang === 'en');
  const subject = `[Daily-Diet LINE] ${isEn ? 'Bug Report' : '問題回報'} - ${userName} (${userId ? userId.slice(-6) : 'User'})`;

  const textBody = [
    `【Daily-Diet 熊貓教練 用戶問題與反饋回報】`,
    `========================================`,
    `⏰ 回報時間：${timeStr} (台灣時間 UTC+8)`,
    `👤 用戶暱稱：${userName}`,
    `🆔 用戶 ID：${userId}`,
    `🌐 語言環境：${userLang}`,
    `🎭 教練性格：${persona || 'tsundere'}`,
    `📂 Gist 綁定：${userGistId ? '已綁定 (' + userGistId.slice(0, 8) + '...)' : '未綁定'}`,
    `========================================`,
    `📝 問題與建議內容：`,
    `${issueDetails}`,
    `========================================`,
    `本信件由 Daily-Diet LINE Bot 自動發送。`
  ].join('\n');

  let mailSuccess = false;
  let errorDetail = '';
  let targetEmailStr = '';

  // 1. Google Apps Script 原生 MailApp / GmailApp 直送信箱
  try {
    const candidateEmails = [
      props && props.getProperty('ADMIN_EMAIL'),
      props && props.getProperty('DEVELOPER_EMAIL'),
      (typeof DEFAULT_ADMIN_EMAIL !== 'undefined' && DEFAULT_ADMIN_EMAIL) || 'hi@winnie-lin.space'
    ];
    try {
      const effectiveUser = Session.getEffectiveUser().getEmail();
      if (effectiveUser && effectiveUser.includes('@')) {
        candidateEmails.push(effectiveUser);
      }
    } catch (e) {}

    const validEmails = [...new Set(candidateEmails.filter(Boolean))];
    if (validEmails.length > 0) {
      targetEmailStr = validEmails.join(',');
      try {
        MailApp.sendEmail({
          to: targetEmailStr,
          subject: subject,
          body: textBody
        });
        console.log(`📧 [MailApp] 已成功將問題回報寄送至開發者信箱: ${targetEmailStr}`);
        mailSuccess = true;
      } catch (mailErr) {
        console.warn(`⚠️ [MailApp] 失敗，嘗試 GmailApp 備援:`, mailErr);
        errorDetail = mailErr.message || String(mailErr);
        try {
          GmailApp.sendEmail(targetEmailStr, subject, textBody);
          console.log(`📧 [GmailApp] 已成功將問題回報寄送至開發者信箱: ${targetEmailStr}`);
          mailSuccess = true;
          errorDetail = '';
        } catch (gErr) {
          console.warn(`⚠️ [GmailApp] 亦失敗:`, gErr);
          errorDetail = `MailApp: ${errorDetail} | GmailApp: ${gErr.message || String(gErr)}`;
        }
      }
    }
  } catch (err) {
    errorDetail = err.message || String(err);
    console.warn(`⚠️ [郵件模組異常]:`, err);
  }

  // 2. 備援：嘗試 Web3Forms (若日後升級 Pro 或支援時亦可接收)
  try {
    const web3Res = UrlFetchApp.fetch('https://api.web3forms.com/submit', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        access_key: '72d7f10c-b6c8-42f2-9c40-fc5fac45cad0',
        subject: subject,
        message: textBody,
        from_name: `Daily Diet LINE User (${userName})`,
        device: 'LINE Messaging API / Chat'
      }),
      muteHttpExceptions: true
    });
    const resCode = web3Res.getResponseCode();
    let resJson = {};
    try { resJson = JSON.parse(web3Res.getContentText()); } catch (pErr) {}
    if (resCode === 200 && resJson.success === true) {
      mailSuccess = true;
      console.log(`📧 [Web3Forms] 成功透過 Web3Forms 提交問題回報`);
    }
  } catch (web3Err) {
    console.warn('Web3Forms 提交失敗 (免費版限制伺服端呼叫):', web3Err);
  }

  return {
    success: mailSuccess,
    error: errorDetail,
    recipients: targetEmailStr
  };
}

/**
 * 👑 向系統管理員之 LINE 個人帳號即時發送推播通知卡片 (免開信箱、免被去重，0 秒掌握)
 */
function notifyAdminViaLine(params) {
  const { reporterName, reporterId, content, userLang, props, accessToken } = params;
  try {
    const adminSuffix = (typeof MASTER_ADMIN_LINE_SUFFIX !== 'undefined' && MASTER_ADMIN_LINE_SUFFIX) || '497c66';
    const adminLineId = (props && props.getProperty('ADMIN_LINE_USER_ID')) || '';
    if (!adminLineId || !adminLineId.endsWith(adminSuffix) || !accessToken) {
      console.log('ℹ️ ADMIN_LINE_USER_ID 非授權管理員或未設定，略過 LINE 管理員推播');
      return;
    }

    const timeStr = Utilities.formatDate(new Date(), "Asia/Taipei", "HH:mm:ss");
    const adminFlex = {
      type: "flex",
      altText: `🚨 [用戶問題回報] ${reporterName}: ${content.slice(0, 30)}`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#18181B",
          paddingAll: "14px",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "🚨 用戶問題與意見回報",
                  weight: "bold",
                  size: "sm",
                  color: "#FDE047",
                  flex: 1
                },
                {
                  type: "text",
                  text: timeStr,
                  size: "xxs",
                  color: "#A1A1AA",
                  align: "end"
                }
              ]
            }
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
                  type: "text",
                  text: `👤 回報用戶：${reporterName} (${reporterId ? reporterId.slice(-6) : '未知'})`,
                  size: "xs",
                  weight: "bold",
                  color: "#27272A"
                },
                {
                  type: "text",
                  text: `🌐 用戶語言：${userLang || 'zh'}`,
                  size: "xxs",
                  color: "#71717A"
                }
              ]
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
                  text: "📝 回報內容：",
                  size: "xxs",
                  color: "#991B1B",
                  weight: "bold"
                },
                {
                  type: "text",
                  text: content,
                  size: "xs",
                  color: "#18181B",
                  weight: "bold",
                  wrap: true,
                  margin: "xs"
                }
              ]
            }
          ]
        }
      }
    };

    pushFlexMessage(adminLineId, adminFlex, accessToken, props);
    console.log(`📱 [LINE 推播] 成功發送回報通知至管理員 LINE (${adminLineId.slice(-6)})`);
  } catch (err) {
    console.warn('⚠️ [LINE 管理員推播失敗]:', err);
  }
}

function sendErrorAlertToWeb3Forms(info) {
  try {
    const props = PropertiesService.getScriptProperties();
    const timeStr = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
    const channelToken = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');

    const error = info.error || {};
    const errMessage = error.message || error.toString() || '未知異常';
    const errStack = error.stack || (typeof error === 'object' ? JSON.stringify(error) : '');
    const userId = info.userId || 'system';

    const errSignature = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, `${userId}_${errMessage}`));
    const lastAlertKey = `LAST_ALERT_${errSignature.slice(0, 20)}`;
    const lastAlertTime = Number(props.getProperty(lastAlertKey) || 0);
    const nowMs = Date.now();
    if (nowMs - lastAlertTime < 60000) {
      console.log(`⏳ 60秒內已通報過相同異常，略過發送: ${errMessage}`);
      return;
    }
    props.setProperty(lastAlertKey, String(nowMs));

    let userName = '未知用戶';
    if (userId && userId !== 'system' && userId !== 'default_user' && userId !== 'web_user') {
      userName = getUserDisplayName(userId, channelToken, props) || `LINE用戶 (${userId.slice(-6)})`;
    } else {
      userName = info.userName || '系統背景 / Web訪客';
    }

    const operation = info.operation || '未記錄之操作';
    const userInput = info.userInput || info.userText || '無輸入內容';
    const source = info.source || 'Daily-Diet 伺服端';

    const subject = `🚨 [Daily-Diet 系統異常] ${userName} | ${errMessage.slice(0, 40)}`;

    const messageContent = [
      `🚨 【Daily-Diet 熊貓教練系統異常自動通報】`,
      `----------------------------------------`,
      `⏰ 發生時間：${timeStr} (台灣時間 GMT+8)`,
      `👤 相關用戶：${userName}`,
      `🆔 用戶識別碼：${userId}`,
      `🕹️ 執行操作：${operation}`,
      `💬 用戶輸入內容：${userInput}`,
      `🌐 觸發來源：${source}`,
      `----------------------------------------`,
      `❌ 錯誤訊息：`,
      `${errMessage}`,
      errStack ? `\n📜 呼叫堆疊 (Stack Trace)：\n${errStack}` : ''
    ].join('\n');

    // 1. Google 原生 MailApp 直送開發者信箱
    try {
      const candidateEmails = [
        props && props.getProperty('ADMIN_EMAIL'),
        props && props.getProperty('DEVELOPER_EMAIL'),
        (typeof DEFAULT_ADMIN_EMAIL !== 'undefined' && DEFAULT_ADMIN_EMAIL) || 'hi@winnie-lin.space'
      ];
      try {
        const effectiveUser = Session.getEffectiveUser().getEmail();
        if (effectiveUser && effectiveUser.includes('@')) candidateEmails.push(effectiveUser);
      } catch (e) {}
      const validEmails = [...new Set(candidateEmails.filter(Boolean))];
      if (validEmails.length > 0) {
        MailApp.sendEmail({
          to: validEmails.join(','),
          subject: subject,
          body: messageContent
        });
        console.log(`📧 [MailApp] 成功寄送異常報告至開發者信箱: ${validEmails.join(',')}`);
      }
    } catch (mailErr) {
      console.warn("⚠️ [MailApp] 發送異常郵件失敗:", mailErr);
    }

    // 2. Web3Forms 備援
    try {
      UrlFetchApp.fetch('https://api.web3forms.com/submit', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          access_key: '72d7f10c-b6c8-42f2-9c40-fc5fac45cad0',
          subject: subject,
          from_name: '🐼 Daily-Diet 異常監控小幫手',
          time: timeStr,
          user_name: userName,
          user_id: userId,
          operation: operation,
          error_message: errMessage,
          message: messageContent
        }),
        muteHttpExceptions: true
      });
    } catch (alertErr) {
      console.warn("⚠️ 發送 Web3Forms 錯誤回報失敗:", alertErr);
    }
  } catch (err) {
    console.warn("⚠️ 處理異常通報失敗:", err);
  }
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

/**
 * 🧪 在 Google Apps Script 編輯器手動執行此函式以完成一次性郵件發送權限授權
 */
function testMailAuthorization() {
  const testEmail = (typeof DEFAULT_ADMIN_EMAIL !== 'undefined' && DEFAULT_ADMIN_EMAIL) || 'hi@winnie-lin.space';
  MailApp.sendEmail({
    to: testEmail,
    subject: '🐼 Daily-Diet 郵件權限授權測試信',
    body: '恭喜！若您收到這封信，代表 Google Apps Script 的 MailApp 寄信權限已完全授權成功！'
  });
  console.log('✅ 測試信已寄出至: ' + testEmail);
  return 'SUCCESS';
}
