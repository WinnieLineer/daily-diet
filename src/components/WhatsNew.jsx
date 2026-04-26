import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCcw, Sparkles, X, CheckCircle2, Move, Calculator, LineChart as ChartIcon, Tag, MapPin } from 'lucide-react';
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
        {/* Background Decorative Elements */}
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
                icon={Calculator}
                color="bg-purple-400"
                title="智能目標計算機"
                description="不再憑感覺！輸入身高、體重與活動量，自動為您計算科學化的熱量與蛋白質建議目標。"
              />
              <FeatureItem 
                icon={ChartIcon}
                color="bg-rose-400"
                title="數據趨勢 UX 優化"
                description="圖表標籤加上背景底色，辨識更清晰。並修正了圖例顏色與實際圖表的一致性。"
              />
              <FeatureItem 
                icon={Move}
                color="bg-emerald-400"
                title="布局持久化"
                description="現在 Panda 教練的位置會被永久記憶！無論如何重整頁面，他都會待在您安排的最佳角落。"
              />
              <FeatureItem 
                icon={MapPin}
                color="bg-blue-400"
                title="位置快取與優化"
                description="大幅減少權限詢問頻率！自動記住您的常用地點，讓記錄過程更加流暢。"
              />
              <FeatureItem 
                icon={Tag}
                color="bg-orange-400"
                title="飲食分類標籤"
                description="新增早午晚餐與點心分類。AI 會根據時間自動推薦類別，讓飲食日誌條理分明。"
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
