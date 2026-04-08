import React, { useState, useEffect } from 'react';
import PandaCoachCard from './components/PandaCoachCard';
import Dashboard from './components/Dashboard';
import FoodDetective from './components/FoodDetective';
import WeightTracker from './components/WeightTracker';
import GoalSettings from './components/GoalSettings';
import NeoCard from './components/NeoCard';
import NeoButton from './components/NeoButton';
import { db, getDailySummary } from './db';
import { getPandaAdvice } from './lib/gemini';
import { Trash2, History, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getLocalDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const LogItem = ({ log, isRecent, editingId, editValues, setEditValues, cancelEditing, saveEdit, startEditing, deleteLog }) => {
  const isEditing = editingId === log.id;

  if (isEditing) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 border-4 border-black rounded-2xl bg-accent/10 space-y-3"
      >
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">編輯食物名稱</label>
          <input 
            type="text" 
            value={editValues.dish_name}
            onChange={(e) => setEditValues({ ...editValues, dish_name: e.target.value })}
            className="w-full border-4 border-black p-2 rounded-xl font-bold bg-white"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">熱量 (kcal)</label>
            <input 
              type="number" 
              value={editValues.calories}
              onChange={(e) => setEditValues({ ...editValues, calories: e.target.value })}
              className="w-full border-4 border-black p-2 rounded-xl font-mono font-bold bg-white"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">蛋白質 (g)</label>
            <input 
              type="number" 
              value={editValues.protein}
              onChange={(e) => setEditValues({ ...editValues, protein: e.target.value })}
              className="w-full border-4 border-black p-2 rounded-xl font-mono font-bold bg-white"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button 
            onClick={cancelEditing}
            className="flex-1 bg-white border-4 border-black font-black py-2 rounded-xl hover:bg-gray-100 flex items-center justify-center gap-1"
          >
            <X size={16} /> 取消
          </button>
          <button 
            onClick={() => saveEdit(log.id)}
            className="flex-1 bg-black text-white border-4 border-black font-black py-2 rounded-xl hover:bg-black/90 flex items-center justify-center gap-1"
          >
            <Check size={16} /> 儲存
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`flex items-center justify-between p-3.5 border-4 border-black rounded-2xl bg-white hover:bg-accent/5 transition-colors group ${!isRecent ? 'opacity-80 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' : ''}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {!isRecent && <span className="text-[9px] font-mono font-black bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300">{log.date}</span>}
          <div className="font-black text-sm">{log.dish_name}</div>
        </div>
        <div className="text-[11px] font-mono font-bold mt-1 inline-flex gap-2">
           <span className="bg-accent/20 px-1.5 rounded">🔥 {log.calories} kcal</span>
           <span className="bg-gray-100 px-1.5 rounded text-gray-500">🍗 {log.protein}g</span>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => startEditing(log)}
          className="p-2.5 hover:bg-accent hover:text-black transition-all rounded-xl border-2 border-transparent"
          title="編輯"
        >
          <Pencil size={15} />
        </button>
        <button 
          onClick={() => deleteLog(log.id)}
          className="p-2.5 hover:bg-black hover:text-white transition-all rounded-xl border-2 border-transparent"
          title="刪除"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </motion.div>
  );
};

function App() {
  const [summary, setSummary] = useState({ calories: 0, protein: 0 });
  const [goals, setGoals] = useState({ calories: 2000, protein: 100 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [historyGroups, setHistoryGroups] = useState([]); // Array of { date, logs, totalCalories, totalProtein }
  const [expandedGroups, setExpandedGroups] = useState({}); // Record of date -> boolean
  const [showHistory, setShowHistory] = useState(false);
  const [advice, setAdvice] = useState('');
  
  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ dish_name: '', calories: '', protein: '' });

  const refreshData = async () => {
    const today = getLocalDateString();
    const dailySummary = await getDailySummary(today);
    setSummary(dailySummary);

    // Fetch goals
    const calGoal = await db.settings.get('calorie_goal');
    const proGoal = await db.settings.get('protein_goal');
    const currentGoals = {
      calories: calGoal ? calGoal.value : 2000,
      protein: proGoal ? proGoal.value : 100
    };
    setGoals(currentGoals);

    // Fetch all logs and categorize
    const allLogs = await db.dietLogs
      .reverse()
      .sortBy('timestamp');
    
    // Categorize logs
    setRecentLogs(allLogs.filter(log => log.date === today));
    
    const historyEntries = allLogs.filter(log => log.date !== today);
    const groups = historyEntries.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) {
        acc[date] = { date, logs: [], totalCalories: 0, totalProtein: 0 };
      }
      acc[date].logs.push(log);
      acc[date].totalCalories += log.calories || 0;
      acc[date].totalProtein += log.protein || 0;
      return acc;
    }, {});

    // Convert to sorted array
    const sortedGroups = Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    setHistoryGroups(sortedGroups);

    setAdvice(getPandaAdvice(dailySummary.calories, currentGoals.calories, dailySummary.protein, currentGoals.protein));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const deleteLog = async (id) => {
    if (confirm('確定要刪除這筆紀錄嗎？')) {
      await db.dietLogs.delete(id);
      refreshData();
    }
  };

  const startEditing = (log) => {
    setEditingId(log.id);
    setEditValues({
      dish_name: log.dish_name,
      calories: log.calories,
      protein: log.protein
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = async (id) => {
    await db.dietLogs.update(id, {
      dish_name: editValues.dish_name,
      calories: Number(editValues.calories) || 0,
      protein: Number(editValues.protein) || 0
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


  return (
    <div className="min-h-screen bg-[#F3F4F6] p-4 pb-24 max-w-lg mx-auto space-y-6">
      <header className="flex justify-between items-center py-4">
        <h1 className="text-3xl font-black italic tracking-tighter">DAILY DIET</h1>
        <div className="flex gap-2">
          <div className="bg-white border-4 border-black px-3 py-1.5 rounded-2xl font-black shadow-neo-sm flex items-center text-sm">
            {new Date().toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
          </div>
          <GoalSettings onGoalsUpdated={refreshData} />
        </div>
      </header>

      <PandaCoachCard advice={advice} />

      <Dashboard summary={summary} goals={goals} />

      <FoodDetective onLogAdded={refreshData} />

      {/* Today's Logs */}
      <NeoCard className="bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black italic">📝 今日紀錄</h2>
          </div>
          <span className="bg-black text-white px-2.5 py-1 rounded-xl text-[10px] font-bold">
            {recentLogs.length} 項
          </span>
        </div>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
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
                />
              ))
            ) : (
              <div className="text-center py-10 border-4 border-dashed border-gray-200 rounded-2xl">
                <p className="text-gray-400 italic text-sm font-bold">今天還沒有紀錄喔 🐼</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </NeoCard>

      <WeightTracker />

      {/* History Logs */}
      {historyGroups.length > 0 && (
        <NeoCard className="bg-gray-50/50 border-gray-300">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-gray-500 hover:text-black transition-colors"
          >
            <div className="flex items-center gap-2">
              <History size={18} />
              <h2 className="text-lg font-black italic">📚 歷史紀錄</h2>
            </div>
            {showHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          <AnimatePresence>
            {showHistory && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 pt-4">
                  {historyGroups.map((group) => {
                    const isExpanded = !!expandedGroups[group.date];
                    const calorieAchievement = Math.min((group.totalCalories / goals.calories) * 100, 100);
                    const proteinAchievement = Math.min((group.totalProtein / goals.protein) * 100, 100);
                    const isCalorieReached = group.totalCalories >= goals.calories;
                    const isProteinReached = group.totalProtein >= goals.protein;

                    return (
                      <div key={group.date} className="border-b-2 border-gray-100 pb-3 last:border-0">
                        <button 
                          onClick={() => toggleGroup(group.date)}
                          className="w-full flex items-center justify-between group/header mb-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black bg-gray-100 px-2 py-0.5 rounded-lg border-2 border-black/5">{group.date}</span>
                            <div className="flex flex-col gap-1 translate-y-0.5">
                              {/* Calorie Stats */}
                              <div className="flex items-center gap-2">
                                <div className="text-[9px] font-black italic flex items-center gap-1 uppercase tracking-wider text-gray-500 min-w-[100px]">
                                  <span>🔥 {group.totalCalories}/{goals.calories}</span>
                                </div>
                                <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${isCalorieReached ? 'bg-amber-500' : 'bg-zinc-400'}`}
                                    style={{ width: `${calorieAchievement}%` }}
                                  />
                                </div>
                                {isCalorieReached && <span className="text-[8px] bg-amber-500 text-white px-1 rounded font-black uppercase tracking-tighter">Done</span>}
                              </div>
                              {/* Protein Stats */}
                              <div className="flex items-center gap-2">
                                <div className="text-[9px] font-black italic flex items-center gap-1 uppercase tracking-wider text-gray-500 min-w-[100px]">
                                  <span>🍗 {group.totalProtein}/{goals.protein}</span>
                                </div>
                                <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${isProteinReached ? 'bg-blue-500' : 'bg-zinc-400'}`}
                                    style={{ width: `${proteinAchievement}%` }}
                                  />
                                </div>
                                {isProteinReached && <span className="text-[8px] bg-blue-500 text-white px-1 rounded font-black uppercase tracking-tighter">Peak</span>}
                              </div>
                            </div>
                          </div>
                          <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 group-hover/header:bg-gray-200'}`}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
      )}


      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-50">
        <div className="bg-black/95 backdrop-blur-md border-4 border-black text-white p-4 rounded-3xl shadow-neo flex justify-center items-center">
          <p className="text-[10px] font-bold text-accent tracking-widest uppercase">© 2026 DailyDiet - 飲控萬歲 🐼</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
