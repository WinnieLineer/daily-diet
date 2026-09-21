import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, X, CheckCircle2, Clock, Cloud, Sparkles, RefreshCw, Lock, Activity, MapPin, LayoutGrid } from 'lucide-react';
import NeoButton from './NeoButton';
import { APP_VERSION } from '../lib/constants';

export const isNewer = (newVer, oldVer) => {
  if (!oldVer) return true;
  const cleanNew = String(newVer || '').replace(/^[vV]/, '').trim();
  const cleanOld = String(oldVer || '').replace(/^[vV]/, '').trim();
  if (cleanNew === cleanOld) return false;
  const n = cleanNew.split('.').map(Number);
  const o = cleanOld.split('.').map(Number);
  for (let i = 0; i < Math.max(n.length, o.length); i++) {
    const nVal = isNaN(n[i]) ? 0 : n[i];
    const oVal = isNaN(o[i]) ? 0 : o[i];
    if (nVal > oVal) return true;
    if (nVal < oVal) return false;
  }
  return false;
};

export const LATEST_WHATSNEW_VERSION = '3.3.77';

export const hasWhatsNewContent = (lastSeenVersion) => {
  if (!lastSeenVersion) return false;
  return isNewer(LATEST_WHATSNEW_VERSION, lastSeenVersion);
};

const FeatureItem = ({ icon: Icon, title, desc, badge = "全新功能", iconBg = "bg-amber-100", iconColor = "text-amber-800" }) => (
  <div className="flex items-start gap-3.5 p-3.5 bg-white border-2 border-black rounded-2xl shadow-neo-xs">
    <div className={`w-9 h-9 ${iconBg} border-2 border-black rounded-xl flex items-center justify-center shrink-0 shadow-neo-xs mt-0.5`}>
      <Icon size={18} className={iconColor} strokeWidth={2.5} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="font-black text-xs text-zinc-950 leading-tight">
          {title}
        </div>
        <span className="px-2 py-0.5 bg-black text-accent rounded-md text-[9px] font-black shrink-0 tracking-wider">
          {badge}
        </span>
      </div>
      <div className="text-[11px] text-zinc-600 font-bold leading-relaxed">
        {desc}
      </div>
    </div>
  </div>
);

const WhatsNew = ({ version = APP_VERSION, onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.94, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="bg-accent border-4 border-black w-full max-w-lg rounded-[2.5rem] shadow-neo relative flex flex-col max-h-[92vh] max-h-[92dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-2 bg-white/80 hover:bg-black hover:text-white rounded-2xl transition-colors border-2 border-black z-[310] shadow-neo-xs"
        >
          <X size={20} strokeWidth={3} />
        </button>

        <div className="overflow-y-auto p-6 sm:p-7 flex-1 custom-scrollbar space-y-5">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black text-accent rounded-xl text-[11px] font-black tracking-wider uppercase border-2 border-black shadow-neo-xs">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                🎉 今日重點功能大升級
              </span>
              <span className="inline-block px-2.5 py-1 bg-white text-zinc-900 rounded-xl text-[11px] font-black border-2 border-black shadow-neo-xs">
                v{version} 穩定版
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 leading-tight">
              固定置頂列、即時雲端膠囊與全新體驗
            </h2>
            <p className="text-xs text-zinc-800 font-bold leading-relaxed">
              親愛的 Daily-Diet 用戶您好！今天為大家帶來了多項核心介面與操作體驗的重大進化，讓您的日常飲食、水分與體重紀錄更流暢、更直覺！
            </p>
          </div>

          {/* 今日更新亮點列表 */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5 ml-1">
              <Sparkles size={14} className="text-amber-700" strokeWidth={3} />
              今日升級功能一覽
            </div>
            
            <FeatureItem 
              icon={LayoutGrid}
              title="頂部設定列永遠置頂 (Sticky Header)"
              desc="向下捲動頁面時，頂部設定、雙語切換、即時時鐘與週報按鈕永遠固定於最上方，隨時可切換設定，不再需要滑回頂部！"
              badge="全新置頂"
              iconBg="bg-amber-100"
              iconColor="text-amber-800"
            />

            <FeatureItem 
              icon={RefreshCw}
              title="雲端雙向即時同步膠囊與手動同步"
              desc="最上方新增動態同步提示膠囊與狀態微燈號，LINE ↔ Web 雙向資料即時同步狀態一目了然，隨時點擊燈號即可立即重新同步。"
              badge="即時狀態"
              iconBg="bg-emerald-100"
              iconColor="text-emerald-800"
            />

            <FeatureItem 
              icon={MapPin}
              title="智慧地理位置標記與反查優化"
              desc="全面過濾冗餘的未知地點佔位符，並導入高精度客戶端地理編碼雙重備援，記餐時的行政區與城市更精準。"
              badge="精準定位"
              iconBg="bg-sky-100"
              iconColor="text-sky-800"
            />

            <FeatureItem 
              icon={ShieldCheck}
              title="新野獸派友善異常防護畫面"
              desc="告別冷硬刺眼的傳統紅底報錯！換上可愛熊貓教練守護畫面與一鍵式快取重新整理，本機飲食與體重資料安全無虞。"
              badge="安心守護"
              iconBg="bg-rose-100"
              iconColor="text-rose-800"
            />

            <FeatureItem 
              icon={CheckCircle2}
              title="設定彈窗全螢幕架構優化"
              desc="採用全新 React Portal 架構，設定視窗與支持贊助彈窗擺脫頂部限制，在各類手機與螢幕尺寸下皆能精確置中、滑順操作。"
              badge="體驗升級"
              iconBg="bg-purple-100"
              iconColor="text-purple-800"
            />
          </div>

          {/* 資料安全 100% 承諾卡片 */}
          <div className="p-4 bg-white/95 border-3 border-black rounded-2xl shadow-neo-sm space-y-2">
            <div className="flex items-center gap-2 text-indigo-950 font-black text-xs">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 border-2 border-black flex items-center justify-center shrink-0 shadow-neo-xs">
                <Lock size={13} className="text-indigo-700" strokeWidth={3} />
              </div>
              <span>本機優先離線儲存 · 零記錄遺失承諾</span>
            </div>
            <p className="text-[11px] text-zinc-700 font-bold leading-relaxed">
              <strong>您的所有紀錄均安全無虞！</strong>
              您在手機或電腦端所記錄的每一筆飲食、水分、體重與排便數據，皆優先完好保存在本機離線資料庫（IndexedDB）中，並自動在有網路時與 LINE 雲端進行雙向同步。
            </p>
          </div>

          {/* 感謝與簽名 */}
          <div className="p-3.5 bg-amber-50/90 border-2 border-black rounded-2xl text-[11px] text-amber-950 font-bold leading-relaxed flex items-start gap-2.5 shadow-neo-xs">
            <span className="text-lg leading-none">🐼</span>
            <span>
              非常感謝大家的喜愛與一路相伴！我們會持續打磨每一個細節，讓健康管理變得簡單又有趣。請繼續享受健康無負擔的每一餐！
            </span>
          </div>

          {/* 確認關閉按鈕 */}
          <NeoButton 
            variant="black" 
            className="w-full py-3.5 text-base rounded-2xl shadow-neo font-black"
            onClick={onClose}
          >
            我知道了，開始探索新功能 🥗✨
          </NeoButton>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WhatsNew;
