import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../lib/translations';
import NeoButton from './NeoButton';
import { Sparkles, MessageCircle, Globe, ChevronRight, ArrowLeft, ExternalLink, Check, AlertCircle } from 'lucide-react';

const LINE_BOT_URL = 'https://line.me/R/ti/p/@618iipof';

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1); // 1: Welcome & Name Input, 2: Choose Web or LINE
  const [name, setName] = useState(() => {
    try {
      const saved = localStorage.getItem('user_name');
      return (saved && saved !== 'undefined' && saved !== 'null') ? saved.trim() : '';
    } catch (e) {
      return '';
    }
  });
  const [hasError, setHasError] = useState(false);

  const handleNextToPlatform = (e) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setHasError(true);
      return;
    }
    setHasError(false);
    try {
      localStorage.setItem('user_name', trimmed);
    } catch (err) {}
    setStep(2);
  };

  const handleChooseWeb = () => {
    const trimmed = name.trim() || 'Foodie';
    try {
      localStorage.setItem('user_name', trimmed);
      localStorage.setItem('preferred_platform', 'web');
    } catch (err) {}
    if (onComplete) onComplete(trimmed);
  };

  const handleChooseLine = () => {
    const trimmed = name.trim() || 'Foodie';
    try {
      localStorage.setItem('user_name', trimmed);
      localStorage.setItem('preferred_platform', 'line');
    } catch (err) {}
    // 開啟 LINE 好友連結
    window.open(LINE_BOT_URL, '_blank', 'noopener,noreferrer');
    // 同時完成網頁端 Onboarding，讓用戶回頭查看網頁時也已解鎖
    if (onComplete) onComplete(trimmed);
  };

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-10 overflow-hidden">
        <div className="absolute top-10 left-10 w-60 h-60 border-8 border-white rotate-12 rounded-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 border-8 border-white -rotate-12 rounded-full" />
      </div>

      <div className="relative w-full max-w-md my-auto">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            /* ================= STEP 1: WELCOME & MANDATORY NAME ================= */
            <motion.div
              key="step-1"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 150 }}
              className="bg-white border-4 border-black rounded-[2.5rem] shadow-neo p-6 sm:p-8 flex flex-col space-y-6"
            >
              {/* Header Icon */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <motion.div 
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 150 }}
                    className="w-24 h-24 bg-accent border-4 border-black shadow-neo flex items-center justify-center text-5xl rounded-3xl"
                  >
                    🐼
                  </motion.div>
                  <motion.div 
                    animate={{ scale: [1, 1.25, 1], rotate: [0, 15, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="absolute -top-2 -right-2 bg-white border-2 border-black p-1.5 rounded-full shadow-sm"
                  >
                    <Sparkles size={18} className="text-accent fill-accent" />
                  </motion.div>
                </div>

                <div className="space-y-1.5">
                  <span className="inline-block px-3 py-1 bg-black text-accent text-xs font-black tracking-wider uppercase rounded-full">
                    DAILY DIET
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase leading-tight text-zinc-900">
                    {t('onboarding_welcome_title')}
                  </h2>
                  <p className="text-zinc-500 font-bold text-sm leading-relaxed px-2">
                    {t('onboarding_welcome_desc')}
                  </p>
                </div>
              </div>

              {/* Name Input Section (Mandatory, No Skip) */}
              <form onSubmit={handleNextToPlatform} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-700">
                    {t('onboarding_name_prompt')}
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (hasError && e.target.value.trim()) setHasError(false);
                      }}
                      placeholder={t('onboarding_name_placeholder')}
                      className={`w-full border-4 ${hasError ? 'border-red-500 bg-red-50' : 'border-black bg-zinc-50 focus:bg-white'} p-4 rounded-2xl font-black text-lg text-center transition-all outline-none shadow-inner`}
                      autoFocus
                      maxLength={20}
                    />
                    {name.trim() && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-green-500 text-white rounded-full p-1"
                      >
                        <Check size={16} strokeWidth={3} />
                      </motion.div>
                    )}
                  </div>

                  {hasError ? (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs font-black text-red-600 flex items-center justify-center gap-1 pt-1"
                    >
                      <AlertCircle size={14} />
                      {t('onboarding_name_required_hint')}
                    </motion.p>
                  ) : (
                    <p className="text-[11px] font-bold text-zinc-400 text-center">
                      🔒 姓名為必填，熊貓管家將用此稱呼為您量身提供營養建議
                    </p>
                  )}
                </div>

                {/* Primary Action Button */}
                <NeoButton 
                  type="submit"
                  variant="black" 
                  disabled={!name.trim()}
                  className={`w-full h-14 text-base font-black flex items-center justify-center gap-2 group transition-all ${!name.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                >
                  <span>{t('onboarding_next_step')}</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </NeoButton>
              </form>
            </motion.div>
          ) : (
            /* ================= STEP 2: CHOOSE PLATFORM (WEB or LINE) ================= */
            <motion.div
              key="step-2"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 150 }}
              className="bg-white border-4 border-black rounded-[2.5rem] shadow-neo p-6 sm:p-8 flex flex-col space-y-5"
            >
              {/* Header */}
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent border-2 border-black rounded-full font-black text-xs text-black mb-1">
                  <span>🐼</span>
                  <span>你好，{name.trim()}！</span>
                </div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-tight text-zinc-900">
                  {t('onboarding_choose_platform_title')}
                </h2>
                <p className="text-zinc-500 font-bold text-xs leading-relaxed">
                  {t('onboarding_choose_platform_desc')}
                </p>
              </div>

              {/* Platform Choice Cards */}
              <div className="space-y-3.5">
                {/* 1. LINE Option Card */}
                <div className="border-3 border-black bg-emerald-50/70 hover:bg-emerald-50 rounded-2xl p-4 transition-all hover:translate-x-[2px] hover:translate-y-[2px] shadow-neo-sm relative flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-[#06C755] text-white border-2 border-black rounded-xl flex items-center justify-center text-xl shadow-sm">
                        <MessageCircle size={22} fill="white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-base text-zinc-900">
                            {t('onboarding_platform_line_title')}
                          </h3>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-black text-[#86EFAC] rounded-full inline-block mt-0.5">
                          {t('onboarding_platform_line_badge')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-zinc-600 leading-relaxed">
                    {t('onboarding_platform_line_desc')}
                  </p>

                  <NeoButton
                    variant="green"
                    onClick={handleChooseLine}
                    className="w-full h-12 text-sm font-black flex items-center justify-center gap-1.5"
                  >
                    <span>{t('onboarding_platform_line_btn')}</span>
                    <ExternalLink size={16} />
                  </NeoButton>
                </div>

                {/* 2. Web Option Card */}
                <div className="border-3 border-black bg-zinc-50 hover:bg-white rounded-2xl p-4 transition-all hover:translate-x-[2px] hover:translate-y-[2px] shadow-neo-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-black text-accent border-2 border-black rounded-xl flex items-center justify-center text-xl shadow-sm">
                        <Globe size={22} />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-zinc-900">
                          {t('onboarding_platform_web_title')}
                        </h3>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded-full inline-block mt-0.5">
                          {t('onboarding_platform_web_badge')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-zinc-600 leading-relaxed">
                    {t('onboarding_platform_web_desc')}
                  </p>

                  <NeoButton
                    variant="black"
                    onClick={handleChooseWeb}
                    className="w-full h-12 text-sm font-black flex items-center justify-center gap-1.5"
                  >
                    <span>{t('onboarding_platform_web_btn')}</span>
                    <ChevronRight size={16} />
                  </NeoButton>
                </div>
              </div>

              {/* Bottom Sync Hint & Back button */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold text-zinc-400 text-center leading-relaxed">
                  {t('onboarding_sync_hint')}
                </p>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-xs font-black text-zinc-500 hover:text-black transition-colors flex items-center justify-center gap-1 py-1"
                >
                  <ArrowLeft size={14} />
                  <span>{t('onboarding_back_to_name')}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>,
    document.body
  );
};

export default Onboarding;
