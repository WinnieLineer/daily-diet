import React, { useState, useEffect } from 'react';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db } from '../db';
import { Settings, Sparkles, X, Info, Globe, Mail, Target, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, getLanguage, setLanguage } from '../lib/translations';

const GoalSettings = ({ onGoalsUpdated }) => {
  const [goals, setGoals] = useState({ calories: 2000, protein: 100, water: 2500 });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [activeTab, setActiveTab] = useState('goals'); // 'goals', 'language', 'contact'
  
  // Contact form state
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });

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
  };

  const saveGoals = async () => {
    await db.settings.put({ key: 'calorie_goal', value: Number(goals.calories) });
    await db.settings.put({ key: 'protein_goal', value: Number(goals.protein) });
    await db.settings.put({ key: 'water_goal', value: Number(goals.water) });
    setIsOpen(false);
    onGoalsUpdated();
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    onGoalsUpdated();
    // Force refresh might be needed for some components
  };

  const handleContactSubmit = () => {
    const mailto = `mailto:hi@winnie-lin.space?subject=${encodeURIComponent(contactForm.subject)}&body=${encodeURIComponent(contactForm.message)}`;
    window.location.href = mailto;
  };

  return (
    <div className="relative">
      <NeoButton 
        variant="white" 
        onClick={() => setIsOpen(!isOpen)}
        className="px-3"
      >
        <Settings size={20} />
      </NeoButton>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-md transition-opacity" onClick={() => setIsOpen(false)} />
            <NeoCard className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:absolute sm:top-14 sm:right-0 sm:left-auto sm:translate-x-0 sm:translate-y-0 z-[60] w-[calc(100%-2rem)] sm:w-80 space-y-4 animate-in fade-in zoom-in-95 duration-200 shadow-2xl overflow-hidden p-0">
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-zinc-50 border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg italic tracking-tight uppercase">
                    {activeTab === 'goals' && t('settings_goals')}
                    {activeTab === 'language' && t('settings_language')}
                    {activeTab === 'contact' && t('settings_contact')}
                  </h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="bg-white border-2 border-black p-1 rounded-xl hover:bg-zinc-100 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex p-2 gap-1 bg-white">
                {[
                  { id: 'goals', icon: Target },
                  { id: 'language', icon: Globe },
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

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'goals' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('goal_guide')}</span>
                      <button 
                        onClick={() => setShowTip(!showTip)} 
                        className={`transition-all p-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase ${showTip ? 'bg-amber-100 text-amber-500' : 'bg-zinc-100 text-zinc-500'}`}
                      >
                        <Sparkles size={14} fill={showTip ? "currentColor" : "none"} />
                        {showTip ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showTip && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-2xl border-2 border-amber-200/50 text-[11px] leading-relaxed text-amber-900 font-bold space-y-3 shadow-inner mb-4">
                            <div className="space-y-2">
                              <div className="p-2 bg-white/60 rounded-lg">
                                <p className="text-zinc-500 text-[9px] uppercase mb-0.5">{t('guide_tdee')}</p>
                                <p className="leading-normal">Formula: Weight(kg) × 25 ~ 30 kcal</p>
                              </div>

                              <div className="p-2 bg-white/60 rounded-lg">
                                <p className="text-zinc-500 text-[9px] uppercase mb-0.5">{t('guide_protein')}</p>
                                <p className="leading-normal">Base: Weight(kg) × 1.2 g</p>
                                <p className="leading-normal">Muscle: Weight(kg) × 1.6~2.2 g</p>
                              </div>

                              <div className="p-2 bg-white/60 rounded-lg">
                                <p className="text-zinc-500 text-[9px] uppercase mb-0.5">{t('guide_water')}</p>
                                <p className="leading-normal">Formula: Weight(kg) × 30~40 ml</p>
                              </div>
                            </div>

                            <p className="text-[9px] text-zinc-400 font-medium pt-1 text-center border-t border-amber-200/30">
                              {t('guide_footer')}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5 text-zinc-400">{t('calories')} (kcal)</label>
                        <input 
                          type="number"
                          value={goals.calories}
                          onChange={(e) => setGoals({ ...goals, calories: e.target.value })}
                          className="w-full border-4 border-black p-3 rounded-2xl font-mono focus:outline-none focus:ring-4 ring-accent/20 transition-all font-bold text-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5 text-zinc-400">{t('protein')} (g)</label>
                        <input 
                          type="number"
                          value={goals.protein}
                          onChange={(e) => setGoals({ ...goals, protein: e.target.value })}
                          className="w-full border-4 border-black p-3 rounded-2xl font-mono focus:outline-none focus:ring-4 ring-accent/20 transition-all font-bold text-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5 text-zinc-400">{t('water_unit')} (ml)</label>
                        <input 
                          type="number"
                          value={goals.water}
                          onChange={(e) => setGoals({ ...goals, water: e.target.value })}
                          className="w-full border-4 border-black p-3 rounded-2xl font-mono focus:outline-none focus:ring-4 ring-accent/20 transition-all font-bold text-lg"
                        />
                      </div>
                    </div>

                    <NeoButton 
                      variant="black" 
                      className="w-full h-14 text-lg mt-4"
                      onClick={saveGoals}
                    >
                      {t('save')}
                    </NeoButton>
                  </>
                )}

                {activeTab === 'language' && (
                  <div className="space-y-3 py-2">
                    {[
                      { id: 'zh', name: t('lang_zh'), desc: '中文 (台灣)' },
                      { id: 'en', name: t('lang_en'), desc: 'English (US)' }
                    ].map(lang => (
                      <button
                        key={lang.id}
                        onClick={() => handleLanguageChange(lang.id)}
                        className={`w-full group p-4 rounded-2xl border-4 text-left transition-all ${
                          getLanguage() === lang.id
                            ? 'bg-black text-white border-black shadow-neo-sm'
                            : 'bg-white text-zinc-400 border-zinc-100 hover:border-black hover:text-black'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-black text-lg italic tracking-tighter">{lang.name}</div>
                            <div className={`text-[10px] uppercase font-bold tracking-widest ${getLanguage() === lang.id ? 'text-zinc-400' : 'text-zinc-300'}`}>
                              {lang.desc}
                            </div>
                          </div>
                          {getLanguage() === lang.id && (
                            <div className="bg-accent text-black p-1.5 rounded-full border-2 border-black">
                              <Check size={14} strokeWidth={4} />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'contact' && (
                  <div className="space-y-4">
                    <div className="bg-zinc-50 p-4 rounded-2xl border-2 border-dashed border-zinc-200">
                      <p className="text-sm font-bold text-zinc-600 italic leading-relaxed">
                        🐼 {t('contact_hint')}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5 text-zinc-400">{t('contact_subject')}</label>
                        <input 
                          type="text"
                          value={contactForm.subject}
                          onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                          placeholder="Feedback or Bug Report"
                          className="w-full border-4 border-black p-3 rounded-2xl focus:outline-none focus:ring-4 ring-accent/20 transition-all font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5 text-zinc-400">{t('contact_message')}</label>
                        <textarea 
                          rows={4}
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          className="w-full border-4 border-black p-3 rounded-2xl focus:outline-none focus:ring-4 ring-accent/20 transition-all font-bold"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleContactSubmit}
                      disabled={!contactForm.subject || !contactForm.message}
                      className="w-full bg-black text-white border-4 border-black py-4 rounded-2xl font-black italic tracking-tight hover:bg-zinc-800 disabled:bg-zinc-200 disabled:border-zinc-300 disabled:text-zinc-400 transition-all active:scale-95 shadow-neo-sm"
                    >
                      <Mail size={18} className="inline mr-2" />
                      {t('contact_send')}
                    </button>
                  </div>
                )}
              </div>
            </NeoCard>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalSettings;
