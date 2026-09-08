import React from 'react';
import { PhoneCall, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { t } from '../lib/translations';
import { getAudioContext } from '../lib/phoneAudio';

export default function PandaLiveCallBanner({ onStartCall }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white p-5 sm:p-6 rounded-[2.5rem] border-4 border-black shadow-neo mt-6 mb-4 relative overflow-hidden mx-1 group"
    >
      {/* Background Decorative Rings */}
      <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-10 -top-10 w-44 h-44 rounded-full bg-accent/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Top Header Tag & Status */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-400 text-black px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 border-black flex items-center gap-1.5 shadow-neo-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-700 animate-ping inline-block" />
              {t('live_call_banner_tag')}
            </span>
            <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1">
              <Radio size={12} className="animate-pulse" />
              LIVE
            </span>
          </div>

          <div className="text-zinc-400 font-mono text-[10px] font-bold">
            Realtime Voice AI 🐼
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="font-black italic text-xl sm:text-2xl tracking-tight flex items-center gap-2">
            <span>📞</span>
            <span>{t('live_call_banner_title')}</span>
          </h3>
          <p className="text-zinc-300 font-bold text-xs sm:text-sm leading-relaxed">
            {t('live_call_banner_desc')}
          </p>
        </div>

        {/* Big Action Call Button */}
        <button
          onClick={() => {
            getAudioContext();
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              try {
                window.speechSynthesis.cancel();
                const unlock = new SpeechSynthesisUtterance(' ');
                unlock.volume = 0.01;
                window.speechSynthesis.speak(unlock);
              } catch (e) {}
            }
            onStartCall();
          }}
          className="w-full bg-emerald-400 text-black h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-base sm:text-lg border-2 border-black shadow-neo hover:bg-emerald-300 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer mt-1"
        >
          <div className="bg-black text-emerald-400 p-1.5 rounded-xl border border-black/20 animate-bounce">
            <PhoneCall size={20} />
          </div>
          <span>{t('live_call_banner_btn')}</span>
        </button>
      </div>
    </motion.div>
  );
}
