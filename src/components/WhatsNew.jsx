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
                  title="Google AI 極速整合 ⚡"
                  description="登入後即享個人配額，體驗 10 秒內極速辨識，且分析更精準穩定。強烈建議登入使用！"
                />
              </motion.div>

              <FeatureItem 
                icon={ShieldCheck}
                color="bg-blue-300"
                title="雙模 AI 智慧備援 🛡️"
                description="未登入將維持舊版模式，載入需等待約 30 秒。想快人一步？現在就登入 Google 吧！"
              />

              {/* V1.9.0 Features */}
              <FeatureItem 
                icon={Cloud}
                color="bg-rose-300"
                title="雲端備份與同步 ☁️"
                description="登入 Google 即可啟用跨裝置同步。優化後不傳圖片，體積縮小 90%，同步快如閃電！"
              />

              <FeatureItem 
                icon={ImageIcon}
                color="bg-purple-300"
                title="歷史紀錄圖片檢視 📸"
                description="點擊紀錄旁的 (i) 圖示，即可查看當時拍攝的美食影像、AI 評語與精準數值。"
              />

              <FeatureItem 
                icon={MessageSquare}
                color="bg-green-200"
                title="AI 補充指令記憶 ✨"
                description="App 現在會記住您的個人化補充指令，讓 AI 分析更懂您的飲食偏好。"
              />

              <FeatureItem 
                icon={History}
                color="bg-zinc-200"
                title="性能與 UX 全面優化 🔧"
                description="優化手機版輸入框顯示與整體流暢度，修正 PWA 在部分裝置上的顯示異常。"
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
