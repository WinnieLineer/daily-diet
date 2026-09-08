import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Send, 
  Clock, 
  Flame, 
  HeartHandshake, 
  ShieldAlert,
  Radio
} from 'lucide-react';
import { t, getLanguage } from '../lib/translations';
import { getPandaAdvice } from '../lib/groq';

export default function PandaLiveCallModal({ isOpen, onClose, todaySummary, goals }) {
  if (!isOpen) return null;

  const currentLang = getLanguage();
  const isEn = currentLang === 'en';

  // 🎭 Active Persona
  const activePersona = typeof localStorage !== 'undefined' 
    ? localStorage.getItem('panda_active_persona') || 'tsundere' 
    : 'tsundere';

  const personaConfig = {
    tsundere: {
      avatar: '🐼',
      mood: '😏',
      badge: isEn ? 'Tsundere Dietitian' : '傲嬌精英營養師',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-400',
      intro: isEn 
        ? "Hello? Why are you calling me during gym hours? Speak up, what did you eat today?" 
        : "喂？飲控時間突然打電話來幹嘛？哼，說吧，今天又偷吃了什麼？",
      pitch: 1.2,
      rate: 1.15
    },
    gentle: {
      avatar: '🐼',
      mood: '🥰',
      badge: isEn ? 'Gentle Healing Coach' : '溫柔療癒小幫手',
      badgeColor: 'bg-pink-100 text-pink-900 border-pink-400',
      intro: isEn 
        ? "Hello there! I'm so happy you called. How are you feeling today? Tell me everything you ate!" 
        : "哈囉～好開心接到你的電話！今天過得好嗎？不管吃了什麼都可以慢慢跟我說喔 ✨",
      pitch: 1.0,
      rate: 0.95
    },
    hardcore: {
      avatar: '🐼',
      mood: '🔥',
      badge: isEn ? 'Hardcore Drill Trainer' : '鐵血魔鬼教練',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-400',
      intro: isEn 
        ? "WHAT'S UP! Are you resting or working out?! Report your calories right now! GO GO GO!" 
        : "喂！動起來沒有！現在打來最好是有認真吃蛋白質！今天吃了多少卡路里，立刻報上來！",
      pitch: 0.85,
      rate: 1.25
    }
  }[activePersona] || {
    avatar: '🐼',
    mood: '😏',
    badge: '教練',
    badgeColor: 'bg-zinc-100 text-black border-black',
    intro: '喂？說吧！',
    pitch: 1.0,
    rate: 1.0
  };

  // 📞 Call Status States: 'connecting' | 'connected'
  const [callStatus, setCallStatus] = useState('connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // 💬 Conversation Stream
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [interimUserText, setInterimUserText] = useState('');
  const [coachStatus, setCoachStatus] = useState('speaking_intro'); // 'listening' | 'thinking' | 'speaking' | 'speaking_intro'
  const [textInput, setTextInput] = useState('');
  const [hasSpeechRecognitionSupport, setHasSpeechRecognitionSupport] = useState(true);

  const recognitionRef = useRef(null);
  const scrollEndRef = useRef(null);
  const timerRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const silenceTimerRef = useRef(null);

  // 🕒 Call Timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // 📜 Auto Scroll transcript
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptHistory, interimUserText, coachStatus]);

  // 🔊 TTS Speak Function
  const speakText = (text) => {
    if (!isSpeakerOn || !synthRef.current) return;
    try {
      synthRef.current.cancel(); // Stop ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isEn ? 'en-US' : 'zh-TW';
      utterance.pitch = personaConfig.pitch;
      utterance.rate = personaConfig.rate;
      utterance.onend = () => {
        setCoachStatus('listening');
      };
      utterance.onerror = () => {
        setCoachStatus('listening');
      };
      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn("TTS Error:", e);
      setCoachStatus('listening');
    }
  };

  // 🤖 Process User Query and Get Coach Answer
  const handleUserSpoke = async (spokenText) => {
    if (!spokenText || !spokenText.trim()) return;
    const cleanText = spokenText.trim();

    // Add user message to history
    setTranscriptHistory(prev => [...prev, { sender: 'user', text: cleanText, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }]);
    setInterimUserText('');
    setCoachStatus('thinking');

    try {
      // Build context
      const cals = todaySummary?.calories || 0;
      const calGoal = goals?.calories || 2000;
      const prot = todaySummary?.protein || 0;
      const protGoal = goals?.protein || 100;
      const context = isEn
        ? `[Live Phone Call Context] Today user ate ${cals}/${calGoal} kcal, ${prot}/${protGoal}g protein. User said on the phone: "${cleanText}". Give a snappy, spoken conversational response under 45 words in your persona style.`
        : `【即時電話語音熱線】今日使用者已攝取 ${cals}/${calGoal} 大卡，蛋白質 ${prot}/${protGoal} 克。使用者在電話中對你說：「${cleanText}」。請以你的人設風格，口語化給予 60 字以內直接、犀利或親切的即時通話語音回覆。若使用者有提到吃什麼，順便點評。`;

      let reply = await getPandaAdvice(cals, calGoal, prot, protGoal, cleanText, isEn ? 'en' : 'zh');
      if (!reply || reply.includes('保持健康')) {
        // Fallback natural replies if needed
        reply = activePersona === 'tsundere'
          ? (isEn ? "Hmph, noted! But don't you dare sneak snacks tonight!" : "哼，本教練聽到了！等一下晚餐最好給我乖乖吃蔬菜，不准偷吃甜點！")
          : activePersona === 'gentle'
          ? (isEn ? "Got it! You're doing wonderful today, keep drinking water and rest well! 💖" : "收到囉～今天有認真注意飲食很棒！記得多喝點水喔，加油！💖")
          : (isEn ? "UNDERSTOOD! Finish your water and hit the gym tonight!" : "收到！把剩下的水給我灌完，今晚深蹲做滿！動起來！🔥");
      }

      setTranscriptHistory(prev => [...prev, { sender: 'coach', text: reply, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }]);
      setCoachStatus('speaking');
      speakText(reply);
    } catch (err) {
      console.error("Coach answer error:", err);
      const fallback = isEn ? "Connection glitch! But keep up your diet discipline!" : "電話訊號有點雜音！總之今天飲控給我盯緊了！🐼";
      setTranscriptHistory(prev => [...prev, { sender: 'coach', text: fallback, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }]);
      setCoachStatus('speaking');
      speakText(fallback);
    }
  };

  // 🎙️ Initialize Speech Recognition
  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasSpeechRecognitionSupport(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = isEn ? 'en-US' : 'zh-TW';

      recognition.onresult = (event) => {
        let currentInterim = '';
        let finalPhrase = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalPhrase += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentInterim) {
          setInterimUserText(currentInterim);
        }

        if (finalPhrase) {
          handleUserSpoke(finalPhrase);
        } else if (currentInterim) {
          // Debounced auto-submit after user pauses for 1.8s
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (currentInterim.trim().length > 1) {
              handleUserSpoke(currentInterim);
            }
          }, 1800);
        }
      };

      recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e.error);
      };

      recognition.onend = () => {
        // Auto-restart if not muted and still connected
        if (callStatus === 'connected' && !isMuted) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
      setHasSpeechRecognitionSupport(false);
    }
  };

  // 🚀 Start Call Flow
  useEffect(() => {
    // 1. Simulate fast dialing ring
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
      // Speak intro greeting
      setTranscriptHistory([
        { sender: 'coach', text: personaConfig.intro, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }
      ]);
      speakText(personaConfig.intro);
      // Start microphone listening
      startRecognition();
    }, 1200);

    return () => {
      clearTimeout(connectTimer);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (synthRef.current) {
        try { synthRef.current.cancel(); } catch (e) {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // 🔇 Toggle Mute
  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      try { recognitionRef.current?.start(); } catch (e) {}
    } else {
      setIsMuted(true);
      try { recognitionRef.current?.stop(); } catch (e) {}
    }
  };

  // 🔊 Toggle Speaker
  const handleToggleSpeaker = () => {
    if (isSpeakerOn) {
      setIsSpeakerOn(false);
      synthRef.current?.cancel();
    } else {
      setIsSpeakerOn(true);
    }
  };

  // 🛑 End Call
  const handleEndCall = () => {
    if (synthRef.current) synthRef.current.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    onClose();
  };

  // ⏱️ Format MM:SS
  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        className="bg-zinc-950 border-4 border-black rounded-[2.5rem] w-full max-w-md h-[90vh] max-h-[750px] shadow-neo-lg flex flex-col overflow-hidden text-white relative"
      >
        {/* Top Floating Glow & Waves */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent pointer-events-none" />

        {/* Header: Call Info & Status */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b-2 border-zinc-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-3xl sm:text-4xl p-2 bg-zinc-900 border-2 border-zinc-700 rounded-2xl block">
                {personaConfig.avatar}
              </span>
              <span className="absolute -bottom-1 -right-1 text-sm bg-black border border-zinc-700 rounded-full p-0.5">
                {personaConfig.mood}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black italic text-base sm:text-lg">
                  {t('live_call_modal_title')}
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${personaConfig.badgeColor}`}>
                  {personaConfig.badge}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 mt-0.5">
                {callStatus === 'connecting' ? (
                  <span className="text-amber-400 animate-pulse flex items-center gap-1">
                    <Radio size={12} className="animate-spin" />
                    {t('live_call_calling')}
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    {t('live_call_connected')} · {formatTime(duration)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleEndCall}
            className="p-2.5 rounded-2xl bg-zinc-900 text-zinc-400 hover:text-white border-2 border-zinc-700 hover:border-black transition-all"
            title={t('live_call_end_call')}
          >
            <PhoneOff size={18} />
          </button>
        </div>

        {/* Dynamic Waveform & Voice State */}
        <div className="bg-zinc-900/60 border-b-2 border-zinc-800/80 px-4 py-3 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {coachStatus === 'speaking' || coachStatus === 'speaking_intro' ? (
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5 animate-pulse">
                <span>🔊</span> {t('live_call_coach_speaking')}
              </span>
            ) : coachStatus === 'thinking' ? (
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5 animate-bounce">
                <span>🤔</span> {t('live_call_coach_thinking')}
              </span>
            ) : isMuted ? (
              <span className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                <span>🔇</span> 已靜音
              </span>
            ) : (
              <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                <Radio size={13} className="animate-pulse" />
                {t('live_call_listening')}
              </span>
            )}
          </div>

          {/* Audio Waveform Animation Bars */}
          <div className="flex items-center gap-1 h-5">
            {[40, 75, 100, 60, 90, 45, 80].map((h, i) => (
              <motion.span
                key={i}
                animate={{
                  height: (coachStatus.startsWith('speaking') || (!isMuted && interimUserText))
                    ? [`${h * 0.2}%`, `${h}%`, `${h * 0.4}%`]
                    : '15%'
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.6 + (i * 0.1),
                  ease: "easeInOut"
                }}
                className={`w-1 rounded-full ${
                  coachStatus.startsWith('speaking') ? 'bg-emerald-400' : 'bg-cyan-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Live Conversation Transcript Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
          {transcriptHistory.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10px] font-black uppercase text-zinc-400">
                  {item.sender === 'user' ? (isEn ? 'You 👤' : '你 👤') : `${personaConfig.badge} 🐼`}
                </span>
                <span className="text-[9px] font-mono text-zinc-500">{item.time}</span>
              </div>
              <div
                className={`max-w-[85%] p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm font-bold border-2 leading-relaxed shadow-neo-xs ${
                  item.sender === 'user'
                    ? 'bg-accent text-black border-black rounded-tr-none'
                    : 'bg-zinc-900 text-zinc-100 border-zinc-700 rounded-tl-none'
                }`}
              >
                {item.text}
              </div>
            </motion.div>
          ))}

          {/* Interim Realtime Transcript */}
          {interimUserText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-end"
            >
              <div className="text-[10px] font-black text-cyan-400 px-1 mb-1 animate-pulse">
                🎙️ {isEn ? 'Speaking...' : '正在說話...'}
              </div>
              <div className="max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm font-bold border-2 border-cyan-400 bg-cyan-950/60 text-cyan-200 rounded-tr-none italic">
                {interimUserText} ...
              </div>
            </motion.div>
          )}

          <div ref={scrollEndRef} />
        </div>

        {/* Quick Voice Prompt Tips */}
        <div className="px-4 py-2 bg-zinc-900/40 text-[11px] font-bold text-zinc-400 border-t border-zinc-800 text-center">
          {t('live_call_tip')}
        </div>

        {/* Text Fallback Input Bar */}
        <div className="px-3 py-2 bg-zinc-950 border-t-2 border-zinc-800 flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && textInput.trim()) {
                handleUserSpoke(textInput);
                setTextInput('');
              }
            }}
            placeholder={t('live_call_text_fallback_placeholder')}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-400 transition-colors"
          />
          <button
            onClick={() => {
              if (textInput.trim()) {
                handleUserSpoke(textInput);
                setTextInput('');
              }
            }}
            className="bg-emerald-400 text-black p-2 rounded-xl border border-black hover:bg-emerald-300 active:scale-95 transition-all cursor-pointer font-black"
          >
            <Send size={15} />
          </button>
        </div>

        {/* Bottom Call Controls (Neo-Brutalist Dial Pad Buttons) */}
        <div className="p-4 sm:p-5 bg-zinc-900 border-t-2 border-zinc-800 flex items-center justify-around gap-4 shrink-0">
          {/* Mute Button */}
          <button
            onClick={handleToggleMute}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer ${
              isMuted 
                ? 'bg-rose-500 text-white border-black shadow-neo-xs' 
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
            }`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            <span className="text-[10px] font-black">{isMuted ? t('live_call_unmute') : t('live_call_mute')}</span>
          </button>

          {/* End Call Button (Big Red Button) */}
          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center border-4 border-black shadow-neo-sm active:scale-90 transition-transform cursor-pointer"
            title={t('live_call_end_call')}
          >
            <PhoneOff size={26} />
          </button>

          {/* Speaker Button */}
          <button
            onClick={handleToggleSpeaker}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer ${
              isSpeakerOn 
                ? 'bg-emerald-400 text-black border-black shadow-neo-xs font-black' 
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            <span className="text-[10px] font-black">{isSpeakerOn ? t('live_call_speaker_on') : t('live_call_speaker_off')}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
