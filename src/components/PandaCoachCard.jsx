import React, { useState, useRef, useCallback, useEffect } from 'react';
import NeoCard from './NeoCard';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import { t, getLanguage } from '../lib/translations';

// ──────────────────────────────────────────────
// Dialogue banks per interaction type
// ──────────────────────────────────────────────
const DIALOGUES = {
  zh: {
    idle: [
      '💡 蛋白質每克4大卡，脂肪每克9大卡，你猜哪個更撐？',
      '💡 吃飯慢一點，大腦收到飽足感要20分鐘！',
      '💡 水喝夠，代謝才快！今天喝了幾杯？ 💧',
      '💡 肌肉量越高，躺著燃燒的熱量越多喔！',
      '💡 深色蔬菜含鐵豐富，菠菜不只大力水手吃的！',
      '💡 早餐吃蛋白質，可以減少整天的食慾！',
      '💡 膳食纖維幫助腸胃蠕動，益生菌的最愛食物！',
      '💡 運動後30分鐘補充蛋白質，肌肉合成最有效率！',
      '我在看你喔，別想偷吃宵夜 👀',
      '少吃點炸物行不行，我都替你難過了 😤',
      '你上次喝水是幾年前的事？ 💧',
      '吃那麼少記錄什麼？還是吃那麼多不敢記錄？ 😏',
      '你的熱量目標在哭泣中 🥲',
      '辛苦了，吃這麼「養生」……欸等等，那是炸雞嗎？ 🍗',
      '記錄飲食的第一步是：承認你剛才吃了那個 🙄',
      '你以為不記錄熱量就不存在？ 哈，天真！',
      '你今天是不是還沒喝水？快去！ 🚰',
    ],
    click: [
      '你按我幹嘛啦！ 😤',
      '有事說事，不要亂點！',
      '痛啦！！你是故意的嗎？',
      '我是熊貓，不是按鈕！',
      '……再按一次試試看 😒',
      '你現在應該去記錄飲食，不是按我！',
    ],
    tickle: [
      '哈哈哈哈哈停！！ 😂',
      '癢癢癢癢不行了哈哈！',
      '嗚嗚嗚你最壞了啦 🤣',
      '哈——停——哈——停——！',
      '再搔我就咬你手指！ 😆',
      '笑死我了啦！！快去記錄飲食！ 🤣',
    ],
    poke: [
      '戳什麼戳！沒禮貌！ 😠',
      '你再戳一下試試看！！',
      '這不是在玩耍的時間！',
      '欸！！幹嘛啦！！ 😡',
      '繼續戳，我不客氣了！',
    ],
    spamPoke: [
      '好了好了受夠了！！ 🤬',
      '警告！再戳告你家長！',
      '你有毛病吧真的！！！',
      'STOP STOP STOP 停！！！',
      '…你是不是第一次養熊貓 💀',
      '我要罷工了！！！ 😤',
      '老娘要去告你！！！ 🐼💢',
    ],
    drag: [
      '請……請放開我 😱',
      '你在做什麼？！我暈了！',
      '哎呀，這是在做什麼？ 🥀',
      '再拖下去我要出螢幕了！',
      '救命啊，有人在開玩笑嗎？ 😭',
      '放我回去！！我要回家！',
    ],
    release: [
      '終於放開了……可惡 😤',
      '下次不給你拖了！哼！',
      '頭好暈……哎呀 😵',
      '謝謝你「關愛」我……才怪',
      '再來一次我就咬人了！',
    ],
  },
  en: {
    idle: [
      '💡 1g protein is 4kcal, 1g fat is 9kcal. Guess which is more filling?',
      '💡 Eat slower! It takes 20 mins for your brain to feel full.',
      '💡 Drink enough water to boost metabolism! How many glasses today? 💧',
      '💡 Higher muscle mass means more calories burned while resting!',
      '💡 Dark greens are rich in iron. Spinach isn\'t just for Popeye!',
      '💡 Eating protein for breakfast can reduce appetite all day!',
      '💡 Fiber helps digestion—it\'s the favorite food for probiotics!',
      '💡 Protein 30 mins after a workout is best for muscle synthesis!',
      'I\'m watching you... don\'t even think about that midnight snack 👀',
      'Could you eat fewer fried foods? I\'m feeling sad for you 😤',
      'When was the last time you drank water? Years ago? 💧',
      'Recording so little? Or are you just afraid to record everything? 😏',
      'Your calorie goal is crying 🥲',
      'Hard work! Eating so "healthy"... wait, is that fried chicken? 🍗',
      'Step one of tracking: admit you just ate that 🙄',
      'You think calories don\'t exist if you don\'t track them? Ha, naive!',
    ],
    click: [
      'Why are you clicking me? 😤',
      'Talk to me, don\'t just tap!',
      'Ouch! Was that on purpose?',
      'I\'m a panda, not a button!',
      '...try that one more time 😒',
      'You should be logging food, not clicking me!',
    ],
    tickle: [
      'Hahahaha stop!! 😂',
      'It tickles! Hahaha!',
      'You\'re the worst! 🤣',
      'Ha—stop—ha—stop—!',
      'I\'ll bite your finger if you keep tickling! 😆',
      'This is too much!! Go log your food! 🤣',
    ],
    poke: [
      'Stop poking! So rude! 😠',
      'Try poking me one more time!!',
      'This isn\'t playtime!',
      'Hey!! What gives?! 😡',
      'Keep poking and I won\'t be nice!',
    ],
    spamPoke: [
      'OK OK enough!! 🤬',
      'Warning! I\'m telling your parents!',
      'Is something wrong with you? Seriously!!!',
      'STOP STOP STOP!!!',
      '...is this your first time raising a panda? 💀',
      'I\'m going on strike!!! 😤',
      'I\'m gonna sue you!!! 🐼💢',
    ],
    drag: [
      'Please... let me go 😱',
      'What are you doing?! I\'m dizzy!',
      'Oh my, what is this? 🥀',
      'Any further and I\'ll be off the screen!',
      'Help, is someone joking? 😭',
      'Put me back!! I want to go home!',
    ],
    release: [
      'Finally let go... hmph 😤',
      'Not letting you drag me next time! 🐼',
      'So dizzy... oh boy 😵',
      'Thanks for "caring" about me... not!',
      'I\'ll bite next time!',
    ],
  }
};

function getRandom(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

// High-quality Panda mascot designed with dynamic SVG to match the favicon's style without the background and with full expressiveness
const PandaFace = ({ expression = 'normal', isSquished = false }) => {
  const scaleY = isSquished ? 0.92 : 1;
  const isHappy = expression === 'happy';
  const isSad = expression === 'sad';
  const isScared = expression === 'scared';
  const isDizzy = expression === 'dizzy';
  const isNormal = expression === 'normal';

  return (
    <div
      className="w-full h-full drop-shadow-md pb-1"
      style={{ 
        transform: `scaleY(${scaleY})`, 
        transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <defs>
          {/* Gradients for premium texture */}
          <radialGradient id="patchGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3f3f46" />
            <stop offset="100%" stopColor="#09090b" />
          </radialGradient>
          <radialGradient id="faceGrad" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f4f4f5" />
          </radialGradient>
          <linearGradient id="leafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>
          <filter id="blush">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Ears */}
        <circle cx="20" cy="28" r="14" fill="url(#patchGrad)" />
        <circle cx="80" cy="28" r="14" fill="url(#patchGrad)" />

        {/* Leaf on head */}
        <g transform="translate(48, 17)">
          {/* Stem */}
          <path d="M 0 0 L -1 3" stroke="#166534" strokeWidth="1.5" strokeLinecap="round" />
          {/* Leaf Body */}
          <path 
            d="M 0 0 Q -8 -10, 8 -16 Q 14 -4, 0 0 Z" 
            fill="url(#leafGrad)" 
            stroke="#166534" 
            strokeWidth="1.2" 
            strokeLinejoin="round" 
          />
          {/* Leaf Vein */}
          <path d="M 0 0 Q 2 -8, 6 -13" stroke="#166534" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        </g>

        {/* Face */}
        <ellipse cx="50" cy="56" rx="44" ry="40" fill="url(#faceGrad)" stroke="#e4e4e7" strokeWidth="1" />
        
        {/* Blush - only when happy or normal */}
        {(isHappy || isNormal) && (
          <g filter="url(#blush)" opacity="0.6">
            <ellipse cx="25" cy="62" rx="7" ry="3.5" fill="#fca5a5" />
            <ellipse cx="75" cy="62" rx="7" ry="3.5" fill="#fca5a5" />
          </g>
        )}

        {/* Eye Patches - angled outwards ( / \ ) for a cute, innocent panda look */}
        <g fill="url(#patchGrad)">
          {isSad ? (
            <>
              <ellipse cx="32" cy="46" rx="14" ry="16" transform="rotate(25 32 46)" />
              <ellipse cx="68" cy="46" rx="14" ry="16" transform="rotate(-25 68 46)" />
            </>
          ) : (
            <>
              <ellipse cx="32" cy="46" rx="14" ry="18" transform="rotate(15 32 46)" />
              <ellipse cx="68" cy="46" rx="14" ry="18" transform="rotate(-15 68 46)" />
            </>
          )}
        </g>

        {/* Eyes / Pupils */}
        {isHappy && (
          <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <path d="M 26 46 Q 32 40 38 46" />
            <path d="M 62 46 Q 68 40 74 46" />
          </g>
        )}
        {isNormal && (
          <g>
            <circle cx="34" cy="45" r="5" fill="#fff" />
            <circle cx="36" cy="43" r="1.5" fill="#fff" />
            <circle cx="66" cy="45" r="5" fill="#fff" />
            <circle cx="64" cy="43" r="1.5" fill="#fff" />
          </g>
        )}
        {isScared && (
          <g>
            <circle cx="32" cy="46" r="2.5" fill="#fff" />
            <circle cx="68" cy="46" r="2.5" fill="#fff" />
          </g>
        )}
        {isDizzy && (
          <g fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M 28 42 L 36 50 M 36 42 L 28 50" />
            <path d="M 64 42 L 72 50 M 72 42 L 64 50" />
          </g>
        )}
        {isSad && (
          <g fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M 28 48 Q 32 42 36 48" />
            <path d="M 64 48 Q 68 42 72 48" />
          </g>
        )}

        {/* Nose */}
        <ellipse cx="50" cy="62" rx="4" ry="3" fill="#18181b" />
        <circle cx="51" cy="61" r="1" fill="#fff" opacity="0.6" />

        {/* Mouth */}
        {isHappy && (
          <path d="M 42 68 Q 50 78 58 68" fill="none" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
        )}
        {isNormal && (
          <path d="M 44 68 Q 47 71 50 68 Q 53 71 56 68" fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
        )}
        {isSad && (
          <path d="M 46 72 Q 50 68 54 72" fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
        )}
        {isScared && (
          <ellipse cx="50" cy="72" rx="4" ry="5" fill="#18181b" />
        )}
        {isDizzy && (
          <path d="M 44 68 Q 47 64 50 68 T 56 68" fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
};

// Floating speech bubble
const SpeechBubble = ({ text, visible }) => (
  <AnimatePresence>
    {visible && text && (
      <motion.div
        key={text}
        initial={{ opacity: 0, scale: 0.85, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85 }}
        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-[150] flex flex-col items-center pointer-events-auto w-[240px] sm:w-[320px]"
      >
        <div className="bg-black text-white border-4 border-black rounded-2xl px-5 py-3 text-sm font-black shadow-neo-sm text-center leading-relaxed tracking-tight italic">
          {text}
        </div>
        <div 
          className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-black"
        />
      </motion.div>
    )}
  </AnimatePresence>
);

// Floating effect particle
const FloatingEmoji = ({ emoji, id, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      key={id}
      initial={{ opacity: 1, y: 0, scale: 0.8 }}
      animate={{ opacity: 0, y: -40, scale: 1.4 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="absolute text-lg pointer-events-none z-30"
      style={{ left: `${30 + Math.random() * 40}%`, top: '-10px' }}
    >
      {emoji}
    </motion.div>
  );
};

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
const PandaCoachCard = ({ advice, streak = 0, onRetryAdvice }) => {
  const [expression, setExpression]     = useState('normal');
  const [bubble, setBubble]             = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [isSquished, setIsSquished]     = useState(false);
  const [particles, setParticles]       = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [initialPos, setInitialPos] = useState(() => {
    const saved = localStorage.getItem('panda_position');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });

  const controls   = useAnimation();
  const pokeCount  = useRef(0);
  const pokeTimer  = useRef(null);
  const bubbleTimer = useRef(null);
  const particleId = useRef(0);

  // ── helpers ──────────────────────────────────
  const showBubble = useCallback((text, duration = 2500) => {
    clearTimeout(bubbleTimer.current);
    setBubble(text);
    setBubbleVisible(true);
    bubbleTimer.current = setTimeout(() => setBubbleVisible(false), duration);
  }, []);

  const addParticle = useCallback((emoji) => {
    const id = particleId.current++;
    setParticles(p => [...p, { id, emoji }]);
  }, []);

  const removeParticle = useCallback((id) => {
    setParticles(p => p.filter(pp => pp.id !== id));
  }, []);

  const resetExpression = useCallback((delay = 1500) => {
    setTimeout(() => {
      setExpression('normal');
      setIsSquished(false);
    }, delay);
  }, []);

  // ── CLICK ────────────────────────────────────
  const handleClick = useCallback(async (e) => {
    e.stopPropagation();
    if (isDragging) return;
    setExpression('scared');
    setIsSquished(true);
    showBubble(getRandom(DIALOGUES[getLanguage()].click));
    addParticle('💥');
    await controls.start({
      scale: [1, 1.15, 0.9, 1.05, 1],
      rotate: [0, -8, 8, -4, 0],
      transition: { duration: 0.4, ease: 'easeOut' },
    });
    resetExpression(1200);
  }, [isDragging, controls, showBubble, addParticle, resetExpression]);

  // ── TICKLE (hover) ───────────────────────────
  const handleTickleStart = useCallback(() => {
    if (isDragging) return;
    setExpression('happy');
    showBubble(getRandom(DIALOGUES[getLanguage()].tickle), 3500);
    addParticle('✨'); 
    controls.start({
      rotate: [-5, 5, -5, 5, 0],
      transition: { duration: 0.5, repeat: Infinity, repeatType: 'mirror' },
    });
  }, [isDragging, controls, showBubble, addParticle]);

  const handleTickleEnd = useCallback(() => {
    if (isDragging) return;
    controls.stop();
    controls.start({ rotate: 0, transition: { duration: 0.2 } });
    setBubbleVisible(false);
    resetExpression(300);
  }, [isDragging, controls, resetExpression]);

  // ── POKE (right-click) ───────────────────────
  const handlePoke = useCallback(async (e) => {
    e.preventDefault();
    if (isDragging) return;

    pokeCount.current += 1;
    clearTimeout(pokeTimer.current);

    const count = pokeCount.current;

    if (count >= 5) {
      setExpression('scared');
      showBubble(getRandom(DIALOGUES[getLanguage()].spamPoke), 2500);
      addParticle('⚡');
      await controls.start({
        x: [-8, 8, -8, 8, -4, 4, 0],
        y: [-4, 4, -4, 4, -2, 2, 0],
        transition: { duration: 0.5 },
      });
      pokeCount.current = 0;
    } else {
      setExpression('scared');
      showBubble(getRandom(DIALOGUES[getLanguage()].poke));
      addParticle('👆');
      await controls.start({
        x: [0, -6, 6, -3, 0],
        transition: { duration: 0.25 },
      });
    }

    pokeTimer.current = setTimeout(() => { pokeCount.current = 0; }, 1500);
    resetExpression(1000);
  }, [isDragging, controls, showBubble, addParticle, resetExpression]);

  // ── DRAG ─────────────────────────────────────
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setExpression('dizzy');
    showBubble(getRandom(DIALOGUES[getLanguage()].drag), 99999);
    addParticle('💫');
  }, [showBubble, addParticle]);

  const handleDragEnd = useCallback((e, info) => {
    const finalX = info.offset.x + initialPos.x;
    const finalY = info.offset.y + initialPos.y;
    
    setInitialPos({ x: finalX, y: finalY });
    localStorage.setItem('panda_position', JSON.stringify({ x: finalX, y: finalY }));

    setExpression('sad');
    showBubble(getRandom(DIALOGUES[getLanguage()].release), 2500);
    addParticle('🌀');
    setIsDragging(false);
    resetExpression(2000);
  }, [initialPos, showBubble, addParticle, resetExpression]);

  // ── IDLE chatter & Click-away ──────────────────
  useEffect(() => {
    const handleGlobalClick = () => {
      if (bubbleVisible) setBubbleVisible(false);
    };
    document.addEventListener('click', handleGlobalClick);

    const interval = setInterval(() => {
      if (!bubbleVisible && !isDragging) {
        if (Math.random() < 0.4) {
          showBubble(advice || getRandom(DIALOGUES[getLanguage()].idle), 3500);
        }
      }
    }, 8000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [bubbleVisible, isDragging, advice, showBubble]);

  const currentAdviceText = advice === 'ERROR_RETRY' ? (
    <div className="flex flex-col items-center gap-1">
      <span>{t('ai_error') || "連線中斷了..."}</span>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          if (onRetryAdvice) onRetryAdvice();
        }}
        className="text-accent underline font-black flex items-center gap-1 hover:text-white transition-colors"
      >
        <Flame size={12} fill="currentColor" /> {t('retry_button') || "點我重試"}
      </button>
    </div>
  ) : advice;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 overflow-visible"
    >
      <NeoCard className="bg-white p-4 sm:p-5 overflow-visible">
        <div className="flex items-center gap-4 sm:gap-6 relative z-10 selection:bg-transparent rounded-[2rem] overflow-visible" style={{ WebkitTapHighlightColor: 'transparent' }}>
          {/* Interactive Panda */}
          <div className="relative flex-shrink-0 z-50 group/panda w-16 h-16 sm:w-20 sm:h-20">
            <SpeechBubble text={bubble || currentAdviceText} visible={bubbleVisible || advice === 'ERROR_RETRY'} />

            {/* Particles */}
            {particles.map(({ id, emoji }) => (
              <FloatingEmoji
                key={id}
                id={id}
                emoji={emoji}
                onDone={() => removeParticle(id)}
              />
            ))}

            <motion.div
              drag
              dragMomentum={false}
              dragElastic={0.3}
              initial={initialPos}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              animate={controls}
              onClick={handleClick}
              onHoverStart={handleTickleStart}
              onHoverEnd={handleTickleEnd}
              onContextMenu={handlePoke}
              whileTap={{ scale: 0.92 }}
              className="w-full h-full outline-none"
              style={{ 
                cursor: isDragging ? 'grabbing' : 'grab', 
                touchAction: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <PandaFace expression={expression} isSquished={isSquished} />
            </motion.div>
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0 space-y-1 relative z-10">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                {t('panda_coach_name')}
              </span>
              {streak > 0 && (
                <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-200 shadow-sm">
                  <Flame size={10} className="fill-orange-500" />
                  <span className="text-[10px] font-black italic">{streak} {t('streak_text')}</span>
                </div>
              )}
            </div>
            <p className="text-base sm:text-lg font-bold text-black leading-snug italic">
              {advice === 'ERROR_RETRY' ? (t('ai_error') || '連線出錯了') : (advice || t('default_panda_advice'))}
            </p>
          </div>
        </div>
      </NeoCard>
    </motion.div>
  );
};

export default PandaCoachCard;
