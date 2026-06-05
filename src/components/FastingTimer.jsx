import React, { useState, useEffect } from 'react';
import NeoCard from './NeoCard';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../lib/translations';
import { Clock, Zap, Heart } from 'lucide-react';

const isOutsideEatingWindow = (nowDate, startStr, endStr) => {
  if (!startStr || !endStr) return false;
  const hourMin = nowDate.getHours() * 60 + nowDate.getMinutes();
  const [sH, sM] = startStr.split(':').map(Number);
  const startMins = sH * 60 + sM;
  const [eH, eM] = endStr.split(':').map(Number);
  const endMins = eH * 60 + eM;

  if (startMins <= endMins) {
    return hourMin < startMins || hourMin > endMins;
  } else {
    return hourMin < startMins && hourMin > endMins;
  }
};

const getCountdown = (nowDate, startStr, endStr) => {
  const isOutside = isOutsideEatingWindow(nowDate, startStr, endStr);
  const targetStr = isOutside ? startStr : endStr;
  const nowMs = nowDate.getTime();

  const [tH, tM] = targetStr.split(':').map(Number);
  const candidate1 = new Date(nowDate);
  candidate1.setHours(tH, tM, 0, 0);

  const candidate2 = new Date(candidate1);
  candidate2.setDate(candidate2.getDate() + 1);

  let targetDate = candidate1;
  if (candidate1 <= nowDate) {
    targetDate = candidate2;
  }

  const diffMs = targetDate.getTime() - nowMs;
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));

  const hours = Math.floor(diffSecs / 3600);
  const minutes = Math.floor((diffSecs % 3600) / 60);
  const seconds = diffSecs % 60;

  return {
    isFasting: isOutside,
    hours,
    minutes,
    seconds,
    totalSeconds: diffSecs
  };
};

export default function FastingTimer({ goals }) {
  const { fasting_enabled, fasting_start, fasting_end } = goals || {};
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!fasting_enabled) return;
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [fasting_enabled]);

  if (!fasting_enabled || !fasting_start || !fasting_end) return null;

  const data = getCountdown(now, fasting_start, fasting_end);

  const pad = (num) => String(num).padStart(2, '0');

  // Calculate percentage of progress in current state
  // Fasting window length (mins) vs Eating window length (mins)
  const getWindowLengths = () => {
    const [sH, sM] = fasting_start.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const [eH, eM] = fasting_end.split(':').map(Number);
    const endMins = eH * 60 + eM;

    let eatingLen = 0;
    if (startMins <= endMins) {
      eatingLen = endMins - startMins;
    } else {
      eatingLen = (1440 - startMins) + endMins;
    }
    const fastingLen = 1440 - eatingLen;
    return { eatingLen: eatingLen * 60, fastingLen: fastingLen * 60 };
  };

  const { eatingLen, fastingLen } = getWindowLengths();
  const totalWindowSecs = data.isFasting ? fastingLen : eatingLen;
  const elapsedSecs = Math.max(0, totalWindowSecs - data.totalSeconds);
  const progressPercent = Math.min(100, Math.round((elapsedSecs / totalWindowSecs) * 100));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full"
      >
        <NeoCard className={`relative overflow-hidden border-4 border-black shadow-neo transition-colors duration-500 ${data.isFasting ? 'bg-zinc-950 text-white' : 'bg-accent/10 text-black'}`}>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border-2 border-black ${data.isFasting ? 'bg-zinc-800 text-yellow-300' : 'bg-white text-zinc-950'}`}>
                <Clock size={16} className={data.isFasting ? 'animate-pulse' : ''} />
              </div>
              <span className="text-xs font-black uppercase tracking-wider italic">
                {t('fasting_timer_title')}
              </span>
            </div>

            {/* Dynamic Status Tag */}
            <span className={`px-2.5 py-0.5 rounded-xl border-2 border-black text-[10px] font-black uppercase italic tracking-wider flex items-center gap-1 shadow-neo-sm-flat ${data.isFasting ? 'bg-zinc-900 text-yellow-300' : 'bg-black text-accent'}`}>
              {data.isFasting ? '🖤 ' + t('fasting_now') : '💚 ' + t('eating_now')}
            </span>
          </div>

          <div className="flex items-center justify-between mt-4 relative z-10">
            {/* Timer Displays */}
            <div className="space-y-1">
              <div className="text-[9px] font-black uppercase tracking-widest opacity-60">
                {data.isFasting ? t('fasting_remaining') : t('eating_window_remaining')}
              </div>
              <div className="text-3xl sm:text-4xl font-black italic tracking-tighter font-mono flex items-baseline gap-1">
                <span>{pad(data.hours)}</span>
                <span className={`text-xl opacity-50 ${now.getSeconds() % 2 === 0 ? 'opacity-100' : ''}`}>:</span>
                <span>{pad(data.minutes)}</span>
                <span className={`text-xl opacity-50 ${now.getSeconds() % 2 === 0 ? 'opacity-100' : ''}`}>:</span>
                <span className="text-lg opacity-80">{pad(data.seconds)}</span>
              </div>
            </div>

            {/* Decorative mascot emoji */}
            <div className={`text-4xl select-none flex items-center justify-center p-3 rounded-2xl border-4 border-black ${data.isFasting ? 'bg-zinc-900' : 'bg-white'} shadow-neo-sm`}>
              {data.isFasting ? '🐼💤' : '🐼🎋'}
            </div>
          </div>

          {/* Simple Progress Bar */}
          <div className="mt-4 relative z-10">
            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider mb-1 opacity-60">
              <span>{progressPercent}% {data.isFasting ? t('fasting_now') : t('eating_now')}</span>
              <span>{fasting_start} ~ {fasting_end}</span>
            </div>
            <div className="w-full h-4 bg-zinc-200/20 border-2 border-black rounded-full overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: 'spring', damping: 20 }}
                className={`h-full rounded-full ${data.isFasting ? 'bg-yellow-300' : 'bg-black'} border border-black`}
              />
            </div>
          </div>

          {/* Background pattern decor */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-5 pointer-events-none overflow-hidden">
            <Clock size={160} className="absolute -right-8 -bottom-8" />
          </div>
        </NeoCard>
      </motion.div>
    </AnimatePresence>
  );
}
