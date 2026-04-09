import React, { useState, useEffect } from 'react';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db } from '../db';
import { Settings, Sparkles, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GoalSettings = ({ onGoalsUpdated }) => {
  const [goals, setGoals] = useState({ calories: 2000, protein: 100, water: 2500 });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showTip, setShowTip] = useState(false);

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

  return (
    <div className="relative">
      <NeoButton 
        variant="white" 
        onClick={() => setIsOpen(!isOpen)}
        className="px-3"
      >
        <Settings size={20} />
      </NeoButton>

      {isOpen && (
        <NeoCard className="absolute top-14 right-0 z-[60] w-72 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2 border-b-2 border-zinc-100">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg italic tracking-tight">🎯 目標設定</h3>
              <button 
                onClick={() => setShowTip(!showTip)} 
                className={`transition-all p-1.5 rounded-lg ${showTip ? 'bg-amber-100 text-amber-500 scale-110' : 'text-zinc-400 hover:text-amber-500'}`}
              >
                <Sparkles size={18} fill={showTip ? "currentColor" : "none"} />
              </button>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-300 hover:text-zinc-500">
              <X size={20} />
            </button>
          </div>

          <AnimatePresence>
            {showTip && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
              >
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-2xl border-2 border-amber-200/50 text-[11px] leading-relaxed text-amber-900 font-bold space-y-3 shadow-inner">
                   <div className="flex items-center gap-2 text-amber-600 mb-1">
                     <Info size={14} strokeWidth={3} />
                     <span className="text-xs font-black uppercase tracking-widest">目標制定指南</span>
                   </div>
                   
                   <div className="space-y-2">
                     <div className="p-2 bg-white/60 rounded-lg">
                       <p className="text-zinc-500 text-[9px] uppercase mb-0.5">🔥 每日熱量 (TDEE)</p>
                       <p className="leading-normal">公式：體重(kg) × 25 ~ 30 kcal</p>
                       <p className="text-[9px] text-amber-700/70 italic mt-0.5">* 身高越高、年齡越輕可 +10%; 減脂需 -15%</p>
                     </div>

                     <div className="p-2 bg-white/60 rounded-lg">
                       <p className="text-zinc-500 text-[9px] uppercase mb-0.5">🍗 蛋白質需求</p>
                       <p className="leading-normal">基礎：體重(kg) × 1.2 g</p>
                       <p className="leading-normal">增肌/高運動：體重(kg) × 1.6~2.2 g</p>
                     </div>

                     <div className="p-2 bg-white/60 rounded-lg">
                       <p className="text-zinc-500 text-[9px] uppercase mb-0.5">💧 飲水建議</p>
                       <p className="leading-normal">公式：體重(kg) × 30~40 ml</p>
                       <p className="text-[9px] text-amber-700/70 italic mt-0.5">* 運動流汗或天氣熱需再加計 500ml</p>
                     </div>
                   </div>

                   <p className="text-[9px] text-zinc-400 font-medium pt-1 text-center border-t border-amber-200/30">
                     ※ 建議每兩週依體重變化微調目標
                   </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold block mb-1">每日熱量 (kcal)</label>
              <input 
                type="number"
                value={goals.calories}
                onChange={(e) => setGoals({ ...goals, calories: e.target.value })}
                className="w-full border-4 border-black p-2 rounded-xl font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">每日蛋白質 (g)</label>
              <input 
                type="number"
                value={goals.protein}
                onChange={(e) => setGoals({ ...goals, protein: e.target.value })}
                className="w-full border-4 border-black p-2 rounded-xl font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">每日飲水 (ml)</label>
              <input 
                type="number"
                value={goals.water}
                onChange={(e) => setGoals({ ...goals, water: e.target.value })}
                className="w-full border-4 border-black p-2 rounded-xl font-mono focus:outline-none"
              />
            </div>
          </div>

          <NeoButton 
            variant="black" 
            className="w-full"
            onClick={saveGoals}
          >
            儲存設定
          </NeoButton>
        </NeoCard>
      )}
    </div>
  );
};

export default GoalSettings;
