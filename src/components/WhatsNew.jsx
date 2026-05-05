import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Move, Calculator, LineChart as ChartIcon, Tag, MapPin, User, Settings, Zap, Database, Download } from 'lucide-react';
import NeoButton from './NeoButton';

const FeatureItem = ({ icon: Icon, title, description, color }) => (
  <div className="flex gap-4 p-4 bg-white border-4 border-black rounded-2xl shadow-neo-sm">
    <div className={`shrink-0 w-12 h-12 ${color} border-4 border-black rounded-xl flex items-center justify-center shadow-neo-sm`}>
      <Icon size={24} className="text-black" strokeWidth={3} />
    </div>
    <div className="space-y-1">
      <h3 className="font-black text-lg italic tracking-tight">{title}</h3>
      <p className="text-sm text-zinc-500 font-bold leading-relaxed">{description}</p>
    </div>
  </div>
);

const WhatsNew = ({ version, onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20, rotate: -1 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-accent border-4 border-black w-full max-w-md rounded-[2.5rem] shadow-neo relative flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-3xl pointer-events-none" />
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-black hover:text-white rounded-xl transition-colors border-2 border-transparent z-[310]"
        >
          <X size={24} strokeWidth={3} />
        </button>

        <div className="overflow-y-auto p-6 sm:p-8 flex-1 custom-scrollbar">
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="inline-block bg-black text-white px-3 py-1 rounded-lg text-xs font-black tracking-widest uppercase italic">
                Update v{version}
              </div>
              <h1 className="text-4xl font-black italic tracking-tighter leading-none uppercase">
                What's <br /> <span className="text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">New?</span>
              </h1>
            </div>

            <div className="space-y-4">
              <FeatureItem 
                icon={Sparkles}
                color="bg-amber-300"
                title="16/8 斷食模式支援與提示 🕒"
                description="現在可以設定專屬進食時段，非進食時段紀錄飲食會跳出貼心警示！"
              />
              <FeatureItem 
                icon={Database}
                color="bg-rose-300"
                title="排便追蹤與紀錄功能 💩"
                description="不僅紀錄飲食，現在連排便時間也能輕鬆紀錄在儀表板囉。"
              />
              <FeatureItem 
                icon={Settings}
                color="bg-emerald-300"
                title="UI 元件與細節體驗優化"
                description="修復手機版輸入框過大與版面跑位問題，帶來更完美的視覺體驗。"
              />
            </div>

            <NeoButton 
              variant="black" 
              className="w-full py-4 text-xl rounded-2xl"
              onClick={onClose}
            >
              立即體驗 🐼
            </NeoButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WhatsNew;
