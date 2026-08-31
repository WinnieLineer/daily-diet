// ========================================================
// 🐼 Daily Diet LINE Bot - Google Apps Script (多用戶自動 Gist 綁定與同步版)
// ========================================================

const PRIMARY_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_CALORIE_GOAL = 2000; // 每日預設熱量目標 (kcal)
const DEFAULT_PROTEIN_GOAL = 100;  // 每日預設蛋白質目標 (g)
const DEFAULT_WATER_GOAL = 2000;    // 每日預設水分目標 (ml)

function doGet(e) {
  const action = e?.parameter?.action;
  const userId = e?.parameter?.userId;

  const props = PropertiesService.getScriptProperties();
  const pat = props.getProperty('GITHUB_PAT');

  // 1. 查詢/綁定個人 Gist ID
  if (action === 'getGistId' && userId) {
    const incomingGist = e?.parameter?.gistId;
    if (incomingGist) props.setProperty(`USER_GIST_${userId}`, incomingGist);
    const gistId = getOrCreateUserGist(userId, pat, props);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', userId, gistId }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. 查詢個人今日飲食紀錄、目標與 Gist (支援 Web App 開啟時即時雙向同步)
  if (action === 'getLogs' && userId) {
    const incomingGist = e?.parameter?.gistId;
    if (incomingGist) {
      props.setProperty(`USER_GIST_${userId}`, incomingGist);
      console.log(`☁️ [Web 端連動] 已自動將用戶 ${userId} 綁定 Gist ID: ${incomingGist}`);
    }
    const todayStr = getTodayDateString();
    const todayLogs = getTodayLogs(userId, todayStr, props);
    const gistId = getOrCreateUserGist(userId, pat, props);

    const calGoal = Number(props.getProperty(`CALORIE_GOAL_${userId}`)) || Number(props.getProperty('CALORIE_GOAL')) || DEFAULT_CALORIE_GOAL;
    const proGoal = Number(props.getProperty(`PROTEIN_GOAL_${userId}`)) || Number(props.getProperty('PROTEIN_GOAL')) || DEFAULT_PROTEIN_GOAL;
    const watGoal = Number(props.getProperty(`WATER_GOAL_${userId}`)) || Number(props.getProperty('WATER_GOAL')) || DEFAULT_WATER_GOAL;

    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      userId,
      gistId,
      todayLogs,
      goals: {
        calories: calGoal,
        protein: proGoal,
        water: watGoal
      },
      favorites: getUserFavorites(userId, props)
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 3. Web App 觸發刪除指定餐點
  if (action === 'deleteMeal' && userId) {
    const dishName = e?.parameter?.dishName;
    const targetId = e?.parameter?.id;
    const userGistId = getOrCreateUserGist(userId, pat, props);
    deleteMealLog(userId, targetId || dishName, userGistId, pat, props);
    recordSystemLog('Web刪除餐點', userId, dishName || targetId, '', '已自雲端刪除');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 4. Web App 觸發清空今日紀錄
  if (action === 'clearToday' && userId) {
    const userGistId = getOrCreateUserGist(userId, pat, props);
    clearTodayLogs(userId, userGistId, pat, props);
    recordSystemLog('Web清空今日', userId, '清空今日餐點', '', '已清空今日');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 5. Web App 觸發新增常用餐點
  if (action === 'addFavorite' && userId) {
    const dishName = e?.parameter?.dishName || e?.parameter?.name || '常用餐點';
    const calories = Number(e?.parameter?.calories) || Number(e?.parameter?.cal) || 0;
    const protein = Number(e?.parameter?.protein) || Number(e?.parameter?.pro) || 0;
    const water = Number(e?.parameter?.water) || Number(e?.parameter?.wat) || 0;
    const userGistId = getOrCreateUserGist(userId, pat, props);
    const favItem = { id: Date.now(), dish_name: dishName, calories, protein, water };
    saveUserFavorite(userId, favItem, userGistId, pat, props);
    recordSystemLog('Web加常用', userId, dishName, `${calories}卡 / ${protein}g蛋`, '已同步常用庫');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 6. Web App 觸發刪除常用餐點
  if (action === 'deleteFavorite' && userId) {
    const favId = e?.parameter?.id || e?.parameter?.favId || e?.parameter?.dishName || e?.parameter?.name;
    const userGistId = getOrCreateUserGist(userId, pat, props);
    deleteUserFavorite(userId, favId, userGistId, pat, props);
    recordSystemLog('Web刪除常用', userId, favId, '', '已自常用庫移除');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 5. Web App 觸發更新個人飲食目標
  if (action === 'updateGoals' && userId) {
    const calories = Number(e?.parameter?.calories);
    const protein = Number(e?.parameter?.protein);
    const water = Number(e?.parameter?.water);
    if (calories) props.setProperty(`CALORIE_GOAL_${userId}`, String(calories));
    if (protein) props.setProperty(`PROTEIN_GOAL_${userId}`, String(protein));
    if (water) props.setProperty(`WATER_GOAL_${userId}`, String(water));
    const userGistId = getOrCreateUserGist(userId, pat, props);
    if (pat && userGistId) {
      syncGoalsToUserGist({ calories, protein, water }, userGistId, pat);
    }
    recordSystemLog('Web更新目標', userId, `${calories}卡 / ${protein}g蛋 / ${water}ml水`, '', '已同步更新');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 6. 實時運作日誌 API (提供 JSON)
  if (action === 'getRecentLogs') {
    const logs = getRecentLogsData();
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', logs }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 6. 實時運作日誌儀表板 (直接在瀏覽器查看所有用戶傳入的訊息與 AI 回應)
  if (action === 'logs' || action === 'viewLogs' || action === 'log') {
    const initialLogs = getRecentLogsData();

    const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const generateRows = (logs) => {
      if (!logs || logs.length === 0) {
        return '<tr><td colspan="6" style="padding: 30px; text-align: center; color: #A1A1AA; font-weight: bold;">尚無對話紀錄，請在 LINE 聊天室發送照片或文字測試！</td></tr>';
      }
      return logs.map(l => `
        <tr style="border-bottom: 1px solid #E4E4E7;">
          <td style="padding: 10px 8px; font-size: 12px; color: #71717A; white-space: nowrap;">${l.time}</td>
          <td style="padding: 10px 8px; font-size: 12px; font-weight: bold; color: #18181B;">...${l.userId}</td>
          <td style="padding: 10px 8px; font-size: 12px;"><span style="background: #FEF9C3; padding: 3px 8px; border-radius: 6px; font-weight: bold; color: #713F12;">${l.type}</span></td>
          <td style="padding: 10px 8px; font-size: 13px; color: #000000; font-weight: bold;">${escapeHtml(l.input)}</td>
          <td style="padding: 10px 8px; font-size: 12px; color: #2563EB; font-weight: 500;">${escapeHtml(l.aiResult)}</td>
          <td style="padding: 10px 8px; font-size: 12px; color: #059669; font-weight: 500;">${escapeHtml(l.output)}</td>
        </tr>
      `).join('');
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>🐼 Daily Diet 實時對話與運作日誌</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F4F4F5; margin: 0; padding: 20px; }
          .container { max-width: 1100px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 24px; border: 2px solid #000000; }
          h1 { margin: 0; font-size: 20px; color: #000000; display: flex; align-items: center; gap: 10px; }
          .badge { background: #FDE047; color: #000000; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1.5px solid #000; }
          .btn-refresh { background: #000000; color: #FFFFFF; border: none; padding: 6px 14px; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer; transition: opacity 0.2s; }
          .btn-refresh:active { opacity: 0.8; }
          table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 18px; }
          th { background: #000000; color: #FFFFFF; padding: 12px 8px; font-size: 12px; font-weight: bold; }
          th:first-child { border-top-left-radius: 8px; }
          th:last-child { border-top-right-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <h1>🐼 Daily Diet 實時對話與運作日誌 <span class="badge" id="statusBadge">⚡ 即時連線中</span></h1>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 13px; color: #71717A; font-weight: 500;" id="logCount">共保留最近 ${initialLogs.length} 筆紀錄</span>
              <a href="https://winnielineer.github.io/daily-diet/privacy.html" target="_blank" style="background: #EFF6FF; color: #1D4ED8; text-decoration: none; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; border: 1.5px solid #BFDBFE;">🛡️ 隱私政策</a>
              <button class="btn-refresh" onclick="refreshLogs()">🔄 手動整理</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>時間</th>
                <th>用戶</th>
                <th>類型</th>
                <th>用戶傳送內容</th>
                <th>AI 辨識結果</th>
                <th>回應與狀態</th>
              </tr>
            </thead>
            <tbody id="logTableBody">
              ${generateRows(initialLogs)}
            </tbody>
          </table>
        </div>

        <script>
          function escapeHtml(str) {
            return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          }

          function renderLogs(logs) {
            var tbody = document.getElementById('logTableBody');
            var countSpan = document.getElementById('logCount');
            if (!tbody) return;

            countSpan.innerText = '共保留最近 ' + (logs ? logs.length : 0) + ' 筆紀錄';

            if (!logs || logs.length === 0) {
              tbody.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center; color: #A1A1AA; font-weight: bold;">尚無對話紀錄，請在 LINE 聊天室發送照片或文字測試！</td></tr>';
              return;
            }

            var html = '';
            for (var i = 0; i < logs.length; i++) {
              var l = logs[i];
              html += '<tr style="border-bottom: 1px solid #E4E4E7;">' +
                '<td style="padding: 10px 8px; font-size: 12px; color: #71717A; white-space: nowrap;">' + l.time + '</td>' +
                '<td style="padding: 10px 8px; font-size: 12px; font-weight: bold; color: #18181B;">...' + l.userId + '</td>' +
                '<td style="padding: 10px 8px; font-size: 12px;"><span style="background: #FEF9C3; padding: 3px 8px; border-radius: 6px; font-weight: bold; color: #713F12;">' + l.type + '</span></td>' +
                '<td style="padding: 10px 8px; font-size: 13px; color: #000000; font-weight: bold;">' + escapeHtml(l.input) + '</td>' +
                '<td style="padding: 10px 8px; font-size: 12px; color: #2563EB; font-weight: 500;">' + escapeHtml(l.aiResult) + '</td>' +
                '<td style="padding: 10px 8px; font-size: 12px; color: #059669; font-weight: 500;">' + escapeHtml(l.output) + '</td>' +
                '</tr>';
            }
            tbody.innerHTML = html;
          }

          function refreshLogs() {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
              google.script.run.withSuccessHandler(renderLogs).getRecentLogsData();
            }
          }

          // 每 3 秒在背景靜默拉取最新日誌，絕不重新載入整個網頁或閃爍
          setInterval(refreshLogs, 3000);
        </script>
      </body>
      </html>
    `;

    return HtmlService.createHtmlOutput(html)
      .setTitle("🐼 Daily Diet 實時運作日誌")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return ContentService.createTextOutput("Daily Diet LINE Bot is running! 🐼");
}

function getRecentLogsData() {
  const props = PropertiesService.getScriptProperties();
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
  const CHANNEL_SECRET = props.getProperty('LINE_CHANNEL_SECRET');

  // 🛡️ 企業級安全性：URL Secret Token 防偽防盜刷防護
  if (CHANNEL_SECRET) {
    const incomingSecret = e.parameter?.secret || e.parameter?.token;
    if (incomingSecret !== CHANNEL_SECRET) {
      console.warn("🚨 [安全攔截] 收到未經授權的 Webhook 請求！URL Secret 不符或缺失。");
      recordSystemLog('安全攔截', 'unknown', '偽造Webhook請求', 'HTTP 403', '已拒絕處理');
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Forbidden: Invalid or missing secret' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  let currentReplyToken = null;
  let currentToken = null;

  try {
    const data = JSON.parse(e.postData.contents);
    const action = e.parameter?.action || data?.action;
    const GEMINI_API_KEY = props.getProperty('GEMINI_API_KEY');

    // 🌟 1. Web App 直通 Gemini AI 辨識 API (提供 Web App 與 LINE 共享 Gemini 額度)
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
        recordSystemLog('新用戶加入', userId, '加入好友', '', '發送歡迎詞與免責聲明');
        const welcomeText = `🐼 歡迎使用 Daily Diet 飲食管理助手！\n\n我是您的專屬 AI 熊貓教練，隨時傳送【餐點照片】或【文字】（例如：「午餐 雞胸肉便當 600卡 35蛋」），我會自動為您計算熱量與營養素！\n\n💡 免責聲明：\n「Daily Diet 與熊貓教練所提供之營養素、卡路里估算及飲食建議僅供個人日常健康管理參考，不具任何醫療診斷、治療或專業營養處方效益。若您有慢性疾病、孕期、哺乳期或特殊體質，進行任何飲食調整前請務必諮詢合格醫師或註冊營養師。」`;
        replyTextMessage(replyToken, welcomeText, CHANNEL_ACCESS_TOKEN, userId, props);
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

        // ✅ 按下【儲存紀錄】
        // 💾 按下【儲存 / 查看今日總結】
        if (payload.action === 'save') {
          console.log(`💾 [查看今日總結] 用戶: ${userId}`);
          recordSystemLog('查看總結', userId, payload.name || '今日總結', '', '已發送總結卡片');
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
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

        // 🗑️ 按下【刪除單筆餐點】
        if (payload.action === 'deleteMeal') {
          console.log(`🗑️ [刪除單筆餐點] 標識: ${payload.id || payload.index}`);
          recordSystemLog('刪除餐點', userId, `餐點標識: ${payload.id || payload.index}`, '', '已刪除單筆紀錄');
          deleteMealLog(userId, payload.id || payload.index, userGistId, GITHUB_PAT, props);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
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

        // ❌ 按下【取消 / 放棄不記錄】
        else if (payload.action === 'cancel') {
          if (payload.id || payload.name) {
            deleteMealLog(userId, payload.id || payload.name, userGistId, GITHUB_PAT, props);
            recordSystemLog('取消紀錄', userId, payload.name || payload.id, '', '已自資料庫刪除此筆餐點');
            replyTextMessage(replyToken, "👌 已取消並自資料庫刪除此筆餐點。您可以隨時再傳送照片或文字！🐼", CHANNEL_ACCESS_TOKEN, userId, props);
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
          const messageId = event.message.id;
          console.log(`📸 [收到餐點照片] Message ID: ${messageId}`);
          const imageBlob = getLineImageBlob(messageId, CHANNEL_ACCESS_TOKEN);
          const base64Image = Utilities.base64Encode(imageBlob.getBytes());

          const analysis = analyzeMealWithGemini(base64Image, GEMINI_API_KEY);
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

          // 💡 說明 / 教學 / 免責聲明
          if (userText === '說明' || userText === 'help' || userText === '使用說明' || userText === '開始' || userText === '教學' || userText === '免責聲明') {
            recordSystemLog('使用說明', userId, userText, '', '發送使用說明與免責聲明');
            const helpText = `🐼 Daily Diet 使用教學：\n\n1. 📸 拍照記錄：直接傳送餐點照片，AI 自動辨識營養熱量。\n2. ✍️ 打字記錄：直接傳送「雞胸肉沙拉 350卡 30蛋 500水」。\n3. 📊 今日總結：輸入「今日」或「總結」查看進度。\n4. 🎯 目標設定：輸入「改目標 175cm 70kg 男 減脂」。\n5. 🗑️ 刪除紀錄：輸入「刪除最後一筆」或「管理」。\n\n💡 免責聲明：\n「Daily Diet 與熊貓教練所提供之營養素、卡路里估算及飲食建議僅供個人日常健康管理參考，不具任何醫療診斷、治療或專業營養處方效益。若您有慢性疾病、孕期、哺乳期或特殊體質，進行任何飲食調整前請務必諮詢合格醫師或註冊營養師。」`;
            replyTextMessage(replyToken, helpText, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 查詢今日總結
          if (userText === '今天' || userText === '總結' || userText === '統計' || userText === '今日' || userText === '今日總結') {
            recordSystemLog('查詢總結', userId, userText, '', '已發送今日總結');
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
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
                      extraMsg = `\n📦 已偵測到您在 Web 端的歷史紀錄與體態目標，已全面即時連動！`;
                    }
                  }
                } catch (e) {}
              }

              replyTextMessage(replyToken, `🎉 恭喜！已成功將您的 LINE 帳號連動至 Gist 雲端庫：\n🔑 Gist ID: ${cleanGistId}${extraMsg}\n\n現在在 LINE 記錄餐點或補水，都會 100% 雙向同步至您的 Web App！🐼✨`, CHANNEL_ACCESS_TOKEN, userId, props);
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
            const cal = Number(props.getProperty(`CALORIE_GOAL_${userId}`)) || 2000;
            const pro = Number(props.getProperty(`PROTEIN_GOAL_${userId}`)) || 100;
            const wat = Number(props.getProperty(`WATER_GOAL_${userId}`)) || 2500;
            recordSystemLog('查看目標', userId, userText, `${cal}卡 / ${pro}g蛋 / ${wat}ml水`, '發送目前目標卡片');
            const goalFlex = generateCurrentGoalFlex(userId, { calories: cal, protein: pro, water: wat }, LIFF_ID, userGistId);
            replyFlexMessage(replyToken, goalFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🎯 2. 設定/修改體態目標與客製化建議 (例如: "改目標 165cm 55kg 女 減脂", "設定目標 1800卡 120蛋 2500水")
          const isGoalUpdate = userText.startsWith('改目標') ||
            userText.startsWith('設定目標') ||
            userText.startsWith('修改目標') ||
            userText.startsWith('調整目標') ||
            (userText.includes('目標') && (userText.includes('減脂') || userText.includes('增肌') || userText.includes('減重') || userText.includes('維持') || userText.includes('卡') || userText.includes('kcal'))) ||
            ((userText.includes('身高') || userText.includes('體重')) && (userText.includes('減脂') || userText.includes('增肌') || userText.includes('減重') || userText.includes('維持') || userText.includes('建議')));

          if (isGoalUpdate) {
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
          const analysis = parseTextWithGemini(userText, GEMINI_API_KEY);
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
                  { type: "text", text: "🔥 熱量", size: "xxs", color: "#E11D48", weight: "bold" },
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
                  { type: "text", text: "🥩 蛋白質", size: "xxs", color: "#2563EB", weight: "bold" },
                  { type: "text", text: `${analysis.protein}g`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "克", size: "xxs", color: "#1E3A8A", weight: "bold" }
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
                  { type: "text", text: "💧 水分", size: "xxs", color: "#0891B2", weight: "bold" },
                  { type: "text", text: `${analysis.water || 0}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "ml", size: "xxs", color: "#164E63", weight: "bold" }
                ]
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
              {
                type: "text",
                text: `💬 熊貓短評：${analysis.panda_comment || '這餐看起來營養很均衡喔！'}`,
                size: "xs",
                color: "#713F12",
                weight: "bold",
                wrap: true
              }
            ]
          },
          {
            type: "text",
            text: "請確認營養數值，點擊儲存或微調：",
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
              label: "💾 儲存並看今日總結",
              data: postbackSaveData,
              displayText: `💾 儲存餐點：${analysis.dish_name}`
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
                  label: "✏️ 填入微調",
                  data: JSON.stringify({ action: 'fillEdit' }),
                  inputOption: "openKeyboard",
                  fillInText: `${analysis.dish_name} ${analysis.calories}卡 ${analysis.protein || 0}蛋 ${analysis.water || 0}水`
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
                  label: "⭐ 加常用",
                  data: postbackFavData,
                  displayText: `⭐ 收藏至常用：${analysis.dish_name}`
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
              label: "❌ 取消不記錄",
              data: postbackCancelData,
              displayText: "❌ 取消紀錄"
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

function generateDailySummaryFlex(userId, justSavedMeal, liffId, userGistId, props) {
  const todayStr = getTodayDateString();
  const allLogs = getTodayLogs(userId, todayStr, props);

  let totalCal = 0;
  let totalPro = 0;
  let totalWater = 0;
  let mealItems = [];

  allLogs.forEach((log) => {
    totalCal += Number(log.calories) || 0;
    totalPro += Number(log.protein) || 0;
    totalWater += Number(log.water) || 0;
    mealItems.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: `• ${log.time} ${log.dish_name}`, size: "xs", color: "#18181B", weight: "bold", flex: 4, wrap: true },
        { type: "text", text: `${log.calories} kcal`, size: "xs", color: "#E11D48", weight: "bold", flex: 2, align: "end" }
      ]
    });
  });

  const calGoal = Number(props.getProperty(`CALORIE_GOAL_${userId}`)) || Number(props.getProperty('CALORIE_GOAL')) || DEFAULT_CALORIE_GOAL;
  const proGoal = Number(props.getProperty(`PROTEIN_GOAL_${userId}`)) || Number(props.getProperty('PROTEIN_GOAL')) || DEFAULT_PROTEIN_GOAL;
  const watGoal = Number(props.getProperty(`WATER_GOAL_${userId}`)) || Number(props.getProperty('WATER_GOAL')) || DEFAULT_WATER_GOAL;
  const remainingCal = Math.max(0, calGoal - totalCal);
  const calPercent = Math.min(100, Math.round((totalCal / calGoal) * 100));

  let coachTip = "飲食紀錄養成中，繼續保持！🐼";
  if (totalCal > calGoal) {
    coachTip = "今日熱量已達標，晚點多喝水散步消化喔！🔥";
  } else if (remainingCal <= 400) {
    coachTip = "熱量控制得非常剛好，即將完美達標！💪";
  } else {
    coachTip = `今天還可以再補充約 ${remainingCal} kcal 的營養餐點！🥗`;
  }

  const appTargetUrl = userGistId ? `https://liff.line.me/${liffId}?gistId=${userGistId}` : `https://liff.line.me/${liffId}`;

  return {
    type: "flex",
    altText: `📊 今日飲食總結：已攝取 ${totalCal} / ${calGoal} kcal`,
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
            text: justSavedMeal ? "✅ 紀錄成功！今日總結" : "📊 今日飲食進度看板",
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
                  { type: "text", text: "🔥 今日總熱量", size: "xxs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${totalCal}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: `${calPercent}%`, size: "xxs", color: "#71717A", weight: "bold" }
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
                  { type: "text", text: "🥩 今日蛋白質", size: "xxs", color: "#2563EB", weight: "bold" },
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
                  { type: "text", text: "💧 今日水分", size: "xxs", color: "#0891B2", weight: "bold" },
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
              { type: "text", text: `🍱 今日已記 ${allLogs.length} 餐：`, size: "xs", weight: "bold", color: "#000000" },
              ...(mealItems.length > 0 ? mealItems : [{ type: "text", text: "今日尚未有飲食紀錄", size: "xs", color: "#A1A1AA" }])
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
        paddingAll: "14px",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#FDE047",
            action: {
              type: "uri",
              label: "📱 開啟 App 查看完整圖表",
              uri: appTargetUrl
            }
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

function getTodayLogs(userId, dateStr, props) {
  const todayKey = `DIET_LOGS_${userId}_${dateStr}`;
  try {
    const raw = props.getProperty(todayKey);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
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

function analyzeMealWithGemini(base64Image, apiKey) {
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
  const prompt = `Analyze this food image. Return ONLY a raw JSON object with keys:
"dish_name" (Traditional Chinese string),
"calories" (integer calories in kcal, 0 if unknown),
"protein" (integer protein in grams, 0 if unknown),
"carbs" (integer estimated carbohydrates in grams, 0 if unknown),
"fat" (integer estimated total fat in grams, 0 if unknown),
"water" (integer estimated water/liquid intake in ml, e.g. 500 for soup/beverage, or 0 if dry food),
"panda_comment" (Traditional Chinese witty comment). No markdown.`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }]
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

      return {
        dish_name: parsed.dish_name || "美味餐點",
        calories: Number(parsed.calories) || 0,
        protein: Number(parsed.protein) || 0,
        carbs: Number(parsed.carbs) || 0,
        fat: Number(parsed.fat) || 0,
        water: Number(parsed.water) || 0,
        panda_comment: parsed.panda_comment || "看起來營養很豐富喔！🐼"
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Gemini 辨識失敗：${lastError?.message || '未知錯誤'}`);
}

function parseTextWithGemini(text, apiKey) {
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
  const prompt = `You are an AI panda nutrition coach for a diet tracking app. Analyze this user message: "${text}".
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
  "panda_comment": "幽默的熊貓飲食短評 (Traditional Chinese)"
}

If it is NOT food (e.g. "XD", laughter, greetings "你好", questions, casual chat):
Return ONLY raw JSON:
{
  "is_food": false,
  "reply": "親切、幽默又帶點熊貓教練個性的繁體中文回覆，並溫馨提醒可以傳送照片或輸入吃了什麼來記錄飲食 🐼"
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
        if (parsed.is_food === false) {
          return {
            is_food: false,
            reply: parsed.reply || "哈囉！我是您的 AI 熊貓飲食教練 🐼，隨時傳送餐點照片或打字告訴我吃了什麼，我幫您計算熱量與記錄！"
          };
        }
        return {
          is_food: true,
          dish_name: parsed.dish_name || text,
          calories: Number(parsed.calories) || 0,
          protein: Number(parsed.protein) || 0,
          carbs: Number(parsed.carbs) || 0,
          fat: Number(parsed.fat) || 0,
          water: Number(parsed.water) || 0,
          panda_comment: parsed.panda_comment || "已辨識您的文字飲食！"
        };
      }
    } catch (e) { }
  }
  return {
    is_food: false,
    reply: "收到！我是您的 AI 熊貓飲食教練 🐼，隨時傳送餐點照片或輸入食物名稱，我來為您記錄熱量！"
  };
}

function attachQuickReply(message, userId, props) {
  if (!userId || !props) return message;
  try {
    const favorites = getUserFavorites(userId, props);
    const items = [
      {
        type: "action",
        action: {
          type: "postback",
          label: "💧 喝水 500ml",
          data: JSON.stringify({ action: 'quickWater', amount: 500 }),
          displayText: "💧 喝水 500ml"
        }
      },
      {
        type: "action",
        action: {
          type: "postback",
          label: "💧 喝水 250ml",
          data: JSON.stringify({ action: 'quickWater', amount: 250 }),
          displayText: "💧 喝水 250ml"
        }
      }
    ];

    if (favorites && favorites.length > 0) {
      favorites.slice(0, 6).forEach(fav => {
        items.push({
          type: "action",
          action: {
            type: "postback",
            label: `⭐ ${(fav.dish_name || '常用').slice(0, 12)}`,
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

    items.push({
      type: "action",
      action: {
        type: "message",
        label: "⭐ 常用輪播",
        text: "常用"
      }
    });

    items.push({
      type: "action",
      action: {
        type: "message",
        label: "📊 今日進度",
        text: "今日"
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

function generateCurrentGoalFlex(userId, goals, liffId, userGistId) {
  const cal = goals.calories || 2000;
  const pro = goals.protein || 100;
  const wat = goals.water || 2500;
  const appTargetUrl = userGistId ? `https://liff.line.me/${liffId}?gistId=${userGistId}` : `https://liff.line.me/${liffId}`;

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
                text: "💡 如何修改目標？\n直接輸入「改目標 165cm 55kg 女 減脂」\n或「改目標 1800卡 120蛋 2500水」即可自動更新！",
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
              label: "✏️ 填入修改範例",
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

function generateMealManagementFlex(userId, liffId, userGistId, props) {
  const todayStr = getTodayDateString();
  const allLogs = getTodayLogs(userId, todayStr, props);
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
        { type: "text", text: "🍱 今日尚未記錄任何餐點喔！", size: "sm", color: "#713F12", weight: "bold" },
        { type: "text", text: "傳送照片或輸入菜名，熊貓教練幫您記錄！🐼", size: "xs", color: "#A16207", margin: "xs" }
      ]
    });
  } else {
    allLogs.forEach((log, index) => {
      totalCal += Number(log.calories) || 0;
      const encodedName = encodeURIComponent(log.dish_name || '餐點');
      const editAppUrl = `https://liff.line.me/${liffId}?action=editMeal&name=${encodedName}&cal=${log.calories}&pro=${log.protein}&wat=${log.water || 0}&userId=${userId}${userGistId ? `&gistId=${userGistId}` : ''}`;

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
              { type: "text", text: `${index + 1}. ${log.dish_name}`, size: "sm", color: "#18181B", weight: "bold", flex: 3, wrap: true },
              { type: "text", text: log.time || '', size: "xxs", color: "#A1A1AA", flex: 1, align: "end" }
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
                  type: "uri",
                  label: "✏️ App修改",
                  uri: editAppUrl
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
                  data: JSON.stringify({ action: 'deleteMeal', id: log.id, index: index }),
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
    altText: `📋 今日餐點管理清單（共 ${allLogs.length} 餐，累計 ${totalCal} kcal）`,
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
            text: "📋 今日餐點管理清單",
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            margin: "xs"
          },
          {
            type: "text",
            text: `今日已記錄 ${allLogs.length} 餐 ｜ 累計攝取 ${totalCal} kcal`,
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
              type: "uri",
              label: "📱 開啟 App 完整圖表",
              uri: appTargetUrl
            }
          },
          ...(allLogs.length > 0 ? [{
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
// ⭐ 7. 常用餐點清單與一鍵快捷記錄 (Neo-Brutalist 視覺設計)
// ========================================================

function generateFavoritesCarouselFlex(userId, liffId, userGistId, props) {
  const favorites = getUserFavorites(userId, props);
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
            text: "💡 提示：拍照辨識後點擊「⭐ 加常用」，或點擊下方直接填入自訂指令！",
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

function getUserFavorites(userId, props) {
  const favKey = `FAVORITES_${userId}`;
  try {
    const raw = props.getProperty(favKey);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
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

function deleteMealLog(userId, mealIdOrName, userGistId, pat, props) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) {}
  try {
    const todayStr = getTodayDateString();
    const todayKey = `DIET_LOGS_${userId}_${todayStr}`;
    let logs = getTodayLogs(userId, todayStr, props);

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

function recordSystemLog(type, userId, input, aiResult, output) {
  const props = PropertiesService.getScriptProperties();
  const time = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
  const logItem = {
    time: time,
    userId: (userId || 'unknown').slice(-6),
    type: type,
    input: typeof input === 'object' ? JSON.stringify(input) : String(input || ''),
    aiResult: typeof aiResult === 'object' ? JSON.stringify(aiResult) : String(aiResult || ''),
    output: typeof output === 'object' ? JSON.stringify(output) : String(output || '')
  };

  Logger.log(`[${logItem.time}] [${logItem.type}] ${logItem.input} -> ${logItem.output}`);
  console.log(`[${logItem.time}] [${logItem.type}] ${logItem.input} -> ${logItem.output}`);

  try {
    let recentLogs = [];
    const raw = props.getProperty('SYSTEM_RECENT_LOGS');
    if (raw) recentLogs = JSON.parse(raw);
    recentLogs.unshift(logItem);
    if (recentLogs.length > 60) recentLogs = recentLogs.slice(0, 60);
    props.setProperty('SYSTEM_RECENT_LOGS', JSON.stringify(recentLogs));
  } catch (e) {
    console.error("儲存實時日誌失敗:", e);
  }

  // 若設定了 LOG_SHEET_ID，自動將日誌追加至 Google 試算表
  const sheetId = props.getProperty('LOG_SHEET_ID');
  if (sheetId) {
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheets()[0];
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["時間", "用戶ID", "類型", "用戶傳送內容", "AI辨識結果", "回應狀態"]);
      }
      sheet.appendRow([logItem.time, userId, logItem.type, logItem.input, logItem.aiResult, logItem.output]);
    } catch (sheetErr) {
      console.error("寫入 Google Sheet 日誌失敗:", sheetErr);
    }
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
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b'
  ];
  const langDisplay = language === 'en' ? 'English' : 'Traditional Chinese';
  const prompt = `Analyze this food image. Return STRICTLY a raw JSON object with keys:
"dish_name" (${langDisplay} string),
"calories" (integer kcal),
"protein" (integer grams),
"carbs" (integer carbohydrates grams),
"fat" (integer total fat grams),
"water" (integer liquid ml, 0 if dry food),
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
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b'
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
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b'
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



