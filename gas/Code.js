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

  // 1. 查詢個人 Gist ID
  if (action === 'getGistId' && userId) {
    const gistId = getOrCreateUserGist(userId, pat, props);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', userId, gistId }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. 查詢個人今日飲食紀錄、目標與 Gist (支援 Web App 開啟時即時雙向同步)
  if (action === 'getLogs' && userId) {
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
      }
    })).setMimeType(ContentService.MimeType.JSON);
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
            water: Number(payload.wat) || 0,
            comment: payload.cmt || ''
          };

          // 儲存餐點 (包含寫入個人專屬 Gist)
          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);

          // 計算今日總結並回覆 (附帶個人 Gist ID 連結)
          const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
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
          saveUserFavorite(userId, favItem, userGistId, GITHUB_PAT, props);
          const favAddedFlex = generateFavoriteAddedFlex(favItem, LIFF_ID, userGistId);
          replyFlexMessage(replyToken, favAddedFlex, CHANNEL_ACCESS_TOKEN);
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
          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
          const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
          continue;
        }

        // 🗑️ 按下【刪除單筆餐點】
        if (payload.action === 'deleteMeal') {
          deleteMealLog(userId, payload.id || payload.index, userGistId, GITHUB_PAT, props);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
          continue;
        }

        // 🗑️ 按下【移除常用餐點】
        if (payload.action === 'deleteFavorite') {
          deleteUserFavorite(userId, payload.favId || payload.name, userGistId, GITHUB_PAT, props);
          const favListFlex = generateFavoritesListFlex(userId, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, favListFlex, CHANNEL_ACCESS_TOKEN);
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
          clearTodayLogs(userId, userGistId, GITHUB_PAT, props);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
          continue;
        }

        // ❌ 按下【取消】
        else if (payload.action === 'cancel') {
          replyTextMessage(replyToken, "👌 已取消此操作。您可以隨時再傳送照片或文字！🐼", CHANNEL_ACCESS_TOKEN);
          continue;
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
          replyMealConfirmCard(replyToken, analysis, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId);

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
            const appUrl = `https://liff.line.me/${LIFF_ID}?userId=${userId}${userGistId ? `&gistId=${userGistId}` : ''}`;
            replyTextMessage(replyToken, `🐼 點擊開啟您的個人飲食日記（已自動連動個人雲端）：\n${appUrl}`, CHANNEL_ACCESS_TOKEN);
            continue;
          }

          // 📋 管理今日紀錄
          if (userText === '管理' || userText === '管理紀錄' || userText === '紀錄管理' || userText === '清單' || userText === '今日清單' || userText === '紀錄') {
            const mgmtFlex = generateMealManagementFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, mgmtFlex, CHANNEL_ACCESS_TOKEN);
            continue;
          }

          // ⭐ 常用餐點庫
          if (userText === '常用' || userText === '快捷' || userText === '收藏' || userText === '常用清單' || userText === '我的常用' || userText === '常用餐點') {
            const favFlex = generateFavoritesListFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, favFlex, CHANNEL_ACCESS_TOKEN);
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

            saveUserFavorite(userId, favItem, userGistId, GITHUB_PAT, props);
            const favAddedFlex = generateFavoriteAddedFlex(favItem, LIFF_ID, userGistId);
            replyFlexMessage(replyToken, favAddedFlex, CHANNEL_ACCESS_TOKEN);
            continue;
          }

          // 🗑️ 刪除最後一筆 / 刪除指定餐點
          if (userText === '刪除最後一筆' || userText === '刪除上一筆' || userText === '刪除最後' || userText === '復原' || userText === '撤銷' || userText === '刪除') {
            const deleted = deleteMealLog(userId, 'last', userGistId, GITHUB_PAT, props);
            if (deleted) {
              const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
              replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
            } else {
              replyTextMessage(replyToken, "🐼 今天目前沒有任何飲食紀錄可以刪除喔！", CHANNEL_ACCESS_TOKEN);
            }
            continue;
          }

          if (userText.startsWith('刪除') || userText.startsWith('移除')) {
            const targetName = userText.replace(/^(?:刪除|移除)\s*/, '').trim();
            if (targetName) {
              const deleted = deleteMealLog(userId, targetName, userGistId, GITHUB_PAT, props);
              if (deleted) {
                const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
                replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
              } else {
                replyTextMessage(replyToken, `🐼 找不到今日名稱為「${targetName}」的餐點紀錄。`, CHANNEL_ACCESS_TOKEN);
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

            // 儲存餐點 (寫入個人專屬 Gist 與今日紀錄)
            saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);

            // 即時計算今日總結並回傳 Flex 卡片
            const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
            continue;
          }

          // 🎯 設定/修改體態目標與客製化建議 (例如: "改目標 175cm 70kg 男 減脂", "設定目標 女 160 55 增肌", "我的目標")
          const isGoalQuery = userText.startsWith('改目標') || 
            userText.startsWith('設定目標') || 
            userText === '目標' || 
            userText === '我的目標' || 
            (userText.includes('目標') && (userText.includes('減脂') || userText.includes('增肌') || userText.includes('減重') || userText.includes('維持') || userText.includes('卡') || userText.includes('kcal'))) ||
            ((userText.includes('身高') || userText.includes('體重')) && (userText.includes('減脂') || userText.includes('增肌') || userText.includes('減重') || userText.includes('維持') || userText.includes('建議')));

          if (isGoalQuery) {
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
              const summaryFlex = generateDailySummaryFlex(userId, updatedMeal, LIFF_ID, userGistId, props);
              replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN);
              continue;
            }
          }

          // 飲食文字辨識 / 日常對話
          const analysis = parseTextWithGemini(userText, GEMINI_API_KEY);
          if (analysis.is_food === false) {
            replyTextMessage(replyToken, analysis.reply || "哈囉！我是您的 AI 熊貓飲食教練 🐼，隨時傳送餐點照片或輸入食物名稱，我來幫您計算熱量與記錄！", CHANNEL_ACCESS_TOKEN);
          } else {
            replyMealConfirmCard(replyToken, analysis, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId);
          }
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
// 🍱 1. 辨識確認卡片 (附帶個人 Gist 專屬網址與常用按鈕)
// ========================================================

function replyMealConfirmCard(replyToken, analysis, liffId, userGistId, accessToken, userId) {
  const postbackSaveData = JSON.stringify({
    action: 'save',
    name: (analysis.dish_name || '餐點').slice(0, 30),
    cal: Number(analysis.calories) || 0,
    pro: Number(analysis.protein) || 0,
    wat: Number(analysis.water) || 0,
    cmt: (analysis.panda_comment || '').slice(0, 40)
  });

  const postbackFavData = JSON.stringify({
    action: 'saveFavorite',
    name: (analysis.dish_name || '餐點').slice(0, 30),
    cal: Number(analysis.calories) || 0,
    pro: Number(analysis.protein) || 0,
    wat: Number(analysis.water) || 0
  });

  const postbackCancelData = JSON.stringify({ action: 'cancel' });
  const encodedName = encodeURIComponent(analysis.dish_name || '餐點');
  const encodedCmt = encodeURIComponent(analysis.panda_comment || '');
  const appTargetUrl = `https://liff.line.me/${liffId}?action=editMeal&name=${encodedName}&cal=${Number(analysis.calories) || 0}&pro=${Number(analysis.protein) || 0}&wat=${Number(analysis.water) || 0}&cmt=${encodedCmt}${userId ? `&userId=${userId}` : ''}${userGistId ? `&gistId=${userGistId}` : ''}`;

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
            spacing: "xs",
            contents: [
              {
                type: "button",
                style: "secondary",
                height: "sm",
                flex: 1,
                color: "#F4F4F5",
                action: {
                  type: "uri",
                  label: "✏️ 微調",
                  uri: appTargetUrl
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
          },
          {
            type: "text",
            text: "💡 可打字「改 600卡」修改，或「管理」查看清單",
            size: "xxs",
            color: "#71717A",
            align: "center",
            margin: "xs"
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
      try { backupData = JSON.parse(content); } catch (e) {}
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
          water: Number(parsed.water) || 0,
          panda_comment: parsed.panda_comment || "已辨識您的文字飲食！"
        };
      }
    } catch (e) {}
  }
  return { 
    is_food: false, 
    reply: "收到！我是您的 AI 熊貓飲食教練 🐼，隨時傳送餐點照片或輸入食物名稱，我來為您記錄熱量！" 
  };
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
            margin: "xxs"
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
            cornerRadius: "8px",
            paddingAll: "8px",
            contents: [
              { type: "text", text: `🧬 基礎代謝 (BMR): ${info.bmr} kcal`, size: "xxs", color: "#52525B", weight: "bold", flex: 1 },
              { type: "text", text: `⚡ 每日總消耗 (TDEE): ${info.tdee} kcal`, size: "xxs", color: "#52525B", weight: "bold", align: "end", flex: 1 }
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
              type: "message",
              label: "💬 重新調整目標",
              text: "改目標 175cm 70kg 男 減脂"
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
      try { backupData = JSON.parse(content); } catch (e) {}
    }
    if (!backupData.settings) backupData.settings = [];

    const upsertSetting = (key, val) => {
      const idx = backupData.settings.findIndex(s => s.key === key);
      if (idx !== -1) backupData.settings[idx].value = val;
      else backupData.settings.push({ key, value: val });
    };

    if (goals.calories) upsertSetting('user_calories', goals.calories);
    if (goals.protein) upsertSetting('user_protein', goals.protein);
    if (goals.water) upsertSetting('user_water', goals.water);

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
            margin: "xxs"
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

function generateFavoritesListFlex(userId, liffId, userGistId, props) {
  const favorites = getUserFavorites(userId, props);
  const appTargetUrl = `https://liff.line.me/${liffId}?userId=${userId}${userGistId ? `&gistId=${userGistId}` : ''}`;
  const favBoxes = [];

  if (favorites.length === 0) {
    favBoxes.push({
      type: "box",
      layout: "vertical",
      backgroundColor: "#FEF9C3",
      cornerRadius: "12px",
      paddingAll: "16px",
      contents: [
        { type: "text", text: "⭐ 尚未建立常用餐點！", size: "sm", color: "#713F12", weight: "bold" },
        {
          type: "text",
          text: "💡 如何建立常用餐點？\n1. 直接打字「加常用 拿鐵 150卡 8蛋 350水」\n2. 每次飲食辨識後，點擊「⭐ 加常用」即可儲存！",
          size: "xs",
          color: "#A16207",
          wrap: true,
          margin: "xs"
        }
      ]
    });
  } else {
    favorites.slice(0, 8).forEach((fav, index) => {
      favBoxes.push({
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
              { type: "text", text: `⭐ ${fav.dish_name}`, size: "sm", color: "#18181B", weight: "bold", flex: 3, wrap: true }
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
                contents: [{ type: "text", text: `🔥 ${fav.calories} kcal`, size: "xxs", color: "#E11D48", weight: "bold" }]
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
                contents: [{ type: "text", text: `🥩 ${fav.protein}g`, size: "xxs", color: "#2563EB", weight: "bold" }]
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
                contents: [{ type: "text", text: `💧 ${fav.water || 0}ml`, size: "xxs", color: "#0891B2", weight: "bold" }]
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
                style: "primary",
                height: "sm",
                color: "#000000",
                flex: 3,
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
                color: "#F4F4F5",
                flex: 1,
                action: {
                  type: "postback",
                  label: "🗑️",
                  data: JSON.stringify({ action: 'deleteFavorite', favId: fav.id, name: fav.dish_name }),
                  displayText: `🗑️ 移除常用：${fav.dish_name}`
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
    altText: `⭐ 我的常用餐點快捷庫（共 ${favorites.length} 項）`,
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
              { type: "text", text: "🐼 DAILY DIET", color: "#000000", weight: "bold", size: "sm" },
              { type: "text", text: "⭐ 快捷飲食庫", color: "#713F12", weight: "bold", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: "⭐ 常用餐點一鍵記錄",
            color: "#000000",
            weight: "bold",
            size: "md",
            margin: "xs"
          },
          {
            type: "text",
            text: `已建立 ${favorites.length} 道常用餐點 ｜ 點擊「一鍵記錄」即可儲存`,
            color: "#713F12",
            size: "xxs",
            margin: "xxs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        backgroundColor: "#FAFAFA",
        contents: favBoxes
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#FEF9C3",
            action: {
              type: "message",
              label: "➕ 新增常用範例指令",
              text: "加常用 美式咖啡+茶葉蛋 160卡 14蛋 450水"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#F4F4F5",
            action: {
              type: "uri",
              label: "📱 開啟 App 查看完整清單",
              uri: appTargetUrl
            }
          }
        ]
      }
    }
  };
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
}

function deleteUserFavorite(userId, favIdentifier, userGistId, pat, props) {
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
      try { backupData = JSON.parse(content); } catch (e) {}
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
          try { backupData = JSON.parse(content); } catch (e) {}
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
    } catch (e) {}
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
      try { backupData = JSON.parse(content); } catch (e) {}
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
