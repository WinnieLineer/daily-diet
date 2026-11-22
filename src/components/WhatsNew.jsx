import React from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  RefreshCw, 
  Lock, 
  MessageSquare, 
  Languages, 
  Feather, 
  BarChart2, 
  CheckCircle2,
  Sliders,
  Utensils,
  Flame,
  Clock,
  Dumbbell
} from 'lucide-react';
import NeoButton from './NeoButton';
import { APP_VERSION, CURRENT_WHATSNEW_ID } from '../lib/constants';
import { getLanguage } from '../lib/translations';

export { CURRENT_WHATSNEW_ID };

const FeatureItem = ({ 
  icon: Icon, 
  title, 
  desc, 
  badge = "修復優化", 
  iconBg = "bg-amber-100", 
  iconColor = "text-amber-800" 
}) => (
  <div className="flex items-start gap-3 sm:gap-3.5 p-3 sm:p-3.5 bg-white border-2 border-black rounded-2xl shadow-neo-xs">
    <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 ${iconBg} border-2 border-black rounded-xl flex items-center justify-center shrink-0 shadow-neo-xs mt-0.5`}>
      <Icon size={17} className={iconColor} strokeWidth={2.5} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="font-black text-xs sm:text-[13px] text-zinc-950 leading-tight">
          {title}
        </div>
        <span className="px-1.5 sm:px-2 py-0.5 bg-black text-accent rounded-md text-[8.5px] sm:text-[9px] font-black shrink-0 tracking-wider">
          {badge}
        </span>
      </div>
      <div className="text-[11px] sm:text-xs text-zinc-600 font-bold leading-relaxed">
        {desc}
      </div>
    </div>
  </div>
);

const WhatsNew = ({ version = APP_VERSION, onClose }) => {
  const isEn = getLanguage() === 'en';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.94, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="bg-accent border-4 border-black w-full max-w-lg rounded-[2rem] sm:rounded-[2.5rem] shadow-neo relative flex flex-col max-h-[90vh] max-h-[90dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 bg-white/90 hover:bg-black hover:text-white rounded-2xl transition-colors border-2 border-black z-[310] shadow-neo-xs cursor-pointer"
        >
          <X size={18} strokeWidth={3} />
        </button>

        <div className="overflow-y-auto p-5 sm:p-7 flex-1 custom-scrollbar space-y-4 sm:space-y-5">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black text-accent rounded-xl text-[10.5px] sm:text-[11px] font-black tracking-wider uppercase border-2 border-black shadow-neo-xs">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                {isEn ? '🎉 Major Feature Release' : '🎉 重磅新功能發布'}
              </span>
              <span className="inline-block px-2.5 py-1 bg-white text-zinc-900 rounded-xl text-[10.5px] sm:text-[11px] font-black border-2 border-black shadow-neo-xs">
                v{version}
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 leading-tight">
              {isEn ? '“What to Eat Next?” AI Smart Meal Advisor is Live!' : '「接下來吃什麼？」AI 智能菜單推薦全新登場！'}
            </h2>
            <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl text-[11px] sm:text-xs text-amber-950 font-bold leading-relaxed space-y-1 shadow-neo-xs">
              <div className="flex items-center gap-1.5 font-black text-xs sm:text-[13px] text-amber-950">
                <span>🍽️</span>
                <span>{isEn ? 'No More Food Dilemma! Customized to Your Daily Gap' : '不再為每餐糾結！AI 根據今日攝入與體態目標客製化菜單'}</span>
              </div>
              <p>
                {isEn 
                  ? 'Wondering what to eat for lunch, dinner, or a healthy late-night snack? Panda Coach now calculates your remaining calorie & protein budget in real-time, instantly recommending 3 tailored, practical meals with 1-click logging! Available on both Web & LINE chat!' 
                  : '每到用餐時間總在想「午餐吃什麼？」、「今天蛋白質還差多少？」現在只要打開 Web 或在 LINE 輸入「接下來吃什麼」，AI 熊貓教練即刻計算剩餘熱量與蛋白質缺口，秒出 3 大超實用方案，還能一鍵直接記帳！'}
              </p>
            </div>
          </div>

          {/* 今日更新亮點列表 */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5 ml-1">
              <Sparkles size={14} className="text-amber-800" strokeWidth={3} />
              {isEn ? 'Feature Highlights' : '新功能核心亮點一覽'}
            </div>
            
            <FeatureItem 
              icon={Utensils}
              title={isEn ? "Time-of-Day Context & 3 Scenarios" : "時段情境感應 × 超商/外食/自煮 3 大方案"}
              desc={isEn 
                ? "Intelligently detects whether it's breakfast, lunch, snack, dinner, or late-night craving. Delivers 3 distinct choices: 7-Eleven/FamilyMart grab-and-go, healthy takeout, or 5-min quick prep!"
                : "自動識別早午晚餐、下午補給或深夜暖胃時段，每餐給予：超商隨手買、外食健康便當、5分鐘快煮自煮，每道均附熱量、蛋白質與推薦理由！"}
              badge={isEn ? "Smart Menu" : "智能菜單"}
              iconBg="bg-amber-100"
              iconColor="text-amber-800"
            />

            <FeatureItem 
              icon={BarChart2}
              title={isEn ? "Dynamic Calorie & Protein Budget Gap" : "動態營養缺額精算（不推重複菜色）"}
              desc={isEn 
                ? "Deducts what you've already eaten today from your daily targets to precisely compute remaining calories, protein, carbs, and fat—guaranteed not to suggest duplicate meals!"
                : "自動扣除今日已吃熱量與三大營養素，即時算出剩餘熱量與蛋白質缺口。若熱量吃緊主打高蛋白低負擔，絕不重複推薦今日吃過的餐點！"}
              badge={isEn ? "Gap Calculation" : "缺額精算"}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-800"
            />

            <FeatureItem 
              icon={CheckCircle2}
              title={isEn ? "1-Click Direct Logging" : "➕ 一鍵極速記下此餐"}
              desc={isEn 
                ? "Found a meal you like? Simply tap “Log This Meal” on either the Web modal or LINE Flex card to write it directly into today's diary with zero typing needed."
                : "在 Web 彈窗或 LINE 卡片中看到喜歡的方案，點擊「➕ 一鍵記下此餐」，系統立即自動登錄至今日日記並重新計算進度，連打字都省了！"}
              badge={isEn ? "1-Click Log" : "極速記餐"}
              iconBg="bg-rose-100"
              iconColor="text-rose-800"
            />

            <FeatureItem 
              icon={MessageSquare}
              title={isEn ? "Ask Directly in LINE Chat" : "LINE 聊天室直接發問（自然語言支援）"}
              desc={isEn 
                ? "Send “What should I eat next?”, “Dinner recommendation”, or “What can I eat?” in LINE chat, and Coach Panda replies with an interactive Flex card in seconds!"
                : "在 LINE 官方帳號直接傳送「接下來吃什麼」、「晚餐吃什麼」、「我還能吃什麼」，教練即刻以精美互動式 Flex 卡片為您秒算回覆！"}
              badge={isEn ? "LINE Bot" : "LINE直達"}
              iconBg="bg-sky-100"
              iconColor="text-sky-800"
            />
          </div>

          {/* 快速體驗導引卡片 */}
          <div className="p-3.5 sm:p-4 bg-white/95 border-2 sm:border-3 border-black rounded-2xl shadow-neo-xs space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-950 font-black text-xs">
              <span className="text-base">💡</span>
              <span>{isEn ? 'How to Try It Right Now' : '如何立即體驗？'}</span>
            </div>
            <p className="text-[11px] text-zinc-700 font-bold leading-relaxed">
              {isEn 
                ? '• On Web: Tap the shiny “🍽️ What to Eat Next? AI Recommendation” button right below your dashboard rings!\n• On LINE: Simply type “What should I eat next” in the chat!'
                : '• Web 網頁端：在首頁今日進度圓環下方，點擊「🍽️ 接下來吃什麼？AI 智能推薦」按鈕！\n• LINE 聊天室：直接在對話框輸入「接下來吃什麼」或「晚餐吃什麼」即可立即體驗！'}
            </p>
          </div>

          {/* 確認關閉按鈕 */}
          <NeoButton 
            variant="black" 
            className="w-full py-3 sm:py-3.5 text-sm sm:text-base rounded-2xl shadow-neo font-black cursor-pointer"
            onClick={onClose}
          >
            {isEn ? 'Awesome! Let’s explore 🍽️✨' : '太棒了，立即體驗 🍽️✨'}
          </NeoButton>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WhatsNew;

