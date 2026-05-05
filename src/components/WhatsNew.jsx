import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Move, Globe, ShieldCheck, Cloud, MessageSquare, Zap, Settings, Image as ImageIcon, History } from 'lucide-react';
import NeoButton from './NeoButton';
import { t } from '../lib/translations';

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
                  title={t('whatsnew_v200_ai_speed_title')}
                  description={t('whatsnew_v200_ai_speed_desc')}
                />
              </motion.div>

              <FeatureItem 
                icon={ShieldCheck}
                color="bg-blue-300"
                title={t('whatsnew_v200_ai_fallback_title')}
                description={t('whatsnew_v200_ai_fallback_desc')}
              />

              {/* V1.9.0 Features */}
              <FeatureItem 
                icon={Cloud}
                color="bg-rose-300"
                title={t('whatsnew_v200_cloud_sync_title')}
                description={t('whatsnew_v200_cloud_sync_desc')}
              />

              <FeatureItem 
                icon={ImageIcon}
                color="bg-purple-300"
                title={t('whatsnew_v200_history_img_title')}
                description={t('whatsnew_v200_history_img_desc')}
              />

              <FeatureItem 
                icon={MessageSquare}
                color="bg-green-200"
                title={t('whatsnew_v200_ai_memory_title')}
                description={t('whatsnew_v200_ai_memory_desc')}
              />

              <FeatureItem 
                icon={History}
                color="bg-zinc-200"
                title={t('whatsnew_v200_ux_title')}
                description={t('whatsnew_v200_ux_desc')}
              />
            </div>

            <NeoButton 
              variant="black" 
              className="w-full py-4 text-xl rounded-2xl"
              onClick={onClose}
            >
              OK 🐼
            </NeoButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WhatsNew;
