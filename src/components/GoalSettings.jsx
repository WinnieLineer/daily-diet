import React, { useState, useEffect } from 'react';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db, calculateStreak } from '../db';
import { Settings, Sparkles, X, Target, Check, Database, Download, Upload, Globe, Calculator, User, Zap, Info, RotateCcw, LayoutGrid, MapPin, AlertCircle, ChevronRight, History, Loader2, Clock, MessageSquare, Copy, Eye, EyeOff, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, getLanguage, setLanguage } from '../lib/translations';
import { APP_VERSION } from '../lib/constants';
import { uploadToGist, downloadFromGist, getBackupInfo, getCurrentGistId, setGistId } from '../lib/gistService';
import { PandaSticker } from './PandaStickers';


const VERSION_HISTORY = [
  { version: '2.4.0', date: '2026-06-05', features: [t('v240_f1'), t('v240_f2')] },
  { version: '2.2.0', date: '2026-05-26', features: [t('v220_f1'), t('v220_f2'), t('v220_f3')] },
  { version: '2.1.2', date: '2026-05-19', features: [t('v212_f1')] },
  { version: '2.1.1', date: '2026-05-18', features: [t('v211_f1')] },
  { version: '2.1.0', date: '2026-05-17', features: [t('v210_f1'), t('v210_f2'), t('v210_f3')] },
  { version: '2.0.1', date: '2026-05-07', features: [t('v201_f1'), t('v201_f2'), t('v201_f3')] },
  { version: '2.0.0', date: '2026-05-06', features: [t('v200_f1'), t('v200_f2'), t('v200_f3'), t('v200_f4')] },
  { version: '1.9.0', date: '2026-05-05', features: [t('v190_f1'), t('v190_f2'), t('v190_f3'), t('v190_f4')] },
  { version: '1.8.4', date: '2026-05-04', features: [t('v184_f1'), t('v184_f2'), t('v184_f3')] },
  { version: '1.8.2', date: '2026-04-29', features: ['PWA 安裝引導系統 📱', 'iOS/Android 專屬安裝教學', '可自訂提示出現頻率'] },
  { version: '1.8.1', date: '2026-04-29', features: ['資料管理本地儲存警告 ⚠️', 'UI 配色與對比優化', '份量輸入體驗改進', '嘴砲區塊全面展開'] },
  { version: '1.8.0', date: '2026-04-29', features: ['個人化名稱系統 🐼', '設定區全面進化', 'AI 嘴砲區塊', '移除通知優化效能', '全新水杯圖示'] },
  { version: '1.7.19', date: '2026-04-20', features: ['AI 辨識穩定性優化', '歷史趨勢圖表改進', '多語系支援優化'] },
  { version: '1.7.0', date: '2026-04-10', features: ['常用紀錄功能', '自動地點標記', '智慧建議計算機'] },
  { version: '1.6.5', date: '2026-03-25', features: ['體重追蹤系統', '飲食分析日誌', '深色模式優化'] },
  { version: '1.5.0', date: '2026-03-10', features: ['全新 Neo-brutalism UI', '熊貓營養師登場'] }
];

const GoalSettings = ({ onGoalsUpdated, onWatchTutorial, onLanguageChanged, userName, onSetUserName, onToggleLayoutEdit, isEditingLayout, pwaPrompt, onPwaPromptUsed, initialTab = 'profile' }) => {
  // 誠實商店銀行帳戶設定 (在此修改您的收款帳戶資訊即可！)
  const BANK_INFO = {
    bankName: "台新銀行",
    bankCode: "812",
    accountNumber: "910-10-123456-700", // 顯示格式 (帶分節號)
    rawAccount: "91010123456700",      // 複製格式 (純數字)
    accountHolder: "林XX"
  };

  const [goals, setGoals] = useState({ calories: 2000, protein: 100, water: 2500, fasting_enabled: false, fasting_start: '12:00', fasting_end: '20:00', show_carbs_fat: false, carbs: 200, fat: 60 });
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [contactForm, setContactForm] = useState({ subject: t('feedback_subject'), message: '' });
  const [newName, setNewName] = useState(userName || '');
  const [locationStatus, setLocationStatus] = useState('unknown');
  const [apiKey, setApiKey] = useState('');
  const [githubPat, setGithubPat] = useState(localStorage.getItem('github_pat') || '');
  const [copiedGistId, setCopiedGistId] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [calc, setCalc] = useState({ height: 170, weight: 70, age: 25, gender: 'male', activity: 1.375, goal: 'maintain' });
  const [stats, setStats] = useState({ localSize: 0, cloudSize: 0, cloudTime: null, loading: false });
  const [gistIdInput, setGistIdInput] = useState(getCurrentGistId() || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGithubPat, setShowGithubPat] = useState(false);

  // 誠實支持商店擴展狀態
  const [hasCrown, setHasCrown] = useState(localStorage.getItem('panda_sponsor_crown') === 'true');
  const [hasStickers, setHasStickers] = useState(localStorage.getItem('panda_stickers_unlocked') === 'true');
  const [activeSticker, setActiveSticker] = useState(() => localStorage.getItem('panda_active_sticker') || '');
  const [selectedQr, setSelectedQr] = useState(null);

  // 飲控里程碑與頭銜貼紙狀態
  const [currentStreak, setCurrentStreak] = useState(0);
  const [activeTitle, setActiveTitle] = useState(() => localStorage.getItem('panda_active_title') || '');
  const [hasPersonas, setHasPersonas] = useState(localStorage.getItem('panda_persona_unlocked') === 'true');
  const [activePersona, setActivePersona] = useState(() => localStorage.getItem('panda_active_persona') || 'tsundere');

  const handleSelectTitle = (title) => {
    if (activeTitle === title) {
      localStorage.removeItem('panda_active_title');
      setActiveTitle('');
      window.dispatchEvent(new CustomEvent('panda-title-updated'));
    } else {
      localStorage.setItem('panda_active_title', title);
      setActiveTitle(title);
      window.dispatchEvent(new CustomEvent('panda-title-updated'));
    }
  };

  const isEn = getLanguage() === 'en';

  const shopText = {
    title: isEn ? "Conscience Fuel Store" : "良心燃料商店",
    subtitle: isEn ? "SUPPORT SERVER & API COSTS" : "資助伺服器與 AI 額度開銷",
    desc1: isEn
      ? "Daily Diet is built with a no-login, no-ad, 100% free ethos. However, high-speed AI image recognition & data backup incur ongoing server and API token costs."
      : "Daily Diet 是一款堅持無登入、無強制廣告、無付費牆的獨立 App。然而，高精度的 AI 影像辨識與雲端同步會產生真實的伺服器與 API 燃料開銷。",
    desc2: isEn
      ? "We are incredibly grateful for your companionship and support. If this app helps you on your health and diet journey, feel free to support its daily operations based on your usage to refuel our servers and feed Coach Panda some delicious bamboo! 🐼🎋"
      : "我們非常感謝有您的陪伴與支持。若這款 App 確實為您的健康飲控帶來了幫助，歡迎依照您的用量支持它的日常運作，為熊貓教練補充一些美味竹子與伺服器燃料！🐼🎋",

    // Pricing Cards
    card1Title: isEn ? "AI Recognition Support" : "AI 辨識燃料罐",
    card1Desc: isEn ? "Sponsor 200 high-speed AI recognitions" : "贊助 200 次 AI 辨識燃料",
    card1Unit: isEn ? "NTD" : "元",
    card2Title: isEn ? "Panda Lover" : "溫馨補給包",
    card2Desc: isEn ? "Cover server costs for 1 month" : "資助教練一個月伺服器開銷",
    card2Unit: isEn ? "NTD" : "元",
    card3Title: isEn ? "Lifetime Hero" : "尊榮大罐頭",
    card3Desc: isEn ? "Keep Daily Diet alive & growing!" : "超值支持！為教練補滿一年燃料",
    card3Unit: isEn ? "NTD" : "元",
    popular: isEn ? "HOT" : "熱門 🌟",

    // Payment Section Title
    channels: isEn ? "💳 HONEST SUPPORT CHANNELS (TAP QR TO ZOOM)" : "💳 誠實支持管道 (點擊圖片可放大掃碼)",
    linebank: isEn ? "LINE Bank" : "LINE Bank (連線商業銀行)",
    linebankCode: isEn ? "Code: 824 · Project Account" : "代碼: 824 · 專案支持帳戶",
    ctbc: isEn ? "CTBC Bank" : "中國信託 (CTBC BANK)",
    ctbcCode: isEn ? "Code: 822 · Account: 174533815287" : "中信代碼: 822 · 帳號: 174-53381528-7",
    ctbcPay: isEn ? "CTBC Pay" : "中信付款 (CTBC Pay)",
    ctbcPayDesc: isEn ? "Tap to Copy & Open APP 📱" : "點選複製並啟動網銀 APP 📱",
    jkopay: isEn ? "JKOPAY" : "街口支付 (JKOPAY)",
    jkopayCode: isEn ? "Code: 396 · Account: 904720058" : "街口代碼: 396 · 帳號: 904720058",
    verified: isEn ? "Verified 🐼" : "已驗證 🐼",
    copyAccount: isEn ? "📋 Copy Account" : "📋 複製帳號",
    openLine: isEn ? "💬 Open LINE" : "💬 開啟 LINE",
    openJko: isEn ? "🐷 Open JKO" : "🐷 開啟街口",
    copiedAlert: isEn
      ? "📋 Account copied to clipboard! Panda Coach thanks you for your support 🐼✨"
      : "📋 帳號已複製！熊貓教練非常感謝您的溫馨支持 🐼✨",

    // Crown section
    crownTitle: isEn ? "Coach Panda's Honor Crown" : "熊貓教練的榮譽皇冠",
    crownSubtitle: isEn ? "Exclusive Unlock for Supporters" : "贊助支持者專屬解鎖區",
    crownDesc: isEn
      ? "Supporters who sponsor coach's fuel can wear a shiny golden Honor Crown! Operating on a self-serve system, if you supported us, click to wear it proudly!"
      : "支持教練特製補給罐頭或咖啡的贊助者，可以在這裡戴上象徵榮譽的黃金皇冠！我們採用自助解鎖設計，如果您已完成支持，請光榮地解鎖它！",
    crownActive: isEn ? "👑 Crown Active! (Click to hide)" : "👑 已戴上皇冠 (點擊收起)",
    crownInactive: isEn ? "✨ 自助解鎖榮譽皇冠 👑" : "✨ 自助解鎖榮譽皇冠 👑",
    crownToastRemove: isEn ? "Honor crown packed away. Coach is always here! 🎋" : "已收起榮譽皇冠，熊貓教練隨時歡迎您的支持 🎋",
    crownOath: isEn
      ? "🎋 A Warm Message from Coach Panda\n\n\"Thank you so much for your support! Your kind contribution keeps this ad-free, login-free home alive and kicking!\"\n\nReady to put on the Golden Honor Crown?"
      : "🎋 熊貓教練的溫馨小卡\n\n「非常感謝您的支持！您的溫馨補給是我們持續運作的最大動力，讓我們能繼續為您的健康把關！」\n\n準備好戴上榮譽黃金皇冠了嗎？",
    crownToastUnlock: isEn
      ? "🎉 Congratulations! The Golden Crown is now shining on Coach Panda's head! Go to the home screen to check it out! 👑🐼✨"
      : "🎉 恭喜！榮譽黃金皇冠已成功戴在熊貓教練頭上！\n快回主畫面看看戴著皇冠的可愛教練吧 👑🐼✨",

    // Sticker section
    stickerTitle: isEn ? "Exclusive Panda Sticker Book" : "限定熊貓紀念貼紙簿",
    stickerSubtitle: isEn ? "Interactive Mascot Stickers" : "贊助支持者專屬超萌貼紙",
    stickerDesc: isEn
      ? "For conscience fuel store supporters! Unlock 5 adorable 3D-style stickers. Tap any sticker to paste it directly onto Coach Panda on the main screen (tap again to remove)! Self-serve unlock 🎋"
      : "支持良心燃料商店的贊助者專屬！解鎖 5 款超萌的立體限量紀念貼紙，點選任何一張貼紙，即可直接貼在主畫面的熊貓教練身上（再次點選即可拿掉），讓教練戴著貼紙陪您一起做飮控日記！採用自助解鎖設計 🎋",
    sticker1Label: isEn ? "Crown Master" : "皇冠霸主",
    sticker1Text: isEn ? "👑🐼✨ [Panda: Today, I am the ultimate calories controller!]" : "👑🐼✨ [熊貓教練：今天也是自律的熱量掌控者！]",
    sticker2Label: isEn ? "Happy Eating" : "幸福爆吃",
    sticker2Text: isEn ? "🐼🎋❤️ [Panda: Eat well to have energy for healthy fat loss!]" : "🐼🎋❤️ [熊貓教練：吃飽飽才有力氣健康減脂！]",
    sticker3Label: isEn ? "Elegant Sir" : "優雅紳士",
    sticker3Text: isEn ? "🐼☕🧐 [Panda: Had my coffee. Now my reviews are even sharper!]" : "🐼☕🧐 [熊貓教練：喝了咖啡，毒舌銳評更犀利！]",
    sticker4Label: isEn ? "Get Buffed" : "熱血爆肌",
    sticker4Text: isEn ? "🐼💪🔥 [Panda: No excuses! Get moving and burn those calories!]" : "🐼💪🔥 [熊貓教練：不要藉口！動起來燃燒熱量！]",
    sticker5Label: isEn ? "Cheat Meal" : "放縱偷吃",
    sticker5Text: isEn ? "🐼🍕🤫 [Panda: Shh! This cheat meal is fully approved by coach!]" : "🐼🍕🤫 [熊貓教練：嘘！這餐是教練特許的放縱餐！]",

    stickerActive: isEn ? "🎁 Sticker Book Unlocked (Click to hide)" : "🎁 已收起貼紙簿 (點擊封存)",
    stickerInactive: isEn ? "✨ 自助解鎖限定貼紙簿 🎁" : "✨ 自助解鎖限定貼紙簿 🎁",
    stickerLockTip: isEn ? "🔒 This sticker is locked! Tap \"Unlock Custom Sticker Book\" below to access 🎋" : "🔒 此紀念貼紙尚未解鎖！請點選下方「自助解鎖限定貼紙簿」解鎖 🎋",
    stickerCopied: isEn ? "🎉 Sticker applied to Coach Panda!" : "🎉 紀念貼紙已成功貼在熊貓教練身上囉！",
    stickerToastUnlock: isEn ? "🎉 Success! The 5 custom 3D Panda stickers are unlocked! Tap any sticker to paste it directly onto Coach Panda! 🐼✨" : "🎉 恭喜！5 款超萌的「限定熊貓表情包 / 紀念貼紙」已成功解鎖！\n點選任何一張貼紙，即可直接貼在主畫面的熊貓教練身上囉 🐼✨",
    stickerToastRemove: isEn ? "Sticker book packed away. Come back anytime! 🎋" : "已封存限定貼紙簿，隨時歡迎您的溫馨支持 🎋",

    // Lightbox
    bankHolderName: isEn ? "Shih-Ting Lin" : "林詩婷",
    verifiedAccountBadge: isEn ? "Verified Supporter Account 🐼" : "【已驗證專案支持帳戶】",
    conscienceStoreTitleBadge: isEn ? "Daily Diet Conscience Store 🎋" : "【每日飲食良心商店】",
    closeWindow: isEn ? "Close 🐼" : "關閉視窗 🐼"
  };

  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.local') ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.') ||
    import.meta.env.DEV ||
    !import.meta.env.VITE_GROK_KEY;

  useEffect(() => {
    fetchGoals();
    checkLocationPermission();
    refreshStats();
    calculateStreak().then(s => setCurrentStreak(s)).catch(() => {});
  }, []);

  useEffect(() => {
    const handleTitleChange = () => {
      setActiveTitle(localStorage.getItem('panda_active_title') || '');
    };
    window.addEventListener('panda-title-updated', handleTitleChange);
    return () => window.removeEventListener('panda-title-updated', handleTitleChange);
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleOpenSettings = (e) => {
      setIsOpen(true);
      if (e.detail && e.detail.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  const refreshStats = async () => {
    setStats(prev => ({ ...prev, loading: true }));
    try {
      // Local Size
      const dietLogs = (await db.dietLogs.toArray()).map(({ image, ...rest }) => rest);
      const weightLogs = await db.weightLogs.toArray();
      const settings = await db.settings.toArray();
      const favorites = await db.favorites.toArray();
      const localBlob = new Blob([JSON.stringify({ dietLogs, weightLogs, settings, favorites })]);
      const localSize = localBlob.size;

      // Cloud Size (Always check Gist if ID exists)
      let cloudSize = 0;
      let cloudTime = null;
      const info = await getBackupInfo();
      if (info) {
        cloudSize = parseInt(info.size || '0');
        cloudTime = info.modifiedTime;
      }
      setStats({ localSize, cloudSize, cloudTime, loading: false });
    } catch (err) {
      console.error("Stats failed", err);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };


  const checkLocationPermission = () => {
    if ("geolocation" in navigator) {
      if (localStorage.getItem('location_granted') === 'true') setLocationStatus('granted');
      else setLocationStatus('denied');
    }
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => { localStorage.setItem('location_granted', 'true'); setLocationStatus('granted'); },
        () => { localStorage.setItem('location_granted', 'false'); setLocationStatus('denied'); }
      );
    }
  };

  const fetchGoals = async () => {
    const cal = await db.settings.get('calorie_goal');
    const pro = await db.settings.get('protein_goal');
    const wat = await db.settings.get('water_goal');
    const fEn = await db.settings.get('fasting_enabled');
    const fSt = await db.settings.get('fasting_start');
    const fEnTime = await db.settings.get('fasting_end');
    const showCarbs = await db.settings.get('show_carbs_fat');
    const carbsGoal = await db.settings.get('carbs_goal');
    const fatGoal = await db.settings.get('fat_goal');

    setGoals({
      calories: cal ? cal.value : 2000,
      protein: pro ? pro.value : 100,
      water: wat ? wat.value : 2500,
      fasting_enabled: fEn ? fEn.value : false,
      fasting_start: fSt ? fSt.value : '12:00',
      fasting_end: fEnTime ? fEnTime.value : '20:00',
      show_carbs_fat: showCarbs ? showCarbs.value : false,
      carbs: carbsGoal ? carbsGoal.value : 200,
      fat: fatGoal ? fatGoal.value : 60
    });
    const ak = await db.settings.get('user_api_key');
    if (ak) setApiKey(ak.value);
  };

  const saveGoals = async () => {
    try {
      const parsedCal = Number(goals.calories);
      const parsedPro = Number(goals.protein);
      const parsedWat = Number(goals.water);
      const parsedCarb = Number(goals.carbs);
      const parsedFat = Number(goals.fat);

      await db.settings.put({ key: 'calorie_goal', value: isNaN(parsedCal) ? 2000 : parsedCal });
      await db.settings.put({ key: 'protein_goal', value: isNaN(parsedPro) ? 100 : parsedPro });
      await db.settings.put({ key: 'water_goal', value: isNaN(parsedWat) ? 2500 : parsedWat });
      await db.settings.put({ key: 'fasting_enabled', value: !!goals.fasting_enabled });
      await db.settings.put({ key: 'fasting_start', value: goals.fasting_start || '12:00' });
      await db.settings.put({ key: 'fasting_end', value: goals.fasting_end || '20:00' });
      await db.settings.put({ key: 'show_carbs_fat', value: !!goals.show_carbs_fat });
      await db.settings.put({ key: 'carbs_goal', value: isNaN(parsedCarb) ? 200 : parsedCarb });
      await db.settings.put({ key: 'fat_goal', value: isNaN(parsedFat) ? 60 : parsedFat });
      
      if (isLocal) {
        await db.settings.put({ key: 'user_api_key', value: apiKey || '' });
      }
      
      setIsOpen(false);
      if (onGoalsUpdated) {
        onGoalsUpdated();
      }
    } catch (error) {
      console.error("Failed to save goals:", error);
      alert("儲存目標時發生錯誤，請重試！\n錯誤原因: " + error.message);
    }
  };

  const calculateSuggestion = () => {
    const bmr = (10 * Number(calc.weight)) + (6.25 * Number(calc.height)) - (5 * Number(calc.age)) + (calc.gender === 'male' ? 5 : -161);
    const tdee = bmr * Number(calc.activity);
    let suggestedCals = tdee;
    if (calc.goal === 'lose') suggestedCals -= 500;
    if (calc.goal === 'recomp') suggestedCals -= 200;
    if (calc.goal === 'gain') suggestedCals += 300;
    let suggestedPro = Number(calc.weight) * (calc.goal === 'recomp' ? 2.2 : calc.goal === 'lose' ? 2.0 : 1.8);

    // Suggest Carbs and Fat values symmetrically
    const suggestedFat = (suggestedCals * 0.25) / 9;
    const suggestedCarb = (suggestedCals - (suggestedPro * 4) - (suggestedFat * 9)) / 4;

    setGoals({
      ...goals,
      calories: Math.round(suggestedCals),
      protein: Math.round(suggestedPro),
      water: Math.round(Number(calc.weight) * 35),
      carbs: Math.round(suggestedCarb),
      fat: Math.round(suggestedFat)
    });
    setShowCalculator(false);
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    if (onLanguageChanged) onLanguageChanged();
    onGoalsUpdated();
  };

  const handleCloudBackup = async () => {
    if (getCurrentGistId() && !confirm(t('backup_confirm'))) return;
    setSyncStatus('syncing');
    try {
      const data = {
        dietLogs: (await db.dietLogs.toArray()).map(({ image, ...rest }) => ({ ...rest, image: null })),
        weightLogs: await db.weightLogs.toArray(),
        settings: await db.settings.toArray(),
        favorites: await db.favorites.toArray(),
        localStorage: {
          user_name: localStorage.getItem('user_name'),
          app_layout: localStorage.getItem('app_layout'),
          onboarding_seen: localStorage.getItem('onboarding_seen'),
          last_seen_version: localStorage.getItem('last_seen_version'),
          location_granted: localStorage.getItem('location_granted')
        }
      };
      await uploadToGist(data);
      setGistIdInput(getCurrentGistId() || '');
      setSyncStatus('success');
      refreshStats();
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      alert(err.message);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleCloudRestore = async () => {
    if (!getCurrentGistId()) {
      alert(t('no_gist_backup') || "No Gist ID found. Please set it in Data tab.");
      return;
    }
    if (!confirm(t('restore_confirm'))) return;
    setSyncStatus('syncing');
    try {
      const data = await downloadFromGist();
      if (!data) { alert(t('no_cloud_backup')); setSyncStatus('error'); return; }
      await db.transaction('rw', db.dietLogs, db.weightLogs, db.settings, db.favorites, async () => {
        await db.dietLogs.clear(); await db.weightLogs.clear(); await db.settings.clear(); await db.favorites.clear();
        if (data.dietLogs) await db.dietLogs.bulkAdd(data.dietLogs.map(({ id, ...r }) => r));
        if (data.weightLogs) await db.weightLogs.bulkAdd(data.weightLogs.map(({ id, ...r }) => r));
        if (data.settings) await db.settings.bulkAdd(data.settings);
        if (data.favorites) await db.favorites.bulkAdd(data.favorites.map(({ id, ...r }) => r));
      });
      if (data.localStorage) {
        Object.entries(data.localStorage).forEach(([key, value]) => { if (value !== null) localStorage.setItem(key, value); });
      }
      setSyncStatus('success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      alert(err.message);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleManualGistIdSave = () => {
    if (gistIdInput.trim()) {
      setGistId(gistIdInput.trim());
      refreshStats();
      alert(t('gist_id_saved') || "Gist ID saved!");
    }
  };

  return (
    <div className="relative">
      <NeoButton
        data-settings-btn
        variant="white"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3"
      >
        <Settings size={20} />
      </NeoButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
            <motion.div
              className="relative bg-white border-4 border-black rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-neo flex flex-col max-h-[90vh] pointer-events-auto"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
            >
              {/* Modal Header */}
              <div className="p-4 border-b-4 border-black flex items-center justify-between bg-zinc-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-black text-white p-2 rounded-xl">
                    <Settings size={20} />
                  </div>
                  <h3 className="font-black italic text-lg leading-none uppercase tracking-tighter">{t('settings')}</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* User Header */}
              <div className="px-4 py-3 bg-white border-b-4 border-black border-dotted shrink-0">
                <div className="flex items-center gap-3 p-3 border-4 border-black rounded-2xl bg-zinc-50 shadow-neo-sm">
                  <div className="bg-black text-white p-2 rounded-xl shrink-0">
                    <Database size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-[10px] truncate uppercase">{getCurrentGistId() ? "GIST BACKUP ACTIVE" : "NO CLOUD BACKUP"}</div>
                    <div className="text-[8px] font-bold text-zinc-400 truncate uppercase tracking-widest">{getCurrentGistId() ? `ID: ${getCurrentGistId()}` : t('backup_desc')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleCloudBackup} disabled={syncStatus === 'syncing'} className="p-2 rounded-lg border-2 border-black bg-white hover:bg-emerald-400 active:scale-90">
                      <Upload size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={handleCloudRestore} disabled={syncStatus === 'syncing'} className="p-2 rounded-lg border-2 border-black bg-white hover:bg-amber-400 active:scale-90">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex p-2 gap-1 bg-zinc-100 overflow-x-auto no-scrollbar border-b-4 border-black shrink-0">
                {[
                  { id: 'profile', icon: User, label: t('settings_profile') },
                  { id: 'goals', icon: Target, label: t('settings_goals') },
                  { id: 'fasting', icon: Clock, label: t('fasting_mode') },
                  { id: 'shop', icon: Heart, label: t('settings_shop') || '良心小舖' },
                  { id: 'data', icon: Database, label: t('settings_data') },
                  { id: 'feedback', icon: MessageSquare, label: t('settings_contact') },
                  { id: 'appinfo', icon: Info, label: t('settings_about') }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center min-w-[65px] flex-1 p-2 rounded-xl border-2 transition-all ${activeTab === tab.id ? 'bg-black text-white border-black scale-105' : 'bg-transparent text-zinc-400 border-transparent hover:text-black'}`}>
                    <tab.icon size={18} />
                    <span className="text-[8px] font-black mt-1 uppercase tracking-tight">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className="overflow-y-auto p-4 sm:p-6 flex-1 custom-scrollbar">
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{t('your_name')}</label>
                      <div className="flex gap-2">
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 bg-white border-4 border-black p-3 rounded-2xl font-black italic shadow-neo-xs outline-none" />
                        <button onClick={() => onSetUserName(newName)} className="bg-black text-white px-6 rounded-2xl font-black italic active:scale-95">{t('save')}</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{t('settings_language')}</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ id: 'zh', name: '中文' }, { id: 'en', name: 'English' }].map(lang => (
                          <button key={lang.id} onClick={() => handleLanguageChange(lang.id)} className={`p-3 rounded-xl border-4 font-black italic text-sm transition-all ${getLanguage() === lang.id ? 'bg-black text-white border-black shadow-neo-sm' : 'bg-white border-zinc-100'}`}>
                            {lang.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* 飲控里程碑貼紙 */}
                    <div className="space-y-3 border-4 border-black p-4 rounded-[2rem] bg-zinc-50 shadow-neo-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black italic text-sm">🏆 飲控里程碑與頭銜貼紙</h4>
                        <span className="bg-orange-50 text-orange-600 px-2.5 py-0.5 rounded-full border border-orange-200 text-[10px] font-black italic">
                          連續記錄 {currentStreak} 天 🔥
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-zinc-400 leading-tight">
                        達標即可解鎖專屬頭銜貼紙，佩戴於熊貓教練名牌旁，快去打卡吧！
                      </p>
                      <div className="space-y-2.5 mt-2">
                        {[
                          { days: 3, title: "自律小萌新 🥗", desc: "連續打卡 3 天" },
                          { days: 7, title: "爆卡剋星 ⚔️", desc: "連續打卡 7 天" },
                          { days: 30, title: "飲控得道仙人 👑", desc: "連續打卡 30 天" }
                        ].map(item => {
                          const isUnlocked = currentStreak >= item.days;
                          const isWorn = activeTitle === item.title;
                          return (
                            <div 
                              key={item.days} 
                              className={`flex items-center justify-between p-3 border-2 border-black rounded-2xl transition-all ${
                                isWorn ? 'bg-accent/15 border-2 border-black' : isUnlocked ? 'bg-white' : 'bg-zinc-100/50 opacity-60'
                              }`}
                            >
                              <div className="flex flex-col text-left">
                                <span className={`font-black text-xs ${isUnlocked ? 'text-black' : 'text-zinc-400'}`}>
                                  {item.title}
                                </span>
                                <span className="text-[9px] font-bold text-zinc-400 mt-0.5">
                                  {item.desc} {isUnlocked ? '🔓 已解鎖' : `🔒 差 ${item.days - currentStreak} 天`}
                                </span>
                              </div>
                              {isUnlocked ? (
                                <button
                                  type="button"
                                  onClick={() => handleSelectTitle(item.title)}
                                  className={`px-3 py-1.5 rounded-xl border-2 border-black font-black text-[9px] italic transition-all active:scale-95 shadow-neo-sm-flat ${
                                    isWorn 
                                      ? 'bg-black text-accent shadow-none border-black' 
                                      : 'bg-white text-black hover:bg-zinc-50'
                                  }`}
                                >
                                  {isWorn ? '卸下頭銜' : '佩戴頭銜'}
                                </button>
                              ) : (
                                <span className="text-[9px] font-black text-zinc-400 italic">未解鎖</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <button onClick={() => { onToggleLayoutEdit(); setIsOpen(false); }} className={`w-full flex items-center gap-4 p-4 border-4 border-black rounded-2xl shadow-neo-sm transition-all ${isEditingLayout ? 'bg-black text-white' : 'bg-white'}`}>
                      <LayoutGrid size={20} />
                      <span className="font-black italic text-sm">{t('edit_layout')}</span>
                    </button>
                    <button
                      onClick={() => {
                        localStorage.setItem('panda_position', JSON.stringify({ x: 0, y: 0 }));
                        window.dispatchEvent(new CustomEvent('reset-panda-position'));
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 border-4 border-black rounded-2xl shadow-neo-sm transition-all bg-white hover:bg-rose-50 active:scale-95"
                    >
                      <RotateCcw size={20} className="text-rose-500" />
                      <span className="font-black italic text-sm">{t('reset_panda')}</span>
                    </button>
                  </div>
                )}

                {activeTab === 'goals' && (
                  <div className="space-y-6">
                    <div className="bg-accent/10 border-4 border-black p-4 rounded-2xl flex items-center justify-between shadow-neo-sm">
                      <div>
                        <h4 className="font-black italic text-sm">{t('smart_goal')}</h4>
                        <p className="text-[10px] font-bold text-zinc-400">{t('formula_tdee')}</p>
                      </div>
                      <button onClick={() => setShowCalculator(!showCalculator)} className="p-2 rounded-xl shadow-neo-xs border-2 border-black bg-white"><Calculator size={20} /></button>
                    </div>
                    {showCalculator && (
                      <div className="p-4 border-4 border-black rounded-[2rem] bg-white space-y-4 shadow-neo-sm text-left">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1 text-left">{t('height')} (cm)</label>
                            <input
                              type="number"
                              placeholder="170"
                              value={calc.height}
                              onChange={e => setCalc({ ...calc, height: e.target.value })}
                              className="w-full border-2 border-black p-2.5 rounded-xl font-bold bg-zinc-50 text-left outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1 text-left">{t('weight')} (kg)</label>
                            <input
                              type="number"
                              placeholder="70"
                              value={calc.weight}
                              onChange={e => setCalc({ ...calc, weight: e.target.value })}
                              className="w-full border-2 border-black p-2.5 rounded-xl font-bold bg-zinc-50 text-left outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1 text-left">{t('age')}</label>
                            <input
                              type="number"
                              placeholder="25"
                              value={calc.age}
                              onChange={e => setCalc({ ...calc, age: e.target.value })}
                              className="w-full border-2 border-black p-2.5 rounded-xl font-bold bg-zinc-50 text-left outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1 text-left">{t('gender')}</label>
                            <select
                              value={calc.gender}
                              onChange={e => setCalc({ ...calc, gender: e.target.value })}
                              className="w-full border-2 border-black p-2.5 rounded-xl font-bold bg-zinc-50 outline-none text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%23000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                            >
                              <option value="male">{t('male')}</option>
                              <option value="female">{t('female')}</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1 text-left">{t('activity_level')}</label>
                          <select
                            value={calc.activity}
                            onChange={e => setCalc({ ...calc, activity: Number(e.target.value) })}
                            className="w-full border-2 border-black p-2.5 rounded-xl font-bold bg-zinc-50 outline-none text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%23000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                          >
                            <option value={1.2}>{t('activity_sedentary')}</option>
                            <option value={1.375}>{t('activity_light')}</option>
                            <option value={1.55}>{t('activity_moderate')}</option>
                            <option value={1.725}>{t('activity_active')}</option>
                            <option value={1.9}>{t('activity_athlete')}</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1 text-left">{t('fitness_goal')}</label>
                          <select
                            value={calc.goal}
                            onChange={e => setCalc({ ...calc, goal: e.target.value })}
                            className="w-full border-2 border-black p-2.5 rounded-xl font-bold bg-zinc-50 outline-none text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%23000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                          >
                            <option value="maintain">{t('goal_maintain')}</option>
                            <option value="lose">{t('goal_lose')}</option>
                            <option value="recomp">{t('goal_recomp')}</option>
                            <option value="gain">{t('goal_gain')}</option>
                          </select>
                        </div>

                        <button onClick={calculateSuggestion} className="w-full bg-black text-white py-3 rounded-xl font-black italic shadow-neo-xs active:scale-[0.98] transition-transform">{t('apply_suggestion')}</button>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('calories')}</label>
                        <input type="number" value={goals.calories} onChange={e => setGoals({ ...goals, calories: e.target.value })} className="w-full border-2 border-black p-3 rounded-xl font-black text-xl" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('protein')}</label>
                        <input type="number" value={goals.protein} onChange={e => setGoals({ ...goals, protein: e.target.value })} className="w-full border-2 border-black p-3 rounded-xl font-black text-xl" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('water_goal')} (ml)</label>
                        <input type="number" value={goals.water} onChange={e => setGoals({ ...goals, water: e.target.value })} className="w-full border-2 border-black p-3 rounded-xl font-black text-xl" />
                      </div>

                      {/* Carb & Fat Toggle Switch */}
                      <div className="flex items-center justify-between p-4 bg-zinc-50 border-4 border-black rounded-2xl shadow-neo-sm mt-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🥑</span>
                          <div className="text-left">
                            <span className="font-black italic text-sm">{t('settings_show_carbs_fat')}</span>
                            <div className="text-[9px] font-bold text-zinc-400 mt-0.5">{t('show_carbs_fat_hint')}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGoals({ ...goals, show_carbs_fat: !goals.show_carbs_fat })}
                          className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors shrink-0 ${goals.show_carbs_fat ? 'bg-black' : 'bg-zinc-200'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white border-2 border-black absolute top-0.5 transition-all ${goals.show_carbs_fat ? 'left-6' : 'left-0.5'}`} />
                        </button>
                      </div>

                      {/* Carb & Fat Goal Inputs */}
                      {goals.show_carbs_fat && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="grid grid-cols-2 gap-4 mt-2 overflow-hidden"
                        >
                          <div>
                            <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1 text-left">{t('carbs_goal')}</label>
                            <input
                              type="number"
                              value={goals.carbs}
                              onChange={e => setGoals({ ...goals, carbs: e.target.value })}
                              className="w-full border-2 border-black p-3 rounded-xl font-black text-xl bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1 text-left">{t('fat_goal')}</label>
                            <input
                              type="number"
                              value={goals.fat}
                              onChange={e => setGoals({ ...goals, fat: e.target.value })}
                              className="w-full border-2 border-black p-3 rounded-xl font-black text-xl bg-white"
                            />
                          </div>
                        </motion.div>
                      )}

                      {isLocal && (
                        <div className="pt-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('settings_api_key')}</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={apiKey}
                              onChange={e => setApiKey(e.target.value)}
                              style={{ WebkitTextSecurity: showApiKey ? 'none' : 'disc' }}
                              className="w-full border-2 border-black p-3 pr-12 rounded-xl font-bold text-sm bg-zinc-50 focus:bg-white transition-all"
                              placeholder="gsk_..."
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
                            >
                              {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          <div className="mt-1 flex items-start gap-1 ml-1">
                            <Info size={10} className="text-zinc-400 mt-0.5" />
                            <span className="text-[8px] font-bold text-zinc-400 leading-tight">{t('api_key_hint')}</span>
                          </div>
                        </div>
                      )}
                      <NeoButton variant="black" className="w-full h-16 rounded-2xl shadow-neo" onClick={saveGoals}>{t('save')}</NeoButton>
                    </div>
                  </div>
                )}

                {activeTab === 'fasting' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-zinc-50 border-4 border-black rounded-2xl shadow-neo-sm">
                      <div className="flex items-center gap-3">
                        <Clock className="text-black" size={24} />
                        <span className="font-black italic">{t('fasting_mode')}</span>
                      </div>
                      <button onClick={() => setGoals({ ...goals, fasting_enabled: !goals.fasting_enabled })} className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors ${goals.fasting_enabled ? 'bg-black' : 'bg-zinc-200'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white border-2 border-black absolute top-0.5 transition-all ${goals.fasting_enabled ? 'left-6' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {goals.fasting_enabled && (
                      <div className="flex items-center justify-center gap-3 bg-white border-2 border-dashed border-black/10 p-4 rounded-2xl">
                        <div className="flex-1 max-w-[120px] space-y-1">
                          <label className="text-[9px] font-black uppercase text-zinc-400 block text-center">{t('fasting_start')}</label>
                          <input type="time" value={goals.fasting_start} onChange={e => setGoals({ ...goals, fasting_start: e.target.value })} className="w-full border-2 border-black p-1.5 rounded-xl font-bold text-xs bg-zinc-50 text-center" />
                        </div>
                        <div className="text-black font-black mt-4">~</div>
                        <div className="flex-1 max-w-[120px] space-y-1">
                          <label className="text-[9px] font-black uppercase text-zinc-400 block text-center">{t('fasting_end')}</label>
                          <input type="time" value={goals.fasting_end} onChange={e => setGoals({ ...goals, fasting_end: e.target.value })} className="w-full border-2 border-black p-1.5 rounded-xl font-bold text-xs bg-zinc-50 text-center" />
                        </div>
                      </div>
                    )}
                    <NeoButton variant="black" className="w-full h-16 rounded-2xl shadow-neo" onClick={saveGoals}>{t('save')}</NeoButton>
                  </div>
                )}

                {activeTab === 'shop' && (
                  <div className="space-y-6 text-left animate-fade-in">
                    {/* Header Intro Card - Elegant Warm Sunset Clay Style */}
                    <div className="p-6 border-4 border-black rounded-[2.5rem] bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100 shadow-neo relative overflow-hidden group">
                      {/* 3D coin background decoration */}
                      <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-300/20 border-4 border-dashed border-amber-500/30 rounded-full flex items-center justify-center font-black text-2xl text-amber-500/40 select-none transform rotate-12 transition-transform duration-700 group-hover:rotate-45" />

                      <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="w-14 h-14 bg-black border-4 border-black rounded-2xl flex items-center justify-center shadow-neo-sm transform -rotate-3 hover:rotate-3 transition-transform duration-300">
                          <span className="text-3xl animate-bounce">🪙</span>
                        </div>
                        <div>
                          <h3 className="font-black italic text-2xl tracking-tight leading-none uppercase text-black">{shopText.title}</h3>
                          <span className="text-[9px] font-black tracking-widest uppercase text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full border border-amber-300 mt-1 inline-block">{shopText.subtitle}</span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-zinc-700 leading-relaxed relative z-10">
                        {shopText.desc1}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-zinc-700 leading-relaxed mt-2.5 relative z-10">
                        {shopText.desc2}
                      </p>
                    </div>

                    {/* Pricing Cards Grid - 3D Punched Ticket Style */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { title: shopText.card1Title, price: '30', unit: shopText.card1Unit, desc: shopText.card1Desc, color: 'from-emerald-50 to-teal-100/50', accent: 'bg-emerald-400' },
                        { title: shopText.card2Title, price: '50', unit: shopText.card2Unit, desc: shopText.card2Desc, color: 'from-rose-50 to-pink-100/50', accent: 'bg-rose-400' },
                        { title: shopText.card3Title, price: '150', unit: shopText.card3Unit, desc: shopText.card3Desc, color: 'from-amber-50 to-yellow-100/50', accent: 'bg-amber-400', popular: true }
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className={`relative p-3.5 border-4 border-black rounded-[1.8rem] bg-gradient-to-br ${item.color} shadow-neo flex flex-col justify-between text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden group`}
                        >
                          {item.popular && (
                            <div className="absolute top-0 right-0 bg-black text-white text-[7px] font-black uppercase tracking-widest px-2.5 py-1 rounded-bl-xl border-l-2 border-b-2 border-black z-10 flex items-center gap-0.5">
                              {shopText.popular}
                            </div>
                          )}
                          <div className="space-y-1 relative z-10">
                            {/* Ticket punched notches on left and right */}
                            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-black rounded-full" />
                            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-black rounded-full" />

                            <div className="font-black text-[9px] uppercase tracking-widest text-zinc-500">{item.title}</div>
                            <div className="flex items-baseline justify-center gap-0.5">
                              <span className="font-black text-3xl italic tracking-tight text-black">{item.price}</span>
                              <span className="text-[10px] font-black text-black/60">{item.unit}</span>
                            </div>
                          </div>
                          <div className="text-[8px] font-extrabold text-zinc-500 mt-4 leading-tight border-t-2 border-black/10 pt-2.5">
                            {item.desc}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Payment Sections */}
                    <div className="space-y-4">
                      {/* Section Title */}
                      <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">
                        {shopText.channels}
                      </div>

                      {/* Bank Transfer Box - Luxury Black Card Style */}
                      <div className="p-1 border-4 border-black rounded-[2rem] bg-black shadow-neo relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none transition-transform duration-1000 group-hover:translate-x-full" />

                        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-[1.8rem] space-y-4 relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shadow-inner">
                                <span className="text-sm">💳</span>
                              </div>
                              <div className="text-left">
                                <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">{shopText.linebank}</div>
                                <div className="text-[8px] font-bold text-zinc-500">{shopText.linebankCode}</div>
                              </div>
                            </div>
                            <div className="w-9 h-7 rounded-md bg-gradient-to-br from-zinc-300 via-zinc-400 to-zinc-500 border border-zinc-600 relative overflow-hidden shadow-inner flex flex-col justify-around p-1 opacity-80">
                              <div className="h-[1px] bg-zinc-800/40 w-full" />
                              <div className="h-[1px] bg-zinc-800/40 w-full" />
                              <div className="h-[1px] bg-zinc-800/40 w-full" />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-3 border-y border-zinc-800/60">
                            <div className="space-y-1 text-left">
                              <div className="text-xs font-black text-zinc-300 tracking-wider flex items-center gap-1.5">
                                LINE Bank
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold border border-zinc-700">824</span>
                              </div>
                              <div className="text-xl font-black italic tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] font-mono selection:bg-amber-400 selection:text-black">
                                111000977323
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText("111000977323");
                                alert(shopText.copiedAlert);
                              }}
                              className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase px-4 py-3 rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] border-2 border-black shrink-0 mt-1 sm:mt-0"
                            >
                              <Copy size={12} strokeWidth={3} /> {isEn ? "Copy" : "複製帳號"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* CTBC / Jkopay Grid - Polaroid Card Style */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* CTBC Pay Polaroid */}
                        <div
                          onClick={() => setSelectedQr({ title: shopText.ctbcPay, src: import.meta.env.BASE_URL + 'ctbc_qr.png' })}
                          className="p-4 border-4 border-black rounded-3xl bg-white shadow-neo flex flex-col items-center text-center transform -rotate-1 hover:rotate-0 hover:-translate-y-1 transition-all duration-300 relative group/line cursor-pointer"
                        >
                          <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-zinc-200 border border-zinc-400" />
                          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-zinc-200 border border-zinc-400" />

                          <div className="flex items-center gap-1.5 mb-3 bg-teal-50 px-3 py-1 rounded-full border-2 border-black shadow-neo-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#008687] animate-pulse" />
                            <h4 className="font-black text-[9px] text-[#008687] tracking-wider">{shopText.ctbcPay}</h4>
                          </div>

                          <div className="w-28 h-28 bg-zinc-50 border-4 border-black rounded-2xl p-2 flex items-center justify-center relative overflow-hidden shadow-inner group-hover/line:scale-[1.03] transition-transform">
                            <img
                              src={import.meta.env.BASE_URL + 'ctbc_qr.png'}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                              className="w-full h-full object-contain filter contrast-125"
                              alt="CTBC Pay QR"
                            />
                            <div className="hidden absolute inset-0 flex flex-col items-center justify-center p-2 text-zinc-400 text-center">
                              <span className="text-xl mb-1">📲</span>
                              <span className="text-[7px] font-black leading-tight text-zinc-500">CTBC QR</span>
                            </div>
                          </div>
                          <p className="text-[8px] font-black text-zinc-500 mt-3 leading-relaxed">
                            {shopText.ctbcPayDesc}
                          </p>
                        </div>

                        {/* Jkos Polaroid */}
                        <div
                          onClick={() => setSelectedQr({ title: shopText.jkopay, src: import.meta.env.BASE_URL + 'jkopay_qr.jpg' })}
                          className="p-4 border-4 border-black rounded-3xl bg-white shadow-neo flex flex-col items-center text-center transform rotate-1 hover:rotate-0 hover:-translate-y-1 transition-all duration-300 relative group/jkos cursor-pointer"
                        >
                          <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-zinc-200 border border-zinc-400" />
                          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-zinc-200 border border-zinc-400" />

                          <div className="flex items-center gap-1.5 mb-3 bg-rose-50 px-3 py-1 rounded-full border-2 border-black shadow-neo-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <h4 className="font-black text-[9px] text-rose-800 tracking-wider">{shopText.jkopay}</h4>
                          </div>

                          <div className="w-28 h-28 bg-zinc-50 border-4 border-black rounded-2xl p-2 flex items-center justify-center relative overflow-hidden shadow-inner group-hover/jkos:scale-[1.03] transition-transform">
                            <img
                              src={import.meta.env.BASE_URL + 'jkopay_qr.jpg'}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                              className="w-full h-full object-contain filter contrast-125"
                              alt="街口支付 QR"
                            />
                            <div className="hidden absolute inset-0 flex flex-col items-center justify-center p-2 text-zinc-400 text-center">
                              <span className="text-xl mb-1">📲</span>
                              <span className="text-[7px] font-black leading-tight text-zinc-500">JKOPAY QR</span>
                            </div>
                          </div>
                          <p className="text-[8px] font-black text-zinc-500 mt-3 leading-relaxed">
                            {isEn ? "Tap JKOPAY QR" : "點選放大街口二維碼"}
                          </p>
                        </div>
                      </div>

                      {/* Sponsor Crown Honesty Unlock Panel */}
                      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-4 border-black rounded-2xl shadow-neo-xs space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-400 rounded-xl border-2 border-black flex items-center justify-center text-xl shadow-neo-xs-black">
                            👑
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-black text-xs">{shopText.crownTitle}</div>
                            <div className="text-[9px] font-bold text-amber-700">{shopText.crownSubtitle}</div>
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-600 font-bold leading-relaxed text-left">
                          {shopText.crownDesc}
                        </p>

                        <div className="flex gap-2">
                          {hasCrown ? (
                            <button
                              onClick={() => {
                                localStorage.removeItem('panda_sponsor_crown');
                                setHasCrown(false);
                                window.dispatchEvent(new CustomEvent('panda-crown-updated'));
                                alert(shopText.crownToastRemove);
                              }}
                              className="w-full bg-zinc-200 text-zinc-600 border-2 border-zinc-400 py-2 rounded-xl text-xs font-black italic active:scale-95 transition-transform animate-fade-in"
                            >
                              {shopText.crownActive}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const confirmUnlock = window.confirm(shopText.crownOath);
                                if (confirmUnlock) {
                                  localStorage.setItem('panda_sponsor_crown', 'true');
                                  setHasCrown(true);
                                  window.dispatchEvent(new CustomEvent('panda-crown-updated'));
                                  alert(shopText.crownToastUnlock);
                                }
                              }}
                              className="w-full bg-amber-400 text-black border-2 border-black py-2 rounded-xl text-xs font-black italic active:scale-95 shadow-neo-xs-black transition-transform flex items-center justify-center gap-1.5"
                            >
                              {shopText.crownInactive}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Limited Edition stickers & Emojis Unlock Panel */}
                      <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-4 border-black rounded-2xl shadow-neo-xs space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-400 rounded-xl border-2 border-black flex items-center justify-center text-xl shadow-neo-xs-black">
                            🎁
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-black text-xs">{shopText.stickerTitle}</div>
                            <div className="text-[9px] font-bold text-emerald-700">{shopText.stickerSubtitle}</div>
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-600 font-bold leading-relaxed text-left">
                          {shopText.stickerDesc}
                        </p>

                        {/* Stickers Grid */}
                        <div className="grid grid-cols-5 gap-1.5 py-1">
                          {[
                            { id: 'crown', emoji: '🐼👑', label: shopText.sticker1Label, text: shopText.sticker1Text },
                            { id: 'bamboo', emoji: '🐼🎋', label: shopText.sticker2Label, text: shopText.sticker2Text },
                            { id: 'coffee', emoji: '🐼☕', label: shopText.sticker3Label, text: shopText.sticker3Text },
                            { id: 'muscles', emoji: '🐼💪', label: shopText.sticker4Label, text: shopText.sticker4Text },
                            { id: 'pizza', emoji: '🐼🍕', label: shopText.sticker5Label, text: shopText.sticker5Text }
                          ].map((sticker, idx) => {
                            const isActive = activeSticker === sticker.emoji;
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (!hasStickers) {
                                    alert(shopText.stickerLockTip);
                                    return;
                                  }
                                  const currentActive = localStorage.getItem('panda_active_sticker');
                                  if (currentActive === sticker.emoji) {
                                    localStorage.removeItem('panda_active_sticker');
                                    setActiveSticker('');
                                    alert(isEn ? "Sticker removed 🎋" : "已將貼紙收起囉 🎋");
                                  } else {
                                    localStorage.setItem('panda_active_sticker', sticker.emoji);
                                    setActiveSticker(sticker.emoji);
                                    alert(isEn 
                                      ? "🎉 Sticker pasted onto Coach Panda! Go back to the main screen to check it out! 🐼✨"
                                      : "🎉 已將紀念貼紙貼在熊貓教練身上囉！快回到主畫面看看吧 🐼✨"
                                    );
                                  }
                                  window.dispatchEvent(new CustomEvent('panda-stickers-updated'));
                                }}
                                className={`relative p-2.5 rounded-2xl border-2 border-black flex flex-col items-center justify-center transition-all duration-300 ${
                                  hasStickers
                                    ? isActive
                                      ? 'bg-amber-100 ring-2 ring-amber-400 scale-105 shadow-neo-sm rotate-3 cursor-pointer'
                                      : 'bg-white hover:-translate-y-1 hover:rotate-2 shadow-neo-xs cursor-pointer active:scale-95'
                                    : 'bg-zinc-100 filter grayscale opacity-60 border-dashed cursor-not-allowed'
                                }`}
                              >
                                <div className="w-10 h-10 mb-1 select-none flex items-center justify-center">
                                  {hasStickers ? (
                                    <PandaSticker id={sticker.id} className="w-full h-full" />
                                  ) : (
                                    <span className="text-2xl filter grayscale opacity-45">{sticker.emoji}</span>
                                  )}
                                </div>
                                <span className="text-[7px] font-black text-zinc-500 whitespace-nowrap">{sticker.label}</span>
                                
                                {/* Lock Overlay */}
                                {!hasStickers && (
                                  <div className="absolute inset-0 bg-black/5 rounded-xl flex items-center justify-center text-[10px]">
                                    🔒
                                  </div>
                                )}

                                {/* Bouncing Active Star Sparkle */}
                                {hasStickers && isActive && (
                                  <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-emerald-400 border border-black rounded-full flex items-center justify-center text-[8px] font-black shadow-neo-xs-black animate-bounce z-10">
                                    ✨
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex gap-2">
                          {hasStickers ? (
                            <button
                              onClick={() => {
                                localStorage.removeItem('panda_stickers_unlocked');
                                localStorage.removeItem('panda_active_sticker');
                                setHasStickers(false);
                                setActiveSticker('');
                                window.dispatchEvent(new CustomEvent('panda-stickers-updated'));
                                alert(shopText.stickerToastRemove);
                              }}
                              className="w-full bg-zinc-200 text-zinc-600 border-2 border-zinc-400 py-2 rounded-xl text-xs font-black italic active:scale-95 transition-transform"
                            >
                              {shopText.stickerActive}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const confirmUnlock = window.confirm(shopText.stickerDesc);
                                if (confirmUnlock) {
                                  localStorage.setItem('panda_stickers_unlocked', 'true');
                                  setHasStickers(true);
                                  window.dispatchEvent(new CustomEvent('panda-stickers-updated'));
                                  alert(shopText.stickerToastUnlock);
                                }
                              }}
                              className="w-full bg-emerald-400 text-black border-2 border-black py-2 rounded-xl text-xs font-black italic active:scale-95 shadow-neo-xs-black transition-transform flex items-center justify-center gap-1.5"
                            >
                              {shopText.stickerInactive}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 熊貓多重性格切換 */}
                    <div className="p-5 border-4 border-black rounded-[2.2rem] bg-white shadow-neo relative overflow-hidden text-left">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎭</span>
                          <div>
                            <h4 className="font-black italic text-sm text-black">熊貓教練多重性格切換 (付費解鎖)</h4>
                            <span className="text-[8px] font-black tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full inline-block mt-0.5 uppercase">
                              SUPPORT SPONSORS ONLY
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-zinc-500 leading-relaxed">
                          支持良心燃料商店的贊助者專屬！解鎖三款完全不同的 AI 性格，教練在進行食物辨識或日常評語時的口氣將天差地遠！採自助解鎖 🎋
                        </p>

                        {/* Character Grid */}
                        <div className="grid grid-cols-3 gap-2 py-1">
                          {[
                            { id: 'tsundere', emoji: '😡', title: '毒舌傲嬌', desc: '口嫌體正直，專挑毛病吐槽' },
                            { id: 'gentle', emoji: '😇', title: '溫柔甜心', desc: '貼心小天使，用愛包容你的胃' },
                            { id: 'hardcore', emoji: '💪', title: '鐵血教練', desc: '健身硬漢，咆哮督促絕不妥協' }
                          ].map(char => {
                            const isActive = activePersona === char.id;
                            return (
                              <button
                                key={char.id}
                                type="button"
                                onClick={() => {
                                  if (!hasPersonas) {
                                    alert("🔒 此多重性格切換尚未解鎖！請點選下方「自助解鎖限定性格」進行支持 🎋");
                                    return;
                                  }
                                  localStorage.setItem('panda_active_persona', char.id);
                                  setActivePersona(char.id);
                                  window.dispatchEvent(new CustomEvent('panda-persona-updated'));
                                  alert(`已切換為專屬性格：${char.emoji} ${char.title}！`);
                                }}
                                className={`relative p-2 border-2 border-black rounded-2xl text-center flex flex-col items-center justify-between min-h-[95px] transition-all hover:bg-zinc-50 ${
                                  isActive && hasPersonas ? 'bg-indigo-50/70 border-2 border-black ring-2 ring-indigo-500/20' : 'bg-white'
                                }`}
                              >
                                <span className="text-xl">{char.emoji}</span>
                                <span className="font-black text-[10px] text-black mt-1 leading-none">{char.title}</span>
                                <span className="text-[7px] font-extrabold text-zinc-400 leading-tight mt-1.5">{char.desc}</span>
                                
                                {/* Lock overlay */}
                                {!hasPersonas && (
                                  <div className="absolute inset-0 bg-black/5 rounded-xl flex items-center justify-center text-[10px]">
                                    🔒
                                  </div>
                                )}

                                {/* Active Star Sparkle */}
                                {hasPersonas && isActive && (
                                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-400 border border-black rounded-full flex items-center justify-center text-[7px] font-black shadow-neo-xs animate-bounce z-10">
                                    ✨
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Action Unlock Button */}
                        <div className="flex gap-2">
                          {hasPersonas ? (
                            <button
                              type="button"
                              onClick={() => {
                                localStorage.removeItem('panda_persona_unlocked');
                                localStorage.setItem('panda_active_persona', 'tsundere');
                                setHasPersonas(false);
                                setActivePersona('tsundere');
                                window.dispatchEvent(new CustomEvent('panda-persona-updated'));
                                alert("已封存多重性格切換，教練恢復為預設傲嬌性格 🎋");
                              }}
                              className="w-full bg-zinc-200 text-zinc-600 border-2 border-zinc-400 py-2 rounded-xl text-xs font-black italic active:scale-95 transition-transform"
                            >
                              🎁 性格切換已開啟 (點擊封存)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const confirmUnlock = window.confirm("🎋 熊貓教練多重性格自助解鎖小卡\n\n「感謝你支持開發者的真實 API 燃料開銷！解鎖後即可任意切換 3 款完全不同的 AI 對話性格！」\n\n準備好開啟多重性格了嗎？");
                                if (confirmUnlock) {
                                   localStorage.setItem('panda_persona_unlocked', 'true');
                                   setHasPersonas(true);
                                   window.dispatchEvent(new CustomEvent('panda-persona-updated'));
                                   alert("🎉 恭喜！「多重性格切換」已自助解鎖成功！快點選上方頭像性格，體驗不同性格教練的精彩對話吧 🐼⚡");
                                }
                              }}
                              className="w-full bg-indigo-400 text-black border-2 border-black py-2 rounded-xl text-xs font-black italic active:scale-95 shadow-neo-xs transition-transform flex items-center justify-center gap-1.5"
                            >
                              ✨ 自助解鎖限定性格 🎁
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Thank You Note */}
                    <div className="text-center font-black italic text-xs text-zinc-500 pt-2">
                      「您的支持，是讓這隻熊貓教練繼續為您服務的最大動力！🎋❤️」
                    </div>
                  </div>
                )}

                {activeTab === 'data' && (
                  <div className="space-y-6">
                    {/* Data Stats Card */}
                    <div className="bg-zinc-50 border-4 border-black rounded-3xl p-5 shadow-neo-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Database size={18} className="text-black" />
                        <h4 className="font-black italic text-sm uppercase tracking-tighter">{t('data_stats_header')}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white border-2 border-black p-3 rounded-2xl">
                          <div className="text-[8px] font-black text-zinc-400 uppercase mb-1">{t('data_usage_local')}</div>
                          <div className="text-lg font-black italic">{(stats.localSize / 1024 / 1024).toFixed(2)} <span className="text-[10px]">MB</span></div>
                        </div>
                        <div className="bg-white border-2 border-black p-3 rounded-2xl">
                          <div className="text-[8px] font-black text-zinc-400 uppercase mb-1">{t('data_usage_cloud')}</div>
                          <div className="text-lg font-black italic">{(stats.cloudSize / 1024 / 1024).toFixed(2)} <span className="text-[10px]">MB</span></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 bg-white/50 p-3 rounded-xl border-2 border-dashed border-black/10">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} />
                          <span>{t('est_sync_time')
                            .replace('{min}', Math.max(2, Math.ceil(stats.localSize / 1024 / 1024 * 0.5)))
                            .replace('{max}', Math.max(5, Math.ceil(stats.localSize / 1024 / 1024 * 1.5)))}</span>
                        </div>
                        <button onClick={refreshStats} disabled={stats.loading} className="text-black hover:rotate-180 transition-transform">
                          <RotateCcw size={14} className={stats.loading ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={handleCloudBackup}
                        disabled={syncStatus === 'syncing'}
                        className="flex flex-col items-center gap-2 p-4 border-4 border-black rounded-2xl bg-emerald-50 hover:bg-emerald-100 shadow-neo-sm transition-all active:translate-y-0.5 disabled:opacity-50"
                      >
                        {syncStatus === 'syncing' ? <Loader2 size={24} className="text-emerald-600 animate-spin" /> : <Upload size={24} className="text-emerald-600" />}
                        <span className="text-[10px] font-black uppercase">{t('backup_to_gist') || "Backup to Gist"}</span>
                      </button>
                      <button
                        onClick={handleCloudRestore}
                        disabled={syncStatus === 'syncing'}
                        className="flex flex-col items-center gap-2 p-4 border-4 border-black rounded-2xl bg-amber-50 hover:bg-amber-100 shadow-neo-sm transition-all active:translate-y-0.5 disabled:opacity-50"
                      >
                        {syncStatus === 'syncing' ? <Loader2 size={24} className="text-amber-600 animate-spin" /> : <RotateCcw size={24} className="text-amber-600" />}
                        <span className="text-[10px] font-black uppercase">{t('restore_from_gist') || "Restore from Gist"}</span>
                      </button>
                    </div>

                    <div className="space-y-2 p-4 bg-zinc-50 border-4 border-black rounded-3xl">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                        {t('gist_id_label') || "GITHUB GIST ID"}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={gistIdInput}
                          onChange={e => setGistIdInput(e.target.value)}
                          placeholder="e.g. 1a2b3c4d5e6f..."
                          className="flex-1 bg-white border-4 border-black p-3 rounded-xl font-black italic text-xs shadow-neo-xs outline-none"
                        />
                        {getCurrentGistId() && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(getCurrentGistId());
                              setCopiedGistId(true);
                              setTimeout(() => setCopiedGistId(false), 2000);
                            }}
                            className={`px-3 rounded-xl border-4 border-black font-black italic text-xs active:scale-95 transition-colors ${copiedGistId ? 'bg-emerald-400 text-black' : 'bg-white text-black'
                              }`}
                            title="Copy Gist ID"
                          >
                            {copiedGistId ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={3} />}
                          </button>
                        )}
                        <button
                          onClick={handleManualGistIdSave}
                          className="bg-black text-white px-4 rounded-xl font-black italic text-xs active:scale-95"
                        >
                          {t('save')}
                        </button>
                      </div>
                      <p className="text-[8px] font-bold text-zinc-400 mt-1 ml-1 leading-tight">
                        {t('gist_id_hint') || "Backup creates this automatically. Manually paste here to sync on other devices."}
                      </p>
                    </div>

                    {isLocal && (
                      <>
                        <div className="space-y-2 pt-4 border-t-4 border-black border-dotted">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                            Grok API Key (Local)
                          </label>
                          <div className="flex gap-2 w-full">
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                style={{ WebkitTextSecurity: showApiKey ? 'none' : 'disc' }}
                                className="w-full bg-white border-4 border-black p-3 pr-10 rounded-xl font-bold text-xs shadow-neo-xs outline-none"
                                autoComplete="off"
                              />
                              <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
                              >
                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            <button
                              onClick={async () => {
                                await db.settings.put({ key: 'user_api_key', value: apiKey });
                                alert('API Key Saved');
                              }}
                              className="bg-black text-white px-4 rounded-xl font-black italic text-xs active:scale-95"
                            >
                              {t('save')}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t-4 border-black border-dotted">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                            GitHub PAT (Local Backup)
                          </label>
                          <div className="flex gap-2 w-full">
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                value={githubPat}
                                onChange={e => setGithubPat(e.target.value)}
                                style={{ WebkitTextSecurity: showGithubPat ? 'none' : 'disc' }}
                                className="w-full bg-white border-4 border-black p-3 pr-10 rounded-xl font-bold text-xs shadow-neo-xs outline-none"
                                autoComplete="off"
                              />
                              <button
                                type="button"
                                onClick={() => setShowGithubPat(!showGithubPat)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
                              >
                                {showGithubPat ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                localStorage.setItem('github_pat', githubPat);
                                alert('GitHub PAT Saved');
                              }}
                              className="bg-black text-white px-4 rounded-xl font-black italic text-xs active:scale-95"
                            >
                              {t('save')}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'feedback' && (
                  <div className="space-y-6">
                    <div className="p-6 bg-amber-50 border-4 border-black rounded-[2.5rem] shadow-neo-sm relative overflow-hidden">
                      <div className="relative z-10 space-y-4">
                        <div className="bg-black text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-neo-xs">
                          <Zap size={24} className="text-amber-400" />
                        </div>
                        <h4 className="font-black italic text-xl tracking-tighter uppercase leading-none">
                          {t('v201_feedback_title')}
                        </h4>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">{t('contact_subject')}</label>
                            <input
                              type="text"
                              value={contactForm.subject}
                              onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                              className="w-full bg-white border-4 border-black p-3 rounded-xl font-black italic text-sm shadow-neo-xs outline-none focus:bg-amber-100 transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">{t('contact_message')}</label>
                            <textarea
                              rows={4}
                              value={contactForm.message}
                              onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                              className="w-full bg-white border-4 border-black p-3 rounded-xl font-black italic text-sm shadow-neo-xs outline-none focus:bg-amber-100 transition-colors resize-none"
                              placeholder="..."
                            />
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            if (!contactForm.message.trim()) return;

                            // 🚀 WEB3FORMS SUBMISSION (Restored from user snippet)
                            try {
                              setSyncStatus('syncing');
                              const response = await fetch('https://api.web3forms.com/submit', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  access_key: '72d7f10c-b6c8-42f2-9c40-fc5fac45cad0',
                                  subject: `[Daily-Diet v${APP_VERSION}] ${contactForm.subject}`,
                                  message: contactForm.message,
                                  from_name: 'Daily Diet App User',
                                  device: navigator.userAgent
                                })
                              });
                              const data = await response.json();
                              if (data.success) {
                                alert(t('contact_success'));
                                setContactForm({ subject: t('feedback_subject'), message: '' });
                              } else {
                                throw new Error('Submission failed');
                              }
                            } catch (err) {
                              console.error("Feedback failed", err);
                              alert(t('contact_error'));
                            } finally {
                              setSyncStatus('idle');
                            }
                          }}
                          disabled={syncStatus === 'syncing'}
                          className="flex items-center justify-center gap-3 w-full bg-black text-white p-4 rounded-2xl font-black italic hover:bg-zinc-800 transition-all active:scale-95 shadow-neo-xs disabled:opacity-50"
                        >
                          {syncStatus === 'syncing' ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Check size={20} className="text-emerald-400" />
                          )}
                          {syncStatus === 'syncing' ? t('contact_sending') : t('contact_send')}
                        </button>
                      </div>
                      <div className="absolute -bottom-6 -right-6 opacity-10 rotate-12 pointer-events-none">
                        <MessageSquare size={120} className="text-black" />
                      </div>
                    </div>

                    {/* ☕ Ko-fi Support Card */}
                    <a
                      href="https://ko-fi.com/winnielinspace"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="relative p-5 bg-[#FF5E5B] border-4 border-black rounded-[2rem] shadow-neo overflow-hidden transition-transform active:scale-95 group-hover:-translate-y-1">
                        <div className="absolute -top-6 -right-6 text-[80px] opacity-10 rotate-12 pointer-events-none select-none">☕</div>
                        <div className="relative z-10 flex flex-col gap-3">
                          <div className="flex items-center gap-4">
                            <div className="shrink-0 w-14 h-14 bg-white border-4 border-black rounded-2xl flex items-center justify-center shadow-neo-xs text-2xl">
                              ☕
                            </div>
                            <div className="flex-1">
                              <p className="font-black italic text-white text-base uppercase tracking-tight leading-snug drop-shadow">
                                {t('kofi_title') || '請我喝杯咖啡！'}
                              </p>
                            </div>
                          </div>
                          <p className="text-white/95 text-[12px] font-bold leading-relaxed whitespace-pre-wrap">
                            {t('kofi_desc') || 'App 完全免費，你的支持讓開發者能繼續更新新功能 🐼'}
                          </p>
                          <div className="w-full bg-white border-4 border-black rounded-xl px-3 py-2.5 shadow-neo-xs text-center mt-1 active:scale-95 transition-transform">
                            <span className="font-black italic text-sm text-black uppercase">認養伺服器與開發者 ☕</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  </div>
                )}

                {activeTab === 'appinfo' && (
                  <div className="space-y-6">
                    <div className="p-4 bg-zinc-50 border-4 border-black rounded-2xl shadow-neo-sm text-center">
                      <h4 className="font-black italic mb-1">Daily Diet v{APP_VERSION}</h4>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">© 2026 Winnie Lin Space</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1 text-zinc-400"><History size={16} /><span className="text-[10px] font-black uppercase">{t('settings_version_history')}</span></div>
                      <div className="space-y-2">
                        {VERSION_HISTORY.map(v => (
                          <div key={v.version} className="p-3 border-2 border-black rounded-xl bg-white">
                            <div className="flex justify-between items-center mb-1"><span className="font-black text-xs italic">v{v.version}</span><span className="text-[8px] font-bold text-zinc-300">{v.date}</span></div>
                            <p className="text-[10px] font-bold text-zinc-500 leading-tight">{v.features.join(' · ')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-center gap-4 py-4 opacity-40">
                      <a href="./privacy.html" target="_blank" className="text-[10px] font-black uppercase underline">Privacy</a>
                      <a href="./terms.html" target="_blank" className="text-[10px] font-black uppercase underline">Terms</a>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Lightbox Modal */}
      {selectedQr && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-zoom-out animate-fade-in"
          onClick={() => setSelectedQr(null)}
        >
          <div
            className="relative bg-white border-4 border-black p-5 rounded-[2.5rem] max-w-sm w-full shadow-neo text-center flex flex-col items-center pointer-events-auto"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="font-black italic text-base mb-3 uppercase tracking-tight text-black">{selectedQr.title}</h4>
            <div className="relative w-full border-4 border-black rounded-[1.5rem] mb-3 bg-white shadow-neo-xs overflow-hidden">
              <img src={selectedQr.src} alt={selectedQr.title} className="w-full h-auto" />

              {/* LINE Pay: Censor Name "林詩婷" at bottom white card */}
              {selectedQr.src.includes('linepay') && (
                <div
                  className="absolute left-[20%] right-[20%] bottom-[31.5%] bg-white border-2 border-black rounded-xl py-1 px-2 font-black text-[10px] text-black shadow-sm select-none leading-none pointer-events-none"
                >
                  {shopText.verifiedAccountBadge}
                </div>
              )}
            </div>

            {/* JKO Pay Direct App Redirection Button */}
            {selectedQr.src.includes('jkopay') && (
              <div className="w-full space-y-2 mb-4">
                <div className="text-[10px] font-bold text-zinc-500 text-left bg-zinc-100 p-2.5 rounded-xl border border-zinc-200 leading-normal">
                  💡 街口帳號：<span className="font-mono font-black text-rose-600 select-all">904720058</span> (機構代碼: 396)<br />
                  已驗證專案支持帳戶。點選下方按鈕即可一鍵複製帳號，並自動為您跳轉啟動街口支付 APP 進行轉帳！
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("904720058");
                    alert("📋 街口帳號 904720058 已成功複製到剪貼簿！\n正在為您跳轉啟動街口支付 APP... 🐷✨");
                    
                    // Direct Deep Link
                    window.location.href = "jkos://transfer?to=904720058";
                    
                    // Fallback to JKO Web Page Launcher
                    setTimeout(() => {
                      window.open("https://www.jkopay.com/transfer?to=904720058", "_blank");
                    }, 500);
                  }}
                  className="w-full bg-[#D8232A] hover:bg-[#b81d22] text-white font-black text-xs py-3 rounded-2xl border-2 border-black flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-neo-xs-black cursor-pointer"
                >
                  📲 複製帳號並一鍵跳轉啟動街口
                </button>
              </div>
            )}

            {/* CTBC Bank Direct App Redirection Button */}
            {selectedQr.src.includes('ctbc') && (
              <div className="w-full space-y-2 mb-4">
                <div className="text-[10px] font-bold text-zinc-500 text-left bg-zinc-100 p-2.5 rounded-xl border border-zinc-200 leading-normal">
                  💡 中信帳號：<span className="font-mono font-black text-teal-700 select-all">174533815287</span> (銀行代碼: 822)<br />
                  已驗證專案支持帳戶。點選下方按鈕即可一鍵複製帳號，並自動為您啟動中國信託網銀 APP！
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("174533815287");
                    alert("📋 中信帳號 174533815287 已成功複製到剪貼簿！");
                  }}
                  className="w-full bg-[#008687] hover:bg-[#006e6f] text-white font-black text-xs py-3 rounded-2xl border-2 border-black flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-neo-xs-black cursor-pointer"
                >
                  📋 複製中信帳號
                </button>
              </div>
            )}

            <button
              onClick={() => setSelectedQr(null)}
              className="bg-black text-white px-6 py-2.5 rounded-2xl font-black italic text-xs active:scale-95 shadow-neo-xs transition-transform"
            >
              {shopText.closeWindow}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalSettings;
