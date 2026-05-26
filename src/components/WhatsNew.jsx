import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Sparkles, X, Move, Globe, ShieldCheck, Cloud, MessageSquare, Zap, Settings, Image as ImageIcon, History, RefreshCw, Activity, Wrench, Heart } from 'lucide-react';
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

export const isNewer = (newVer, oldVer) => {
  if (!oldVer) return true;
  if (newVer === oldVer) return false;
  const n = String(newVer).split('.').map(Number);
  const o = String(oldVer).split('.').map(Number);
  for (let i = 0; i < Math.max(n.length, o.length); i++) {
    const nVal = n[i] || 0;
    const oVal = o[i] || 0;
    if (nVal > oVal) return true;
    if (nVal < oVal) return false;
  }
  return false;
};

const WhatsNew = ({ version, onClose, lastSeenVersion }) => {
  const show220 = isNewer('2.2.0', lastSeenVersion);
  const show212 = isNewer('2.1.2', lastSeenVersion);
  const show211 = isNewer('2.1.1', lastSeenVersion);
  const show210 = isNewer('2.1.0', lastSeenVersion);
  const show208 = isNewer('2.0.9', lastSeenVersion);
  const show206 = isNewer('2.0.6', lastSeenVersion);
  const show201 = isNewer('2.0.1', lastSeenVersion);
  const show200 = isNewer('2.0.0', lastSeenVersion);

  // Only show "Patch" UI if no major new content (v2.2.0+) is being shown
  const isBugFixOnly = !show220 && !show212 && !show210 && lastSeenVersion && isNewer(lastSeenVersion, '2.0.7') && isNewer('2.1.0', lastSeenVersion);

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
              {show220 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v220_header') || 'v2.2.0 Update'}</div>
                  <FeatureItem 
                    icon={Target}
                    color="bg-rose-300"
                    title={t('whatsnew_v220_carbs_fat_title')}
                    description={t('whatsnew_v220_carbs_fat_desc')}
                  />
                  <FeatureItem 
                    icon={Zap}
                    color="bg-amber-300"
                    title={t('whatsnew_v220_nonstop_ai_title')}
                    description={t('whatsnew_v220_nonstop_ai_desc')}
                  />
                  <FeatureItem 
                    icon={Sparkles}
                    color="bg-indigo-300"
                    title={t('whatsnew_v220_no_image_title')}
                    description={t('whatsnew_v220_no_image_desc')}
                  />
                </div>
              )}

              {show212 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v212_header') || 'v2.1.2 Update'}</div>
                  <FeatureItem 
                    icon={Heart}
                    color="bg-rose-300"
                    title={t('whatsnew_v212_520_title')}
                    description={t('whatsnew_v212_520_desc')}
                  />
                </div>
              )}

              {show211 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v211_header') || 'v2.1.1 Optimization'}</div>
                  <FeatureItem 
                    icon={Wrench}
                    color="bg-emerald-300"
                    title={t('whatsnew_v211_backup_title')}
                    description={t('whatsnew_v211_backup_desc')}
                  />
                </div>
              )}

              {show210 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v210_header') || 'v2.1.0 Highlights'}</div>
                  <FeatureItem 
                    icon={Sparkles}
                    color="bg-emerald-300"
                    title={t('whatsnew_v210_ai_title')}
                    description={t('whatsnew_v210_ai_desc')}
                  />
                  <FeatureItem 
                    icon={Cloud}
                    color="bg-sky-300"
                    title={t('whatsnew_v210_gist_title')}
                    description={t('whatsnew_v210_gist_desc')}
                  />
                  <FeatureItem 
                    icon={ShieldCheck}
                    color="bg-rose-300"
                    title={t('whatsnew_v210_google_title')}
                    description={t('whatsnew_v210_google_desc')}
                  />
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
              
              {!show220 && !show212 && !show211 && !show210 && !show208 && !show206 && !show201 && !show200 && (
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
