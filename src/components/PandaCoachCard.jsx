import React from 'react';
import NeoCard from './NeoCard';
import { motion } from 'framer-motion';

const PandaCoachCard = ({ advice }) => {
  return (
    <NeoCard className="bg-black text-white relative overflow-hidden">
      <div className="flex items-center gap-4">
        <div className="text-5xl">🐼</div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-1 text-accent">熊貓教練 Panda Coach</h3>
          <p className="text-sm italic opacity-90">
            {advice || "今天也要加油喔！趕快記錄一下你的飲食吧！"}
          </p>
        </div>
      </div>
      {/* Decorative element */}
      <div className="absolute -bottom-4 -right-2 text-6xl opacity-10 rotate-12">
        🐼
      </div>
    </NeoCard>
  );
};

export default PandaCoachCard;
