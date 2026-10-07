import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ShieldCheck } from 'lucide-react';
import { 
  getFounderData, 
  isFounderGlowEnabled, 
  toggleFounderGlow, 
  checkFounderStatusFromCloud 
} from '../lib/founderService';

export default function FounderPassModal({ isOpen, onClose, userName = '' }) {
  const [founderData, setFounderData] = useState(() => getFounderData());
  const [glowEnabled, setGlowEnabled] = useState(true);

  // 1. 監聽創始者資料更新事件 (即時響應 SWR 與本機廣播)
  useEffect(() => {
    const handleStatusUpdate = (e) => {
      if (e.detail?.data) {
        setFounderData(e.detail.data);
      } else {
        setFounderData(getFounderData());
      }
    };
    window.addEventListener('founder-status-updated', handleStatusUpdate);
    return () => window.removeEventListener('founder-status-updated', handleStatusUpdate);
  }, []);

  // 2. 當彈窗開啟時：先讀本機秒開，同時立即向雲端發起非同步校驗更新 (做到即刻同步)
  useEffect(() => {
    if (isOpen) {
      const cached = getFounderData();
      setFounderData(cached);
      setGlowEnabled(isFounderGlowEnabled());

      // SWR 即時後台校驗：向雲端拉取管理員最新修改的序號與感謝詞
      try {
        const curUser = (typeof localStorage !== 'undefined' && (localStorage.getItem('user_name') || localStorage.getItem('line_user_name'))) || userName || cached?.name || '';
        const curId = (typeof localStorage !== 'undefined' && (localStorage.getItem('line_user_id') || localStorage.getItem('client_id'))) || cached?.id || '';
        const curEmail = cached?.email || '';
        if (curUser || curId || curEmail) {
          checkFounderStatusFromCloud(curId, curUser, curEmail).then(() => {
            const fresh = getFounderData();
            if (fresh) setFounderData(fresh);
          }).catch(() => {});
        }
      } catch (err) {}

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, userName]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggleGlow = () => {
    const next = !glowEnabled;
    setGlowEnabled(next);
    toggleFounderGlow(next);
  };

  const holderName = founderData?.name || userName || '尊貴的支持者';
  const founderSeq = founderData?.number || 'NO. 168';
  const addedDate = founderData?.addedAt || founderData?.updatedAt || '創始草創期';

  // 寄語文字：若後台有指定公開寄語則優先採用，否則顯示真摯感人的官方致謝詞
  const thankYouGreeting = (founderData?.greeting && founderData.greeting.trim())
    ? founderData.greeting.trim()
    : '感謝您在 Daily Diet 萌芽之初給予最溫暖的肯定與力量，這份心意是 Daily Diet 持續進化的永恆基石！🎋✨';

  const modalNode = (
    <AnimatePresence>
      {isOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[650] w-screen h-screen min-h-[100dvh] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white border-4 border-black rounded-[2.2rem] sm:rounded-[2.5rem] shadow-neo-lg w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] relative"
        >
          {/* Modal Header: Brushed Gold Bar */}
          <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-4 sm:px-5 py-4 border-b-4 border-black relative overflow-hidden flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 bg-black text-amber-300 rounded-xl text-lg shadow-neo-xs border-2 border-black flex items-center justify-center shrink-0">
                👑
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-base sm:text-lg text-black italic tracking-tight">
                    創始支持者尊榮金卡
                  </h3>
                  <span className="bg-black text-amber-300 text-[8px] font-black px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                    LIFETIME VIP
                  </span>
                </div>
                <p className="text-[10px] font-bold text-amber-950 mt-0.5">
                  Daily Diet 早期種子支持者專屬榮譽通行證
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-white hover:bg-black hover:text-white border-2 border-black rounded-xl text-black transition-all cursor-pointer shadow-neo-xs shrink-0 active:scale-95"
            >
              <X size={16} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-bold custom-scrollbar">
            {/* 👑 Premium Digital Gold Pass Card */}
            <div className="relative rounded-3xl p-5 border-3 border-black bg-gradient-to-br from-[#F59E0B] via-[#FBBF24] to-[#D97706] shadow-neo text-black overflow-hidden select-none">
              {/* Card Ambient Glow / Foil Sheen Effect */}
              <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-amber-900/15 rounded-full blur-xl pointer-events-none" />

              {/* Card Top Row: Logo & Sequential Number */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🎋</span>
                  <span className="font-black tracking-widest text-[10px] text-amber-950/90 uppercase font-mono">
                    DAILY DIET FOUNDER
                  </span>
                </div>
                <div className="bg-black text-amber-300 font-mono font-black text-[10px] px-2.5 py-1 rounded-lg border border-amber-400/50 shadow-[0_2px_4px_rgba(0,0,0,0.3)] tracking-wider flex items-center gap-1">
                  <span className="text-[9px]">👑</span>
                  <span>{founderSeq}</span>
                </div>
              </div>

              {/* Card Middle: Holder Name & Status */}
              <div className="my-5 relative z-10">
                <div className="text-[9px] uppercase tracking-wider text-amber-950/80 font-mono font-bold">
                  FOUNDER PASS HOLDER
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-black tracking-tight mt-0.5 truncate drop-shadow-sm">
                  {holderName}
                </h4>
                <div className="flex items-center gap-1 mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-black/80" />
                  <span className="text-[10px] font-bold text-amber-950">
                    早期種子支持者 · 永久榮譽會員
                  </span>
                </div>
              </div>

              {/* Card Bottom Row: Issued Date & Verified Seal */}
              <div className="flex items-end justify-between pt-2 border-t-2 border-black/20 relative z-10 text-[9.5px]">
                <div>
                  <div className="text-[8.5px] text-amber-950/75 uppercase font-mono">
                    VERIFIED DATE
                  </div>
                  <div className="font-mono font-bold text-amber-950">
                    {addedDate}
                  </div>
                </div>

                <div className="bg-white/90 border border-black/80 rounded-lg px-2 py-1 flex items-center gap-1 shadow-xs">
                  <ShieldCheck size={12} className="text-amber-700" />
                  <span className="font-mono text-[9px] font-black text-amber-950 uppercase tracking-tighter">
                    OFFICIAL VERIFIED
                  </span>
                </div>
              </div>
            </div>

            {/* 💌 Founder's Thank-You Note */}
            <div className="p-3.5 bg-amber-50/80 border-2 border-amber-300 rounded-2xl relative shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-950 font-black text-[11px] mb-1">
                <span>💌</span>
                <span>創作者致謝寄語</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed font-bold italic pl-1 border-l-2 border-amber-400">
                「{thankYouGreeting}」
              </p>
              <div className="text-right text-[9px] font-black text-amber-800/80 mt-1 font-mono">
                — Daily Diet 團隊 敬上 🎋
              </div>
            </div>

            {/* 👑 Real & Authentic Exclusive Perks */}
            <div className="space-y-2">
              <h5 className="font-black text-xs text-zinc-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>您的專屬解鎖特權</span>
              </h5>

              <div className="space-y-1.5">
                {[
                  {
                    icon: '👑',
                    title: '熊貓教練純金皇冠 & 專屬金牌稱號',
                    desc: '教練頭像已戴上永久純金皇冠，名稱旁常駐專屬金色尊榮徽章。'
                  },
                  {
                    icon: '💬',
                    title: '專屬親暱對話與感謝彩蛋',
                    desc: '點擊熊貓教練可觸發創始支持者專屬的客製感謝、趣味吐槽與問候。'
                  },
                  {
                    icon: '🌟',
                    title: '全站金色流光尊榮光環',
                    desc: '全站卡片飾條可自訂金色奢華流光，彰顯獨一無二的創始身分。'
                  },
                  {
                    icon: '🚀',
                    title: '未來新功能永久免費優先內測',
                    desc: '任何新模組、進階分析或新功能上線，永久享有優先內測體驗權。'
                  },
                  {
                    icon: '🛡️',
                    title: '永久純淨無廣告健康承諾',
                    desc: '感謝您拉我們一把，Daily Diet 永遠為您提供純淨無干擾的紀錄體驗。'
                  }
                ].map((perk, i) => (
                  <div 
                    key={i} 
                    className="p-2.5 bg-zinc-50 border-2 border-black/10 rounded-2xl flex items-start gap-2.5 transition-all hover:border-black/30"
                  >
                    <span className="text-base shrink-0 mt-0.5">{perk.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-[11px] text-zinc-900 leading-tight">
                        {perk.title}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-bold leading-snug mt-0.5">
                        {perk.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 🌟 Theme Glow Switch */}
            <div className="p-3 bg-amber-50/70 border-2 border-amber-300 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🌟</span>
                <div>
                  <div className="font-black text-xs text-amber-950">全站金色流光尊榮光環</div>
                  <div className="text-[9px] font-bold text-amber-700">為卡片邊框套用金色奢華微光飾條</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleGlow}
                className={`w-11 h-6 rounded-full border-2 border-black relative transition-colors cursor-pointer ${
                  glowEnabled ? 'bg-amber-400' : 'bg-zinc-200'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white border-2 border-black absolute top-0.5 transition-all ${
                    glowEnabled ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-3.5 sm:p-4 bg-zinc-50 border-t-2 border-black flex items-center justify-between">
            <span className="text-[10px] font-black text-zinc-400 font-mono">
              Daily Diet · Founder Supporter
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-black text-white hover:bg-zinc-800 border-2 border-black rounded-xl text-xs font-black shadow-neo-xs active:scale-95 transition-all cursor-pointer"
            >
              太棒了 🐼✨
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }
  return modalNode;
}
