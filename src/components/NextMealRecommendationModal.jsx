import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Check, Sparkles, Utensils, Flame, Dumbbell, Clock, Copy, ArrowRight, Share2 } from 'lucide-react';
import { db } from '../db';
import { t, getLanguage } from '../lib/translations';
import { getOrCreateClientId } from '../lib/syncService';
import { getCurrentGistId, uploadToGist } from '../lib/gistService';
import { createWebAIPayload } from '../lib/gemini';

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxmQC8f0NxOKRAIuLTSTVC-Vinf9lmU0cnb1akR5oKUEYD-3h7XjFV8Zm_LPkv_kdQo/exec';

export default function NextMealRecommendationModal({
  isOpen,
  onClose,
  summary = {},
  goals = {},
  recentLogs = [],
  onLogAdded,
  userName = ''
}) {
  const isEn = getLanguage() === 'en';
  const [loading, setLoading] = useState(false);
  const [recData, setRecData] = useState(null);
  const [loggingIdx, setLoggingIdx] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [copyToast, setCopyToast] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('auto');
  const [refreshSeed, setRefreshSeed] = useState(0);

  // 時段選項
  const periodTabs = useMemo(() => [
    { id: 'auto', label: t('period_auto') || '⚡ 智能時段' },
    { id: 'breakfast', label: t('period_breakfast') || '🍳 早餐' },
    { id: 'lunch', label: t('period_lunch') || '🍱 午餐' },
    { id: 'snack', label: t('period_snack') || '☕ 點心/補給' },
    { id: 'dinner', label: t('period_dinner') || '🍲 晚餐' },
    { id: 'latenight', label: t('period_latenight') || '🌙 宵夜' },
  ], []);

  // 計算今日缺額與用餐時段
  const calculateLocalStats = useCallback(() => {
    const targetCal = Number(goals.calories) || 2000;
    const targetPro = Number(goals.protein) || 100;
    const targetCarbs = Number(goals.carbs) || 200;
    const targetFat = Number(goals.fat) || 60;

    const consumedCal = Number(summary.calories) || 0;
    const consumedPro = Number(summary.protein) || 0;
    const consumedCarbs = Number(summary.carbs) || 0;
    const consumedFat = Number(summary.fat) || 0;

    const remCal = targetCal - consumedCal;
    const remPro = targetPro - consumedPro;
    const remCarbs = targetCarbs - consumedCarbs;
    const remFat = targetFat - consumedFat;

    const currentHour = new Date().getHours();
    let autoPeriod = isEn ? 'Dinner' : '晚餐';
    if (currentHour >= 5 && currentHour < 11) autoPeriod = isEn ? 'Breakfast' : '早餐';
    else if (currentHour >= 11 && currentHour < 14) autoPeriod = isEn ? 'Lunch' : '午餐';
    else if (currentHour >= 14 && currentHour < 17) autoPeriod = isEn ? 'Afternoon Snack' : '下午點心/補給';
    else if (currentHour >= 17 && currentHour < 21) autoPeriod = isEn ? 'Dinner' : '晚餐';
    else autoPeriod = isEn ? 'Late-Night Snack' : '宵夜/睡前補給';

    let displayPeriod = autoPeriod;
    if (selectedPeriod === 'breakfast') displayPeriod = isEn ? 'Breakfast' : '早餐';
    else if (selectedPeriod === 'lunch') displayPeriod = isEn ? 'Lunch' : '午餐';
    else if (selectedPeriod === 'snack') displayPeriod = isEn ? 'Afternoon Snack' : '下午點心/補給';
    else if (selectedPeriod === 'dinner') displayPeriod = isEn ? 'Dinner' : '晚餐';
    else if (selectedPeriod === 'latenight') displayPeriod = isEn ? 'Late-Night Snack' : '宵夜/睡前補給';

    return {
      period: displayPeriod,
      autoPeriod,
      consumed: { calories: consumedCal, protein: consumedPro, carbs: consumedCarbs, fat: consumedFat },
      remaining: { calories: remCal, protein: remPro, carbs: remCarbs, fat: remFat },
      goals: { calories: targetCal, protein: targetPro, carbs: targetCarbs, fat: targetFat }
    };
  }, [goals, summary, isEn, selectedPeriod]);

  // 本地規則備援生成 (支援多套菜色循環輪轉，斷網或 GAS 忙線時秒開)
  const generateLocalFallback = useCallback((seed = 0) => {
    const stats = calculateLocalStats();
    const remCal = stats.remaining.calories;
    const remPro = stats.remaining.protein;

    let coachComment = '';
    const activePersona = typeof localStorage !== 'undefined' ? (localStorage.getItem('panda_active_persona') || 'tsundere') : 'tsundere';
    
    if (activePersona === 'gentle') {
      coachComment = isEn
        ? "You've worked hard today! Pick a meal that nourishes your body with quality ingredients 💕"
        : "今天辛苦了！給身體挑選一份優質乾淨的餐點，好好善待自己吧 🐼🥰";
    } else if (activePersona === 'hardcore') {
      coachComment = isEn
        ? "Stay disciplined! Don't let cravings wipe out your daily progress! Lock in your protein! 🔥"
        : "目標就在眼前！給我乖乖補滿蛋白質，少看那些高油高糖的垃圾食物！🐼🔥";
    } else {
      coachComment = isEn
        ? (remPro > 20 ? "Hmph! You're still behind on protein! Eat a proper high-protein meal! 🐼" : "Don't think you can slack off just because calories look okay! Choose wisely! 🐼")
        : (remPro > 20 ? "哼！今天蛋白質明明還差那麼多，少給我吃甜點，乖乖把蛋白質補足！🐼" : "可別以為還有熱量額度就能亂吃炸物，給我選乾淨的原型食物！🐼");
    }

    // 豐富的多元菜色庫 (依據時段與種子輪轉)
    const mealPools = {
      breakfast: [
        [
          {
            tag: isEn ? "High Protein" : "超商經典高蛋白",
            dish_name: isEn ? "Sugar-free Rich Soy Milk + 2 Tea Eggs + Small Sweet Potato" : "光泉無糖濃豆漿 + 雙茶葉蛋 + 蒸地瓜(小)",
            calories: 360, protein: 32, carbs: 36, fat: 10,
            reason: isEn ? "32g high-absorption morning protein to boost metabolism." : "早晨極速補充 32g 優質純蛋白，搭配低 GI 複合碳水穩定供能！"
          },
          {
            tag: isEn ? "Energizing Breakfast" : "活力輕食選",
            dish_name: isEn ? "Smoked Chicken Salad Whole Wheat Toast + Black Coffee" : "燻雞生菜全麥三明治 + 美式黑咖啡 (少醬/不加美乃滋)",
            calories: 310, protein: 24, carbs: 32, fat: 8,
            reason: isEn ? "Light, whole-grain carbs with lean poultry for clear-headed focus." : "全麥原粒高纖維，燻雞純蛋白清爽無油，早晨提神不昏睡！"
          },
          {
            tag: isEn ? "Quick Probiotics" : "腸道順暢選",
            dish_name: isEn ? "Greek Yogurt Bowl with Mixed Berries & 15g Almonds" : "無糖希臘優格碗 (佐綜合藍莓 + 堅果一把)",
            calories: 270, protein: 22, carbs: 20, fat: 11,
            reason: isEn ? "Dense casein protein with antioxidant berries and healthy plant fats." : "高純度酪蛋白持久飽足，花青素抗氧化，早晨腸道極順暢！"
          }
        ],
        [
          {
            tag: isEn ? "Convenience Store" : "超商秒買選",
            dish_name: isEn ? "Subway 6-inch Turkey Breast Sandwich (Honey Mustard, No Mayo)" : "Subway 6 吋火雞胸肉堡 (全麥麵包/芥末醬/雙倍生菜)",
            calories: 340, protein: 28, carbs: 42, fat: 5,
            reason: isEn ? "Extremely lean, fresh vegetables with almost zero saturated fats." : "極致低脂純肉，海量蔬菜填滿膳食纖維，熱量僅 340 卡！"
          },
          {
            tag: isEn ? "Home Cooking" : "3分鐘快煎",
            dish_name: isEn ? "3 Scrambled Eggs with Tomato & 1 Slice Sourdough" : "蕃茄炒雙蛋 (微油) + 歐式酸種麵包 1 片",
            calories: 330, protein: 23, carbs: 26, fat: 14,
            reason: isEn ? "Rich lutein and high bioavailability egg protein for muscle maintenance." : "高生物價完整胺基酸與葉黃素，暖胃又兼顧高飽足！"
          },
          {
            tag: isEn ? "Protein Shake" : "極速趕上班",
            dish_name: isEn ? "Whey Protein Shake (1 Scoop) + 1 Medium Banana" : "金牌乳清蛋白飲 1 份 + 熟香蕉 1 根",
            calories: 230, protein: 26, carbs: 29, fat: 2,
            reason: isEn ? "Fast 30-second prep with rapid amino acid delivery into muscles." : "30秒快速搖勻帶出門，極速補滿蛋白質與天然果糖能量！"
          }
        ]
      ],
      lunch: [
        [
          {
            tag: isEn ? "Convenience Store" : "超商便利選",
            dish_name: isEn ? "Sous-vide Chicken Breast + 2 Tea Eggs + Sugar-free Soy Milk" : "7-11 舒肥雞胸肉 + 雙茶葉蛋 + 光泉無糖濃豆漿",
            calories: 390, protein: 46, carbs: 12, fat: 12,
            reason: isEn ? "Huge 46g protein hit under 400 kcal to rapidly shrink your protein gap!" : "蛋白質高達 46g，熱量不到 400 大卡，超商 2 分鐘買齊，極速補滿缺口！"
          },
          {
            tag: isEn ? "Healthy Bento" : "外食健康選",
            dish_name: isEn ? "Grilled Salmon / Lean Steak Salad Bento (Half Rice)" : "水煮健康餐盒：香煎嫩鮭魚或牛腱 (紫米飯半份，蔬菜雙倍)",
            calories: 480, protein: 38, carbs: 45, fat: 14,
            reason: isEn ? "Rich in Omega-3 anti-inflammatory fats and premium protein for lasting fullness." : "優質 Omega-3 抗發炎好油與豐富蛋白質，半份紫米飯控制升糖負擔。"
          },
          {
            tag: isEn ? "Quick Cooking" : "自煮快炒選",
            dish_name: isEn ? "Steamed Sea Bass Tofu + Boiled Vegetables & Egg Soup" : "清蒸鱸魚/嫩豆腐 + 炒綜合時蔬 + 蛋花湯",
            calories: 310, protein: 36, carbs: 10, fat: 11,
            reason: isEn ? "Clean, digestible protein with rich dietary fiber to keep night digestion light." : "超高蛋白質、極低碳水與高纖蔬菜，好消化不囤積脂肪！"
          }
        ],
        [
          {
            tag: isEn ? "Poke Bowl" : "夏威夷波奇選",
            dish_name: isEn ? "Salmon & Tofu Poke Bowl (Mixed Greens Base, Light Ponzu)" : "夏威夷 Poke 碗：生魚片鮮鮭 + 嫩豆腐 (生菜半基底/日式和風油醋)",
            calories: 420, protein: 35, carbs: 28, fat: 15,
            reason: isEn ? "Loaded with fresh micronutrients, clean fish fats and crunchy greens." : "生魚片高純蛋白質與多色抗氧化時蔬，清爽無油膩負擔！"
          },
          {
            tag: isEn ? "Office Worker Bento" : "上班族外食選",
            dish_name: isEn ? "Braised Beef Shank Bento + Blanched Vegetables (Skip Gravy)" : "滷牛腱腱子肉便當 (白飯吃半份 + 燙青菜不淋肉燥)",
            calories: 510, protein: 40, carbs: 52, fat: 12,
            reason: isEn ? "Lean braised beef provides rich iron and creatine for sustained afternoon energy." : "低脂滷牛腱富含血紅素鐵與肌酸，下午開會神清氣爽！"
          },
          {
            tag: isEn ? "Japanese Choice" : "日式定食選",
            dish_name: isEn ? "Grilled Mackerel Set with Miso Soup & Seaweed Salad" : "大戶屋/定食8：鹽烤鯖魚定食 (飯吃半碗 + 茶碗蒸)",
            calories: 490, protein: 34, carbs: 40, fat: 18,
            reason: isEn ? "Heart-healthy EPA/DHA fatty acids paired with steamed egg protein." : "天然深海魚油護心血管，茶碗蒸溫潤好吸收！"
          }
        ]
      ],
      snack: [
        [
          {
            tag: isEn ? "Pre-Workout" : "運動補給選",
            dish_name: isEn ? "Whey Protein Shake + 1 Golden Kiwi" : "乳清蛋白飲 1 杯 + 黃金奇異果 1 顆",
            calories: 190, protein: 25, carbs: 18, fat: 2,
            reason: isEn ? "Rapidly absorbable protein and vitamin C to protect muscle tissue." : "極速吸收高蛋白與滿滿維生素 C，快速消除疲勞！"
          },
          {
            tag: isEn ? "Convenience Store" : "超商輕點心",
            dish_name: isEn ? "Steamed Edamame Pods (1 Pack) + Sugar-free Green Tea" : "7-11 水煮毛豆一包 + 原萃冷萃綠茶",
            calories: 140, protein: 14, carbs: 10, fat: 4,
            reason: isEn ? "Rich in plant protein, dietary fiber, and natural minerals." : "天然原型植物大豆蛋白與豐富膳食纖維，咀嚼感超足！"
          },
          {
            tag: isEn ? "Craving Buster" : "解饞無罪惡",
            dish_name: isEn ? "Chilled Japanese Chawanmushi (Steamed Egg) + 1 Tea Egg" : "超商茶碗蒸 1 碗 + 茶葉蛋 1 顆",
            calories: 155, protein: 16, carbs: 5, fat: 7,
            reason: isEn ? "Smooth, warm savory snack packed with 16g protein under 160 kcal." : "溫熱滑嫩鹹點，蛋白質 16g，徹底壓制想吃甜食下午茶的慾望！"
          }
        ]
      ],
      dinner: [
        [
          {
            tag: isEn ? "Light & Clean" : "減脂輕盈選",
            dish_name: isEn ? "Pan-seared White Fish / Tofu with Steamed Veggies" : "香煎鯛魚排/板豆腐 + 清燙綜合時蔬 (紫米半份)",
            calories: 360, protein: 36, carbs: 26, fat: 9,
            reason: isEn ? "Lean white-meat fish digests gently before sleep without fat buildup." : "白肉純蛋白超好吸收，夜晚腸胃零負擔，安心入睡！"
          },
          {
            tag: isEn ? "Personal Hotpot" : "暖心小火鍋選",
            dish_name: isEn ? "Kombu Clear Broth Hotpot: Lean Beef + Double Veggies (No fried goods)" : "昆布清湯個人鍋：低脂板腱牛 + 蔬菜盤 (火鍋料全換青菜，不喝濃湯)",
            calories: 450, protein: 42, carbs: 18, fat: 14,
            reason: isEn ? "High volume, rich micronutrients with virtually no processed additives." : "蔬菜份量爆表、大量高纖維與低脂牛肉，飽足感直達隔天早晨！"
          },
          {
            tag: isEn ? "Fast Cooking" : "10分鐘極速自煮",
            dish_name: isEn ? "Garlic Shrimp Stir-fry with Broccoli & Tofu Miso Soup" : "蒜香白蝦炒綠花椰菜 + 豆腐海帶味噌湯",
            calories: 320, protein: 38, carbs: 14, fat: 8,
            reason: isEn ? "Super lean marine protein and high-fiber cruciferous vegetables." : "極致鮮甜的海鮮純蛋白與十字花科蔬菜，兼具排毒與飽足！"
          }
        ],
        [
          {
            tag: isEn ? "Convenience Store" : "超商夜間選",
            dish_name: isEn ? "7-11 Herb Chicken Breast + Corn Cob + High Fiber Soy Milk" : "7-11 義式香草雞胸肉 + 金黃雙色甜玉米 1 支 + 無糖高纖豆漿",
            calories: 380, protein: 42, carbs: 32, fat: 8,
            reason: isEn ? "Instant healthy dinner ready in 2 minutes right after leaving the gym." : "下班健身後 2 分鐘買齊，超高蛋白 42g 即刻啟動肌肉修復！"
          },
          {
            tag: isEn ? "Warm Bento" : "外食低卡選",
            dish_name: isEn ? "Braised Chicken Leg Bento (Skin Removed) + Double Greens" : "便當店：滷雞腿便當 (去皮 + 青菜 2 格 + 飯吃一半)",
            calories: 430, protein: 35, carbs: 38, fat: 12,
            reason: isEn ? "Traditional takeout modified easily: peeling chicken skin saves 120 kcal instantly!" : "傳統外食聰明點法：雞腿去皮立刻省下 120 大卡油脂！"
          },
          {
            tag: isEn ? "Seafood Delight" : "海鮮飽足選",
            dish_name: isEn ? "Steamed Clams & Tofu with Wilted Spinach" : "酒蒸蛤蜊嫩豆腐 + 蒜炒菠菜",
            calories: 280, protein: 29, carbs: 12, fat: 8,
            reason: isEn ? "Taurine and zinc from fresh shellfish accelerate evening metabolism." : "牛磺酸與鋅加速代謝，深夜暖胃無罪惡！"
          }
        ]
      ],
      latenight: [
        [
          {
            tag: isEn ? "Zero Guilt" : "暖胃清爽選",
            dish_name: isEn ? "Clear Clam & Ginger Soup + Warm Silken Tofu" : "薑絲蛤蜊湯 + 清燙嫩豆腐 (佐薄鹽醬油)",
            calories: 140, protein: 16, carbs: 4, fat: 5,
            reason: isEn ? "Warm, comforting, hydrating, and zero grease burden before bedtime." : "暖胃補水無油脂，豐富牛磺酸與鋅加速代謝，深夜安心好眠！"
          },
          {
            tag: isEn ? "Low Calorie High Protein" : "極低卡高蛋白",
            dish_name: isEn ? "Sugar-free High Fiber Soy Milk + 1 Tea Egg" : "全家無糖高纖豆漿 + 茶葉蛋 1 顆",
            calories: 195, protein: 21, carbs: 9, fat: 8,
            reason: isEn ? "Fits safely within your remaining 200 kcal budget with 21g protein." : "完美壓在 200 卡預算內，精準提供 21g 蛋白質，安心不挨餓！"
          },
          {
            tag: isEn ? "Light Snack" : "低 GI 水果選",
            dish_name: isEn ? "Half Guava with Salted Plum Powder + Chamomile Tea" : "珍珠芭樂半顆 (微灑梅粉) + 洋甘菊熱茶 1 杯",
            calories: 85, protein: 2, carbs: 20, fat: 0,
            reason: isEn ? "Crunchy high-fiber snack that satisfies late cravings without insulin spikes." : "脆口高纖維維生素 C，洋甘菊舒緩神經，完全不怕血糖波動飆升！"
          }
        ]
      ]
    };

    // 依據當前時段選取適配的 pool
    let activeKey = 'dinner';
    const periodLower = stats.period.toLowerCase();
    if (periodLower.includes('早') || periodLower.includes('breakfast')) activeKey = 'breakfast';
    else if (periodLower.includes('午') || periodLower.includes('lunch')) activeKey = 'lunch';
    else if (periodLower.includes('點心') || periodLower.includes('snack') || periodLower.includes('補給')) activeKey = 'snack';
    else if (periodLower.includes('宵夜') || periodLower.includes('消夜') || periodLower.includes('late')) activeKey = 'latenight';
    else activeKey = 'dinner';

    const pool = mealPools[activeKey] || mealPools.dinner;
    const poolIndex = Math.abs(seed) % pool.length;
    const chosenOptions = pool[poolIndex];

    return {
      meal_period: stats.period,
      analysis_summary: isEn
        ? `Consumed ${stats.consumed.calories} kcal. Remaining: ${remCal > 0 ? remCal + ' kcal' : '0 kcal'}. Protein needed: ${remPro > 0 ? remPro + 'g' : 'Goal met!'}.`
        : `今日已攝取 ${stats.consumed.calories} 大卡，熱量剩餘 ${remCal > 0 ? remCal : 0} kcal，蛋白質尚差 ${remPro > 0 ? remPro + 'g' : '已達標 🎉'}。`,
      coach_comment: coachComment,
      options: chosenOptions,
      stats: stats
    };
  }, [calculateLocalStats, isEn]);

  // 向後端調用推薦
  const fetchRecommendation = useCallback(async (seed = 0) => {
    setLoading(true);

    const stats = calculateLocalStats();
    const cleanLogs = (recentLogs || []).map(l => ({
      dish_name: l.dish_name,
      calories: l.calories,
      protein: l.protein,
      carbs: l.carbs,
      fat: l.fat
    }));

    try {
      const activePersona = typeof localStorage !== 'undefined' ? (localStorage.getItem('panda_active_persona') || 'tsundere') : 'tsundere';
      const rawPayload = {
        action: 'getMealRecommendation',
        userId: getOrCreateClientId(),
        userName: userName,
        goals: goals,
        todayLogs: cleanLogs,
        persona: activePersona,
        lang: isEn ? 'en' : 'zh',
        mealPeriod: stats.period,
        seed: seed
      };
      const signedPayload = createWebAIPayload(rawPayload);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8500);

      const res = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(signedPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const json = await res.json();
      if (json && json.status === 'ok' && json.data && json.data.options && json.data.options.length > 0) {
        setRecData({
          ...json.data,
          meal_period: stats.period,
          stats: json.data.stats || stats
        });
      } else {
        setRecData(generateLocalFallback(seed));
      }
    } catch (err) {
      console.warn("GAS 推薦調用超時或離線，切換為本地智能菜單:", err.message);
      setRecData(generateLocalFallback(seed));
    } finally {
      setLoading(false);
    }
  }, [calculateLocalStats, recentLogs, userName, goals, isEn, generateLocalFallback]);

  useEffect(() => {
    if (isOpen) {
      fetchRecommendation(refreshSeed);
    }
  }, [isOpen, selectedPeriod, fetchRecommendation, refreshSeed]);

  // 切換時段
  const handlePeriodChange = (tabId) => {
    setSelectedPeriod(tabId);
    setRefreshSeed(0);
  };

  // 換一批推薦
  const handleShuffle = () => {
    const nextSeed = refreshSeed + 1;
    setRefreshSeed(nextSeed);
    fetchRecommendation(nextSeed);
  };

  // 複製菜色名稱
  const handleCopyDish = (dishName) => {
    try {
      navigator.clipboard.writeText(dishName);
      setCopyToast(dishName);
      setTimeout(() => setCopyToast(null), 1800);
    } catch (_) {}
  };

  // 一鍵直接記下此餐
  const handleQuickLog = async (opt, idx) => {
    setLoggingIdx(idx);
    try {
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const localTime = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });

      const newLog = {
        date: localDate,
        time: localTime,
        dish_name: opt.dish_name,
        calories: Number(opt.calories) || 0,
        protein: Number(opt.protein) || 0,
        carbs: Number(opt.carbs) || 0,
        fat: Number(opt.fat) || 0,
        water: 0,
        comment: isEn ? '🤖 Logged via AI Next Meal Recommendation' : '🤖 AI 下一餐推薦一鍵記帳',
        advice: opt.reason || '',
        timestamp: Date.now(),
        source: 'AI_RECOMMENDATION'
      };

      await db.dietLogs.add(newLog);

      // 同步 Gist
      const gistId = getCurrentGistId();
      if (gistId) {
        try {
          const allDietLogs = await db.dietLogs.toArray();
          const allWeightLogs = await db.weightLogs.toArray();
          let allPoopLogs = [];
          try { allPoopLogs = await db.poopLogs.toArray(); } catch (_) {}
          const allSettings = await db.settings.toArray();
          const allFavorites = await db.favorites.toArray();
          uploadToGist({
            dietLogs: allDietLogs,
            weightLogs: allWeightLogs,
            poopLogs: allPoopLogs,
            settings: allSettings,
            favorites: allFavorites
          }).catch(console.warn);
        } catch (_) {}
      }

      setSuccessToast(opt.dish_name);
      if (typeof onLogAdded === 'function') {
        onLogAdded('meal');
      }

      setTimeout(() => {
        setSuccessToast(null);
        onClose();
      }, 1100);
    } catch (err) {
      console.error("記餐失敗:", err);
      alert(isEn ? `Failed to log meal: ${err.message}` : `記餐失敗：${err.message}`);
    } finally {
      setLoggingIdx(null);
    }
  };

  if (!isOpen) return null;

  const currentStats = recData?.stats || calculateLocalStats();
  const remCal = currentStats.remaining.calories;
  const remPro = currentStats.remaining.protein;
  const options = recData?.options || [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white border-4 border-black rounded-[2rem] shadow-neo-xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden my-auto relative"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-amber-300 border-b-4 border-black flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center text-xl shadow-neo-xs">
              🍽️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black text-amber-300 px-2 py-0.5 rounded-full inline-block">
                  AI Smart Advisor
                </span>
                <span className="text-[10px] font-black bg-white border border-black text-black px-2 py-0.5 rounded-full inline-block">
                  {recData?.meal_period || currentStats.period}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black italic tracking-tight text-black mt-0.5">
                {t('next_meal_title')}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 bg-white hover:bg-zinc-100 border-2 border-black rounded-xl flex items-center justify-center text-black font-black shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 🧭 時段快捷篩選標籤 (Meal Period Horizontal Tabs) */}
        <div className="bg-zinc-100 border-b-2 border-black px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {periodTabs.map((tab) => {
            const isActive = selectedPeriod === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handlePeriodChange(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-black whitespace-nowrap transition-all border-2 border-black cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-amber-300 text-black shadow-neo-xs scale-[1.02]'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 📊 今日預算缺額儀表板 */}
          <div className="bg-yellow-50 border-3 border-black p-3.5 rounded-2xl shadow-neo-xs">
            <div className="grid grid-cols-2 gap-2 text-center divide-x-2 divide-black/10">
              <div>
                <div className="text-[11px] font-black text-zinc-600 flex items-center justify-center gap-1">
                  <Flame size={13} className="text-rose-500" />
                  <span>{t('next_meal_calories_left')}</span>
                </div>
                <div className={`text-xl font-black italic mt-0.5 ${remCal >= 0 ? 'text-black' : 'text-rose-600'}`}>
                  {remCal > 0 ? `${remCal}` : (remCal === 0 ? '0' : `-${Math.abs(remCal)}`)}
                  <span className="text-xs font-bold text-zinc-500 ml-1">kcal</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-black text-zinc-600 flex items-center justify-center gap-1">
                  <Dumbbell size={13} className="text-emerald-600" />
                  <span>{t('next_meal_protein_left')}</span>
                </div>
                <div className="text-xl font-black italic text-emerald-700 mt-0.5">
                  {remPro > 0 ? `${remPro}` : (isEn ? 'Met!' : '已達標 🎉')}
                  {remPro > 0 && <span className="text-xs font-bold text-zinc-500 ml-1">g</span>}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-black/10 text-center text-[11px] font-bold text-zinc-500">
              {isEn
                ? `Logged so far: ${currentStats.consumed.calories} kcal · ${currentStats.consumed.protein}g protein`
                : `今日已吃：${currentStats.consumed.calories} 大卡 · 蛋白質 ${currentStats.consumed.protein}g`}
            </div>
          </div>

          {/* 💬 熊貓教練叮嚀 */}
          {recData?.coach_comment && (
            <div className="p-3 bg-white border-2 border-black rounded-xl flex items-start gap-2.5 shadow-neo-xs">
              <span className="text-2xl shrink-0">🐼</span>
              <p className="text-xs font-bold text-zinc-800 italic leading-relaxed pt-0.5">
                {recData.coach_comment}
              </p>
            </div>
          )}

          {/* 🍲 推薦餐點清單 */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-black border-t-amber-400 rounded-full animate-spin" />
              <p className="text-xs font-black text-zinc-600 animate-pulse">
                {t('next_meal_analyzing')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {options.map((opt, idx) => (
                <div
                  key={idx}
                  className="bg-white border-3 border-black rounded-2xl p-3.5 shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-black text-amber-300 px-2 py-0.5 rounded-lg">
                      {opt.tag || (idx === 0 ? (isEn ? 'Convenience' : '超商便利') : (idx === 1 ? (isEn ? 'Healthy Choice' : '外食精選') : (isEn ? 'Home Cooking' : '自煮輕食')))}
                    </span>
                    <span className="text-sm font-black text-rose-600 font-mono">
                      🔥 {opt.calories} <span className="text-[10px] text-zinc-400">kcal</span>
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-black text-sm text-black leading-snug">
                      {opt.dish_name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleCopyDish(opt.dish_name)}
                      className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black transition-colors shrink-0"
                      title={isEn ? "Copy dish name" : "複製菜名"}
                    >
                      <Copy size={13} />
                    </button>
                  </div>

                  {/* 營養素 Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-bold bg-emerald-50 border border-emerald-400 text-emerald-800 px-1.5 py-0.5 rounded-md">
                      🍖 蛋白 {opt.protein}g
                    </span>
                    <span className="text-[10px] font-bold bg-amber-50 border border-amber-400 text-amber-800 px-1.5 py-0.5 rounded-md">
                      🍞 碳水 {opt.carbs}g
                    </span>
                    <span className="text-[10px] font-bold bg-zinc-100 border border-zinc-300 text-zinc-700 px-1.5 py-0.5 rounded-md">
                      🥑 脂肪 {opt.fat}g
                    </span>
                  </div>

                  {opt.reason && (
                    <p className="text-[11px] font-medium text-zinc-500 mt-2 leading-relaxed">
                      💡 {opt.reason}
                    </p>
                  )}

                  <div className="mt-3 pt-2.5 border-t-2 border-dashed border-black/10 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400">
                      #{idx + 1} {isEn ? 'Recommendation' : '方案推薦'}
                    </span>
                    <button
                      type="button"
                      disabled={loggingIdx !== null}
                      onClick={() => handleQuickLog(opt, idx)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-500 hover:to-yellow-400 border-2 border-black rounded-xl font-black text-xs text-black shadow-neo-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {loggingIdx === idx ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>{isEn ? 'Logging...' : '記帳中...'}</span>
                        </>
                      ) : (
                        <>
                          <span>➕</span>
                          <span>{t('next_meal_log_now')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Copy Toast */}
        {copyToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black text-white text-[11px] font-black px-3 py-1 rounded-full border border-black shadow-neo-sm z-50 flex items-center gap-1">
            <Check size={12} />
            <span>{isEn ? 'Copied dish name!' : '已複製菜名！'}</span>
          </div>
        )}

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-500 text-white font-black text-xs py-2 px-4 text-center border-t-2 border-black flex items-center justify-center gap-1.5 animate-bounce">
            <Check size={14} />
            <span>{t('next_meal_logged')}（{successToast}）</span>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-zinc-50 border-t-2 border-black flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={handleShuffle}
            className="px-3 py-2 bg-white hover:bg-zinc-100 border-2 border-black rounded-xl text-xs font-black flex items-center gap-1.5 shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{t('next_meal_refresh')}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-black hover:bg-zinc-800 text-white border-2 border-black rounded-xl text-xs font-black shadow-neo-xs active:scale-95 transition-all cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
