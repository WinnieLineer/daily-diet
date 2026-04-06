import React, { useState, useEffect } from 'react';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db } from '../db';
import { suggestGoals } from '../lib/gemini';
import { Settings, Sparkles, Loader2 } from 'lucide-react';

const GoalSettings = ({ onGoalsUpdated }) => {
  const [goals, setGoals] = useState({ calories: 2000, protein: 100 });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
            <h3 className="font-bold text-lg italic">🎯 目標設定</h3>
            <button onClick={handleAIRequest} disabled={loading} className="text-accent hover:rotate-12 transition-transform">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} fill="currentColor" />}
            </button>
          </div>

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
