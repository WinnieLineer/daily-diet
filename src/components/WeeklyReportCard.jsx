import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Download, Share2, Sparkles, Flame, Calendar, Loader2, Zap, Trophy, TrendingDown, TrendingUp, BarChart2 } from 'lucide-react';
import { completeText } from '../lib/groq';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db } from '../db';
import { t, getLanguage } from '../lib/translations';
import { getLocalDateString } from '../lib/constants';

// Incredibly funny, context-aware fallback roasts in full Taiwanese slang
const FALLBACK_ROASTS = {
  master: [
    "哎喲，本週自律指數居然高達 {score} 分！{name}，你這週是直接成仙了吧？熱量跟蛋白質分配得天衣無縫，連水分都喝得像個合格的水庫！教練我都懷疑你是不是偷偷把雞胸肉當零食吃了。繼續保持，下週可別讓我抓到你偷喝大冰奶喔！🐼",
    "恭喜解鎖「修仙級飲控大師」！這週你的表現讓教練我完全挑不出毛病，自律到我都有點害怕了。熱量控得超穩，水分也補得像排水系統一樣順暢。再這樣下去，體脂肪都要主動跟你分手了！加油，下週也要維持這個仙人姿態！🐼"
  ],
  warrior: [
    "自律指數 {score} 分，算是不錯的「凡人自律戰士」。雖然中間可能有一兩天差點理智斷線、超想點雞排鹹酥雞，但幸好意志力有把你拉回來！蛋白質過關，但體重好像在跟你的食慾拔河？下週精緻糖再少碰一點，你就能得道飛升了，加油啦！🐼",
    "熱量和蛋白質表現還可以，但喝水量怎麼跟擠牙膏一樣？{name}，你是想做木乃伊嗎？雖然整體有在控制，但週末那頓放縱餐差點讓你前功盡棄吧？下週多喝水、管住油炸物，教練看好你衝上 90 分大關！🐼"
  ],
  foodie: [
    "自律指數 {score} 分，標準的「有待加強吃貨」。這週是不是工作太累，直接把珍奶跟厚片當精神支柱了？熱量常常在爆卡的邊緣試探，水分也喝得像在過沙漠。{name}，你的肌肉在哭泣、脂肪在慶祝你知道嗎？下週給我認真打卡，多喝水少吃糖！🐼",
    "一週 7 天你只打卡了 {loggedDays} 天，這自律指數 {score} 分我也是笑笑的。是不是沒記錄的那幾天都在放飛自我爆卡爆吃？教練我在看著你喔！想要健康減脂就別再裝鴕鳥，下週乖乖每一餐都給我記下來，聽懂了沒有？🐼"
  ],
  shura: [
    "自律指數只有 {score} 分！{name}，你這週根本是「爆卡修羅場」的 VIP 會員吧？不是漏記就是狂吃精緻澱粉，蛋白質缺到肌肉都要抗議了。你到底是在做飲控還是養肥脂肪？下週再不認真喝水記帳，我就要在主畫面天天碎碎念囉！🐼",
    "這週的數據簡直慘不忍睹，教練我都不知道該從哪裡吐槽了。自律指數才 {score} 分，珍奶雞排爆卡一應俱全，水分攝取完全不及格。這不叫減脂，這叫脂肪增值計畫！從明天開始，給我老老實實多喝水，大餐退散，好好反省！🐼"
  ]
};

const FALLBACK_ROASTS_EN = {
  master: [
    "Whoa! Your discipline score hit {score} this week! {name}, did you reach enlightenment? Calories and protein are impeccably balanced, and your water intake is like a well-regulated reservoir! Coach was wondering if you snacked on chicken breasts all week. Keep it up, don't let me catch you with boba milk tea next week! 🐼",
    "Congrats on unlocking 'Zen Diet Master'! Coach honestly can't find a single flaw in your performance this week. Calories rock steady, hydration smooth as clockwork. Keep this up and body fat will file for divorce! Stay awesome next week! 🐼"
  ],
  warrior: [
    "Discipline score of {score} points—a solid 'Mortal Discipline Warrior'. Even though there was a day or two where you almost gave in to fried chicken, your willpower dragged you back! Protein passed, but weight seems to be in a tug-of-war with your appetite. Cut back on refined sugars next week and you will ascend! 🐼",
    "Calories and protein look decent, but what's with the water intake? {name}, trying to turn into a mummy? Even though you held it together, that weekend cheat meal almost wiped out your progress. Drink more water, avoid deep fried stuff, and let's break 90 next week! 🐼"
  ],
  foodie: [
    "Discipline score of {score} points—a classic 'Foodie With Room to Improve'. Was work so tiring that you used toast and milk tea as emotional crutches? Often flirting on the edge of calorie surplus and drinking water like you're lost in a desert. {name}, your muscles are crying and fat is throwing a party! Log properly next week! 🐼",
    "Out of 7 days, you only logged {loggedDays} days! This {score} score is hilarious. Were you bingeing on the unlogged days? Coach is watching you! If you want healthy results, stop pretending and log every meal next week, got it? 🐼"
  ],
  shura: [
    "A discipline score of only {score}?! {name}, you're basically a VIP member of 'Calorie Carnage' this week! Either missing logs or indulging in refined carbs, protein deficit so bad your muscles are protesting. Are you dieting or fattening up? Drink water and log your food, or I'll nag you daily! 🐼",
    "These numbers are brutal; Coach doesn't even know where to start roasting. A score of {score}, cheat meals galore, and water intake completely failing. This isn't fat loss, it's a fat accumulation project! Starting tomorrow, drink water, ditch the feast, and reflect! 🐼"
  ]
};

const getRandomRoast = (score, name, loggedDays, isEn = false) => {
  const roasts = isEn ? FALLBACK_ROASTS_EN : FALLBACK_ROASTS;
  let list = roasts.foodie;
  if (score >= 90) list = roasts.master;
  else if (score >= 70) list = roasts.warrior;
  else if (score >= 50) list = roasts.foodie;
  else list = roasts.shura;

  const template = list[Math.floor(Math.random() * list.length)];
  return template
    .replace(/{score}/g, score)
    .replace(/{name}/g, name || (isEn ? 'Human' : '人類'))
    .replace(/{loggedDays}/g, loggedDays);
};

const WeeklyReportCard = ({ isOpen, onClose, goals, streak, userName }) => {
  const isEn = getLanguage() === 'en';
  const cardRef = useRef(null);
  const [exportState, setExportState] = useState(null); // 'download' | 'share' | null
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [aiRoast, setAiRoast] = useState('');
  const [isRoasting, setIsRoasting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      calculateWeeklyStats();
    }
  }, [isOpen]);

  const calculateWeeklyStats = async () => {
    setLoading(true);
    setAiRoast('');
    try {
      const now = new Date();
      const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
      const dates = [];
      // Generate past 7 days (including today)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(base.getDate() - i);
        dates.push(getLocalDateString(d));
      }

      // Query logs in Dexie
      const logs = await db.dietLogs.where('date').anyOf(dates).toArray();
      const weights = await db.weightLogs.where('date').anyOf(dates).sortBy('date');

      // Group logs by date
      const dailyTotals = dates.reduce((acc, date) => {
        acc[date] = { calories: 0, protein: 0, water: 0, carbs: 0, fat: 0, logged: false };
        return acc;
      }, {});

      logs.forEach(log => {
        const d = log.date;
        if (dailyTotals[d]) {
          dailyTotals[d].calories += Number(log.calories) || 0;
          dailyTotals[d].protein += Number(log.protein) || 0;
          dailyTotals[d].water += Number(log.water) || 0;
          dailyTotals[d].carbs += Number(log.carbs) || 0;
          dailyTotals[d].fat += Number(log.fat) || 0;
          dailyTotals[d].logged = true;
        }
      });

      let loggedDays = 0;
      let totalCalories = 0;
      let totalProtein = 0;
      let totalWater = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      let calorieScore = 100;
      let proteinPoints = 0;
      let waterPoints = 0;

      dates.forEach(d => {
        const day = dailyTotals[d];
        if (day.logged) {
          loggedDays++;
          totalCalories += day.calories;
          totalProtein += day.protein;
          totalWater += day.water;
          totalCarbs += day.carbs;
          totalFat += day.fat;

          // Score deductions/bonuses
          const calGoal = goals.calories || 2000;
          const deviation = Math.abs(day.calories - calGoal) / calGoal;
          if (deviation > 0.15) {
            calorieScore -= 5;
          }

          const proGoal = goals.protein || 100;
          if (day.protein >= proGoal * 0.9) {
            proteinPoints += 2;
          }

          const watGoal = goals.water || 2500;
          if (day.water >= watGoal * 0.9) {
            waterPoints += 2;
          }
        } else {
          calorieScore -= 10; // skipped logging penalty
        }
      });

      const score = Math.max(10, Math.min(100, calorieScore + proteinPoints + waterPoints));

      // Calculate Averages based on logged days (or 7 if none)
      const divider = loggedDays || 1;
      const avgCalories = Math.round(totalCalories / divider);
      const avgProtein = Math.round((totalProtein / divider) * 10) / 10;
      const avgWater = Math.round(totalWater / divider);
      const avgCarbs = Math.round((totalCarbs / divider) * 10) / 10;
      const avgFat = Math.round((totalFat / divider) * 10) / 10;

      // Weight calculation
      let weightDiff = 0;
      let startWeight = 0;
      let endWeight = 0;
      if (weights.length >= 2) {
        startWeight = Number(weights[0].weight);
        endWeight = Number(weights[weights.length - 1].weight);
        weightDiff = Number((endWeight - startWeight).toFixed(1));
      } else if (weights.length === 1) {
        startWeight = Number(weights[0].weight);
        endWeight = startWeight;
      }

      // Title Rank Assignment
      let rankTitle = isEn ? "Calorie Chaos VIP 👹" : "爆卡修羅場常客 👹";
      if (score >= 90) rankTitle = isEn ? "Zen Diet Master 🧘" : "修仙級飲控大師 🧘";
      else if (score >= 70) rankTitle = isEn ? "Mortal Discipline Warrior 🛡️" : "凡人自律戰士 🛡️";
      else if (score >= 50) rankTitle = isEn ? "Aspiring Foodie 🍰" : "有待加強的吃貨 🍰";

      setReportData({
        dateRange: `${dates[0].replace(/-/g, '/')} ~ ${dates[6].replace(/-/g, '/')}`,
        loggedDays,
        avgCalories,
        avgProtein,
        avgWater,
        avgCarbs,
        avgFat,
        startWeight,
        endWeight,
        weightDiff,
        hasWeight: weights.length > 0,
        score,
        rankTitle
      });
    } catch (err) {
      console.error("Calculate weekly report failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetWeeklyRoast = async () => {
    if (isRoasting || !reportData) return;
    setIsRoasting(true);
    try {
      const weightDiffStr = isEn
        ? (reportData.weightDiff > 0
          ? `Gained +${reportData.weightDiff}kg`
          : reportData.weightDiff < 0
            ? `Lost ${reportData.weightDiff}kg`
            : reportData.startWeight > 0 ? "Weight unchanged" : "No weight record")
        : (reportData.weightDiff > 0 
          ? `變重了 +${reportData.weightDiff}kg` 
          : reportData.weightDiff < 0 
            ? `變輕了 ${reportData.weightDiff}kg` 
            : reportData.startWeight > 0 ? "體重維持不變" : "無記錄體重");

      const prompt = isEn
        ? `You are an extremely sharp, witty, humorous yet caring fitness Panda Dietitian Coach 🐼.
      Please provide a 40-50 word weekly performance roast/review for the user.
      
      Weekly stats:
      - Consecutive streak: ${streak} days
      - Logged days: ${reportData.loggedDays}/7 days
      - Daily avg calories: ${reportData.avgCalories} kcal / Goal ${goals.calories} kcal
      - Daily avg protein: ${reportData.avgProtein}g / Goal ${goals.protein}g
      - Daily avg water: ${reportData.avgWater}ml / Goal ${goals.water}ml
      ${goals.show_carbs_fat ? `- Daily avg carbs: ${reportData.avgCarbs}g / fat: ${reportData.avgFat}g` : ''}
      - Weight change: ${weightDiffStr}
      - Discipline score: ${reportData.score} pts (Rank: ${reportData.rankTitle})

      CRITICAL Rules:
      1. Write in witty, colloquial English with fitness humor.
      2. Be playfully roasting yet encouraging and scientifically sound.
      3. Occasionally address the user by name "${userName || 'Human'}".
      4. Keep it strictly under 50 words without any Markdown, JSON, or HTML.`
        : `你是一位講話極度中肯、毒舌犀利卻專業無比的台灣熊貓營養師教練 🐼。
      請針對使用者這週的飲控表現給予大約 40-50 字的週結算銳評（Roast）。
      
      本週飲食數據：
      - 連續記錄天數：${streak} 天
      - 本週累計打卡：${reportData.loggedDays}/7 天
      - 每日平均攝取：${reportData.avgCalories} kcal / 目標 ${goals.calories} kcal
      - 每日平均蛋白質：${reportData.avgProtein}g / 目標 ${goals.protein}g
      - 每日平均飲水：${reportData.avgWater}ml / 目標 ${goals.water}ml
      ${goals.show_carbs_fat ? `- 每日平均碳水：${reportData.avgCarbs}g / 脂肪：${reportData.avgFat}g` : ''}
      - 體重變化：${weightDiffStr}
      - 本週自律指數：${reportData.score} 分（稱號：${reportData.rankTitle}）

      CRITICAL Rules:
      1. 必須完全以「台灣繁體中文（Traditional Chinese, Taiwan）」及台灣減脂圈/日常減肥流行語撰寫（例如：爆卡、社畜、放縱餐、大冰奶、飲控、吃貨、教練等）。
      2. 語氣要辛辣、毒舌、幽默，直擊要害，但背後又有營養師的專業關懷。
      3. 偶爾可以在銳評中直接稱呼使用者名字「${userName || '人類'}」。
      4. 限制在 40~50 字以內，不要輸出任何 Markdown、JSON、HTML，只要純文字的銳評句子。`;

      const result = await completeText(prompt, { temperature: 0.3, maxTokens: 1024 });
      setAiRoast(result.replace(/[#*]/g, '').replace(/["「」]/g, '').trim().slice(0, 300));
    } catch (err) {
      console.error("Weekly roast error:", err);
      // Fallback
      setAiRoast(getRandomRoast(reportData.score, userName, reportData.loggedDays, isEn));
    } finally {
      setIsRoasting(false);
    }
  };

  const generateCanvas = async () => {
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;
    return await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setExportState('download');
    try {
      const canvas = await generateCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const dateStr = getLocalDateString();
      link.download = `daily-diet-weekly-report-${dateStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Weekly download error:", err);
    } finally {
      setExportState(null);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setExportState('share');
    try {
      const canvas = await generateCanvas();
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      if (!blob) return;

      const dateStr = getLocalDateString();
      const file = new File([blob], `daily-diet-weekly-report-${dateStr}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: isEn ? 'Panda Coach · Weekly Diet Report' : '熊貓教練 · 本週飲控自律週報',
          text: isEn ? 'Check out my discipline score this week! Dare to get roasted by Coach? 🐼' : '來看看我這週的自律分數！你想被教練銳評一下嗎？🐼'
        });
      } else {
        // Fallback to download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `daily-diet-weekly-report-${dateStr}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Weekly share error:", err);
    } finally {
      setExportState(null);
    }
  };

  // Get active title stickers worn currently
  let currentTitle = '';
  let hasCrown = false;
  try {
    currentTitle = localStorage.getItem('panda_active_title') || '';
    hasCrown = localStorage.getItem('panda_sponsor_crown') === 'true';
  } catch (e) {}

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[600]">
      <AnimatePresence>
        <motion.div
          key="weekly-sharing-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        <div
          key="weekly-sharing-content-container"
          className="fixed inset-0 z-[601] overflow-y-auto custom-scrollbar p-3 sm:p-4 overscroll-contain pointer-events-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="min-h-full flex items-center justify-center py-3 sm:py-6">
            <motion.div
              key="weekly-sharing-card-modal"
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              className="relative w-full max-w-[350px] sm:max-w-[380px] flex flex-col gap-2.5 sm:gap-3 pointer-events-auto my-auto"
            >
              {/* Capture Wrapper (IG Story Vertical Card with Shadows) */}
              <div ref={cardRef} className="p-2 pr-4 pb-4 select-none">
                <div
                  className={`border-4 sm:border-[5px] ${hasCrown ? 'border-amber-400 shadow-[8px_8px_0px_0px_rgba(251,191,36,1)]' : 'border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'} p-4 sm:p-5 rounded-[1.8rem] sm:rounded-[2.2rem] relative overflow-hidden flex flex-col min-h-[460px] sm:min-h-[500px] justify-between transition-all`}
                  style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px), linear-gradient(135deg, #FCFAF6 0%, #E6EEF8 100%)', backgroundSize: '16px 16px, 100% 100%' }}
                >
                  {/* Visual Neobrutalist Clay Accents */}
                  <div className="absolute top-[-5%] right-[-10%] w-40 h-40 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-[20%] left-[-15%] w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

                  {/* Card Title Header */}
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter leading-[0.85] mb-1.5 text-black">
                        DAILY<br />DIET
                      </h1>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="bg-black text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide">
                          {userName || (isEn ? 'Foodie' : '無名吃貨')}
                        </span>
                        {hasCrown && (
                          <span className="bg-amber-400 text-black border-2 border-black px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wide flex items-center gap-0.5 shadow-neo-xs scale-90 origin-left transform">
                            {isEn ? '👑 VIP Founder' : '👑 榮譽金主'}
                          </span>
                        )}
                        {currentTitle && (
                          <span className="bg-accent border-2 border-black text-black px-1.5 py-0.5 rounded-md text-[8px] font-black italic scale-95 transform">
                            {currentTitle}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-black text-accent px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider leading-none block mb-1">
                        WEEKLY REPORT
                      </span>
                      <span className="text-[8px] font-bold text-zinc-400 block tracking-tight whitespace-nowrap">
                        {reportData?.dateRange}
                      </span>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 z-10">
                      <Loader2 size={32} className="animate-spin text-black" />
                      <span className="font-black italic text-xs">{isEn ? 'Analyzing weekly data...' : '正在分析本週數據...'}</span>
                    </div>
                  ) : (
                    <div className="my-3 space-y-3 z-10 flex-1 flex flex-col justify-between">
                      {/* Score Badge Clay Panel */}
                      <div className="border-3 sm:border-4 border-black bg-gradient-to-r from-accent via-amber-300 to-accent p-2.5 sm:p-3 rounded-2xl shadow-neo-xs relative overflow-hidden flex items-center gap-3 transition-transform hover:-translate-y-0.5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white border-3 border-black rounded-xl flex items-center justify-center shrink-0 shadow-neo-xs transform -rotate-6 animate-pulse">
                          <Trophy size={18} className="text-black" />
                        </div>
                        <div className="flex-1 text-left">
                          <span className="text-[8px] font-black text-zinc-800 block mb-0.5">
                            {isEn ? 'Discipline Index' : '本週自律指數'}
                          </span>
                          <div className="text-lg sm:text-xl font-black italic text-black leading-none flex items-baseline gap-1">
                            {reportData?.score} <span className="text-xs">{isEn ? 'pts' : '分'}</span>
                          </div>
                          <div className="text-[8px] sm:text-[9px] font-black bg-white border-2 border-black text-black px-1.5 py-0.5 rounded-md inline-block mt-0.5 transform rotate-1 shadow-neo-xs">
                            {reportData?.rankTitle}
                          </div>
                        </div>
                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 transform rotate-12 pointer-events-none">
                          <BarChart2 size={60} />
                        </div>
                      </div>

                      {/* Stats details grid */}
                      <div className={`grid ${goals.show_carbs_fat ? 'grid-cols-2 gap-1.5 sm:gap-2' : 'grid-cols-2 gap-2'}`}>
                        {/* Calories */}
                        <div className="bg-white/80 backdrop-blur-md border-3 border-black p-2 sm:p-2.5 rounded-2xl shadow-neo-xs text-left transition-all">
                          <span className="text-[8px] font-black text-zinc-500 block mb-0.5">{isEn ? 'Avg Daily Cals' : '每日均熱量'}</span>
                          <div className="text-xs sm:text-sm font-black italic leading-none my-0.5 text-black">{reportData?.avgCalories} kcal</div>
                          <div className="text-[7.5px] sm:text-[8px] font-bold text-zinc-400">{isEn ? 'Goal' : '目標'}: {goals.calories} kcal</div>
                        </div>

                        {/* Protein */}
                        <div className="bg-white/80 backdrop-blur-md border-3 border-black p-2 sm:p-2.5 rounded-2xl shadow-neo-xs text-left transition-all">
                          <span className="text-[8px] font-black text-zinc-500 block mb-0.5">{isEn ? 'Avg Daily Protein' : '每日均蛋白'}</span>
                          <div className="text-xs sm:text-sm font-black italic leading-none my-0.5 text-black">{reportData?.avgProtein} g</div>
                          <div className="text-[7.5px] sm:text-[8px] font-bold text-zinc-400">{isEn ? 'Goal' : '目標'}: {goals.protein} g</div>
                        </div>

                        {/* Carbs (Optional) */}
                        {goals.show_carbs_fat && (
                          <div className="bg-white/80 backdrop-blur-md border-3 border-black p-2 sm:p-2.5 rounded-2xl shadow-neo-xs text-left transition-all">
                            <span className="text-[8px] font-black text-zinc-500 block mb-0.5">{isEn ? 'Avg Daily Carbs' : '每日均碳水'}</span>
                            <div className="text-xs sm:text-sm font-black italic leading-none my-0.5 text-black">{reportData?.avgCarbs} g</div>
                            <div className="text-[7.5px] sm:text-[8px] font-bold text-zinc-400">{isEn ? 'Goal' : '目標'}: {goals.carbs || 200} g</div>
                          </div>
                        )}

                        {/* Fat (Optional) */}
                        {goals.show_carbs_fat && (
                          <div className="bg-white/80 backdrop-blur-md border-3 border-black p-2 sm:p-2.5 rounded-2xl shadow-neo-xs text-left transition-all">
                            <span className="text-[8px] font-black text-zinc-500 block mb-0.5">{isEn ? 'Avg Daily Fat' : '每日均脂肪'}</span>
                            <div className="text-xs sm:text-sm font-black italic leading-none my-0.5 text-black">{reportData?.avgFat} g</div>
                            <div className="text-[7.5px] sm:text-[8px] font-bold text-zinc-400">{isEn ? 'Goal' : '目標'}: {goals.fat || 60} g</div>
                          </div>
                        )}

                        {/* Water */}
                        <div className="bg-white/80 backdrop-blur-md border-3 border-black p-2 sm:p-2.5 rounded-2xl shadow-neo-xs text-left transition-all">
                          <span className="text-[8px] font-black text-zinc-500 block mb-0.5">{isEn ? 'Avg Daily Water' : '每日均飲水'}</span>
                          <div className="text-xs sm:text-sm font-black italic leading-none my-0.5 text-black">{reportData?.avgWater} ml</div>
                          <div className="text-[7.5px] sm:text-[8px] font-bold text-zinc-400">{isEn ? 'Goal' : '目標'}: {goals.water} ml</div>
                        </div>

                        {/* Weight Change */}
                        <div className="bg-white/80 backdrop-blur-md border-3 border-black p-2 sm:p-2.5 rounded-2xl shadow-neo-xs text-left flex flex-col justify-between transition-all">
                          <div>
                            <span className="text-[8px] font-black text-zinc-500 block mb-0.5">{isEn ? 'Weight Change' : '體重變化'}</span>
                            <div className="text-xs sm:text-sm font-black italic flex items-center gap-1 leading-none my-0.5 text-black">
                              {!reportData?.hasWeight ? (
                                <span className="text-zinc-400 font-bold not-italic">{isEn ? 'No Record' : '無紀錄'}</span>
                              ) : reportData?.weightDiff > 0 ? (
                                <><TrendingUp size={11} className="text-rose-500 shrink-0" /> +{reportData?.weightDiff} kg</>
                              ) : reportData?.weightDiff < 0 ? (
                                <><TrendingDown size={11} className="text-emerald-500 shrink-0" /> {reportData?.weightDiff} kg</>
                              ) : (
                                <span className="text-black font-black italic">{isEn ? 'Unchanged' : '維持不變'}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-[7.5px] sm:text-[8px] font-bold text-zinc-400 mt-0.5">
                            {isEn ? 'Logged' : '打卡累計'}: {reportData?.loggedDays} / 7 {isEn ? 'days' : '天'}
                          </div>
                        </div>
                      </div>

                      {/* AI Roast / Review Block */}
                      <div className="bg-black text-white p-3 sm:p-3.5 rounded-2xl relative overflow-hidden text-left flex-1 min-h-[105px] sm:min-h-[120px] flex flex-col justify-between shadow-neo-xs">
                        <div className="absolute top-2 left-3 bg-accent text-black border border-black px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm z-20">
                          <Zap size={9} className="fill-black text-black animate-pulse" />
                          <span className="text-[7.5px] sm:text-[8px] font-black uppercase">{isEn ? 'Panda Coach Weekly Roast 🐼' : '熊貓教練週終結銳評 🐼'}</span>
                        </div>

                        <div className="mt-5 flex flex-col items-center justify-center text-center flex-1 z-10">
                          {aiRoast ? (
                            <p className="font-black italic text-xs leading-relaxed tracking-tight text-white text-left w-full pr-1 whitespace-normal break-words">
                              {aiRoast}
                            </p>
                          ) : isRoasting ? (
                            <div className="flex flex-col items-center gap-1.5 py-3">
                              <Loader2 size={20} className="animate-spin text-accent" />
                              <p className="font-black italic text-[9px] text-zinc-400">{isEn ? 'Coach is brewing a spicy roast...' : '教練正在整理毒舌吐槽本...'}</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 py-1.5">
                              <p className="font-black italic text-[9px] text-zinc-400">{isEn ? 'How was your week? Want to hear Coach roast your stats?' : '這週過得怎麼樣？想聽聽教練的毒舌點評嗎？'}</p>
                              <button
                                onClick={handleGetWeeklyRoast}
                                className="bg-accent border-3 border-black px-4 py-1.5 rounded-xl font-black italic text-[11px] sm:text-xs flex items-center gap-1 shadow-neo-xs hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-black cursor-pointer"
                              >
                                <Sparkles size={12} fill="currentColor" />
                                {isEn ? 'Summon Weekly Roast 🐼✨' : '召喚教練週銳評 🐼✨'}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="absolute -right-3 -bottom-3 opacity-15 rotate-12 z-0 pointer-events-none">
                          <Sparkles size={46} className="text-accent" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Brand */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-black/10 z-10">
                    <div className="text-[7.5px] sm:text-[8px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                      winnie-lin.space/daily-diet
                    </div>
                    <div className="text-[7.5px] sm:text-[8px] font-black text-zinc-400 whitespace-nowrap">
                      {isEn ? 'Consistency is key, health is life' : '打卡是態度，減脂是生活'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal actions */}
              <div className="flex gap-2 px-1 shrink-0">
                <button
                  onClick={onClose}
                  disabled={!!exportState}
                  title={isEn ? "Close" : "關閉"}
                  className="w-10 sm:w-11 h-10 sm:h-11 bg-white border-3 border-black rounded-xl sm:rounded-2xl font-black transition-all hover:bg-rose-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-neo-xs flex items-center justify-center disabled:opacity-50 text-black cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!!exportState || loading}
                  className="flex-1 h-10 sm:h-11 bg-white border-3 border-black px-2 rounded-xl sm:rounded-2xl font-black italic flex items-center justify-center gap-1 transition-all hover:bg-zinc-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-neo-xs disabled:opacity-50 text-[11px] sm:text-xs text-black cursor-pointer"
                >
                  {exportState === 'download' ? (
                    <Loader2 size={14} className="animate-spin text-black" />
                  ) : (
                    <><Download size={14} /> {isEn ? 'Download IG Card' : '下載 IG 卡片'}</>
                  )}
                </button>
                <button
                  onClick={handleShare}
                  disabled={!!exportState || loading}
                  className="flex-[1.1] h-10 sm:h-11 bg-accent border-3 border-black px-2 rounded-xl sm:rounded-2xl font-black italic flex items-center justify-center gap-1 transition-all hover:bg-amber-300 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-neo-xs disabled:opacity-50 text-[11px] sm:text-xs text-black cursor-pointer"
                >
                  {exportState === 'share' ? (
                    <Loader2 size={14} className="animate-spin text-black" />
                  ) : (
                    <><Share2 size={14} /> {isEn ? 'Share Report' : '分享自律週報'}</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default WeeklyReportCard;

