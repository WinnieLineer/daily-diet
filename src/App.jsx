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
import { Trash2, History, ChevronDown, ChevronUp, Pencil, Check, X, Clock, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t, getLanguage } from './lib/translations';

const getLocalDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const LogItem = ({ log, isRecent, editingId, editValues, setEditValues, cancelEditing, saveEdit, startEditing, deleteLog }) => {
  const isEditing = editingId === log.id;
  const [showActions, setShowActions] = React.useState(false);

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
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => setShowActions(!showActions)}
      className={`relative overflow-hidden flex flex-col p-3.5 border-4 border-black rounded-2xl bg-white hover:bg-zinc-50 transition-colors group cursor-pointer ${!isRecent ? 'opacity-80 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 w-full">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 flex-1 min-w-0">
          <div className="font-black text-sm leading-tight break-words min-w-fit">{log.dish_name}</div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold font-mono text-zinc-400 flex items-center gap-0.5 bg-zinc-50 px-1.5 py-0.5 rounded-lg border border-black/5">
              <Clock size={10} />
              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            {log.location && (
              <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-0.5 truncate max-w-[120px] bg-zinc-50 px-1.5 py-0.5 rounded-lg border border-black/5">
                <MapPin size={10} />
                {log.location}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-x-1.5 text-[10px] font-bold font-mono shrink-0">
           {log.calories > 0 && (
             <span className="text-black bg-accent px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap">🔥{log.calories}</span>
           )}
           {log.protein > 0 && (
             <span className="text-white bg-black px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap">🍖{log.protein}g</span>
           )}
           {log.water > 0 && (
             <span className="text-black border-2 border-black px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap">🚰{log.water}ml</span>
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
              title="編輯"
            >
              <Pencil size={18} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }}
              className="p-2 hover:bg-black hover:text-white transition-all rounded-xl border-2 border-transparent"
              title="刪除"
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowActions(false); }}
              className="p-2 hover:bg-black/10 transition-all rounded-xl border-2 border-transparent"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const APP_VERSION = '1.0.2';

function App() {
  const [summary, setSummary] = useState({ calories: 0, protein: 0, water: 0 });
  const [goals, setGoals] = useState({ calories: 2000, protein: 100, water: 2500 });
  
  // Force reload on version change to clear cache
  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Fetch version.json with a unique timestamp to bypass all caches
        const response = await fetch(`/daily-diet/version.json?t=${Date.now()}`, {
          cache: 'no-store'
        });
        const data = await response.json();
        const remoteVersion = data.version;

        if (remoteVersion && remoteVersion !== APP_VERSION) {
          console.log(`New version detected: ${remoteVersion}. Clearing cache and reloading...`);
          
          // 1. Clear Service Worker caches if possible
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // 2. Unregister Service Workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(r => r.unregister()));
          }

          // 3. Force hard reload
          window.location.reload();
        }
      } catch (err) {
        console.error("Version check failed:", err);
      }
    };

    checkVersion();
    
    // Also perform the legacy localStorage check for double-safety
    const savedVersion = localStorage.getItem('app_version');
    if (savedVersion !== APP_VERSION) {
      localStorage.setItem('app_version', APP_VERSION);
    }
  }, []);
  const [recentLogs, setRecentLogs] = useState([]);
  const [historyGroups, setHistoryGroups] = useState([]); // Array of { date, logs, totalCalories, totalProtein }
  const [expandedGroups, setExpandedGroups] = useState({}); // Record of date -> boolean
  const [showHistory, setShowHistory] = useState(false);
  const [showToday, setShowToday] = useState(true);
  const [advice, setAdvice] = useState('');
  const [now, setNow] = useState(new Date());
  const [lastLocation, setLastLocation] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ dish_name: '', calories: '', protein: '', water: '' });

  const refreshData = async () => {
    const today = getLocalDateString();
    const dailySummary = await getDailySummary(today);
    setSummary(dailySummary);

    // Fetch goals
    const calGoal = await db.settings.get('calorie_goal');
    const proGoal = await db.settings.get('protein_goal');
    const watGoal = await db.settings.get('water_goal');
    const currentGoals = {
      calories: calGoal ? calGoal.value : 2000,
      protein: proGoal ? proGoal.value : 100,
      water: watGoal ? watGoal.value : 2500
    };
    setGoals(currentGoals);

    // Fetch all logs and categorize
    const allLogs = await db.dietLogs
      .reverse()
      .sortBy('timestamp');
    
    // Categorize logs
    setRecentLogs(allLogs.filter(log => log.date === today));
    
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
      acc[date].totalCalories += log.calories || 0;
      acc[date].totalProtein += log.protein || 0;
      acc[date].totalWater += log.water || 0;
      return acc;
    }, {});

    // Convert to sorted array
    const sortedGroups = Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    setHistoryGroups(sortedGroups);

    setAdvice(getPandaAdvice(
      dailySummary.calories, 
      currentGoals.calories, 
      dailySummary.protein, 
      currentGoals.protein,
      dailySummary.water,
      currentGoals.water,
      getLanguage()
    ));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const deleteLog = async (id) => {
    if (confirm(t('confirm_delete'))) {
      await db.dietLogs.delete(id);
      refreshData();
    }
  };

  const startEditing = (log) => {
    setEditingId(log.id);
    setEditValues({
      dish_name: log.dish_name,
      calories: log.calories,
      protein: log.protein,
      water: log.water || 0
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
      water: Number(editValues.water) || 0
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
    <div className="min-h-screen p-4 pb-28 max-w-lg mx-auto space-y-6">
      <header className="flex justify-between items-center py-4">
        <h1 className="text-xl font-black italic tracking-tighter">{t('app_title')}</h1>
        <div className="flex gap-2">
          <div className="bg-white border-4 border-black px-3 py-1.5 rounded-2xl font-black shadow-neo-sm flex flex-col items-end justify-center">
            <div className="text-[11px] sm:text-xs">
              {now.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '/')} {now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
            {lastLocation && (
              <div className="text-[8px] sm:text-[9px] text-gray-400 italic truncate max-w-[120px]">
                📍 {lastLocation}
              </div>
            )}
          </div>
          <GoalSettings onGoalsUpdated={refreshData} />
        </div>
      </header>

      <PandaCoachCard advice={advice} />

      <Dashboard summary={summary} goals={goals} />

      <FoodDetective onLogAdded={refreshData} />

      {/* Today's Logs */}
      <NeoCard className="bg-white">
        <button 
          onClick={() => setShowToday(!showToday)}
          className="w-full flex items-center justify-between mb-0"
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
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-4">
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
                    <p className="text-gray-400 italic text-sm font-bold">{t('no_logs_today')}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              <h2 className="text-lg font-black italic">📚 {t('history_record')}</h2>
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
                              {/* Metrics Row */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[9px] font-black italic uppercase tracking-wider text-gray-400">
                                <span className="whitespace-nowrap">🔥 {group.totalCalories}/{goals.calories}</span>
                                <span className="whitespace-nowrap">🍖 {group.totalProtein}/{goals.protein}</span>
                                <span className="whitespace-nowrap">🚰 {group.totalWater || 0}/{goals.water}</span>
                              </div>
                              {/* Progress Bars */}
                              <div className="flex gap-1.5 w-full max-w-[180px] mt-2">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden border border-black/5">
                                  <div className={`h-full transition-all ${isCalorieReached ? 'bg-accent' : 'bg-black/20'}`} style={{ width: `${calorieAchievement}%` }} />
                                </div>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden border border-black/5">
                                  <div className={`h-full transition-all ${isProteinReached ? 'bg-black' : 'bg-black/20'}`} style={{ width: `${proteinAchievement}%` }} />
                                </div>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden border border-black/5">
                                  <div className={`h-full transition-all ${group.totalWater >= goals.water ? 'bg-[#3b82f6]' : 'bg-black/20'}`} style={{ width: `${Math.min(((group.totalWater || 0) / goals.water) * 100, 100)}%` }} />
                                </div>
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
