/**
 * ========================================================
 * 06_FlexMessages.js - LINE Flex 訊息卡片產生器 (中/英雙語徹底本地化)
 * 風格：Neo-Brutalist 粗黑框高對比設計
 * ========================================================
 */

// ========================================================
// 🍱 1. 餐點辨識確認與微調卡片
// ========================================================

function replyMealConfirmCard(replyToken, analysis, liffId, userGistId, accessToken, userId, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const userLang = getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';
  const userPersona = getUserPersona(userId, props, userGistId);

  const postbackSaveData = JSON.stringify({
    action: 'save',
    id: analysis.id,
    name: (analysis.dish_name || (isEn ? 'Meal' : '餐點')).slice(0, 30)
  });

  const postbackFavData = JSON.stringify({
    action: 'saveFavorite',
    name: (analysis.dish_name || (isEn ? 'Meal' : '餐點')).slice(0, 30),
    cal: Number(analysis.calories) || 0,
    pro: Number(analysis.protein) || 0,
    wat: Number(analysis.water) || 0
  });

  const postbackCancelData = JSON.stringify({
    action: 'cancel',
    id: analysis.id,
    name: (analysis.dish_name || (isEn ? 'Meal' : '餐點')).slice(0, 30)
  });

  const encodedName = encodeURIComponent(analysis.dish_name || (isEn ? 'Meal' : '餐點'));
  const encodedCmt = encodeURIComponent(analysis.panda_comment || '');
  const appTargetUrl = `https://liff.line.me/${liffId}?action=editMeal&name=${encodedName}&cal=${Number(analysis.calories) || 0}&pro=${Number(analysis.protein) || 0}&wat=${Number(analysis.water) || 0}&cmt=${encodedCmt}${userId ? `&userId=${userId}` : ''}${userGistId ? `&gistId=${userGistId}` : ''}`;

  let displayComment = (analysis.panda_comment && analysis.panda_comment.trim()) 
    ? analysis.panda_comment.trim() 
    : '';

  if (isEn && /[\u4e00-\u9fa5]/.test(displayComment)) {
    console.warn("⚠️ [FlexMessages] Detected Chinese characters in displayComment under English mode! Replacing with English fallback.");
    displayComment = generateFallbackComment(analysis.dish_name || 'Meal', Number(analysis.calories) || 0, Number(analysis.protein) || 0, userPersona, 'en');
  } else if (!displayComment) {
    displayComment = generateFallbackComment(analysis.dish_name || (isEn ? 'Meal' : '餐點'), Number(analysis.calories) || 0, Number(analysis.protein) || 0, userPersona, userLang);
  }

  const breakdownList = (analysis.breakdown && Array.isArray(analysis.breakdown)) ? analysis.breakdown : [];
  const breakdownRows = breakdownList.slice(0, 5).map(item => ({
    type: "box",
    layout: "horizontal",
    margin: "xs",
    contents: [
      {
        type: "text",
        text: `• ${item.name || (isEn ? 'Item' : '品項')} ${item.portion ? `(${item.portion})` : ''}`,
        size: "xxs",
        color: "#18181B",
        weight: "bold",
        flex: 5,
        wrap: true
      },
      {
        type: "text",
        text: `${Number(item.calories) || 0} kcal${Number(item.protein) > 0 ? ` / ${item.protein}g${isEn ? ' pro' : '蛋'}` : ''}`,
        size: "xxs",
        color: "#E11D48",
        weight: "bold",
        align: "end",
        flex: 6,
        wrap: true
      }
    ]
  }));
  const calcNote = analysis.calculation_note || '';

  let breakdownSection = [];
  if (breakdownRows.length > 0) {
    breakdownSection = [{
      type: "box",
      layout: "vertical",
      backgroundColor: "#FFFFFF",
      cornerRadius: "14px",
      borderColor: "#000000",
      borderWidth: "2.5px",
      paddingAll: "10px",
      spacing: "xs",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: isEn ? "🧮 Nutrient Breakdown" : "🧮 估算拆解明細", size: "xxs", color: "#000000", weight: "bold", flex: 5 },
            { type: "text", text: isEn ? "Calories / Protein" : "估算熱量 / 蛋白質", size: "xxs", color: "#71717A", align: "end", flex: 6, wrap: true }
          ]
        },
        ...breakdownRows,
        ...(calcNote ? [{
          type: "text",
          text: `💡 ${isEn ? 'Calculation Process' : '計算過程'}：${calcNote}`,
          size: "xxs",
          color: "#52525B",
          wrap: true,
          margin: "xs"
        }] : [])
      ]
    }];
  } else if (calcNote) {
    breakdownSection = [{
      type: "box",
      layout: "vertical",
      backgroundColor: "#FFFFFF",
      cornerRadius: "14px",
      borderColor: "#000000",
      borderWidth: "2.5px",
      paddingAll: "10px",
      contents: [
        { type: "text", text: `💡 ${isEn ? 'Calculation Process' : '計算過程'}：${calcNote}`, size: "xxs", color: "#000000", wrap: true }
      ]
    }];
  }

  const curM = Number(analysis.multiplier) || 1;
  const baseCal = analysis.baseCalories !== undefined ? Number(analysis.baseCalories) : (curM !== 1 ? Math.round((Number(analysis.calories) || 0) / curM) : (Number(analysis.calories) || 0));
  const basePro = analysis.baseProtein !== undefined ? Number(analysis.baseProtein) : (curM !== 1 ? Number(((Number(analysis.protein) || 0) / curM).toFixed(1)) : (Number(analysis.protein) || 0));
  const baseCarb = analysis.baseCarbs !== undefined ? Number(analysis.baseCarbs) : (curM !== 1 ? Number(((Number(analysis.carbs) || 0) / curM).toFixed(1)) : (Number(analysis.carbs) || 0));
  const baseFat = analysis.baseFat !== undefined ? Number(analysis.baseFat) : (curM !== 1 ? Number(((Number(analysis.fat) || 0) / curM).toFixed(1)) : (Number(analysis.fat) || 0));
  const baseWat = analysis.baseWater !== undefined ? Number(analysis.baseWater) : (curM !== 1 ? Math.round((Number(analysis.water) || 0) / curM) : (Number(analysis.water) || 0));
  const cleanBaseName = (analysis.baseDishName || analysis.dish_name || (isEn ? 'Meal' : '餐點'))
    .replace(/^[0-9]+(?:\.[0-9]+)?(?:倍的|x\s*)/i, '')
    .replace(/\s*\(.*倍.*份量\)/g, '')
    .trim()
    .slice(0, 25);
  const mealId = analysis.id || Date.now();

  const isCustomActive = Math.abs(curM - 0.5) >= 0.01 && Math.abs(curM - 1.0) >= 0.01 && Math.abs(curM - 1.5) >= 0.01 && Math.abs(curM - 2.0) >= 0.01;

  function buildPortionPill(label, m) {
    const isSelected = Math.abs(curM - m) < 0.01;
    return {
      type: "box",
      layout: "vertical",
      backgroundColor: isSelected ? "#000000" : "#FFFFFF",
      borderColor: "#000000",
      borderWidth: "2px",
      cornerRadius: "10px",
      paddingAll: "6px",
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      action: {
        type: "postback",
        label: label,
        data: JSON.stringify({
          action: "setMultiplier",
          id: mealId,
          m: m,
          baseCal: baseCal,
          basePro: basePro,
          baseCarb: baseCarb,
          baseFat: baseFat,
          baseWat: baseWat,
          baseName: encodeURIComponent(cleanBaseName)
        }),
        displayText: isEn ? `Adjust portion to ${label}` : `調整份量為 ${label}`
      },
      contents: [
        {
          type: "text",
          text: label,
          weight: "bold",
          size: "xs",
          color: isSelected ? "#FFFFFF" : "#000000"
        }
      ]
    };
  }

  const customPortionPill = {
    type: "box",
    layout: "vertical",
    backgroundColor: isCustomActive ? "#000000" : "#FFFFFF",
    borderColor: "#000000",
    borderWidth: "2px",
    cornerRadius: "10px",
    paddingAll: "6px",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    action: {
      type: "postback",
      label: isEn ? "Custom" : "自訂",
      data: JSON.stringify({ action: "fillCustomMult", id: mealId }),
      inputOption: "openKeyboard",
      fillInText: isEn ? "1.2x" : "改 1.2倍"
    },
    contents: [
      {
        type: "text",
        text: isCustomActive ? `x${curM}` : (isEn ? "Custom" : "自訂"),
        weight: "bold",
        size: "xs",
        color: isCustomActive ? "#FFFFFF" : "#000000"
      }
    ]
  };

  const subtitleText = curM !== 1
    ? (isEn ? `✅ Updated to ${curM}x portion!` : `✅ 已更新為 ${curM} 倍份量！`)
    : (isEn ? "✅ Logged to your Diary!" : "✅ 已即時記錄至資料庫！");

  const flexMessage = {
    type: "flex",
    altText: isEn 
      ? `🍱 AI Logged: ${analysis.dish_name} (${analysis.calories} kcal)`
      : `🍱 AI 已記錄：${analysis.dish_name} (${analysis.calories} kcal)`,
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
              { type: "text", text: isEn ? "AI MEAL LOG" : "AI 即時記錄", weight: "bold", size: "xs", color: "#713F12", align: "end" }
            ]
          },
          {
            type: "text",
            text: subtitleText,
            weight: "bold",
            size: "md",
            color: curM !== 1 ? "#B45309" : "#000000",
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
            contents: [
              {
                type: "text",
                text: analysis.dish_name || (isEn ? "Meal" : "美味餐點"),
                weight: "bold",
                size: "xl",
                color: "#000000",
                wrap: true,
                flex: 4
              },
              {
                type: "text",
                text: `${analysis.calories}`,
                weight: "bold",
                size: "xxl",
                color: "#E11D48",
                align: "end",
                flex: 2
              },
              {
                type: "text",
                text: " kcal",
                size: "xs",
                color: "#991B1B",
                align: "end",
                weight: "bold",
                gravity: "bottom",
                flex: 1
              }
            ]
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
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
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
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
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
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
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
          ...breakdownSection,
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FEF08A",
            borderColor: "#000000",
            borderWidth: "2.5px",
            cornerRadius: "14px",
            paddingAll: "12px",
            contents: [
              {
                type: "text",
                text: `${isEn ? "💬 Panda Coach: " : "💬 熊貓短評："}${displayComment}`,
                size: "xs",
                color: "#000000",
                weight: "bold",
                wrap: true
              }
            ]
          },
          {
            type: "text",
            text: isEn ? "⚡ Meal saved! Tap buttons below to adjust or favorite:" : "⚡ 餐點已入帳！點擊下方按鈕可快速微調或收藏：",
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
        backgroundColor: "#FAFAFA",
        contents: [
          // ⚖️ 份量調整區塊 (Neo-Brutalist Multiplier Bar: 0.5x, 1x, 1.5x, 2x, 自訂)
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: isEn ? "⚖️ PORTION SIZE (ALL NUTRIENTS)" : "⚖️ 份量調整 (整份等比縮放)",
                    size: "xxs",
                    weight: "bold",
                    color: "#71717A"
                  }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "xs",
                contents: [
                  buildPortionPill("x0.5", 0.5),
                  buildPortionPill("x1.0", 1.0),
                  buildPortionPill("x1.5", 1.5),
                  buildPortionPill("x2.0", 2.0),
                  customPortionPill
                ]
              }
            ]
          },
          // 📊 今日總結 & ⭐ 存為常用
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#000000",
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
                paddingTop: "10px",
                paddingBottom: "10px",
                paddingStart: "4px",
                paddingEnd: "4px",
                flex: isEn ? 6 : 5,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "postback",
                  label: isEn ? "Daily Summary" : "今日總結",
                  data: postbackSaveData,
                  displayText: isEn ? "Daily Summary" : "今日總結"
                },
                contents: [
                  {
                    type: "text",
                    text: isEn ? "📊 Daily Summary" : "📊 查看今日總結",
                    weight: "bold",
                    size: isEn ? "xxs" : "xs",
                    color: "#FFFFFF",
                    align: "center",
                    wrap: true
                  }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FEF9C3",
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
                paddingTop: "10px",
                paddingBottom: "10px",
                paddingStart: "4px",
                paddingEnd: "4px",
                flex: isEn ? 5 : 5,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "postback",
                  label: isEn ? "⭐ Favorite" : "⭐ 存為常用",
                  data: postbackFavData,
                  displayText: isEn ? `⭐ Favorite: ${analysis.dish_name}` : `⭐ 存為常用：${analysis.dish_name}`
                },
                contents: [
                  {
                    type: "text",
                    text: isEn ? "⭐ Favorite" : "⭐ 存為常用",
                    weight: "bold",
                    size: isEn ? "xxs" : "xs",
                    color: "#000000",
                    align: "center",
                    wrap: true
                  }
                ]
              }
            ]
          },
          // 🗑️ 撤回這筆紀錄
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FFF1F2",
            borderColor: "#000000",
            borderWidth: "2px",
            cornerRadius: "12px",
            paddingAll: "9px",
            alignItems: "center",
            justifyContent: "center",
            action: {
              type: "postback",
              label: isEn ? "🗑️ Cancel Log" : "🗑️ 撤回這筆紀錄",
              data: postbackCancelData,
              displayText: isEn ? "🗑️ Cancel Log" : "🗑️ 撤回這筆紀錄"
            },
            contents: [
              {
                type: "text",
                text: isEn ? "🗑️ Cancel Log" : "🗑️ 撤回這筆紀錄",
                weight: "bold",
                size: "xs",
                color: "#E11D48"
              }
            ]
          }
        ]
      }
    }
  };

  attachMealMultiplierQuickReply(flexMessage, analysis, userId, props);
  replyFlexMessage(replyToken, flexMessage, accessToken, userId, props);
}

// ========================================================
// 📊 2. 今日飲食進度總結卡片
// ========================================================

function generateDailySummaryFlex(userId, justSavedMeal, liffId, userGistId, props, targetDateStr) {
  if (!props) props = PropertiesService.getScriptProperties();
  const todayStr = targetDateStr || getTodayDateString();
  const isToday = todayStr === getTodayDateString();
  const allLogs = getTodayLogs(userId, todayStr, props, userGistId);
  const goals = getUserGoals(userId, props, userGistId);
  const userLang = getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';

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
    const displayName = log.dish_name || (isEn ? 'Meal' : '美味餐點');

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

  let coachTip = isEn ? "Building your healthy diet habit, keep it up! 🐼" : "飲食紀錄養成中，繼續保持！🐼";
  if (isToday) {
    if (totalCal > calGoal) {
      coachTip = isEn ? "Daily calorie goal reached! Drink plenty of water and take a walk! 🔥" : "今日熱量已達標，晚點多喝水散步消化喔！🔥";
    } else if (remainingCal <= 400) {
      coachTip = isEn ? "Calorie intake is well-balanced, almost hitting your target! 💪" : "熱量控制得非常剛好，即將完美達標！💪";
    } else {
      coachTip = isEn ? `You can still enjoy about ${remainingCal} kcal of nutritious food today! 🥗` : `今天還可以再補充約 ${remainingCal} kcal 的營養餐點！🥗`;
    }
  } else {
    coachTip = isEn ? `Summary for ${todayStr}! Calorie target reached: ${calPercent}% 🐼` : `這是 ${todayStr} 的歷史戰報！當天總熱量達成率為 ${calPercent}% 🐼`;
  }

  const headerTitle = isToday
    ? (justSavedMeal ? (isEn ? "✅ Logged! Today's Summary" : "✅ 紀錄成功！今日總結") : (isEn ? "📊 Daily Diet Dashboard" : "📊 今日飲食進度看板"))
    : (isEn ? `📅 ${todayStr} Summary` : `📅 ${todayStr} 歷史總結`);

  return {
    type: "flex",
    altText: isToday
      ? (isEn ? `📊 Today's Summary: ${totalCal} / ${calGoal} kcal` : `📊 今日飲食總結：已攝取 ${totalCal} / ${calGoal} kcal`)
      : (isEn ? `📅 ${todayStr} Summary: ${totalCal} / ${calGoal} kcal` : `📅 ${todayStr} 飲食總結：已攝取 ${totalCal} / ${calGoal} kcal`),
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
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isEn ? (isToday ? "🔥 Total Cal" : "🔥 Daily Cal") : (isToday ? "🔥 今日總熱量" : "🔥 當日總熱量"), size: "xxs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${totalCal}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: `kcal (${calPercent}%)`, size: "xxs", color: "#881337", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#EFF6FF",
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isEn ? (isToday ? "🥩 Protein" : "🥩 Daily Pro") : (isToday ? "🥩 今日蛋白質" : "🥩 當日蛋白質"), size: "xxs", color: "#2563EB", weight: "bold", wrap: true },
                  { type: "text", text: `${totalPro}g`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: `/ ${proGoal}g`, size: "xxs", color: "#71717A", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#ECFEFF",
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isEn ? (isToday ? "💧 Water" : "💧 Daily Water") : (isToday ? "💧 今日水分" : "💧 當日水分"), size: "xxs", color: "#0891B2", weight: "bold" },
                  { type: "text", text: `${totalWater}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: "ml", size: "xxs", color: "#164E63", weight: "bold" }
                ]
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FFFFFF",
            borderColor: "#000000",
            borderWidth: "2.5px",
            cornerRadius: "14px",
            paddingAll: "12px",
            spacing: "xs",
            contents: [
              { type: "text", text: isEn ? (isToday ? `🍱 Logged ${allLogs.length} meals today:` : `🍱 Logged ${allLogs.length} meals on this date:`) : (isToday ? `🍱 今日已記 ${allLogs.length} 餐：` : `🍱 該日已記 ${allLogs.length} 餐：`), size: "xs", weight: "bold", color: "#000000" },
              ...(mealItems.length > 0 ? mealItems : [{ type: "text", text: isEn ? (isToday ? "No meals logged yet today" : "No meals logged on this date") : (isToday ? "今日尚未有飲食紀錄" : "該日尚未有飲食紀錄"), size: "xs", color: "#A1A1AA" }])
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FEF08A",
            borderColor: "#000000",
            borderWidth: "2.5px",
            cornerRadius: "14px",
            paddingAll: "12px",
            contents: [
              { type: "text", text: `${isEn ? "💬 Panda Coach: " : "💬 熊貓教練："}${coachTip}`, size: "xs", color: "#000000", weight: "bold", wrap: true }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        backgroundColor: "#FAFAFA",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FDE047",
            borderColor: "#000000",
            borderWidth: "2.5px",
            cornerRadius: "14px",
            paddingAll: "12px",
            alignItems: "center",
            justifyContent: "center",
            action: {
              type: "postback",
              label: isEn ? (isToday ? "📋 Manage Today's Logs" : `📋 Manage ${todayStr} Logs`) : (isToday ? "📋 管理今日紀錄" : `📋 管理 ${todayStr} 紀錄`),
              data: JSON.stringify({ action: 'manageMeals', date: todayStr }),
              displayText: isEn ? (isToday ? "Manage Today's Logs" : `Manage ${todayStr} Logs`) : (isToday ? "管理今日紀錄" : `管理 ${todayStr} 紀錄`)
            },
            contents: [
              {
                type: "text",
                text: isEn ? (isToday ? "📋 Manage Today's Logs" : `📋 Manage ${todayStr} Logs`) : (isToday ? "📋 管理今日紀錄" : `📋 管理 ${todayStr} 紀錄`),
                weight: "bold",
                size: "sm",
                color: "#000000"
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FFFFFF",
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
                paddingTop: "10px",
                paddingBottom: "10px",
                paddingStart: "4px",
                paddingEnd: "4px",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "datetimepicker",
                  label: isEn ? "Select Date" : "📅 查日期",
                  data: JSON.stringify({ action: 'pickDate' }),
                  mode: "date",
                  initial: todayStr,
                  max: getTodayDateString()
                },
                contents: [
                  {
                    type: "text",
                    text: isEn ? "📅 Select Date" : "📅 查日期",
                    weight: "bold",
                    size: isEn ? "xxs" : "xs",
                    color: "#000000",
                    align: "center",
                    wrap: true
                  }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FEF9C3",
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
                paddingTop: "10px",
                paddingBottom: "10px",
                paddingStart: "4px",
                paddingEnd: "4px",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "postback",
                  label: isEn ? "7-Day Trend" : "📊 7 日週報",
                  data: JSON.stringify({ action: 'viewWeeklyTrends' }),
                  displayText: isEn ? "7-Day Trend" : "週報"
                },
                contents: [
                  {
                    type: "text",
                    text: isEn ? "📊 7-Day Trend" : "📊 7 日週報",
                    weight: "bold",
                    size: isEn ? "xxs" : "xs",
                    color: "#000000",
                    align: "center",
                    wrap: true
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  };
}

// ========================================================
// 🎯 3. 個人飲食目標設定卡片
// ========================================================

function generateGoalSettingFlex(info, cal, pro, wat, liffId, userGistId, lang) {
  const isEn = lang === 'en';
  const appTargetUrl = userGistId ? `https://liff.line.me/${liffId}?gistId=${userGistId}` : `https://liff.line.me/${liffId}`;

  return {
    type: "flex",
    altText: isEn 
      ? `🎯 Diet goals updated: ${cal} kcal / Protein ${pro}g / Water ${wat}ml`
      : `🎯 個人飲食目標已更新：${cal} kcal / 蛋白質 ${pro}g / 水分 ${wat}ml`,
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
              { type: "text", text: info.goal_type ? `🎯 ${info.goal_type}` : (isEn ? "🎯 Goals" : "🎯 目標設定"), color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: isEn ? "✅ Custom Diet Goals Applied!" : "✅ 個人專屬體態目標已生效！",
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            margin: "xs"
          },
          {
            type: "text",
            text: info.summary || (isEn ? "Scientific Nutrition Plan" : "客製化科學營養規劃"),
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
                  { type: "text", text: isEn ? "🔥 Daily Cal" : "🔥 每日熱量", size: "xxs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${cal}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: isEn ? "kcal / day" : "kcal / 天", size: "xxs", color: "#881337", weight: "bold" }
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
                  { type: "text", text: `${pro}g`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: isEn ? "g / day" : "克 / 天", size: "xxs", color: "#1E3A8A", weight: "bold" }
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
                  { type: "text", text: isEn ? "💧 Daily Water" : "💧 每日水分", size: "xxs", color: "#0891B2", weight: "bold" },
                  { type: "text", text: `${wat}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: isEn ? "ml / day" : "ml / 天", size: "xxs", color: "#164E63", weight: "bold" }
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
                  { type: "text", text: isEn ? "🧬 Basal Rate (BMR)" : "🧬 基礎代謝 (BMR)", size: "xxs", color: "#71717A", weight: "bold" },
                  { type: "text", text: `${info.bmr} kcal`, size: "xs", color: "#18181B", weight: "bold", margin: "xs" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isEn ? "⚡ Daily Burn (TDEE)" : "⚡ 每日消耗 (TDEE)", size: "xxs", color: "#71717A", weight: "bold" },
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
              { type: "text", text: isEn ? "🐼 Panda Coach Advice:" : "🐼 熊貓教練體態變化建議：", size: "xs", color: "#713F12", weight: "bold" },
              {
                type: "text",
                text: (isEn && /[\u4e00-\u9fa5]/.test(info.panda_advice || '')) 
                  ? "Based on your body stats and goal, your daily targets are calibrated. Drink plenty of water and stay consistent! 🐼💪"
                  : (info.panda_advice || (isEn ? "Stay consistent! Panda Coach will guide you to your ideal body shape!" : "持之以恆記錄飲食，熊貓教練會陪您一起達成理想身材！")),
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
              label: isEn ? "📱 Open App to View Progress" : "📱 開啟 App 查看目標進度",
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
              label: isEn ? "✏️ Custom Target" : "✏️ 填入輸入框自訂調整",
              data: JSON.stringify({ action: 'fillGoal' }),
              inputOption: "openKeyboard",
              fillInText: isEn ? `Set goal ${cal}cal ${pro}pro ${wat}water` : `改目標 ${cal}卡 ${pro}蛋 ${wat}水`
            }
          }
        ]
      }
    }
  };
}

function generateGoalGuideFlex(userId, liffId, userGistId, lang) {
  const isEn = lang === 'en';
  const appTargetUrl = userGistId ? `https://liff.line.me/${liffId}?tab=goals&gistId=${userGistId}` : `https://liff.line.me/${liffId}?tab=goals`;

  return {
    type: "flex",
    altText: isEn 
      ? "🎯 Smart Diet Goals: Tell coach your height, weight & goals!"
      : "🎯 AI 智能體態目標推薦導引：告訴教練身高體重與目標，自動規劃！",
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
              { type: "text", text: isEn ? "🪄 Smart Goals" : "🪄 AI 智能推薦", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: isEn ? "🎯 Smart Diet Goal Recommendation" : "🎯 AI 體態目標自動推薦",
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            margin: "xs"
          },
          {
            type: "text",
            text: isEn ? "No need to calculate calories! AI plans it for you" : "不需要自己算熱量！告訴教練身材，AI 自動規劃",
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
                text: isEn ? "💡 What is Smart Goal Recommendation?" : "💡 什麼是智能推薦？",
                weight: "bold",
                size: "xs",
                color: "#854D0E"
              },
              {
                type: "text",
                text: isEn 
                  ? "No manual math needed! Tell Panda Coach your height, weight, gender, and goal. AI calculates your BMR/TDEE and plans the perfect calorie deficit, protein, and water targets!"
                  : "不必自己計算熱量！只要告訴熊貓教練您的【身高、體重、性別與期望目標】，AI 將依據醫學 BMR/TDEE 公式與活動量，自動規劃每日熱量赤字/盈餘、蛋白質與飲水建議！",
                size: "xxs",
                color: "#713F12",
                wrap: true,
                margin: "xs"
              }
            ]
          },
          {
            type: "text",
            text: isEn ? "👇 Tap quick presets below to auto-fill:" : "👇 點擊下方快速範例，帶入後微調送出：",
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
                type: "box",
                layout: "vertical",
                backgroundColor: "#DCFCE7",
                borderColor: "#000000",
                borderWidth: "2px",
                cornerRadius: "12px",
                paddingTop: "9px",
                paddingBottom: "9px",
                paddingStart: "4px",
                paddingEnd: "4px",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "postback",
                  label: isEn ? "Female Cut" : "🏃‍♀️ 女生減脂",
                  data: JSON.stringify({ action: 'fillGoal' }),
                  inputOption: "openKeyboard",
                  fillInText: isEn ? "Set goal 160cm 52kg female fat loss" : "改目標 160cm 52kg 女 減脂"
                },
                contents: [
                  {
                    type: "text",
                    text: isEn ? "🏃‍♀️ Female Cut" : "🏃‍♀️ 女生減脂",
                    weight: "bold",
                    size: isEn ? "xxs" : "xs",
                    color: "#000000",
                    align: "center",
                    wrap: true
                  }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FEF08A",
                borderColor: "#000000",
                borderWidth: "2px",
                cornerRadius: "12px",
                paddingTop: "9px",
                paddingBottom: "9px",
                paddingStart: "4px",
                paddingEnd: "4px",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "postback",
                  label: isEn ? "Male Cut" : "🥗 男生減脂",
                  data: JSON.stringify({ action: 'fillGoal' }),
                  inputOption: "openKeyboard",
                  fillInText: isEn ? "Set goal 175cm 75kg male fat loss" : "改目標 175cm 75kg 男 減脂"
                },
                contents: [
                  {
                    type: "text",
                    text: isEn ? "🥗 Male Cut" : "🥗 男生減脂",
                    weight: "bold",
                    size: isEn ? "xxs" : "xs",
                    color: "#000000",
                    align: "center",
                    wrap: true
                  }
                ]
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#EFF6FF",
                borderColor: "#000000",
                borderWidth: "2px",
                cornerRadius: "12px",
                paddingTop: "9px",
                paddingBottom: "9px",
                paddingStart: "4px",
                paddingEnd: "4px",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "postback",
                  label: isEn ? "Male Bulk" : "💪 男生增肌",
                  data: JSON.stringify({ action: 'fillGoal' }),
                  inputOption: "openKeyboard",
                  fillInText: isEn ? "Set goal 175cm 68kg male muscle gain" : "改目標 175cm 68kg 男 增肌"
                },
                contents: [
                  {
                    type: "text",
                    text: isEn ? "💪 Male Bulk" : "💪 男生增肌",
                    weight: "bold",
                    size: isEn ? "xxs" : "xs",
                    color: "#000000",
                    align: "center",
                    wrap: true
                  }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#F3E8FF",
                borderColor: "#000000",
                borderWidth: "2px",
                cornerRadius: "12px",
                paddingTop: "9px",
                paddingBottom: "9px",
                paddingStart: "4px",
                paddingEnd: "4px",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "postback",
                  label: isEn ? "Maintain" : "🧘 維持體態",
                  data: JSON.stringify({ action: 'fillGoal' }),
                  inputOption: "openKeyboard",
                  fillInText: isEn ? "Set goal 165cm 55kg female maintenance" : "改目標 165cm 55kg 女 維持體態"
                },
                contents: [
                  {
                    type: "text",
                    text: isEn ? "🧘 Maintain" : "🧘 維持體態",
                    weight: "bold",
                    size: isEn ? "xxs" : "xs",
                    color: "#000000",
                    align: "center",
                    wrap: true
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
              label: isEn ? "⚙️ Open App for Full Settings" : "⚙️ 開啟 App 完整目標設定",
              uri: appTargetUrl
            }
          }
        ]
      }
    }
  };
}

function generateCurrentGoalFlex(userId, goals, liffId, userGistId, lang) {
  const isEn = lang === 'en';
  const cal = goals.calories || 2000;
  const pro = goals.protein || 100;
  const wat = goals.water || 2500;
  const appTargetUrl = userGistId ? `https://liff.line.me/${liffId}?tab=goals&gistId=${userGistId}` : `https://liff.line.me/${liffId}?tab=goals`;

  return {
    type: "flex",
    altText: isEn 
      ? `🎯 Current Daily Targets: ${cal} kcal / Protein ${pro}g / Water ${wat}ml`
      : `🎯 目前每日飲食目標：${cal} kcal / 蛋白質 ${pro}g / 水分 ${wat}ml`,
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
              { type: "text", text: isEn ? "🎯 Current Goals" : "🎯 目前設定目標", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: isEn ? "🎯 Your Daily Nutrition Targets" : "🎯 您的每日營養目標進度",
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
                  { type: "text", text: isEn ? "🔥 Daily Cal" : "🔥 每日熱量", size: "xxs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${cal}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: isEn ? "kcal / day" : "kcal / 天", size: "xxs", color: "#881337", weight: "bold" }
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
                  { type: "text", text: `${pro}g`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: isEn ? "g / day" : "克 / 天", size: "xxs", color: "#1E3A8A", weight: "bold" }
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
                  { type: "text", text: isEn ? "💧 Daily Water" : "💧 每日水分", size: "xxs", color: "#0891B2", weight: "bold" },
                  { type: "text", text: `${wat}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: isEn ? "ml / day" : "ml / 天", size: "xxs", color: "#164E63", weight: "bold" }
                ]
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
              label: isEn ? "⚙️ Open App for Full Settings" : "⚙️ 開啟 App 完整目標設定",
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
              label: isEn ? "🪄 Smart Goal Recommendations" : "🪄 依身材智能推薦目標",
              data: JSON.stringify({ action: 'goalGuide' }),
              displayText: isEn ? "Smart Goals" : "設定目標"
            }
          }
        ]
      }
    }
  };
}

// ========================================================
// 📈 4. 7 日飲食趨勢與歷史週報卡片
// ========================================================

function generateWeeklyTrendsFlex(userId, liffId, userGistId, props, lang) {
  if (!props) props = PropertiesService.getScriptProperties();
  const userLang = lang || getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';

  const daysData = getRecentDaysLogs(userId, 7, props, userGistId);
  const goals = getUserGoals(userId, props, userGistId);
  const goalCal = Number(goals.calories) || 2000;
  const goalPro = Number(goals.protein) || 100;

  let totalCalSum = 0;
  let totalProSum = 0;
  let loggedDaysCount = 0;

  daysData.forEach(d => {
    if (d.totalCal > 0) {
      totalCalSum += d.totalCal;
      totalProSum += d.totalPro;
      loggedDaysCount++;
    }
  });

  const avgCal = loggedDaysCount > 0 ? Math.round(totalCalSum / loggedDaysCount) : 0;
  const avgPro = loggedDaysCount > 0 ? Math.round(totalProSum / loggedDaysCount) : 0;

  const weekdaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

    let dayLabel = d.dayOfWeek;
    if (isEn) {
      try {
        const dObj = new Date(d.date + "T00:00:00+08:00");
        dayLabel = weekdaysEn[dObj.getDay()];
      } catch (e) {}
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
          text: `${dayLabel} ${d.displayDate}${isToday ? '★' : ''}`,
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
          color: isToday ? "#E11D48" : "#18181B",
          align: "end",
          flex: 3
        }
      ]
    };
  });

  return {
    type: "flex",
    altText: isEn ? `📈 7-Day Nutrition Trend: Avg ${avgCal} kcal / day` : `📈 7 日飲食趨勢週報：平均每日 ${avgCal} kcal`,
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
              { type: "text", text: isEn ? "7-Day Trend" : "7 日趨勢週報", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: isEn ? "📈 Weekly Calorie & Habit Report" : "📈 近 7 日飲食節奏與目標達成",
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
                  { type: "text", text: isEn ? "🔥 7-Day Avg Cal" : "🔥 7 日平均熱量", size: "xxs", color: "#E11D48", weight: "bold" },
                  { type: "text", text: `${avgCal}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: `kcal / ${goalCal}`, size: "xxs", color: "#881337", weight: "bold" }
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
                  { type: "text", text: isEn ? "🥩 7-Day Avg Pro" : "🥩 7 日平均蛋白質", size: "xxs", color: "#2563EB", weight: "bold" },
                  { type: "text", text: `${avgPro}g`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: `/ ${goalPro}g`, size: "xxs", color: "#71717A", weight: "bold" }
                ]
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FFFFFF",
            borderColor: "#000000",
            borderWidth: "2.5px",
            cornerRadius: "14px",
            paddingAll: "12px",
            spacing: "xs",
            contents: [
              { type: "text", text: isEn ? "📊 Daily Calorie Trajectory:" : "📊 每日熱量水平長條圖：", size: "xs", weight: "bold", color: "#000000" },
              ...chartRows
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
              label: isEn ? "📊 View Today's Summary" : "📊 查看今日總結",
              data: JSON.stringify({ action: 'save' }),
              displayText: isEn ? "Daily Summary" : "今日總結"
            }
          }
        ]
      }
    }
  };
}

// ========================================================
// 📋 5. 餐點管理清單卡片 (支援修改/刪除/清空)
// ========================================================

function generateManageMealsFlex(userId, targetDateStr, liffId, userGistId, props, lang) {
  if (!props) props = PropertiesService.getScriptProperties();
  const todayStr = targetDateStr || getTodayDateString();
  const isToday = todayStr === getTodayDateString();
  const allLogs = getTodayLogs(userId, todayStr, props, userGistId);
  const userLang = lang || getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';

  let totalCal = 0;
  const mealBoxes = [];

  if (allLogs.length === 0) {
    mealBoxes.push({
      type: "box",
      layout: "vertical",
      backgroundColor: "#FFFFFF",
      cornerRadius: "12px",
      borderColor: "#E4E4E7",
      borderWidth: "1px",
      paddingAll: "16px",
      alignItems: "center",
      contents: [
        { type: "text", text: isEn ? "No meals logged on this date 🐼" : "該日期尚未有任何飲食紀錄 🐼", size: "xs", color: "#A1A1AA" }
      ]
    });
  } else {
    allLogs.forEach((log, index) => {
      totalCal += Number(log.calories) || 0;
      let timeText = log.time || '';
      if (!timeText && log.timestamp) {
        try {
          timeText = Utilities.formatDate(new Date(Number(log.timestamp)), "Asia/Taipei", "HH:mm");
        } catch (e) {}
      }
      const dishName = log.dish_name || (isEn ? 'Meal' : '餐點');

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
              { type: "text", text: `${index + 1}. ${dishName}`, size: "sm", color: "#18181B", weight: "bold", flex: 3, wrap: true },
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
                  label: isEn ? "✏️ Edit" : "✏️ 微調",
                  data: JSON.stringify({ action: 'fillEdit', id: log.id }),
                  inputOption: "openKeyboard",
                  fillInText: isEn ? `Change ${dishName} ${log.calories}cal ${log.protein || 0}pro ${log.water || 0}water` : `改 ${dishName} ${log.calories}卡 ${log.protein || 0}蛋 ${log.water || 0}水`
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
                  label: isEn ? "🗑️ Delete" : "🗑️ 刪除",
                  data: JSON.stringify({ action: 'deleteMeal', id: log.id, index: index, date: todayStr }),
                  displayText: isEn ? `🗑️ Delete meal: ${dishName}` : `🗑️ 刪除餐點：${dishName}`
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
    altText: isEn 
      ? `📋 Manage ${isToday ? 'Today' : todayStr} Logs (${allLogs.length} meals, ${totalCal} kcal)`
      : `📋 ${isToday ? '今日' : todayStr} 餐點管理清單（共 ${allLogs.length} 餐，累計 ${totalCal} kcal）`,
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
            text: isToday ? (isEn ? "📋 Today's Meals Management" : "📋 今日餐點管理清單") : (isEn ? `📋 ${todayStr} Meals Management` : `📋 ${todayStr} 餐點管理清單`),
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            margin: "xs"
          },
          {
            type: "text",
            text: isEn ? `${allLogs.length} meals logged | Total ${totalCal} kcal` : `${isToday ? '今日' : '該日'}已記錄 ${allLogs.length} 餐 ｜ 累計攝取 ${totalCal} kcal`,
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
              label: isToday ? (isEn ? "📊 View Today's Summary" : "📊 查看今日總結") : (isEn ? `📊 View ${todayStr} Summary` : `📊 查看 ${todayStr} 總結`),
              data: JSON.stringify({ action: 'pickDate', date: todayStr }),
              displayText: isToday ? (isEn ? "Daily Summary" : "今日總結") : (isEn ? `${todayStr} Summary` : `${todayStr} 總結`)
            }
          },
          ...(isToday && allLogs.length > 0 ? [{
            type: "button",
            style: "secondary",
            height: "sm",
            color: "#FFF1F2",
            action: {
              type: "postback",
              label: isEn ? "🗑️ Clear All Today's Logs" : "🗑️ 清空今日紀錄",
              data: JSON.stringify({ action: 'clearTodayConfirm' }),
              displayText: isEn ? "🗑️ Clear Today's Logs" : "🗑️ 清空今日紀錄"
            }
          }] : [])
        ]
      }
    }
  };
}

// ========================================================
// ⭐ 6. 常用餐點輪播卡片 (Favorites Carousel)
// ========================================================

function generateFavoritesCarouselFlex(userId, liffId, userGistId, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const favorites = getUserFavorites(userId, props, userGistId);
  const appTargetUrl = `https://liff.line.me/${liffId}?userId=${userId}${userGistId ? `&gistId=${userGistId}` : ''}`;
  const userLang = getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';
  const bubbles = [];

  // 💧 Bubble 1: 快速補水站
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
            { type: "text", text: isEn ? "💧 Hydration Station" : "💧 快速補水站", weight: "bold", size: "sm", color: "#FFFFFF" },
            { type: "text", text: isEn ? "1-Tap Log" : "一鍵打卡", weight: "bold", size: "xs", color: "#CFFAFE", align: "end" }
          ]
        },
        {
          type: "text",
          text: isEn ? "Tap below to log water quickly" : "點擊下方快速記錄水分",
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
            label: isEn ? "💧 +500ml Water" : "💧 喝水 +500ml",
            data: JSON.stringify({ action: 'quickWater', amount: 500 }),
            displayText: isEn ? "💧 Drink 500ml water" : "💧 喝水 +500ml"
          }
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          color: "#CCFBF1",
          action: {
            type: "postback",
            label: isEn ? "💧 +250ml Water" : "💧 喝水 +250ml",
            data: JSON.stringify({ action: 'quickWater', amount: 250 }),
            displayText: isEn ? "💧 Drink 250ml water" : "💧 喝水 +250ml"
          }
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          color: "#CCFBF1",
          action: {
            type: "postback",
            label: isEn ? "💧 +1000ml Water" : "💧 喝水 +1000ml",
            data: JSON.stringify({ action: 'quickWater', amount: 1000 }),
            displayText: isEn ? "💧 Drink 1000ml water" : "💧 喝水 +1000ml"
          }
        }
      ]
    }
  });

  // ⭐ Bubbles 2..N: 常用餐點
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
          { type: "text", text: isEn ? "⭐ No Favorites Yet" : "⭐ 尚未建立常用餐點", weight: "bold", size: "sm", color: "#713F12" },
          { type: "text", text: isEn ? "Build your personal favorite list" : "隨時建立您的專屬美食庫", size: "xxs", color: "#A16207", margin: "xs" }
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
            text: isEn ? "💡 Tip: After AI photo recognition tap 「⭐ Favorite」 to save, or tap button below!" : "💡 提示：拍照辨識後點擊「⭐ 存為常用」，或點擊下方直接填入自訂指令！",
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
              label: isEn ? "➕ Add Favorite" : "➕ 填入新增指令",
              data: JSON.stringify({ action: 'fillFav' }),
              inputOption: "openKeyboard",
              fillInText: isEn ? "Add fav Black Coffee+Egg 160cal 14pro 450water" : "加常用 美式咖啡+茶葉蛋 160卡 14蛋 450水"
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
                { type: "text", text: isEn ? "⭐ Favorite" : "⭐ 常用餐點", weight: "bold", size: "xs", color: "#000000" },
                { type: "text", text: isEn ? "Swipe ↔" : "左右滑動", size: "xxs", color: "#713F12", align: "end" }
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
                    { type: "text", text: isEn ? "🔥 Cal" : "🔥 熱量", size: "xxs", color: "#E11D48", weight: "bold" },
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
                    { type: "text", text: isEn ? "🥩 Protein" : "🥩 蛋白質", size: "xxs", color: "#2563EB", weight: "bold" },
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
                    { type: "text", text: isEn ? "💧 Water" : "💧 水分", size: "xxs", color: "#0891B2", weight: "bold" },
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
                label: isEn ? "⚡ Quick Log This" : "⚡ 一鍵記錄這餐",
                data: JSON.stringify({
                  action: 'quickLogFavorite',
                  name: encodeURIComponent(fav.dish_name),
                  cal: fav.calories,
                  pro: fav.protein,
                  wat: fav.water || 0
                }),
                displayText: isEn ? `⚡ Quick Log: ${fav.dish_name}` : `⚡ 快捷記錄：${fav.dish_name}`
              }
            },
            {
              type: "button",
              style: "secondary",
              height: "sm",
              color: "#F4F4F5",
              action: {
                type: "uri",
                label: isEn ? "📱 Open Web App" : "📱 開啟 App 管理",
                uri: appTargetUrl
              }
            }
          ]
        }
      });
    });
  }

  return {
    type: "flex",
    altText: isEn ? `⭐ Favorite Meals & Hydration Station` : `⭐ 常用餐點與補水站（左右滑動選擇）`,
    contents: {
      type: "carousel",
      contents: bubbles
    }
  };
}

function generateFavoritesListFlex(userId, liffId, userGistId, props) {
  return generateFavoritesCarouselFlex(userId, liffId, userGistId, props);
}

function generateFavoriteAddedFlex(favItem, liffId, userGistId, lang) {
  const isEn = lang === 'en';
  return {
    type: "flex",
    altText: isEn ? `⭐ Saved to favorites: ${favItem.dish_name}` : `⭐ 已成功存為常用餐點：${favItem.dish_name}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#FDE047",
        paddingAll: "14px",
        contents: [
          { type: "text", text: isEn ? "⭐ Added to Favorites!" : "⭐ 成功存入常用餐點！", weight: "bold", size: "md", color: "#000000" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          { type: "text", text: favItem.dish_name, weight: "bold", size: "md", color: "#000000" },
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
            text: isEn ? "Type 「Favorites」 anytime for 1-tap fast logging! 🐼" : "隨時在對話框輸入「常用」即可一鍵快捷記錄！🐼",
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
              label: isEn ? "⭐ View Favorites" : "⭐ 查看常用庫",
              text: isEn ? "Favorites" : "常用"
            }
          }
        ]
      }
    }
  };
}

// ========================================================
// 🗑️ 7. 清空確認卡片
// ========================================================

function generateClearConfirmFlex(liffId, userGistId, lang) {
  const isEn = lang === 'en';
  return {
    type: "flex",
    altText: isEn ? "⚠️ Confirm clear all today's logs?" : "⚠️ 確定要清空今日所有紀錄嗎？",
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        contents: [
          { type: "text", text: isEn ? "⚠️ Confirm Clear Today's Logs" : "⚠️ 清空今日飲食紀錄確認", weight: "bold", size: "md", color: "#E11D48" },
          {
            type: "text",
            text: isEn ? "Are you sure you want to delete all meal logs recorded today? This cannot be undone!" : "確定要清除今天的所有餐點紀錄嗎？此動作無法復原喔！",
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
            type: "box",
            layout: "vertical",
            backgroundColor: "#E11D48",
            borderColor: "#000000",
            borderWidth: "2px",
            cornerRadius: "12px",
            paddingTop: "9px",
            paddingBottom: "9px",
            paddingStart: "4px",
            paddingEnd: "4px",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            action: {
              type: "postback",
              label: isEn ? "Confirm" : "確定清空",
              data: JSON.stringify({ action: 'clearToday' }),
              displayText: isEn ? "🗑️ Confirm clear today" : "🗑️ 確定清空今日所有紀錄"
            },
            contents: [
              {
                type: "text",
                text: isEn ? "🗑️ Confirm" : "🗑️ 確定清空",
                weight: "bold",
                size: isEn ? "xxs" : "xs",
                color: "#FFFFFF",
                align: "center",
                wrap: true
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F4F4F5",
            borderColor: "#000000",
            borderWidth: "2px",
            cornerRadius: "12px",
            paddingTop: "9px",
            paddingBottom: "9px",
            paddingStart: "4px",
            paddingEnd: "4px",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            action: {
              type: "postback",
              label: isEn ? "Cancel" : "取消",
              data: JSON.stringify({ action: 'cancel' }),
              displayText: isEn ? "❌ Cancel" : "❌ 取消"
            },
            contents: [
              {
                type: "text",
                text: isEn ? "❌ Cancel" : "❌ 取消",
                weight: "bold",
                size: isEn ? "xxs" : "xs",
                color: "#000000",
                align: "center",
                wrap: true
              }
            ]
          }
        ]
      }
    }
  };
}

// ========================================================
// 🌐 8. 語言切換卡片 (Language Selection)
// ========================================================

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
                text: "適合台灣/港澳使用者，提供貼切的生活化飲食分析與道地教練點評，並切換為繁體圖文選單。",
                size: "xxs",
                color: "#64748B",
                wrap: true,
                margin: "xs"
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: !isEn ? "#FDE047" : "#FFFFFF",
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
                paddingAll: "10px",
                alignItems: "center",
                justifyContent: "center",
                margin: "sm",
                action: {
                  type: "postback",
                  label: !isEn ? "✅ 保持繁體中文" : "切換至繁體中文",
                  data: JSON.stringify({ action: 'setLanguage', lang: 'zh' }),
                  displayText: "切換成中文"
                },
                contents: [
                  {
                    type: "text",
                    text: !isEn ? "✅ 保持繁體中文" : "切換至繁體中文",
                    weight: "bold",
                    size: "xs",
                    color: "#000000"
                  }
                ]
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
                text: "Food names, portion breakdowns, Rich Menu and coach commentary will be analyzed and delivered in English.",
                size: "xxs",
                color: "#64748B",
                wrap: true,
                margin: "xs"
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: isEn ? "#FDE047" : "#FFFFFF",
                borderColor: "#000000",
                borderWidth: "2.5px",
                cornerRadius: "14px",
                paddingAll: "10px",
                alignItems: "center",
                justifyContent: "center",
                margin: "sm",
                action: {
                  type: "postback",
                  label: isEn ? "✅ Active (English)" : "Switch to English",
                  data: JSON.stringify({ action: 'setLanguage', lang: 'en' }),
                  displayText: "Switch to English"
                },
                contents: [
                  {
                    type: "text",
                    text: isEn ? "✅ Active (English)" : "Switch to English",
                    weight: "bold",
                    size: "xs",
                    color: "#000000"
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
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          ...(appTargetUrl ? [{
            type: "box",
            layout: "vertical",
            backgroundColor: "#FDE047",
            borderColor: "#000000",
            borderWidth: "2.5px",
            cornerRadius: "14px",
            paddingAll: "12px",
            alignItems: "center",
            justifyContent: "center",
            action: {
              type: "uri",
              label: isEn ? "📱 Open Web App Settings" : "📱 開啟 Web App 完整設定",
              uri: appTargetUrl
            },
            contents: [
              {
                type: "text",
                text: isEn ? "📱 Open Web App Settings" : "📱 開啟 Web App 完整設定",
                weight: "bold",
                size: "sm",
                color: "#000000"
              }
            ]
          }] : [])
        ]
      }
    }
  };
}

// ========================================================
// 🎭 9. 教練性格挑選卡片 (Persona Selection)
// ========================================================

function generatePersonaSelectionFlex(userId, liffId, userGistId, props, lang) {
  if (!props) props = PropertiesService.getScriptProperties();
  const currentPersona = getUserPersona(userId, props, userGistId);
  const userLang = lang || getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';

  const personasZh = [
    { id: 'tsundere', name: '傲嬌毒舌教練', desc: '口嫌體正直、犀利吐槽與專業飲食點評', emoji: '🐼😡', color: '#FEF08A' },
    { id: 'gentle', name: '治癒天使教練', desc: '溫柔體貼、溫馨鼓勵與同理陪伴', emoji: '🐼🥰', color: '#DCFCE7' },
    { id: 'hardcore', name: '魔鬼士官長', desc: '熱血斯巴達、嚴格鞭策燃燒卡路里', emoji: '🐼🔥', color: '#FEE2E2' }
  ];

  const personasEn = [
    { id: 'tsundere', name: 'Tsundere Coach', desc: 'Witty, sharp-tongued yet deeply caring nutrition expert', emoji: '🐼😡', color: '#FEF08A' },
    { id: 'gentle', name: 'Healing Angel', desc: 'Sweet, gentle, empathetic companion with warm praise', emoji: '🐼🥰', color: '#DCFCE7' },
    { id: 'hardcore', name: 'Drill Sergeant', desc: 'Fiery Spartan gym trainer pushing you to burn every calorie', emoji: '🐼🔥', color: '#FEE2E2' }
  ];

  const personas = isEn ? personasEn : personasZh;

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
            text: isCurrent ? (isEn ? "✅ Active" : "✅ 目前使用中") : (isEn ? "Tap to switch" : "點擊立即切換"),
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
            type: "box",
            layout: "vertical",
            backgroundColor: isCurrent ? "#F4F4F5" : "#FDE047",
            borderColor: "#000000",
            borderWidth: "2.5px",
            cornerRadius: "14px",
            paddingAll: "10px",
            alignItems: "center",
            justifyContent: "center",
            action: {
              type: "postback",
              label: isCurrent ? (isEn ? "Active" : "使用中") : (isEn ? "Switch" : "切換至此性格"),
              data: JSON.stringify({ action: 'setPersona', persona: p.id }),
              displayText: isEn ? `Switch Persona: ${p.name}` : `切換教練性格：${p.name}`
            },
            contents: [
              {
                type: "text",
                text: isCurrent ? (isEn ? "✅ Active" : "✅ 目前使用中") : (isEn ? "Switch to this" : "切換至此性格"),
                weight: "bold",
                size: "xs",
                color: "#000000"
              }
            ]
          }
        ]
      }
    };
  });

  return {
    type: "flex",
    altText: isEn ? "🎭 Choose your preferred Panda Coach persona" : "🎭 請選擇您偏好的熊貓教練性格",
    contents: {
      type: "carousel",
      contents: bubbles
    }
  };
}

// ========================================================
// 🛠️ 10. 全功能指令手冊卡片 (Command Menu)
// ========================================================

function generateCommandMenuFlex(userId, liffId, userGistId, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const appTargetUrl = 'https://liff.line.me/' + liffId + '?userId=' + userId + (userGistId ? '&gistId=' + userGistId : '');
  const todayStr = getTodayDateString();
  const userLang = getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';

  function buildMenuBtn(text, action, bgColor, textColor = "#000000") {
    return {
      type: "box",
      layout: "vertical",
      backgroundColor: bgColor,
      borderColor: "#000000",
      borderWidth: "2px",
      cornerRadius: "12px",
      paddingTop: "9px",
      paddingBottom: "9px",
      paddingStart: "4px",
      paddingEnd: "4px",
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      action: action,
      contents: [
        {
          type: "text",
          text: text,
          weight: "bold",
          size: isEn ? "xxs" : "xs",
          color: textColor,
          align: "center",
          wrap: true
        }
      ]
    };
  }

  return {
    type: "flex",
    altText: isEn ? "🛠️ Daily Diet Guide & Commands" : "🛠️ Daily Diet 操作說明與所有功能指令手冊",
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
              { type: "text", text: isEn ? "Command Manual" : "全功能操作手冊", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: isEn ? "Tap any button below to trigger actions 🐼👇" : "點擊下方任何按鈕，直接執行對應操作 🐼👇",
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
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: [
              { type: "text", text: isEn ? "⚡ Quick Log & Hydration" : "⚡ 快速記錄與補水", weight: "bold", size: "xs", color: "#000000" },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  buildMenuBtn(
                    isEn ? "⭐ Favorites" : "⭐ 常用餐點",
                    {
                      type: "postback",
                      label: isEn ? "Favorites" : "常用餐點",
                      data: JSON.stringify({ action: 'viewFavorites' }),
                      displayText: isEn ? "Favorites" : "常用"
                    },
                    "#FEF08A"
                  ),
                  buildMenuBtn(
                    isEn ? "📸 AI Camera" : "📸 拍照指引",
                    {
                      type: "postback",
                      label: isEn ? "Camera" : "拍照指引",
                      data: JSON.stringify({ action: 'guideCamera' }),
                      displayText: isEn ? "Camera" : "拍照"
                    },
                    "#FEE2E2"
                  )
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                margin: "xs",
                contents: [
                  buildMenuBtn(
                    isEn ? "💧 +500ml Water" : "💧 補水 500",
                    {
                      type: "postback",
                      label: isEn ? "Water" : "補水 500",
                      data: JSON.stringify({ action: 'quickWater', amount: 500 }),
                      displayText: isEn ? "💧 Drink 500ml water" : "💧 喝水 +500ml"
                    },
                    "#E0F2FE"
                  ),
                  buildMenuBtn(
                    isEn ? "📊 Summary" : "📊 今日總結",
                    {
                      type: "postback",
                      label: isEn ? "Summary" : "今日總結",
                      data: JSON.stringify({ action: 'save' }),
                      displayText: isEn ? "Daily Summary" : "今日"
                    },
                    "#000000",
                    "#FFFFFF"
                  )
                ]
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: [
              { type: "text", text: isEn ? "📈 History & Trends" : "📈 歷程與歷史回顧", weight: "bold", size: "xs", color: "#000000" },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  buildMenuBtn(
                    isEn ? "📈 7-Day Trend" : "📈 7 日週報",
                    {
                      type: "postback",
                      label: isEn ? "7-Day Trend" : "7 日週報",
                      data: JSON.stringify({ action: 'viewWeeklyTrends' }),
                      displayText: isEn ? "7-Day Trend" : "週報"
                    },
                    "#FEF9C3"
                  ),
                  buildMenuBtn(
                    isEn ? "📅 Select Date" : "📅 選擇日期",
                    {
                      type: "datetimepicker",
                      label: isEn ? "Select Date" : "選擇日期",
                      data: JSON.stringify({ action: 'pickDate' }),
                      mode: "date",
                      initial: todayStr,
                      max: todayStr
                    },
                    "#EFF6FF"
                  )
                ]
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: [
              { type: "text", text: isEn ? "⚙️ Goals & Settings" : "⚙️ 目標設定與管理", weight: "bold", size: "xs", color: "#000000" },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  buildMenuBtn(
                    isEn ? "🎯 Smart Goals" : "🎯 智能目標",
                    {
                      type: "postback",
                      label: isEn ? "Goals" : "智能目標",
                      data: JSON.stringify({ action: 'goalGuide' }),
                      displayText: isEn ? "Smart Goals" : "設定目標"
                    },
                    "#DCFCE7"
                  ),
                  buildMenuBtn(
                    isEn ? "🎭 Coach Persona" : "🎭 切換性格",
                    {
                      type: "postback",
                      label: isEn ? "Persona" : "切換性格",
                      data: JSON.stringify({ action: 'choosePersona' }),
                      displayText: isEn ? "Coach Persona" : "切換性格"
                    },
                    "#F3E8FF"
                  )
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                margin: "xs",
                contents: [
                  buildMenuBtn(
                    isEn ? "📋 Manage Logs" : "📋 管理紀錄",
                    {
                      type: "postback",
                      label: isEn ? "Manage Logs" : "管理紀錄",
                      data: JSON.stringify({ action: 'manageMeals' }),
                      displayText: isEn ? "Manage Logs" : "管理"
                    },
                    "#FEE2E2"
                  ),
                  buildMenuBtn(
                    isEn ? "🐛 Bug Report" : "🐛 問題回報",
                    {
                      type: "postback",
                      label: isEn ? "Report" : "問題回報",
                      data: JSON.stringify({ action: 'bugReport' }),
                      inputOption: "openKeyboard",
                      fillInText: isEn ? "Bug: " : "回報 "
                    },
                    "#F1F5F9"
                  )
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                margin: "xs",
                contents: [
                  buildMenuBtn(
                    isEn ? "🌐 Language" : "🌐 語言切換",
                    {
                      type: "postback",
                      label: isEn ? "Language" : "語言切換",
                      data: JSON.stringify({ action: 'chooseLanguage' }),
                      displayText: isEn ? "Language" : "切換語言"
                    },
                    "#E0F2FE"
                  )
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
            type: "box",
            layout: "vertical",
            backgroundColor: "#000000",
            borderColor: "#000000",
            borderWidth: "2px",
            cornerRadius: "12px",
            paddingTop: "11px",
            paddingBottom: "11px",
            paddingStart: "8px",
            paddingEnd: "8px",
            alignItems: "center",
            justifyContent: "center",
            action: {
              type: "uri",
              label: isEn ? "Open Diet Diary" : "開啟個人飲食日記",
              uri: appTargetUrl
            },
            contents: [
              {
                type: "text",
                text: isEn ? "📱 Open Diet Diary App" : "📱 開啟個人飲食日記",
                weight: "bold",
                size: "sm",
                color: "#FFFFFF",
                align: "center",
                wrap: true
              }
            ]
          }
        ]
      }
    }
  };
}

// ========================================================
// 🐼 11. 歡迎新用戶 / 舊用戶連動卡片
// ========================================================

function generateWelcomeFlex(userId, liffId, userGistId, lang) {
  const isEn = lang === 'en';
  const appTargetUrl = 'https://liff.line.me/' + liffId + '?userId=' + userId + (userGistId ? '&gistId=' + userGistId : '');
  const heroImageUrl = "https://raw.githubusercontent.com/WinnieLineer/daily-diet/main/public/cover-photo.jpg";

  return {
    type: "flex",
    altText: isEn ? "🐼 Welcome to Daily Diet Nutrition Coach!" : "🐼 歡迎使用 Daily Diet 飲食管理助手！",
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
              { type: "text", text: isEn ? "AI Coach" : "AI 智能教練", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: isEn ? "✨ Your Personal AI Nutrition Coach" : "✨ 您的個人專屬 AI 飲食記錄教練",
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
                text: isEn ? "❓ Are you a new user or used the Web app before?" : "❓ 請問您是新用戶，還是使用過 Web 版？",
                weight: "bold",
                size: "xs",
                color: "#1E3A8A",
                wrap: true
              },
              {
                type: "text",
                text: isEn ? "Tap below to get started:" : "點擊下方符合您的身份，教練將立即引導專屬設定：",
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
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#FDE047",
                    borderColor: "#000000",
                    borderWidth: "2.5px",
                    cornerRadius: "14px",
                    paddingAll: "12px",
                    alignItems: "center",
                    justifyContent: "center",
                    action: {
                      type: "postback",
                      label: isEn ? "🐣 New User Guide (30s)" : "🐣 全新用戶 30 秒引導",
                      data: JSON.stringify({ action: 'onboarding', type: 'new' }),
                      displayText: isEn ? "🐣 I am a new user" : "🐣 我是全新用戶"
                    },
                    contents: [
                      {
                        type: "text",
                        text: isEn ? "🐣 New User Fast Start (30s)" : "🐣 全新用戶快速上手 (30秒)",
                        weight: "bold",
                        size: "sm",
                        color: "#000000",
                        wrap: true
                      }
                    ]
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#FFFFFF",
                    borderColor: "#000000",
                    borderWidth: "2.5px",
                    cornerRadius: "14px",
                    paddingAll: "12px",
                    alignItems: "center",
                    justifyContent: "center",
                    action: {
                      type: "postback",
                      label: isEn ? "🌐 Existing Web User Gist Sync" : "🌐 舊用戶 Gist 資料綁定",
                      data: JSON.stringify({ action: 'onboarding', type: 'web_user' }),
                      displayText: isEn ? "🌐 Used Web app before" : "🌐 我用過 Web 版"
                    },
                    contents: [
                      {
                        type: "text",
                        text: isEn ? "🌐 Existing Web User Gist Sync" : "🌐 舊用戶 Gist 資料綁定",
                        weight: "bold",
                        size: "sm",
                        color: "#000000",
                        wrap: true
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  };
}

function generateWebUserGuideFlex(userId, liffId, userGistId, props, lang) {
  const isEn = lang === 'en';
  const appTargetUrl = 'https://liff.line.me/' + liffId + '?userId=' + userId + (userGistId ? '&gistId=' + userGistId : '');

  return {
    type: "flex",
    altText: isEn ? "🌐 Welcome Back! Web Record Sync Guide" : "🌐 歡迎老朋友！Web 紀錄無縫同步指南",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#18181B",
        paddingAll: "14px",
        contents: [
          { type: "text", text: isEn ? "🌐 Welcome Back! Sync Web Data" : "🌐 歡迎老朋友！無縫連動 Web 紀錄", weight: "bold", size: "md", color: "#FDE047" },
          { type: "text", text: isEn ? "Bind your Gist ID to sync 100% of meals & targets!" : "綁定 Gist ID，讓歷史餐點與目標 100% 雙向同步！", size: "xxs", color: "#E4E4E7", margin: "xs" }
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
              { type: "text", text: isEn ? "📌 3 Quick Steps to Link:" : "📌 簡單 3 步驟完成連動：", weight: "bold", size: "xs", color: "#854D0E" },
              { type: "text", text: isEn ? "1. Open Web app from button below" : "1. 點擊下方按鈕開啟 Web 版 Daily Diet", size: "xxs", color: "#713F12" },
              { type: "text", text: isEn ? "2. Go to Settings ➔ Cloud Backup to copy Gist ID" : "2. 前往右上角「⚙️ 設定」➔「雲端備份」複製 Gist ID", size: "xxs", color: "#713F12" },
              { type: "text", text: isEn ? "3. Tap 'Bind Gist' and send: Bind <YourGistId>" : "3. 點擊下方「填入綁定指令」，送出「綁定 您的GistID」即可！", size: "xxs", color: "#713F12" }
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
              label: isEn ? "📱 Open Web to Copy Gist ID" : "📱 開啟 Web 複製 Gist ID",
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
              label: isEn ? "☁️ Fill 'Bind Gist'" : "☁️ 填入「綁定 Gist」",
              data: JSON.stringify({ action: 'fillGist' }),
              inputOption: "openKeyboard",
              fillInText: isEn ? "Bind " : "綁定 "
            }
          }
        ]
      }
    }
  };
}

function generateBugReportAckFlex(userText, isSuccess, lang) {
  // 保持向後相容：若傳入 (userText, liffId, userGistId, lang)
  if (typeof isSuccess === 'string' && typeof lang === 'string') {
    lang = arguments[3] || 'zh-TW';
    isSuccess = true;
  }
  const isEn = lang === 'en';
  const success = isSuccess !== false;

  return {
    type: "flex",
    altText: isEn ? "🛠️ Thank you for your feedback! Submitted to team" : "🛠️ 感謝您的問題回報！已同步送交開發團隊",
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#18181B",
        paddingAll: "14px",
        contents: [
          {
            type: "text",
            text: success
              ? (isEn ? "🛠️ Feedback Received!" : "🛠️ 問題回報已送達！")
              : (isEn ? "🛠️ Report Recorded!" : "🛠️ 問題回報已記錄！"),
            weight: "bold",
            size: "md",
            color: "#FDE047"
          },
          {
            type: "text",
            text: success
              ? (isEn ? "Submitted to the engineering team 🐼❤️" : "已同步表單提交至工程團隊信箱 🐼❤️")
              : (isEn ? "Logged locally, team will review 🐼❤️" : "已為您留存紀錄，團隊將儘速處理 🐼❤️"),
            size: "xxs",
            color: "#A1A1AA",
            margin: "xs",
            wrap: true
          }
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
            text: success
              ? (isEn ? "✅ Submitted via Web3Forms:" : "✅ 已同步透過 Web3Forms 表單提交：")
              : (isEn ? "📋 Recorded Content:" : "📋 已記錄之問題內容："),
            size: "xs",
            color: success ? "#15803D" : "#D97706",
            weight: "bold",
            wrap: true
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
                text: userText || (isEn ? 'No text details' : '無文字詳情'),
                size: "xs",
                color: "#991B1B",
                wrap: true,
                weight: "bold"
              }
            ]
          },
          {
            type: "text",
            text: isEn
              ? "Your feedback is vital to making Daily Diet better. Thank you!"
              : "您的每一則回報都是讓 Daily Diet 變得更好的動力，感謝您！",
            size: "xxs",
            color: "#71717A",
            wrap: true,
            margin: "sm"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "10px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#F4F4F5",
                borderColor: "#000000",
                borderWidth: "2px",
                cornerRadius: "10px",
                paddingTop: "8px",
                paddingBottom: "8px",
                paddingStart: "4px",
                paddingEnd: "4px",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "message",
                  label: isEn ? "Guide" : "手冊",
                  text: isEn ? "Guide" : "說明"
                },
                contents: [
                  {
                    type: "text",
                    text: isEn ? "💡 Guide" : "💡 全功能手冊",
                    weight: "bold",
                    size: isEn ? "xxs" : "xs",
                    color: "#000000",
                    align: "center",
                    wrap: true
                  }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FEE2E2",
                borderColor: "#000000",
                borderWidth: "2px",
                cornerRadius: "10px",
                paddingTop: "8px",
                paddingBottom: "8px",
                paddingStart: "4px",
                paddingEnd: "4px",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "postback",
                  label: isEn ? "Report" : "回報",
                  data: JSON.stringify({ action: 'bugReport' }),
                  inputOption: "openKeyboard",
                  fillInText: isEn ? "Bug: " : "回報 "
                },
                contents: [
                  {
                    type: "text",
                    text: isEn ? "🐛 Report More" : "🐛 再次回報",
                    weight: "bold",
                    size: isEn ? "xxs" : "xs",
                    color: "#000000",
                    align: "center",
                    wrap: true
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  };
}
