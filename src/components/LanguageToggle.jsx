import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

/**
 * Neo-Brutalist Single Language Switcher Button
 * Always displays the OTHER language that user can switch to:
 * - When in Chinese ('zh') -> Displays "EN" (Click to switch to English)
 * - When in English ('en') -> Displays "中文" (Click to switch to Traditional Chinese)
 */
export default function LanguageToggle({ currentLang, onToggle, className }) {
  const isEn = currentLang === 'en';
  const targetLabel = isEn ? '中文' : 'EN';
  const tooltip = isEn ? '切換至繁體中文 (Switch to Chinese)' : 'Switch to English (切換至英文)';

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.92 }}
      title={tooltip}
      aria-label={tooltip}
      className={twMerge(
        "h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg sm:rounded-xl border-2 border-black/80 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1 font-black cursor-pointer select-none shrink-0 transition-colors",
        "bg-white hover:bg-accent text-black active:translate-y-0.5",
        className
      )}
    >
      <span className="text-[10px] select-none leading-none">
        🌐
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={targetLabel}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="text-[11px] sm:text-xs font-black tracking-tight leading-none"
        >
          {targetLabel}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
