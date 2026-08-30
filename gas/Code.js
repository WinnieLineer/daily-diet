// ========================================================
// 🐼 Daily Diet LINE Bot - Google Apps Script (多用戶自動 Gist 綁定與同步版)
// ========================================================

const PRIMARY_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_CALORIE_GOAL = 2000; // 每日預設熱量目標 (kcal)
const DEFAULT_PROTEIN_GOAL = 100;  // 每日預設蛋白質目標 (g)

function doGet(e) {
  const action = e?.parameter?.action;
  const userId = e?.parameter?.userId;

  // 支援 Web App 透過 userId 查詢個人 Gist ID
  if (action === 'getGistId' && userId) {
    const props = PropertiesService.getScriptProperties();
    const pat = props.getProperty('GITHUB_PAT');
    const gistId = getOrCreateUserGist(userId, pat, props);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', userId, gistId }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput("Daily Diet LINE Bot is running! 🐼");
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  let currentReplyToken = null;
  let currentToken = null;

  try {
    const data = JSON.parse(e.postData.contents);
    const events = data.events || [];
    
    if (events.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const props = PropertiesService.getScriptProperties();
    const CHANNEL_ACCESS_TOKEN = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
    const GEMINI_API_KEY = props.getProperty('GEMINI_API_KEY');
    const GITHUB_PAT = props.getProperty('GITHUB_PAT');
    const LIFF_ID = props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';
    currentToken = CHANNEL_ACCESS_TOKEN;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const replyToken = event.replyToken;
      currentReplyToken = replyToken;
      const userId = event.source?.userId || 'default_user';

      if (!CHANNEL_ACCESS_TOKEN) throw new Error("LINE_CHANNEL_ACCESS_TOKEN 尚未設定！");
      if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY 尚未設定！");

      // 🔍 自動取得或為該用戶建立專屬 Gist ID
      let userGistId = '';
      if (GITHUB_PAT) {
        try {
          userGistId = getOrCreateUserGist(userId, GITHUB_PAT, props);
        } catch (gistErr) {
          console.error("取得使用者 Gist 失敗:", gistErr);
        }
      }

      // 🔘 Case 1: 用戶點擊按鈕 (Postback 事件)
      if (event.type === 'postback') {
        let payload = {};
        try {
          payload = JSON.parse(event.postback.data);
        } catch (e) {
          payload = {};
        }

        // ✅ 按下【儲存紀錄】
        if (payload.action === 'save') {
          const meal = {
            id: Date.now(),
            date: getTodayDateString(),
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
            dish_name: payload.name || '餐點',
            calories: Number(payload.cal) || 0,
            protein: Number(payload.pro) || 0,
            comment: payload.cmt || ''
          };

          // 儲存餐點 (包含寫入個人專屬 Gist)
          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);

          // 計算今日總結並回覆 (附帶個人 Gist ID 連結)
          const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);

        } 
        // ❌ 按下【取消】
        else if (payload.action === 'cancel') {
          replyTextMessage(replyToken, "👌 已取消記錄此餐點。您可以隨時再傳送照片或文字！🐼", CHANNEL_ACCESS_TOKEN);
        }
      }

      // 💬 Case 2: 用戶發送訊息 (圖片或文字)
      else if (event.type === 'message') {
        // 📸 照片辨識
        if (event.message.type === 'image') {
          const messageId = event.message.id;
          const imageBlob = getLineImageBlob(messageId, CHANNEL_ACCESS_TOKEN);
          const base64Image = Utilities.base64Encode(imageBlob.getBytes());

          const analysis = analyzeMealWithGemini(base64Image, GEMINI_API_KEY);
          replyMealConfirmCard(replyToken, analysis, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN);

        } 
        // 💬 文字訊息
        else if (event.message.type === 'text') {
          const userText = event.message.text.trim();

          // 查詢今日總結
          if (userText === '今天' || userText === '總結' || userText === '統計' || userText === '今日' || userText === '今日總結') {
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
            continue;
          }

          // 開啟選單 (帶個人專屬 Gist ID 自動綁定)
          if (userText === '選單' || userText === 'App' || userText === '主選單' || userText === '日記') {
            const appUrl = userGistId ? `https://liff.line.me/${LIFF_ID}?gistId=${userGistId}` : `https://liff.line.me/${LIFF_ID}`;
            replyTextMessage(replyToken, `🐼 點擊開啟您的個人飲食日記（已自動連動個人雲端）：\n${appUrl}`, CHANNEL_ACCESS_TOKEN);
            continue;
          }

          // 🍱 來自 App / LIFF 微調儲存的餐點同步
          if (userText.startsWith('🍱 已在 App 記錄餐點：') || userText.startsWith('🍱 已記錄餐點：')) {
            const nameMatch = userText.match(/：(.*?)(?:\s*\(|$)/);
            const calMatch = userText.match(/(\d+)\s*kcal/i);
            const proMatch = userText.match(/蛋白質\s*(\d+(?:\.\d+)?)\s*g/i);
            const cmtMatch = userText.match(/備註:\s*(.*?)(?:\)|$)/);

            const dishName = nameMatch ? nameMatch[1].trim() : '餐點';
            const calories = calMatch ? Number(calMatch[1]) : 0;
            const protein = proMatch ? Number(proMatch[1]) : 0;
            const comment = cmtMatch ? cmtMatch[1].trim() : '';

            const meal = {
              id: Date.now(),
              date: getTodayDateString(),
              time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
              dish_name: dishName,
              calories: calories,
              protein: protein,
              comment: comment
            };

            // 儲存餐點 (寫入個人專屬 Gist 與今日紀錄)
            saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);

            // 即時計算今日總結並回傳 Flex 卡片
            const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
            continue;
          }

          // 飲食文字辨識
          const analysis = parseTextWithGemini(userText, GEMINI_API_KEY);
          replyMealConfirmCard(replyToken, analysis, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN);
        }
      }
    }
  } catch (err) {
    if (currentReplyToken && currentToken) {
      try {
        replyTextMessage(currentReplyToken, `⚠️ 熊貓教練提示：\n\n${err.message || err.toString()}`, currentToken);
      } catch (replyErr) {}
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
// 🍱 1. 辨識確認卡片 (附帶個人 Gist 專屬網址)
// ========================================================

function replyMealConfirmCard(replyToken, analysis, liffId, userGistId, accessToken) {
  const postbackSaveData = JSON.stringify({
    action: 'save',
    name: (analysis.dish_name || '餐點').slice(0, 30),
    cal: Number(analysis.calories) || 0,
    pro: Number(analysis.protein) || 0,
    cmt: (analysis.panda_comment || '').slice(0, 40)
  });

  const postbackCancelData = JSON.stringify({ action: 'cancel' });
  const encodedName = encodeURIComponent(analysis.dish_name || '餐點');
  const encodedCmt = encodeURIComponent(analysis.panda_comment || '');
  const appTargetUrl = `https://liff.line.me/${liffId}?action=editMeal&name=${encodedName}&cal=${Number(analysis.calories) || 0}&pro=${Number(analysis.protein) || 0}&cmt=${encodedCmt}${userGistId ? `&gistId=${userGistId}` : ''}`;

  const flexMessage = {
    type: "flex",
    altText: `🍱 AI 辨識完成：${analysis.dish_name} (${analysis.calories} kcal)`,
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
              { type: "text", text: "AI 食物偵探", weight: "bold", size: "xs", color: "#713F12", align: "end" }
            ]
          },
          {
            type: "text",
            text: "飲食辨識完成！",
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
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FFF1F2",
                cornerRadius: "10px",
                paddingAll: "10px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "🔥 熱量預估", size: "xs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${analysis.calories}`, size: "lg", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "kcal", size: "xxs", color: "#881337", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#EFF6FF",
                cornerRadius: "10px",
                paddingAll: "10px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "🥩 蛋白質", size: "xs", color: "#2563EB", weight: "bold" },
                  { type: "text", text: `${analysis.protein}`, size: "lg", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "grams", size: "xxs", color: "#1E3A8A", weight: "bold" }
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
                  type: "uri",
                  label: "✏️ App修改",
                  uri: appTargetUrl
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                flex: 1,
                color: "#F4F4F5",
                action: {
                  type: "postback",
                  label: "❌ 取消",
                  data: postbackCancelData,
                  displayText: "❌ 取消紀錄"
                }
              }
            ]
          }
        ]
      }
    }
  };

  replyFlexMessage(replyToken, flexMessage, accessToken);
}

// ========================================================
// 📊 2. 今日飲食進度總結卡片
// ========================================================

function generateDailySummaryFlex(userId, justSavedMeal, liffId, userGistId, props) {
  const todayStr = getTodayDateString();
  const allLogs = getTodayLogs(userId, todayStr, props);
  
  let totalCal = 0;
  let totalPro = 0;
  let mealItems = [];

  allLogs.forEach((log) => {
    totalCal += Number(log.calories) || 0;
    totalPro += Number(log.protein) || 0;
    mealItems.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: `• ${log.time} ${log.dish_name}`, size: "xs", color: "#18181B", weight: "bold", flex: 4, wrap: true },
        { type: "text", text: `${log.calories} kcal`, size: "xs", color: "#E11D48", weight: "bold", flex: 2, align: "end" }
      ]
    });
  });

  const calGoal = Number(props.getProperty('CALORIE_GOAL')) || DEFAULT_CALORIE_GOAL;
  const proGoal = Number(props.getProperty('PROTEIN_GOAL')) || DEFAULT_PROTEIN_GOAL;
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
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FFF1F2",
                cornerRadius: "10px",
                paddingAll: "10px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "🔥 今日總熱量", size: "xs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${totalCal}`, size: "lg", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: `目標 ${calGoal} (${calPercent}%)`, size: "xxs", color: "#71717A", weight: "bold", wrap: true }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#EFF6FF",
                cornerRadius: "10px",
                paddingAll: "10px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: "🥩 今日蛋白質", size: "xs", color: "#2563EB", weight: "bold" },
                  { type: "text", text: `${totalPro} g`, size: "lg", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: `目標 ${proGoal} g`, size: "xxs", color: "#71717A", weight: "bold", wrap: true }
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
      try { backupData = JSON.parse(content); } catch (e) {}
    }
    if (!backupData.dietLogs) backupData.dietLogs = [];
    
    // 插入新紀錄 (相容 Dexie 格式)
    backupData.dietLogs.unshift({
      date: meal.date,
      dish_name: meal.dish_name,
      calories: Number(meal.calories) || 0,
      protein: Number(meal.protein) || 0,
      water: 0,
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
"calories" (integer),
"protein" (integer),
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
        calories: Number(parsed.calories) || 450,
        protein: Number(parsed.protein) || 20,
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
  const prompt = `Parse this food text: "${text}". Return ONLY a raw JSON with keys: "dish_name", "calories", "protein", "panda_comment" (in Traditional Chinese).`;
  
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
        return {
          dish_name: parsed.dish_name || text,
          calories: Number(parsed.calories) || 350,
          protein: Number(parsed.protein) || 15,
          panda_comment: parsed.panda_comment || "已辨識您的文字飲食！"
        };
      }
    } catch (e) {}
  }
  return { dish_name: text, calories: 350, protein: 15, panda_comment: "已記下您的文字紀錄！" };
}

function replyFlexMessage(replyToken, flexMessage, accessToken) {
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
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
}

function replyTextMessage(replyToken, text, accessToken) {
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: "text", text: text }]
    }),
    muteHttpExceptions: true
  });
}
