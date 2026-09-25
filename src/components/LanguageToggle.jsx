import React from 'react';
import { twMerge } from 'tailwind-merge';
import { t } from '../lib/translations';

/**
 * Neo-Brutalist Segmented Language Switcher
 * Clean tactile dual-segment switcher (中 / EN) matching the app's yellow/black neo-brutalist theme.
 * Completely eliminates any blue globe icon.
 */
export default function LanguageToggle({ currentLang, onToggle, className }) {
  const isEn = currentLang === 'en';

  const handleClickOption = (targetLang, e) => {
    e.stopPropagation();
    if (currentLang !== targetLang) {
      onToggle();
    }
  };

  const handleKeyDown = (targetLang, e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (currentLang !== targetLang) {
        onToggle();
      }
    }
  };

  return (
    <div
      role="group"
      aria-label="Language selector"
      className={twMerge(
        "h-7 sm:h-8 bg-zinc-100 border-2 border-black/80 rounded-lg sm:rounded-xl p-0.5 flex items-center gap-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] select-none shrink-0",
        className
      )}
    >
      {/* 繁體中文選項 */}
      <button
        type="button"
        onClick={(e) => handleClickOption('zh', e)}
        onKeyDown={(e) => handleKeyDown('zh', e)}
        title="切換至繁體中文"
        aria-pressed={!isEn}
        className={twMerge(
          "h-full px-1.5 sm:px-2 rounded-md flex items-center justify-center text-[10px] sm:text-[11px] font-black transition-all cursor-pointer leading-none",
          !isEn
            ? "bg-accent text-black border border-black shadow-[0.5px_0.5px_0px_0px_rgba(0,0,0,1)] active:scale-95"
            : "text-zinc-400 hover:text-black hover:bg-zinc-200/50"
        )}
      >
        中
      </button>

      {/* English Option */}
      <button
        type="button"
        onClick={(e) => handleClickOption('en', e)}
        onKeyDown={(e) => handleKeyDown('en', e)}
        title="Switch to English"
        aria-pressed={isEn}
        className={twMerge(
          "h-full px-1.5 sm:px-2 rounded-md flex items-center justify-center text-[9px] sm:text-[10px] font-black tracking-tight transition-all cursor-pointer leading-none",
          isEn
            ? "bg-accent text-black border border-black shadow-[0.5px_0.5px_0px_0px_rgba(0,0,0,1)] active:scale-95"
            : "text-zinc-400 hover:text-black hover:bg-zinc-200/50"
        )}
      >
        EN
      </button>
    </div>
  );
}
