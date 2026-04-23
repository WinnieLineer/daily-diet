import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db } from '../db';
import { Plus, Trash2, ChevronDown, ChevronUp, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../lib/translations';

const WeightTracker = ({ pointerEventsNone }) => {
  const [weight, setWeight] = useState('');
  const [history, setHistory] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const logs = await db.weightLogs.orderBy('timestamp').limit(30).toArray();
    setHistory(logs.map(log => ({
      ...log,
      dateFormatted: log.date.split('-').slice(1).join('/')
    })));
  };

  const addWeight = async (e) => {
    e.preventDefault();
    if (!weight) return;

    await db.weightLogs.add({
      weight: parseFloat(weight),
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    });

    setWeight('');
    fetchHistory();
  };

  const deleteWeight = async (id) => {
    if (!confirm(t('confirm_delete') || 'Delete this record?')) return;
    await db.weightLogs.delete(id);
    fetchHistory();
  };

  return (
    <NeoCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black italic">⚖️ {t('weight_tracker_title')}</h2>
      </div>

      <form onSubmit={addWeight} className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <input 
            type="number" 
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={t('weight_placeholder')}
            className="w-full border-4 border-black p-3.5 pr-12 rounded-2xl focus:outline-none focus:ring-4 ring-accent/30 text-lg font-black placeholder:text-gray-300 placeholder:italic"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-xs text-gray-400 pointer-events-none">
            KG
          </span>
        </div>
        <NeoButton type="submit" variant="accent" className="aspect-square flex items-center justify-center p-0 rounded-2xl shrink-0">
          <Plus size={24} strokeWidth={3} />
        </NeoButton>
      </form>

      <div className="h-48 w-full">
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="dateFormatted" 
                axisLine={{ stroke: '#000', strokeWidth: 2 }}
                tickLine={false}
                tick={{ fontSize: 12, fontWeight: 'bold' }}
              />
              <YAxis 
                hide 
                domain={['dataMin - 2', 'dataMax + 2']} 
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '1rem', 
                  border: '4px solid #000',
                  boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#000" 
                strokeWidth={4} 
                dot={{ r: 4, stroke: '#000', strokeWidth: 2, fill: '#FDE047' }}
                activeDot={{ r: 6, stroke: '#000', strokeWidth: 2, fill: '#000' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">
            {t('weight_no_data')}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="pt-4 border-t-2 border-dashed border-gray-100 flex flex-col gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full px-1 group"
          >
            <div className="flex items-center gap-2">
              <History size={14} className="text-gray-400" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">
                Recent History
              </h3>
            </div>
            {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1 pt-2">
                  {history.slice().sort((a, b) => b.timestamp - a.timestamp).map(log => (
                    <div key={log.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded-2xl border-2 border-transparent hover:border-black transition-all">
                      <div className="flex items-center gap-3">
                        <div className="bg-black text-white px-2 py-1 rounded-lg text-[10px] font-black italic">
                          {log.date}
                        </div>
                        <div className="font-black text-sm italic">
                          {log.weight} <span className="text-[10px] uppercase text-gray-400">kg</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteWeight(log.id)}
                        className="p-1.5 text-gray-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
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
