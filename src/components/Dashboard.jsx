import React from 'react';
import NeoCard from './NeoCard';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../lib/translations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { getDailySummary } from '../db';
import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Activity } from 'lucide-react';

const ProgressRing = ({ value, max, label, defaultColor = "bg-accent" }) => {
  const percentage = Math.round((value / max) * 100);
  const displayPercentage = Math.min(percentage, 100);
  
  let ringColor = "#000000";
  
  if (label.includes('🔥')) {
    if (percentage > 110) ringColor = "#f43f5e";
    else if (percentage >= 100) ringColor = "#000000";
    else ringColor = "#FDE047";
  } else if (label.includes('🍖')) {
    if (percentage >= 100) ringColor = "#000000";
    else ringColor = "rgba(0,0,0,0.1)";
    if (percentage > 0 && percentage < 100) ringColor = "#FDE047"; 
  } else if (label.includes('🚰')) {
    if (percentage >= 100) ringColor = "#000000";
    else ringColor = "#FDE047";
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 sm:border-8 border-gray-100"></div>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle 
            cx="50" cy="50" r="40"
            fill="none" 
            stroke={ringColor} 
            strokeWidth="8" 
            strokeDasharray="251.33"
            style={{ 
              strokeDashoffset: 251.33 - (251.33 * displayPercentage) / 100,
            }}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-sm sm:text-lg font-black ${percentage > 100 && label.includes('🔥') ? 'text-rose-500 animate-pulse' : ''}`}>{percentage}%</span>
        </div>
      </div>
      <span className="mt-2 font-black text-[10px] sm:text-xs uppercase tracking-tight text-gray-500">{label}</span>
      <span className="text-[9px] sm:text-[10px] opacity-40 font-mono font-bold mt-0.5">
        {value}/{max}{label.includes('🔥') ? 'kcal' : label.includes('🍖') ? 'g' : 'ml'}
      </span>
    </div>
  );
};

const Dashboard = ({ summary, goals }) => {
  const [showTrends, setShowTrends] = useState(false);
  const [trendData, setTrendData] = useState([]);

  const CALORIE_GOAL = goals.calories || 2000;
  const PROTEIN_GOAL = goals.protein || 100;
  const WATER_GOAL   = goals.water   || 2500;

  useEffect(() => {
    if (!showTrends) return;

    let isMounted = true;
    const fetchTrendData = async () => {
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }

      const data = await Promise.all(dates.map(async date => {
        const s = await getDailySummary(date);
        return {
          name: date.substring(8),
          dateFull: date,
          calories: s.calories || 0,
          protein: (s.protein || 0) * 10,
          rawProtein: s.protein || 0,
        };
      }));

      const filteredData = data.filter(d => d.calories > 0 || d.rawProtein > 0);
      if (isMounted) setTrendData(filteredData);
    };
    
    fetchTrendData();
    return () => { isMounted = false; };
  }, [showTrends, summary]);

  return (
    <NeoCard className="bg-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black italic">📅 {t('dashboard_title')}</h2>
        <button 
          onClick={() => setShowTrends(!showTrends)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black italic flex items-center gap-1.5 transition-all shadow-neo-sm border-2 border-black ${showTrends ? 'bg-accent text-black' : 'bg-black text-white active:scale-95'}`}
        >
          <Activity size={12} />
          {t('trends')}
          {showTrends ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      <div className="grid grid-cols-3 items-center w-full">
        <ProgressRing value={summary.calories} max={CALORIE_GOAL} label={`🔥${t('dashboard_calories')}`} />
        <ProgressRing value={summary.protein} max={PROTEIN_GOAL} label={`🍖${t('dashboard_protein')}`} />
        <ProgressRing value={summary.water} max={WATER_GOAL} label={`🚰${t('dashboard_water')}`} />
      </div>

      <AnimatePresence>
        {showTrends && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-8 pt-6 border-t-4 border-black border-solid"
          >
            <div className="space-y-6">
              <div className="h-[240px] w-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {t('calorie_trend')} & {t('dashboard_protein')}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-[#FDE047] rounded-full border border-black" />
                      <span className="text-[9px] font-bold">KCAL</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-[#94a3b8] rounded-full border border-black" />
                      <span className="text-[9px] font-bold">PRO</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 25, right: 5, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis hide domain={[0, (dataMax) => Math.max(CALORIE_GOAL * 1.2, PROTEIN_GOAL * 11, dataMax * 1.1)]} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border-4 border-black p-2 rounded-xl shadow-neo-sm z-[200]">
                              <p className="text-[10px] font-black italic mb-1">{payload[0].payload.dateFull}</p>
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-rose-500 flex items-center justify-between gap-4">
                                  <span>🔥 Calories</span>
                                  <span>{payload[0].value} kcal</span>
                                </p>
                                <p className="text-xs font-bold text-slate-600 flex items-center justify-between gap-4">
                                  <span>🍖 Protein</span>
                                  <span>{payload[0].payload.rawProtein} g</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    <ReferenceLine 
                      y={CALORIE_GOAL} stroke="#000" strokeDasharray="8 8" strokeWidth={2} 
                      label={({ viewBox }) => (
                        <g>
                          <rect x={viewBox.width - 65} y={viewBox.y - 12} width="60" height="18" rx="6" fill="#000" />
                          <text x={viewBox.width - 35} y={viewBox.y} dy={1} fill="#fff" fontSize="9" fontWeight="900" textAnchor="middle">
                            🔥 {CALORIE_GOAL}
                          </text>
                        </g>
                      )} 
                    />

                    <ReferenceLine 
                      y={PROTEIN_GOAL * 10} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} 
                      label={({ viewBox }) => (
                        <g>
                          <rect x={viewBox.width - 65} y={viewBox.y - 12} width="60" height="18" rx="6" fill="#94a3b8" />
                          <text x={viewBox.width - 35} y={viewBox.y} dy={1} fill="#fff" fontSize="9" fontWeight="900" textAnchor="middle">
                            🍖 {PROTEIN_GOAL}g
                          </text>
                        </g>
                      )} 
                    />
                    
                    <Bar dataKey="calories" radius={[4, 4, 0, 0]} barSize={20}>
                      {trendData.map((entry, index) => (
                        <Cell key={`cell-c-${index}`} fill={entry.calories >= CALORIE_GOAL ? '#000000' : '#FDE047'} />
                      ))}
                    </Bar>
                    <Bar dataKey="protein" radius={[4, 4, 0, 0]} barSize={8}>
                      {trendData.map((entry, index) => (
                        <Cell key={`cell-p-${index}`} fill={entry.rawProtein >= PROTEIN_GOAL ? '#000000' : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <p className="text-[9px] text-gray-400 font-bold italic text-center">
                * {t('trend_hint') || "顯示過去 7 天的攝取趨勢，虛線為每日熱量目標"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NeoCard>
  );
};

export default Dashboard;
