import React, { useState, useEffect } from 'react';
import PandaCoachCard from './components/PandaCoachCard';
import Dashboard from './components/Dashboard';
import FoodDetective from './components/FoodDetective';
import WeightTracker from './components/WeightTracker';
import NeoCard from './components/NeoCard';
import NeoButton from './components/NeoButton';
import { db, getDailySummary } from './db';
import { getPandaAdvice } from './lib/gemini';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [summary, setSummary] = useState({ calories: 0, protein: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [advice, setAdvice] = useState('');

  const refreshData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const dailySummary = await getDailySummary(today);
    setSummary(dailySummary);

    const logs = await db.dietLogs
      .where('date')
      .equals(today)
      .reverse()
      .sortBy('timestamp');
    setRecentLogs(logs);

    setAdvice(getPandaAdvice(dailySummary.calories, 2000, dailySummary.protein, 100));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const deleteLog = async (id) => {
    await db.dietLogs.delete(id);
    refreshData();
  };

  return (
    <div className="min-h-screen bg-muted p-4 pb-20 max-w-lg mx-auto space-y-6">
      <header className="flex justify-between items-center py-4">
        <h1 className="text-3xl font-black italic tracking-tighter">DAILY DIET</h1>
        <div className="bg-white border-4 border-black px-3 py-1 rounded-2xl font-bold shadow-neo-sm">
          {new Date().toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
        </div>
      </header>

      <PandaCoachCard advice={advice} />

      <Dashboard summary={summary} />

      <FoodDetective onLogAdded={refreshData} />

      <WeightTracker />

      <NeoCard>
        <h2 className="text-xl font-bold italic mb-4">📝 最近記錄</h2>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <motion.div
                  key={log.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-3 border-4 border-black rounded-2xl bg-white"
                >
                  <div className="flex-1">
                    <div className="font-bold">{log.dish_name}</div>
                    <div className="text-xs font-mono opacity-60">
                      {log.calories} kcal / {log.protein}g protein
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteLog(log.id)}
                    className="p-2 hover:bg-red-50 text-red-500 transition-colors rounded-xl"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 italic text-sm">
                目前還沒有今日紀錄
              </div>
            )}
          </AnimatePresence>
        </div>
      </NeoCard>

      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-50">
        <div className="bg-black/90 backdrop-blur-md border-4 border-black text-white p-4 rounded-3xl shadow-neo flex justify-center items-center">
          <p className="text-xs font-bold text-accent">© 2026 DailyDiet - 可愛萬歲 🐼</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
