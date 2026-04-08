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
    '放……放开我！！ 😱',
    '你在做什麼？！我暈了！',
    '救命啊有人綁架熊貓！！',
    '再拖下去我要出螢幕了！',
    '嗚嗚嗚好可怕蹂躪我 😭',
    '放我回去！！我要回家！',
  ],
  release: [
    '終於放開了……可惡 😤',
    '下次不給你拖了！哼！',
    '頭好暈……賤人！ 😵',
    '謝謝你「關愛」我……才怪',
    '再來一次我就咬人了！',
  ],
};

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// SVG Panda face – scalable, cute, pure SVG so we can animate it
const PandaFace = ({ expression = 'normal', isSquished = false }) => {
  const eyeVariants = {
    normal: { d: 'M 0 0 a 7 7 0 1 1 14 0 a 7 7 0 1 1 -14 0' },
    happy:  { d: 'M 0 4 Q 7 -4 14 4' },
    dizzy:  { d: 'M 2 2 L 5 -1 M 9 -1 L 12 2' },
    scared: { d: 'M 0 0 a 8 8 0 1 1 16 0 a 8 8 0 1 1 -16 0' },
  };


  const scaleY = isSquished ? 0.85 : 1;

  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      className="drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]"
      style={{ transform: `scaleY(${scaleY})`, transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      <defs>
        <radialGradient id="faceGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8f8f8" />
        </radialGradient>
        <linearGradient id="earGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2c2c2c" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
      </defs>

      {/* Ears */}
      <ellipse cx="18" cy="22" rx="15" ry="15" fill="url(#earGradient)" />
      <ellipse cx="82" cy="22" rx="15" ry="15" fill="url(#earGradient)" />
      <ellipse cx="18" cy="22" rx="7"  ry="7"  fill="#1a1a1a" opacity="0.3" />
      <ellipse cx="82" cy="22" rx="7"  ry="7"  fill="#1a1a1a" opacity="0.3" />

      {/* Face Body */}
      <ellipse cx="50" cy="55" rx="42" ry="40" fill="url(#faceGradient)" stroke="#000" strokeWidth="2.5" />

      {/* Eye patches - more organic shape */}
      <path d="M 22 46 Q 22 35 34 35 Q 46 35 46 46 Q 46 57 34 57 Q 22 57 22 46" fill="#0c0c0c" />
      <path d="M 54 46 Q 54 35 66 35 Q 78 35 78 46 Q 78 57 66 57 Q 54 57 54 46" fill="#0c0c0c" />

      {/* Eyes */}
      {expression === 'happy' ? (
        <>
          <path d="M 27 46 Q 34 38 41 46" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <path d="M 59 46 Q 66 38 73 46" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : expression === 'dizzy' ? (
        <>
          <line x1="29" y1="41" x2="39" y2="51" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="39" y1="41" x2="29" y2="51" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="61" y1="41" x2="71" y2="51" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="71" y1="41" x2="61" y2="51" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : expression === 'scared' ? (
        <>
          <circle cx="34" cy="46" r="7" fill="white" />
          <circle cx="66" cy="46" r="7" fill="white" />
          <circle cx="34" cy="46" r="2.5" fill="#000" />
          <circle cx="66" cy="46" r="2.5" fill="#000" />
        </>
      ) : (
        <>
          <circle cx="34" cy="46" r="5" fill="white" />
          <circle cx="66" cy="46" r="5" fill="white" />
          <circle cx="35" cy="47" r="2.5" fill="#000" />
          <circle cx="67" cy="47" r="2.5" fill="#000" />
          <circle cx="33" cy="44" r="1.2" fill="white" />
          <circle cx="65" cy="44" r="1.2" fill="white" />
        </>
      )}

      {/* Nose */}
      <path d="M 45 61 Q 50 64 55 61 Q 55 58 50 58 Q 45 58 45 61" fill="#000" />

      {/* Mouth */}
      {expression === 'happy' || expression === 'normal' ? (
        <path d={expression === 'happy' ? 'M 38 65 Q 50 75 62 65' : 'M 42 67 Q 50 71 58 67'}
          fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
      ) : expression === 'sad' || expression === 'dizzy' ? (
        <path d="M 40 72 Q 50 64 60 72"
          fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <>
          <path d="M 40 65 Q 50 75 60 65"
            fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="50" cy="69" rx="6" ry="4" fill="#fbbf24" />
        </>
      )}

      {/* Cheeks */}
      {expression === 'happy' && (
        <>
          <circle cx="28" cy="62" r="6" fill="#fbbf24" opacity="0.3" />
          <circle cx="72" cy="62" r="6" fill="#fbbf24" opacity="0.3" />
        </>
      )}
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
        className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap z-20"
        style={{ pointerEvents: 'none' }}
      >
        <div className="bg-white/90 backdrop-blur-xl border-2 border-black/10 rounded-2xl px-4 py-2 text-[11px] font-bold shadow-[0_8px_16px_rgba(0,0,0,0.1)] text-black max-w-[220px] text-center leading-snug">
          {text}
        </div>
        {/* Tail */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
          <div style={{
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '7px solid black',
          }} />
          <div style={{
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '6px solid rgba(255,255,255,0.9)',
            position: 'absolute', top: '0px', left: '-5px',
          }} />
        </div>
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
    <NeoCard className="relative overflow-visible border-none bg-gradient-to-br from-zinc-900 to-black p-6 shadow-2xl overflow-hidden group">
      {/* Premium background texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px]" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-zinc-500/10 rounded-full blur-[80px]" />

      <div className="flex items-center gap-6 relative z-10">

        {/* Interactive Panda */}
        <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
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
            style={{ cursor: isDragging ? 'grabbing' : 'grab', width: 80, height: 80, touchAction: 'none' }}
          >
            <PandaFace expression={expression} isSquished={isSquished} />
          </motion.div>

          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-gray-500 font-black tracking-tighter select-none uppercase">
            Interact with me!
          </div>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black tracking-[0.2em] mb-2 text-amber-400 uppercase italic opacity-80">
            Panda Coach
          </h3>
          <p className="text-lg font-medium text-zinc-100 leading-tight tracking-tight">
            {advice || '今天也要加油喔！趕快記錄一下你的飲食吧！'}
          </p>
        </div>
      </div>

      {/* Decorative ghost panda */}
      <div className="absolute -bottom-4 -right-2 opacity-10 rotate-12 pointer-events-none select-none text-6xl">
        🐼
      </div>
    </NeoCard>
  );
};

export default PandaCoachCard;
