import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Move, Globe, ShieldCheck, Cloud, MessageSquare, Zap, Settings, Image as ImageIcon, History } from 'lucide-react';
import NeoButton from './NeoButton';

const FeatureItem = ({ icon: Icon, title, description, color }) => (
  <div className="flex gap-4 p-4 bg-white border-4 border-black rounded-2xl shadow-neo-sm">
    <div className={`shrink-0 w-12 h-12 ${color} border-4 border-black rounded-xl flex items-center justify-center shadow-neo-sm`}>
      <Icon size={24} className="text-black" strokeWidth={3} />
    </div>
    <div className="space-y-1">
      <h3 className="font-black text-lg italic tracking-tight leading-tight">{title}</h3>
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
        className="bg-accent border-4 border-black w-full max-w-md rounded-[2.5rem] shadow-neo relative flex flex-col max-h-[95vh] overflow-hidden"
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
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-block bg-black text-white px-3 py-1 rounded-lg text-xs font-black tracking-widest uppercase italic">
                Update v{version}
              </div>
              <h1 className="text-4xl font-black italic tracking-tighter leading-none uppercase">
                What's <br /> <span className="text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">New?</span>
              </h1>
            </div>

            <div className="space-y-5">
              {/* V2.0.0 Highlights */}
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ 
                  scale: [0.95, 1, 0.95],
                  boxShadow: [
                    "0 0 0px rgba(253, 224, 71, 0)",
                    "0 0 20px rgba(253, 224, 71, 0.5)",
                    "0 0 0px rgba(253, 224, 71, 0)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative rounded-3xl border-4 border-amber-400 overflow-hidden"
              >
                <FeatureItem 
                  icon={Globe}
                  color="bg-amber-400"
                  title="Google AI 深度整合 ⚡"
                  description="功能驗證中！登入後自動調用個人配額，體驗秒殺級、極度穩定的 AI 辨識體驗。"
                />
              </motion.div>

              <FeatureItem 
                icon={ShieldCheck}
                color="bg-blue-300"
                title="雙模 AI 智慧備援 🛡️"
                description="未登入將使用舊版 Gemma 4 31B 辨識，載入時間約需 30 秒。"
              />

              {/* V1.9.0 Features */}
              <FeatureItem 
                icon={Cloud}
                color="bg-rose-300"
                title="數據同步大瘦身 ☁️"
                description="優化雲端備份邏輯，自動移除冗餘圖片，同步體積縮小 90% 以上，快如閃電。"
              />

              <FeatureItem 
                icon={MessageSquare}
                color="bg-purple-300"
                title="AI 補充指令記憶 ✨"
                description="現在 App 會記住您的補充指令，讓個人化分析更聰明、更懂您的需求。"
              />

              <FeatureItem 
                icon={History}
                color="bg-zinc-200"
                title="性能與 UX 全面優化 🔧"
                description="修正 PWA 在手機上的顯示異常，優化輸入框高度與操作流暢度。"
              />
            </div>

            <NeoButton 
              variant="black" 
              className="w-full py-4 text-xl rounded-2xl"
              onClick={onClose}
            >
              進入 v2.0.0 🐼
            </NeoButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WhatsNew;
