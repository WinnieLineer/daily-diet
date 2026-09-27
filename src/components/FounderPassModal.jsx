import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Sparkles, X, ShieldCheck, Zap, Crown, Heart, Check, Copy } from 'lucide-react';
import { getFounderData, isFounderGlowEnabled, toggleFounderGlow } from '../lib/founderService';

export default function FounderPassModal({ isOpen, onClose, userName = '' }) {
  const [founderData, setFounderData] = useState(null);
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFounderData(getFounderData());
      setGlowEnabled(isFounderGlowEnabled());
    }
  }, [isOpen]);

  const handleToggleGlow = () => {
    const next = !glowEnabled;
    setGlowEnabled(next);
    toggleFounderGlow(next);
  };

  const handleCopyNote = () => {
    const passCode = `DAILY-DIET-FOUNDER-${(founderData?.id || userName || 'VIP').slice(-6).toUpperCase()}`;
    navigator.clipboard.writeText(passCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const holderName = founderData?.name || userName || '尊貴的支持者';
  const addedDate = founderData?.addedAt || founderData?.updatedAt || '創始草創期';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="bg-white border-4 border-black rounded-[2.5rem] shadow-neo-lg w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] relative"
        >
          {/* Modal Header: Gold Shimmer Bar */}
          <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 p-5 border-b-4 border-black relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-black text-amber-300 rounded-2xl text-xl shadow-neo-xs border-2 border-black">
                  👑
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-lg text-black italic tracking-tight">
                      創始支持者尊榮特權證
                    </h3>
                    <span className="bg-black text-amber-300 text-[8px] font-black px-1.5 py-0.2 rounded font-mono uppercase">
                      LIFETIME VIP
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-amber-950 mt-0.5">
                    Daily Diet 早期種子支持者專屬榮譽
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 bg-white hover:bg-black hover:text-white border-2 border-black rounded-xl text-black transition-all cursor-pointer shadow-neo-xs"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs font-bold custom-scrollbar">
            {/* Certificate Card */}
            <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/70 border-3 border-amber-600/80 rounded-[2rem] p-4 text-center shadow-neo-xs space-y-2.5 relative overflow-hidden">
              <div className="flex justify-center">
                <div className="relative">
                  <span className="text-4xl inline-block animate-bounce">🎖️</span>
                  <span className="absolute -top-1 -right-1 text-sm">✨</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-amber-800/80 block">
                  FOUNDER SUPPORTER PASS
                </span>
                <h4 className="text-base font-black text-amber-950 mt-0.5">
                  {holderName}
                </h4>
                <p className="text-[10px] font-mono text-amber-700/90 mt-0.5">
                  登記時間：{addedDate}
                </p>
              </div>

              {founderData?.note && (
                <div className="bg-white/80 border border-amber-300 rounded-xl p-2 text-[10px] text-amber-900 font-bold">
                  💬 專屬備註：{founderData.note}
                </div>
              )}

              <div className="pt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyNote}
                  className="px-3 py-1 bg-amber-300 hover:bg-amber-400 text-amber-950 border border-amber-600 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  {copied ? <Check size={11} className="text-emerald-700" /> : <Copy size={11} />}
                  <span>{copied ? '已複製專屬驗證碼' : '複製創始通行證碼'}</span>
                </button>
              </div>
            </div>

            {/* Exclusive Perks List */}
            <div className="space-y-2">
              <h5 className="font-black text-xs text-zinc-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>您的專屬解鎖特權</span>
              </h5>

              <div className="space-y-1.5">
                {[
                  {
                    icon: '👑',
                    title: '熊貓教練金色皇冠 & 專屬金牌稱號',
                    desc: '熊貓頭像已戴上永久純金皇冠，名牌掛上「🎖️ 創始特權會員」徽章！'
                  },
                  {
                    icon: '⚡',
                    title: 'Gemini 2.5 視覺 AI 最優先高速調用佇列',
                    desc: '拍照飲食視覺分析享受獨立通道，高峰時段享有最高算力優先權！'
                  },
                  {
                    icon: '🐼',
                    title: '教練親暱客製對話與彩蛋吐槽',
                    desc: '點擊教練可觸發專屬於創始大金主的專屬感謝、吐槽與溫柔問候！'
                  },
                  {
                    icon: '🚀',
                    title: '新功能搶先免費內測權',
                    desc: '未來任何進階 AI 模型、語音通話或新模組上線，永久享有優先內測權！'
                  },
                  {
                    icon: '❤️',
                    title: '永久乾淨無廣告保證',
                    desc: '感謝您在草創期拉我們一把，成為 Daily Diet 最堅實的溫暖後盾！'
                  }
                ].map((perk, i) => (
                  <div 
                    key={i} 
                    className="p-2.5 bg-zinc-50 border-2 border-black/10 rounded-2xl flex items-start gap-2.5 transition-all hover:border-black/30"
                  >
                    <span className="text-lg shrink-0 mt-0.5">{perk.icon}</span>
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

            {/* Theme Glow Switch */}
            <div className="p-3 bg-amber-50/70 border-2 border-amber-300 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🌟</span>
                <div>
                  <div className="font-black text-xs text-amber-950">全站金色流光尊榮光環</div>
                  <div className="text-[9px] font-bold text-amber-700">為卡片邊框套用金色奢華微光</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleGlow}
                className={`w-11 h-6 rounded-full border-2 border-black relative transition-colors ${
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
          <div className="p-4 bg-zinc-50 border-t-2 border-black flex items-center justify-between">
            <span className="text-[10px] font-black text-zinc-400">
              Daily Diet · Founder Pass
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
    </AnimatePresence>
  );
}
