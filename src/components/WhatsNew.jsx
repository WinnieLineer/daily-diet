import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Move, Globe, ShieldCheck, Cloud, MessageSquare, Zap, Settings, Image as ImageIcon, History, RefreshCw, Activity, Wrench, Heart } from 'lucide-react';
import NeoButton from './NeoButton';
import { t } from '../lib/translations';

const FeatureItem = ({ icon: Icon, title, description, color }) => (
  <div className="flex gap-4 p-4 bg-white border-4 border-black rounded-2xl shadow-neo-sm mb-4">
    <div className={`shrink-0 w-12 h-12 ${color} border-4 border-black rounded-xl flex items-center justify-center shadow-neo-sm`}>
      <Icon size={24} className="text-black" strokeWidth={3} />
    </div>
    <div className="space-y-1">
      <h3 className="font-black text-lg italic tracking-tight leading-tight">{title}</h3>
      <div className="text-sm text-zinc-500 font-bold leading-relaxed">{description}</div>
    </div>
  </div>
);

const isNewer = (v1, v2) => {
  if (!v1 || !v2) return true;
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((p1[i] || 0) > (p2[i] || 0)) return true;
    if ((p1[i] || 0) < (p2[i] || 0)) return false;
  }
  return false;
};

const WhatsNew = ({ version, onClose, lastSeenVersion }) => {
  const show208 = isNewer('2.0.9', lastSeenVersion);
  const show206 = isNewer('2.0.6', lastSeenVersion);
  const show201 = isNewer('2.0.1', lastSeenVersion);
  const show200 = isNewer('2.0.0', lastSeenVersion);

  // 只有從 2.0.8 版本過來的用戶，才顯示專屬 Patch Notes UI（道歉與修復公告）
  const isBugFixOnly = lastSeenVersion === '2.0.8';

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
              <div className={`inline-block px-3 py-1 rounded-lg text-xs font-black tracking-widest uppercase italic border-2 border-black ${
                isBugFixOnly ? 'bg-zinc-800 text-white' : 'bg-black text-white'
              }`}>
                {isBugFixOnly ? '🛠 Patch v' + version : 'Update v' + version}
              </div>
              <h1 className="text-4xl font-black italic tracking-tighter leading-none uppercase">
                {isBugFixOnly ? (
                  <>{t('whatsnew_v208_header').split(' ')[0]} <br /><span className="text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Patch.</span></>
                ) : (
                  <>What's <br /> <span className="text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">New?</span></>
                )}
              </h1>
            </div>

            <div className="space-y-5">
              {show208 && (
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v208_header')}</div>
                  
                  {/* 道歉主卡 - 展開動畫 + 深色調 */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative bg-zinc-900 text-white border-4 border-black rounded-3xl overflow-hidden shadow-neo p-5"
                  >
                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full" />
                    <div className="flex items-start gap-4">
                      <div className="text-3xl mt-0.5">🙇</div>
                      <div>
                        <h3 className="font-black text-lg italic tracking-tight leading-tight mb-2">{t('whatsnew_v208_sorry_title')}</h3>
                        <p className="text-sm text-zinc-300 font-bold leading-relaxed">{t('whatsnew_v208_sorry_desc')}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* 修復清單 - 深灰調 */}
                  <div className="bg-zinc-100 border-4 border-black rounded-2xl overflow-hidden shadow-neo-sm">
                    <div className="px-4 pt-4 pb-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Fixes in this patch</div>
                      <div className="space-y-3">
                        {[
                          { title: t('whatsnew_v208_fix1_title'), desc: t('whatsnew_v208_fix1_desc') },
                          { title: t('whatsnew_v208_fix2_title'), desc: t('whatsnew_v208_fix2_desc') },
                        ].map((fix, idx) => (
                          <div key={idx} className="flex items-start gap-3 pb-3 border-b-2 border-zinc-200 last:border-0 last:pb-0">
                            <div className="mt-1 w-6 h-6 rounded-lg bg-zinc-800 border-2 border-black flex items-center justify-center shrink-0">
                              <Wrench size={12} className="text-white" strokeWidth={3} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-zinc-800 leading-snug mb-0.5">{fix.title}</p>
                              <p className="text-[11px] font-bold text-zinc-500 leading-snug">{fix.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 鼓勵回報 CTA */}
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onClose();
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'feedback' } }));
                      }, 300);
                    }}
                    className="cursor-pointer flex items-center gap-4 p-4 bg-white border-4 border-black rounded-2xl shadow-neo-sm hover:bg-zinc-50 transition-colors"
                  >
                    <div className="shrink-0 w-12 h-12 bg-rose-400 border-4 border-black rounded-xl flex items-center justify-center shadow-neo-sm">
                      <Heart size={22} className="text-black" strokeWidth={3} />
                    </div>
                    <div>
                      <h3 className="font-black text-base italic tracking-tight leading-tight">{t('whatsnew_v208_feedback_title')}</h3>
                      <p className="text-xs text-zinc-500 font-bold leading-relaxed mt-0.5">{t('whatsnew_v208_feedback_desc')}</p>
                    </div>
                  </motion.div>
                </div>
              )}

              {show206 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v206_header') || 'v2.0.6 Features'}</div>
                  <FeatureItem 
                    icon={Activity}
                    color="bg-amber-300"
                    title={t('whatsnew_v206_body_title') || "整合式身體紀錄"}
                    description={t('whatsnew_v206_body_desc') || "體重與排便紀錄現在合併在同一個卡片中，並支援完整的增刪改查與時間編輯功能！"}
                  />
                  <FeatureItem 
                    icon={RefreshCw}
                    color="bg-emerald-300"
                    title={t('whatsnew_v206_update_title') || "自動版本同步"}
                    description={t('whatsnew_v206_update_desc') || "現在 App 會在背景自動偵測最新版本，並在適當時機強制重整，不再有舊版快取導致的錯誤！"}
                  />
                </div>
              )}

              {show201 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v201_header') || 'v2.0.1 Bug Fixes'}</div>
                  <div className="relative rounded-3xl border-4 border-black overflow-hidden bg-white shadow-neo-sm mb-4">
                    <div className="flex gap-4 p-4">
                      <div className="shrink-0 w-12 h-12 bg-emerald-400 border-4 border-black rounded-xl flex items-center justify-center shadow-neo-sm">
                        <ShieldCheck size={24} className="text-black" strokeWidth={3} />
                      </div>
                      <div className="space-y-1 w-full">
                        <h3 className="font-black text-lg italic tracking-tight leading-tight">{t('v201_t')}</h3>
                        <div className="mt-4 space-y-3 p-4 bg-zinc-50/80 rounded-2xl border-2 border-zinc-100 italic">
                          {[t('v201_f1'), t('v201_f2'), t('v201_f3')].map((fix, idx) => (
                            <div key={idx} className="flex items-start gap-3 group">
                              <div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0 group-hover:scale-125 transition-transform" />
                              <p className="text-[13px] font-bold text-zinc-600 group-hover:text-black transition-colors leading-snug">
                                {fix}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <motion.div 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onClose();
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'feedback' } }));
                      }, 300);
                    }}
                    className="cursor-pointer"
                  >
                    <FeatureItem 
                      icon={MessageSquare}
                      color="bg-amber-300"
                      title={t('v201_feedback_title')}
                      description={t('v201_feedback_desc')}
                    />
                  </motion.div>
                </div>
              )}

              {show200 && (
                <div className="space-y-2 mt-6">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v200_header') || 'v2.0.0 Highlights'}</div>
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
                    className="relative rounded-3xl border-4 border-amber-400 overflow-hidden mb-4"
                  >
                    <div className="flex gap-4 p-4 bg-white">
                      <div className="shrink-0 w-12 h-12 bg-amber-400 border-4 border-black rounded-xl flex items-center justify-center shadow-neo-sm">
                        <Globe size={24} className="text-black" strokeWidth={3} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-black text-lg italic tracking-tight leading-tight">{t('whatsnew_v200_ai_speed_title')}</h3>
                        <div className="text-sm text-zinc-500 font-bold leading-relaxed">{t('whatsnew_v200_ai_speed_desc')}</div>
                      </div>
                    </div>
                  </motion.div>

                  <FeatureItem icon={ShieldCheck} color="bg-blue-300" title={t('whatsnew_v200_ai_fallback_title')} description={t('whatsnew_v200_ai_fallback_desc')} />
                  <FeatureItem icon={Cloud} color="bg-rose-300" title={t('whatsnew_v200_cloud_sync_title')} description={t('whatsnew_v200_cloud_sync_desc')} />
                  <FeatureItem icon={ImageIcon} color="bg-purple-300" title={t('whatsnew_v200_history_img_title')} description={t('whatsnew_v200_history_img_desc')} />
                  <FeatureItem icon={MessageSquare} color="bg-green-200" title={t('whatsnew_v200_ai_memory_title')} description={t('whatsnew_v200_ai_memory_desc')} />
                  <FeatureItem icon={History} color="bg-zinc-200" title={t('whatsnew_v200_ux_title')} description={t('whatsnew_v200_ux_desc')} />
                </div>
              )}
              
              {!show208 && !show206 && !show201 && !show200 && (
                <div className="text-center p-8 border-4 border-black rounded-3xl bg-white shadow-neo-sm font-black italic">
                  {t('whatsnew_up_to_date') || 'You are completely up to date! 🚀'}
                </div>
              )}
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
