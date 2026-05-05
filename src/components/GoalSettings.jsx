import React, { useState, useEffect } from 'react';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db } from '../db';
import { Settings, Sparkles, X, Target, Check, Database, Download, Upload, Mail, Globe, Calculator, User, Zap, Trophy, Info, RotateCcw, LayoutGrid, MapPin, AlertCircle, ChevronRight, History, Loader2, Share, ArrowBigDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, getLanguage, setLanguage } from '../lib/translations';
import { APP_VERSION } from '../lib/constants';
import { login, logout, getUserInfo, isLoggedIn } from '../lib/googleAuth';
import { uploadToDrive, downloadFromDrive } from '../lib/driveService';

const VERSION_HISTORY = [
  { version: '1.8.2', date: '2026-04-29', features: ['PWA 安裝引導系統 📱', 'iOS/Android 專屬安裝教學', '可自訂提示出現頻率'] },
  { version: '1.8.1', date: '2026-04-29', features: ['資料管理本地儲存警告 ⚠️', 'UI 配色與對比優化', '份量輸入體驗改進', '嘴砲區塊全面展開'] },
  { version: '1.8.0', date: '2026-04-29', features: ['個人化名稱系統 🐼', '設定區全面進化', 'AI 嘴砲區塊', '移除通知優化效能', '全新水杯圖示'] },
  { version: '1.7.19', date: '2026-04-20', features: ['AI 辨識穩定性優化', '歷史趨勢圖表改進', '多語系支援優化'] },
  { version: '1.7.0', date: '2026-04-10', features: ['常用紀錄功能', '自動地點標記', '智慧建議計算機'] },
  { version: '1.6.5', date: '2026-03-25', features: ['體重追蹤系統', '飲食分析日誌', '深色模式優化'] },
  { version: '1.5.0', date: '2026-03-10', features: ['全新 Neo-brutalism UI', '熊貓營養師登場'] }
];

const GoalSettings = ({ onGoalsUpdated, onWatchTutorial, onLanguageChanged, userName, onSetUserName, onToggleLayoutEdit, isEditingLayout, pwaPrompt, onPwaPromptUsed }) => {
  const [goals, setGoals] = useState({ calories: 2000, protein: 100, water: 2500 });
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'goals', 'language', 'appinfo', 'data', 'contact'
  const [newName, setNewName] = useState(userName || '');
  const [locationStatus, setLocationStatus] = useState('unknown');
  const [apiKey, setApiKey] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [googleUser, setGoogleUser] = useState(getUserInfo());
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'success', 'error'

  const handlePwaInstall = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === 'accepted') {
      onPwaPromptUsed();
    }
  };

  // Calculator State
  const [calc, setCalc] = useState({
    height: 170,
    weight: 70,
    age: 25,
    gender: 'male',
    activity: 1.375,
    goal: 'maintain'
  });
  
  const isLocal = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    import.meta.env.DEV;
  
  // Contact form state
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });
  const [submitStatus, setSubmitStatus] = useState('idle');

  useEffect(() => {
    fetchGoals();
    checkLocationPermission();

    const handleAuthChange = () => {
      setGoogleUser(getUserInfo());
    };
    window.addEventListener('google-auth-change', handleAuthChange);
    return () => window.removeEventListener('google-auth-change', handleAuthChange);
  }, []);

  const checkLocationPermission = () => {
    if ("geolocation" in navigator) {
      if (localStorage.getItem('location_granted') === 'true') {
        setLocationStatus('granted');
      } else {
        setLocationStatus('denied');
      }
    }
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          localStorage.setItem('location_granted', 'true');
          setLocationStatus('granted');
        },
        () => {
          localStorage.setItem('location_granted', 'false');
          setLocationStatus('denied');
        }
      );
    }
  };

  const fetchGoals = async () => {
    const cal = await db.settings.get('calorie_goal');
    const pro = await db.settings.get('protein_goal');
    const wat = await db.settings.get('water_goal');
    if (cal && pro) {
      setGoals({ 
        calories: cal.value, 
        protein: pro.value,
        water: wat ? wat.value : 2500 
      });
    }

    const ak = await db.settings.get('user_api_key');
    if (ak) setApiKey(ak.value);
  };

  const saveGoals = async () => {
    await db.settings.put({ key: 'calorie_goal', value: Number(goals.calories) });
    await db.settings.put({ key: 'protein_goal', value: Number(goals.protein) });
    await db.settings.put({ key: 'water_goal', value: Number(goals.water) });
    if (isLocal) {
      await db.settings.put({ key: 'user_api_key', value: apiKey });
    }
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
    let suggestedWater = calc.weight * 35;

    setGoals({
      calories: Math.round(suggestedCals),
      protein: Math.round(suggestedPro),
      water: Math.round(suggestedWater)
    });
    setShowCalculator(false);
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    if (onLanguageChanged) onLanguageChanged();
    onGoalsUpdated();
  };

  const handleContactSubmit = async () => {
    if (submitStatus === 'sending') return;
    if (!contactForm.subject.trim() || !contactForm.message.trim()) return;
    setSubmitStatus('sending');
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: '72d7f10c-b6c8-42f2-9c40-fc5fac45cad0',
          subject: `[Daily-Diet v${APP_VERSION}] ${contactForm.subject}`,
          message: contactForm.message,
          from_name: 'Daily Diet App User',
        })
      });
      const data = await response.json();
      if (data.success) {
        setSubmitStatus('success');
        setContactForm({ subject: '', message: '' });
        setTimeout(() => setSubmitStatus('idle'), 3000);
      } else {
        throw new Error('Submission failed');
      }
    } catch (err) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 4000);
    }
  };

  const handleCloudBackup = async () => {
    if (!isLoggedIn()) {
      login();
      return;
    }
    
    if (!confirm(t('backup_confirm'))) return;
    
    setSyncStatus('syncing');
    try {
      const data = {
        dietLogs: await db.dietLogs.toArray(),
        weightLogs: await db.weightLogs.toArray(),
        settings: await db.settings.toArray(),
        favorites: await db.favorites.toArray()
      };
      await uploadToDrive(data);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      alert(err.message);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleCloudRestore = async () => {
    if (!isLoggedIn()) {
      login();
      return;
    }

    if (!confirm(t('restore_confirm'))) return;

    setSyncStatus('syncing');
    try {
      const data = await downloadFromDrive();
      if (!data) {
        alert(t('no_cloud_backup'));
        setSyncStatus('error');
        return;
      }

      await db.transaction('rw', db.dietLogs, db.weightLogs, db.settings, db.favorites, async () => {
        await db.dietLogs.clear(); await db.weightLogs.clear(); await db.settings.clear(); await db.favorites.clear();
        if (data.dietLogs) await db.dietLogs.bulkAdd(data.dietLogs.map(({id, ...r}) => r));
        if (data.weightLogs) await db.weightLogs.bulkAdd(data.weightLogs.map(({id, ...r}) => r));
        if (data.settings) await db.settings.bulkAdd(data.settings);
        if (data.favorites) await db.favorites.bulkAdd(data.favorites.map(({id, ...r}) => r));
      });
      
      setSyncStatus('success');
      setTimeout(() => {
        setSyncStatus('idle');
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      alert(err.message);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  return (
    <div className="relative">
      <NeoButton variant="white" onClick={() => setIsOpen(!isOpen)} className="px-3">
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
            <NeoCard 
              disableHover
              className="relative z-[310] w-full max-w-sm max-h-[90vh] shadow-2xl overflow-hidden p-0 flex flex-col"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
            >
              <div className="flex items-center justify-between p-4 bg-zinc-50 border-b-2 border-black">
                <h3 className="font-black text-lg italic tracking-tight uppercase">
                  {activeTab === 'profile' && t('settings_profile')}
                  {activeTab === 'goals' && t('settings_goals')}
                  {activeTab === 'language' && t('settings_language')}
                  {activeTab === 'appinfo' && t('settings_app_info')}
                  {activeTab === 'contact' && t('settings_contact')}
                  {activeTab === 'data' && t('settings_data')}
                </h3>
                <button onClick={() => setIsOpen(false)} className="bg-white border-2 border-black p-1 rounded-xl hover:bg-zinc-100">
                  <X size={18} />
                </button>
              </div>

              <div className="flex p-2 gap-1 bg-white border-b-2 border-zinc-100">
                {[
                  { id: 'profile', icon: User },
                  { id: 'goals', icon: Target },
                  { id: 'appinfo', icon: Info },
                  { id: 'pwa', icon: Download },
                  { id: 'language', icon: Globe },
                  { id: 'data', icon: Database },
                  { id: 'contact', icon: Mail }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                      activeTab === tab.id 
                        ? 'bg-black text-white border-black shadow-neo-sm scale-105 z-10' 
                        : 'bg-zinc-50 text-zinc-400 border-transparent hover:bg-zinc-100'
                    }`}
                  >
                    <tab.icon size={18} />
                  </button>
                ))}
              </div>

              <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                {activeTab === 'profile' && (
                  <div className="space-y-6 pt-2">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 bg-accent border-4 border-black rounded-[2rem] shadow-neo-sm flex items-center justify-center text-4xl">🐼</div>
                      <div className="text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{t('your_name')}</div>
                        <div className="text-2xl font-black italic">{userName || 'Guest'}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{t('change_name')}</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newName} 
                          onChange={e => setNewName(e.target.value)}
                          placeholder={t('name_placeholder')}
                          className="flex-1 border-4 border-black p-3 rounded-2xl font-bold outline-none focus:bg-zinc-50 transition-all"
                        />
                        <NeoButton 
                          variant="black" 
                          className="px-4"
                          onClick={() => {
                            if (newName.trim()) {
                              onSetUserName(newName.trim());
                              setIsOpen(false);
                            }
                          }}
                        >
                          <Check size={20} />
                        </NeoButton>
                      </div>
                    </div>

                    <div className="pt-4 border-t-4 border-black border-dotted space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{t('settings_show')}</label>
                      <button 
                        onClick={() => { onToggleLayoutEdit(); setIsOpen(false); }}
                        className={`w-full flex items-center gap-4 p-4 border-4 border-black rounded-2xl shadow-neo-sm transition-all ${isEditingLayout ? 'bg-black text-white' : 'bg-white hover:translate-x-1 hover:-translate-y-1 active:translate-x-0 active:translate-y-0'}`}
                      >
                        <div className={`p-2 rounded-xl border-2 ${isEditingLayout ? 'bg-accent text-black border-black' : 'bg-zinc-100 border-black'}`}>
                          <LayoutGrid size={20} />
                        </div>
                        <span className="font-black italic text-sm">{t('edit_layout')}</span>
                        {isEditingLayout && <div className="ml-auto bg-accent text-black text-[8px] font-black px-2 py-0.5 rounded-full border border-black animate-pulse">EDITING</div>}
                      </button>
                    </div>

                    <div className="bg-zinc-50 border-4 border-black p-4 rounded-3xl shadow-neo-sm">
                      <p className="text-[10px] font-bold text-zinc-500 leading-relaxed italic">
                        🐼 「名字不只是個代號，它讓我可以更精準地建議你。改個帥一點的名字吧！」
                      </p>
                    </div>

                    <div className="pt-4 border-t-4 border-black border-dotted space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{t('google_account')}</label>
                       {googleUser ? (
                         <div className="flex items-center gap-4 p-4 border-4 border-black rounded-2xl bg-zinc-50">
                           <img src={googleUser.picture} className="w-12 h-12 rounded-full border-2 border-black" alt="" />
                           <div className="flex-1 min-w-0">
                             <div className="font-black text-sm truncate">{googleUser.name}</div>
                             <div className="text-[10px] font-bold text-zinc-400 truncate">{googleUser.email}</div>
                           </div>
                           <button onClick={logout} className="text-[10px] font-black uppercase text-rose-500 hover:underline">{t('logout_google')}</button>
                         </div>
                       ) : (
                         <button 
                           onClick={login}
                           className="w-full flex items-center justify-center gap-3 p-4 border-4 border-black rounded-2xl bg-white shadow-neo-sm hover:translate-x-1 hover:-translate-y-1 transition-all"
                         >
                           <Globe size={20} />
                           <span className="font-black italic text-sm">{t('login_google')}</span>
                         </button>
                       )}
                    </div>
                  </div>
                )}

                {activeTab === 'goals' && (
                  <div className="space-y-6 pt-2">
                    <div className="bg-accent/10 border-4 border-black p-4 rounded-2xl flex items-center justify-between shadow-neo-sm">
                      <div>
                        <h4 className="font-black italic text-sm">{t('smart_goal')}</h4>
                        <p className="text-[10px] font-bold text-zinc-400">{t('formula_tdee')}</p>
                      </div>
                      <button 
                        onClick={() => setShowCalculator(!showCalculator)}
                        className={`p-2 rounded-xl shadow-neo-xs active:scale-90 border-2 border-black ${showCalculator ? 'bg-accent text-black' : 'bg-white text-black'}`}
                      >
                        <Calculator size={20} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showCalculator && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 border-4 border-black rounded-[2rem] bg-zinc-50 space-y-4 my-2">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">{t('height')} (cm)</label>
                                <input type="number" value={calc.height} onChange={e => setCalc({...calc, height: e.target.value})} className="w-full border-2 border-black p-1.5 rounded-xl font-bold text-sm bg-white" />
                              </div>
                              <div>
                                <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">{t('weight')} (kg)</label>
                                <input type="number" value={calc.weight} onChange={e => setCalc({...calc, weight: e.target.value})} className="w-full border-2 border-black p-1.5 rounded-xl font-bold text-sm bg-white" />
                              </div>
                              <div>
                                <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">{t('age')}</label>
                                <input type="number" value={calc.age} onChange={e => setCalc({...calc, age: e.target.value})} className="w-full border-2 border-black p-1.5 rounded-xl font-bold text-sm bg-white" />
                              </div>
                              <div>
                                <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">{t('gender')}</label>
                                <div className="flex border-2 border-black rounded-xl overflow-hidden">
                                  <button onClick={() => setCalc({...calc, gender: 'male'})} className={`flex-1 py-1.5 text-[10px] font-black ${calc.gender === 'male' ? 'bg-black text-white' : 'bg-white text-black'}`}>{t('male')}</button>
                                  <button onClick={() => setCalc({...calc, gender: 'female'})} className={`flex-1 py-1.5 text-[10px] font-black ${calc.gender === 'female' ? 'bg-black text-white' : 'bg-white text-black'}`}>{t('female')}</button>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">{t('activity_level')}</label>
                              <select 
                                value={calc.activity} 
                                onChange={e => setCalc({...calc, activity: parseFloat(e.target.value)})}
                                className="w-full border-2 border-black p-2 rounded-xl font-bold text-sm bg-white"
                              >
                                <option value={1.2}>{t('activity_sedentary')}</option>
                                <option value={1.375}>{t('activity_light')}</option>
                                <option value={1.55}>{t('activity_moderate')}</option>
                                <option value={1.725}>{t('activity_active')}</option>
                                <option value={1.9}>{t('activity_athlete')}</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">{t('fitness_goal')}</label>
                              <select 
                                value={calc.goal} 
                                onChange={e => setCalc({...calc, goal: e.target.value})}
                                className="w-full border-2 border-black p-2 rounded-xl font-bold text-sm bg-white"
                              >
                                <option value="lose">{t('goal_lose')}</option>
                                <option value="recomp">{t('goal_recomp')}</option>
                                <option value="maintain">{t('goal_maintain')}</option>
                                <option value="gain">{t('goal_gain')}</option>
                              </select>
                            </div>

                            <button 
                              onClick={calculateSuggestion}
                              className="w-full bg-black text-white py-3 rounded-xl font-black italic tracking-tighter flex items-center justify-center gap-2 active:scale-95 shadow-neo-sm"
                            >
                              <Sparkles size={16} />
                              {t('apply_suggestion')}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="relative group">
                          <label className="text-[10px] font-black uppercase tracking-widest block mb-2 text-zinc-400">{t('calories')} (kcal)</label>
                          <div className="relative">
                            <input type="number" value={goals.calories} onChange={e => setGoals({...goals, calories: e.target.value})} className="w-full border-4 border-black p-4 rounded-[2rem] font-black text-2xl focus:outline-none focus:ring-4 ring-accent/20 transition-all bg-white" />
                            <Zap className="absolute right-5 top-1/2 -translate-y-1/2 text-accent" size={24} />
                          </div>
                        </div>
                        <div className="relative group">
                          <label className="text-[10px] font-black uppercase tracking-widest block mb-2 text-zinc-400">{t('protein')} (g)</label>
                          <div className="relative">
                            <input type="number" value={goals.protein} onChange={e => setGoals({...goals, protein: e.target.value})} className="w-full border-4 border-black p-4 rounded-[2rem] font-black text-2xl focus:outline-none focus:ring-4 ring-accent/20 transition-all bg-white" />
                            <Trophy className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400" size={24} />
                          </div>
                        </div>
                        <div className="relative group">
                          <label className="text-[10px] font-black uppercase tracking-widest block mb-2 text-zinc-400">{t('water_unit')} (ml)</label>
                          <div className="relative">
                            <input type="number" value={goals.water} onChange={e => setGoals({...goals, water: e.target.value})} className="w-full border-4 border-black p-4 rounded-[2rem] font-black text-2xl focus:outline-none focus:ring-4 ring-accent/20 transition-all bg-white" />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-400 font-black">H2O</div>
                          </div>
                        </div>
                      </div>

                      {isLocal && (
                        <div className="pt-4 border-t-4 border-zinc-100 border-dashed">
                          <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5 text-zinc-400">{t('settings_api_key')}</label>
                          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Gemini API Key" className="w-full border-4 border-black p-3 rounded-2xl font-mono text-xs focus:ring-4 ring-accent/20 transition-all" />
                        </div>
                      )}

                      <NeoButton variant="black" className="w-full h-16 text-xl rounded-2xl shadow-neo" onClick={saveGoals}>
                        {t('save')}
                      </NeoButton>
                    </div>
                  </div>
                )}

                {activeTab === 'pwa' && (
                  <div className="space-y-6 py-2">
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className="w-16 h-16 bg-accent border-4 border-black rounded-2xl flex items-center justify-center shadow-neo-sm">
                        <Download size={32} strokeWidth={3} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black italic tracking-tighter">{t('pwa_install_title')}</h3>
                        <p className="text-xs font-bold text-zinc-500 max-w-[200px] mx-auto mt-1">{t('pwa_install_desc')}</p>
                      </div>
                    </div>

                    {window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone ? (
                      <div className="bg-emerald-50 border-4 border-black p-4 rounded-2xl text-center">
                        <p className="font-black italic text-emerald-600">{t('pwa_already_installed')}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* If we have the one-click prompt, show the big button at the top */}
                        {pwaPrompt && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                          >
                            <NeoButton 
                              variant="black" 
                              className="w-full h-14 rounded-2xl text-lg shadow-neo"
                              onClick={handlePwaInstall}
                            >
                              {t('pwa_install_btn')}
                            </NeoButton>
                            <div className="text-center text-[10px] font-bold text-zinc-400 italic">
                              * {t('pwa_install_btn')} (Android / Chrome Only)
                            </div>
                            <div className="flex items-center gap-2 py-2">
                              <div className="flex-1 h-[2px] bg-zinc-100" />
                              <span className="text-[10px] font-black uppercase text-zinc-300">OR</span>
                              <div className="flex-1 h-[2px] bg-zinc-100" />
                            </div>
                          </motion.div>
                        )}

                        {/* Manual Guide is always visible so the UI isn't empty */}
                        <div className="bg-zinc-50 border-4 border-black p-5 rounded-[2rem] shadow-neo-sm">
                          <p className="text-xs font-black italic leading-relaxed">
                            {t('pwa_ios_hint').split('{icon}')[0]}
                            <span className="inline-flex items-center justify-center bg-white border border-black p-1 rounded-md mx-1 translate-y-0.5">
                              <Share size={12} />
                            </span>
                            {t('pwa_ios_hint').split('{icon}')[1]}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'appinfo' && (
                  <div className="space-y-6 py-2">
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => { onWatchTutorial(); setIsOpen(false); }}
                        className="flex items-center gap-4 p-4 bg-white border-4 border-black rounded-2xl shadow-neo-sm hover:translate-x-1 hover:-translate-y-1 transition-all active:translate-x-0 active:translate-y-0"
                      >
                        <div className="bg-accent p-2 rounded-xl border-2 border-black">
                          <RotateCcw size={20} />
                        </div>
                        <span className="font-black italic text-sm">{t('watch_tutorial')}</span>
                      </button>

                      <div className="p-4 bg-zinc-50 border-4 border-black rounded-2xl shadow-neo-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin size={18} className="text-zinc-400" />
                            <span className="font-black italic text-sm">{t('settings_location_permission')}</span>
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border-2 ${locationStatus === 'granted' ? 'bg-emerald-100 text-emerald-600 border-emerald-600' : 'bg-rose-100 text-rose-600 border-rose-600'}`}>
                            {locationStatus === 'granted' ? t('location_granted_status') : t('location_denied_status')}
                          </span>
                        </div>
                        {locationStatus !== 'granted' && (
                          <button 
                            onClick={requestLocation}
                            className="w-full bg-white border-2 border-black py-2 rounded-xl text-[10px] font-black uppercase hover:bg-zinc-100 transition-colors"
                          >
                            {t('location_request')}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <History size={16} className="text-zinc-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('settings_version_history')}</span>
                      </div>
                      <div className="space-y-3">
                        {VERSION_HISTORY.map((v, idx) => (
                          <div key={v.version} className={`p-3 border-2 border-black rounded-2xl shadow-neo-xs ${idx === 0 ? 'bg-accent/10 border-accent/30' : 'bg-white'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-black text-sm italic">v{v.version}</span>
                              <span className="text-[8px] font-bold text-zinc-400">{v.date}</span>
                            </div>
                            <ul className="space-y-1">
                              {v.features.map((f, i) => (
                                <li key={i} className="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5">
                                  <div className="w-1 h-1 bg-black rounded-full shrink-0" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-center pt-4 opacity-30 grayscale">
                       <p className="text-[10px] font-black italic uppercase tracking-widest">Daily Diet © 2026</p>
                    </div>
                  </div>
                )}

                {activeTab === 'language' && (
                  <div className="space-y-3 py-2">
                    {[{ id: 'zh', name: t('lang_zh'), desc: '中文 (台灣)' }, { id: 'en', name: t('lang_en'), desc: 'English (US)' }].map(lang => (
                      <button
                        key={lang.id}
                        onClick={() => handleLanguageChange(lang.id)}
                        className={`w-full p-4 rounded-2xl border-4 text-left transition-all ${getLanguage() === lang.id ? 'bg-black text-white border-black shadow-neo-sm' : 'bg-white text-zinc-400 border-zinc-100 hover:border-black hover:text-black'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-black text-lg italic tracking-tighter">{lang.name}</div>
                            <div className={`text-[10px] uppercase font-bold tracking-widest ${getLanguage() === lang.id ? 'text-zinc-400' : 'text-zinc-300'}`}>{lang.desc}</div>
                          </div>
                          {getLanguage() === lang.id && <div className="bg-accent text-black p-1.5 rounded-full border-2 border-black"><Check size={14} strokeWidth={4} /></div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'contact' && (
                  <div className="space-y-4 py-2">
                    <input 
                      type="text" 
                      value={contactForm.subject} 
                      onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} 
                      placeholder={t('contact_subject') || "Subject"} 
                      className="w-full border-4 border-black p-3 rounded-xl font-bold" 
                    />
                    <textarea 
                      rows={4} 
                      value={contactForm.message} 
                      onChange={e => setContactForm({ ...contactForm, message: e.target.value })} 
                      placeholder={t('contact_message') || "Your feedback..."} 
                      className="w-full border-4 border-black p-4 rounded-2xl font-bold" 
                    />
                    <button 
                      onClick={handleContactSubmit} 
                      className={`w-full border-4 border-black py-4 rounded-2xl font-black italic shadow-neo-sm ${submitStatus === 'sending' ? 'opacity-50' : ''} ${submitStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-black text-white'}`}
                      disabled={submitStatus === 'sending'}
                    >
                      {submitStatus === 'sending' ? <Loader2 className="animate-spin mx-auto" size={24} /> : (submitStatus === 'success' ? t('contact_success') : t('contact_send'))}
                    </button>
                  </div>
                )}

                {activeTab === 'data' && (
                   <div className="space-y-4 py-2">
                    <div className="bg-rose-50 border-4 border-rose-500/10 p-4 rounded-3xl shadow-neo-xs">
                      <p className="text-[11px] font-bold text-rose-500 leading-relaxed italic">
                        {t('data_backup_hint')}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                       <div className="flex items-center gap-2 px-1">
                         <Globe size={16} className="text-zinc-400" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('cloud_backup')}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <button 
                           onClick={handleCloudBackup}
                           disabled={syncStatus === 'syncing'}
                           className={`flex flex-col items-center justify-center gap-2 p-4 border-4 border-black rounded-2xl shadow-neo-sm transition-all bg-white hover:bg-zinc-50 ${syncStatus === 'syncing' ? 'opacity-50' : ''}`}
                         >
                           <Upload size={20} />
                           <span className="text-[10px] font-black uppercase">{syncStatus === 'syncing' ? t('syncing') : t('backup_to_drive')}</span>
                         </button>
                         <button 
                           onClick={handleCloudRestore}
                           disabled={syncStatus === 'syncing'}
                           className={`flex flex-col items-center justify-center gap-2 p-4 border-4 border-black rounded-2xl shadow-neo-sm transition-all bg-white hover:bg-zinc-50 ${syncStatus === 'syncing' ? 'opacity-50' : ''}`}
                         >
                           <History size={20} />
                           <span className="text-[10px] font-black uppercase">{syncStatus === 'syncing' ? t('syncing') : t('restore_from_drive')}</span>
                         </button>
                       </div>
                    </div>

                    <div className="flex items-center gap-2 px-1 pt-2">
                      <Database size={16} className="text-zinc-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('settings_data')}</span>
                    </div>
                    <button onClick={async () => {
                      const data = {
                        dietLogs: await db.dietLogs.toArray(),
                        weightLogs: await db.weightLogs.toArray(),
                        settings: await db.settings.toArray(),
                        favorites: await db.favorites.toArray()
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `daily-diet-backup.json`;
                      a.click();
                    }} className="w-full bg-white border-4 border-black py-4 rounded-2xl font-black italic shadow-neo-sm flex items-center justify-center gap-2">
                      <Download size={18} /> {t('export_data')}
                    </button>
                    <label className="w-full bg-rose-500 text-white border-4 border-black py-4 rounded-2xl font-black italic shadow-neo-sm flex items-center justify-center gap-2 cursor-pointer">
                      <Upload size={18} /> {t('import_data')}
                      <input type="file" accept=".json" className="hidden" onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file || !confirm(t('import_warning'))) return;
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const data = JSON.parse(ev.target.result);
                          await db.transaction('rw', db.dietLogs, db.weightLogs, db.settings, db.favorites, async () => {
                            await db.dietLogs.clear(); await db.weightLogs.clear(); await db.settings.clear(); await db.favorites.clear();
                            if (data.dietLogs) await db.dietLogs.bulkAdd(data.dietLogs.map(({id, ...r}) => r));
                            if (data.weightLogs) await db.weightLogs.bulkAdd(data.weightLogs.map(({id, ...r}) => r));
                            if (data.settings) await db.settings.bulkAdd(data.settings);
                            if (data.favorites) await db.favorites.bulkAdd(data.favorites.map(({id, ...r}) => r));
                          });
                          window.location.reload();
                        };
                        reader.readAsText(file);
                      }} />
                    </label>
                  </div>
                )}
              </div>
            </NeoCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalSettings;
