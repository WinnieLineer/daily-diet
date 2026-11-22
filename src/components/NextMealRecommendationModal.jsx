import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Check, Sparkles, Utensils, Flame, Dumbbell, Clock } from 'lucide-react';
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
  const [error, setError] = useState(null);
  const [loggingIdx, setLoggingIdx] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // 計算今日缺額與目前用餐時段
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
    let period = isEn ? 'Dinner' : '晚餐';
    if (currentHour >= 5 && currentHour < 11) period = isEn ? 'Breakfast' : '早餐';
    else if (currentHour >= 11 && currentHour < 14) period = isEn ? 'Lunch' : '午餐';
    else if (currentHour >= 14 && currentHour < 17) period = isEn ? 'Afternoon Snack' : '下午點心/補給';
    else if (currentHour >= 17 && currentHour < 21) period = isEn ? 'Dinner' : '晚餐';
    else period = isEn ? 'Late-Night Snack' : '宵夜/睡前補給';

    return {
      period,
      consumed: { calories: consumedCal, protein: consumedPro, carbs: consumedCarbs, fat: consumedFat },
      remaining: { calories: remCal, protein: remPro, carbs: remCarbs, fat: remFat },
      goals: { calories: targetCal, protein: targetPro, carbs: targetCarbs, fat: targetFat }
    };
  }, [goals, summary, isEn]);

  // 本地規則備援生成 (當斷網或 GAS 忙線時確保秒開)
  const generateLocalFallback = useCallback(() => {
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

    let options = [];
    if (remPro >= 30) {
      options = [
        {
          tag: isEn ? "Convenience Store" : "超商便利選",
          dish_name: isEn ? "Sous-vide Chicken Breast + 2 Tea Eggs + Sugar-free Soy Milk" : "7-11 舒肥雞胸肉 + 雙茶葉蛋 + 光泉無糖濃豆漿",
          calories: 390,
          protein: 46,
          carbs: 12,
          fat: 12,
          reason: isEn ? "High protein (46g) under 400 kcal to rapidly close your protein gap!" : "蛋白質高達 46g，熱量不到 400 大卡，超商 2 分鐘買齊，極速補滿今日蛋白質缺口！"
        },
        {
          tag: isEn ? "Healthy Bento" : "外食健康選",
          dish_name: isEn ? "Grilled Salmon / Lean Steak Salad Bento (Half Rice)" : "水煮健康餐盒：香煎嫩鮭魚或牛腱 (紫米飯半份)",
          calories: 480,
          protein: 38,
          carbs: 45,
          fat: 14,
          reason: isEn ? "Rich in Omega-3 anti-inflammatory fats and premium protein for lasting fullness." : "優質 Omega-3 抗發炎好油與豐富蛋白質，半份紫米飯控制升糖與澱粉負擔。"
        },
        {
          tag: isEn ? "Quick Home Cooking" : "自煮快炒選",
          dish_name: isEn ? "Steamed Sea Bass Tofu + Boiled Vegetables & Egg Soup" : "清蒸鱸魚/嫩豆腐 + 炒綜合時蔬 + 蛋花湯",
          calories: 310,
          protein: 36,
          carbs: 10,
          fat: 11,
          reason: isEn ? "Clean, digestible protein with rich dietary fiber to keep night digestion light." : "超高蛋白質、極低碳水與高纖蔬菜，夜晚好消化不囤積脂肪！"
        }
      ];
    } else if (remCal <= 250) {
      options = [
        {
          tag: isEn ? "Low Calorie High Protein" : "極低卡高蛋白",
          dish_name: isEn ? "Sugar-free High Fiber Soy Milk + 1 Tea Egg" : "全家無糖高纖豆漿 + 茶葉蛋 1 顆",
          calories: 195,
          protein: 21,
          carbs: 9,
          fat: 8,
          reason: isEn ? "Fits safely within your remaining 200 kcal budget with 21g protein." : "完美壓在 200 卡預算內，精準提供 21g 蛋白質與膳食纖維，安心無負擔！"
        },
        {
          tag: isEn ? "Light Snack" : "超商輕食選",
          dish_name: isEn ? "Plain Greek Yogurt + Small Guava" : "希臘式無糖優格 + 珍珠芭樂半顆",
          calories: 160,
          protein: 15,
          carbs: 18,
          fat: 3,
          reason: isEn ? "Low glycemic index, rich in vitamin C and probiotics to curb nighttime hunger." : "低 GI、富含維生素 C 與益生菌，高飽足感且徹底避開熱量超標地雷。"
        },
        {
          tag: isEn ? "Cleansing Broth" : "暖胃清爽選",
          dish_name: isEn ? "Clear Clam & Ginger Soup + Warm Tofu" : "薑絲蛤蜊湯 + 清燙嫩豆腐 (佐薄鹽醬油)",
          calories: 140,
          protein: 16,
          carbs: 4,
          fat: 5,
          reason: isEn ? "Warm, comforting, hydrating, and zero grease burden before bedtime." : "暖胃補水無油脂，豐富牛磺酸與鋅加速代謝，深夜安心好眠！"
        }
      ];
    } else {
      options = [
        {
          tag: isEn ? "Convenience Store" : "超商便利選",
          dish_name: isEn ? "Roasted Sweet Potato (Small) + Chicken Breast + Black Tea" : "現烤小地瓜 + 舒肥嫩雞胸 + 無糖冷萃黑茶",
          calories: 350,
          protein: 32,
          carbs: 38,
          fat: 6,
          reason: isEn ? "Clean complex carbs paired with lean poultry for sustained energy." : "低 GI 複合碳水化合物搭配低脂雞肉，穩定血糖與提供持續飽足感。"
        },
        {
          tag: isEn ? "Restaurant Choice" : "外食健康選",
          dish_name: isEn ? "Custom Poke Bowl: Salmon & Tofu with Mixed Greens Base" : "客製化夏威夷 Poke 碗：生魚片鮭魚 + 嫩豆腐 (全生菜基底)",
          calories: 420,
          protein: 34,
          carbs: 26,
          fat: 16,
          reason: isEn ? "Fresh, micronutrient-dense with healthy fats and diverse plant nutrients." : "多色生菜提供豐富微量元素與抗氧化物，低加工高營養密度！"
        },
        {
          tag: isEn ? "Quick Cooking" : "5分鐘極速自煮",
          dish_name: isEn ? "Garlic Shrimp Stir-fry with Broccoli & Brown Rice" : "蒜香鮮蝦炒青花菜 (佐微量糙米飯)",
          calories: 360,
          protein: 35,
          carbs: 28,
          fat: 8,
          reason: isEn ? "Super lean marine protein and high-fiber cruciferous vegetables." : "極致鮮甜的海鮮純蛋白與十字花科高纖蔬菜，5分鐘快速上桌！"
        }
      ];
    }

    return {
      meal_period: stats.period,
      analysis_summary: isEn
        ? `Consumed ${stats.consumed.calories} kcal. Remaining: ${remCal > 0 ? remCal + ' kcal' : '0 kcal'}. Protein needed: ${remPro > 0 ? remPro + 'g' : 'Goal met!'}.`
        : `今日已攝取 ${stats.consumed.calories} 大卡，熱量剩餘 ${remCal > 0 ? remCal : 0} kcal，蛋白質尚差 ${remPro > 0 ? remPro + 'g' : '已達標 🎉'}。`,
      coach_comment: coachComment,
      options: options,
      stats: stats
    };
  }, [calculateLocalStats, isEn]);

  // 向後端調用推薦
  const fetchRecommendation = useCallback(async () => {
    setLoading(true);
    setError(null);

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
        lang: isEn ? 'en' : 'zh'
      };
      const signedPayload = createWebAIPayload(rawPayload);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(signedPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const json = await res.json();
      if (json && json.status === 'ok' && json.data) {
        setRecData(json.data);
      } else {
        // Fallback to local
        setRecData(generateLocalFallback());
      }
    } catch (err) {
      console.warn("GAS 推薦請求逾時或連線受限，切換至本地智能計算:", err.message);
      setRecData(generateLocalFallback());
    } finally {
      setLoading(false);
    }
  }, [calculateLocalStats, recentLogs, userName, goals, isEn, generateLocalFallback]);

  useEffect(() => {
    if (isOpen) {
      fetchRecommendation();
    }
  }, [isOpen, fetchRecommendation]);

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

      // 同步 Gist (若有配置)
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
      }, 1200);
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
        className="bg-white border-4 border-black rounded-[2rem] shadow-neo-xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden my-auto"
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
            onClick={onClose}
            className="w-9 h-9 bg-white hover:bg-zinc-100 border-2 border-black rounded-xl flex items-center justify-center text-black font-black shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
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
                  {remPro > 0 ? `${remPro}` : (isEn ? 'Met!' : '已達標')}
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
                  className="bg-white border-3 border-black rounded-2xl p-3.5 shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-black text-amber-300 px-2 py-0.5 rounded-lg">
                      {opt.tag || (idx === 0 ? '超商便利' : (idx === 1 ? '外食精選' : '自煮輕食'))}
                    </span>
                    <span className="text-sm font-black text-rose-600 font-mono">
                      🔥 {opt.calories} <span className="text-[10px] text-zinc-400">kcal</span>
                    </span>
                  </div>

                  <h4 className="font-black text-sm text-black leading-snug">
                    {opt.dish_name}
                  </h4>

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

                  <div className="mt-3 pt-2.5 border-t-2 border-dashed border-black/10 flex items-center justify-end">
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
            onClick={fetchRecommendation}
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
