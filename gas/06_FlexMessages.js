/**
 * ========================================================
 * 06_FlexMessages.js - LINE Flex 訊息卡片產生器 (中/英雙語徹底本地化)
 * 風格：Neo-Brutalist 粗黑框高對比設計
 * ========================================================
 */

// ========================================================
// 🎨 Neo-Brutalist 按鈕通用產生器 (與 Web App NeoButton 完美對齊)
// 粗黑框 (2px #000000) + 圓角 (10px/14px) + 高對比品牌底色 + 粗體置中文字
// ========================================================

function createNeoFlexButton(config) {
  const label = config.label || '';
  const action = config.action || {};
  const variant = config.variant || 'accent';
  const size = config.size || 'md';
  const flex = config.flex !== undefined ? config.flex : null;
  const margin = config.margin !== undefined ? config.margin : null;

  const bgMap = {
    accent: '#FDE047',
    white: '#FFFFFF',
    black: '#000000',
    secondary: '#F4F4F5',
    danger: '#FFF1F2',
    green: '#DCFCE7',
    yellowLight: '#FEF9C3',
    blue: '#2563EB',
    blueLight: '#DBEAFE',
    cyan: '#06B6D4',
    cyanLight: '#CCFBF1',
    slate: '#475569',
    slateLight: '#E2E8F0'
  };

  const textMap = {
    black: '#FFFFFF',
    blue: '#FFFFFF',
    cyan: '#FFFFFF',
    slate: '#FFFFFF',
    danger: '#E11D48'
  };

  const backgroundColor = bgMap[variant] || '#FFFFFF';
  const textColor = textMap[variant] || '#000000';
  const isSm = size === 'sm';
  const isBlackVariant = variant === 'black';

  // 🌟 Neo-Brutalist 3D 立體硬黑陰影參數 (完美復刻 Web 端 .shadow-neo 質感)
  const shadowOffset = isSm ? '2px' : '3px';
  const outerCorner = isSm ? '11px' : '15px';
  const innerCorner = isSm ? '9px' : '13px';
  const shadowColor = isBlackVariant ? '#3F3F46' : '#000000';

  const innerBtn = {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    backgroundColor: isBlackVariant ? '#18181B' : backgroundColor,
    borderColor: '#000000',
    borderWidth: '2px',
    cornerRadius: innerCorner,
    paddingTop: isSm ? '7px' : '9px',
    paddingBottom: isSm ? '7px' : '9px',
    paddingStart: isSm ? '6px' : '12px',
    paddingEnd: isSm ? '6px' : '12px',
    alignItems: 'center',
    justifyContent: 'center',
    contents: [
      {
        type: 'text',
        text: label,
        weight: 'bold',
        size: isSm ? 'xxs' : 'xs',
        color: textColor,
        align: 'center',
        wrap: true
      }
    ]
  };

  const outerWrapper = {
    type: 'box',
    layout: 'vertical',
    backgroundColor: shadowColor,
    cornerRadius: outerCorner,
    paddingTop: '0px',
    paddingStart: '0px',
    paddingBottom: shadowOffset,
    paddingEnd: shadowOffset,
    action: action,
    contents: [innerBtn]
  };

  if (flex !== null) outerWrapper.flex = flex;
  if (margin !== null) outerWrapper.margin = margin;

  return outerWrapper;
}

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
            margin: "xs",
            wrap: true
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
          // 📊 查看總結 & ⭐ 存為常用
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              createNeoFlexButton({
                label: isEn 
                  ? (analysis.date && analysis.date !== getTodayDateString() ? `📊 ${analysis.date}` : "📊 Summary")
                  : (analysis.date && analysis.date !== getTodayDateString() ? `📊 查看 ${analysis.date} 總結` : "📊 查看今日總結"),
                variant: "black",
                size: "md",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "Summary" : "今日總結",
                  data: analysis.date && analysis.date !== getTodayDateString()
                    ? JSON.stringify({ action: 'pickDate', date: analysis.date })
                    : postbackSaveData,
                  displayText: isEn 
                    ? (analysis.date && analysis.date !== getTodayDateString() ? `${analysis.date} Summary` : "Daily Summary")
                    : (analysis.date && analysis.date !== getTodayDateString() ? `${analysis.date} 總結` : "今日總結")
                }
              }),
              createNeoFlexButton({
                label: isEn ? "⭐ Favorite" : "⭐ 存為常用",
                variant: "yellowLight",
                size: "md",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "⭐ Favorite" : "⭐ 存為常用",
                  data: postbackFavData,
                  displayText: isEn ? `⭐ Favorite: ${analysis.dish_name}` : `⭐ 存為常用：${analysis.dish_name}`
                }
              })
            ]
          },
          // 🗑️ 撤回這筆紀錄
          createNeoFlexButton({
            label: isEn ? "🗑️ Cancel Log" : "🗑️ 撤回這筆紀錄",
            variant: "danger",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "🗑️ Cancel Log" : "🗑️ 撤回這筆紀錄",
              data: postbackCancelData,
              displayText: isEn ? "🗑️ Cancel Log" : "🗑️ 撤回這筆紀錄"
            }
          })
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
  let totalCarbs = 0;
  let totalFat = 0;
  let mealItems = [];

  allLogs.forEach((log) => {
    totalCal += Number(log.calories) || 0;
    totalPro += Number(log.protein) || 0;
    totalWater += Number(log.water) || 0;
    totalCarbs += Number(log.carbs) || 0;
    totalFat += Number(log.fat) || 0;

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
  const carbsGoal = goals.carbs || 200;
  const fatGoal = goals.fat || 60;
  const showCarbsFat = !!goals.show_carbs_fat;
  const remainingCal = Math.max(0, calGoal - totalCal);
  const calPercent = calGoal > 0 ? Math.round((totalCal / calGoal) * 100) : 0;
  const isOverCal = calGoal > 0 && totalCal > calGoal;

  let coachTip = isEn ? "Building your healthy diet habit, keep it up! 🐼" : "飲食紀錄養成中，繼續保持！🐼";
  if (isToday) {
    if (isOverCal) {
      const overCal = totalCal - calGoal;
      coachTip = isEn 
        ? `Daily calorie goal exceeded by ${overCal} kcal (${calPercent}%)! Drink plenty of water and take a walk! 🔥` 
        : `今日熱量已超過目標 ${overCal} kcal (${calPercent}%)，晚點多喝水散步消化喔！🔥`;
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
      ? (isEn ? `📊 Today's Summary: ${totalCal} / ${calGoal} kcal (${calPercent}%)` : `📊 今日飲食總結：已攝取 ${totalCal} / ${calGoal} kcal (${calPercent}%)`)
      : (isEn ? `📅 ${todayStr} Summary: ${totalCal} / ${calGoal} kcal (${calPercent}%)` : `📅 ${todayStr} 飲食總結：已攝取 ${totalCal} / ${calGoal} kcal (${calPercent}%)`),
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
            margin: "xs",
            wrap: true
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          // === 營養統計格（條件：是否開啟碳水追蹤）===
          ...(showCarbsFat ? [
            // Row 1：熱量 + 水分（各半寬度，數字大氣好讀）
            {
              type: "box", layout: "horizontal", spacing: "xs",
              contents: [
                {
                  type: "box", layout: "vertical",
                  backgroundColor: isOverCal ? "#FFE4E6" : "#FFF1F2", borderColor: isOverCal ? "#BE123C" : "#000000", borderWidth: "2.5px",
                  cornerRadius: "14px", paddingAll: "8px", flex: 1, alignItems: "center",
                  contents: [
                    { type: "text", text: isEn ? (isOverCal ? "⚠️ Cal" : "🔥 Cal") : (isOverCal ? "⚠️ 熱量" : "🔥 熱量"), size: "xxs", color: isOverCal ? "#BE123C" : "#E11D48", weight: "bold", wrap: false },
                    { type: "text", text: `${totalCal}`, size: "md", weight: "bold", color: isOverCal ? "#BE123C" : "#000000", margin: "xs" },
                    { type: "text", text: `kcal (${calPercent}%)`, size: "xxs", color: isOverCal ? "#9F1239" : "#881337", weight: "bold", wrap: false }
                  ]
                },
                {
                  type: "box", layout: "vertical",
                  backgroundColor: "#ECFEFF", borderColor: "#000000", borderWidth: "2.5px",
                  cornerRadius: "14px", paddingAll: "8px", flex: 1, alignItems: "center",
                  contents: [
                    { type: "text", text: isEn ? "💧 Water" : "💧 水分", size: "xxs", color: "#0891B2", weight: "bold", wrap: false },
                    { type: "text", text: `${totalWater}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                    { type: "text", text: `ml / ${watGoal}`, size: "xxs", color: "#164E63", weight: "bold", wrap: false }
                  ]
                }
              ]
            },
            // Row 2：蛋白質 + 碳水 + 脂肪（各三分之一，精準不折行）
            {
              type: "box", layout: "horizontal", spacing: "xs", margin: "xs",
              contents: [
                {
                  type: "box", layout: "vertical",
                  backgroundColor: "#EFF6FF", borderColor: "#000000", borderWidth: "2px",
                  cornerRadius: "10px", paddingAll: "6px", flex: 1, alignItems: "center",
                  contents: [
                    { type: "text", text: isEn ? "🥩 Pro" : "🥩 蛋白質", size: "xxs", color: "#2563EB", weight: "bold", wrap: false },
                    { type: "text", text: `${totalPro}g`, size: "sm", weight: "bold", color: "#000000", margin: "xs" },
                    { type: "text", text: `/${proGoal}g`, size: "xxs", color: "#71717A", weight: "bold" }
                  ]
                },
                {
                  type: "box", layout: "vertical",
                  backgroundColor: "#FFF7ED", borderColor: "#000000", borderWidth: "2px",
                  cornerRadius: "10px", paddingAll: "6px", flex: 1, alignItems: "center",
                  contents: [
                    { type: "text", text: isEn ? "🍞 Carbs" : "🍞 碳水", size: "xxs", color: "#C2410C", weight: "bold", wrap: false },
                    { type: "text", text: `${totalCarbs}g`, size: "sm", weight: "bold", color: "#000000", margin: "xs" },
                    { type: "text", text: `/${carbsGoal}g`, size: "xxs", color: "#92400E", weight: "bold" }
                  ]
                },
                {
                  type: "box", layout: "vertical",
                  backgroundColor: "#F0FDF4", borderColor: "#000000", borderWidth: "2px",
                  cornerRadius: "10px", paddingAll: "6px", flex: 1, alignItems: "center",
                  contents: [
                    { type: "text", text: isEn ? "🥑 Fat" : "🥑 脂肪", size: "xxs", color: "#166534", weight: "bold", wrap: false },
                    { type: "text", text: `${totalFat}g`, size: "sm", weight: "bold", color: "#000000", margin: "xs" },
                    { type: "text", text: `/${fatGoal}g`, size: "xxs", color: "#14532D", weight: "bold" }
                  ]
                }
              ]
            }
          ] : [
            // 未開啟：原始單行三欄（熱量、蛋白質、水分）
            {
              type: "box", layout: "horizontal", spacing: "xs",
              contents: [
                {
                  type: "box", layout: "vertical",
                  backgroundColor: isOverCal ? "#FFE4E6" : "#FFF1F2", borderColor: isOverCal ? "#BE123C" : "#000000", borderWidth: "2.5px",
                  cornerRadius: "14px", paddingAll: "8px", flex: 1, alignItems: "center",
                  contents: [
                    { type: "text", text: isEn ? (isOverCal ? "⚠️ Calories" : "🔥 Calories") : (isOverCal ? "⚠️ 熱量" : "🔥 熱量"), size: "xxs", color: isOverCal ? "#BE123C" : "#E11D48", weight: "bold", wrap: false },
                    { type: "text", text: `${totalCal}`, size: "md", weight: "bold", color: isOverCal ? "#BE123C" : "#000000", margin: "xs" },
                    { type: "text", text: `kcal (${calPercent}%)`, size: "xxs", color: isOverCal ? "#9F1239" : "#881337", weight: "bold" }
                  ]
                },
                {
                  type: "box", layout: "vertical",
                  backgroundColor: "#EFF6FF", borderColor: "#000000", borderWidth: "2.5px",
                  cornerRadius: "14px", paddingAll: "8px", flex: 1, alignItems: "center",
                  contents: [
                    { type: "text", text: isEn ? "🥩 Protein" : "🥩 蛋白質", size: "xxs", color: "#2563EB", weight: "bold", wrap: false },
                    { type: "text", text: `${totalPro}g`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                    { type: "text", text: `/ ${proGoal}g`, size: "xxs", color: "#71717A", weight: "bold" }
                  ]
                },
                {
                  type: "box", layout: "vertical",
                  backgroundColor: "#ECFEFF", borderColor: "#000000", borderWidth: "2.5px",
                  cornerRadius: "14px", paddingAll: "8px", flex: 1, alignItems: "center",
                  contents: [
                    { type: "text", text: isEn ? "💧 Water" : "💧 水分", size: "xxs", color: "#0891B2", weight: "bold", wrap: false },
                    { type: "text", text: `${totalWater}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                    { type: "text", text: "ml", size: "xxs", color: "#164E63", weight: "bold" }
                  ]
                }
              ]
            }
          ]),
          // 餐點列表框
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
          // 教練提示框
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
          createNeoFlexButton({
            label: isEn ? (isToday ? "📋 Manage Today's Logs" : `📋 Manage ${todayStr} Logs`) : (isToday ? "📋 管理今日紀錄" : `📋 管理 ${todayStr} 紀錄`),
            variant: "accent",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? (isToday ? "📋 Manage Today's Logs" : `📋 Manage ${todayStr} Logs`) : (isToday ? "📋 管理今日紀錄" : `📋 管理 ${todayStr} 紀錄`),
              data: JSON.stringify({ action: 'manageMeals', date: todayStr }),
              displayText: isEn ? (isToday ? "Manage Today's Logs" : `Manage ${todayStr} Logs`) : (isToday ? "管理今日紀錄" : `管理 ${todayStr} 紀錄`)
            }
          }),
          ...(!isToday ? [
            createNeoFlexButton({
              label: isEn ? `➕ Log Meal for ${todayStr}` : `➕ 補記 ${todayStr} 餐點`,
              variant: "green",
              size: "md",
              action: {
                type: "postback",
                label: isEn ? `➕ Log Meal` : `➕ 補記餐點`,
                data: JSON.stringify({ action: 'fillAddMeal', date: todayStr }),
                inputOption: "openKeyboard",
                fillInText: `補記 ${todayStr} `
              }
            })
          ] : []),
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              createNeoFlexButton({
                label: isEn ? "📅 Select Date" : "📅 查日期",
                variant: "white",
                size: "md",
                flex: 1,
                action: {
                  type: "datetimepicker",
                  label: isEn ? "Select Date" : "📅 查日期",
                  data: JSON.stringify({ action: 'pickDate' }),
                  mode: "date",
                  initial: todayStr,
                  max: getTodayDateString()
                }
              }),
              createNeoFlexButton({
                label: isEn ? "📊 7-Day Trend" : "📊 7 日週報",
                variant: "yellowLight",
                size: "md",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "7-Day Trend" : "📊 7 日週報",
                  data: JSON.stringify({ action: 'viewWeeklyTrends' }),
                  displayText: isEn ? "7-Day Trend" : "週報"
                }
              })
            ]
          },
          // 碳水追蹤切換按鈕
          createNeoFlexButton({
            label: showCarbsFat
              ? (isEn ? "🥑 Hide Carbs & Fat" : "🥑 關閉碳水脂肪顯示")
              : (isEn ? "🍞 Track Carbs & Fat" : "🍞 開啟碳水與脂肪追蹤"),
            variant: showCarbsFat ? "secondary" : "cyanLight",
            size: "md",
            action: {
              type: "postback",
              label: showCarbsFat ? (isEn ? "Hide Carbs & Fat" : "關閉碳水脂肪") : (isEn ? "Track Carbs & Fat" : "開啟碳水追蹤"),
              data: JSON.stringify({ action: 'toggleCarbsFat' }),
              displayText: showCarbsFat ? (isEn ? "🥑 Carbs & Fat tracking OFF" : "🥑 關閉碳水脂肪追蹤") : (isEn ? "🍞 Carbs & Fat tracking ON" : "🍞 開啟碳水與脂肪追蹤")
            }
          })
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

  const currentHeight = info.height || 170;
  const currentWeight = info.weight || 65;
  const currentGender = info.gender || (isEn ? "male" : "男");
  const currentGoalType = info.goal_type || (isEn ? "fat loss" : "減脂");

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
            margin: "xs",
            wrap: true
          },
          {
            type: "text",
            text: info.summary || (isEn ? "Scientific Nutrition Plan" : "客製化科學營養規劃"),
            color: "#A1A1AA",
            size: "xxs",
            margin: "xs",
            wrap: true
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
                  { type: "text", text: isEn ? "🔥 Daily Cal" : "🔥 每日熱量", size: "xxs", color: "#E11D48", weight: "bold", wrap: true },
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
                  { type: "text", text: isEn ? "🥩 Protein" : "🥩 蛋白質", size: "xxs", color: "#2563EB", weight: "bold", wrap: true },
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
                  { type: "text", text: isEn ? "💧 Daily Water" : "💧 每日水分", size: "xxs", color: "#0891B2", weight: "bold", wrap: true },
                  { type: "text", text: `${wat}`, size: "md", weight: "bold", color: "#000000", margin: "xs" },
                  { type: "text", text: isEn ? "ml / day" : "ml / 天", size: "xxs", color: "#164E63", weight: "bold" }
                ]
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F8FAFC",
            borderColor: "#E2E8F0",
            borderWidth: "1px",
            cornerRadius: "10px",
            paddingAll: "10px",
            spacing: "xs",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: isEn ? "🔬 Calorie Definition" : "🔬 熱量科學計算依據", weight: "bold", size: "xs", color: "#0F172A", flex: 1 },
                  ...(info.activity_level ? [{ type: "text", text: `${info.activity_level}`, size: "xxs", color: "#64748B", align: "end", wrap: true }] : [])
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "xs",
                margin: "xs",
                contents: [
                  {
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#FFFFFF",
                    cornerRadius: "6px",
                    paddingAll: "6px",
                    flex: 1,
                    alignItems: "center",
                    contents: [
                      { type: "text", text: isEn ? "🧬 Basal BMR" : "🧬 基礎代謝", size: "xxs", color: "#64748B" },
                      { type: "text", text: `${info.bmr || '-'} kcal`, size: "xs", weight: "bold", color: "#0F172A" }
                    ]
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#FFFFFF",
                    cornerRadius: "6px",
                    paddingAll: "6px",
                    flex: 1,
                    alignItems: "center",
                    contents: [
                      { type: "text", text: isEn ? "⚡ TDEE Burn" : "⚡ 每日總消耗", size: "xxs", color: "#64748B" },
                      { type: "text", text: `${info.tdee || '-'} kcal`, size: "xs", weight: "bold", color: "#0F172A" }
                    ]
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#FFFFFF",
                    cornerRadius: "6px",
                    paddingAll: "6px",
                    flex: 1,
                    alignItems: "center",
                    contents: [
                      { type: "text", text: isEn ? "⚖️ Deficit/Gain" : "⚖️ 赤字/盈餘", size: "xxs", color: "#64748B" },
                      { type: "text", text: `${info.deficit_or_surplus ? info.deficit_or_surplus.replace(/每日熱量/g, '') : (info.tdee ? `${cal - info.tdee} kcal` : '-')}`, size: "xs", weight: "bold", color: "#0F172A", wrap: true }
                    ]
                  }
                ]
              },
              ...(info.calorie_definition ? [{
                type: "text",
                text: info.calorie_definition,
                size: "xxs",
                color: "#475569",
                wrap: true,
                margin: "xs"
              }] : [])
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#ECFDF5",
            borderColor: "#A7F3D0",
            borderWidth: "1px",
            cornerRadius: "10px",
            paddingAll: "10px",
            contents: [
              {
                type: "text",
                text: isEn ? "✨ Expected Results:" : "✨ 按照目標這樣吃的預期效果：",
                weight: "bold",
                size: "xs",
                color: "#065F46",
                wrap: true
              },
              {
                type: "text",
                text: info.expected_effect || (isEn 
                  ? "Consistently maintaining this energy balance with optimal protein preserves muscle while reaching your body goal safely!" 
                  : (info.goal_type === '增肌'
                    ? "每日適度熱量盈餘配合高蛋白與阻力訓練，每週預計可穩健增加 0.2~0.3 kg 精實肌肉，避免過多體脂堆積！"
                    : (info.goal_type === '維持體態'
                      ? "熱量達到動態平衡，體重平穩不波動，能長期維持好體態與健康新陳代謝！"
                      : "每累積 7,700 kcal 赤字可消耗 1kg 純脂。依此目標規劃，預計每週穩定減脂約 0.4~0.5 kg，同時充足蛋白質能留住肌肉線條！"))),
                size: "xxs",
                color: "#047857",
                wrap: true,
                margin: "xs"
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F1F5F9",
            cornerRadius: "10px",
            paddingAll: "8px",
            spacing: "xs",
            contents: [
              {
                type: "text",
                text: isEn ? "🏃 Check Your Activity Level (Affects TDEE ±500 kcal):" : "🏃 生活活動量是否相符？（影響 TDEE 達 500+ kcal）",
                size: "xxs",
                weight: "bold",
                color: "#334155",
                wrap: true
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "xs",
                contents: [
                  createNeoFlexButton({
                    label: isEn ? "Sed\n1.2" : "久坐\n1.2",
                    variant: "white",
                    size: "sm",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: isEn ? "Sed 1.2" : "久坐 1.2",
                      data: JSON.stringify({ action: 'fillGoal' }),
                      inputOption: "openKeyboard",
                      fillInText: isEn 
                        ? `Set goal ${currentHeight}cm ${currentWeight}kg ${currentGender} sedentary ${currentGoalType}`
                        : `改目標 ${currentHeight}cm ${currentWeight}kg ${currentGender} 久坐少動 ${currentGoalType}`
                    }
                  }),
                  createNeoFlexButton({
                    label: isEn ? "Light\n1.38" : "輕度\n1.38",
                    variant: "white",
                    size: "sm",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: isEn ? "Light 1.38" : "輕度 1.38",
                      data: JSON.stringify({ action: 'fillGoal' }),
                      inputOption: "openKeyboard",
                      fillInText: isEn 
                        ? `Set goal ${currentHeight}cm ${currentWeight}kg ${currentGender} light activity ${currentGoalType}`
                        : `改目標 ${currentHeight}cm ${currentWeight}kg ${currentGender} 輕度活動 ${currentGoalType}`
                    }
                  }),
                  createNeoFlexButton({
                    label: isEn ? "Mod\n1.55" : "中度\n1.55",
                    variant: "white",
                    size: "sm",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: isEn ? "Mod 1.55" : "中度 1.55",
                      data: JSON.stringify({ action: 'fillGoal' }),
                      inputOption: "openKeyboard",
                      fillInText: isEn 
                        ? `Set goal ${currentHeight}cm ${currentWeight}kg ${currentGender} moderate exercise ${currentGoalType}`
                        : `改目標 ${currentHeight}cm ${currentWeight}kg ${currentGender} 中度運動 ${currentGoalType}`
                    }
                  }),
                  createNeoFlexButton({
                    label: isEn ? "Heavy\n1.73" : "高強\n1.73",
                    variant: "white",
                    size: "sm",
                    flex: 1,
                    action: {
                      type: "postback",
                      label: isEn ? "Heavy 1.73" : "高強 1.73",
                      data: JSON.stringify({ action: 'fillGoal' }),
                      inputOption: "openKeyboard",
                      fillInText: isEn 
                        ? `Set goal ${currentHeight}cm ${currentWeight}kg ${currentGender} heavy exercise ${currentGoalType}`
                        : `改目標 ${currentHeight}cm ${currentWeight}kg ${currentGender} 高強度運動 ${currentGoalType}`
                    }
                  })
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
          createNeoFlexButton({
            label: isEn ? "📱 Open App to View Progress" : "📱 開啟 App 查看目標進度",
            variant: "accent",
            size: "md",
            action: {
              type: "uri",
              label: isEn ? "📱 Open App to View Progress" : "📱 開啟 App 查看目標進度",
              uri: appTargetUrl
            }
          }),
          createNeoFlexButton({
            label: isEn ? "✏️ Custom Target" : "✏️ 填入輸入框自訂調整",
            variant: "white",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "✏️ Custom Target" : "✏️ 填入輸入框自訂調整",
              data: JSON.stringify({ action: 'fillGoal' }),
              inputOption: "openKeyboard",
              fillInText: isEn ? `Set goal ${cal}cal ${pro}pro ${wat}water` : `改目標 ${cal}卡 ${pro}蛋 ${wat}水`
            }
          })
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
      ? "🎯 Smart Diet Goals: Tell coach your height, weight, activity & goals!"
      : "🎯 AI 智能體態目標推薦導引：告訴教練身材、活動量與目標，自動規劃！",
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
            margin: "xs",
            wrap: true
          },
          {
            type: "text",
            text: isEn ? "No need to calculate calories! AI plans it for you" : "不需要自己算熱量！告訴教練身材與活動量，AI 自動規劃",
            color: "#A1A1AA",
            size: "xxs",
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
            type: "box",
            layout: "vertical",
            backgroundColor: "#FEF9C3",
            cornerRadius: "10px",
            paddingAll: "10px",
            borderColor: "#000000",
            borderWidth: "1px",
            contents: [
              {
                type: "text",
                text: isEn ? "💡 What is Smart Goal Recommendation?" : "💡 什麼是智能推薦？",
                weight: "bold",
                size: "xs",
                color: "#854D0E",
                wrap: true
              },
              {
                type: "text",
                text: isEn 
                  ? "Tell Panda Coach your height, weight, gender, activity level & goal. AI calculates your BMR/TDEE and plans the perfect calorie balance, protein, and water targets!"
                  : "只要告訴熊貓教練您的【身高、體重、性別、活動量與期望目標】，AI 將依據醫學 BMR/TDEE 公式，自動規劃每日熱量赤字/盈餘、蛋白質與飲水建議！",
                size: "xxs",
                color: "#713F12",
                wrap: true,
                margin: "xs"
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F1F5F9",
            cornerRadius: "10px",
            paddingAll: "10px",
            borderColor: "#CBD5E1",
            borderWidth: "1px",
            contents: [
              {
                type: "text",
                text: isEn ? "❓ Why Activity Level Matters?" : "❓ 為什麼活動量至關重要？",
                weight: "bold",
                size: "xs",
                color: "#0F172A",
                wrap: true
              },
              {
                type: "text",
                text: isEn 
                  ? "BMR is your baseline burn at rest. TDEE = BMR × Activity Factor. A sedentary office worker vs. an active lifter can differ by 500-800+ kcal daily! Specifying activity ensures accurate targets."
                  : "BMR 是整天躺著不動的消耗，而 TDEE = BMR × 活動係數。相同身材的上班族 (久坐 1.2) 與規律重訓者 (中度 1.55)，每日消耗可差 500~800 kcal！如果不考慮活動量，減脂容易餓垮掉肌，增肌容易吃不夠。",
                size: "xxs",
                color: "#334155",
                wrap: true,
                margin: "xs"
              },
              {
                type: "text",
                text: isEn 
                  ? "🏃 4 Activity Levels:\n• Sedentary (1.2): Desk job, little exercise\n• Light (1.375): 1-3 days light exercise/walk\n• Moderate (1.55): 3-5 days workout/training\n• Heavy (1.725): 6-7 days intense/labor"
                  : "🏃 4 大活動量對照：\n• 🪑 久坐少動 (×1.2)：整天坐著辦公、無規律運動\n• 🚶 輕度活動 (×1.375)：每週運動1-3天、常走動\n• 🏋️ 中度運動 (×1.55)：每週運動重訓3-5天\n• 🔥 高強運動 (×1.725)：每週運動6-7天或體力勞工",
                size: "xxs",
                color: "#475569",
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
                  fillInText: isEn ? "Set goal 160cm 52kg female light activity fat loss" : "改目標 160cm 52kg 女 輕度活動 減脂"
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
                  fillInText: isEn ? "Set goal 175cm 75kg male light activity fat loss" : "改目標 175cm 75kg 男 輕度活動 減脂"
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
                  fillInText: isEn ? "Set goal 175cm 68kg male moderate exercise muscle gain" : "改目標 175cm 68kg 男 中度運動 增肌"
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
                  fillInText: isEn ? "Set goal 165cm 55kg female sedentary maintenance" : "改目標 165cm 55kg 女 久坐少動 維持體態"
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
          createNeoFlexButton({
            label: isEn ? "⚙️ Open App for Full Settings" : "⚙️ 開啟 App 完整目標設定",
            variant: "accent",
            size: "md",
            action: {
              type: "uri",
              label: isEn ? "⚙️ Open App for Full Settings" : "⚙️ 開啟 App 完整目標設定",
              uri: appTargetUrl
            }
          })
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
            margin: "xs",
            wrap: true
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
                  { type: "text", text: isEn ? "🔥 Daily Cal" : "🔥 每日熱量", size: "xxs", color: "#E11D48", weight: "bold", wrap: true },
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
                  { type: "text", text: isEn ? "🥩 Protein" : "🥩 蛋白質", size: "xxs", color: "#2563EB", weight: "bold", wrap: true },
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
                  { type: "text", text: isEn ? "💧 Daily Water" : "💧 每日水分", size: "xxs", color: "#0891B2", weight: "bold", wrap: true },
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
          createNeoFlexButton({
            label: isEn ? "⚙️ Open App for Full Settings" : "⚙️ 開啟 App 完整目標設定",
            variant: "accent",
            size: "md",
            action: {
              type: "uri",
              label: isEn ? "⚙️ Open App for Full Settings" : "⚙️ 開啟 App 完整目標設定",
              uri: appTargetUrl
            }
          }),
          createNeoFlexButton({
            label: isEn ? "🪄 Smart Goal Recommendations" : "🪄 依身材智能推薦目標",
            variant: "white",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "🪄 Smart Goal Recommendations" : "🪄 依身材智能推薦目標",
              data: JSON.stringify({ action: 'goalGuide' }),
              displayText: isEn ? "Smart Goals" : "設定目標"
            }
          })
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
            margin: "xs",
            wrap: true
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
                  { type: "text", text: isEn ? "🔥 7-Day Avg Cal" : "🔥 7 日平均熱量", size: "xxs", color: "#E11D48", weight: "bold", wrap: true },
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
                  { type: "text", text: isEn ? "🥩 7-Day Avg Pro" : "🥩 7 日平均蛋白質", size: "xxs", color: "#2563EB", weight: "bold", wrap: true },
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
          createNeoFlexButton({
            label: isEn ? "📊 View Today's Summary" : "📊 查看今日總結",
            variant: "black",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "📊 View Today's Summary" : "📊 查看今日總結",
              data: JSON.stringify({ action: 'save' }),
              displayText: isEn ? "Daily Summary" : "今日總結"
            }
          })
        ]
      }
    }
  };
}

// ========================================================
// ⚖️ 4.1 體重記錄確認卡片 (Weight Confirm Flex)
// ========================================================

function generateWeightConfirmFlex(userId, weightData, liffId, userGistId, props, lang) {
  if (!props) props = PropertiesService.getScriptProperties();
  const userLang = lang || getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';
  const weight = weightData.weight || 0;
  const diff = weightData.diff !== undefined ? weightData.diff : 0;
  const prevWeight = weightData.prevWeight;
  const webUrl = liffId ? `https://liff.line.me/${liffId}?tab=weight` : 'https://winnie-lin.space/daily-diet/?tab=weight';

  let diffBadgeText = isEn ? "✨ Initial Record" : "✨ 初始記錄";
  let diffColor = "#2563EB";
  let diffBg = "#EFF6FF";
  if (prevWeight !== null && prevWeight !== undefined) {
    if (diff < 0) {
      diffBadgeText = isEn ? `📉 Down ${Math.abs(diff)} kg` : `📉 較前次 ↓ ${Math.abs(diff)} kg`;
      diffColor = "#059669";
      diffBg = "#ECFDF5";
    } else if (diff > 0) {
      diffBadgeText = isEn ? `📈 Up ${diff} kg` : `📈 較前次 ↑ ${diff} kg`;
      diffColor = "#DC2626";
      diffBg = "#FEF2F2";
    } else {
      diffBadgeText = isEn ? "⚖️ Maintained" : "⚖️ 與前次持平";
      diffColor = "#4B5563";
      diffBg = "#F3F4F6";
    }
  }

  return {
    type: "flex",
    altText: isEn ? `⚖️ Weight Logged: ${weight} kg` : `⚖️ 體重記錄成功：${weight} kg`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "horizontal",
        backgroundColor: "#10B981",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: isEn ? "⚖️ Weight Tracker" : "⚖️ 體重打卡記錄",
            color: "#FFFFFF",
            weight: "bold",
            size: "md"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        contents: [
          {
            type: "box",
            layout: "vertical",
            alignItems: "center",
            spacing: "xs",
            contents: [
              {
                type: "text",
                text: `${weight}`,
                size: "4xl",
                weight: "bold",
                color: "#000000"
              },
              {
                type: "text",
                text: "kg (公斤)",
                size: "xs",
                color: "#71717A",
                weight: "bold"
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            justifyContent: "center",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                backgroundColor: diffBg,
                cornerRadius: "8px",
                paddingStart: "10px",
                paddingEnd: "10px",
                paddingTop: "4px",
                paddingBottom: "4px",
                contents: [
                  {
                    type: "text",
                    text: diffBadgeText,
                    size: "xs",
                    color: diffColor,
                    weight: "bold"
                  }
                ]
              }
            ]
          },
          {
            type: "text",
            text: isEn 
              ? "🐼 Panda Coach: Regular tracking keeps your metabolism transparent! Keep up the great work!"
              : "🐼 熊貓教練：「穩定追蹤體重是控制體態最關鍵的習慣！早晨空腹測量最準確喔 ✨」",
            size: "xxs",
            color: "#52525B",
            wrap: true,
            margin: "sm"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          createNeoFlexButton({
            label: isEn ? "📈 View Weight Trend" : "📈 查看體重與體態曲線",
            variant: "accent",
            size: "md",
            action: {
              type: "message",
              label: isEn ? "Weight Trend" : "體重趨勢",
              text: isEn ? "weight chart" : "體重紀錄"
            }
          }),
          createNeoFlexButton({
            label: isEn ? "💩 Log Bowel Movement" : "💩 順便記排便打卡",
            variant: "white",
            size: "md",
            action: {
              type: "message",
              label: isEn ? "Log Poop" : "記排便",
              text: "💩"
            }
          }),
          createNeoFlexButton({
            label: isEn ? "📱 Open Web Interactive Chart" : "📱 開啟 Web 互動圖表",
            variant: "black",
            size: "md",
            action: {
              type: "uri",
              label: isEn ? "Web Chart" : "Web 圖表",
              uri: webUrl
            }
          })
        ]
      }
    }
  };
}

// ========================================================
// 💩 4.2 排便打卡確認卡片 (Poop Confirm Flex)
// ========================================================

function generatePoopConfirmFlex(userId, poopData, liffId, userGistId, props, lang) {
  if (!props) props = PropertiesService.getScriptProperties();
  const userLang = lang || getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';
  const elapsedHours = poopData.elapsedHours;
  const webUrl = liffId ? `https://liff.line.me/${liffId}?tab=weight` : 'https://winnie-lin.space/daily-diet/?tab=weight';

  let intervalText = isEn ? "✨ First Log Recorded Today" : "✨ 今日排便打卡成功！";
  if (elapsedHours !== null && elapsedHours !== undefined) {
    intervalText = isEn 
      ? `⏱️ Approx. ${elapsedHours} hrs since last log` 
      : `⏱️ 距離前次排便約 ${elapsedHours} 小時`;
  }

  const persona = getUserPersona(userId, props, userGistId);
  let coachQuote = "🐼「腸道通順代表腸道菌叢與代謝健康運作中，棒棒的！✨」";
  if (isEn) {
    coachQuote = "🐼 \"Great gut motility means a healthy microbiome and high metabolic rate! Keep drinking water! ✨\"";
  } else if (persona === 'tsundere') {
    coachQuote = "🐼「哼！排便通順是基本的好嗎！今天水要給我喝足、蔬菜多吃點，保持下去！✨」";
  } else if (persona === 'hardcore') {
    coachQuote = "🐼「體內代謝障礙排除！戰鬥循環持續全開，多喝溫水保持強健體態！🔥」";
  }

  return {
    type: "flex",
    altText: isEn ? "💩 Bowel Movement Logged!" : "💩 排便打卡成功！",
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "horizontal",
        backgroundColor: "#FEF3C7",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: isEn ? "💩 Gut Health Tracker" : "💩 腸道排便打卡",
            color: "#92400E",
            weight: "bold",
            size: "md"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        contents: [
          {
            type: "box",
            layout: "vertical",
            alignItems: "center",
            spacing: "xs",
            contents: [
              {
                type: "text",
                text: "💩",
                size: "4xl"
              },
              {
                type: "text",
                text: isEn ? "Logged Successfully!" : "順暢打卡成功！",
                size: "md",
                weight: "bold",
                color: "#000000"
              },
              {
                type: "text",
                text: intervalText,
                size: "xs",
                color: "#059669",
                weight: "bold"
              }
            ]
          },
          {
            type: "text",
            text: coachQuote,
            size: "xxs",
            color: "#52525B",
            wrap: true,
            margin: "sm"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          createNeoFlexButton({
            label: isEn ? "📊 View Health Chart" : "📊 查看體態紀錄與趨勢",
            variant: "accent",
            size: "md",
            action: {
              type: "message",
              label: isEn ? "Trend Chart" : "體態紀錄",
              text: isEn ? "weight chart" : "體重紀錄"
            }
          }),
          createNeoFlexButton({
            label: isEn ? "⚖️ Log Weight" : "⚖️ 順便記錄體重",
            variant: "white",
            size: "md",
            action: {
              type: "message",
              label: isEn ? "Log Weight" : "記體重",
              text: isEn ? "weight " : "體重 "
            }
          }),
          createNeoFlexButton({
            label: isEn ? "📱 Open Web Interactive Chart" : "📱 開啟 Web 互動圖表",
            variant: "black",
            size: "md",
            action: {
              type: "uri",
              label: isEn ? "Web Chart" : "Web 圖表",
              uri: webUrl
            }
          })
        ]
      }
    }
  };
}

// ========================================================
// 📈 4.3 體重與排便雙軌趨勢圖表卡片 (Weight & Poop Chart Flex)
// ========================================================

function generateWeightPoopChartFlex(userId, liffId, userGistId, props, lang) {
  if (!props) props = PropertiesService.getScriptProperties();
  const userLang = lang || getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';
  const webUrl = liffId ? `https://liff.line.me/${liffId}?tab=weight` : 'https://winnie-lin.space/daily-diet/?tab=weight';

  const weightHistory = getUserWeightHistory(userId, 14, props, userGistId);
  const poopHistory = getUserPoopHistory(userId, 14, props, userGistId);

  // 產生近 10 天日期陣列 (由舊至新)
  const daysCount = 10;
  const dateList = [];
  const now = new Date();
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dateList.push(getTodayDateString(d));
  }

  const weightMap = {};
  weightHistory.forEach(w => {
    if (w.date) weightMap[w.date] = w.weight;
  });

  const poopDates = new Set();
  poopHistory.forEach(p => {
    if (p.date) poopDates.add(p.date);
    else if (p.timestamp) poopDates.add(getTodayDateString(new Date(p.timestamp)));
  });

  const labels = [];
  const chartWeights = [];
  let latestWeight = null;
  let firstWeight = null;

  dateList.forEach(d => {
    labels.push(d.slice(5).replace('-', '/'));
    const w = weightMap[d];
    if (w !== undefined && w !== null && Number(w) > 0) {
      const num = Number(w);
      chartWeights.push(num);
      if (firstWeight === null) firstWeight = num;
      latestWeight = num;
    } else {
      chartWeights.push(null);
    }
  });

  // 若目前沒有記錄到任何體重，回傳溫馨引導卡片
  if (latestWeight === null) {
    return {
      type: "flex",
      altText: isEn ? "⚖️ No weight logs yet" : "⚖️ 尚未有體重記錄",
      contents: {
        type: "bubble",
        size: "kilo",
        header: {
          type: "box",
          layout: "horizontal",
          backgroundColor: "#FDE047",
          paddingAll: "16px",
          contents: [
            {
              type: "text",
              text: isEn ? "⚖️ Weight & Gut Tracker" : "⚖️ 體重與排便健康追蹤",
              weight: "bold",
              color: "#000000",
              size: "md"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "18px",
          contents: [
            {
              type: "text",
              text: isEn 
                ? "You haven't logged any weight yet!\nType \"weight 65\" or tap below to start tracking your body transformation 🐼✨"
                : "您目前尚未記錄過體重喔！\n直接輸入「體重 65」或點擊下方按鈕，即可開始繪製您的體態曲線 🐼✨",
              size: "sm",
              wrap: true,
              color: "#3F3F46"
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "14px",
          contents: [
            createNeoFlexButton({
              label: isEn ? "⚖️ Log Weight Now" : "⚖️ 馬下記錄體重",
              variant: "accent",
              size: "md",
              action: {
                type: "message",
                label: isEn ? "Log Weight" : "記體重",
                text: isEn ? "weight " : "體重 "
              }
            }),
            createNeoFlexButton({
              label: isEn ? "💩 Log Bowel Movement" : "💩 記錄排便",
              variant: "white",
              size: "md",
              action: {
                type: "message",
                label: isEn ? "Log Poop" : "記排便",
                text: "💩"
              }
            }),
            createNeoFlexButton({
              label: isEn ? "📱 Open Web Interactive Chart" : "📱 開啟 Web 互動圖表",
              variant: "black",
              size: "md",
              action: {
                type: "uri",
                label: isEn ? "Web Chart" : "Web 圖表",
                uri: webUrl
              }
            })
          ]
        }
      }
    };
  }

  // 計算體重淨增減
  const weightChange = (firstWeight !== null && latestWeight !== null) 
    ? Number((latestWeight - firstWeight).toFixed(1)) 
    : 0;

  // 計算近期排便總次數
  const recentPoopCount = poopHistory.length;

  // 構建 QuickChart API 圖表 URL
  const chartConfig = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: isEn ? 'Weight (kg)' : '體重 (kg)',
          data: chartWeights,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#000000',
          pointBorderWidth: 1.5,
          spanGaps: true
        }
      ]
    },
    options: {
      legend: { display: false },
      title: {
        display: true,
        text: isEn ? '⚖️ Weight Trend (Past 10 Days)' : '⚖️ 近 10 日體重走勢 (kg)',
        fontSize: 13,
        fontColor: '#18181B'
      },
      layout: {
        padding: { left: 10, right: 15, top: 10, bottom: 5 }
      },
      scales: {
        yAxes: [{
          ticks: {
            fontColor: '#71717A',
            fontSize: 11,
            precision: 1
          },
          gridLines: { color: '#F4F4F5' }
        }],
        xAxes: [{
          ticks: {
            fontColor: '#71717A',
            fontSize: 10
          },
          gridLines: { display: false }
        }]
      }
    }
  };

  const quickChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=500&h=260&bkg=%23FFFFFF&devicePixelRatio=2`;

  // 構建近 7 日排便標記行
  const recent7Days = dateList.slice(-7);
  const poopIndicatorBoxes = recent7Days.map(d => {
    const hasPoop = poopDates.has(d);
    const label = d.slice(5).replace('-', '/');
    return {
      type: "box",
      layout: "vertical",
      alignItems: "center",
      spacing: "none",
      flex: 1,
      contents: [
        {
          type: "text",
          text: hasPoop ? "💩" : "·",
          size: hasPoop ? "md" : "xl",
          color: hasPoop ? "#000000" : "#D4D4D8",
          align: "center"
        },
        {
          type: "text",
          text: label,
          size: "xxs",
          color: "#71717A",
          align: "center"
        }
      ]
    };
  });

  let changeColor = "#059669";
  let changeText = `📉 變化: ${weightChange} kg`;
  if (weightChange > 0) {
    changeColor = "#DC2626";
    changeText = `📈 變化: +${weightChange} kg`;
  } else if (weightChange === 0) {
    changeColor = "#4B5563";
    changeText = `⚖️ 變化: 持平`;
  }

  return {
    type: "flex",
    altText: isEn ? `📈 Weight Trend: ${latestWeight} kg` : `📈 體重與排便紀錄：最新 ${latestWeight} kg`,
    contents: {
      type: "bubble",
      size: "kilo",
      hero: {
        type: "image",
        url: quickChartUrl,
        size: "full",
        aspectRatio: "20:11",
        aspectMode: "cover"
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
                backgroundColor: "#ECFDF5",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isEn ? "Latest Weight" : "⚖️ 最新體重", size: "xxs", color: "#059669", weight: "bold" },
                  { type: "text", text: `${latestWeight} kg`, size: "sm", weight: "bold", color: "#000000", margin: "xs" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FEF3C7",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isEn ? "Poop Count" : "💩 近期排便", size: "xxs", color: "#92400E", weight: "bold" },
                  { type: "text", text: isEn ? `${recentPoopCount} times` : `${recentPoopCount} 次`, size: "sm", weight: "bold", color: "#000000", margin: "xs" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#F4F4F5",
                cornerRadius: "10px",
                paddingAll: "8px",
                flex: 1,
                alignItems: "center",
                contents: [
                  { type: "text", text: isEn ? "Trend" : "走勢變化", size: "xxs", color: "#52525B", weight: "bold" },
                  { type: "text", text: changeText, size: "xxs", weight: "bold", color: changeColor, margin: "xs", wrap: true }
                ]
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FAFAFA",
            cornerRadius: "10px",
            paddingAll: "8px",
            borderColor: "#E4E4E7",
            borderWidth: "1px",
            spacing: "xs",
            contents: [
              {
                type: "text",
                text: isEn ? "💩 Past 7 Days Bowel Movement:" : "💩 近 7 日排便標記：",
                size: "xxs",
                color: "#71717A",
                weight: "bold"
              },
              {
                type: "box",
                layout: "horizontal",
                contents: poopIndicatorBoxes
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
          createNeoFlexButton({
            label: isEn ? "📱 Open Web Interactive Chart" : "📱 開啟 Web 完整放大圖表",
            variant: "accent",
            size: "md",
            action: {
              type: "uri",
              label: isEn ? "Web Chart" : "Web 圖表",
              uri: webUrl
            }
          }),
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              createNeoFlexButton({
                label: isEn ? "⚖️ Log Weight" : "⚖️ 記體重",
                variant: "white",
                size: "sm",
                flex: 1,
                action: {
                  type: "message",
                  label: isEn ? "Weight" : "記體重",
                  text: isEn ? "weight " : "體重 "
                }
              }),
              createNeoFlexButton({
                label: isEn ? "💩 Log Poop" : "💩 記排便",
                variant: "white",
                size: "sm",
                flex: 1,
                action: {
                  type: "message",
                  label: isEn ? "Poop" : "記排便",
                  text: "💩"
                }
              })
            ]
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
  const favorites = getUserFavorites(userId, props, userGistId);
  const goals = getUserGoals(userId, props, userGistId);
  const showCarbsFat = !!goals.show_carbs_fat;

  let totalCal = 0;
  const mealBoxes = [];

  if (allLogs.length === 0) {
    mealBoxes.push({
      type: "box",
      layout: "vertical",
      backgroundColor: "#FFFFFF",
      cornerRadius: "14px",
      borderColor: "#000000",
      borderWidth: "2px",
      paddingAll: "16px",
      alignItems: "center",
      spacing: "md",
      contents: [
        { type: "text", text: isEn ? "No meals logged on this date 🐼" : "該日期尚未有任何飲食紀錄 🐼", size: "xs", color: "#71717A", weight: "bold" },
        createNeoFlexButton({
          label: isEn ? (isToday ? "➕ Log Meal" : `➕ Log Meal for ${todayStr}`) : (isToday ? "➕ 記錄今日餐點" : `➕ 補記 ${todayStr} 餐點`),
          variant: "green",
          size: "md",
          action: {
            type: "postback",
            label: isEn ? "➕ Log Meal" : "➕ 補記餐點",
            data: JSON.stringify({ action: 'fillAddMeal', date: todayStr }),
            inputOption: "openKeyboard",
            fillInText: isToday ? "記 " : `補記 ${todayStr} `
          }
        })
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
      const cleanDishName = dishName.replace(/^[0-9]+(?:\.[0-9]+)?(?:倍的|x\s*)/i, '').replace(/\s*\(.*倍.*份量\)/g, '').trim();
      const isFav = favorites.some(f => {
        const fName = String(f.dish_name || '').trim();
        return fName === cleanDishName || fName === dishName;
      });

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
                type: "box", layout: "horizontal",
                backgroundColor: "#FFF1F2", cornerRadius: "6px",
                paddingStart: "6px", paddingEnd: "6px", paddingTop: "2px", paddingBottom: "2px",
                contents: [{ type: "text", text: `🔥 ${log.calories} kcal`, size: "xxs", color: "#E11D48", weight: "bold" }]
              },
              {
                type: "box", layout: "horizontal",
                backgroundColor: "#EFF6FF", cornerRadius: "6px",
                paddingStart: "6px", paddingEnd: "6px", paddingTop: "2px", paddingBottom: "2px",
                contents: [{ type: "text", text: `🥩 ${log.protein}g`, size: "xxs", color: "#2563EB", weight: "bold" }]
              },
              {
                type: "box", layout: "horizontal",
                backgroundColor: "#ECFEFF", cornerRadius: "6px",
                paddingStart: "6px", paddingEnd: "6px", paddingTop: "2px", paddingBottom: "2px",
                contents: [{ type: "text", text: `💧 ${log.water || 0}ml`, size: "xxs", color: "#0891B2", weight: "bold" }]
              }
            ]
          },
          ...(showCarbsFat && (Number(log.carbs) > 0 || Number(log.fat) > 0) ? [{
            type: "box", layout: "horizontal", spacing: "xs",
            contents: [
              Number(log.carbs) > 0 ? {
                type: "box", layout: "horizontal",
                backgroundColor: "#FFF7ED", cornerRadius: "6px",
                paddingStart: "6px", paddingEnd: "6px", paddingTop: "2px", paddingBottom: "2px",
                contents: [{ type: "text", text: `🍞 ${log.carbs}g`, size: "xxs", color: "#C2410C", weight: "bold" }]
              } : null,
              Number(log.fat) > 0 ? {
                type: "box", layout: "horizontal",
                backgroundColor: "#F0FDF4", cornerRadius: "6px",
                paddingStart: "6px", paddingEnd: "6px", paddingTop: "2px", paddingBottom: "2px",
                contents: [{ type: "text", text: `🥑 ${log.fat}g`, size: "xxs", color: "#166534", weight: "bold" }]
              } : null
            ].filter(Boolean)
          }] : []),

          {
            type: "box",
            layout: "horizontal",
            spacing: "xs",
            margin: "xs",
            contents: [
              ...(isFav ? [] : [
                createNeoFlexButton({
                  label: isEn ? "⭐ Fav" : "⭐ 加常用",
                  variant: "yellowLight",
                  size: "sm",
                  flex: 1,
                  action: {
                    type: "postback",
                    label: isEn ? "⭐ Fav" : "⭐ 加常用",
                    data: JSON.stringify({
                      action: 'saveFavorite',
                      name: cleanDishName,
                      cal: Number(log.calories) || 0,
                      pro: Number(log.protein) || 0,
                      wat: Number(log.water) || 0
                    }),
                    displayText: isEn ? `⭐ Favorite: ${cleanDishName}` : `⭐ 存為常用：${cleanDishName}`
                  }
                })
              ]),
              createNeoFlexButton({
                label: isEn ? "✏️ Edit" : "✏️ 微調",
                variant: "white",
                size: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "✏️ Edit" : "✏️ 微調",
                  data: JSON.stringify({ action: 'fillEdit', id: log.id }),
                  inputOption: "openKeyboard",
                  fillInText: isEn ? `Change ${dishName} ${log.calories}cal ${log.protein || 0}pro ${log.water || 0}water` : `改 ${dishName} ${log.calories}卡 ${log.protein || 0}蛋 ${log.water || 0}水`
                }
              }),
              createNeoFlexButton({
                label: isEn ? "🗑️ Delete" : "🗑️ 刪除",
                variant: "danger",
                size: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "🗑️ Delete" : "🗑️ 刪除",
                  data: JSON.stringify({ action: 'deleteMeal', id: log.id, index: index, date: todayStr }),
                  displayText: isEn ? `🗑️ Delete meal: ${dishName}` : `🗑️ 刪除餐點：${dishName}`
                }
              })
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
            margin: "xs",
            wrap: true
          },
          {
            type: "text",
            text: isEn ? `${allLogs.length} meals logged | Total ${totalCal} kcal` : `${isToday ? '今日' : '該日'}已記錄 ${allLogs.length} 餐 ｜ 累計攝取 ${totalCal} kcal`,
            color: "#FDE047",
            size: "xxs",
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
        backgroundColor: "#FAFAFA",
        contents: mealBoxes
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          createNeoFlexButton({
            label: isEn ? (isToday ? "➕ Log Another Meal" : `➕ Log Meal for ${todayStr}`) : (isToday ? "➕ 記錄新餐點" : `➕ 補記 ${todayStr} 餐點`),
            variant: "accent",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "➕ Log Meal" : "➕ 補記餐點",
              data: JSON.stringify({ action: 'fillAddMeal', date: todayStr }),
              inputOption: "openKeyboard",
              fillInText: isToday ? "記 " : `補記 ${todayStr} `
            }
          }),
          createNeoFlexButton({
            label: isToday ? (isEn ? "📊 View Today's Summary" : "📊 查看今日總結") : (isEn ? `📊 View ${todayStr} Summary` : `📊 查看 ${todayStr} 總結`),
            variant: "black",
            size: "md",
            action: {
              type: "postback",
              label: isToday ? (isEn ? "📊 View Today's Summary" : "📊 查看今日總結") : (isEn ? `📊 View ${todayStr} Summary` : `📊 查看 ${todayStr} 總結`),
              data: JSON.stringify({ action: 'pickDate', date: todayStr }),
              displayText: isToday ? (isEn ? "Daily Summary" : "今日總結") : (isEn ? `${todayStr} Summary` : `${todayStr} 總結`)
            }
          }),
          ...(isToday && allLogs.length > 0 ? [createNeoFlexButton({
            label: isEn ? "🗑️ Clear All Today's Logs" : "🗑️ 清空今日紀錄",
            variant: "danger",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "🗑️ Clear All Today's Logs" : "🗑️ 清空今日紀錄",
              data: JSON.stringify({ action: 'clearTodayConfirm' }),
              displayText: isEn ? "🗑️ Clear Today's Logs" : "🗑️ 清空今日紀錄"
            }
          })] : [])
        ]
      }
    }
  };
}

// ========================================================
// ⭐ 6. 常用餐點輪播卡片 (Favorites Carousel)
// ========================================================

function generateFavoritesCarouselFlex(userId, liffId, userGistId, props, page) {
  if (!props) props = PropertiesService.getScriptProperties();
  const favorites = getUserFavorites(userId, props, userGistId);
  const userLang = getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';
  const bubbles = [];
  const totalFavs = favorites.length;

  // 💧 輔助函式：快速補水站卡片
  function createWaterBubble() {
    return {
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
            alignItems: "center",
            contents: [
              { type: "text", text: isEn ? "💧 Hydration Station" : "💧 快速補水站", weight: "bold", size: "sm", color: "#FFFFFF", flex: 0 },
              { type: "text", text: isEn ? "⚡ 1-Tap" : "⚡ 一鍵打卡", weight: "bold", size: "xs", color: "#CFFAFE", align: "end" }
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
          createNeoFlexButton({
            label: isEn ? "💧 +500ml Water" : "💧 喝水 +500ml",
            variant: "cyan",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "💧 +500ml Water" : "💧 喝水 +500ml",
              data: JSON.stringify({ action: 'quickWater', amount: 500 }),
              displayText: isEn ? "💧 Drink 500ml water" : "💧 喝水 +500ml"
            }
          }),
          createNeoFlexButton({
            label: isEn ? "💧 +250ml Water" : "💧 喝水 +250ml",
            variant: "cyanLight",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "💧 +250ml Water" : "💧 喝水 +250ml",
              data: JSON.stringify({ action: 'quickWater', amount: 250 }),
              displayText: isEn ? "💧 Drink 250ml water" : "💧 喝水 +250ml"
            }
          }),
          createNeoFlexButton({
            label: isEn ? "💧 +1000ml Water" : "💧 喝水 +1000ml",
            variant: "cyanLight",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "💧 +1000ml Water" : "💧 喝水 +1000ml",
              data: JSON.stringify({ action: 'quickWater', amount: 1000 }),
              displayText: isEn ? "💧 Drink 1000ml water" : "💧 喝水 +1000ml"
            }
          })
        ]
      }
    };
  }

  // ⭐ 輔助函式：單一常用餐點卡片
  function createFavoriteBubble(fav, globalIdx, totalCount, curPage) {
    const dishName = fav.dish_name || (isEn ? 'Favorite Meal' : '常用餐點');
    return {
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
              { type: "text", text: `#${globalIdx + 1} / ${totalCount}`, weight: "bold", size: "xxs", color: "#713F12", align: "end" }
            ]
          },
          {
            type: "text",
            text: dishName,
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
                  { type: "text", text: `${fav.calories || 0}`, size: "xs", color: "#000000", weight: "bold" }
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
                  { type: "text", text: `${fav.protein || 0}g`, size: "xs", color: "#000000", weight: "bold" }
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
          createNeoFlexButton({
            label: isEn ? "⚡ Quick Log This" : "⚡ 一鍵記錄這餐",
            variant: "black",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "⚡ Quick Log This" : "⚡ 一鍵記錄這餐",
              data: JSON.stringify({
                action: 'quickLogFavorite',
                name: encodeURIComponent(dishName),
                cal: fav.calories || 0,
                pro: fav.protein || 0,
                wat: fav.water || 0
              }),
              displayText: isEn ? `⚡ Quick Log: ${dishName}` : `⚡ 快捷記錄：${dishName}`
            }
          }),
          {
            type: "box",
            layout: "horizontal",
            spacing: "xs",
            contents: [
              globalIdx > 0 ? createNeoFlexButton({
                label: isEn ? "🔝 Top" : "🔝 置頂",
                variant: "yellowLight",
                size: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "🔝 Top" : "🔝 置頂",
                  data: JSON.stringify({ action: 'moveFavorite', favId: fav.id || dishName, dir: 'top', returnView: 'carousel', page: curPage }),
                  displayText: isEn ? `🔝 Pin to front: ${dishName}` : `🔝 將「${dishName}」置頂排在第一位`
                }
              }) : null,
              createNeoFlexButton({
                label: isEn ? "✏️ Adjust" : "✏️ 調整",
                variant: "white",
                size: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "✏️ Adjust" : "✏️ 調整",
                  data: JSON.stringify({ action: 'fillFav', name: encodeURIComponent(dishName) }),
                  inputOption: "openKeyboard",
                  fillInText: isEn 
                    ? `Edit fav ${dishName} ${fav.calories || 0}cal ${fav.protein || 0}pro ${fav.water || 0}water`
                    : `調整常用 ${dishName} ${fav.calories || 0}卡 ${fav.protein || 0}蛋 ${fav.water || 0}水`
                }
              }),
              createNeoFlexButton({
                label: isEn ? "🗑️ Delete" : "🗑️ 移除",
                variant: "danger",
                size: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "🗑️ Delete" : "🗑️ 移除",
                  data: JSON.stringify({
                    action: 'deleteFavorite',
                    favId: fav.id || dishName,
                    name: dishName,
                    page: curPage
                  }),
                  displayText: isEn ? `🗑️ Remove from favorites: ${dishName}` : `🗑️ 移除常用：${dishName}`
                }
              })
            ].filter(Boolean)
          }
        ]
      }
    };
  }

  // ➡️ 輔助函式：下一頁卡片
  function createNextPageBubble(curPage, totalP, remaining) {
    return {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#3B82F6",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: isEn ? "➡️ Next Page" : "➡️ 下一頁常用", weight: "bold", size: "sm", color: "#FFFFFF" },
              { type: "text", text: `${curPage}/${totalP}`, weight: "bold", size: "xs", color: "#DBEAFE", align: "end" }
            ]
          },
          {
            type: "text",
            text: isEn ? `More favorites (${remaining} items left)` : `還有 ${remaining} 道常用餐點`,
            size: "xxs",
            color: "#EFF6FF",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        backgroundColor: "#EFF6FF",
        contents: [
          {
            type: "text",
            text: isEn 
              ? `You have ${totalFavs} favorites in total. Tap below to view Page ${curPage + 1}!`
              : `您目前共有 ${totalFavs} 道常用餐點。\n點擊下方即可切換至第 ${curPage + 1} 頁繼續挑選！`,
            size: "xs",
            color: "#1E40AF",
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
          createNeoFlexButton({
            label: isEn ? `➡️ View Page ${curPage + 1}` : `➡️ 前往第 ${curPage + 1} 頁`,
            variant: "blue",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? `➡️ View Page ${curPage + 1}` : `➡️ 前往第 ${curPage + 1} 頁`,
              data: JSON.stringify({ action: 'favPage', page: curPage + 1 }),
              displayText: isEn ? `➡️ View Page ${curPage + 1}` : `➡️ 前往第 ${curPage + 1} 頁常用`
            }
          }),
          createNeoFlexButton({
            label: isEn ? "📋 All Favorites List" : "📋 常用管理面板 (全部)",
            variant: "blueLight",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "📋 All Favorites List" : "📋 常用管理面板 (全部)",
              data: JSON.stringify({ action: 'manageFavorites', page: 1 }),
              displayText: isEn ? "📋 Manage Favorites" : "📋 常用餐點管理"
            }
          })
        ]
      }
    };
  }

  // ⬅️ 輔助函式：上一頁卡片
  function createPrevPageBubble(curPage, totalP, startItemIdx) {
    return {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#64748B",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: isEn ? "⬅️ Previous Page" : "⬅️ 上一頁常用", weight: "bold", size: "sm", color: "#FFFFFF" },
              { type: "text", text: `${curPage}/${totalP}`, weight: "bold", size: "xs", color: "#F1F5F9", align: "end" }
            ]
          },
          {
            type: "text",
            text: isEn ? `Back to items 1..${startItemIdx}` : `返回前 ${startItemIdx} 道餐點與補水`,
            size: "xxs",
            color: "#E2E8F0",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        backgroundColor: "#F8FAFC",
        contents: [
          {
            type: "text",
            text: isEn 
              ? `Currently viewing page ${curPage} of ${totalP}. Tap below to return to the previous page.`
              : `目前正在瀏覽第 ${curPage} / ${totalP} 頁。\n點擊下方可返回上一頁餐點或補水站。`,
            size: "xs",
            color: "#334155",
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
          createNeoFlexButton({
            label: isEn ? `⬅️ Back to Page ${curPage - 1}` : `⬅️ 返回第 ${curPage - 1} 頁`,
            variant: "slate",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? `⬅️ Back to Page ${curPage - 1}` : `⬅️ 返回第 ${curPage - 1} 頁`,
              data: JSON.stringify({ action: 'favPage', page: curPage - 1 }),
              displayText: isEn ? `⬅️ Back to Page ${curPage - 1}` : `⬅️ 返回第 ${curPage - 1} 頁常用`
            }
          }),
          createNeoFlexButton({
            label: isEn ? "💧 First Page & Water" : "💧 返回首頁與補水站",
            variant: "slateLight",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "💧 First Page & Water" : "💧 返回首頁與補水站",
              data: JSON.stringify({ action: 'favPage', page: 1 }),
              displayText: isEn ? "💧 Back to page 1" : "💧 返回第 1 頁與補水站"
            }
          })
        ]
      }
    };
  }

  // ➕ 輔助函式：常用庫管理卡片 (尾卡)
  function createManagerBubble(totalCount, curPage, totalP) {
    return {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#E5E7EB",
        paddingAll: "12px",
        contents: [
          { type: "text", text: isEn ? "⭐ Favorites Manager" : "⭐ 常用庫管理", weight: "bold", size: "sm", color: "#111827" },
          { type: "text", text: isEn ? `${totalCount} items in list` : `目前已建立 ${totalCount} 道專屬常用餐點`, size: "xxs", color: "#4B5563", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        backgroundColor: "#FFFFFF",
        contents: [
          {
            type: "text",
            text: isEn 
              ? "💡 Tip: Tap 「✏️ Adjust」 to edit calories/protein, or 「🗑️ Delete」 to remove. Tap below to add a new favorite meal anytime!"
              : "💡 提示：在任一張常用卡片點「✏️ 調整」可修改熱量；點「🗑️ 移除」可刪除；點「🔝 置頂」排在最前！",
            size: "xs",
            color: "#6B7280",
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
          createNeoFlexButton({
            label: isEn ? "➕ Add New Favorite" : "➕ 新增常用餐點",
            variant: "black",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "➕ Add New Favorite" : "➕ 新增常用餐點",
              data: JSON.stringify({ action: 'fillFav' }),
              inputOption: "openKeyboard",
              fillInText: isEn ? "Add fav Oatmeal+Latte 220cal 8pro 300water" : "加常用 燕麥奶拿鐵 150卡 5蛋 300水"
            }
          }),
          createNeoFlexButton({
            label: isEn ? "📋 Manage Favorites" : "📋 常用餐點管理面板",
            variant: "danger",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "📋 Manage Favorites" : "📋 常用餐點管理面板",
              data: JSON.stringify({ action: 'manageFavorites', page: 1 }),
              displayText: isEn ? "📋 Manage Favorites" : "📋 常用餐點管理"
            }
          }),
          totalP > 1 && curPage > 1 ? createNeoFlexButton({
            label: isEn ? "⏮️ Back to First Page" : "⏮️ 返回第一頁",
            variant: "secondary",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "⏮️ Back to First Page" : "⏮️ 返回第一頁",
              data: JSON.stringify({ action: 'favPage', page: 1 }),
              displayText: isEn ? "⏮️ Back to first page" : "⏮️ 返回第一頁常用"
            }
          }) : null
        ].filter(Boolean)
      }
    };
  }

  // 1️⃣ 常用清單為空時
  if (totalFavs === 0) {
    bubbles.push(createWaterBubble());
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
            text: isEn ? "💡 Tip: After AI photo recognition tap 「⭐ Favorite」 to save, or tap button below to add right in LINE!" : "💡 提示：拍照辨識後點擊「⭐ 存為常用」，或點擊下方直接在 LINE 建立常用餐點！",
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
          createNeoFlexButton({
            label: isEn ? "➕ Add Favorite" : "➕ 新增常用餐點",
            variant: "black",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "➕ Add Favorite" : "➕ 新增常用餐點",
              data: JSON.stringify({ action: 'fillFav' }),
              inputOption: "openKeyboard",
              fillInText: isEn ? "Add fav Black Coffee+Egg 160cal 14pro 450water" : "加常用 美式咖啡+茶葉蛋 160卡 14蛋 450水"
            }
          })
        ]
      }
    });

    return {
      type: "flex",
      altText: isEn ? `⭐ Favorite Meals & Hydration Station` : `⭐ 常用餐點與補水站（左右滑動選擇）`,
      contents: {
        type: "carousel",
        contents: bubbles
      }
    };
  }

  // 2️⃣ 常用餐點 <= 5 道：單頁完全呈現 (1 補水站 + 所有常用 + 1 管理卡，總數 <= 7)
  if (totalFavs <= 5) {
    bubbles.push(createWaterBubble());
    favorites.forEach((fav, index) => {
      bubbles.push(createFavoriteBubble(fav, index, totalFavs, 1));
    });
    bubbles.push(createManagerBubble(totalFavs, 1, 1));

    return {
      type: "flex",
      altText: isEn ? `⭐ Favorite Meals (${totalFavs})` : `⭐ 常用餐點（共 ${totalFavs} 道，左右滑動）`,
      contents: {
        type: "carousel",
        contents: bubbles.slice(0, 12)
      }
    };
  }

  // 3️⃣ 常用餐點 > 5 道：啟用動態分頁 (每頁 5 道，1+5+1=7 Bubbles ≈ 32KB，嚴格遠低於 LINE 50KB 限制)
  const PAGE_SIZE = 5;
  const totalPages = Math.ceil(totalFavs / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(parseInt(page, 10) || 1, totalPages));
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, totalFavs);
  const pageFavs = favorites.slice(startIdx, endIdx);

  // 首張 Bubble：首頁放「快速補水站」，後續頁放「上一頁卡片」
  if (currentPage === 1) {
    bubbles.push(createWaterBubble());
  } else {
    bubbles.push(createPrevPageBubble(currentPage, totalPages, startIdx));
  }

  // 中間 Bubbles：當頁常用餐點
  pageFavs.forEach((fav, pIdx) => {
    const globalIdx = startIdx + pIdx;
    bubbles.push(createFavoriteBubble(fav, globalIdx, totalFavs, currentPage));
  });

  // 尾張 Bubble：若有下一頁放「下一頁卡片」，最後一頁放「常用庫管理卡片」
  if (currentPage < totalPages) {
    bubbles.push(createNextPageBubble(currentPage, totalPages, totalFavs - endIdx));
  } else {
    bubbles.push(createManagerBubble(totalFavs, currentPage, totalPages));
  }

  return {
    type: "flex",
    altText: isEn ? `⭐ Favorite Meals (Page ${currentPage}/${totalPages})` : `⭐ 常用餐點（第 ${currentPage}/${totalPages} 頁，共 ${totalFavs} 道）`,
    contents: {
      type: "carousel",
      contents: bubbles.slice(0, 12)
    }
  };
}

/**
 * 常用餐點專屬管理面板 (可直接在 LINE 瀏覽所有常用、微調數值、一鍵刪除)
 * 🛡️ 內建安全分頁 (PAGE_SIZE = 4)：單張 Bubble 嚴格控制於 ~19KB，徹底杜絕 LINE Flex 30KB 限制所導致的 HTTP 400 失敗
 */
function generateManageFavoritesFlex(userId, liffId, userGistId, props, lang, page) {
  if (!props) props = PropertiesService.getScriptProperties();
  const userLang = lang || getUserLanguage(userId, props, userGistId);
  const isEn = userLang === 'en';
  const favorites = getUserFavorites(userId, props, userGistId);

  const favBoxes = [];
  const totalFavs = favorites.length;
  const PAGE_SIZE = 4;
  const totalPages = Math.max(1, Math.ceil(totalFavs / PAGE_SIZE));
  const curPage = Math.max(1, Math.min(parseInt(page, 10) || 1, totalPages));
  const startIdx = (curPage - 1) * PAGE_SIZE;
  const pageFavs = favorites.slice(startIdx, startIdx + PAGE_SIZE);

  if (totalFavs === 0) {
    favBoxes.push({
      type: "box",
      layout: "vertical",
      backgroundColor: "#FFFFFF",
      cornerRadius: "12px",
      borderColor: "#E4E4E7",
      borderWidth: "1px",
      paddingAll: "16px",
      alignItems: "center",
      contents: [
        { 
          type: "text", 
          text: isEn ? "⭐ No favorites in your list yet 🐼" : "⭐ 常用清單目前是空的 🐼", 
          size: "xs", 
          color: "#A1A1AA" 
        }
      ]
    });
  } else {
    pageFavs.forEach((fav, pIdx) => {
      const globalIndex = startIdx + pIdx;
      const dishName = fav.dish_name || (isEn ? 'Favorite Meal' : '常用餐點');
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
              { 
                type: "text", 
                text: `${globalIndex + 1}. ${dishName}`, 
                size: "sm", 
                color: "#18181B", 
                weight: "bold", 
                flex: 1, 
                wrap: true 
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
                layout: "horizontal",
                backgroundColor: "#FFF1F2",
                cornerRadius: "6px",
                paddingStart: "6px",
                paddingEnd: "6px",
                paddingTop: "2px",
                paddingBottom: "2px",
                contents: [{ type: "text", text: `🔥 ${fav.calories || 0} kcal`, size: "xxs", color: "#E11D48", weight: "bold" }]
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
                contents: [{ type: "text", text: `🥩 ${fav.protein || 0}g`, size: "xxs", color: "#2563EB", weight: "bold" }]
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
          // 第一行（順序調整）：若有多於一道常用時顯示
          (globalIndex > 0 || globalIndex < totalFavs - 1) ? {
            type: "box",
            layout: "horizontal",
            spacing: "xs",
            margin: "xs",
            contents: [
              globalIndex > 0 ? createNeoFlexButton({
                label: isEn ? "⬆️ Up" : "⬆️ 上移",
                variant: "green",
                size: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "⬆️ Up" : "⬆️ 上移",
                  data: JSON.stringify({ action: 'moveFavorite', favId: fav.id || dishName, dir: 'up', page: curPage }),
                  displayText: isEn ? `⬆️ Move up: ${dishName}` : `⬆️ 將「${dishName}」往上移`
                }
              }) : null,
              globalIndex < totalFavs - 1 ? createNeoFlexButton({
                label: isEn ? "⬇️ Down" : "⬇️ 下移",
                variant: "green",
                size: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "⬇️ Down" : "⬇️ 下移",
                  data: JSON.stringify({ action: 'moveFavorite', favId: fav.id || dishName, dir: 'down', page: curPage }),
                  displayText: isEn ? `⬇️ Move down: ${dishName}` : `⬇️ 將「${dishName}」往下移`
                }
              }) : null,
              globalIndex > 1 ? createNeoFlexButton({
                label: isEn ? "🔝 Top" : "🔝 置頂",
                variant: "yellowLight",
                size: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "🔝 Top" : "🔝 置頂",
                  data: JSON.stringify({ action: 'moveFavorite', favId: fav.id || dishName, dir: 'top', page: curPage }),
                  displayText: isEn ? `🔝 Move to top: ${dishName}` : `🔝 將「${dishName}」置頂`
                }
              }) : null
            ].filter(Boolean)
          } : null,
          // 第二行（數值調整與刪除）：固定寬敞 50/50 佈局，字體永不吃字
          {
            type: "box",
            layout: "horizontal",
            spacing: "xs",
            margin: "xs",
            contents: [
              createNeoFlexButton({
                label: isEn ? "✏️ Adjust" : "✏️ 調整數值",
                variant: "white",
                size: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "✏️ Adjust" : "✏️ 調整數值",
                  data: JSON.stringify({ action: 'fillFav', name: encodeURIComponent(dishName) }),
                  inputOption: "openKeyboard",
                  fillInText: isEn 
                    ? `Edit fav ${dishName} ${fav.calories || 0}cal ${fav.protein || 0}pro ${fav.water || 0}water`
                    : `調整常用 ${dishName} ${fav.calories || 0}卡 ${fav.protein || 0}蛋 ${fav.water || 0}水`
                }
              }),
              createNeoFlexButton({
                label: isEn ? "🗑️ Delete" : "🗑️ 刪除",
                variant: "danger",
                size: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? "🗑️ Delete" : "🗑️ 刪除",
                  data: JSON.stringify({ 
                    action: 'deleteFavorite', 
                    favId: fav.id || dishName, 
                    name: dishName,
                    returnView: 'manage',
                    page: curPage
                  }),
                  displayText: isEn ? `🗑️ Delete favorite: ${dishName}` : `🗑️ 刪除常用：${dishName}`
                }
              })
            ]
          }
        ].filter(Boolean)
      });
    });
  }

  return {
    type: "flex",
    altText: isEn ? `⭐ Manage Favorites (Page ${curPage}/${totalPages})` : `⭐ 常用餐點管理（第 ${curPage}/${totalPages} 頁）`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#FEF9C3",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: isEn ? "⭐ Favorites Manager" : "⭐ 常用餐點管理", weight: "bold", size: "md", color: "#713F12" },
              { type: "text", text: isEn ? `Page ${curPage}/${totalPages} (${totalFavs})` : `第 ${curPage}/${totalPages} 頁 (共 ${totalFavs} 道)`, size: "xs", color: "#854D0E", align: "end" }
            ]
          },
          {
            type: "text",
            text: isEn ? "Edit nutrition or tap delete to remove" : "點擊「🗑️ 刪除」即可直接移除，或點「✏️ 調整」修改數值",
            size: "xxs",
            color: "#A16207",
            margin: "xs",
            wrap: true
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        backgroundColor: "#FAFAFA",
        contents: favBoxes
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          ...(totalPages > 1 ? [{
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              curPage > 1 ? createNeoFlexButton({
                label: isEn ? `⬅️ Page ${curPage - 1}` : `⬅️ 第 ${curPage - 1} 頁`,
                variant: "slate",
                size: "md",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? `⬅️ Page ${curPage - 1}` : `⬅️ 第 ${curPage - 1} 頁`,
                  data: JSON.stringify({ action: 'manageFavorites', page: curPage - 1 }),
                  displayText: isEn ? `⬅️ Page ${curPage - 1}` : `⬅️ 前往第 ${curPage - 1} 頁`
                }
              }) : null,
              curPage < totalPages ? createNeoFlexButton({
                label: isEn ? `➡️ Page ${curPage + 1}` : `➡️ 第 ${curPage + 1} 頁`,
                variant: "blue",
                size: "md",
                flex: 1,
                action: {
                  type: "postback",
                  label: isEn ? `➡️ Page ${curPage + 1}` : `➡️ 第 ${curPage + 1} 頁`,
                  data: JSON.stringify({ action: 'manageFavorites', page: curPage + 1 }),
                  displayText: isEn ? `➡️ Page ${curPage + 1}` : `➡️ 前往第 ${curPage + 1} 頁`
                }
              }) : null
            ].filter(Boolean)
          }] : []),
          createNeoFlexButton({
            label: isEn ? "➕ Add New Favorite" : "➕ 新增常用餐點",
            variant: "black",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "➕ Add New Favorite" : "➕ 新增常用餐點",
              data: JSON.stringify({ action: 'fillFav' }),
              inputOption: "openKeyboard",
              fillInText: isEn ? "Add fav Oatmeal+Latte 220cal 8pro 300water" : "加常用 燕麥奶拿鐵 150卡 5蛋 300水"
            }
          }),
          createNeoFlexButton({
            label: isEn ? "⭐ Back to Carousel" : "⭐ 返回常用輪播",
            variant: "white",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "⭐ Back to Carousel" : "⭐ 返回常用輪播",
              data: JSON.stringify({ action: 'favPage', page: 1 }),
              displayText: isEn ? "Favorites" : "常用"
            }
          })
        ]
      }
    }
  };
}

function generateFavoritesListFlex(userId, liffId, userGistId, props) {
  return generateManageFavoritesFlex(userId, liffId, userGistId, props);
}

function generateFavoriteAddedFlex(favItem, liffId, userGistId, lang, isEdit) {
  const isEn = lang === 'en';
  const headerTitle = isEdit 
    ? (isEn ? "✏️ Favorite Updated!" : "✏️ 常用餐點已成功更新！")
    : (isEn ? "⭐ Added to Favorites!" : "⭐ 成功存入常用餐點！");
  const headerBg = isEdit ? "#BAE6FD" : "#FDE047";
  const altTextMsg = isEdit
    ? (isEn ? `✏️ Updated favorite: ${favItem.dish_name}` : `✏️ 已成功更新常用餐點：${favItem.dish_name}`)
    : (isEn ? `⭐ Saved to favorites: ${favItem.dish_name}` : `⭐ 已成功存為常用餐點：${favItem.dish_name}`);

  return {
    type: "flex",
    altText: altTextMsg,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: headerBg,
        paddingAll: "14px",
        contents: [
          { 
            type: "text", 
            text: headerTitle, 
            weight: "bold", 
            size: "md", 
            color: "#000000",
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
            text: favItem.dish_name, 
            weight: "bold", 
            size: "md", 
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
            text: isEn ? "💡 Tip: Type 「Favorites」 anytime for 1-tap fast logging or adjustment! 🐼" : "💡 提示：隨時在對話框輸入「常用」即可一鍵快捷記錄或直接調整！🐼",
            size: "xs",
            color: "#6B7280",
            wrap: true,
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
          createNeoFlexButton({
            label: isEn ? "⭐ View Favorites" : "⭐ 查看常用庫",
            variant: "black",
            size: "md",
            flex: 1,
            action: {
              type: "message",
              label: isEn ? "⭐ View Favorites" : "⭐ 查看常用庫",
              text: isEn ? "Favorites" : "常用"
            }
          })
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
          { type: "text", text: isEn ? "⚠️ Confirm Clear Today's Logs" : "⚠️ 清空今日飲食紀錄確認", weight: "bold", size: "md", color: "#E11D48", wrap: true },
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
              { type: "text", text: "🛠️ DAILY DIET", color: "#FDE047", weight: "bold", size: "sm", flex: 0 },
              { type: "text", text: isEn ? "Command Manual" : "全功能操作手冊", color: "#A1A1AA", size: "xs", align: "end" }
            ]
          },
          {
            type: "text",
            text: isEn ? "Tap any button below to trigger actions 🐼👇" : "點擊下方任何按鈕，直接執行對應操作 🐼👇",
            color: "#FFFFFF",
            weight: "bold",
            size: "xs",
            margin: "xs",
            wrap: true
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
              { type: "text", text: isEn ? "⚖️ Weight & Digestion" : "⚖️ 體態與排便紀錄", weight: "bold", size: "xs", color: "#000000" },
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  buildMenuBtn(
                    isEn ? "💩 Log Poop" : "💩 便便打卡",
                    {
                      type: "postback",
                      label: isEn ? "Log Poop" : "便便打卡",
                      data: JSON.stringify({ action: 'logPoop' }),
                      displayText: isEn ? "💩 Log Poop" : "💩 便便打卡"
                    },
                    "#FEF3C7"
                  ),
                  buildMenuBtn(
                    isEn ? "📈 Weight Chart" : "📈 體重圖表",
                    {
                      type: "postback",
                      label: isEn ? "Weight Chart" : "體重圖表",
                      data: JSON.stringify({ action: 'weightTrend' }),
                      displayText: isEn ? "📈 Weight Chart" : "📈 體重圖表"
                    },
                    "#EDE9FE"
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
            margin: "xs",
            wrap: true
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
          { type: "text", text: isEn ? "🌐 Welcome Back! Sync Web Data" : "🌐 歡迎老朋友！無縫連動 Web 紀錄", weight: "bold", size: "md", color: "#FDE047", wrap: true },
          { type: "text", text: isEn ? "Bind your Gist ID to sync 100% of meals & targets!" : "綁定 Gist ID，讓歷史餐點與目標 100% 雙向同步！", size: "xxs", color: "#E4E4E7", margin: "xs", wrap: true }
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
              { type: "text", text: isEn ? "📌 3 Quick Steps to Link:" : "📌 簡單 3 步驟完成連動：", weight: "bold", size: "xs", color: "#854D0E", wrap: true },
              { type: "text", text: isEn ? "1. Open Web app from button below" : "1. 點擊下方按鈕開啟 Web 版 Daily Diet", size: "xxs", color: "#713F12", wrap: true },
              { type: "text", text: isEn ? "2. Go to Settings ➔ Cloud Backup to copy Gist ID" : "2. 前往右上角「⚙️ 設定」➔「雲端備份」複製 Gist ID", size: "xxs", color: "#713F12", wrap: true },
              { type: "text", text: isEn ? "3. Tap 'Bind Gist' and send: Bind <YourGistId>" : "3. 點擊下方「填入綁定指令」，送出「綁定 您的GistID」即可！", size: "xxs", color: "#713F12", wrap: true }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          createNeoFlexButton({
            label: isEn ? "📱 Open Web to Copy Gist ID" : "📱 開啟 Web 複製 Gist ID",
            variant: "accent",
            size: "md",
            action: {
              type: "uri",
              label: isEn ? "📱 Open Web to Copy Gist ID" : "📱 開啟 Web 複製 Gist ID",
              uri: appTargetUrl
            }
          }),
          createNeoFlexButton({
            label: isEn ? "☁️ Fill 'Bind Gist'" : "☁️ 填入「綁定 Gist」",
            variant: "white",
            size: "md",
            action: {
              type: "postback",
              label: isEn ? "☁️ Fill 'Bind Gist'" : "☁️ 填入「綁定 Gist」",
              data: JSON.stringify({ action: 'fillGist' }),
              inputOption: "openKeyboard",
              fillInText: isEn ? "Bind " : "綁定 "
            }
          })
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
              ? (isEn ? "Submitted to engineering team 🐼❤️" : "已即時發送至工程團隊信箱 🐼❤️")
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
              ? (isEn ? "✅ Dispatched to Team Email:" : "✅ 已即時發送郵件通報至工程團隊：")
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

/**
 * 🚀 全新功能升級通知卡片 (體重追蹤、便便打卡、走勢圖表)
 */
function generateFeatureAnnouncementFlex(userId, liffId, userGistId, props, lang) {
  const isEn = lang === 'en';
  const appTargetUrl = 'https://liff.line.me/' + liffId + '?userId=' + (userId || '') + (userGistId ? '&gistId=' + userGistId : '') + '&tab=weight';

  function buildFeatureCard(emoji, title, desc, tag, bgColor, borderColor = "#000000") {
    return {
      type: "box",
      layout: "vertical",
      backgroundColor: bgColor,
      borderColor: borderColor,
      borderWidth: "2px",
      cornerRadius: "12px",
      paddingAll: "10px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          alignItems: "center",
          contents: [
            { type: "text", text: `${emoji} ${title}`, weight: "bold", size: "sm", color: "#000000", flex: 1, wrap: true },
            {
              type: "box",
              layout: "horizontal",
              backgroundColor: "#000000",
              cornerRadius: "99px",
              paddingStart: "8px",
              paddingEnd: "8px",
              paddingTop: "3px",
              paddingBottom: "3px",
              flex: 0,
              alignItems: "center",
              justifyContent: "center",
              contents: [
                { type: "text", text: tag, size: "xxs", color: "#FDE047", weight: "bold" }
              ]
            }
          ]
        },
        {
          type: "text",
          text: desc,
          size: "xs",
          color: "#3F3F46",
          margin: "xs",
          wrap: true
        }
      ]
    };
  }

  return {
    type: "flex",
    altText: isEn ? "🚀 Daily Diet Major Update: Weight, Poop & Chart Tracking!" : "🚀 Daily Diet 全新升級：體重紀錄、便便打卡與走勢圖表！",
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
              { type: "text", text: "🚀 DAILY DIET UPDATE", color: "#FDE047", weight: "bold", size: "xs", flex: 0 },
              { type: "text", text: isEn ? "v3.3.0 Major Release" : "全新功能重磅上線", color: "#A1A1AA", size: "xxs", align: "end" }
            ]
          },
          {
            type: "text",
            text: isEn ? "🎉 Weight, Poop & Chart Tracking is Live!" : "🎉 體重追蹤、便便打卡與視覺化走勢全新登場！",
            color: "#FFFFFF",
            weight: "bold",
            size: "sm",
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
          buildFeatureCard(
            "⚖️",
            isEn ? "Weight Log & Delta" : "LINE 體重快速記錄",
            isEn ? "Just type \"Weight 65.2\" or \"65kg\". Auto-computes diff vs previous log with coach tips!" : "輸入「體重 65.2」或「65kg」秒記！自動計算與前次增減差額，教練即時給予建議！",
            isEn ? "NEW" : "全新",
            "#EFF6FF"
          ),
          buildFeatureCard(
            "💩",
            isEn ? "Poop & Digestion Tracker" : "便便排便打卡",
            isEn ? "Send \"Poop\" or \"💩\". Auto-tracks elapsed time since last log to monitor gut health!" : "輸入「便便」、「排便」或「💩」打卡！自動統計距離上次相隔時長，掌握腸道健康！",
            isEn ? "NEW" : "全新",
            "#FEF3C7"
          ),
          buildFeatureCard(
            "📈",
            isEn ? "Visual Weight & Poop Chart" : "LINE 專屬走勢圖表",
            isEn ? "Type \"Weight chart\" to render 10-day curve & 7-day poop badges right inside LINE!" : "輸入「體重趨勢」或「體重紀錄」，直接在 LINE 對話框繪製近 10 天折線圖與 7 日便便狀態！",
            isEn ? "CHART" : "圖表",
            "#F3E8FF"
          ),
          buildFeatureCard(
            "🔄",
            isEn ? "Seamless Cloud Sync" : "Web & LINE 雙向同步",
            isEn ? "Logged data flows instantly between LINE, Web App, and your private Gist backup." : "LINE 與 Web 紀錄即時雙向連動，並無縫備份至個人專屬 Gist 雲端！",
            isEn ? "SYNC" : "同步",
            "#DCFCE7"
          )
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FEF08A",
                borderColor: "#000000",
                borderWidth: "2px",
                cornerRadius: "10px",
                paddingTop: "9px",
                paddingBottom: "9px",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "postback",
                  label: isEn ? "Weight Chart" : "體重趨勢",
                  data: JSON.stringify({ action: 'weightTrend' }),
                  displayText: isEn ? "📈 Weight Chart" : "📈 體重趨勢"
                },
                contents: [
                  { type: "text", text: isEn ? "📈 Weight Chart" : "📈 體重走勢", weight: "bold", size: "xs", color: "#000000" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FED7AA",
                borderColor: "#000000",
                borderWidth: "2px",
                cornerRadius: "10px",
                paddingTop: "9px",
                paddingBottom: "9px",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "postback",
                  label: isEn ? "Log Poop" : "便便打卡",
                  data: JSON.stringify({ action: 'logPoop' }),
                  displayText: isEn ? "💩 Log Poop" : "💩 便便打卡"
                },
                contents: [
                  { type: "text", text: isEn ? "💩 Log Poop" : "💩 便便打卡", weight: "bold", size: "xs", color: "#000000" }
                ]
              }
            ]
          },
          {
            type: "button",
            action: {
              type: "uri",
              label: isEn ? "📱 Open Web Full Tracker" : "📱 開啟 Web 完整記錄",
              uri: appTargetUrl
            },
            style: "primary",
            color: "#000000",
            height: "sm"
          }
        ]
      }
    }
  };
}

