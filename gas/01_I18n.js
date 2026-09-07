/**
 * ========================================================
 * 01_I18n.js - 雙語多國語系 (i18n) 字典與本地化工具
 * 支援：繁體中文 (zh) 與 英文 (en)
 * ========================================================
 */

const I18N_DICT = {
  // 通用
  appName: { zh: "DAILY DIET", en: "DAILY DIET" },
  coachPanda: { zh: "熊貓教練", en: "Panda Coach" },
  today: { zh: "今日", en: "Today" },
  calories: { zh: "熱量", en: "Calories" },
  protein: { zh: "蛋白質", en: "Protein" },
  carbs: { zh: "碳水", en: "Carbs" },
  fat: { zh: "脂肪", en: "Fat" },
  water: { zh: "水分", en: "Water" },
  grams: { zh: "克", en: "g" },
  gramsProtein: { zh: "g蛋", en: "g pro" },
  gramsCarbs: { zh: "g碳", en: "g carb" },
  gramsFat: { zh: "g脂", en: "g fat" },
  cancel: { zh: "取消", en: "Cancel" },
  confirm: { zh: "確認", en: "Confirm" },
  openApp: { zh: "開啟 App", en: "Open App" },

  // 圖文選單 (Rich Menu)
  menuCamera: { zh: "拍照記錄", en: "AI Camera" },
  menuFavorites: { zh: "常用餐點", en: "Favorites" },
  menuWater: { zh: "喝水 500", en: "+500ml Water" },
  menuSummary: { zh: "今日總結", en: "Daily Summary" },
  menuGuide: { zh: "使用說明", en: "Guide" },
  menuOpenApp: { zh: "開啟 App", en: "Open App" },
  menuChatBar: { zh: "點我開啟飲食選單 🐼", en: "Diet Menu 🐼" },

  // 飲食確認卡片 (MealConfirmCard)
  mealCardHeader: { zh: "AI 即時記錄", en: "AI MEAL LOG" },
  mealCardLogged: { zh: "✅ 已即時記錄至資料庫！", en: "✅ Logged to your Diary!" },
  mealCardUpdatedMult: { zh: "✅ 已更新為 {m} 倍份量！", en: "✅ Updated to {m}x portion!" },
  mealCardBreakdownTitle: { zh: "🧮 估算拆解明細", en: "🧮 Nutrient Breakdown" },
  mealCardBreakdownSub: { zh: "估算熱量 / 蛋白質", en: "Calories / Protein" },
  mealCardCalcFormula: { zh: "💡 計算過程：", en: "💡 Calculation Formula: " },
  mealCardTip: { zh: "⚡ 餐點已入帳！點擊下方按鈕可快速微調或收藏：", en: "⚡ Meal saved! Tap buttons below to adjust or favorite:" },
  mealCardBtnSummary: { zh: "📊 查看今日總結", en: "📊 View Daily Summary" },
  mealCardBtnAdjust: { zh: "✏️ 微調內容", en: "✏️ Adjust" },
  mealCardBtnFav: { zh: "⭐ 存為常用", en: "⭐ Favorite" },
  mealCardPortionTitle: { zh: "⚖️ 份量調整 (整份等比縮放)", en: "⚖️ PORTION SIZE (ALL NUTRIENTS)" },
  mealCardBtnHalveRice: { zh: "🍚 飯吃一半 (-50%碳水)", en: "🍚 Halve Rice (-50%)" },

  // 今日總結 (DailySummaryFlex)
  summaryTitleToday: { zh: "📊 今日飲食進度看板", en: "📊 Daily Diet Dashboard" },
  summaryTitleHistory: { zh: "📅 {date} 歷史總結", en: "📅 {date} Summary" },
  summaryJustLogged: { zh: "✅ 紀錄成功！今日總結", en: "✅ Logged! Today's Summary" },
  summaryTotalCal: { zh: "🔥 今日總熱量", en: "🔥 Total Calories" },
  summaryTotalPro: { zh: "🥩 今日蛋白質", en: "🥩 Total Protein" },
  summaryTotalWater: { zh: "💧 今日水分", en: "💧 Total Water" },
  summaryHistCal: { zh: "🔥 當日總熱量", en: "🔥 Daily Calories" },
  summaryHistPro: { zh: "🥩 當日蛋白質", en: "🥩 Daily Protein" },
  summaryHistWater: { zh: "💧 當日水分", en: "💧 Daily Water" },
  summaryLoggedCount: { zh: "🍱 今日已記 {count} 餐：", en: "🍱 Logged {count} meals today:" },
  summaryHistLoggedCount: { zh: "🍱 該日已記 {count} 餐：", en: "🍱 Logged {count} meals on this date:" },
  summaryNoLogsToday: { zh: "今日尚未有飲食紀錄", en: "No meals logged yet today" },
  summaryNoLogsHist: { zh: "該日尚未有飲食紀錄", en: "No meals logged on this date" },
  summaryBtnManage: { zh: "📋 管理紀錄", en: "📋 Manage Logs" },
  summaryBtnManageToday: { zh: "📋 管理今日紀錄", en: "📋 Manage Today's Logs" },
  summaryBtnManageDate: { zh: "📋 管理 {date} 紀錄", en: "📋 Manage {date} Logs" },
  summaryBtnPickDate: { zh: "📅 查日期", en: "📅 Select Date" },
  summaryBtnWeeklyTrend: { zh: "📊 7 日週報", en: "📊 7-Day Trend" },

  // 7 日趨勢週報 (WeeklyTrendsFlex)
  weeklyHeaderTitle: { zh: "📈 過去 7 日飲食趨勢週報", en: "📈 7-Day Nutrition Trends" },
  weeklyHeaderSub: { zh: "科學化追蹤每日熱量與蛋白質達標率 🐼✨", en: "Science-backed tracking of daily calories & protein 🐼✨" },
  weeklyAvgCal: { zh: "🔥 7天平均熱量", en: "🔥 7-Day Avg Cal" },
  weeklyAvgPro: { zh: "🥩 7天平均蛋白質", en: "🥩 7-Day Avg Protein" },
  weeklyMetDays: { zh: "🎯 達標天數", en: "🎯 Met Target" },
  weeklyTargetCalLabel: { zh: "🎯 每日熱量目標：{cal} kcal (容許區間 70% ~ 115%)", en: "🎯 Calorie Target: {cal} kcal (Range: 70% ~ 115%)" },
  weeklyLegendGreen: { zh: "綠條：理想", en: "Green: Target" },
  weeklyLegendRed: { zh: "紅條：超標", en: "Red: Over" },
  weeklyLegendYellow: { zh: "黃條：偏低", en: "Yellow: Low" },
  weeklyLegendGray: { zh: "灰條：無紀錄", en: "Gray: No log" },
  weeklyTipSuccess: { zh: "這週表現非常穩定！飲食習慣正在紮實建立，繼續保持！💪", en: "Great consistency this week! Your healthy habit is solidifying, keep it up! 💪" },
  weeklyTipAdjust: { zh: "有幾天熱量起伏較大，別氣餒！多吃原形食物、維持水分攝取即可漸入佳境 🥗", en: "Calorie intake varied a bit this week. Focus on whole foods and hydration to stay on track! 🥗" },
  weeklyBtnManageMeals: { zh: "📋 管理紀錄", en: "📋 Manage Logs" },
  weeklyBtnDailySummary: { zh: "📊 今日總結", en: "📊 Daily Summary" },

  // 常用餐點 (Favorites)
  favHydrationTitle: { zh: "💧 喝水打卡站", en: "💧 Hydration Station" },
  favHydrationDesc: { zh: "點擊下方快速打卡補充今日水分：", en: "Quickly log your daily water intake:" },
  favWater250: { zh: "💧 +250ml 喝水", en: "💧 +250ml Water" },
  favWater500: { zh: "💧 +500ml 喝水", en: "💧 +500ml Water" },
  favWater700: { zh: "💧 +700ml 喝水", en: "💧 +700ml Water" },
  favWater1000: { zh: "💧 +1000ml 大瓶水", en: "💧 +1000ml Bottle" },
  favQuickLog: { zh: "⚡ 立即記錄", en: "⚡ Quick Log" },
  favDelete: { zh: "🗑️ 移除常用", en: "🗑️ Delete" },
  favAddTitle: { zh: "⭐ 新增自訂常用", en: "⭐ Add New Favorite" },
  favAddDesc: { zh: "輸入「加常用 雞胸肉 165卡 31蛋」快速新增常用餐點！", en: "Type 'Add fav Chicken Breast 165cal 31pro' to add!" },
  favAddedSuccess: { zh: "⭐ 已新增至常用餐點！", en: "⭐ Added to Favorites!" },
  favEmptyTip: { zh: "您目前尚未儲存常用餐點！\n記帳後點擊「存為常用」，即可一鍵秒速入帳 🐼", en: "You don't have any favorites yet!\nTap '⭐ Favorite' after logging to enable 1-tap tracking 🐼" },

  // 目標管理 (Goals)
  goalUpdatedTitle: { zh: "🎯 個人飲食目標已更新！", en: "🎯 Daily Nutrition Goals Updated!" },
  goalUpdatedSubtitle: { zh: "客製化科學營養規劃已生效", en: "Personalized nutrition plan active" },
  goalGuideTitle: { zh: "🎯 AI 體態目標自動推薦", en: "🎯 AI Goal Recommendations" },
  goalGuideSub: { zh: "不需要自己算熱量！告訴教練身材，AI 自動規劃", en: "No need to calculate calories! Share your stats, AI plans for you." },
  goalGuideBtnRecommend: { zh: "🪄 AI 推薦我的目標", en: "🪄 Recommend Goals for Me" },
  goalGuideBtnCustom: { zh: "✏️ 手動設定目標", en: "✏️ Custom Goals" },
  goalCurrentTitle: { zh: "🎯 目前每日飲食目標", en: "🎯 Current Daily Goals" },
  goalBtnChange: { zh: "✏️ 調整目標", en: "✏️ Adjust Goals" },

  // 餐點管理 (Meal Management)
  manageEmptyTitle: { zh: "🍱 尚未記錄任何餐點喔！", en: "🍱 No meals logged yet!" },
  manageEmptySub: { zh: "傳送照片或輸入菜名，熊貓教練幫您記錄！🐼", en: "Send a photo or type food name to log! 🐼" },
  manageCardTitle: { zh: "📋 飲食紀錄管理面板", en: "📋 Meal Log Management" },
  manageBtnEdit: { zh: "✏️ 修改", en: "✏️ Edit" },
  manageBtnDelete: { zh: "🗑️ 刪除", en: "🗑️ Delete" },

  // 快捷氣泡 (Quick Reply Multiplier & Actions)
  qrHalfPortion: { zh: "x0.5 (半份)", en: "x0.5 Half" },
  qrNormalPortion: { zh: "x1.0 (原份)", en: "x1.0 Normal" },
  qr1_5Portion: { zh: "x1.5 (1.5倍)", en: "x1.5 (1.5x)" },
  qrDoublePortion: { zh: "x2.0 (雙倍)", en: "x2.0 Double" },
  qrCustomPortion: { zh: "✏️ 自訂倍數", en: "✏️ Custom Portion" },
  qrHalveRice: { zh: "🍚 飯吃一半 (-50%)", en: "🍚 Halve Rice (-50%)" },
  qrFavorite: { zh: "⭐ 存為常用", en: "⭐ Favorite" },
  qrDailySummary: { zh: "📊 今日總結", en: "📊 Daily Summary" },
  qrAddWater500: { zh: "💧 +500ml 喝水", en: "+500ml Water" },
  qrCancelLog: { zh: "🗑️ 撤回這筆紀錄", en: "🗑️ Cancel Log" },
  qrGuide: { zh: "💡 全部功能", en: "💡 Guide" },
  qrPickDate: { zh: "📅 查日期", en: "📅 Pick Date" },

  // 語言設定 (Language Selection)
  langSelectTitle: { zh: "🌐 選擇偏好語言 / Language", en: "🌐 Select Language / 語言" },
  langSelectDesc: { zh: "選擇後所有 LINE 訊息與圖文選單將切換為該語言", en: "All LINE messages and menus will switch to this language." },
  langSwitchedEn: { zh: "Language switched to English! 🇺🇸\nYour Rich Menu and bot messages have been updated.", en: "Language switched to English! 🇺🇸\nYour Rich Menu and bot messages have been updated." },
  langSwitchedZh: { zh: "語言已切換為繁體中文！🇹🇼\n您的圖文選單與訊息回覆已同步更新。", en: "語言已切換為繁體中文！🇹🇼\n您的圖文選單與訊息回覆已同步更新。" },

  // 教練性格 (Persona Selection)
  personaSelectTitle: { zh: "🎭 選擇您的專屬熊貓教練性格", en: "🎭 Choose Your Panda Coach Persona" },
  personaActive: { zh: "✅ 目前使用中", en: "✅ Currently Active" },
  personaSwitchBtn: { zh: "立即切換", en: "Switch Now" },
  personaTsundereName: { zh: "傲嬌毒舌教練", en: "Tsundere Dietitian" },
  personaTsundereDesc: { zh: "口嫌體正直、犀利吐槽與專業飲食點評", en: "Sharp-tongued, sarcastic yet caring expert nutritionist" },
  personaGentleName: { zh: "治癒天使教練", en: "Gentle Healer" },
  personaGentleDesc: { zh: "溫柔體貼、溫馨鼓勵與同理陪伴", en: "Sweet, warm, supportive and encouraging partner" },
  personaHardcoreName: { zh: "魔鬼士官長", en: "Hardcore Drill Sgt" },
  personaHardcoreDesc: { zh: "熱血斯巴達、嚴格鞭策燃燒卡路里", en: "Fiery gym sergeant pushing you to burn every calorie" },

  // 新手與指令手冊 (Guide & Help)
  welcomeTitle: { zh: "🐣 歡迎加入 Daily Diet！", en: "🐣 Welcome to Daily Diet!" },
  welcomeSub: { zh: "您的個人 AI 飲食紀錄教練已就緒 🐼", en: "Your personal AI diet coach is ready 🐼" },
  guideTitle: { zh: "💡 Daily Diet 全功能使用指南", en: "💡 Daily Diet Feature Guide" },
  guideSub: { zh: "隨傳隨記、語意辨識、自訂目標與多國語言", en: "Photo logging, AI recognition, custom goals & dual language" }
};

/**
 * 取得多國語系字串
 * @param {string} key 字典鍵值
 * @param {string} lang 語言 ('zh' | 'en')
 * @param {Object} [params] 變數替換物件，例如 { count: 3, date: '2025-03-07' }
 * @returns {string} 本地化字串
 */
function t(key, lang, params) {
  const currentLang = (lang === 'en') ? 'en' : 'zh';
  const entry = I18N_DICT[key];
  let text = '';
  if (entry) {
    text = entry[currentLang] || entry['zh'] || key;
  } else {
    text = key;
  }
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(pKey => {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(params[pKey]));
    });
  }
  return text;
}

/**
 * 取得星期名稱 (週一~週日 或 Mon~Sun)
 * @param {Date|string|number} date 日期物件或字串
 * @param {string} lang 語言 ('zh' | 'en')
 * @returns {string} 星期縮寫
 */
function getDayOfWeekName(date, lang) {
  const isEn = lang === 'en';
  let dayIdx = 0;
  try {
    const d = (typeof date === 'string' || typeof date === 'number') ? new Date(date) : date;
    dayIdx = d.getDay(); // 0: Sun, 1: Mon, ...
  } catch (e) {
    dayIdx = 0;
  }
  const zhDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const enDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return isEn ? enDays[dayIdx] : zhDays[dayIdx];
}

/**
 * 取得餐點類別的多國語系名稱
 * @param {string} category 類別代碼 (breakfast, lunch, dinner, snack, water)
 * @param {string} lang 語言 ('zh' | 'en')
 * @returns {string} 包含 Emoji 的分類名稱
 */
function getCategoryLabel(category, lang) {
  const isEn = lang === 'en';
  const map = {
    'breakfast': { zh: '🍳 早餐', en: '🍳 Breakfast' },
    'lunch': { zh: '🍱 午餐', en: '🍱 Lunch' },
    'dinner': { zh: '🍲 晚餐', en: '🍲 Dinner' },
    'snack': { zh: '☕ 點心', en: '☕ Snack' },
    'water': { zh: '🚰 補水', en: '🚰 Water' }
  };
  if (category && map[category]) {
    return isEn ? map[category].en : map[category].zh;
  }
  return isEn ? '🍱 Meal' : '🍱 餐點';
}
