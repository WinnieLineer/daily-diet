/**
 * ========================================================
 * 04_LineMessaging.js - LINE 訊息發送、快速回復氣泡 (Quick Reply) 與媒體下載
 * ========================================================
 */

/**
 * 自 LINE 官方伺服器下載使用者上傳之圖片二進位 Blob
 * @param {string} messageId LINE 訊息 ID
 * @param {string} accessToken LINE Channel Access Token
 * @returns {Blob}
 */
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

/**
  * 下載 LINE 語音訊息內容
  * @param {string} messageId LINE 訊息 ID
  * @param {string} accessToken LINE Channel Access Token
  * @returns {Blob}
  */
function getLineAudioBlob(messageId, accessToken) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error(`下載 LINE 語音失敗 (${res.getResponseCode()})`);
  }
  return res.getBlob();
}

/**
 * 啟動 LINE 官方「正在輸入中...」Loading 動畫
 * @param {string} userId LINE 使用者 ID
 * @param {string} accessToken LINE Channel Access Token
 * @param {number} [loadingSeconds=20] 動畫秒數 (5~60秒)
 */
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

/**
 * 為訊息物件掛載「餐點倍數調整」專屬快速回復氣泡
 * (0.5x, 1x, 1.5x, 2x, 自訂倍數, 飯減半, 總結, 常用, 喝水, 撤回)
 */
function attachMealMultiplierQuickReply(message, meal, userId, props) {
  if (!message) return message;
  try {
    const userLang = getUserLanguage(userId, props);
    const isEn = userLang === 'en';

    const baseCal = meal.baseCalories !== undefined ? meal.baseCalories : (Number(meal.calories) || 0);
    const basePro = meal.baseProtein !== undefined ? meal.baseProtein : (Number(meal.protein) || 0);
    const baseCarb = meal.baseCarbs !== undefined ? meal.baseCarbs : (Number(meal.carbs) || 0);
    const baseFat = meal.baseFat !== undefined ? meal.baseFat : (Number(meal.fat) || 0);
    const baseWat = meal.baseWater !== undefined ? meal.baseWater : (Number(meal.water) || 0);
    const rawDishName = (meal.baseDishName || meal.dish_name || (isEn ? 'Meal' : '餐點'));
    const cleanBaseName = rawDishName.replace(/^[0-9]+(?:\.[0-9]+)?(?:倍的|x\s*)/i, '').replace(/\s*\(.*倍.*份量\)/g, '').slice(0, 25);
    const mealId = meal.id;
    const curM = Number(meal.multiplier) || 1;

    const multipliers = [
      { m: 0.5, labelZh: "x0.5 (半份)", labelEn: "x0.5 Half" },
      { m: 1.0, labelZh: "x1.0 (原份)", labelEn: "x1.0 Normal" },
      { m: 1.5, labelZh: "x1.5 (1.5倍)", labelEn: "x1.5 (1.5x)" },
      { m: 2.0, labelZh: "x2.0 (雙倍)", labelEn: "x2.0 Double" }
    ];

    const items = [];

    // 1. 四顆倍數氣泡 (0.5x, 1.0x, 1.5x, 2.0x)
    multipliers.forEach(opt => {
      const isCurrent = Math.abs(curM - opt.m) < 0.01;
      const displayLabel = (isEn ? opt.labelEn : opt.labelZh) + (isCurrent ? ' ✔' : '');
      items.push({
        type: "action",
        action: {
          type: "postback",
          label: displayLabel.slice(0, 20),
          data: JSON.stringify({
            action: "setMultiplier",
            id: mealId,
            m: opt.m,
            baseCal: baseCal,
            basePro: basePro,
            baseCarb: baseCarb,
            baseFat: baseFat,
            baseWat: baseWat,
            baseName: encodeURIComponent(cleanBaseName)
          }),
          displayText: isEn ? `Adjust portion to ${opt.m}x` : `調整份量為 ${opt.m} 倍`
        }
      });
    });

    // 2. 自訂倍數 (開鍵盤引導 "改 1.2倍")
    items.push({
      type: "action",
      action: {
        type: "postback",
        label: isEn ? "✏️ Custom Portion" : "✏️ 自訂倍數",
        data: JSON.stringify({ action: "fillCustomMult", id: mealId }),
        inputOption: "openKeyboard",
        fillInText: isEn ? "1.2x" : "改 1.2倍"
      }
    });



    // 4. ⭐ 存為常用
    items.push({
      type: "action",
      action: {
        type: "postback",
        label: isEn ? "⭐ Favorite" : "⭐ 存為常用",
        data: JSON.stringify({
          action: "saveFavorite",
          name: cleanBaseName.slice(0, 30),
          cal: Number(meal.calories) || 0,
          pro: Number(meal.protein) || 0,
          wat: Number(meal.water) || 0
        }),
        displayText: isEn ? `⭐ Favorite: ${cleanBaseName}` : `⭐ 存為常用：${cleanBaseName}`
      }
    });

    // 5. 📊 查看今日總結
    items.push({
      type: "action",
      action: {
        type: "postback",
        label: isEn ? "📊 Daily Summary" : "📊 今日總結",
        data: JSON.stringify({ action: "save", id: mealId }),
        displayText: isEn ? "📊 Daily Summary" : "📊 查看今日總結"
      }
    });

    // 6. 💧 補水 500
    items.push({
      type: "action",
      action: {
        type: "postback",
        label: isEn ? "💧 +500ml Water" : "💧 喝水 500",
        data: JSON.stringify({ action: "quickWater", amount: 500 }),
        displayText: isEn ? "💧 Drink 500ml water" : "💧 喝水 500ml"
      }
    });

    // 7. 🗑️ 撤回這筆紀錄
    items.push({
      type: "action",
      action: {
        type: "postback",
        label: isEn ? "🗑️ Cancel Log" : "🗑️ 撤回紀錄",
        data: JSON.stringify({ action: "cancel", id: mealId, name: cleanBaseName.slice(0, 30) }),
        displayText: isEn ? "🗑️ Cancel Log" : "🗑️ 撤回這筆紀錄"
      }
    });

    message.quickReply = { items: items.slice(0, 13) };
  } catch (err) {
    console.error("attachMealMultiplierQuickReply error:", err);
  }
  return message;
}

/**
 * 為一般訊息掛載常用快速回復氣泡
 * (常用、前4顆常用餐點、補水500、今日總結、查日期、使用手冊)
 */
function attachQuickReply(message, userId, props) {
  if (!userId || !props) return message;
  // 若已有專屬快速回復氣泡，保留不覆蓋
  if (message.quickReply && message.quickReply.items && message.quickReply.items.length > 0) {
    return message;
  }
  try {
    const userLang = getUserLanguage(userId, props);
    const isEn = userLang === 'en';
    const favorites = getUserFavorites(userId, props);
    const items = [];

    // 🌟 1. ⭐ 常用餐點
    items.push({
      type: "action",
      action: {
        type: "message",
        label: isEn ? "⭐ Favorites" : "⭐ 常用餐點",
        text: isEn ? "Favorites" : "常用"
      }
    });

    // 🌟 2. 前 3~4 顆自訂常用膠囊
    if (favorites && favorites.length > 0) {
      favorites.slice(0, 4).forEach(fav => {
        items.push({
          type: "action",
          action: {
            type: "postback",
            label: `⭐ ${(fav.dish_name || (isEn ? 'Fav' : '常用')).slice(0, 8)}`,
            data: JSON.stringify({
              action: 'quickLogFavorite',
              name: encodeURIComponent(fav.dish_name),
              cal: fav.calories,
              pro: fav.protein,
              wat: fav.water || 0
            }),
            displayText: isEn ? `⚡ Quick Log: ${fav.dish_name}` : `⚡ 快捷記錄：${fav.dish_name}`
          }
        });
      });
    }

    // 💧 3. 補水打卡
    items.push({
      type: "action",
      action: {
        type: "postback",
        label: isEn ? "💧 +500ml Water" : "💧 補水 500",
        data: JSON.stringify({ action: 'quickWater', amount: 500 }),
        displayText: isEn ? "💧 Drink 500ml water" : "💧 喝水 500ml"
      }
    });

    // 📊 4. 今日總結
    items.push({
      type: "action",
      action: {
        type: "message",
        label: isEn ? "📊 Daily Summary" : "📊 今日總結",
        text: isEn ? "Daily Summary" : "今日"
      }
    });

    // 📅 5. 查歷史日期
    items.push({
      type: "action",
      action: {
        type: "datetimepicker",
        label: isEn ? "📅 Pick Date" : "📅 查日期",
        data: JSON.stringify({ action: 'pickDate' }),
        mode: "date",
        initial: getTodayDateString(),
        max: getTodayDateString()
      }
    });

    // 💡 6. 全部功能指南
    items.push({
      type: "action",
      action: {
        type: "message",
        label: isEn ? "💡 Guide" : "💡 全部功能",
        text: isEn ? "Guide" : "說明"
      }
    });

    message.quickReply = { items: items.slice(0, 13) };
  } catch (e) {
    console.error("attachQuickReply error:", e);
  }
  return message;
}

/**
 * 回覆 LINE Flex 訊息
 */
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
      if (typeof recordSystemLog === 'function') {
        recordSystemLog('LINE發送失敗', 'line_api', flexMessage.altText || 'Flex卡片', `HTTP ${code}`, errBody);
      }
    }
  } catch (err) {
    console.error("🚨 [LINE Flex 發送失敗]:", err);
    if (typeof recordSystemLog === 'function') {
      recordSystemLog('LINE連線異常', 'line_api', '網路例外', '', err.message);
    }
  }
}

/**
 * 回覆 LINE 純文字訊息
 */
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
      if (typeof recordSystemLog === 'function') {
        recordSystemLog('LINE發送失敗', 'line_api', text.slice(0, 30), `HTTP ${code}`, errBody);
      }
    }
  } catch (err) {
    console.error("🚨 [LINE 文字發送失敗]:", err);
  }
}

/**
 * 主動推播 LINE Flex 訊息
 */
function pushFlexMessage(userId, flexMessage, accessToken, props) {
  if (!userId || !accessToken) return;
  try {
    if (props) attachQuickReply(flexMessage, userId, props);
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      payload: JSON.stringify({
        to: userId,
        messages: [flexMessage]
      }),
      muteHttpExceptions: true
    });
  } catch (err) {
    console.error("🚨 [LINE 主動推播 Flex 失敗]:", err);
  }
}

/**
 * 主動推播 LINE 純文字訊息
 */
function pushTextMessage(userId, text, accessToken, props) {
  if (!userId || !accessToken) return;
  try {
    const textMsg = { type: "text", text: text };
    if (props) attachQuickReply(textMsg, userId, props);
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      payload: JSON.stringify({
        to: userId,
        messages: [textMsg]
      }),
      muteHttpExceptions: true
    });
  } catch (err) {
    console.error("🚨 [LINE 主動推播文字失敗]:", err);
  }
}
