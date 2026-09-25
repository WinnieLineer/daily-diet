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
              {isEn ? 'Slim Header, Dialogue Fix & Smarter Sync' : '選單清爽瘦身、話框遮蔽修復與全新同步體驗'}
            </h2>
            <p className="text-xs sm:text-[13px] text-zinc-800 font-bold leading-relaxed">
              {isEn 
                ? 'Thank you for using Daily-Diet! We have tuned the top navigation, resolved visual overlapping, and smoothed out multi-screen responsiveness.' 
                : '親愛的 Daily-Diet 用戶您好！本次更新帶來了頂部導航瘦身、修復了話框遮擋與多項介面調校，讓您的日常飲食紀錄更清爽流暢！'}
            </p>
          </div>

          {/* 今日更新亮點列表 */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5 ml-1">
              <Sparkles size={14} className="text-amber-800" strokeWidth={3} />
              {isEn ? 'Update & Fix Details' : '本次升級與修復項目一覽'}
            </div>
            
            <FeatureItem 
              icon={Feather}
              title={isEn ? "Slim & Light Top Header" : "頂部導航選單極簡瘦身"}
              desc={isEn 
                ? "Reduced header height by ~40% and softened borders. Branding is now compactly arranged on a single line, granting more screen space for your diary."
                : "告別過去厚重的黑底邊框！頂部選單高度大幅縮減約 40%，品牌與名稱改為同行緊湊排列，將最寶貴的手機視野留給飲食日記與紀錄操作。"}
              badge={isEn ? "UI Refresh" : "視覺瘦身"}
              iconBg="bg-amber-100"
              iconColor="text-amber-800"
            />

            <FeatureItem 
              icon={MessageSquare}
              title={isEn ? "Panda Speech Bubble Overlap Fixed" : "熊貓教練話框遮蔽修復"}
              desc={isEn 
                ? "Resolved issue where the sticky header overlapped Panda Coach speech bubbles. Dialogue area now automatically adapts with clean vertical headroom."
                : "徹底解決置頂固定選單遮擋熊貓金句與語音話框的問題！已加入自適應防遮擋間距與動態貼合機制，對話泡泡不再被裁切。"}
              badge={isEn ? "Bug Fix" : "重大修復"}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-800"
            />

            <FeatureItem 
              icon={RefreshCw}
              title={isEn ? "Compact Live Sync Micro-Dot" : "LINE 雲端同步短字與微燈號"}
              desc={isEn 
                ? "Sync status is now neatly integrated next to the version label without occupying extra lines. Tap the micro-dot anytime to manually trigger sync."
                : "同步狀態不再額外佔據整行版面，直接精簡融入版本號旁，並以靈動小燈號即時呈現連線與同步進度（支援隨時點擊立即手動重整）。"}
              badge={isEn ? "Live Sync" : "即時狀態"}
              iconBg="bg-sky-100"
              iconColor="text-sky-800"
            />

            <FeatureItem 
              icon={Languages}
              title={isEn ? "Modern Neo-Brutalist Bilingual Switch" : "簡約雙語切換新開關"}
              desc={isEn 
                ? "Replaced the legacy blue globe icon with a sleek neo-brutalist dual slider (中 / EN) for instant, seamless language switching."
                : "移除原本突兀的藍色地球圖標，重新打造成俐落的新野獸派黑白黃滑動切換器（中 / EN），視覺協調且手感流暢。"}
              badge={isEn ? "Redesign" : "風格煥新"}
              iconBg="bg-purple-100"
              iconColor="text-purple-800"
            />

            <FeatureItem 
              icon={BarChart2}
              title={isEn ? "Weekly Report Mobile Overflow Fix" : "週報彈窗手機邊界防溢出"}
              desc={isEn 
                ? "Fixed edge cases where weekly summary reports might exceed boundaries on narrow mobile screens. Smooth multi-axis scrolling assured."
                : "修復週結算報告在部分小螢幕或高縮放比例手機上彈窗可能超出畫面或破版的問題，全螢幕多維度滾動更平穩。"}
              badge={isEn ? "Layout Fix" : "佈局修復"}
              iconBg="bg-rose-100"
              iconColor="text-rose-800"
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

