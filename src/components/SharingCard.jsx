import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Download, Share2, Sparkles, Flame, MapPin, Calendar, Loader2, Zap } from 'lucide-react';
import { getPandaAdvice } from '../lib/gemini';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { t, getLanguage } from '../lib/translations';

const SharingCard = ({ isOpen, onClose, summary, goals, streak, advice, userName }) => {
  const cardRef = useRef(null);
  const [exportState, setExportState] = useState(null); // 'download' | 'share' | null
  const [aiRoast, setAiRoast] = useState('');
  const [isRoasting, setIsRoasting] = useState(false);

  const handleGetRoast = async () => {
    if (isRoasting) return;
    setIsRoasting(true);
    try {
      const isZero = summary.calories === 0 && summary.protein === 0 && summary.water === 0;
      let prompt = "";
      
      if (isZero) {
        prompt = `The user has eaten NOTHING today (all stats are 0). Give a SHARP, WITTY, and SAVAGE roast about them starving or being a "breatharian". Max 10 words. Language: ${getLanguage() === 'zh' ? 'Traditional Chinese' : 'English'}. No emojis in text.`;
      } else {
        prompt = `Today's stats: Calories ${summary.calories}/${goals.calories}, Protein ${summary.protein}/${goals.protein}, Water ${summary.water}/${goals.water}. 
        Give a SHARP, SAVAGE, and SHORT roast (max 10 words) about this diet. 
        If they ate too much, roast their greed. If they ate too little, roast their weakness. If it's perfect, be suspicious.
        Language: ${getLanguage() === 'zh' ? 'Traditional Chinese' : 'English'}. No emojis in text, keep it purely punchy and "roasty".`;
      }
      
      const result = await getPandaAdvice(prompt);
      setAiRoast(result.replace(/[#*]/g, '').replace(/["「」]/g, '').trim().slice(0, 50));
    } catch (err) {
      console.error("Roast error:", err);
    } finally {
      setIsRoasting(false);
    }
  };

  const generateCanvas = async () => {
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
      link.download = `daily-diet-summary-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export error:", err);
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
      
      const file = new File([blob], `daily-diet-summary-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('share_title') || 'Daily Diet Summary',
          text: t('share_text') || 'Check out my progress today!'
        });
      } else {
        // Fallback to download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `daily-diet-summary-${new Date().toISOString().split('T')[0]}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Share error:", err);
    } finally {
      setExportState(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[600]">
      <AnimatePresence>
        <motion.div 
          key="sharing-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md" 
          onClick={onClose} 
        />
        
        <div key="sharing-content-container" className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
          <motion.div 
            key="sharing-card-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm flex flex-col gap-4 pointer-events-auto"
          >
            {/* Capture Wrapper to preserve shadow box */}
            <div ref={cardRef} className="p-4 pr-6 pb-6">
              <div 
                className="bg-[#F8FAFC] border-8 border-black p-6 rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
              >
              {/* Background Decor */}
              <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-accent/20 rounded-full blur-3xl" />
              <div className="absolute bottom-[-5%] left-[-5%] w-32 h-32 bg-rose-500/10 rounded-full blur-2xl" />

              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-black italic tracking-tighter leading-[0.85] mb-2">DAILY<br/>DIET</h1>
                  {userName && (
                    <div className="mb-2">
                      <span className="bg-black text-accent px-2 py-0.5 rounded-lg text-[10px] font-black italic uppercase tracking-wider">
                        {userName}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">
                    <Calendar size={10} />
                    <span>{new Date().toLocaleDateString(getLanguage() === 'zh' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <button 
                  onClick={handleGetRoast}
                  disabled={isRoasting}
                  className={`bg-accent border-4 border-black p-3 rounded-2xl shadow-neo-sm transition-all active:scale-90 relative ${isRoasting ? 'animate-bounce' : 'hover:-rotate-12'}`}
                >
                  <Sparkles className={isRoasting ? 'animate-spin' : ''} size={24} fill="currentColor" />
                  {!aiRoast && !isRoasting && (
                    <div className="absolute -bottom-8 right-0 bg-black text-white text-[8px] font-black px-2 py-1 rounded-lg whitespace-nowrap animate-pulse">
                      點擊銳評 👆
                    </div>
                  )}
                </button>
              </div>

              {/* Stats Grid */}
              <div className="space-y-6 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border-4 border-black p-4 rounded-3xl shadow-neo-xs">
                    <div className="flex items-center gap-2 mb-1 opacity-40">
                      <Flame size={12} className="text-rose-500" />
                      <span className="text-[10px] font-black uppercase tracking-wider">{t('calories')}</span>
                    </div>
                    <div className="text-xl font-black italic">{summary.calories} <span className="text-[10px] opacity-40">kcal</span></div>
                  </div>
                  <div className="bg-white border-4 border-black p-4 rounded-3xl shadow-neo-xs">
                    <div className="flex items-center gap-2 mb-1 opacity-40">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-wider">{t('protein')}</span>
                    </div>
                    <div className="text-xl font-black italic">{summary.protein} <span className="text-[10px] opacity-40">g</span></div>
                  </div>
                </div>

                {/* Roast Section */}
                <AnimatePresence mode="wait">
                  {(aiRoast || isRoasting) && (
                    <motion.div 
                      key="roast-bubble"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-black text-white p-4 rounded-3xl relative mb-6 overflow-hidden"
                    >
                      <div className="relative z-10 flex items-start gap-3">
                        <Zap size={14} className="text-accent shrink-0 mt-1" fill="currentColor" />
                        <p className="font-black italic text-xs leading-relaxed tracking-tight">
                          {isRoasting ? '熊貓正在醞釀毒舌...' : aiRoast}
                        </p>
                      </div>
                      <div className="absolute -right-2 -bottom-2 opacity-20 rotate-12">
                        <Sparkles size={48} className="text-accent" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{t('water')}</span>
                    <span className="text-lg font-black italic">{summary.water}ml <span className="text-[10px] opacity-40">/ {goals.water}ml</span></span>
                  </div>
                  <div className="h-6 bg-zinc-100 border-2 border-black rounded-full overflow-hidden p-0.5">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${Math.min((summary.water / goals.water) * 100, 100)}%` }}
                       className="h-full bg-sky-400 rounded-full border-r-2 border-black" 
                     />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t-2 border-black/5">
                 <div className="text-[10px] font-black text-zinc-300 uppercase letter tracking-[0.2em]">
                   winnie-lin.space/daily-diet
                 </div>
              </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 mt-4">
              <button 
                onClick={onClose}
                disabled={!!exportState}
                className="px-4 bg-white border-4 border-black p-3 rounded-2xl font-black italic transition-all active:scale-95 shadow-neo-sm flex items-center justify-center disabled:opacity-50 text-sm sm:text-base"
              >
                <X size={20} />
              </button>
              <button 
                onClick={handleDownload}
                disabled={!!exportState}
                className="flex-1 bg-white border-4 border-black p-3 rounded-2xl font-black italic flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-neo-sm disabled:opacity-50 text-sm sm:text-base"
              >
                {exportState === 'download' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <><Download size={18} /> {t('save_image')}</>
                )}
              </button>
              <button 
                onClick={handleShare}
                disabled={!!exportState}
                className="flex-[1.2] bg-accent border-4 border-black p-3 rounded-2xl font-black italic flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-neo-sm disabled:opacity-50 text-sm sm:text-base"
              >
                {exportState === 'share' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <><Share2 size={18} /> {t('share_image')}</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default SharingCard;
