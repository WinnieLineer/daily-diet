const translations = {
  zh: {
    app_title: "DAILY DIET",
    today_record: "今日紀錄",
    history_record: "歷史紀錄",
    water: "飲水",
    add_water: "🚰 +250ml",
    items: "項",
    calories: "熱量",
    protein: "蛋白質",
    water_unit: "水分",
    save: "儲存",
    cancel: "取消",
    edit: "編輯",
    delete: "刪除",
    confirm_delete: "確定要刪除這筆紀錄嗎？",
    no_logs_today: "今天還沒有紀錄喔 🐼",
    food_detective: "覓食",
    ai_mode: "📸 AI",
    manual_mode: "✍️ 手動",
    upload_hint: "拍下或上傳食物照",
    ai_sub_hint: "讓 AI 幫你分析熱量！",
    photo_source: "📸 選擇照片來源",
    camera: "拍照模式",
    camera_sub: "開啟相機直接拍攝",
    gallery: "從相簿選擇",
    gallery_sub: "上傳手機內的照片",
    ai_calculating: "🔍 AI 正在神算中...",
    food_fact: "食物小知識",
    panda_roast: "熊貓嘴砲",
    save_record: "儲存紀錄",
    food_name: "食物名稱",
    food_placeholder: "例如：地瓜球、水煮雞胸...",
    manual_desc: "手動紀錄",
    weight_tracker: "體重紀錄",
    goal_settings: "目標設定",
    no_location: "未知地點",
    unknown: "未知",
    location: "地點",
    time: "時間",
    settings_goals: "目標設定",
    settings_language: "語言設定",
    settings_contact: "聯絡開發者",
    lang_zh: "繁體中文",
    lang_en: "English",
    contact_subject: "主旨",
    contact_message: "內容",
    contact_send: "送出信件",
    contact_hint: "您的意見對我非常重要！",
    goal_guide: "目標制定指南",
    guide_tdee: "🔥 每日熱量 (TDEE)",
    guide_protein: "🍖 蛋白質需求",
    guide_water: "💧 飲水建議",
    guide_footer: "※ 建議每兩週依體重變化微調目標",
    dashboard_title: "今日摘要",
    dashboard_calories: "熱量",
    dashboard_protein: "蛋白質",
    dashboard_water: "飲水",
    weight_tracker_title: "體重追蹤",
    weight_placeholder: "輸入體重",
    weight_no_data: "暫無數據，快來記錄第一次體重吧！",
  },
  en: {
    app_title: "DAILY DIET",
    today_record: "Today's Logs",
    history_record: "History Logs",
    water: "Water",
    add_water: "🚰 +250ml",
    items: "items",
    calories: "Calories",
    protein: "Protein",
    water_unit: "Water",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    confirm_delete: "Are you sure you want to delete this record?",
    no_logs_today: "No logs today 🐼",
    food_detective: "Food Detective",
    ai_mode: "📸 AI",
    manual_mode: "✍️ Manual",
    upload_hint: "Take or Upload Photo",
    ai_sub_hint: "Let AI analyze your meal!",
    photo_source: "📸 Choose photo source",
    camera: "Camera Mode",
    camera_sub: "Open camera and take a photo",
    gallery: "Choose from Gallery",
    gallery_sub: "Upload from your library",
    ai_calculating: "🔍 AI is calculating...",
    food_fact: "Food Fun Fact",
    panda_roast: "Panda Roast",
    save_record: "Save Record",
    food_name: "Food Name",
    food_placeholder: "e.g., Sweet potato balls, chicken breast...",
    manual_desc: "Manual Entry",
    weight_tracker: "Weight Tracker",
    goal_settings: "Goal Settings",
    no_location: "Unknown Location",
    unknown: "Unknown",
    location: "Location",
    time: "Time",
    settings_goals: "Goal Settings",
    settings_language: "Language",
    settings_contact: "Contact Developer",
    lang_zh: "繁體中文",
    lang_en: "English",
    contact_subject: "Subject",
    contact_message: "Message",
    contact_send: "Send Email",
    contact_hint: "Your feedback is very important to me!",
    goal_guide: "Goal Guide",
    guide_tdee: "🔥 Daily Calories (TDEE)",
    guide_protein: "🍖 Protein Needs",
    guide_water: "💧 Water Intake",
    guide_footer: "※ Adjust your goals every 2 weeks based on weight changes.",
    dashboard_title: "Daily Summary",
    dashboard_calories: "Calories",
    dashboard_protein: "Protein",
    dashboard_water: "Water",
    weight_tracker_title: "Weight Tracker",
    weight_placeholder: "Enter weight",
    weight_no_data: "No data yet, record your first weight!",
  }
};

let currentLang = null;

export const setLanguage = (lang) => {
  currentLang = lang;
  localStorage.setItem('daily_diet_lang', lang);
};

export const getLanguage = () => {
  if (currentLang) return currentLang;
  const saved = localStorage.getItem('daily_diet_lang');
  if (saved) {
    currentLang = saved;
    return saved;
  }
  const lang = navigator.language || navigator.userLanguage;
  currentLang = lang.startsWith('zh') ? 'zh' : 'en';
  return currentLang;
};

export const t = (key) => {
  const lang = getLanguage();
  return translations[lang][key] || key;
};
