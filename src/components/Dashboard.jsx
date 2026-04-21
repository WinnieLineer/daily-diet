import React from 'react';
import NeoCard from './NeoCard';
import { motion } from 'framer-motion';
import { t } from '../lib/translations';

const ProgressRing = ({ value, max, label, defaultColor = "bg-accent" }) => {
  const percentage = Math.round((value / max) * 100);
  const displayPercentage = Math.min(percentage, 100);
  
  // Dynamic color based on completion (Neo-brutalism style)
  let ringColor = "#000000"; // Default to black for "Solid/Finished" feel
  
  if (label.includes('🔥')) { // Calories
    if (percentage > 110) ringColor = "#f43f5e"; // Rose 500 (Warning)
    else if (percentage >= 100) ringColor = "#000000"; // Solid Black (Goal Reached)
    else ringColor = "#FDE047"; // Brand Yellow (In Progress)
  } else if (label.includes('🍖')) { // Protein
    if (percentage >= 100) ringColor = "#000000";
    else ringColor = "rgba(0,0,0,0.1)"; // Light gray for not started/low
    if (percentage > 0 && percentage < 100) ringColor = "#FDE047"; 
  } else if (label.includes('🚰')) { // Water
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
  const CALORIE_GOAL = goals.calories || 2000;
  const PROTEIN_GOAL = goals.protein || 100;
  const WATER_GOAL   = goals.water   || 2500;

  return (
    <NeoCard className="bg-white">
      <h2 className="text-xl font-black italic mb-6">📅 {t('dashboard_title')}</h2>
      <div className="grid grid-cols-3 items-center w-full">
        <ProgressRing 
          value={summary.calories} 
          max={CALORIE_GOAL} 
          label={`🔥${t('dashboard_calories')}`} 
        />
        <ProgressRing 
          value={summary.protein} 
          max={PROTEIN_GOAL} 
          label={`🍖${t('dashboard_protein')}`} 
        />
        <ProgressRing 
          value={summary.water} 
          max={WATER_GOAL} 
          label={`🚰${t('dashboard_water')}`} 
        />
      </div>
    </NeoCard>
  );
};

export default Dashboard;
