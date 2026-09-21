import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, X, CheckCircle2, Clock, Cloud, Sparkles, RefreshCw, Lock, Activity } from 'lucide-react';
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

export const LATEST_WHATSNEW_VERSION = '3.3.58';

export const hasWhatsNewContent = (lastSeenVersion) => {
  if (!lastSeenVersion) return false;
  return isNewer(LATEST_WHATSNEW_VERSION, lastSeenVersion);
};

const StatusItem = ({ icon: Icon, title, desc, tag = "正常運作" }) => (
  <div className="flex items-center justify-between p-3.5 bg-white border-2 border-black rounded-2xl shadow-neo-xs">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-emerald-100 border-2 border-black rounded-xl flex items-center justify-center shrink-0 shadow-neo-xs">
        <Icon size={18} className="text-emerald-700" strokeWidth={2.5} />
      </div>
      <div>
        <div className="font-black text-xs text-zinc-900 leading-tight flex items-center gap-1.5">
          {title}
        </div>
        <div className="text-[11px] text-zinc-500 font-bold leading-tight mt-0.5">
          {desc}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500 text-white rounded-lg border-2 border-black text-[10px] font-black shrink-0 shadow-neo-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      {tag}
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
        className="bg-accent border-4 border-black w-full max-w-lg rounded-[2.5rem] shadow-neo relative flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-2 bg-white/80 hover:bg-black hover:text-white rounded-2xl transition-colors border-2 border-black z-[310] shadow-neo-xs"
        >
          <X size={20} strokeWidth={3} />
        </button>

        <div className="overflow-y-auto p-6 sm:p-7 flex-1 custom-scrollbar space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black text-emerald-400 rounded-xl text-[11px] font-black tracking-wider uppercase border-2 border-black shadow-neo-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                🟢 服務全面恢復公告
              </span>
              <span className="inline-block px-2.5 py-1 bg-white text-zinc-900 rounded-xl text-[11px] font-black border-2 border-black shadow-neo-xs">
                v{version} 穩定版
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 leading-tight">
              雲端服務與 LINE 助理已全面修復
            </h2>
            <p className="text-xs text-zinc-800 font-bold leading-relaxed">
              親愛的 Daily-Diet 用戶您好：先前因後端 Google Apps Script 雲端通訊閘道權限逾期所導致的短暫連線中斷，目前開發團隊已完成權限重新授權、全鏈路通道重新部署與功能健康驗證，各項核心功能現已全數恢復正常運作。
            </p>
          </div>

          {/* 模組狀態列表 */}
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5 ml-1">
              <Activity size={14} className="text-emerald-700" strokeWidth={3} />
              系統核心模組運行狀態
            </div>
            <div className="space-y-2">
              <StatusItem 
                icon={Sparkles} 
                title="LINE 智能對話與拍照辨識" 
                desc="餐點拍照分析、文字/語音打卡、今日總結" 
              />
              <StatusItem 
                icon={RefreshCw} 
                title="Web ↔ LINE 雙向即時同步" 
                desc="兩端餐點紀錄即時互通、補水與體重更新" 
              />
              <StatusItem 
                icon={Cloud} 
                title="個人 Gist 雲端安全備份" 
                desc="個人獨立加密儲存、定時同步" 
              />
            </div>
          </div>

          {/* 資料安全 100% 承諾卡片 */}
          <div className="p-4 bg-white/95 border-3 border-black rounded-2xl shadow-neo-sm space-y-2">
            <div className="flex items-center gap-2 text-indigo-950 font-black text-xs">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 border-2 border-black flex items-center justify-center shrink-0 shadow-neo-xs">
                <Lock size={13} className="text-indigo-700" strokeWidth={3} />
              </div>
              <span>本機離線儲存機制 · 零記錄遺失保證</span>
            </div>
            <p className="text-[11px] text-zinc-700 font-bold leading-relaxed">
              <strong>您的所有紀錄均安全無虞！</strong>
              在雲端閘道異常期間，您在手機或電腦端所記錄的每一筆飲食、水分、體重與排便數據，皆完好地保存在客戶端的離線資料庫（IndexedDB）中。
            </p>
            <div className="p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl text-[11px] text-indigo-900 font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
              <span>連線已自動重建，雙向記錄已無縫補同步完成，無需手動補登。</span>
            </div>
          </div>

          {/* 事件時序與影響說明 */}
          <div className="p-4 bg-emerald-50/90 border-3 border-black rounded-2xl shadow-neo-sm space-y-2">
            <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
              <div className="w-6 h-6 rounded-lg bg-emerald-200 border-2 border-black flex items-center justify-center shrink-0 shadow-neo-xs">
                <Clock size={13} className="text-emerald-800" strokeWidth={3} />
              </div>
              <span>事件說明與處置紀錄</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-emerald-950/90 font-bold leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 shrink-0">•</span>
                <span><strong>影響時段</strong>：2026/09/15 至 2026/09/17</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 shrink-0">•</span>
                <span><strong>異常原因</strong>：Google Apps Script 雲端通訊閘道之授權憑證到期，導致外部連線請求被拒絕（403）。</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 shrink-0">•</span>
                <span><strong>防護升級</strong>：已導入自動化前瞻預警與 LINE 智慧降級容錯通道，確保卡片回傳萬無一失。</span>
              </div>
            </div>
          </div>

          {/* 感謝與簽名 */}
          <div className="p-3.5 bg-amber-50/90 border-2 border-black rounded-2xl text-[11px] text-amber-950 font-bold leading-relaxed flex items-start gap-2.5 shadow-neo-xs">
            <span className="text-lg leading-none">🐼</span>
            <span>
              非常感謝大家的包容、反饋與一路相伴！造成您的不便深感抱歉，熊貓教練已全面就位，請繼續享受健康、美味、無負擔的每一餐！
            </span>
          </div>

          {/* 確認關閉按鈕 */}
          <NeoButton 
            variant="black" 
            className="w-full py-3.5 text-base rounded-2xl shadow-neo font-black"
            onClick={onClose}
          >
            我知道了，開始健康記錄 🥗
          </NeoButton>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WhatsNew;
