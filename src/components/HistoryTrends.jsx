import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { t } from '../lib/translations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { db } from '../db';
import { Activity } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { getLocalDateString } from '../lib/constants';

const HistoryTrends = ({ goals, summary }) => {
  const [trendData, setTrendData] = useState([]);
  const [range, setRange] = useState(7);
  const CALORIE_GOAL = goals.calories || 2000;
  const PROTEIN_GOAL = goals.protein || 100;

  useEffect(() => {
    let isMounted = true;
    const fetchTrendData = async () => {
      const now = new Date();
      const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
      const dates = [];
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(base.getDate() - i);
        dates.push(getLocalDateString(d));
      }

      // ⚡ 單次批次查詢取代多達 30 次循序 IndexedDB query
      const allLogs = await db.dietLogs.where('date').anyOf(dates).toArray();
      const summaryByDate = {};
      for (const log of allLogs) {
        if (!summaryByDate[log.date]) {
          summaryByDate[log.date] = { calories: 0, protein: 0 };
        }
        summaryByDate[log.date].calories += Number(log.calories) || 0;
        summaryByDate[log.date].protein += Number(log.protein) || 0;
      }

      const data = dates.map(date => {
        const s = summaryByDate[date] || { calories: 0, protein: 0 };
        const cal = Math.round(s.calories);
        const pro = Math.round(s.protein * 10) / 10;
        return {
          name: date.substring(8),
          dateFull: date,
          calories: cal,
          protein: pro * 10,
          rawProtein: pro,
        };
      });

      const filteredData = data.filter(d => d.calories > 0 || d.rawProtein > 0);
      if (isMounted) setTrendData(filteredData);
    };
    
    fetchTrendData();
    return () => { isMounted = false; };
  }, [summary, goals, range]);

  if (trendData.length === 0) return null;

  return (
    <div className="mb-6 bg-white border-4 border-black rounded-[2rem] p-4 shadow-neo-sm overflow-hidden">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-black text-white p-1.5 rounded-lg">
              <Activity size={14} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-black italic">
              {t('calorie_trend')} & {t('dashboard_protein')}
            </span>
          </div>
          
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-xl border-2 border-black/5 shadow-inner">
            {[7, 14, 30].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={twMerge(
                  "px-2 py-0.5 text-[9px] font-black rounded-lg transition-all",
                  range === r ? "bg-black text-white shadow-neo-sm" : "text-gray-400 hover:text-black"
                )}
              >
                {r}D
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
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

      <div className="h-[180px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={trendData} margin={{ top: 25, right: 5, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 'bold' }}
              interval={range > 7 ? (range > 14 ? 4 : 1) : 0}
            />
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
              label={({ viewBox }) => (viewBox && typeof viewBox.width === 'number' && typeof viewBox.y === 'number') ? (
                <g>
                  <rect x={viewBox.width - 80} y={viewBox.y - 12} width="76" height="18" rx="6" fill="#000" />
                  <text x={viewBox.width - 42} y={viewBox.y} dy={1} fill="#fff" fontSize="9" fontWeight="900" textAnchor="middle">
                    🔥 {CALORIE_GOAL} kcal
                  </text>
                </g>
              ) : null} 
            />

            <ReferenceLine 
              y={PROTEIN_GOAL * 10} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} 
              label={({ viewBox }) => (viewBox && typeof viewBox.width === 'number' && typeof viewBox.y === 'number') ? (
                <g>
                  <rect x={viewBox.width - 65} y={viewBox.y - 12} width="60" height="18" rx="6" fill="#94a3b8" />
                  <text x={viewBox.width - 35} y={viewBox.y} dy={1} fill="#fff" fontSize="9" fontWeight="900" textAnchor="middle">
                    🍖 {PROTEIN_GOAL}g
                  </text>
                </g>
              ) : null} 
            />
            
            <Bar dataKey="calories" radius={[4, 4, 0, 0]} barSize={range > 14 ? 8 : (range > 7 ? 12 : 16)}>
              {trendData.map((entry, index) => (
                <Cell key={`cell-c-${index}`} fill="#FDE047" />
              ))}
            </Bar>
            <Bar dataKey="protein" radius={[4, 4, 0, 0]} barSize={range > 14 ? 3 : (range > 7 ? 4 : 6)}>
              {trendData.map((entry, index) => (
                <Cell key={`cell-p-${index}`} fill="#94a3b8" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[8px] text-gray-400 font-bold italic text-center mt-2">
        * {t('trend_hint')}
      </p>
    </div>
  );
};

export default HistoryTrends;
