import React from 'react';
import NeoCard from './NeoCard';
import { t } from '../lib/translations';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const ProgressRing = ({ value, max, label }) => {
  const percentage = Math.round((value / max) * 100);
  const displayPercentage = Math.min(percentage, 100);
  
  let ringColor = "#000000";
  
  if (label.includes('🔥')) {
    if (percentage > 110) ringColor = "#f43f5e";
    else if (percentage >= 100) ringColor = "#000000";
    else ringColor = "#FDE047";
  } else if (label.includes('🍖') || label.includes('🍞') || label.includes('🥑')) {
    if (percentage >= 100) ringColor = "#000000";
    else ringColor = "rgba(0,0,0,0.1)";
    if (percentage > 0 && percentage < 100) ringColor = "#FDE047"; 
  } else if (label.includes('🚰')) {
    if (percentage >= 100) ringColor = "#000000";
    else ringColor = "#FDE047";
  }

  const isGram = label.includes('🍖') || label.includes('🍞') || label.includes('🥑');
  const unit = label.includes('🔥') ? 'kcal' : isGram ? 'g' : 'ml';

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
      <span className="mt-2 font-black text-[10px] sm:text-xs uppercase tracking-tight text-zinc-500">{label}</span>
      <span className="text-[9px] sm:text-[10px] opacity-40 font-mono font-bold mt-0.5">
        {value}/{max}{unit}
      </span>
    </div>
  );
};

const Dashboard = ({ summary, goals }) => {
  const CALORIE_GOAL = goals.calories || 2000;
  const PROTEIN_GOAL = goals.protein || 100;
  const WATER_GOAL   = goals.water   || 2500;
  const CARBS_GOAL   = goals.carbs   || 200;
  const FAT_GOAL     = goals.fat     || 60;

  // Calculate Macronutrient Calories
  const carbKcal = (summary.carbs || 0) * 4;
  const proteinKcal = (summary.protein || 0) * 4;
  const fatKcal = (summary.fat || 0) * 9;
  const totalMacroKcal = carbKcal + proteinKcal + fatKcal;

  const data = [
    { name: t('dashboard_carbs') || 'Carbs', value: carbKcal, color: '#FDE047', rawGrams: summary.carbs || 0 },
    { name: t('dashboard_protein') || 'Protein', value: proteinKcal, color: '#000000', rawGrams: summary.protein || 0 },
    { name: t('dashboard_fat') || 'Fat', value: fatKcal, color: '#e11d48', rawGrams: summary.fat || 0 },
  ];

  const hasMacroData = totalMacroKcal > 0;
  const chartData = hasMacroData 
    ? data 
    : [
        { name: t('no_logs_today'), value: 1, color: '#e4e4e7', rawGrams: 0 }
      ];

  return (
    <NeoCard className="bg-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black italic">📅 {t('dashboard_title')}</h2>
      </div>

      {goals.show_carbs_fat ? (
        <div className="space-y-6">
          {/* Row 1: Calorie and Water (Symmetric 2-column layout) */}
          <div className="grid grid-cols-2 items-center w-full max-w-[80%] mx-auto">
            <ProgressRing value={summary.calories} max={CALORIE_GOAL} label={`🔥${t('dashboard_calories')}`} />
            <ProgressRing value={summary.water} max={WATER_GOAL} label={`🚰${t('dashboard_water')}`} />
          </div>
          {/* Row 2: Protein, Carbs, and Fat (Symmetric 3-column layout) */}
          <div className="grid grid-cols-3 items-center w-full pt-2 border-t-2 border-dashed border-black/5">
            <ProgressRing value={summary.protein} max={PROTEIN_GOAL} label={`🍖${t('dashboard_protein')}`} />
            <ProgressRing value={summary.carbs || 0} max={CARBS_GOAL} label={`🍞${t('dashboard_carbs')}`} />
            <ProgressRing value={summary.fat || 0} max={FAT_GOAL} label={`🥑${t('dashboard_fat')}`} />
          </div>
          
          {/* Row 3: Macronutrient Calorie Distribution Donut Chart */}
          <div className="pt-4 border-t-2 border-dashed border-black/5 flex items-center justify-between gap-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 relative flex items-center justify-center bg-zinc-50 border-2 border-black rounded-full shadow-neo-sm-flat">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={22}
                    outerRadius={38}
                    paddingAngle={hasMacroData ? 4 : 0}
                    dataKey="value"
                    stroke="#000000"
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <span className="text-[10px] font-black italic">{hasMacroData ? Math.round(totalMacroKcal) : 0}</span>
                <span className="text-[8px] font-bold opacity-45 uppercase">kcal</span>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                ⚖️ {t('composition') || 'Macro Ratio'} (kcal %)
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                {data.map(item => {
                  const pct = totalMacroKcal > 0 ? Math.round((item.value / totalMacroKcal) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded border border-black shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-black">{item.name}</span>
                        <span className="text-zinc-400 font-normal">({item.rawGrams}g)</span>
                      </div>
                      <span className="font-mono font-black">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 items-center w-full">
          <ProgressRing value={summary.calories} max={CALORIE_GOAL} label={`🔥${t('dashboard_calories')}`} />
          <ProgressRing value={summary.protein} max={PROTEIN_GOAL} label={`🍖${t('dashboard_protein')}`} />
          <ProgressRing value={summary.water} max={WATER_GOAL} label={`🚰${t('dashboard_water')}`} />
        </div>
      )}
    </NeoCard>
  );
};

export default Dashboard;
