import React, { useState, useRef, useCallback, useEffect } from 'react';
import NeoCard from './NeoCard';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';

// ──────────────────────────────────────────────
// Dialogue banks per interaction type
// ──────────────────────────────────────────────
const DIALOGUES = {
  idle: [
    // 🧠 nutrition knowledge nuggets
    '💡 蛋白質每克4大卡，脂肪每克9大卡，你猜哪個更撐？',
    '💡 吃飯慢一點，大腦收到飽足感要20分鐘！',
    '💡 水喝夠，代謝才快！今天喝了幾杯？ 💧',
    '💡 肌肉量越高，躺著燃燒的熱量越多喔！',
    '💡 深色蔬菜含鐵豐富，菠菜不只大力水手吃的！',
    '💡 早餐吃蛋白質，可以減少整天的食慾！',
    '💡 膳食纖維幫助腸胃蠕動，益生菌的最愛食物！',
    '💡 運動後30分鐘補充蛋白質，肌肉合成最有效率！',
    // 😈 snarky roasts
    '我在看你喔，別想偷吃宵夜 👀',
    '少吃點炸物行不行，我都替你難過了 😤',
    '你上次喝水是幾年前的事？ 💧',
    '吃那麼少記錄什麼？還是吃那麼多不敢記錄？ 😏',
    '你的熱量目標在哭泣中 🥲',
    '辛苦了，吃這麼「養生」……欸等等，那是炸雞嗎？ 🍗',
    '記錄飲食的第一步是：承認你剛才吃了那個 🙄',
    '你以為不記錄熱量就不存在？ 哈，天真！',
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
};

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// SVG Panda face – scalable, cute, pure SVG so we can animate it
const PandaFace = ({ expression = 'normal', isSquished = false }) => {
  const scaleY = isSquished ? 0.92 : 1;

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
      style={{ transform: `scaleY(${scaleY})`, transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)' }}
    >
      <defs>
        <radialGradient id="faceBodyGrad" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f3f4f6" />
          <stop offset="100%" stopColor="#d1d5db" />
        </radialGradient>
        <linearGradient id="earGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#27272a" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <linearGradient id="goldHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c5a059" />
          <stop offset="50%" stopColor="#f3e1b7" />
          <stop offset="100%" stopColor="#c5a059" />
        </linearGradient>
        <filter id="premiumGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.05" />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* Ears */}
      <circle cx="22" cy="25" r="14" fill="url(#earGrad)" />
      <circle cx="78" cy="25" r="14" fill="url(#earGrad)" />
      <circle cx="22" cy="25" r="14" fill="url(#noise)" opacity="0.3" />
      <circle cx="78" cy="25" r="14" fill="url(#noise)" opacity="0.3" />

      {/* Face Body */}
      <ellipse cx="50" cy="55" rx="42" ry="40" fill="url(#faceBodyGrad)" filter="url(#premiumGlow)" />
      <ellipse cx="50" cy="55" rx="42" ry="40" fill="none" stroke="url(#goldHighlight)" strokeWidth="0.5" opacity="0.3" />

      {/* Eyes & Patches */}
      <g opacity="0.95">
        <ellipse cx="65" cy="48" rx="14" ry="12" fill="#09090b" />
        <ellipse cx="35" cy="48" rx="14" ry="12" fill="#09090b" />
        
        <g fill="white" opacity="0.9">
          {expression === 'happy' ? (
            <>
              <path d="M 28 48 Q 35 40 42 48" fill="none" stroke="url(#goldHighlight)" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 58 48 Q 65 40 72 48" fill="none" stroke="url(#goldHighlight)" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : expression === 'dizzy' ? (
            <>
              <path d="M 32 45 L 38 51 M 38 45 L 32 51" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <path d="M 62 45 L 68 51 M 68 45 L 62 51" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="35" cy="48" r="4.5" fill="#18181b" />
              <circle cx="65" cy="48" r="4.5" fill="#18181b" />
              <circle cx="34" cy="47" r="1.5" fill="white" opacity="0.4" />
              <circle cx="64" cy="47" r="1.5" fill="white" opacity="0.4" />
            </>
          )}
        </g>
      </g>

      {/* Nose */}
      <path d="M 47 62 Q 50 65 53 62" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" />

      {/* Mouth */}
      <path d="M 42 70 Q 50 74 58 70" fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round" opacity="0.5" />

      {/* Subliminal artistic marks */}
      <circle cx="50" cy="55" r="41" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.2" />
    </svg>
  );
};

// Floating speech bubble
const SpeechBubble = ({ text, visible }) => (
  <AnimatePresence>
    {visible && text && (
      <motion.div
        key={text}
        initial={{ opacity: 0, y: 8, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center pointer-events-none w-max max-w-[280px]"
      >
        <div className="bg-white/95 backdrop-blur-3xl border border-white/40 rounded-[20px] px-5 py-2.5 text-[13px] font-bold shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] text-zinc-900 text-center leading-relaxed tracking-wider font-sans text-wrap">
          {text}
        </div>
        {/* Tail */}
        <div style={{
          width: 0, height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid rgba(255,255,255,0.95)',
        }} />
      </motion.div>
    )}
  </AnimatePresence>
);

// Floating effect particle
const FloatingEmoji = ({ emoji, id, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
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
const PandaCoachCard = ({ advice }) => {
  const constraintsRef = useRef(null);
  const [expression, setExpression]     = useState('normal');
  const [bubble, setBubble]             = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [isSquished, setIsSquished]     = useState(false);
  const [particles, setParticles]       = useState([]);
  const [isDragging, setIsDragging]     = useState(false);

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
  const handleClick = useCallback(async () => {
    if (isDragging) return;
    setExpression('scared');
    setIsSquished(true);
    showBubble(getRandom(DIALOGUES.click));
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
    showBubble(getRandom(DIALOGUES.tickle), 3500);
    // Use yellow/gold themed particles
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
      showBubble(getRandom(DIALOGUES.spamPoke), 2500);
      addParticle('⚡');
      await controls.start({
        x: [-8, 8, -8, 8, -4, 4, 0],
        y: [-4, 4, -4, 4, -2, 2, 0],
        transition: { duration: 0.5 },
      });
      pokeCount.current = 0;
    } else {
      setExpression('scared');
      showBubble(getRandom(DIALOGUES.poke));
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
    showBubble(getRandom(DIALOGUES.drag), 99999);
    addParticle('💫');
  }, [showBubble, addParticle]);

  const handleDragEnd = useCallback(async () => {
    setExpression('sad');
    showBubble(getRandom(DIALOGUES.release), 2500);
    addParticle('🌀');
    await controls.start({
      x: 0, y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 20 },
    });
    setIsDragging(false);
    resetExpression(2000);
  }, [controls, showBubble, addParticle, resetExpression]);

  // ── IDLE chatter ─────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (!bubbleVisible && !isDragging) {
        if (Math.random() < 0.4) {
          showBubble(advice || getRandom(DIALOGUES.idle), 3500);
        }
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [bubbleVisible, isDragging, advice, showBubble]);

  return (
    <motion.div 
      ref={constraintsRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10"
    >
      {/* Outer Card with visible overflow for bubble */}
      <div className="relative bg-[#09090b] border-[1px] border-white/5 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_15px_35px_-10px_rgba(0,0,0,0.8)]">
        
        {/* Inner texture layer */}
        <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/20 via-transparent to-black" />
        </div>

        <div className="p-4 sm:p-6 relative z-10">

      <div className="flex items-center gap-4 sm:gap-6 relative z-10">

        {/* Interactive Panda */}
        <div className="relative flex-shrink-0 z-50 group/panda w-16 h-16 sm:w-20 sm:h-20">
          <SpeechBubble text={bubble} visible={bubbleVisible} />

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
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            animate={controls}
            onClick={handleClick}
            onHoverStart={handleTickleStart}
            onHoverEnd={handleTickleEnd}
            onContextMenu={handlePoke}
            whileTap={{ scale: 0.92 }}
            className="w-full h-full"
            style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          >
            <PandaFace expression={expression} isSquished={isSquished} />
          </motion.div>

        </div>

        {/* Text content - Luxury Boutique Style */}
        <div className="flex-1 min-w-0 space-y-1 relative z-10">
          <h3 className="text-[8px] sm:text-[9px] font-light tracking-[0.4em] sm:tracking-[0.5em] text-amber-500/60 uppercase">
            Panda Coach
          </h3>
          <p className="text-lg sm:text-xl font-medium text-zinc-100 leading-tight tracking-wide italic">
            {advice || '每一刻的節制，都是對生活的極致追求。'}
          </p>
          <div className="h-[1px] w-10 sm:w-12 bg-gradient-to-r from-amber-500/40 to-transparent mt-2 sm:mt-3" />
        </div>
      </div>

      {/* Decorative ghost panda */}
      <div className="absolute -bottom-4 -right-2 opacity-10 rotate-12 pointer-events-none select-none text-6xl">
        🐼
      </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PandaCoachCard;
