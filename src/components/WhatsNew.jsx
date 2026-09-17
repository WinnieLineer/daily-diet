import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Sparkles, X, Move, Globe, ShieldCheck, Cloud, MessageSquare, Zap, Settings, Image as ImageIcon, History, RefreshCw, Activity, Wrench, Heart, Trophy, BarChart2, Mic, Scale, Moon, Film, Pencil } from 'lucide-react';
import NeoButton from './NeoButton';
import { t } from '../lib/translations';
import { APP_VERSION } from '../lib/constants';

const safeGetStorage = (key) => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch (e) {
    return null;
  }
};

const FeatureItem = ({ icon: Icon, title, description, color }) => (
  <div className="flex gap-4 p-4 bg-white border-4 border-black rounded-2xl shadow-neo-sm mb-4">
    <div className={`shrink-0 w-12 h-12 ${color} border-4 border-black rounded-xl flex items-center justify-center shadow-neo-sm`}>
      <Icon size={24} className="text-black" strokeWidth={3} />
    </div>
    <div className="space-y-1">
      <h3 className="font-black text-lg tracking-tight leading-none text-black flex items-center gap-2">
        {title}
      </h3>
      <p className="text-xs text-zinc-600 font-bold leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

export const isNewer = (newVer, oldVer) => {
  if (!oldVer) return true;
  const cleanNew = String(newVer || '').replace(/^[vV]/, '').trim();
  const cleanOld = String(oldVer || '').replace(/^[vV]/, '').trim();
  if (cleanNew === cleanOld) return false;
  const n = cleanNew.split('.').map(Number);
  const o = cleanOld.split('.').map(Number);
  for (let i = 0; i < Math.max(n.length, o.length); i++) {
    const nVal = isNaN(n[i]) ? 0 : n[i];
    const oVal = isNaN(o[i]) ? 0 : o[i];
    if (nVal > oVal) return true;
    if (nVal < oVal) return false;
  }
  return false;
};

export const LATEST_WHATSNEW_VERSION = '3.3.50';

export const hasWhatsNewContent = (lastSeenVersion) => {
  if (!lastSeenVersion) return false;
  return isNewer(LATEST_WHATSNEW_VERSION, lastSeenVersion);
};

const WhatsNew = ({ version = APP_VERSION, onClose, lastSeenVersion }) => {
  // Always display the primary current release features whenever this modal is opened
  const show3321 = true;
  const show330 = isNewer('3.3.0', lastSeenVersion);
  const show320 = isNewer('3.2.0', lastSeenVersion);
  const show310 = isNewer('3.1.0', lastSeenVersion);
  const show300 = isNewer('3.0.0', lastSeenVersion);
  const show250 = isNewer('2.5.0', lastSeenVersion);
  const show242 = isNewer('2.4.2', lastSeenVersion);
  const show235 = isNewer('2.3.5', lastSeenVersion);
  const show231 = isNewer('2.3.1', lastSeenVersion);
  const show230 = isNewer('2.3.0', lastSeenVersion);
  const show220 = isNewer('2.2.0', lastSeenVersion);
  const show212 = isNewer('2.1.2', lastSeenVersion);
  const show211 = isNewer('2.1.1', lastSeenVersion);
  const show210 = isNewer('2.1.0', lastSeenVersion);
  const show208 = isNewer('2.0.9', lastSeenVersion);
  const show206 = isNewer('2.0.6', lastSeenVersion);
  const show201 = isNewer('2.0.1', lastSeenVersion);
  const show200 = isNewer('2.0.0', lastSeenVersion);

  const hasAnyFeatures = show3321 || show330 || show320 || show310 || show300 || show250 || show242 || show235 || show231 || show230 || show220 || show212 || show211 || show210 || show208 || show206 || show201 || show200;

  // Only show "Patch" UI if no major new content is being shown
  const isBugFixOnly = !show3321 && !show330 && !show320 && !show310 && !show300 && !show250 && !show242 && !show235 && !show231 && !show230 && !show220 && !show212 && !show210 && lastSeenVersion && isNewer(lastSeenVersion, '2.0.7') && isNewer('2.1.0', lastSeenVersion);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20, rotate: -1 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-accent border-4 border-black w-full max-w-md rounded-[2.5rem] shadow-neo relative flex flex-col max-h-[95vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
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
              {/* 🟢 雲端服務修復公告卡片 (v3.3.50) */}
              <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-4 border-black rounded-3xl shadow-neo mb-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-10 h-10 bg-emerald-500 border-2 border-black rounded-2xl flex items-center justify-center shadow-neo-xs text-white shrink-0">
                    <ShieldCheck size={22} strokeWidth={3} />
                  </div>
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
                      🟢 服務修復公告 v{version}
                    </span>
                    <h4 className="font-black text-base tracking-tight text-zinc-950 leading-tight">
                      雲端雙向同步與 LINE Bot 服務已全面恢復正常
                    </h4>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-zinc-800 font-bold leading-relaxed border-t-2 border-dashed border-zinc-300 pt-3">
                  <p className="text-zinc-900 leading-relaxed">
                    親愛的 Daily-Diet 用戶您好：日前因後端 Google Apps Script 雲端通訊閘道存取權限與 OAuth 憑證過期，導致部分用戶發生 LINE 訊息無回應及 Web 雲端備份同步中斷。目前開發團隊已完成權限重新發布與全線修復，各項服務現已恢復正常運作！
                  </p>

                  <div className="bg-white/90 border-2 border-black rounded-2xl p-3 space-y-1.5 shadow-neo-xs">
                    <div className="text-[11px] font-black text-emerald-950 flex items-center gap-1.5">
                      <span className="text-sm">⏱️</span> 異常影響範圍與時間
                    </div>
                    <ul className="text-[11px] text-zinc-700 space-y-1 list-disc list-inside leading-relaxed">
                      <li><strong>影響時間</strong>：2026/09/15 至 2026/09/17</li>
                      <li><strong>LINE Bot</strong>：訊息回覆、拍照營養辨識、體重與排便打卡出現暫時性無法連線或逾時。</li>
                      <li><strong>Web 雲端備份</strong>：本地紀錄上傳至 Google 雲端與 Gist 備份暫時中止。</li>
                    </ul>
                  </div>

                  <div className="bg-white/90 border-2 border-black rounded-2xl p-3.5 space-y-2 shadow-neo-xs">
                    <div className="text-[11px] font-black text-indigo-950 flex items-center gap-1.5">
                      <span className="text-sm">🛡️</span> 本機資料 100% 完整無虞保證
                    </div>
                    <p className="text-[11px] text-zinc-700 leading-relaxed">
                      <strong>請安心使用！</strong>所有在異常期間於手機或電腦端輸入的飲食、體重、排便與水分紀錄，均安全完整地保存在您本機的離線儲存空間（IndexedDB）中，<strong>沒有任何記錄遺失</strong>。
                    </p>
                    <p className="text-[11px] text-zinc-700 leading-relaxed">
                      隨著雲端閘道恢復，系統已為您<strong>自動重新建立連線並完成雙向補同步</strong>，無須手動重新輸入！
                    </p>
                  </div>

                  <p className="text-[11px] text-emerald-950 bg-emerald-100/90 p-3 rounded-2xl border-2 border-emerald-300 leading-relaxed">
                    🐼 造成您的不便與等待致上最深的歉意！我們已加強連線監控與憑證預警機制，感謝大家一直以來的包容與支持～請繼續健康記錄每一餐！
                  </p>
                </div>
              </div>

              {/* 🚨 緊急修復公告卡片 (v3.3.42) */}
              <div className="p-5 bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 border-4 border-black rounded-3xl shadow-neo mb-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-10 h-10 bg-rose-500 border-2 border-black rounded-2xl flex items-center justify-center shadow-neo-xs text-white shrink-0">
                    <ShieldCheck size={22} strokeWidth={3} />
                  </div>
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
                      🚨 緊急修復公告 v{version}
                    </span>
                    <h4 className="font-black text-base tracking-tight text-zinc-950 leading-tight">
                      訪客裝置雲端紀錄異常串聯之說明與修復
                    </h4>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-zinc-800 font-bold leading-relaxed border-t-2 border-dashed border-zinc-300 pt-3">
                  <p className="text-zinc-900 leading-relaxed">
                    親愛的 Daily-Diet 用戶您好：針對今日（9/15）部分純網頁訪客反饋「我的紀錄跟別人串了」的異常狀況，開發團隊已完成全鏈路隔離修復：
                  </p>

                  <div className="bg-white/90 border-2 border-black rounded-2xl p-3 space-y-1.5 shadow-neo-xs">
                    <div className="text-[11px] font-black text-rose-950 flex items-center gap-1.5">
                      <span className="text-sm">🔍</span> 異常原因說明
                    </div>
                    <p className="text-[11px] text-zinc-700 leading-normal">
                      日前升級 Web ↔ LINE 雙向同步時，針對未登入 LINE 的網頁訪客身分判別存在漏洞，導致後端將不同訪客誤分配至同一個雲端備份 ID，致使餐點紀錄相互下載與覆蓋。
                    </p>
                  </div>

                  <div className="bg-white/90 border-2 border-black rounded-2xl p-3.5 space-y-2 shadow-neo-xs">
                    <div className="text-[11px] font-black text-emerald-950 flex items-center gap-1.5">
                      <span className="text-sm">🛠️</span> 已完成之防護與自癒修復
                    </div>
                    <ul className="text-[11px] text-zinc-700 space-y-1.5 list-disc list-inside leading-relaxed">
                      <li><strong>全設備獨立身分隔離</strong>：徹底棄用通用訪客標籤，每台未登入 LINE 的手機派發專屬唯一 Client ID，互不干擾。</li>
                      <li><strong>伺服器共用快取淨空</strong>：後端已全數清空歷史殘留共用快取，杜絕跨裝置混淆。</li>
                      <li><strong>受影響裝置「自動自癒修復」</strong>：曾發生紀錄混入的用戶，<strong>本次更新後只要重新開啟網頁，系統會自動解除誤綁，並自動清理混入的他人紀錄</strong>，完整保留您本人記錄的餐點！</li>
                      <li><strong>新增手動解除功能</strong>：在「⚙️ 設定 ➔ 資料管理」新增「解除雲端綁定」紅色按鈕，隨時可自主檢查與重置。</li>
                    </ul>
                  </div>

                  <p className="text-[11px] text-amber-950 bg-amber-100/90 p-3 rounded-2xl border-2 border-amber-300 leading-relaxed">
                    🎋 特別感謝第一時間透過意見反饋通報異常的熱心用戶！您的及時反饋幫助團隊以最快速度定位漏洞並完成修復。造成大家的困擾致上最深歉意，團隊已加強隔離防護，全力守護您的隱私與安全 🐼
                  </p>
                </div>
              </div>

              {show3321 && (
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">
                    {t('whatsnew_v3321_header')}
                  </div>
                  
                  {/* 📣 暖心回覆反饋用戶卡片 */}
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-4 border-black rounded-2xl shadow-neo mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-yellow-300 border-2 border-black rounded-lg flex items-center justify-center shadow-neo-sm">
                        <Sparkles size={18} className="text-black" strokeWidth={3} />
                      </div>
                      <h4 className="font-black text-base tracking-tight text-yellow-950">
                        {t('whatsnew_v3321_shoutout_title')}
                      </h4>
                    </div>
                    <p className="text-xs text-yellow-950/85 font-bold leading-relaxed">
                      {t('whatsnew_v3321_shoutout_desc')}
                    </p>
                  </div>

                  <FeatureItem 
                    icon={Pencil}
                    title={t('whatsnew_v3321_correct_title')}
                    description={t('whatsnew_v3321_correct_desc')}
                    color="bg-amber-300"
                  />
                  <FeatureItem
                    icon={Sparkles}
                    title="碳水與脂肪 Web ↔ LINE 雙向同步"
                    description="在 Web 開啟碳水追蹤後，LINE 也會同步顯示！今日總結改為雙行網格（熱量+水 / 蛋白質+碳水+脂肪），數字清晰不吃字。"
                    color="bg-orange-300"
                  />
                  <FeatureItem
                    icon={RefreshCw}
                    title="常用餐點卡片不再超過 50KB"
                    description="Carousel 改為每頁最多 5 筆常用，管理餐點改為每頁 8 筆分頁，徹底解決 LINE 傳送失敗問題！"
                    color="bg-emerald-300"
                  />
                  <FeatureItem 
                    icon={RefreshCw}
                    title={t('whatsnew_v3321_log_edit_title')}
                    description={t('whatsnew_v3321_log_edit_desc')}
                    color="bg-purple-300"
                  />
                  <FeatureItem 
                    icon={ShieldCheck}
                    title={t('whatsnew_v3321_trans_fix_title')}
                    description={t('whatsnew_v3321_trans_fix_desc')}
                    color="bg-sky-300"
                  />
                </div>
              )}

              {show330 && (
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v330_header')}</div>
                  
                  {/* 🌙 睡前放鬆與舒緩短影音分享卡片 (置頂暖心問候) */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-4 border-black rounded-2xl shadow-neo mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-200 border-2 border-black rounded-lg flex items-center justify-center shadow-neo-sm">
                        <Moon size={18} className="text-purple-900" strokeWidth={3} />
                      </div>
                      <h4 className="font-black text-base tracking-tight text-purple-950">
                        {t('whatsnew_v330_sleep_title')}
                      </h4>
                    </div>
                    <p className="text-xs text-purple-900/80 font-bold leading-relaxed mb-3">
                      {t('whatsnew_v330_sleep_desc')}
                    </p>
                    <a
                      href="https://www.instagram.com/reels/Dc3vGMrPcDx/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-yellow-300 hover:bg-yellow-400 active:translate-x-0.5 active:translate-y-0.5 text-black font-black text-xs border-2 border-black rounded-xl shadow-neo-sm transition-all"
                    >
                      <Film size={16} strokeWidth={3} />
                      <span>{t('whatsnew_v330_sleep_btn')}</span>
                    </a>
                  </div>

                  <FeatureItem 
                    icon={Scale}
                    title={t('whatsnew_v330_weight_title')}
                    description={t('whatsnew_v330_weight_desc')}
                    color="bg-sky-300"
                  />
                  <FeatureItem 
                    icon={Activity}
                    title={t('whatsnew_v330_poop_title')}
                    description={t('whatsnew_v330_poop_desc')}
                    color="bg-amber-300"
                  />
                  <FeatureItem 
                    icon={BarChart2}
                    title={t('whatsnew_v330_line_chart_title')}
                    description={t('whatsnew_v330_line_chart_desc')}
                    color="bg-purple-300"
                  />
                  <FeatureItem 
                    icon={Cloud}
                    title={t('whatsnew_v330_sync_title')}
                    description={t('whatsnew_v330_sync_desc')}
                    color="bg-emerald-300"
                  />
                </div>
              )}
              {show320 && (
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v320_header')}</div>
                  
                  <FeatureItem 
                    icon={Mic}
                    title={t('whatsnew_v320_line_voice_title')}
                    description={t('whatsnew_v320_line_voice_desc')}
                    color="bg-cyan-300"
                  />
                  <FeatureItem 
                    icon={Zap}
                    title={t('whatsnew_v320_ai_routing_title')}
                    description={t('whatsnew_v320_ai_routing_desc')}
                    color="bg-amber-300"
                  />
                </div>
              )}
              {show310 && (
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v310_header')}</div>
                  
                  <FeatureItem 
                    icon={Wrench}
                    title={t('whatsnew_v310_fix_title')}
                    description={t('whatsnew_v310_fix_desc')}
                    color="bg-emerald-300"
                  />
                  <FeatureItem 
                    icon={Cloud}
                    title={t('whatsnew_v310_sync_title')}
                    description={t('whatsnew_v310_sync_desc')}
                    color="bg-amber-300"
                  />
                  <FeatureItem 
                    icon={Zap}
                    title={t('whatsnew_v310_gemini_title')}
                    description={t('whatsnew_v310_gemini_desc')}
                    color="bg-rose-300"
                  />
                  <FeatureItem 
                    icon={ShieldCheck}
                    title={t('whatsnew_v310_pwa_title')}
                    description={t('whatsnew_v310_pwa_desc')}
                    color="bg-cyan-300"
                  />
                </div>
              )}
              {show300 && (
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v300_header')}</div>
                  
                  {/* Sincere Apology & Gratitude Card */}
                  <div className="p-4 bg-amber-50 border-4 border-black rounded-2xl shadow-neo-sm space-y-2">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 bg-amber-300 border-2 border-black rounded-xl flex items-center justify-center shadow-neo-sm shrink-0">
                        <Sparkles size={20} className="text-black" strokeWidth={3} />
                      </div>
                      <h3 className="font-black text-sm italic leading-tight text-amber-950">{t('whatsnew_v300_apology_title')}</h3>
                    </div>
                    <p className="text-xs text-amber-900 font-bold leading-relaxed">
                      {t('whatsnew_v300_apology_desc')}
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50 border-4 border-black rounded-2xl shadow-neo-sm space-y-3">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 bg-emerald-400 border-2 border-black rounded-xl flex items-center justify-center">
                        <MessageSquare size={20} className="text-black" strokeWidth={3} />
                      </div>
                      <div>
                        <h3 className="font-black text-base italic">{t('whatsnew_v300_line_title')}</h3>
                        <div className="text-xs text-emerald-800 font-bold">LINE ID: @618iipof</div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 font-bold leading-relaxed">
                      {t('whatsnew_v300_line_desc')}
                    </p>

                    {safeGetStorage('gist_backup_id') && (
                      <div className="p-2.5 bg-white border-2 border-black rounded-xl space-y-1.5 shadow-neo-xs">
                        <div className="flex items-center justify-between text-[10px] font-black text-amber-950">
                          <span>☁️ 您的 Gist 同步 ID</span>
                          <span className="text-[9px] text-zinc-400 font-bold">在 LINE 傳送「綁定 ID」</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-amber-50 border border-black/20 p-1.5 rounded font-mono text-[10px] font-black text-zinc-800 break-all select-all">
                            {safeGetStorage('gist_backup_id')}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const gid = safeGetStorage('gist_backup_id');
                              if (gid) {
                                navigator.clipboard.writeText(gid);
                                alert("📋 Gist ID 已成功複製！請在 LINE 聊天室傳送「綁定 <貼上ID>」即可同步！");
                              }
                            }}
                            className="bg-black text-white px-2.5 py-1.5 rounded font-black text-[10px] active:scale-95 shrink-0"
                          >
                            複製
                          </button>
                        </div>
                      </div>
                    )}

                    <a 
                      href="https://line.me/R/ti/p/@618iipof" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-[#06C755] text-white py-2.5 px-4 rounded-xl border-2 border-black font-black text-xs flex items-center justify-center gap-2 hover:bg-[#05b34c] active:scale-95 transition-all shadow-neo-sm block text-center"
                    >
                      <MessageSquare size={16} />
                      {t('whatsnew_v300_btn_add_line')}
                    </a>
                  </div>

                  <FeatureItem 
                    icon={Zap}
                    color="bg-sky-300"
                    title={t('whatsnew_v300_water_title')}
                    description={t('whatsnew_v300_water_desc')}
                  />
                </div>
              )}

              {show250 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{'v' + version + ' · ' + t('whatsnew_v250_header')}</div>
                  <FeatureItem 
                    icon={Heart}
                    color="bg-rose-300"
                    title={t('whatsnew_v250_vip_title')}
                    description={t('whatsnew_v250_vip_desc')}
                  />
                  <FeatureItem 
                    icon={Activity}
                    color="bg-emerald-300"
                    title={t('whatsnew_v250_timers_title')}
                    description={t('whatsnew_v250_timers_desc')}
                  />
                </div>
              )}

              {show242 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{'v' + version + ' ' + t('whatsnew_v242_header')}</div>
                  <FeatureItem 
                    icon={Sparkles}
                    color="bg-emerald-300"
                    title={t('whatsnew_v242_ai_title')}
                    description={t('whatsnew_v242_ai_desc')}
                  />
                </div>
              )}

              {show235 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v235_header') || 'v2.3.5 Update'}</div>
                  <FeatureItem 
                    icon={Wrench}
                    color="bg-emerald-300"
                    title={t('whatsnew_v235_water_title')}
                    description={t('whatsnew_v235_water_desc')}
                  />
                </div>
              )}

              {show231 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v231_header') || 'v2.3.1 Update'}</div>
                  <FeatureItem 
                    icon={Move}
                    color="bg-emerald-300"
                    title={t('whatsnew_v231_reset_panda_title')}
                    description={t('whatsnew_v231_reset_panda_desc')}
                  />
                  <FeatureItem 
                    icon={BarChart2}
                    color="bg-indigo-300"
                    title={t('whatsnew_v231_report_title')}
                    description={t('whatsnew_v231_report_desc')}
                  />
                  <FeatureItem 
                    icon={Trophy}
                    color="bg-amber-300"
                    title={t('whatsnew_v231_milestones_title')}
                    description={t('whatsnew_v231_milestones_desc')}
                  />
                  <FeatureItem 
                    icon={Sparkles}
                    color="bg-rose-300"
                    title={t('whatsnew_v231_persona_title')}
                    description={t('whatsnew_v231_persona_desc')}
                  />
                </div>
              )}

              {show230 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 ml-2 mb-2">{t('whatsnew_v230_header') || 'v2.3.0 Update'}</div>
                  <FeatureItem 
                    icon={Wrench}
                    color="bg-emerald-300"
                    title={t('whatsnew_v230_edit_fav_title')}
                    description={t('whatsnew_v230_edit_fav_desc')}
                  />
                  <FeatureItem 
                    icon={Target}
                    color="bg-amber-300"
                    title={t('whatsnew_v230_carbs_sync_title')}
                    description={t('whatsnew_v230_carbs_sync_desc')}
                  />
                  <FeatureItem 
                    icon={RefreshCw}
                    color="bg-rose-300"
                    title={t('whatsnew_v230_ai_retry_title')}
                    description={t('whatsnew_v230_ai_retry_desc')}
                  />
                </div>
              )}

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
              
              {!hasAnyFeatures && (
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
