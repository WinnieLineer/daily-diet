import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Sparkles, Flame, MapPin, Calendar, Loader2 } from 'lucide-react';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { t } from '../lib/translations';

const SharingCard = ({ isOpen, onClose, summary, goals, streak, advice }) => {
  const cardRef = useRef(null);
  const [exportState, setExportState] = useState(null); // 'download' | 'share' | null

  const generateCanvas = async () => {
    return await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#F8FAFC',
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
          title: t('app_title') || 'Daily Diet',
          text: 'My Daily Diet 🐼'
        });
      } else {
        alert(t('share_not_supported') || 'Native sharing is not supported on your browser. Please save as image instead.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error("Share error:", err);
    } finally {
      setExportState(null);
    }
  };

  if (!isOpen) return null;

  const calProgress = Math.min((summary.calories / goals.calories) * 100, 100);
  const proProgress = Math.min((summary.protein / goals.protein) * 100, 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md" 
          onClick={onClose} 
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm flex flex-col gap-4"
        >
          {/* Capture Area */}
          <div 
            ref={cardRef}
            className="bg-[#F8FAFC] border-8 border-black p-6 rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
          >
            {/* Background Decor */}
            <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-accent/20 rounded-full blur-3xl" />
            <div className="absolute bottom-[-5%] left-[-5%] w-32 h-32 bg-rose-500/10 rounded-full blur-2xl" />

            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-black italic tracking-tighter leading-[0.85] mb-3">DAILY<br/>DIET</h1>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">
                  <Calendar size={10} />
                  {new Date().toLocaleDateString()}
                </div>
              </div>
              <div className="bg-black text-white px-3 py-1.5 rounded-xl border-2 border-black flex items-center gap-1.5 shadow-neo-sm">
                <Flame size={14} className="text-orange-400 fill-orange-400" />
                <span className="font-black italic text-sm">{streak} DAY STREAK</span>
              </div>
            </div>

            {/* Panda Advice Section */}
            <div className="bg-white border-4 border-black p-4 rounded-2xl mb-6 shadow-neo-sm relative">
              <div className="absolute top-[-12px] left-4 bg-accent border-2 border-black px-2 py-0.5 rounded-lg">
                <span className="text-[8px] font-black uppercase tracking-wider">Panda Coach Says:</span>
              </div>
              <p className="text-lg font-black italic leading-tight text-black pt-1">
                "{advice || 'Keep tracking, human! 🐼'}"
              </p>
            </div>

            {/* Metrics */}
            <div className="space-y-4 mb-6">
              <div className="space-y-1.5">
                <div className="flex justify-between items-end px-1">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Calories</span>
                  <span className="text-lg font-black italic">{summary.calories} <span className="text-[10px] opacity-40">/ {goals.calories}</span></span>
                </div>
                <div className="h-6 bg-zinc-100 border-2 border-black rounded-full overflow-hidden p-0.5">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${calProgress}%` }}
                     className="h-full bg-accent rounded-full border-r-2 border-black" 
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-end px-1">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Protein</span>
                  <span className="text-lg font-black italic">{summary.protein}g <span className="text-[10px] opacity-40">/ {goals.protein}g</span></span>
                </div>
                <div className="h-6 bg-zinc-100 border-2 border-black rounded-full overflow-hidden p-0.5">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${proProgress}%` }}
                     className="h-full bg-rose-400 rounded-full border-r-2 border-black" 
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-end px-1">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Water</span>
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
                <><Download size={18} /> SAVE</>
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
                <><Share2 size={18} /> SHARE</>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SharingCard;
