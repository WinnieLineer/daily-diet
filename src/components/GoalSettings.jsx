import React, { useState, useEffect } from 'react';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db } from '../db';
import { Settings, Sparkles, X, Target, Check, Database, Download, Upload, Mail, Globe, Calculator, User, Zap, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, getLanguage, setLanguage } from '../lib/translations';
import { APP_VERSION } from '../lib/constants';

const GoalSettings = ({ onGoalsUpdated, onWatchTutorial, onLanguageChanged }) => {
  const [goals, setGoals] = useState({ calories: 2000, protein: 100, water: 2500 });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [activeTab, setActiveTab] = useState('goals'); // 'goals', 'language', 'contact', 'data'
  const [apiKey, setApiKey] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);

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
  }, []);

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
    // Mifflin-St Jeor Formula
    const bmr = (10 * calc.weight) + (6.25 * calc.height) - (5 * calc.age) + (calc.gender === 'male' ? 5 : -161);
    const tdee = bmr * calc.activity;
    
    let suggestedCals = tdee;
    if (calc.goal === 'lose') suggestedCals -= 500;
    if (calc.goal === 'recomp') suggestedCals -= 200; // Small deficit for recomp
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
                  {activeTab === 'goals' && t('settings_goals')}
                  {activeTab === 'language' && t('settings_language')}
                  {activeTab === 'contact' && t('settings_contact')}
                  {activeTab === 'data' && t('settings_data')}
                </h3>
                <button onClick={() => setIsOpen(false)} className="bg-white border-2 border-black p-1 rounded-xl hover:bg-zinc-100">
                  <X size={18} />
                </button>
              </div>

              <div className="flex p-2 gap-1 bg-white border-b-2 border-zinc-100">
                {[
                  { id: 'goals', icon: Target },
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
                {activeTab === 'goals' && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('goal_guide')}</span>
                      <button 
                        onClick={() => setShowCalculator(!showCalculator)} 
                        className={`transition-all px-3 py-1.5 rounded-xl border-2 border-black flex items-center gap-1.5 text-[10px] font-black uppercase shadow-neo-sm active:scale-95 ${showCalculator ? 'bg-accent text-black' : 'bg-white text-black'}`}
                      >
                        <Calculator size={12} />
                        {t('smart_goal')}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showCalculator && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-zinc-50 p-4 rounded-[2rem] border-4 border-black mb-4 space-y-4 shadow-neo-sm">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">{t('height')} (cm)</label>
                                <input type="number" value={calc.height} onChange={e => setCalc({...calc, height: e.target.value})} className="w-full border-2 border-black p-2 rounded-xl font-bold text-sm" />
                              </div>
                              <div>
                                <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">{t('weight')} (kg)</label>
                                <input type="number" value={calc.weight} onChange={e => setCalc({...calc, weight: e.target.value})} className="w-full border-2 border-black p-2 rounded-xl font-bold text-sm" />
                              </div>
                              <div>
                                <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">{t('age')}</label>
                                <input type="number" value={calc.age} onChange={e => setCalc({...calc, age: e.target.value})} className="w-full border-2 border-black p-2 rounded-xl font-bold text-sm" />
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

                    <div className="space-y-4">
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
                  </>
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
                  <div className="space-y-4">
                    <textarea rows={4} value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} placeholder="Your feedback..." className="w-full border-4 border-black p-4 rounded-2xl font-bold" />
                    <button onClick={handleContactSubmit} className={`w-full border-4 border-black py-4 rounded-2xl font-black italic shadow-neo-sm ${submitStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-black text-white'}`}>
                      {submitStatus === 'success' ? t('contact_success') : t('contact_send')}
                    </button>
                  </div>
                )}

                {activeTab === 'data' && (
                   <div className="space-y-3">
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
