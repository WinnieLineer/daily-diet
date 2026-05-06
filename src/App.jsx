import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PandaCoachCard from './components/PandaCoachCard';
import Dashboard from './components/Dashboard';
import HistoryTrends from './components/HistoryTrends';
import FoodDetective from './components/FoodDetective';
import WeightTracker from './components/WeightTracker';
import GoalSettings from './components/GoalSettings';
import WhatsNew from './components/WhatsNew';
import Onboarding from './components/Onboarding';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import NeoCard from './components/NeoCard';
import NeoButton from './components/NeoButton';
import { db, getDailySummary, calculateStreak } from './db';
import SharingCard from './components/SharingCard';
import { getPandaAdvice } from './lib/gemini';
import { Trash2, History, ChevronDown, ChevronUp, Pencil, Check, X, Clock, MapPin, Share2, Star, LayoutGrid, GripHorizontal, Info, Zap, MessageSquareQuote } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { t, getLanguage } from './lib/translations';
import { APP_VERSION } from './lib/constants';
import versionData from '../public/version.json';
import { initGoogleAuth } from './lib/googleAuth';

const getLocalDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const NamePromptModal = ({ onSave, isUpdate = false }) => {
  const [name, setName] = useState('');
  return createPortal(
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white border-4 border-black w-full max-w-sm rounded-[2.5rem] shadow-neo p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-accent border-4 border-black rounded-3xl mx-auto flex items-center justify-center text-4xl mb-4">🐼</div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-tight">
            {t('name_prompt_title')}
          </h2>
          <p className="text-zinc-500 font-bold leading-relaxed text-sm">
            {isUpdate ? t('name_prompt_update_desc') : t('name_prompt_desc')}
          </p>
        </div>
        
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('name_placeholder')}
          className="w-full border-4 border-black p-4 rounded-2xl font-bold text-center bg-zinc-50 focus:bg-white transition-all outline-none"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name.trim())}
        />

        <NeoButton 
          variant="black" 
          className="w-full h-16 text-lg"
          onClick={() => name.trim() && onSave(name.trim())}
          disabled={!name.trim()}
        >
          {t('name_confirm')}
        </NeoButton>
      </motion.div>
    </div>,
    document.body
  );
};

const LogDetailModal = ({ log, onClose }) => {
  if (!log) return null;
  return createPortal(
    <div className="fixed inset-0 z-[600]">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md" 
        onClick={onClose} 
      />
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white border-4 border-black rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-neo flex flex-col max-h-[90vh] pointer-events-auto"
        >
        {/* Header */}
        <div className="p-4 border-b-4 border-black flex items-center justify-between bg-accent/10">
          <div className="flex items-center gap-3">
            <div className="bg-black text-white p-2 rounded-xl">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-black italic text-lg leading-none">{log.dish_name}</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                {new Date(log.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-6 flex-1 custom-scrollbar">
          {/* Image */}
          {log.image && (
            <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-black shadow-neo-sm">
              <img src={log.image} className="w-full h-full object-cover" alt={log.dish_name} />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50 border-4 border-black p-4 rounded-3xl shadow-neo-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{t('calories')}</div>
              <div className="text-2xl font-black italic">{log.calories} <span className="text-xs">kcal</span></div>
            </div>
            <div className="bg-zinc-50 border-4 border-black p-4 rounded-3xl shadow-neo-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{t('protein')}</div>
              <div className="text-2xl font-black italic">{log.protein} <span className="text-xs">g</span></div>
            </div>
          </div>

          {/* Advice Section */}
          <div className="bg-accent border-4 border-black p-5 rounded-[2.5rem] shadow-neo-sm relative overflow-hidden">
            <div className="relative z-10">
               <div className="flex items-center gap-2 mb-3">
                 <div className="bg-black text-white p-1 rounded-lg">
                   <Zap size={14} />
                 </div>
                 <span className="text-xs font-black uppercase tracking-widest">{t('panda_coach')} {t('advice')}</span>
               </div>
               <p className="font-black italic text-sm leading-relaxed text-black/80">
                 {log.advice || log.description || t('no_advice')}
               </p>
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
              <Zap size={120} className="text-black" />
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t-4 border-black flex gap-3">
          <NeoButton 
            variant="black" 
            className="w-full h-14 text-lg font-black italic"
            onClick={onClose}
          >
            {t('close')}
          </NeoButton>
        </div>
      </motion.div>
    </div>
  </div>,
  document.body
);
};


const LogItem = ({ log, isRecent, editingId, editValues, setEditValues, cancelEditing, saveEdit, startEditing, deleteLog, onAddToFavorite, onShowDetail }) => {
  const isEditing = editingId === log.id;
  const [showActions, setShowActions] = React.useState(false);
  const longPressTimer = React.useRef(null);
  const didLongPress = React.useRef(false);

  if (isEditing) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 border-4 border-black rounded-2xl bg-accent/10 space-y-3"
      >
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">{t('food_name')}</label>
          <input 
            type="text" 
            value={editValues.dish_name}
            onChange={(e) => setEditValues({ ...editValues, dish_name: e.target.value })}
            className="w-full border-4 border-black p-2 rounded-xl font-bold bg-white"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">{t('calories')} (kcal)</label>
          <input 
            type="number" 
            value={editValues.calories}
            onChange={(e) => setEditValues({ ...editValues, calories: e.target.value })}
            className="w-full border-4 border-black p-2 rounded-xl font-mono font-bold bg-white"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">{t('protein')} (g)</label>
          <input 
            type="number" 
            value={editValues.protein}
            onChange={(e) => setEditValues({ ...editValues, protein: e.target.value })}
            className="w-full border-4 border-black p-2 rounded-xl font-mono font-bold bg-white"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">{t('water_unit')} (ml)</label>
          <input 
            type="number" 
            value={editValues.water}
            onChange={(e) => setEditValues({ ...editValues, water: e.target.value })}
            className="w-full border-4 border-black p-2 rounded-xl font-mono font-bold bg-white"
          />
        </div>
      </div>
      
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">{t('category')}</label>
        <div className="flex bg-white border-4 border-black p-1 rounded-xl">
          {['breakfast', 'lunch', 'dinner', 'snack'].map(cat => (
            <button
              key={cat}
              onClick={() => setEditValues({ ...editValues, category: cat })}
              className={`flex-1 py-1 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${
                editValues.category === cat ? "bg-black text-white" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {t(cat)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button 
          onClick={cancelEditing}
          className="flex-1 bg-white border-4 border-black font-black py-2 rounded-xl hover:bg-gray-100 flex items-center justify-center gap-1"
        >
          <X size={16} /> {t('cancel')}
        </button>
        <button 
          onClick={() => saveEdit(log.id)}
          className="flex-1 bg-black text-white border-4 border-black font-black py-2 rounded-xl hover:bg-black/90 flex items-center justify-center gap-1"
        >
          <Check size={16} /> {t('save')}
        </button>
      </div>
    </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => {
        if (didLongPress.current) { didLongPress.current = false; return; }
        setShowActions(!showActions);
      }}
      onTouchStart={() => {
        didLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
          didLongPress.current = true;
          if (onAddToFavorite) onAddToFavorite(log);
        }, 600);
      }}
      onTouchEnd={() => { clearTimeout(longPressTimer.current); }}
      onTouchMove={() => { clearTimeout(longPressTimer.current); }}
      onContextMenu={(e) => { e.preventDefault(); }}
      className={`relative overflow-hidden flex flex-col p-2.5 border-4 border-black rounded-2xl bg-white hover:bg-zinc-50 transition-colors group cursor-pointer ${!isRecent ? 'opacity-80 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' : ''}`}
    >
      <div className={`flex flex-col gap-1.5 w-full transition-all duration-300 ${showActions ? 'pr-[145px] opacity-40 blur-[1px]' : ''}`}>
        {/* Top Row: Time + Dish Name + Calories */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black font-mono text-zinc-400 shrink-0">
              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <div className="font-black text-sm leading-tight truncate">{log.dish_name}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {log.calories > 0 && (
              <span className="text-[10px] font-black bg-accent px-1.5 py-0.5 rounded border border-black/10 shadow-neo-sm whitespace-nowrap">🔥{log.calories}</span>
            )}
            {log.protein > 0 && (
              <span className="text-[10px] font-black text-white bg-black px-1.5 py-0.5 rounded shadow-neo-sm whitespace-nowrap">🍖{log.protein}</span>
            )}
            {log.water > 0 && (
              <span className="text-[10px] font-black text-black border-2 border-black px-1 px-0.5 rounded shadow-neo-sm whitespace-nowrap">🚰{log.water}</span>
            )}
          </div>
        </div>

        {/* Bottom Row: Metadata (Tags + Location) */}
        <div className="flex items-center gap-2 overflow-hidden">
          {log.category && log.dish_name && !log.dish_name.startsWith(t(log.category)) && (
            <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md bg-black text-white italic border border-black shrink-0">
              {t(log.category)}
            </span>
          )}

          {log.location && typeof log.location === 'string' && (
            <span className="text-[9px] font-bold text-zinc-400 flex items-center gap-0.5 truncate bg-zinc-50 px-1.5 py-0.5 rounded-lg border border-black/5">
              <MapPin size={8} />
              {(() => {
                try {
                  const parts = log.location.split(' ');
                  if (!parts || parts.length === 0) return log.location;
                  const citySub = parts[0]; 
                  return citySub && citySub.length > 3 ? citySub.substring(3) : (citySub || '');
                } catch (e) {
                  return '';
                }
              })()}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showActions && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute inset-y-0 right-0 flex items-center gap-1 bg-accent border-l-4 border-black px-2 z-10"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); startEditing(log); }}
              className="p-2 hover:bg-black hover:text-white transition-all rounded-xl border-2 border-transparent"
              title={t('edit')}
            >
              <Pencil size={18} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }}
              className="p-2 hover:bg-black hover:text-white transition-all rounded-xl border-2 border-transparent"
              title={t('delete')}
            >
              <Trash2 size={18} />
            </button>
            {log.image && (
              <button 
                onClick={(e) => { e.stopPropagation(); onShowDetail(log); setShowActions(false); }}
                className="p-2 hover:bg-black hover:text-white transition-all rounded-xl border-2 border-transparent"
                title={t('details')}
              >
                <Info size={18} />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); if (onAddToFavorite) onAddToFavorite(log); setShowActions(false); }}
              className="p-2 hover:bg-black hover:text-white transition-all rounded-xl border-2 border-transparent"
              title={t('added_to_favorites')}
            >
              <Star size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

function App() {
  const [summary, setSummary] = useState({ calories: 0, protein: 0, water: 0 });
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('onboarding_seen'));
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [isBugFixOnly, setIsBugFixOnly] = useState(false);
  const [goals, setGoals] = useState({ calories: 2000, protein: 100, water: 2500, fasting_enabled: false, fasting_start: '20:00', fasting_end: '12:00' });

  const [userName, setUserName] = useState(() => localStorage.getItem('user_name') || '');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [favoriteUpdateTrigger, setFavoriteUpdateTrigger] = useState(0);

  useEffect(() => {
    // If onboarding is seen but no name is set, it's an existing user who needs a name update prompt
    if (localStorage.getItem('onboarding_seen') === 'true' && !userName) {
      setShowNamePrompt(true);
    }
  }, [userName]);

  const handleNameSave = (name) => {
    localStorage.setItem('user_name', name);
    setUserName(name);
    setShowNamePrompt(false);
  };
  
  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding_seen', 'true');
    localStorage.setItem('last_seen_version', APP_VERSION); // 🚀 Mark version as seen to prevent immediate What's New modal
    setUserName(localStorage.getItem('user_name') || '');
    setShowOnboarding(false);
  };
  
  // Force reload on version change to clear cache
  useEffect(() => {
    const checkVersion = async () => {
      // 🚀 CRITICAL: Do not reload if we are in the middle of AI analysis
      const isAnalyzing = document.body.classList.contains('ai-analyzing');
      if (isAnalyzing) {
        console.log("AI Analysis in progress, delaying version check reload.");
        return;
      }

      try {
        // Fetch version.json with a unique timestamp to bypass all caches
        const response = await fetch(`/daily-diet/version.json?t=${Date.now()}`, {
          cache: 'no-store'
        });
        const data = await response.json();
        const remoteVersion = data.version;

        if (remoteVersion && remoteVersion !== APP_VERSION) {
          console.log(`New version detected: ${remoteVersion}. Clearing cache and reloading...`);
          
          // Prevent infinite loop: if we already tried reloading for this remote version, skip
          const lastReloadAttempt = localStorage.getItem('last_reload_version');
          if (lastReloadAttempt === remoteVersion) {
            console.log('Already attempted reload for this version, skipping.');
            return;
          }
          localStorage.setItem('last_reload_version', remoteVersion);
          
          // 1. Clear Service Worker caches if possible
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // 2. Unregister Service Workers completely
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.unregister();
            }
          }

          // 3. Clear stale AI model fallback state
          localStorage.removeItem('ai_fallback_date');
          localStorage.removeItem('ai_fallback_model');
           
          // 4. Final Hard Reload (forcing a fresh hit to the server by appending version)
          window.location.href = window.location.origin + window.location.pathname + '?v=' + remoteVersion;
        } else {
          // If version matches, check if we should show the "What's New" intro
          const lastSeenVersion = localStorage.getItem('last_seen_version');
          if (lastSeenVersion !== APP_VERSION) {
            // 🚀 Skip "What's New" for users coming from 1.6.x as requested
            // Also skip for brand new users (they will see Onboarding)
            const isFrom16 = lastSeenVersion?.startsWith('1.6');
            const isNewUser = !lastSeenVersion;

            if (!isFrom16 && !isNewUser) {
              setIsBugFixOnly(lastSeenVersion === '2.0.0');
              setShowWhatsNew(true);
            } else {
              localStorage.setItem('last_seen_version', APP_VERSION);
            }
          }
        }
      } catch (err) {
        console.error("Version check failed:", err);
      }
    };

    checkVersion();
    
    // Check version whenever the app is brought to the foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const [recentLogs, setRecentLogs] = useState([]);
  const [historyGroups, setHistoryGroups] = useState([]); // Array of { date, logs, totalCalories, totalProtein }
  const [expandedGroups, setExpandedGroups] = useState({}); // Record of date -> boolean
  const [showHistory, setShowHistory] = useState(false);
  const [showToday, setShowToday] = useState(true);
  const [advice, setAdvice] = useState('');
  const [now, setNow] = useState(new Date());
  const [lastLocation, setLastLocation] = useState(null);
  const [streak, setStreak] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedLogForDetail, setSelectedLogForDetail] = useState(null);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [isLoggedIn, setIsLoggedIn] = useState((() => { const token = localStorage.getItem('google_access_token'); const expiry = localStorage.getItem('google_token_expiry'); return !!token && !!expiry && Date.now() < Number(expiry); })());

  useEffect(() => {
    const handleAuth = () => setIsLoggedIn((() => { const token = localStorage.getItem('google_access_token'); const expiry = localStorage.getItem('google_token_expiry'); return !!token && !!expiry && Date.now() < Number(expiry); })());
    window.addEventListener('google-auth-change', handleAuth);
    return () => window.removeEventListener('google-auth-change', handleAuth);
  }, []);
  
  const DEFAULT_LAYOUT = ['panda', 'dashboard', 'detective', 'today', 'weight', 'history'];
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('app_layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const combined = Array.from(new Set([...parsed, ...DEFAULT_LAYOUT]));
        return combined.filter(item => DEFAULT_LAYOUT.includes(item));
      } catch(e) {}
    }
    return DEFAULT_LAYOUT;
  });
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState(null);

  useEffect(() => {
    // Check if index.html already caught it
    if (window.deferredPwaPrompt) {
      setPwaPrompt(window.deferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    localStorage.setItem('app_layout', JSON.stringify(layout));
  }, [layout]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ dish_name: '', calories: '', protein: '', water: '' });

  const adviceUpdateLockRef = useRef(false);
  const adviceTimerRef = useRef(null);

  const refreshData = async (adviceMode = 'none') => {
    // adviceMode: 'none' (just refresh data), 'fetch' (call AI), 'skip' (already have fresh AI advice)
    const shouldFetchAdvice = adviceMode === 'fetch';
    const shouldSkipAdvice = adviceMode === 'skip';
    
    // Reset lock if we are skipping (already handled) or explicitly performing a manual fetch/refresh
    if (shouldSkipAdvice || !adviceUpdateLockRef.current) {
      adviceUpdateLockRef.current = false;
    }
    
    const today = getLocalDateString();
    const dailySummary = await getDailySummary(today);
    setSummary(dailySummary);

    // Fetch goals
    const calGoal = await db.settings.get('calorie_goal');
    const proGoal = await db.settings.get('protein_goal');
    const watGoal = await db.settings.get('water_goal');
    const fEnabled = await db.settings.get('fasting_enabled');
    const fStart = await db.settings.get('fasting_start');
    const fEnd = await db.settings.get('fasting_end');
    const currentGoals = {
      calories: calGoal ? calGoal.value : 2000,
      protein: proGoal ? proGoal.value : 100,
      water: watGoal ? watGoal.value : 2500,
      fasting_enabled: fEnabled ? fEnabled.value : false,
      fasting_start: fStart ? fStart.value : '20:00',
      fasting_end: fEnd ? fEnd.value : '12:00'
    };
    setGoals(currentGoals);

    // Fetch streak
    const currentStreak = await calculateStreak();
    setStreak(currentStreak);

    // Fetch all logs and categorize
    const allLogs = await db.dietLogs
      .reverse()
      .sortBy('timestamp');
    
    // Categorize logs
    const todayLogs = allLogs.filter(log => log.date === today);
    setRecentLogs(todayLogs);
    
    // Find last location
    const lastWithLocation = allLogs.find(log => log.location);
    setLastLocation(lastWithLocation ? lastWithLocation.location : null);
    
    const historyEntries = allLogs.filter(log => log.date !== today);
    const groups = historyEntries.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) {
        acc[date] = { date, logs: [], totalCalories: 0, totalProtein: 0, totalWater: 0 };
      }
      acc[date].logs.push(log);
      acc[date].totalCalories += Number(log.calories) || 0;
      acc[date].totalProtein += Number(log.protein) || 0;
      acc[date].totalWater += Number(log.water) || 0;
      return acc;
    }, {});

    // Convert to sorted array
    const sortedGroups = Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    setHistoryGroups(sortedGroups);

    // 🚀 Background Analysis: Trigger only when specifically requested ('fetch')
    if (shouldFetchAdvice) {
      console.log("Scheduling debounced Panda analysis (5s)...");
      clearTimeout(adviceTimerRef.current);
      
      adviceTimerRef.current = setTimeout(async () => {
        console.log("Executing debounced Panda analysis...");
        // Re-fetch the absolute latest data from DB right before calling the API
        const latestSummary = await getDailySummary(today);
        const latestLogs = await db.dietLogs.where('date').equals(today).toArray();
        
        getPandaAdvice(
          latestSummary.calories, 
          currentGoals.calories, 
          latestSummary.protein, 
          currentGoals.protein,
          latestSummary.water,
          currentGoals.water,
          latestLogs, 
          getLanguage(),
          userName
        ).then(currentAdvice => {
          if (currentAdvice) setAdvice(currentAdvice);
        }).catch(err => {
          console.error("Background advice error:", err);
          setAdvice("ERROR_RETRY");
        });
      }, 5000);
    } else if (shouldSkipAdvice) {
      console.log("Using existing merged advice (skipping background fetch)");
    }
  };

  useEffect(() => {
    const initFacts = async () => {
      try {
        const count = await db.nutritionFacts.count();
        if (count === 0) {
          const { initialNutritionFacts } = await import('./lib/nutritionData');
          await db.nutritionFacts.bulkAdd(initialNutritionFacts);
        }
      } catch (err) {
        console.warn("DB init facts error (likely storage restricted):", err);
      }
    };
    
    initFacts();
    initGoogleAuth();
    
    // 🚀 Session Recovery: If we have user info but token is expired, try silent refresh
    import('./lib/googleAuth').then(m => {
      if (m.getUserInfo() && !m.isLoggedIn()) {
        console.log("🔄 [Auth] Token expired but user session exists. Attempting silent refresh...");
        m.refreshLogin();
      }
    });
    
    refreshData().catch(err => {
      console.error("Initial refreshData error:", err);
    });
  }, []);

  const deleteLog = async (id) => {
    await db.dietLogs.delete(id);
    refreshData();
  };

  const startEditing = (log) => {
    setEditingId(log.id);
    setEditValues({
      dish_name: log.dish_name,
      calories: log.calories,
      protein: log.protein,
      water: log.water || 0,
      category: log.category || 'snack'
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = async (id) => {
    await db.dietLogs.update(id, {
      dish_name: editValues.dish_name,
      calories: Number(editValues.calories) || 0,
      protein: Number(editValues.protein) || 0,
      water: Number(editValues.water) || 0,
      category: editValues.category
    });
    setEditingId(null);
    refreshData();
  };

  const toggleGroup = (date) => {
    setExpandedGroups(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const addToFavorite = async (log) => {
    // Check if already in favorites
    const existing = await db.favorites.where('dish_name').equals(log.dish_name).first();
    if (existing) {
      showToast(t('already_in_favorites'));
      return;
    }
    await db.favorites.add({
      dish_name: log.dish_name,
      calories: log.calories || 0,
      protein: log.protein || 0,
      water: log.water || 0,
      description: log.description || ''
    });
    setFavoriteUpdateTrigger(prev => prev + 1);
    showToast(t('added_to_favorites'));
  };

  const getFastingStatus = () => {
    if (!goals.fasting_enabled) return null;
    const now = new Date();
    const hourMin = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = goals.fasting_start.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const [eH, eM] = goals.fasting_end.split(':').map(Number);
    const endMins = eH * 60 + eM;
    
    let isEating = false;
    if (startMins <= endMins) {
      isEating = hourMin >= startMins && hourMin <= endMins;
    } else {
      isEating = hourMin >= startMins || hourMin <= endMins;
    }
    
    return { 
      isEating, 
      start: isEating ? goals.fasting_start : goals.fasting_end, 
      end: isEating ? goals.fasting_end : goals.fasting_start 
    };
  };

  const fasting = getFastingStatus();
  return (
    <div className="min-h-screen p-4 pb-28 max-w-lg mx-auto space-y-6">
      <AnimatePresence>
        {showOnboarding && <Onboarding key="onboarding" onComplete={handleOnboardingComplete} />}
        {showWhatsNew && (
          <WhatsNew 
            version={APP_VERSION}
            isBugFixOnly={isBugFixOnly}
            onClose={() => {
              setShowWhatsNew(false);
              localStorage.setItem('last_seen_version', APP_VERSION);
            }}
          />
        )}
        {showNamePrompt && <NamePromptModal key="name-prompt-modal" onSave={handleNameSave} isUpdate={true} />}
      </AnimatePresence>
      <PWAInstallPrompt 
        active={!showOnboarding && !showWhatsNew && !showNamePrompt} 
        deferredPrompt={pwaPrompt}
        onPromptUsed={() => setPwaPrompt(null)}
      />
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
            <motion.div
              key="toast-notification"
              initial={{ opacity: 0, y: -30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-white text-black px-5 py-3 rounded-2xl font-black text-sm shadow-neo border-4 border-black flex items-center gap-3 w-max max-w-[90vw] justify-center whitespace-nowrap"
            >
              <div className="bg-emerald-500 p-1 rounded-full border-2 border-black">
                <Check size={14} strokeWidth={4} className="text-white" />
              </div>
              {toast}
            </motion.div>
        )}
      </AnimatePresence>

      {fasting && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 border-4 border-black rounded-3xl shadow-neo-sm mb-2 flex items-center justify-between ${fasting.isEating ? 'bg-emerald-50' : 'bg-rose-50'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border-2 border-black ${fasting.isEating ? 'bg-emerald-400' : 'bg-rose-400'}`}>
              <Clock size={18} />
            </div>
            <div>
              
              <div className="text-sm font-black italic">
                {fasting.isEating ? '🔥 ' + t('eating_now') : '🌙 ' + t('fasting_now')} ({fasting.start} - {fasting.end})
              </div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full border-2 border-black text-[10px] font-black uppercase ${fasting.isEating ? 'bg-emerald-400' : 'bg-rose-400'}`}>
            {fasting.isEating ? 'Enjoy!' : 'Keep Going!'}
          </div>
        </motion.div>
      )}

      <header className="flex justify-between items-center py-4 gap-2">
        <div className="flex flex-col shrink min-w-[60px]">
          <h1 className="text-xs sm:text-base font-black italic tracking-tight leading-none">
            {userName ? (
              <span className="flex flex-col">
                <span className="text-accent text-[10px] uppercase tracking-widest block mb-0.5">{userName}{t('title_possessive')}</span>
                {t('app_title')}
              </span>
            ) : t('app_title')}
          </h1>
          <span className="text-[8px] font-bold text-zinc-400 mt-1">v{APP_VERSION}</span>
        </div>
        <div className="flex gap-2">
          <div className="bg-white border-[3px] sm:border-4 border-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl font-black shadow-neo-sm flex flex-col items-end justify-center">
            <div className="text-[10px] sm:text-xs">
              {now.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '/')} {now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
            {lastLocation && (
              <div className="text-[7px] sm:text-[9px] text-gray-400 italic">
                📍 {lastLocation}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NeoButton 
              variant="black" 
              className="w-10 h-10 p-0 flex items-center justify-center"
              onClick={() => setShowShare(true)}
              title="Share Card"
            >
              <Share2 size={18} />
            </NeoButton>
            <GoalSettings 
            initialTab={settingsTab} 
              onGoalsUpdated={refreshData} 
              onWatchTutorial={() => setShowOnboarding(true)}
              onLanguageChanged={() => setAdvice('')}
              userName={userName}
              onSetUserName={handleNameSave}
              onToggleLayoutEdit={() => setIsEditingLayout(!isEditingLayout)}
              isEditingLayout={isEditingLayout}
              pwaPrompt={pwaPrompt}
              onPwaPromptUsed={() => setPwaPrompt(null)}
            />
          </div>
        </div>
      </header>

      <Reorder.Group axis="y" values={layout} onReorder={setLayout} className="space-y-6">
        {layout.map(item => {
          let blockContent = null;
          if (item === 'panda') {
            blockContent = (
              <PandaCoachCard 
                advice={advice} 
                streak={streak} 
                onRetryAdvice={() => refreshData('fetch')}
                userName={userName}
              />
            );
          } else if (item === 'dashboard') {
            blockContent = <Dashboard summary={summary} goals={goals} />;
          } else if (item === 'detective') {
            blockContent = (
              <FoodDetective 
                onLogAdded={(type) => refreshData(type)} 
                recentLogs={recentLogs}
                summary={summary}
                goals={goals}
                setAdvice={setAdvice}
                adviceUpdateLockRef={adviceUpdateLockRef}
                favoriteUpdateTrigger={favoriteUpdateTrigger}
                userName={userName}
              />
            );
          } else if (item === 'today') {
            blockContent = (
              <NeoCard className="bg-white">
                <button 
                  onClick={() => {
                    if (!isEditingLayout) setShowToday(!showToday);
                  }}
                  className={`w-full flex items-center justify-between mb-0 ${isEditingLayout ? 'pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black italic">📝 {t('today_record')}</h2>
                    <span className="bg-black text-white px-2 py-0.5 rounded-xl text-[10px] font-bold">
                      {recentLogs.length} {t('items')}
                    </span>
                  </div>
                  <div className={`p-1.5 rounded-lg transition-colors ${showToday ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {showToday ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                <AnimatePresence>
                  {showToday && (
                    <motion.div
                      key="today-logs-list"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`space-y-3 pt-4 ${isEditingLayout ? 'pointer-events-none' : ''}`}>
                        {recentLogs.length > 0 ? (
                          recentLogs.map((log) => (
                            <LogItem 
                              key={log.id} 
                              log={log} 
                              isRecent={true}
                              editingId={editingId}
                              editValues={editValues}
                              setEditValues={setEditValues}
                              cancelEditing={cancelEditing}
                              saveEdit={saveEdit}
                              startEditing={startEditing}
                              deleteLog={deleteLog}
                              onAddToFavorite={addToFavorite}
                              onShowDetail={setSelectedLogForDetail}
                            />
                          ))
                        ) : (
                          <div className="text-center py-10 border-4 border-dashed border-gray-200 rounded-2xl">
                            <p className="text-gray-400 italic text-sm font-bold">{t('no_logs_today')}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </NeoCard>
            );
          } else if (item === 'weight') {
            blockContent = <WeightTracker pointerEventsNone={isEditingLayout} />;
          } else if (item === 'history' && historyGroups.length > 0) {
            blockContent = (
              <NeoCard className="bg-zinc-100">
                <button 
                  onClick={() => {
                    if (!isEditingLayout) setShowHistory(!showHistory);
                  }}
                  className={`w-full flex items-center justify-between mb-0 ${isEditingLayout ? 'pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black italic tracking-tighter">📚 {t('history_record')}</h2>
                  </div>
                  <div className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      key="history-logs-list"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`space-y-4 pt-4 ${isEditingLayout ? 'pointer-events-none' : ''}`}>
                        <HistoryTrends goals={goals} summary={summary} />
                        
                        {historyGroups.map((group) => {
                          const isExpanded = !!expandedGroups[group.date];
                          const caloriePercent = Math.round((group.totalCalories / goals.calories) * 100);
                          const proteinPercent = Math.round((group.totalProtein / goals.protein) * 100);
                          const waterPercent   = Math.round(((group.totalWater || 0) / goals.water) * 100);

                          const getCalColor = (p) => {
                            if (p > 110) return 'bg-rose-500';
                            if (p >= 100) return 'bg-emerald-500';
                            return 'bg-accent';
                          };
                          const getProColor = (p) => {
                            if (p >= 100) return 'bg-emerald-500';
                            return 'bg-black';
                          };
                          const getWatColor = (p) => {
                            if (p >= 100) return 'bg-emerald-500';
                            return 'bg-[#3b82f6]';
                          };

                          return (
                            <div key={group.date} className="flex flex-col gap-2 p-3 bg-white rounded-2xl border-2 border-transparent hover:border-black transition-all">
                              <button 
                                onClick={() => toggleGroup(group.date)}
                                className="w-full flex items-center justify-between group/header"
                              >
                                <div className="flex flex-col items-start gap-2 w-full">
                                  <div className="flex items-center gap-3 w-full">
                                    <span className="bg-black text-white px-2 py-1 rounded-lg text-[10px] font-black italic shrink-0">
                                      {group.date}
                                    </span>
                                    
                                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-black italic uppercase tracking-wider text-gray-400 flex-1">
                                      <span className={caloriePercent > 110 ? 'text-rose-500' : caloriePercent >= 100 ? 'text-emerald-600' : ''}>
                                        🔥 {caloriePercent}%
                                      </span>
                                      <span className={proteinPercent >= 100 ? 'text-emerald-600' : ''}>
                                        🍖 {proteinPercent}%
                                      </span>
                                      <span className={waterPercent >= 100 ? 'text-emerald-600' : ''}>
                                        🚰 {waterPercent}%
                                      </span>
                                    </div>

                                    <div className={`p-1 rounded-lg transition-colors ${isExpanded ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 group-hover/header:bg-gray-200'}`}>
                                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </div>
                                  </div>

                                  {/* Progress Bars - Standardized & Clean */}
                                  <div className="flex gap-1 w-full mt-0.5 pr-8">
                                    <div className="flex-1 h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                                      <div className={`h-full transition-all duration-700 ${getCalColor(caloriePercent)}`} style={{ width: `${Math.min(caloriePercent, 100)}%` }} />
                                    </div>
                                    <div className="flex-1 h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                                      <div className={`h-full transition-all duration-700 ${getProColor(proteinPercent)}`} style={{ width: `${Math.min(proteinPercent, 100)}%` }} />
                                    </div>
                                    <div className="flex-1 h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                                      <div className={`h-full transition-all duration-700 ${getWatColor(waterPercent)}`} style={{ width: `${Math.min(waterPercent, 100)}%` }} />
                                    </div>
                                  </div>
                                </div>
                              </button>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-2 px-1 pb-2"
                                  >
                                    {group.logs.map((log) => (
                                      <LogItem 
                                        key={log.id} 
                                        log={log} 
                                        isRecent={false}
                                        editingId={editingId}
                                        editValues={editValues}
                                        setEditValues={setEditValues}
                                        cancelEditing={cancelEditing}
                                        saveEdit={saveEdit}
                                        startEditing={startEditing}
                                        deleteLog={deleteLog}
                                        onAddToFavorite={addToFavorite}
                                        onShowDetail={setSelectedLogForDetail}
                                      />
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </NeoCard>
            );
          }

          if (!blockContent) return null;

          return (
            <Reorder.Item 
              key={item} 
              value={item}
              dragListener={isEditingLayout}
              className="relative group"
            >
              {isEditingLayout && (
                <div className="absolute -top-3 -left-3 -right-3 -bottom-3 border-4 border-dashed border-black/20 rounded-[2.5rem] pointer-events-none z-0" />
              )}
              <div className={`relative z-10 ${isEditingLayout ? 'pointer-events-none' : ''}`}>
                {blockContent}
              </div>
              {isEditingLayout && (
                <div className="absolute top-4 right-4 z-50 bg-black text-white p-2 rounded-xl shadow-neo-sm cursor-grab active:cursor-grabbing">
                  <GripHorizontal size={20} />
                </div>
              )}
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
      
      {/* Layout Editing Overlay Button */}
      <AnimatePresence>
        {isEditingLayout && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[400] w-max"
          >
            <NeoButton 
              variant="black" 
              className="h-16 px-10 rounded-full shadow-2xl flex items-center gap-3 border-4 border-white active:scale-95"
              onClick={() => setIsEditingLayout(false)}
            >
              <div className="bg-accent text-black p-1 rounded-full border-2 border-black">
                <Check size={20} strokeWidth={4} />
              </div>
              <span className="font-black italic uppercase tracking-widest text-lg">{t('finish_edit')}</span>
            </NeoButton>
          </motion.div>
        )}
      </AnimatePresence>

      <SharingCard 
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        summary={summary}
        goals={goals}
        streak={streak}
        advice={advice}
        userName={userName}
      />

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLogForDetail && (
          <LogDetailModal 
            log={selectedLogForDetail} 
            onClose={() => setSelectedLogForDetail(null)} 
          />
        )}
      </AnimatePresence>

      {/* Feedback Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black text-white p-6 rounded-[2.5rem] border-4 border-black shadow-neo-sm mt-8 mb-4 relative overflow-hidden mx-1"
      >
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-accent text-black px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 border-black">
              Beta Support
            </span>
            <h3 className="font-black italic text-xl">{t('feedback_title')}</h3>
          </div>
          <p className="text-zinc-400 font-bold text-xs leading-relaxed">
            {t('feedback_desc')}
          </p>
          <button 
            onClick={() => {
              setSettingsTab('feedback');
              window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'feedback' } }));
            }}
            className="w-full bg-white text-black h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-sm hover:bg-accent transition-all active:scale-95"
          >
            <MessageSquareQuote size={18} />
            {t('feedback_button')}
          </button>
        </div>
        <div className="absolute -bottom-6 -right-6 opacity-20 pointer-events-none">
          <Star size={120} className="text-white rotate-12" />
        </div>
      </motion.div>

      {/* Navigation Footer Spacer */}
      <div className="h-20" />
    </div>
  );
}

export default App;
