import React from 'react';

/**
 * Exquisite Panda Stickers
 * Renders 5 custom beautiful sticker designs with a thick white die-cut border,
 * deep black outlines, rich color gradients, custom illustrations, and glossy finishes.
 */
export const PandaSticker = ({ id, className = '', style = {} }) => {
  // Common drop shadow filter & linear gradients for the stickers
  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full select-none overflow-visible ${className}`}
      style={{ filter: 'drop-shadow(2px 3px 0px rgba(0,0,0,0.15))', ...style }}
    >
      <defs>
        {/* Filters for subtle soft shadow internally if needed */}
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.2" />
        </filter>

        {/* Glossy radial gradient */}
        <radialGradient id="glossGrad" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* 1. Crown Master Gradients */}
        <radialGradient id="crownBgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="30%" stopColor="#fef08a" /> {/* yellow-200 */}
          <stop offset="100%" stopColor="#f59e0b" /> {/* amber-500 */}
        </radialGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* 2. Happy Eating Gradients */}
        <radialGradient id="bambooBgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="40%" stopColor="#ecfdf5" /> {/* emerald-50 */}
          <stop offset="100%" stopColor="#10b981" /> {/* emerald-500 */}
        </radialGradient>
        <linearGradient id="bambooGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="60%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>

        {/* 3. Elegant Sir Gradients */}
        <radialGradient id="coffeeBgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="30%" stopColor="#fafaf9" /> {/* stone-50 */}
          <stop offset="100%" stopColor="#a8a29e" /> {/* stone-400 */}
        </radialGradient>
        <linearGradient id="cupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e7e5e4" />
          <stop offset="100%" stopColor="#78716c" />
        </linearGradient>

        {/* 4. Get Buffed Gradients */}
        <radialGradient id="musclesBgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="30%" stopColor="#ffedd5" /> {/* orange-100 */}
          <stop offset="100%" stopColor="#ea580c" /> {/* orange-600 */}
        </radialGradient>
        <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fed7aa" /> {/* orange-200 */}
          <stop offset="100%" stopColor="#c2410c" /> {/* orange-700 */}
        </linearGradient>

        {/* 5. Cheat Meal Gradients */}
        <radialGradient id="pizzaBgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="30%" stopColor="#fffbeb" /> {/* amber-50 */}
          <stop offset="100%" stopColor="#f59e0b" /> {/* amber-500 */}
        </radialGradient>
        <linearGradient id="cheeseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="60%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. STICKER BASE: Die-Cut White Border & Neobrutalist Line */}
      {/* ──────────────────────────────────────────────────────── */}
      <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#000000" strokeWidth="3" />

      {/* ──────────────────────────────────────────────────────── */}
      {/* 2. THEMATIC CONTENT */}
      {/* ──────────────────────────────────────────────────────── */}

      {/* 👑 CROWN MASTER STICKER */}
      {id === 'crown' && (
        <>
          {/* Outer Badge */}
          <circle cx="50" cy="50" r="39" fill="url(#crownBgGrad)" stroke="#000000" strokeWidth="2.5" />

          {/* Sparkles / Stars in Background */}
          <path d="M 24 24 Q 24 28 20 28 Q 24 28 24 32 Q 24 28 28 28 Q 24 28 24 24 Z" fill="#ffffff" />
          <path d="M 76 26 Q 76 29 73 29 Q 76 29 76 32 Q 76 29 79 29 Q 76 29 76 26 Z" fill="#ffffff" />
          <path d="M 32 72 Q 32 74 30 74 Q 32 74 32 76 Q 32 74 34 74 Q 32 74 32 72 Z" fill="#ffffff" />

          {/* Golden Crown */}
          <g filter="url(#softShadow)">
            {/* Crown base */}
            <path
              d="M 24 64 L 28 35 L 39 46 L 50 28 L 61 46 L 72 35 L 76 64 Z"
              fill="url(#goldGrad)"
              stroke="#000000"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Highlights */}
            <path
              d="M 26 61 L 29 39 L 39 49 L 50 33 L 61 49 L 71 39 L 74 61"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.8"
            />
            {/* Crown Bottom Band */}
            <rect x="22" y="62" width="56" height="6" rx="2.5" fill="#d97706" stroke="#000000" strokeWidth="2.5" />
            
            {/* Crown Jewels */}
            <circle cx="28" cy="35" r="3.5" fill="#ef4444" stroke="#000000" strokeWidth="1.2" />
            <circle cx="50" cy="28" r="4.5" fill="#3b82f6" stroke="#000000" strokeWidth="1.5" />
            <circle cx="72" cy="35" r="3.5" fill="#ef4444" stroke="#000000" strokeWidth="1.2" />
            
            <circle cx="34" cy="65" r="1.5" fill="#3b82f6" />
            <circle cx="50" cy="65" r="1.8" fill="#10b981" />
            <circle cx="66" cy="65" r="1.5" fill="#ef4444" />
          </g>
        </>
      )}

      {/* 🎋 HAPPY EATING STICKER */}
      {id === 'bamboo' && (
        <>
          {/* Outer Badge */}
          <circle cx="50" cy="50" r="39" fill="url(#bambooBgGrad)" stroke="#000000" strokeWidth="2.5" />

          {/* Sparkles */}
          <circle cx="24" cy="30" r="1.5" fill="#ffffff" />
          <circle cx="78" cy="68" r="1.5" fill="#ffffff" />

          {/* Cute Bamboo & Leaves */}
          <g filter="url(#softShadow)" transform="translate(0, 4) rotate(-5 50 50)">
            {/* Bamboo Segment 1 */}
            <rect x="44" y="44" width="10" height="24" rx="2" fill="url(#bambooGrad)" stroke="#000000" strokeWidth="2.2" />
            {/* Bamboo Segment 2 */}
            <rect x="45" y="20" width="8" height="22" rx="2" fill="url(#bambooGrad)" stroke="#000000" strokeWidth="2.2" />

            {/* Joints (rings) */}
            <ellipse cx="49" cy="43" rx="6" ry="2.2" fill="#86efac" stroke="#000000" strokeWidth="2" />
            <ellipse cx="49" cy="20" rx="5" ry="2" fill="#86efac" stroke="#000000" strokeWidth="2" />

            {/* Bamboo Leaves */}
            {/* Left Leaf */}
            <path d="M 44 32 C 30 28, 22 36, 18 42 C 28 42, 38 38, 44 32 Z" fill="#15803d" stroke="#000000" strokeWidth="2" strokeLinejoin="round" />
            {/* Right Upper Leaf */}
            <path d="M 52 20 C 66 12, 72 2, 74 -4 C 70 8, 60 14, 52 20 Z" fill="#4ade80" stroke="#000000" strokeWidth="2" strokeLinejoin="round" />
            {/* Right Lower Leaf */}
            <path d="M 52 38 C 66 36, 74 26, 76 20 C 68 28, 58 32, 52 38 Z" fill="#22c55e" stroke="#000000" strokeWidth="2" strokeLinejoin="round" />
          </g>

          {/* Shiny Red Heart */}
          <g filter="url(#softShadow)" transform="translate(62, 45) scale(0.9)">
            <path
              d="M 12 5 C 10 1, 4 2, 4 8 C 4 14, 12 19, 12 21 C 12 19, 20 14, 20 8 C 20 2, 14 1, 12 5 Z"
              fill="url(#heartGrad)"
              stroke="#000000"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Heart Highlight */}
            <path d="M 7 6 C 6 8, 6 10, 7 10" fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
          </g>
        </>
      )}

      {/* ☕ ELEGANT SIR STICKER */}
      {id === 'coffee' && (
        <>
          {/* Outer Badge */}
          <circle cx="50" cy="50" r="39" fill="url(#coffeeBgGrad)" stroke="#000000" strokeWidth="2.5" />

          {/* Aroma Steam */}
          <path d="M 40 22 Q 43 14, 40 8" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <path d="M 48 20 Q 51 10, 48 4" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <path d="M 56 22 Q 59 14, 56 8" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />

          {/* Steaming Coffee Cup */}
          <g filter="url(#softShadow)">
            {/* Cup Handle */}
            <path d="M 66 40 C 76 40, 78 56, 66 56" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 66 42 C 73 42, 75 54, 66 54" fill="none" stroke="#fafaf9" strokeWidth="2.5" strokeLinecap="round" />

            {/* Cup Main Body */}
            <path
              d="M 28 32 L 68 32 L 63 64 C 61 72, 35 72, 33 64 Z"
              fill="url(#cupGrad)"
              stroke="#000000"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Cup Rim Top */}
            <ellipse cx="48" cy="32" rx="20" ry="3.5" fill="#a8a29e" stroke="#000000" strokeWidth="2" />
            {/* Coffee Liquid Surface */}
            <ellipse cx="48" cy="32" rx="18" ry="2.5" fill="#543d2b" />

            {/* Gentleman Mustache Printed on Cup */}
            <g transform="translate(48, 51) scale(0.65)">
              <path d="M -16 0 C -10 -8, -2 -2, 0 4 C 2 -2, 10 -8, 16 0 C 8 2, 4 8, 0 4 C -4 8, -8 2, -16 0 Z" fill="#000000" stroke="#000000" strokeWidth="1" />
            </g>

            {/* Cup Highlight */}
            <path d="M 32 37 L 35 60" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
          </g>
        </>
      )}

      {/* 💪 GET BUFFED STICKER */}
      {id === 'muscles' && (
        <>
          {/* Outer Badge */}
          <circle cx="50" cy="50" r="39" fill="url(#musclesBgGrad)" stroke="#000000" strokeWidth="2.5" />

          {/* Action Sparks / Speed lines */}
          <path d="M 22 24 L 14 18 M 16 34 L 8 36" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 74 18 L 82 10 M 82 24 L 90 28" stroke="#fdba74" strokeWidth="2.5" strokeLinecap="round" />

          {/* Mighty Flexed Arm */}
          <g filter="url(#softShadow)" transform="translate(-2, 6) rotate(-8 50 50)">
            {/* Shoulder and Muscle base */}
            <path
              d="M 20 62 C 18 42, 34 32, 44 38 C 48 26, 66 28, 70 38 C 74 44, 76 56, 68 64 C 58 72, 28 72, 20 62 Z"
              fill="url(#armGrad)"
              stroke="#000000"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Clenched Fist */}
            <circle cx="68" cy="34" r="7.5" fill="url(#armGrad)" stroke="#000000" strokeWidth="2.2" />
            <path d="M 64 31 C 66 33, 68 33, 72 31" fill="none" stroke="#000000" strokeWidth="1.5" />
            <path d="M 64 35 C 66 37, 68 37, 72 35" fill="none" stroke="#000000" strokeWidth="1.5" />

            {/* Muscle highlight curve */}
            <path d="M 38 43 C 44 38, 54 36, 60 41" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
            
            {/* Power lines inside bicep */}
            <path d="M 44 48 Q 50 52, 58 48" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
          </g>
        </>
      )}

      {/* 🍕 CHEAT MEAL STICKER */}
      {id === 'pizza' && (
        <>
          {/* Outer Badge */}
          <circle cx="50" cy="50" r="39" fill="url(#pizzaBgGrad)" stroke="#000000" strokeWidth="2.5" />

          {/* Sparkles */}
          <path d="M 24 70 Q 24 72 22 72 Q 24 72 24 74 Q 24 72 26 72 Q 24 72 24 70 Z" fill="#ffffff" />
          <path d="M 76 68 Q 76 70 74 70 Q 76 70 76 72 Q 76 70 78 70 Q 76 70 76 68 Z" fill="#ffffff" />

          {/* Mouthwatering Pizza Slice */}
          <g filter="url(#softShadow)" transform="translate(0, 0)">
            {/* Pizza Crust */}
            <path
              d="M 26 36 C 30 24, 68 24, 72 36 Z"
              fill="#d97706"
              stroke="#000000"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Cheese Layer */}
            <path
              d="M 28 36 L 49 78 L 70 36 Z"
              fill="url(#cheeseGrad)"
              stroke="#000000"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Pepperonis */}
            <circle cx="42" cy="43" r="5" fill="#dc2626" stroke="#000000" strokeWidth="1.5" />
            <circle cx="42" cy="43" r="2" fill="#ef4444" opacity="0.6" />

            <circle cx="56" cy="47" r="5" fill="#dc2626" stroke="#000000" strokeWidth="1.5" />
            <circle cx="56" cy="47" r="2" fill="#ef4444" opacity="0.6" />

            <circle cx="49" cy="60" r="4.5" fill="#dc2626" stroke="#000000" strokeWidth="1.5" />
            <circle cx="49" cy="60" r="1.8" fill="#ef4444" opacity="0.6" />

            {/* Melting Cheese Strings hanging from bottom tip */}
            <path d="M 48 76 Q 47 82, 45 86 C 45 82, 49 80, 49 76 Z" fill="#facc15" stroke="#000000" strokeWidth="1.2" />
            <path d="M 50 76 Q 52 83, 54 87 C 52 83, 51 81, 50 76 Z" fill="#facc15" stroke="#000000" strokeWidth="1.2" />
          </g>
        </>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 3. GLOSSY OVERLAY: High-grade glossy shine reflection */}
      {/* ──────────────────────────────────────────────────────── */}
      <circle cx="50" cy="50" r="39" fill="url(#glossGrad)" pointerEvents="none" />
      {/* Curved glossy highlight */}
      <path
        d="M 17 38 C 24 22, 54 12, 78 24 C 64 16, 34 18, 20 42 Z"
        fill="#ffffff"
        opacity="0.35"
        pointerEvents="none"
      />
    </svg>
  );
};
