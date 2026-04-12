import React from 'react';
import NeoCard from './NeoCard';
import { motion } from 'framer-motion';
import { t } from '../lib/translations';

const ProgressRing = ({ value, max, label, color = "bg-accent" }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 sm:border-8 border-gray-100"></div>
        <svg className="w-full h-full -rotate-90">
          <circle 
            cx="50%" cy="50%" r="35%"
            fill="none" 
            stroke={color} 
            strokeWidth="8" 
            strokeDasharray="251.2"
            style={{ 
              strokeDasharray: '251.2',
              strokeDashoffset: 251.2 - (251.2 * percentage) / 100,
              strokeWidth: '8px',
              r: '40%'
            }}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-sm sm:text-lg font-black">{Math.round(percentage)}%</span>
        </div>
      </div>
      <span className="mt-2 font-black text-[10px] sm:text-xs uppercase tracking-tight text-gray-500">{label}</span>
      <span className="text-[9px] sm:text-[10px] opacity-40 font-mono font-bold mt-0.5">{value}/{max}</span>
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
          color="#FDE047"
        />
        <ProgressRing 
          value={summary.protein} 
          max={PROTEIN_GOAL} 
          label={`🍖${t('dashboard_protein')}`} 
          color="black"
        />
        <ProgressRing 
          value={summary.water} 
          max={WATER_GOAL} 
          label={`🚰${t('dashboard_water')}`} 
          color="#FDE047"
        />
      </div>
    </NeoCard>
  );
};

export default Dashboard;
