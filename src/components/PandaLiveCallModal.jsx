import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Send, 
  Radio
} from 'lucide-react';
import { t, getLanguage } from '../lib/translations';
import { completeText } from '../lib/gemini';

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
      pitch: 1.15,
      rate: 1.1
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
      rate: 1.2
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

  const recognitionRef = useRef(null);
  const scrollEndRef = useRef(null);
  const timerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastSpokenRef = useRef({ text: '', time: 0 });

  // 🕒 Call Duration Timer
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

  // 🎙️ Helper: Pause/Resume recognition to prevent coach's own voice from looping back
  const pauseRecognition = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    } catch (e) {}
  };

  const resumeRecognition = () => {
    if (isMuted || isProcessingRef.current) return;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (e) {}
  };

  // 🔊 TTS Speak Function with Voice Matching & Autoplay Safety
  const speakText = (text) => {
    if (!isSpeakerOn || typeof window === 'undefined' || !window.speechSynthesis) {
      setCoachStatus('listening');
      isProcessingRef.current = false;
      resumeRecognition();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      // Remove emojis & markdown symbols for cleaner speech
      const cleanSpeech = text
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[*#_~`]/g, '')
        .trim();

      if (!cleanSpeech) {
        setCoachStatus('listening');
        isProcessingRef.current = false;
        resumeRecognition();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      utterance.lang = isEn ? 'en-US' : 'zh-TW';
      utterance.pitch = personaConfig.pitch;
      utterance.rate = personaConfig.rate;

      // Select natural voice
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const targetPrefix = isEn ? 'en' : 'zh';
        const bestVoice = voices.find(v => 
          v.lang.toLowerCase().startsWith(targetPrefix) || 
          v.lang.includes('TW') || 
          v.lang.includes('cmn') || 
          v.lang.includes('HK')
        );
        if (bestVoice) utterance.voice = bestVoice;
      }

      let isFinished = false;
      const onSpeechDone = () => {
        if (isFinished) return;
        isFinished = true;
        setCoachStatus('listening');
        isProcessingRef.current = false;
        resumeRecognition();
      };

      utterance.onend = onSpeechDone;
      utterance.onerror = (err) => {
        console.warn("TTS playback error:", err);
        onSpeechDone();
      };

      // Fallback timeout in case browser hangs on onend
      setTimeout(() => {
        if (!isFinished) onSpeechDone();
      }, Math.max(3000, cleanSpeech.length * 400));

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
      setCoachStatus('listening');
      isProcessingRef.current = false;
      resumeRecognition();
    }
  };

  // 🤖 Process User Query and Get Coach Answer (Strict Deduplication & Loop Defense)
  const handleUserSpoke = async (spokenText) => {
    if (!spokenText || !spokenText.trim()) return;
    const cleanText = spokenText.trim();

    // 🛡️ 1. Double-Send Protection
    if (isProcessingRef.current) return;
    const now = Date.now();
    if (lastSpokenRef.current.text === cleanText && (now - lastSpokenRef.current.time) < 3000) {
      return;
    }
    lastSpokenRef.current = { text: cleanText, time: now };
    isProcessingRef.current = true;

    // Clear any pending silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Immediately pause recognition so coach's own reply won't be captured!
    pauseRecognition();

    // Add user message to history
    setTranscriptHistory(prev => [
      ...prev, 
      { sender: 'user', text: cleanText, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setInterimUserText('');
    setCoachStatus('thinking');

    try {
      const cals = todaySummary?.calories || 0;
      const calGoal = goals?.calories || 2000;
      const prot = todaySummary?.protein || 0;
      const protGoal = goals?.protein || 100;

      const prompt = `You are Daily Diet Panda Coach.
Persona: ${activePersona} (${personaConfig.badge}).
Today's progress: Calories ${cals}/${calGoal} kcal, Protein ${prot}/${protGoal}g.
User is speaking to you directly in a live phone call: "${cleanText}".
Reply in ${isEn ? 'English' : 'Traditional Chinese'}.
CRITICAL REQUIREMENTS:
1. Speak naturally as if answering a direct phone call.
2. Keep it under 45 words, punchy and direct.
3. If user mentioned eating something, evaluate briefly in your persona tone.
4. NO markdown symbols, NO emojis, NO quotes, so TTS voice can read aloud cleanly.`;

      let reply = await completeText(prompt);
      
      if (!reply || reply.includes('保持健康飲控節奏')) {
        reply = activePersona === 'tsundere'
          ? (isEn ? "Hmph, noted! But don't you dare sneak snacks tonight, keep an eye on your calories!" : "哼，本教練聽到了！等一下最好給我乖乖吃蔬菜，不准偷吃甜點！")
          : activePersona === 'gentle'
          ? (isEn ? "Got it! You are doing wonderful today, remember to drink enough water and rest well! 💖" : "收到囉～今天有認真注意飲食很棒！記得多補充水分喔，加油！💖")
          : (isEn ? "UNDERSTOOD! Finish your water and push your workouts today, let's go!" : "收到！把剩下的水給我灌完，今晚深蹲做滿！動起來！🔥");
      }

      setTranscriptHistory(prev => [
        ...prev, 
        { sender: 'coach', text: reply, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }
      ]);
      setCoachStatus('speaking');
      speakText(reply);
    } catch (err) {
      console.error("Coach answer error:", err);
      const fallback = isEn 
        ? "Line has some static! But stick strictly to your calorie goals today!" 
        : "電話訊號有點雜音！總之今天的熱量目標給我盯緊了！";
      setTranscriptHistory(prev => [
        ...prev, 
        { sender: 'coach', text: fallback, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }
      ]);
      setCoachStatus('speaking');
      speakText(fallback);
    }
  };

  // 🎙️ Initialize Speech Recognition
  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = isEn ? 'en-US' : 'zh-TW';

      recognition.onresult = (event) => {
        if (isProcessingRef.current) return;

        let currentInterim = '';
        let finalPhrase = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item && item[0]) {
            if (item.isFinal) {
              finalPhrase += item[0].transcript;
            } else {
              currentInterim += item[0].transcript;
            }
          }
        }

        // Clear existing debounce timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // 1. If final phrase received, immediately send!
        if (finalPhrase && finalPhrase.trim()) {
          setInterimUserText('');
          handleUserSpoke(finalPhrase.trim());
          return;
        }

        // 2. If interim speaking, display subtitle and set silence debounce timer
        if (currentInterim && currentInterim.trim()) {
          setInterimUserText(currentInterim);
          silenceTimerRef.current = setTimeout(() => {
            if (currentInterim.trim().length > 1 && !isProcessingRef.current) {
              handleUserSpoke(currentInterim.trim());
            }
          }, 1600);
        }
      };

      recognition.onerror = (e) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn("Speech recognition error:", e.error);
        }
      };

      recognition.onend = () => {
        // Auto-restart only when call is active, not muted, and not currently processing/speaking
        if (callStatus === 'connected' && !isMuted && !isProcessingRef.current) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
    }
  };

  // 🚀 Start Call Flow on Mount
  useEffect(() => {
    // 1. Simulate fast dialing ring
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
      isProcessingRef.current = true;
      // Greet user
      setTranscriptHistory([
        { sender: 'coach', text: personaConfig.intro, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }
      ]);
      speakText(personaConfig.intro);
      // Init speech recognition instance
      startRecognition();
    }, 1000);

    return () => {
      clearTimeout(connectTimer);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
    };
  }, []);

  // 🔇 Toggle Mute
  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      resumeRecognition();
    } else {
      setIsMuted(true);
      pauseRecognition();
    }
  };

  // 🔊 Toggle Speaker
  const handleToggleSpeaker = () => {
    if (isSpeakerOn) {
      setIsSpeakerOn(false);
      window.speechSynthesis?.cancel();
    } else {
      setIsSpeakerOn(true);
    }
  };

  // 🛑 End Call
  const handleEndCall = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
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
        {/* Top Floating Glow */}
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
            className="p-2.5 rounded-2xl bg-zinc-900 text-zinc-400 hover:text-white border-2 border-zinc-700 hover:border-black transition-all cursor-pointer"
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
                  duration: 0.5 + (i * 0.1),
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
            disabled={coachStatus === 'thinking' || coachStatus.startsWith('speaking')}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && textInput.trim()) {
                const val = textInput.trim();
                setTextInput('');
                handleUserSpoke(val);
              }
            }}
            placeholder={t('live_call_text_fallback_placeholder')}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-400 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => {
              if (textInput.trim()) {
                const val = textInput.trim();
                setTextInput('');
                handleUserSpoke(val);
              }
            }}
            disabled={coachStatus === 'thinking' || coachStatus.startsWith('speaking')}
            className="bg-emerald-400 text-black p-2 rounded-xl border border-black hover:bg-emerald-300 active:scale-95 transition-all cursor-pointer font-black disabled:opacity-50"
          >
            <Send size={15} />
          </button>
        </div>

        {/* Bottom Call Controls (Dial Pad Buttons) */}
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

          {/* End Call Button */}
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
