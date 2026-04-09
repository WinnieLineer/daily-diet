import React from 'react';
import NeoCard from './NeoCard';
import { motion } from 'framer-motion';

const ProgressRing = ({ value, max, label, color = "bg-accent" }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="flex flex-col items-center">
      <div className="w-24 h-24 relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-8 border-muted"></div>
        <svg className="w-full h-full -rotate-90">
          <circle 
            cx="48" cy="48" r="40" 
            fill="none" 
            stroke={color} 
            strokeWidth="8" 
            strokeDasharray="251.2"
            strokeDashoffset={251.2 - (251.2 * percentage) / 100}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-xl font-bold">{Math.round(percentage)}%</span>
        </div>
      </div>
      <span className="mt-2 font-bold text-sm">{label}</span>
      <span className="text-xs opacity-60 font-mono">{value} / {max}</span>
    </div>
  );
};

const Dashboard = ({ summary, goals }) => {
  const CALORIE_GOAL = goals.calories || 2000;
  const PROTEIN_GOAL = goals.protein || 100;
  const WATER_GOAL   = goals.water   || 2500;

  return (
    <NeoCard className="bg-white">
      <h2 className="text-xl font-bold italic mb-6">📅 今日摘要</h2>
      <div className="flex flex-wrap justify-around items-center gap-6">
        <ProgressRing 
          value={summary.calories} 
          max={CALORIE_GOAL} 
          label="卡路里" 
          color="black"
        />
        <ProgressRing 
          value={summary.protein} 
          max={PROTEIN_GOAL} 
          label="蛋白質" 
          color="#3b82f6"
        />
        <ProgressRing 
          value={summary.water} 
          max={WATER_GOAL} 
          label="飲水量" 
          color="#06b6d4"
        />
      </div>
    </NeoCard>
  );
};

export default Dashboard;
