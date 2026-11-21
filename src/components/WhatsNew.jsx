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
  Sliders
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
                {isEn ? '🎉 Fixes & Upgrade Highlights' : '🎉 最新修復與升級公告'}
              </span>
              <span className="inline-block px-2.5 py-1 bg-white text-zinc-900 rounded-xl text-[10.5px] sm:text-[11px] font-black border-2 border-black shadow-neo-xs">
                v{version}
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 leading-tight">
              {isEn ? 'Gemini AI Fully Restored & Sincere Apology' : 'Gemini AI 智能核心全面修復、升級與致歉說明'}
            </h2>
            <div className="p-3 bg-red-50 border-2 border-red-300 rounded-2xl text-[11px] sm:text-xs text-red-900 font-bold leading-relaxed space-y-1 shadow-neo-xs">
              <div className="flex items-center gap-1.5 font-black text-xs sm:text-[13px] text-red-950">
                <span>🙇‍♂️</span>
                <span>{isEn ? 'Sincere Apology for 2-Day AI Outage' : '致用戶：過去兩天 AI 異常中斷誠摯致歉'}</span>
              </div>
              <p>
                {isEn 
                  ? 'Over the past two days (Nov 20–21), Gemini AI cloud service experienced an unexpected outage, causing food photo and text analysis to be unavailable. We deeply apologize for the disruption! The team has overhauled the engine to Gemini 3.x with zero-downtime multi-model failover.' 
                  : '過去兩天（11/20～11/21）因 Gemini AI 雲端授權異常，導致飲食照片辨識與文字分析中斷了整整兩天，造成大家記餐極大的困擾與不便，團隊致上最深切的歉意！我們已徹夜完成 Gemini 3.x 核心全面升級與雙重備援容錯架構。'}
              </p>
            </div>
          </div>

          {/* 今日更新亮點列表 */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5 ml-1">
              <Sparkles size={14} className="text-amber-800" strokeWidth={3} />
              {isEn ? 'Update & Fix Details' : '本次升級與修復項目一覽'}
            </div>
            
            <FeatureItem 
              icon={Sparkles}
              title={isEn ? "Gemini 3.x Vision & Text Upgrade" : "Gemini 3.x 智能模型核心升級"}
              desc={isEn 
                ? "Upgraded the AI engine to Gemini 3.x for lightning-fast analysis, sharper dish recognition, and more precise macronutrient breakdown."
                : "全面升級至最新世代 Gemini 3.x 視覺與語言模型，餐點辨識更精準、語意理解更細膩、熱量與蛋白質推算更迅速。"}
              badge={isEn ? "Core Upgrade" : "核心升級"}
              iconBg="bg-amber-100"
              iconColor="text-amber-800"
            />

            <FeatureItem 
              icon={RefreshCw}
              title={isEn ? "Intelligent Failover & Auto-Rotation" : "雙重模型智慧容錯輪替"}
              desc={isEn 
                ? "Implemented dynamic multi-model rotation. If any model experiences high traffic, the system seamlessly cascades to healthy backups within milliseconds."
                : "全新實裝多模型與備援金鑰雙層故障轉移架構，即使單一模型或尖峰流量波動，系統毫秒級自動容錯輪替，記餐體驗零中斷。"}
              badge={isEn ? "Reliability" : "高可用架構"}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-800"
            />

            <FeatureItem 
              icon={MessageSquare}
              title={isEn ? "Coach Panda Fully Back Online" : "熊貓教練點評與語音全線回歸"}
              desc={isEn 
                ? "Panda Coach witty roasts, personalized nutritional advice, and live coaching calls are fully operational with improved response quality."
                : "熊貓教練毒舌吐槽、貼心營養小叮嚀、即時通話語音諮詢已全線復原上線，互動更幽默流暢！"}
              badge={isEn ? "Coach Ready" : "教練回歸"}
              iconBg="bg-purple-100"
              iconColor="text-purple-800"
            />

            <FeatureItem 
              icon={Feather}
              title={isEn ? "Slim & Light Top Header" : "頂部導航選單極簡瘦身"}
              desc={isEn 
                ? "Reduced header height by ~40% and softened borders. Branding is compactly arranged on a single line, granting more screen space for your diary."
                : "頂部選單高度大幅縮減約 40%，品牌與名稱改為同行緊湊排列，將最寶貴的手機視野留給飲食日記與紀錄操作。"}
              badge={isEn ? "UI Refresh" : "視覺瘦身"}
              iconBg="bg-sky-100"
              iconColor="text-sky-800"
            />
          </div>

          {/* 資料安全 100% 承諾卡片 */}
          <div className="p-3.5 sm:p-4 bg-white/95 border-2 sm:border-3 border-black rounded-2xl shadow-neo-xs space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-950 font-black text-xs">
              <div className="w-5.5 h-5.5 rounded-lg bg-indigo-100 border-1.5 border-black flex items-center justify-center shrink-0 shadow-xs">
                <Lock size={12} className="text-indigo-700" strokeWidth={3} />
              </div>
              <span>{isEn ? 'Offline-First Local Storage · 100% Safe' : '本機優先離線儲存 · 零記錄遺失承諾'}</span>
            </div>
            <p className="text-[11px] text-zinc-700 font-bold leading-relaxed">
              {isEn 
                ? 'Your meal photos, water logs, and weight trends are safely stored in your device local database (IndexedDB) and automatically synchronized with LINE when connected.'
                : '您的每一筆飲食相片、營養素、水分與體重數據均完好儲存於您手機本機 IndexedDB 資料庫中，網路不穩或離線時均可正常記錄，連線後自動雙向同步。'}
            </p>
          </div>

          {/* 確認關閉按鈕 */}
          <NeoButton 
            variant="black" 
            className="w-full py-3 sm:py-3.5 text-sm sm:text-base rounded-2xl shadow-neo font-black cursor-pointer"
            onClick={onClose}
          >
            {isEn ? 'Got it, let’s explore! 🥗✨' : '我知道了，立即體驗 🥗✨'}
          </NeoButton>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WhatsNew;

