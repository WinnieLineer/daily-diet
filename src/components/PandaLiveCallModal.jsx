import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Send, 
  Radio,
  Sliders,
  Check,
  Play,
  X,
  Sparkles
} from 'lucide-react';
import { t, getLanguage } from '../lib/translations';
import { completeText } from '../lib/gemini';
import { 
  playRinging, 
  playConnected, 
  playHangup, 
  playAcknowledge, 
  playThinkingPulse 
} from '../lib/phoneAudio';
import { 
  getBestVoice, 
  getSortedVoices, 
  getStoredVoiceName, 
  setStoredVoiceName, 
  formatSpeechText 
} from '../lib/phoneVoice';

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
      thinkingHint: t('live_call_coach_thinking_tsundere'),
      pitch: 1.05,
      rate: 1.05
    },
    gentle: {
      avatar: '🐼',
      mood: '🥰',
      badge: isEn ? 'Gentle Healing Coach' : '溫柔療癒小幫手',
      badgeColor: 'bg-pink-100 text-pink-900 border-pink-400',
      intro: isEn 
        ? "Hello there! I'm so happy you called. How are you feeling today? Tell me everything you ate!" 
        : "哈囉～好開心接到你的電話！今天過得好嗎？不管吃了什麼都可以慢慢跟我說喔 ✨",
      thinkingHint: t('live_call_coach_thinking_gentle'),
      pitch: 1.0,
      rate: 0.98
    },
    hardcore: {
      avatar: '🐼',
      mood: '🔥',
      badge: isEn ? 'Hardcore Drill Trainer' : '鐵血魔鬼教練',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-400',
      intro: isEn 
        ? "WHAT'S UP! Are you resting or working out?! Report your calories right now! GO GO GO!" 
        : "喂！動起來沒有！現在打來最好是有認真吃蛋白質！今天吃了多少卡路里，立刻報上來！",
      thinkingHint: t('live_call_coach_thinking_hardcore'),
      pitch: 0.95,
      rate: 1.12
    }
  }[activePersona] || {
    avatar: '🐼',
    mood: '😏',
    badge: '教練',
    badgeColor: 'bg-zinc-100 text-black border-black',
    intro: '喂？說吧！',
    thinkingHint: '教練正在整理回覆中...',
    pitch: 1.0,
    rate: 1.0
  };

  // 📞 Call Status States: 'calling' | 'connected' | 'ended'
  const [callStatus, setCallStatus] = useState('calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // 💬 Conversation Stream
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [interimUserText, setInterimUserText] = useState('');
  const [coachStatus, setCoachStatus] = useState('speaking_intro'); // 'listening' | 'thinking' | 'speaking' | 'speaking_intro'
  const [textInput, setTextInput] = useState('');

  // 🎙️ Voice Settings & Natural Human Voice
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [currentVoice, setCurrentVoice] = useState(null);
  const [previewingVoiceName, setPreviewingVoiceName] = useState(null);

  const recognitionRef = useRef(null);
  const scrollEndRef = useRef(null);
  const timerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastSpokenRef = useRef({ text: '', time: 0 });
  const ringingRef = useRef(null);
  const thinkingPulseIntervalRef = useRef(null);

  // 🔊 Initialize Voices on Mount & Voice Changed
  useEffect(() => {
    const updateVoiceList = () => {
      const sorted = getSortedVoices(isEn, activePersona);
      setAvailableVoices(sorted);
      const best = getBestVoice(isEn, activePersona);
      setCurrentVoice(best);
    };

    updateVoiceList();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoiceList;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isEn, activePersona]);

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

  // 🔊 Natural TTS Speak Function
  const speakText = (text) => {
    if (!isSpeakerOn || typeof window === 'undefined' || !window.speechSynthesis) {
      setCoachStatus('listening');
      isProcessingRef.current = false;
      resumeRecognition();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const cleanSpeech = formatSpeechText(text);

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

      // Use active natural voice
      const activeVoice = currentVoice || getBestVoice(isEn, activePersona);
      if (activeVoice) {
        utterance.voice = activeVoice;
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

  // 🤖 Process User Query and Get Coach Answer
  const handleUserSpoke = async (spokenText) => {
    if (!spokenText || !spokenText.trim()) return;
    const cleanText = spokenText.trim();

    // 🛡️ Double-Send & Duplicate Lock Protection
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

    // Immediately pause speech recognition
    pauseRecognition();

    // 📻 Play telecom acknowledgment chirp (Roger beep!)
    playAcknowledge();

    // Add user message to history
    setTranscriptHistory(prev => [
      ...prev, 
      { sender: 'user', text: cleanText, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setInterimUserText('');
    setCoachStatus('thinking');

    // Start subtle thinking sound pulse
    playThinkingPulse();
    if (thinkingPulseIntervalRef.current) clearInterval(thinkingPulseIntervalRef.current);
    thinkingPulseIntervalRef.current = setInterval(() => {
      playThinkingPulse();
    }, 2200);

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
2. Keep it under 40 words, punchy and conversational.
3. If user mentioned eating something, evaluate briefly in your persona tone.
4. NO markdown symbols, NO emojis, NO quotes, so natural voice reads smoothly.`;

      let reply = await completeText(prompt);
      
      if (!reply || reply.includes('保持健康飲控節奏')) {
        reply = activePersona === 'tsundere'
          ? (isEn ? "Hmph, noted! But don't you dare sneak snacks tonight, watch your calories!" : "哼，本教練聽到了！等一下最好給我乖乖吃蔬菜，不准偷吃甜點！")
          : activePersona === 'gentle'
          ? (isEn ? "Got it! You are doing wonderful today, remember to drink enough water! 💖" : "收到囉～今天有認真注意飲食很棒！記得多補充水分喔，加油！")
          : (isEn ? "UNDERSTOOD! Finish your water and push your workouts today, let's go!" : "收到！把剩下的水給我灌完，今晚深蹲做滿！動起來！");
      }

      // Stop thinking sound
      if (thinkingPulseIntervalRef.current) {
        clearInterval(thinkingPulseIntervalRef.current);
        thinkingPulseIntervalRef.current = null;
      }

      setTranscriptHistory(prev => [
        ...prev, 
        { sender: 'coach', text: reply, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }
      ]);
      setCoachStatus('speaking');
      speakText(reply);
    } catch (err) {
      console.error("Coach answer error:", err);
      if (thinkingPulseIntervalRef.current) {
        clearInterval(thinkingPulseIntervalRef.current);
        thinkingPulseIntervalRef.current = null;
      }
      const fallback = isEn 
        ? "Line has some static! Stick strictly to your calorie goals today!" 
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

  // 🚀 Start Phone Call Sequence on Mount (Authentic Ringing -> Pickup)
  useEffect(() => {
    // 1. Start telephone ringback tone ("嘟... 嘟...")
    ringingRef.current = playRinging();

    // 2. Simulate telephone connection pickup after ~1.6 seconds
    const connectTimer = setTimeout(() => {
      if (ringingRef.current) {
        ringingRef.current.stop();
        ringingRef.current = null;
      }

      // 📲 Play Call Connected Pickup Chime!
      playConnected();

      setCallStatus('connected');
      isProcessingRef.current = true;

      // Coach speaks intro
      setTranscriptHistory([
        { sender: 'coach', text: personaConfig.intro, time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }
      ]);
      speakText(personaConfig.intro);

      // Start recognition
      startRecognition();
    }, 1600);

    return () => {
      clearTimeout(connectTimer);
      if (ringingRef.current) {
        ringingRef.current.stop();
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (thinkingPulseIntervalRef.current) clearInterval(thinkingPulseIntervalRef.current);
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

  // 🛑 End Call Sequence (Authentic Hangup tone & busy signal)
  const handleEndCall = () => {
    setCallStatus('ended');

    // 1. Stop any ringing or thinking pulse
    if (ringingRef.current) {
      ringingRef.current.stop();
      ringingRef.current = null;
    }
    if (thinkingPulseIntervalRef.current) {
      clearInterval(thinkingPulseIntervalRef.current);
      thinkingPulseIntervalRef.current = null;
    }

    // 2. Cancel active speech & recognition
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    // 3. Play realistic busy/hangup tone (嘟、嘟、嘟 + receiver click)
    playHangup();

    // 4. Close modal after 400ms so user hears the hangup audio
    setTimeout(() => {
      onClose();
    }, 450);
  };

  // 🧪 Preview Voice
  const handlePreviewVoice = (voice) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setPreviewingVoiceName(voice.name);

    const testText = isEn 
      ? `Hello! This is Coach Panda, let's achieve your fitness goals!` 
      : `哈囉！我是胖達教練，今天有好好控制熱量嗎？`;

    const utterance = new SpeechSynthesisUtterance(testText);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = personaConfig.rate;
    utterance.pitch = personaConfig.pitch;

    utterance.onend = () => setPreviewingVoiceName(null);
    utterance.onerror = () => setPreviewingVoiceName(null);

    window.speechSynthesis.speak(utterance);
  };

  // 🎯 Select Voice
  const handleSelectVoice = (voice) => {
    setCurrentVoice(voice);
    setStoredVoiceName(voice.name);
  };

  // ⏱️ Format MM:SS
  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 30 }}
        className="bg-zinc-950 border-4 border-black rounded-[2.5rem] w-full max-w-md h-[92vh] max-h-[760px] shadow-neo-lg flex flex-col overflow-hidden text-white relative"
      >
        {/* Top Ambient Glow */}
        <div className={`absolute top-0 left-0 right-0 h-44 bg-gradient-to-b ${
          callStatus === 'ended' 
            ? 'from-rose-500/20' 
            : coachStatus === 'thinking' 
            ? 'from-amber-500/25' 
            : 'from-emerald-500/20'
        } via-transparent to-transparent pointer-events-none transition-colors duration-500`} />

        {/* 1. Header: Caller ID & Telecom Status */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b-2 border-zinc-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-3xl sm:text-4xl p-2 bg-zinc-900 border-2 border-zinc-700 rounded-2xl block shadow-inner">
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
                {callStatus === 'calling' ? (
                  <span className="text-amber-400 animate-pulse flex items-center gap-1.5 font-sans">
                    <Radio size={13} className="animate-spin" />
                    <span>{t('live_call_calling')} (嘟...)</span>
                  </span>
                ) : callStatus === 'ended' ? (
                  <span className="text-rose-400 font-sans flex items-center gap-1">
                    <span>📵</span> {t('live_call_call_ended')}
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>{t('live_call_connected')}</span>
                    <span className="text-zinc-500">·</span>
                    <span>{formatTime(duration)}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded border border-zinc-700 font-sans">
                      📶 HD Voice
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Actions: Voice Switcher & Hangup */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowVoiceSheet(true)}
              className="p-2 rounded-2xl bg-zinc-900 text-zinc-300 hover:text-white border-2 border-zinc-700 hover:border-accent transition-all cursor-pointer flex items-center gap-1 text-[11px] font-black"
              title={t('live_call_voice_settings')}
            >
              <Sliders size={15} className="text-accent" />
              <span className="hidden sm:inline">聲音</span>
            </button>
            <button
              onClick={handleEndCall}
              className="p-2.5 rounded-2xl bg-zinc-900 text-zinc-400 hover:text-rose-400 border-2 border-zinc-700 hover:border-rose-500 transition-all cursor-pointer"
              title={t('live_call_end_call')}
            >
              <PhoneOff size={18} />
            </button>
          </div>
        </div>

        {/* 2. Prominent Dynamic State Banner & Audio Waveform */}
        <div className={`px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 border-b-2 transition-colors duration-300 ${
          coachStatus === 'thinking'
            ? 'bg-amber-950/60 border-amber-600/50 text-amber-300'
            : coachStatus === 'speaking' || coachStatus === 'speaking_intro'
            ? 'bg-emerald-950/50 border-emerald-600/50 text-emerald-300'
            : 'bg-zinc-900/60 border-zinc-800/80 text-cyan-300'
        }`}>
          <div className="flex items-center gap-2">
            {coachStatus === 'speaking' || coachStatus === 'speaking_intro' ? (
              <span className="text-xs font-black flex items-center gap-1.5 animate-pulse text-emerald-300">
                <span className="text-sm">🔊</span>
                <span>{t('live_call_coach_speaking')}</span>
              </span>
            ) : coachStatus === 'thinking' ? (
              <span className="text-xs font-black flex items-center gap-1.5 animate-pulse text-amber-300">
                <span className="text-sm animate-spin">⏳</span>
                <span>{t('live_call_replying')}</span>
              </span>
            ) : isMuted ? (
              <span className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                <span>🔇</span> 已靜音
              </span>
            ) : (
              <span className="text-xs font-black flex items-center gap-1.5 text-cyan-300">
                <Radio size={13} className="animate-pulse" />
                <span>{t('live_call_listening')}</span>
              </span>
            )}
          </div>

          {/* Dynamic Audio Waveform Animation */}
          <div className="flex items-center gap-1 h-5">
            {[40, 80, 100, 60, 95, 50, 85].map((h, i) => (
              <motion.span
                key={i}
                animate={{
                  height: (coachStatus.startsWith('speaking') || (!isMuted && interimUserText))
                    ? [`${h * 0.2}%`, `${h}%`, `${h * 0.4}%`]
                    : coachStatus === 'thinking'
                    ? [`${h * 0.3}%`, `${h * 0.6}%`, `${h * 0.2}%`]
                    : '15%'
                }}
                transition={{
                  repeat: Infinity,
                  duration: coachStatus === 'thinking' ? 0.8 : (0.45 + i * 0.08),
                  ease: "easeInOut"
                }}
                className={`w-1 rounded-full ${
                  coachStatus === 'thinking'
                    ? 'bg-amber-400'
                    : coachStatus.startsWith('speaking')
                    ? 'bg-emerald-400'
                    : 'bg-cyan-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 3. Live Conversation Transcript Stream */}
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

          {/* 🌟 Prominent Indicator: 對方正在回覆提示卡片 */}
          {coachStatus === 'thinking' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-start"
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10px] font-black uppercase text-amber-400 animate-pulse flex items-center gap-1">
                  <span>🐼</span> {personaConfig.badge}
                </span>
                <span className="text-[9px] font-mono text-zinc-500">正在輸入...</span>
              </div>
              <div className="max-w-[85%] p-3 rounded-2xl border-2 border-amber-400 bg-amber-950/50 text-amber-200 rounded-tl-none flex items-center gap-2.5 shadow-neo-xs">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-bold italic text-amber-100">
                  {personaConfig.thinkingHint}
                </span>
              </div>
            </motion.div>
          )}

          {/* Interim Realtime Speech Subtitles */}
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

        {/* 4. Quick Tips */}
        <div className="px-4 py-1.5 bg-zinc-900/40 text-[11px] font-bold text-zinc-400 border-t border-zinc-800 text-center">
          {t('live_call_tip')}
        </div>

        {/* 5. Text Fallback Input Bar */}
        <div className="px-3 py-2 bg-zinc-950 border-t-2 border-zinc-800 flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            disabled={coachStatus === 'thinking' || coachStatus.startsWith('speaking') || callStatus !== 'connected'}
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
            disabled={coachStatus === 'thinking' || coachStatus.startsWith('speaking') || callStatus !== 'connected'}
            className="bg-emerald-400 text-black p-2 rounded-xl border border-black hover:bg-emerald-300 active:scale-95 transition-all cursor-pointer font-black disabled:opacity-50"
          >
            <Send size={15} />
          </button>
        </div>

        {/* 6. Bottom Telecom Controls (Mute, Red Hangup, Speakerphone) */}
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

          {/* Big Red Hangup Button */}
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

        {/* 7. Voice Settings Slide-Over Drawer */}
        <AnimatePresence>
          {showVoiceSheet && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 flex flex-col p-5 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-accent text-black font-black">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white">選擇教練聲音 (自然人聲)</h4>
                    <p className="text-[10px] text-zinc-400 font-bold">已自動過濾機械音，優先選擇自然高音質人聲</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVoiceSheet(false)}
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-2 custom-scrollbar">
                {availableVoices.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-400 font-bold">
                    系統尚未載入語音，請稍後重試...
                  </div>
                ) : (
                  availableVoices.map((item, idx) => {
                    const v = item.voice;
                    const isSelected = currentVoice?.name === v.name;
                    const isPreviewing = previewingVoiceName === v.name;

                    return (
                      <div
                        key={v.name + idx}
                        onClick={() => handleSelectVoice(v)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-accent/15 border-accent text-white shadow-neo-xs'
                            : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs truncate">
                              {v.name.replace(/Microsoft|Online|\(Natural\)|\(Enhanced\)/gi, '').trim()}
                            </span>
                            {item.isNatural && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-400 text-black">
                                自然人聲 ✨
                              </span>
                            )}
                            {idx === 0 && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-black">
                                最佳推薦 🏆
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                            {v.lang} · {v.name}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewVoice(v);
                            }}
                            className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                              isPreviewing
                                ? 'bg-emerald-400 text-black border-black animate-pulse'
                                : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                            }`}
                          >
                            <Play size={11} />
                            <span>{isPreviewing ? '播放中' : '試聽'}</span>
                          </button>

                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-accent text-black flex items-center justify-center font-black">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800 text-center">
                <button
                  onClick={() => setShowVoiceSheet(false)}
                  className="w-full py-2.5 bg-accent text-black font-black text-xs rounded-xl border-2 border-black shadow-neo-xs hover:bg-yellow-300 active:scale-95 transition-all cursor-pointer"
                >
                  確認完成
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
