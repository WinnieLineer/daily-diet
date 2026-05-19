import React, { useState, useEffect } from 'react';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db } from '../db';
import { Settings, Sparkles, X, Target, Check, Database, Download, Upload, Globe, Calculator, User, Zap, Info, RotateCcw, LayoutGrid, MapPin, AlertCircle, ChevronRight, History, Loader2, Clock, MessageSquare, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, getLanguage, setLanguage } from '../lib/translations';
import { APP_VERSION } from '../lib/constants';
import { uploadToGist, downloadFromGist, getBackupInfo, getCurrentGistId, setGistId } from '../lib/gistService';

const VERSION_HISTORY = [
  { version: '2.1.2', date: '2026-05-19', features: [t('v212_f1')] },
  { version: '2.1.1', date: '2026-05-18', features: [t('v211_f1')] },
  { version: '2.1.0', date: '2026-05-17', features: [t('v210_f1'), t('v210_f2'), t('v210_f3')] },
  { version: '2.0.1', date: '2026-05-07', features: [t('v201_f1'), t('v201_f2'), t('v201_f3')] },
  { version: '2.0.0', date: '2026-05-06', features: [t('v200_f1'), t('v200_f2'), t('v200_f3'), t('v200_f4')] },
  { version: '1.9.0', date: '2026-05-05', features: [t('v190_f1'), t('v190_f2'), t('v190_f3'), t('v190_f4')] },
  { version: '1.8.4', date: '2026-05-04', features: [t('v184_f1'), t('v184_f2'), t('v184_f3')] },
  { version: '1.8.2', date: '2026-04-29', features: ['PWA 安裝引導系統 📱', 'iOS/Android 專屬安裝教學', '可自訂提示出現頻率'] },
  { version: '1.8.1', date: '2026-04-29', features: ['資料管理本地儲存警告 ⚠️', 'UI 配色與對比優化', '份量輸入體驗改進', '嘴砲區塊全面展開'] },
  { version: '1.8.0', date: '2026-04-29', features: ['個人化名稱系統 🐼', '設定區全面進化', 'AI 嘴砲區塊', '移除通知優化效能', '全新水杯圖示'] },
  { version: '1.7.19', date: '2026-04-20', features: ['AI 辨識穩定性優化', '歷史趨勢圖表改進', '多語系支援優化'] },
  { version: '1.7.0', date: '2026-04-10', features: ['常用紀錄功能', '自動地點標記', '智慧建議計算機'] },
  { version: '1.6.5', date: '2026-03-25', features: ['體重追蹤系統', '飲食分析日誌', '深色模式優化'] },
  { version: '1.5.0', date: '2026-03-10', features: ['全新 Neo-brutalism UI', '熊貓營養師登場'] }
];

const GoalSettings = ({ onGoalsUpdated, onWatchTutorial, onLanguageChanged, userName, onSetUserName, onToggleLayoutEdit, isEditingLayout, pwaPrompt, onPwaPromptUsed, initialTab = 'profile' }) => {
  const [goals, setGoals] = useState({ calories: 2000, protein: 100, water: 2500, fasting_enabled: false, fasting_start: '12:00', fasting_end: '20:00' });
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [contactForm, setContactForm] = useState({ subject: t('feedback_subject'), message: '' });
  const [newName, setNewName] = useState(userName || '');
  const [locationStatus, setLocationStatus] = useState('unknown');
  const [apiKey, setApiKey] = useState('');
  const [githubPat, setGithubPat] = useState(localStorage.getItem('github_pat') || '');
  const [copiedGistId, setCopiedGistId] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [calc, setCalc] = useState({ height: 170, weight: 70, age: 25, gender: 'male', activity: 1.375, goal: 'maintain' });
  const [stats, setStats] = useState({ localSize: 0, cloudSize: 0, cloudTime: null, loading: false });
  const [gistIdInput, setGistIdInput] = useState(getCurrentGistId() || '');
  
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || import.meta.env.DEV;

  useEffect(() => {
    fetchGoals();
    checkLocationPermission();
    refreshStats();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleOpenSettings = (e) => {
      setIsOpen(true);
      if (e.detail && e.detail.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  const refreshStats = async () => {
    setStats(prev => ({ ...prev, loading: true }));
    try {
      // Local Size
      const dietLogs = (await db.dietLogs.toArray()).map(({ image, ...rest }) => rest);
      const weightLogs = await db.weightLogs.toArray();
      const settings = await db.settings.toArray();
      const favorites = await db.favorites.toArray();
      const localBlob = new Blob([JSON.stringify({ dietLogs, weightLogs, settings, favorites })]);
      const localSize = localBlob.size;

      // Cloud Size (Always check Gist if ID exists)
      let cloudSize = 0;
      let cloudTime = null;
      const info = await getBackupInfo();
      if (info) {
        cloudSize = parseInt(info.size || '0');
        cloudTime = info.modifiedTime;
      }
      setStats({ localSize, cloudSize, cloudTime, loading: false });
    } catch (err) {
      console.error("Stats failed", err);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };


  const checkLocationPermission = () => {
    if ("geolocation" in navigator) {
      if (localStorage.getItem('location_granted') === 'true') setLocationStatus('granted');
      else setLocationStatus('denied');
    }
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => { localStorage.setItem('location_granted', 'true'); setLocationStatus('granted'); },
        () => { localStorage.setItem('location_granted', 'false'); setLocationStatus('denied'); }
      );
    }
  };

  const fetchGoals = async () => {
    const cal = await db.settings.get('calorie_goal');
    const pro = await db.settings.get('protein_goal');
    const wat = await db.settings.get('water_goal');
    const fEn = await db.settings.get('fasting_enabled');
    const fSt = await db.settings.get('fasting_start');
    const fEnTime = await db.settings.get('fasting_end');
    if (cal) {
      setGoals({ 
        calories: cal.value, 
        protein: pro ? pro.value : 100,
        water: wat ? wat.value : 2500,
        fasting_enabled: fEn ? fEn.value : false,
        fasting_start: fSt ? fSt.value : '12:00',
        fasting_end: fEnTime ? fEnTime.value : '20:00'
      });
    }
    const ak = await db.settings.get('user_api_key');
    if (ak) setApiKey(ak.value);
  };

  const saveGoals = async () => {
    await db.settings.put({ key: 'calorie_goal', value: Number(goals.calories) });
    await db.settings.put({ key: 'protein_goal', value: Number(goals.protein) });
    await db.settings.put({ key: 'water_goal', value: Number(goals.water) });
    await db.settings.put({ key: 'fasting_enabled', value: goals.fasting_enabled });
    await db.settings.put({ key: 'fasting_start', value: goals.fasting_start });
    await db.settings.put({ key: 'fasting_end', value: goals.fasting_end });
    if (isLocal) await db.settings.put({ key: 'user_api_key', value: apiKey });
    setIsOpen(false);
    onGoalsUpdated();
  };

  const calculateSuggestion = () => {
    const bmr = (10 * calc.weight) + (6.25 * calc.height) - (5 * calc.age) + (calc.gender === 'male' ? 5 : -161);
    const tdee = bmr * calc.activity;
    let suggestedCals = tdee;
    if (calc.goal === 'lose') suggestedCals -= 500;
    if (calc.goal === 'recomp') suggestedCals -= 200;
    if (calc.goal === 'gain') suggestedCals += 300;
    let suggestedPro = calc.weight * (calc.goal === 'recomp' ? 2.2 : calc.goal === 'lose' ? 2.0 : 1.8);
    setGoals({ ...goals, calories: Math.round(suggestedCals), protein: Math.round(suggestedPro), water: Math.round(calc.weight * 35) });
    setShowCalculator(false);
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    if (onLanguageChanged) onLanguageChanged();
    onGoalsUpdated();
  };

  const handleCloudBackup = async () => {
    if (getCurrentGistId() && !confirm(t('backup_confirm'))) return;
    setSyncStatus('syncing');
    try {
      const data = {
        dietLogs: (await db.dietLogs.toArray()).map(({ image, ...rest }) => ({ ...rest, image: null })),
        weightLogs: await db.weightLogs.toArray(),
        settings: await db.settings.toArray(),
        favorites: await db.favorites.toArray(),
        localStorage: {
          user_name: localStorage.getItem('user_name'),
          app_layout: localStorage.getItem('app_layout'),
          onboarding_seen: localStorage.getItem('onboarding_seen'),
          last_seen_version: localStorage.getItem('last_seen_version'),
          location_granted: localStorage.getItem('location_granted')
        }
      };
      await uploadToGist(data);
      setGistIdInput(getCurrentGistId() || '');
      setSyncStatus('success');
      refreshStats();
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      alert(err.message);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleCloudRestore = async () => {
    if (!getCurrentGistId()) {
      alert(t('no_gist_backup') || "No Gist ID found. Please set it in Data tab.");
      return;
    }
    if (!confirm(t('restore_confirm'))) return;
    setSyncStatus('syncing');
    try {
      const data = await downloadFromGist();
      if (!data) { alert(t('no_cloud_backup')); setSyncStatus('error'); return; }
      await db.transaction('rw', db.dietLogs, db.weightLogs, db.settings, db.favorites, async () => {
        await db.dietLogs.clear(); await db.weightLogs.clear(); await db.settings.clear(); await db.favorites.clear();
        if (data.dietLogs) await db.dietLogs.bulkAdd(data.dietLogs.map(({id, ...r}) => r));
        if (data.weightLogs) await db.weightLogs.bulkAdd(data.weightLogs.map(({id, ...r}) => r));
        if (data.settings) await db.settings.bulkAdd(data.settings);
        if (data.favorites) await db.favorites.bulkAdd(data.favorites.map(({id, ...r}) => r));
      });
      if (data.localStorage) {
        Object.entries(data.localStorage).forEach(([key, value]) => { if (value !== null) localStorage.setItem(key, value); });
      }
      setSyncStatus('success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      alert(err.message);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleManualGistIdSave = () => {
    if (gistIdInput.trim()) {
      setGistId(gistIdInput.trim());
      refreshStats();
      alert(t('gist_id_saved') || "Gist ID saved!");
    }
  };

  return (
    <div className="relative">
      <NeoButton 
        data-settings-btn 
        variant="white" 
        onClick={() => setIsOpen(!isOpen)} 
        className="px-3"
      >
        <Settings size={20} />
      </NeoButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
            <motion.div 
              className="relative bg-white border-4 border-black rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-neo flex flex-col max-h-[90vh] pointer-events-auto"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
            >
              {/* Modal Header */}
              <div className="p-4 border-b-4 border-black flex items-center justify-between bg-zinc-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-black text-white p-2 rounded-xl">
                    <Settings size={20} />
                  </div>
                  <h3 className="font-black italic text-lg leading-none uppercase tracking-tighter">{t('settings')}</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* User Header */}
              <div className="px-4 py-3 bg-white border-b-4 border-black border-dotted shrink-0">
                <div className="flex items-center gap-3 p-3 border-4 border-black rounded-2xl bg-zinc-50 shadow-neo-sm">
                  <div className="bg-black text-white p-2 rounded-xl shrink-0">
                    <Database size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-[10px] truncate uppercase">{getCurrentGistId() ? "GIST BACKUP ACTIVE" : "NO CLOUD BACKUP"}</div>
                    <div className="text-[8px] font-bold text-zinc-400 truncate uppercase tracking-widest">{getCurrentGistId() ? `ID: ${getCurrentGistId()}` : t('backup_desc')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleCloudBackup} disabled={syncStatus === 'syncing'} className="p-2 rounded-lg border-2 border-black bg-white hover:bg-emerald-400 active:scale-90">
                      <Upload size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={handleCloudRestore} disabled={syncStatus === 'syncing'} className="p-2 rounded-lg border-2 border-black bg-white hover:bg-amber-400 active:scale-90">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex p-2 gap-1 bg-zinc-100 overflow-x-auto no-scrollbar border-b-4 border-black shrink-0">
                {[
                  { id: 'profile', icon: User, label: t('settings_profile') },
                  { id: 'goals', icon: Target, label: t('settings_goals') },
                  { id: 'fasting', icon: Clock, label: t('fasting_mode') },
                  { id: 'data', icon: Database, label: t('settings_data') },
                  { id: 'feedback', icon: MessageSquare, label: t('settings_contact') },
                  { id: 'appinfo', icon: Info, label: t('settings_about') }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center min-w-[65px] flex-1 p-2 rounded-xl border-2 transition-all ${activeTab === tab.id ? 'bg-black text-white border-black scale-105' : 'bg-transparent text-zinc-400 border-transparent hover:text-black'}`}>
                    <tab.icon size={18} />
                    <span className="text-[8px] font-black mt-1 uppercase tracking-tight">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className="overflow-y-auto p-4 sm:p-6 flex-1 custom-scrollbar">
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{t('your_name')}</label>
                      <div className="flex gap-2">
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 bg-white border-4 border-black p-3 rounded-2xl font-black italic shadow-neo-xs outline-none" />
                        <button onClick={() => onSetUserName(newName)} className="bg-black text-white px-6 rounded-2xl font-black italic active:scale-95">{t('save')}</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{t('settings_language')}</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ id: 'zh', name: '中文' }, { id: 'en', name: 'English' }].map(lang => (
                          <button key={lang.id} onClick={() => handleLanguageChange(lang.id)} className={`p-3 rounded-xl border-4 font-black italic text-sm transition-all ${getLanguage() === lang.id ? 'bg-black text-white border-black shadow-neo-sm' : 'bg-white border-zinc-100'}`}>
                            {lang.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => { onToggleLayoutEdit(); setIsOpen(false); }} className={`w-full flex items-center gap-4 p-4 border-4 border-black rounded-2xl shadow-neo-sm transition-all ${isEditingLayout ? 'bg-black text-white' : 'bg-white'}`}>
                      <LayoutGrid size={20} />
                      <span className="font-black italic text-sm">{t('edit_layout')}</span>
                    </button>
                  </div>
                )}

                {activeTab === 'goals' && (
                  <div className="space-y-6">
                    <div className="bg-accent/10 border-4 border-black p-4 rounded-2xl flex items-center justify-between shadow-neo-sm">
                      <div>
                        <h4 className="font-black italic text-sm">{t('smart_goal')}</h4>
                        <p className="text-[10px] font-bold text-zinc-400">{t('formula_tdee')}</p>
                      </div>
                      <button onClick={() => setShowCalculator(!showCalculator)} className="p-2 rounded-xl shadow-neo-xs border-2 border-black bg-white"><Calculator size={20} /></button>
                    </div>
                    {showCalculator && (
                      <div className="p-4 border-4 border-black rounded-[2rem] bg-zinc-50 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" placeholder="Height" value={calc.height} onChange={e => setCalc({...calc, height: e.target.value})} className="border-2 border-black p-2 rounded-xl" />
                          <input type="number" placeholder="Weight" value={calc.weight} onChange={e => setCalc({...calc, weight: e.target.value})} className="border-2 border-black p-2 rounded-xl" />
                        </div>
                        <button onClick={calculateSuggestion} className="w-full bg-black text-white py-3 rounded-xl font-black italic">{t('apply_suggestion')}</button>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('calories')}</label>
                        <input type="number" value={goals.calories} onChange={e => setGoals({...goals, calories: e.target.value})} className="w-full border-2 border-black p-3 rounded-xl font-black text-xl" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('protein')}</label>
                        <input type="number" value={goals.protein} onChange={e => setGoals({...goals, protein: e.target.value})} className="w-full border-2 border-black p-3 rounded-xl font-black text-xl" />
                      </div>
                      {isLocal && (
                        <div className="pt-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('settings_api_key')}</label>
                          <input 
                            type="password" 
                            value={apiKey} 
                            onChange={e => setApiKey(e.target.value)} 
                            className="w-full border-2 border-black p-3 rounded-xl font-bold text-sm bg-zinc-50 focus:bg-white transition-all"
                            placeholder="AI_..."
                          />
                          <div className="mt-1 flex items-start gap-1 ml-1">
                            <Info size={10} className="text-zinc-400 mt-0.5" />
                            <span className="text-[8px] font-bold text-zinc-400 leading-tight">{t('api_key_hint')}</span>
                          </div>
                        </div>
                      )}
                      <NeoButton variant="black" className="w-full h-16 rounded-2xl shadow-neo" onClick={saveGoals}>{t('save')}</NeoButton>
                    </div>
                  </div>
                )}

                {activeTab === 'fasting' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-zinc-50 border-4 border-black rounded-2xl shadow-neo-sm">
                      <div className="flex items-center gap-3">
                        <Clock className="text-black" size={24} />
                        <span className="font-black italic">{t('fasting_mode')}</span>
                      </div>
                      <button onClick={() => setGoals({...goals, fasting_enabled: !goals.fasting_enabled})} className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors ${goals.fasting_enabled ? 'bg-black' : 'bg-zinc-200'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white border-2 border-black absolute top-0.5 transition-all ${goals.fasting_enabled ? 'left-6' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {goals.fasting_enabled && (
                      <div className="flex items-center justify-center gap-3 bg-white border-2 border-dashed border-black/10 p-4 rounded-2xl">
                        <div className="flex-1 max-w-[120px] space-y-1">
                          <label className="text-[9px] font-black uppercase text-zinc-400 block text-center">{t('fasting_start')}</label>
                          <input type="time" value={goals.fasting_start} onChange={e => setGoals({...goals, fasting_start: e.target.value})} className="w-full border-2 border-black p-1.5 rounded-xl font-bold text-xs bg-zinc-50 text-center" />
                        </div>
                        <div className="text-black font-black mt-4">~</div>
                        <div className="flex-1 max-w-[120px] space-y-1">
                          <label className="text-[9px] font-black uppercase text-zinc-400 block text-center">{t('fasting_end')}</label>
                          <input type="time" value={goals.fasting_end} onChange={e => setGoals({...goals, fasting_end: e.target.value})} className="w-full border-2 border-black p-1.5 rounded-xl font-bold text-xs bg-zinc-50 text-center" />
                        </div>
                      </div>
                    )}
                    <NeoButton variant="black" className="w-full h-16 rounded-2xl shadow-neo" onClick={saveGoals}>{t('save')}</NeoButton>
                  </div>
                )}

                {activeTab === 'data' && (
                  <div className="space-y-6">
                    {/* Data Stats Card */}
                    <div className="bg-zinc-50 border-4 border-black rounded-3xl p-5 shadow-neo-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Database size={18} className="text-black" />
                        <h4 className="font-black italic text-sm uppercase tracking-tighter">{t('data_stats_header')}</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white border-2 border-black p-3 rounded-2xl">
                          <div className="text-[8px] font-black text-zinc-400 uppercase mb-1">{t('data_usage_local')}</div>
                          <div className="text-lg font-black italic">{(stats.localSize / 1024 / 1024).toFixed(2)} <span className="text-[10px]">MB</span></div>
                        </div>
                        <div className="bg-white border-2 border-black p-3 rounded-2xl">
                          <div className="text-[8px] font-black text-zinc-400 uppercase mb-1">{t('data_usage_cloud')}</div>
                          <div className="text-lg font-black italic">{(stats.cloudSize / 1024 / 1024).toFixed(2)} <span className="text-[10px]">MB</span></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 bg-white/50 p-3 rounded-xl border-2 border-dashed border-black/10">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} />
                          <span>{t('est_sync_time')
                            .replace('{min}', Math.max(2, Math.ceil(stats.localSize / 1024 / 1024 * 0.5)))
                            .replace('{max}', Math.max(5, Math.ceil(stats.localSize / 1024 / 1024 * 1.5)))}</span>
                        </div>
                        <button onClick={refreshStats} disabled={stats.loading} className="text-black hover:rotate-180 transition-transform">
                          <RotateCcw size={14} className={stats.loading ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={handleCloudBackup} 
                        disabled={syncStatus === 'syncing'} 
                        className="flex flex-col items-center gap-2 p-4 border-4 border-black rounded-2xl bg-emerald-50 hover:bg-emerald-100 shadow-neo-sm transition-all active:translate-y-0.5 disabled:opacity-50"
                      >
                        {syncStatus === 'syncing' ? <Loader2 size={24} className="text-emerald-600 animate-spin" /> : <Upload size={24} className="text-emerald-600" />}
                        <span className="text-[10px] font-black uppercase">{t('backup_to_gist') || "Backup to Gist"}</span>
                      </button>
                      <button 
                        onClick={handleCloudRestore} 
                        disabled={syncStatus === 'syncing'} 
                        className="flex flex-col items-center gap-2 p-4 border-4 border-black rounded-2xl bg-amber-50 hover:bg-amber-100 shadow-neo-sm transition-all active:translate-y-0.5 disabled:opacity-50"
                      >
                        {syncStatus === 'syncing' ? <Loader2 size={24} className="text-amber-600 animate-spin" /> : <RotateCcw size={24} className="text-amber-600" />}
                        <span className="text-[10px] font-black uppercase">{t('restore_from_gist') || "Restore from Gist"}</span>
                      </button>
                    </div>

                    <div className="space-y-2 p-4 bg-zinc-50 border-4 border-black rounded-3xl">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                        {t('gist_id_label') || "GITHUB GIST ID"}
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={gistIdInput} 
                          onChange={e => setGistIdInput(e.target.value)} 
                          placeholder="e.g. 1a2b3c4d5e6f..."
                          className="flex-1 bg-white border-4 border-black p-3 rounded-xl font-black italic text-xs shadow-neo-xs outline-none" 
                        />
                        {getCurrentGistId() && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(getCurrentGistId());
                              setCopiedGistId(true);
                              setTimeout(() => setCopiedGistId(false), 2000);
                            }}
                            className={`px-3 rounded-xl border-4 border-black font-black italic text-xs active:scale-95 transition-colors ${
                              copiedGistId ? 'bg-emerald-400 text-black' : 'bg-white text-black'
                            }`}
                            title="Copy Gist ID"
                          >
                            {copiedGistId ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={3} />}
                          </button>
                        )}
                        <button 
                          onClick={handleManualGistIdSave}
                          className="bg-black text-white px-4 rounded-xl font-black italic text-xs active:scale-95"
                        >
                          {t('save')}
                        </button>
                      </div>
                      <p className="text-[8px] font-bold text-zinc-400 mt-1 ml-1 leading-tight">
                        {t('gist_id_hint') || "Backup creates this automatically. Manually paste here to sync on other devices."}
                      </p>
                    </div>

                    {isLocal && (
                      <>
                        <div className="space-y-2 pt-4 border-t-4 border-black border-dotted">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                            SiliconFlow API Key (Local)
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="password" 
                              value={apiKey} 
                              onChange={e => setApiKey(e.target.value)} 
                              className="flex-1 bg-white border-4 border-black p-3 rounded-xl font-black italic text-xs shadow-neo-xs outline-none" 
                            />
                            <button 
                              onClick={async () => {
                                await db.settings.put({ key: 'user_api_key', value: apiKey });
                                alert('API Key Saved');
                              }}
                              className="bg-black text-white px-4 rounded-xl font-black italic text-xs active:scale-95"
                            >
                              {t('save')}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t-4 border-black border-dotted">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                            GitHub PAT (Local Backup)
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="password" 
                              value={githubPat} 
                              onChange={e => setGithubPat(e.target.value)} 
                              className="flex-1 bg-white border-4 border-black p-3 rounded-xl font-black italic text-xs shadow-neo-xs outline-none" 
                            />
                            <button 
                              onClick={() => {
                                localStorage.setItem('github_pat', githubPat);
                                alert('GitHub PAT Saved');
                              }}
                              className="bg-black text-white px-4 rounded-xl font-black italic text-xs active:scale-95"
                            >
                              {t('save')}
                            </button>
                          </div>
                        </div>
                      </>
                     )}
                  </div>
                )}

                {activeTab === 'feedback' && (
                  <div className="space-y-6">
                    <div className="p-6 bg-amber-50 border-4 border-black rounded-[2.5rem] shadow-neo-sm relative overflow-hidden">
                      <div className="relative z-10 space-y-4">
                        <div className="bg-black text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-neo-xs">
                          <Zap size={24} className="text-amber-400" />
                        </div>
                        <h4 className="font-black italic text-xl tracking-tighter uppercase leading-none">
                          {t('v201_feedback_title')}
                        </h4>
                        
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">{t('contact_subject')}</label>
                            <input 
                              type="text" 
                              value={contactForm.subject} 
                              onChange={e => setContactForm({...contactForm, subject: e.target.value})}
                              className="w-full bg-white border-4 border-black p-3 rounded-xl font-black italic text-sm shadow-neo-xs outline-none focus:bg-amber-100 transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">{t('contact_message')}</label>
                            <textarea 
                              rows={4}
                              value={contactForm.message} 
                              onChange={e => setContactForm({...contactForm, message: e.target.value})}
                              className="w-full bg-white border-4 border-black p-3 rounded-xl font-black italic text-sm shadow-neo-xs outline-none focus:bg-amber-100 transition-colors resize-none"
                              placeholder="..."
                            />
                          </div>
                        </div>

                        <button 
                          onClick={async () => {
                            if (!contactForm.message.trim()) return;
                            
                            // 🚀 WEB3FORMS SUBMISSION (Restored from user snippet)
                            try {
                              setSyncStatus('syncing');
                              const response = await fetch('https://api.web3forms.com/submit', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  access_key: '72d7f10c-b6c8-42f2-9c40-fc5fac45cad0',
                                  subject: `[Daily-Diet v${APP_VERSION}] ${contactForm.subject}`,
                                  message: contactForm.message,
                                  from_name: 'Daily Diet App User',
                                  device: navigator.userAgent
                                })
                              });
                              const data = await response.json();
                              if (data.success) {
                                alert(t('contact_success'));
                                setContactForm({ subject: t('feedback_subject'), message: '' });
                              } else {
                                throw new Error('Submission failed');
                              }
                            } catch (err) {
                              console.error("Feedback failed", err);
                              alert(t('contact_error'));
                            } finally {
                              setSyncStatus('idle');
                            }
                          }}
                          disabled={syncStatus === 'syncing'}
                          className="flex items-center justify-center gap-3 w-full bg-black text-white p-4 rounded-2xl font-black italic hover:bg-zinc-800 transition-all active:scale-95 shadow-neo-xs disabled:opacity-50"
                        >
                          {syncStatus === 'syncing' ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Check size={20} className="text-emerald-400" />
                          )}
                          {syncStatus === 'syncing' ? t('contact_sending') : t('contact_send')}
                        </button>
                      </div>
                      <div className="absolute -bottom-6 -right-6 opacity-10 rotate-12 pointer-events-none">
                        <MessageSquare size={120} className="text-black" />
                      </div>
                    </div>

                    {/* ☕ Ko-fi Support Card */}
                    <a
                      href="https://ko-fi.com/winnielinspace"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="relative p-5 bg-[#FF5E5B] border-4 border-black rounded-[2rem] shadow-neo overflow-hidden transition-transform active:scale-95 group-hover:-translate-y-1">
                        <div className="absolute -top-6 -right-6 text-[80px] opacity-10 rotate-12 pointer-events-none select-none">☕</div>
                        <div className="relative z-10 flex flex-col gap-3">
                          <div className="flex items-center gap-4">
                            <div className="shrink-0 w-14 h-14 bg-white border-4 border-black rounded-2xl flex items-center justify-center shadow-neo-xs text-2xl">
                              ☕
                            </div>
                            <div className="flex-1">
                              <p className="font-black italic text-white text-base uppercase tracking-tight leading-snug drop-shadow">
                                {t('kofi_title') || '請我喝杯咖啡！'}
                              </p>
                            </div>
                          </div>
                          <p className="text-white/95 text-[12px] font-bold leading-relaxed whitespace-pre-wrap">
                            {t('kofi_desc') || 'App 完全免費，你的支持讓開發者能繼續更新新功能 🐼'}
                          </p>
                          <div className="w-full bg-white border-4 border-black rounded-xl px-3 py-2.5 shadow-neo-xs text-center mt-1 active:scale-95 transition-transform">
                            <span className="font-black italic text-sm text-black uppercase">認養伺服器與開發者 ☕</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  </div>
                )}

                {activeTab === 'appinfo' && (
                  <div className="space-y-6">
                    <div className="p-4 bg-zinc-50 border-4 border-black rounded-2xl shadow-neo-sm text-center">
                      <h4 className="font-black italic mb-1">Daily Diet v{APP_VERSION}</h4>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">© 2026 Winnie Lin Space</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1 text-zinc-400"><History size={16} /><span className="text-[10px] font-black uppercase">{t('settings_version_history')}</span></div>
                      <div className="space-y-2">
                        {VERSION_HISTORY.map(v => (
                          <div key={v.version} className="p-3 border-2 border-black rounded-xl bg-white">
                            <div className="flex justify-between items-center mb-1"><span className="font-black text-xs italic">v{v.version}</span><span className="text-[8px] font-bold text-zinc-300">{v.date}</span></div>
                            <p className="text-[10px] font-bold text-zinc-500 leading-tight">{v.features.join(' · ')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-center gap-4 py-4 opacity-40">
                      <a href="./privacy.html" target="_blank" className="text-[10px] font-black uppercase underline">Privacy</a>
                      <a href="./terms.html" target="_blank" className="text-[10px] font-black uppercase underline">Terms</a>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalSettings;
