import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db } from '../db';
import { Plus, Trash2, ChevronDown, ChevronUp, History, Pencil, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../lib/translations';

const WeightTracker = ({ pointerEventsNone }) => {
  const [activeTab, setActiveTab] = useState('weight'); // 'weight' or 'poop'
  const [weight, setWeight] = useState('');
  const [weightDate, setWeightDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [poopTime, setPoopTime] = useState(() => {
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000;
    return new Date(now - tzoffset).toISOString().slice(0, 16);
  });

  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastPoop, setLastPoop] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const wLogs = await db.weightLogs.orderBy('timestamp').toArray();
    const pLogs = await db.poopLogs.orderBy('timestamp').toArray();
    
    const combined = [
      ...wLogs.map(l => ({ ...l, type: 'weight', dateFormatted: l.date.split('-').slice(1).join('/') })),
      ...pLogs.map(l => ({ ...l, type: 'poop' }))
    ].sort((a, b) => b.timestamp - a.timestamp);
    
    setHistory(combined.slice(0, 50));
    
    // Create a Set of YYYY-MM-DD dates where poop logs exist
    const poopDates = new Set(
      pLogs.map(p => {
        const d = new Date(p.timestamp);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    );
    
    const cData = wLogs.slice(-30).map(l => ({ 
      ...l, 
      dateFormatted: l.date.split('-').slice(1).join('/'),
      hasPoop: poopDates.has(l.date)
    }));
    setChartData(cData);

    const lastP = pLogs.length > 0 ? pLogs[pLogs.length - 1].timestamp : null;
    setLastPoop(lastP);
  };

  const addWeight = async (e) => {
    e.preventDefault();
    if (!weight) return;

    const d = new Date(weightDate);
    d.setHours(12, 0, 0, 0);

    await db.weightLogs.add({
      weight: parseFloat(weight),
      date: weightDate,
      timestamp: d.getTime()
    });

    setWeight('');
    fetchHistory();
  };

  const addPoop = async (e) => {
    e.preventDefault();
    const d = new Date(poopTime);
    await db.poopLogs.add({ timestamp: d.getTime() });
    
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000;
    setPoopTime(new Date(now - tzoffset).toISOString().slice(0, 16));
    
    fetchHistory();
  };

  const deleteItem = async (id, type) => {
    if (!confirm(t('confirm_delete') || 'Delete this record?')) return;
    if (type === 'weight') {
      await db.weightLogs.delete(id);
    } else {
      await db.poopLogs.delete(id);
    }
    fetchHistory();
  };

  const editItem = async (log) => {
    if (log.type === 'weight') {
      const newWeight = prompt((t('edit') || 'Edit') + ' (KG):', log.weight);
      if (newWeight && !isNaN(newWeight)) {
        await db.weightLogs.update(log.id, { weight: parseFloat(newWeight) });
        fetchHistory();
      }
    } else {
      const currentIso = new Date(log.timestamp - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const newTimeStr = prompt((t('edit') || 'Edit') + ' (YYYY-MM-DDTHH:mm):', currentIso);
      if (newTimeStr) {
        const d = new Date(newTimeStr);
        if (!isNaN(d.getTime())) {
          await db.poopLogs.update(log.id, { timestamp: d.getTime() });
          fetchHistory();
        }
      }
    }
  };

  return (
    <NeoCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black italic">⚖️/💩 {t('weight_tracker_title')}</h2>
      </div>

      <div className="flex gap-2 mb-2 bg-gray-100 p-1 rounded-2xl border-2 border-black overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('weight')} 
          className={`flex-1 px-3 py-1.5 text-xs font-black rounded-xl transition-all border-2 border-transparent ${activeTab === 'weight' ? "bg-black text-white border-black" : "hover:bg-white text-gray-600"}`}
        >
          ⚖️ {t('weight_tracker_title')?.replace('Tracker', '') || 'Weight'}
        </button>
        <button 
          onClick={() => setActiveTab('poop')} 
          className={`flex-1 px-3 py-1.5 text-xs font-black rounded-xl transition-all border-2 border-transparent ${activeTab === 'poop' ? "bg-amber-700 text-white border-amber-900" : "hover:bg-white text-gray-600"}`}
        >
          💩 {t('poop_record') || 'Poop'}
        </button>
      </div>

      {activeTab === 'weight' ? (
        <form onSubmit={addWeight} className="flex gap-2 items-center">
          <input 
            type="date" 
            value={weightDate} 
            onChange={e => setWeightDate(e.target.value)} 
            className="border-4 border-black p-3 rounded-2xl font-black focus:outline-none focus:ring-4 ring-accent/30 w-32 shrink-0 text-xs sm:text-sm"
          />
          <div className="relative flex-1">
            <input 
              type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder={t('weight_placeholder')}
              className="w-full border-4 border-black p-3 pr-10 rounded-2xl font-black focus:outline-none focus:ring-4 ring-accent/30 text-xs sm:text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-[10px] sm:text-xs text-gray-400">KG</span>
          </div>
          <NeoButton type="submit" variant="accent" className="p-3 rounded-2xl aspect-square shrink-0"><Plus size={20}/></NeoButton>
        </form>
      ) : (
        <form onSubmit={addPoop} className="flex gap-2 items-center">
          <input 
            type="datetime-local" 
            value={poopTime} 
            onChange={e => setPoopTime(e.target.value)} 
            className="border-4 border-black p-3 rounded-2xl font-black focus:outline-none focus:ring-4 ring-amber-700/30 flex-1 text-xs sm:text-sm"
          />
          <NeoButton type="submit" className="bg-amber-700 text-white p-3 rounded-2xl shrink-0"><Plus size={20}/></NeoButton>
        </form>
      )}

      {activeTab === 'weight' && chartData.length > 0 && (
        <div className="h-40 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="dateFormatted" axisLine={{ stroke: '#000', strokeWidth: 2 }} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip contentStyle={{ borderRadius: '1rem', border: '4px solid #000', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }} />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#000" 
                strokeWidth={4} 
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy) return null;
                  if (payload.hasPoop) {
                    return (
                      <g key={props.key || `dot-${payload.id}`}>
                        <circle cx={cx} cy={cy} r={4} stroke="#000" strokeWidth={2} fill="#FDE047" />
                        <text x={cx} y={cy - 12} textAnchor="middle" fontSize="14" className="select-none">💩</text>
                      </g>
                    );
                  }
                  return <circle key={props.key || `dot-${payload.id}`} cx={cx} cy={cy} r={4} stroke="#000" strokeWidth={2} fill="#FDE047" />;
                }}
                activeDot={{ r: 6, stroke: '#000', strokeWidth: 2, fill: '#000' }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'poop' && lastPoop && (
         <div className="bg-amber-50 border-4 border-amber-900/10 p-3 rounded-2xl mt-4 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="bg-amber-100 p-2 rounded-xl"><Clock size={16} className="text-amber-800" /></div>
             <div>
               <div className="text-[9px] font-black uppercase text-amber-700 tracking-widest">{t('last_poop') || 'Last Poop'}</div>
               <div className="text-sm font-bold text-amber-900">{new Date(lastPoop).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
             </div>
           </div>
         </div>
      )}

      {history.length > 0 && (
        <div className="pt-4 border-t-4 border-dashed border-zinc-100 flex flex-col gap-2 mt-4">
          <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center justify-between w-full px-1 group">
            <div className="flex items-center gap-2">
              <History size={14} className="text-gray-400" />
              <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">
                {t('history_record')}
              </h3>
            </div>
            {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 pt-2 custom-scrollbar">
                  {history.map(log => (
                    <div key={`${log.type}-${log.id}`} className="flex justify-between items-center p-2.5 bg-zinc-50 rounded-xl border-2 border-transparent hover:border-black transition-all group">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black italic shadow-neo-sm ${log.type === 'weight' ? 'bg-black text-white' : 'bg-amber-700 text-white'}`}>
                          {log.type === 'weight' ? log.date : new Date(log.timestamp).toLocaleDateString([], {month: 'numeric', day: 'numeric'})}
                        </div>
                        <div className="font-black text-sm italic">
                          {log.type === 'weight' ? (
                            <>{log.weight} <span className="text-[9px] uppercase text-gray-400 not-italic">kg</span></>
                          ) : (
                            <>💩 <span className="text-xs not-italic">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => editItem(log)} className="p-1.5 text-gray-400 hover:text-black hover:bg-black/5 rounded-lg transition-all">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteItem(log.id, log.type)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </NeoCard>
  );
};

export default WeightTracker;
