import React, { useState, useEffect } from 'react';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db } from '../db';
import { suggestGoals } from '../lib/gemini';
import { Settings, Sparkles, Loader2, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GoalSettings = ({ onGoalsUpdated }) => {
  const [goals, setGoals] = useState({ calories: 2000, protein: 100 });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    const cal = await db.settings.get('calorie_goal');
    const pro = await db.settings.get('protein_goal');
    if (cal && pro) {
      setGoals({ calories: cal.value, protein: pro.value });
    }
  };

  const handleAIRequest = async () => {
    setLoading(true);
    try {
      const latestWeight = await db.weightLogs.orderBy('timestamp').last();
      if (!latestWeight) {
        alert("請先記錄一次體重，熊貓才能給你建議喔！🐼");
        return;
      }
      const suggested = await suggestGoals(latestWeight.weight);
      setGoals(suggested);
    } catch (err) {
      alert("AI 建議失敗，請手動輸入設定。");
    } finally {
      setLoading(false);
    }
  };

  const saveGoals = async () => {
    await db.settings.put({ key: 'calorie_goal', value: Number(goals.calories) });
    await db.settings.put({ key: 'protein_goal', value: Number(goals.protein) });
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg italic">🎯 目標設定</h3>
              <button 
                onClick={() => setShowTip(!showTip)} 
                className="text-amber-500 hover:scale-110 transition-transform p-1"
                title="建議說明"
              >
                <Star size={18} fill={showTip ? "currentColor" : "none"} />
              </button>
            </div>
            <button onClick={handleAIRequest} disabled={loading} className="text-accent hover:rotate-12 transition-transform p-1">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={18} fill="currentColor" />}
            </button>
          </div>

          <AnimatePresence>
            {showTip && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-amber-50/80 p-3 rounded-xl border-2 border-amber-200 text-[10px] leading-relaxed text-amber-900 font-bold space-y-1 relative">
                   <button 
                    onClick={() => setShowTip(false)}
                    className="absolute top-2 right-2 text-amber-400 hover:text-amber-600"
                   >
                     <X size={12} />
                   </button>
                   <p className="flex items-center gap-1 text-sm mb-1">💡 熊貓精算公式</p>
                   <p>• <span className="text-zinc-500 uppercase tracking-tighter mr-1">熱量:</span> 體重(kg) × 25-30 kcal (基礎建議)</p>
                   <p>• <span className="text-zinc-500 uppercase tracking-tighter mr-1">蛋白質:</span> 體重(kg) × 1.2-2.0 g (視運動量提升)</p>
                   <p>• <span className="text-zinc-500 uppercase tracking-tighter mr-1">調節:</span> 隨年齡增加或減脂需求，熱量可酌減 10%。</p>
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
