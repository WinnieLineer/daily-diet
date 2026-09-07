import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  RefreshCw, 
  Activity, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink, 
  Search, 
  Clock, 
  User, 
  Database, 
  Cpu, 
  Layers, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Filter,
  BarChart3,
  Server
} from 'lucide-react';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxmQC8f0NxOKRAIuLTSTVC-Vinf9lmU0cnb1akR5oKUEYD-3h7XjFV8Zm_LPkv_kdQo/exec';
const DEFAULT_MAINTAINER_PASS = 'panda888';

export default function LogMonitorDashboard({ onBack, lang = 'zh' }) {
  const isEn = lang === 'en';

  // 🔐 Maintainer Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('maintainer_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // 📊 Dashboard Data States
  const [logs, setLogs] = useState([]);
  const [aiQuota, setAiQuota] = useState(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // ⚙️ Filtering & Auto-Refresh States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(10); // in seconds (0 = off)
  const [countdown, setCountdown] = useState(10);
  const [copiedId, setCopiedId] = useState(null);

  // Handle Maintainer Login
  const handleLogin = (e) => {
    if (e) e.preventDefault();
    const cleanInput = passwordInput.trim();
    const customPass = localStorage.getItem('maintainer_custom_pass') || DEFAULT_MAINTAINER_PASS;

    if (cleanInput === customPass || cleanInput === DEFAULT_MAINTAINER_PASS) {
      sessionStorage.setItem('maintainer_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError(isEn ? 'Incorrect password. Access denied.' : '維護者密碼不正確，存取被拒絕。');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('maintainer_auth');
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  // Fetch Logs and Quota from GAS
  const fetchDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setFetchError(null);
    try {
      const targetUrl = `${GAS_API_URL}?action=getRecentLogs&limit=250&_t=${Date.now()}`;
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      if (data.status === 'ok') {
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setAiQuota(data.aiQuota || null);
        if (data.sheetUrl) setSheetUrl(data.sheetUrl);
        setLastFetchedAt(new Date());
      } else {
        throw new Error(data.message || 'Failed to fetch logs');
      }
    } catch (err) {
      console.error('Fetch dashboard logs error:', err);
      setFetchError(err.message || String(err));
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Initial Fetch on Authenticate
  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  // Auto-Refresh Timer
  useEffect(() => {
    if (!isAuthenticated || autoRefreshInterval <= 0) return;

    setCountdown(autoRefreshInterval);
    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboardData(true);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [isAuthenticated, autoRefreshInterval]);

  // Filter Categories
  const categories = useMemo(() => [
    { id: 'ALL', label: isEn ? 'All Logs' : '全部日誌' },
    { id: 'PHOTO', label: isEn ? '📸 Photo AI' : '📸 照片辨識' },
    { id: 'TEXT', label: isEn ? '💬 Text AI' : '💬 文字辨識' },
    { id: 'WATER', label: isEn ? '🚰 Water' : '🚰 喝水記錄' },
    { id: 'PORTION', label: isEn ? '⚖️ Portion' : '⚖️ 份量調整' },
    { id: 'FAV', label: isEn ? '⭐ Favorites' : '⭐ 常用庫' },
    { id: 'GOAL', label: isEn ? '🎯 Goals' : '🎯 目標' },
    { id: 'ALERT', label: isEn ? '🚨 Alerts' : '🚨 異常通報' },
  ], [isEn]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (!logs || !logs.length) return [];
    return logs.filter((log) => {
      // log is array: [time, operation, userId, dish/query, nutrients/calc, comment/result, source]
      const [time = '', op = '', uId = '', query = '', nutrients = '', result = '', src = ''] = Array.isArray(log) ? log : [];
      const opStr = String(op);
      const uIdStr = String(uId);
      const queryStr = String(query);
      const nutrientsStr = String(nutrients);
      const resultStr = String(result);

      // Category matching
      if (selectedCategory === 'PHOTO' && !opStr.includes('照片') && !opStr.includes('Photo') && !opStr.includes('Vision')) return false;
      if (selectedCategory === 'TEXT' && !opStr.includes('文字') && !opStr.includes('Text') && !opStr.includes('語意')) return false;
      if (selectedCategory === 'WATER' && !opStr.includes('水') && !opStr.includes('Water')) return false;
      if (selectedCategory === 'PORTION' && !opStr.includes('倍') && !opStr.includes('半') && !opStr.includes('份量') && !opStr.includes('Portion')) return false;
      if (selectedCategory === 'FAV' && !opStr.includes('常用') && !opStr.includes('Favorite')) return false;
      if (selectedCategory === 'GOAL' && !opStr.includes('目標') && !opStr.includes('Goal')) return false;
      if (selectedCategory === 'ALERT' && !opStr.includes('異常') && !opStr.includes('Alert') && !opStr.includes('Error') && !resultStr.includes('失敗')) return false;

      // Search Query matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const combined = `${time} ${opStr} ${uIdStr} ${queryStr} ${nutrientsStr} ${resultStr} ${src}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }

      return true;
    });
  }, [logs, selectedCategory, searchQuery]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // ==========================================
  // 🔒 Render Password Gate Screen
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] p-4 flex items-center justify-center">
        <motion.div 
          animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-neo p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-accent border-4 border-black rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-neo-sm">
                🛡️
              </div>
              <div>
                <span className="bg-black text-white px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase">
                  Maintainer Only
                </span>
                <h2 className="text-2xl font-black italic tracking-tight mt-2">
                  {isEn ? 'System Log & API Monitor' : '雲端運作日誌與 API 監控中心'}
                </h2>
                <p className="text-xs font-bold text-zinc-500 mt-1 leading-relaxed">
                  {isEn 
                    ? 'Enter the maintainer security password to access live server logs and API quota statistics.'
                    : '此端點為維護者專用，請輸入維護者驗證密碼以檢視即時流量與系統運作日誌。'}
                </p>
              </div>
            </div>

            {/* Password Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block ml-1">
                  {isEn ? 'Maintainer Password' : '維護者驗證密碼'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={isEn ? 'Enter password (default: panda888)' : '請輸入密碼（預設: panda888）'}
                    className="w-full bg-zinc-50 border-4 border-black p-3.5 pr-12 rounded-2xl font-mono font-bold text-base outline-none focus:bg-white shadow-neo-xs transition-colors"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-black transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {authError && (
                  <p className="text-xs font-black text-rose-600 flex items-center gap-1.5 mt-2 ml-1">
                    <AlertTriangle size={14} />
                    {authError}
                  </p>
                )}
              </div>

              <NeoButton
                type="submit"
                variant="black"
                className="w-full h-14 text-base font-black italic shadow-neo-sm active:scale-95"
              >
                <ShieldCheck size={20} className="mr-2 text-accent" />
                {isEn ? 'Unlock Dashboard' : '解鎖維護者儀表板'}
              </NeoButton>
            </form>

            {/* Back Button */}
            <div className="pt-2 border-t-2 border-dashed border-zinc-200">
              <button
                onClick={onBack}
                type="button"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs text-zinc-500 hover:text-black hover:bg-zinc-100 transition-all"
              >
                <ArrowLeft size={16} />
                {isEn ? 'Back to Daily Diet Tracker' : '返回飲食紀錄主畫面'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // 📊 Render Main Dashboard Screen
  // ==========================================
  const quotaUsed = aiQuota?.used || 0;
  const quotaMax = aiQuota?.max || 1500;
  const quotaPercent = Math.min(Math.round((quotaUsed / quotaMax) * 100), 100);
  const currentRpm = aiQuota?.rpm || 0;
  const maxRpm = aiQuota?.maxRpm || 15;
  const rpmPercent = Math.min(Math.round((currentRpm / maxRpm) * 100), 100);
  const successCount = aiQuota?.successCount || 0;
  const failCount = aiQuota?.failCount || 0;
  const totalCalls = successCount + failCount;
  const successRate = totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 100;
  const models = aiQuota?.models || {};
  const recentErrors = Array.isArray(aiQuota?.recentErrors) ? aiQuota.recentErrors : [];

  return (
    <div className="min-h-screen bg-[#FFFDF5] p-3 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Navigation & Header */}
      <header className="bg-white border-4 border-black rounded-[2.5rem] p-4 sm:p-6 shadow-neo space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Title & Live Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="bg-black text-white p-2.5 rounded-2xl hover:bg-accent hover:text-black transition-colors border-2 border-black active:scale-95 shadow-neo-xs"
              title={isEn ? 'Back to Tracker' : '返回主畫面'}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black italic tracking-tight leading-none">
                  🐼 {isEn ? 'Live System & API Monitor' : '實時系統運作與 API 流量監控'}
                </h1>
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  LIVE
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-zinc-500 mt-1">
                {lastFetchedAt 
                  ? `${isEn ? 'Last updated:' : '最後更新：'} ${lastFetchedAt.toLocaleTimeString()}`
                  : (isEn ? 'Connecting...' : '連線同步中...')}
                {autoRefreshInterval > 0 && ` · ${countdown}s ${isEn ? 'next refresh' : '後自動更新'}`}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto Refresh Select */}
            <div className="flex items-center gap-1 bg-zinc-100 border-2 border-black rounded-xl p-1 text-xs font-bold">
              <Clock size={14} className="text-zinc-500 ml-1" />
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent font-black text-xs outline-none cursor-pointer pr-1"
              >
                <option value={0}>{isEn ? 'Auto: Off' : '自動: 關閉'}</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            </div>

            {/* Manual Refresh */}
            <NeoButton
              variant="white"
              onClick={() => fetchDashboardData(false)}
              disabled={isLoading}
              className="h-10 px-3 text-xs font-black flex items-center gap-1.5 shadow-neo-xs"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? (isEn ? 'Updating...' : '讀取中...') : (isEn ? 'Refresh' : '重新整理')}
            </NeoButton>

            {/* Google Sheets Link */}
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-3 bg-emerald-50 border-2 border-black rounded-2xl flex items-center gap-1.5 text-xs font-black text-emerald-900 hover:bg-emerald-100 transition-colors shadow-neo-xs"
              >
                <FileSpreadsheet size={14} />
                {isEn ? 'Open Sheet' : '檢視雲端試算表'}
                <ExternalLink size={12} />
              </a>
            )}

            {/* Logout / Lock */}
            <button
              onClick={handleLogout}
              className="h-10 px-3 bg-rose-50 border-2 border-black rounded-2xl flex items-center gap-1 text-xs font-black text-rose-700 hover:bg-rose-100 transition-colors shadow-neo-xs"
              title={isEn ? 'Lock Dashboard' : '鎖定維護者'}
            >
              <Lock size={14} />
              {isEn ? 'Lock' : '鎖定'}
            </button>
          </div>
        </div>
      </header>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="bg-rose-50 border-4 border-rose-500 p-4 rounded-3xl flex items-center gap-3 text-rose-800 font-bold text-sm shadow-neo-sm">
          <AlertTriangle size={24} className="text-rose-600 shrink-0" />
          <div className="flex-1">
            <span className="font-black">{isEn ? 'Failed to fetch logs from GAS:' : '無法自雲端伺服器取得日誌：'}</span> {fetchError}
          </div>
          <NeoButton variant="black" onClick={() => fetchDashboardData(false)} className="text-xs h-8 px-3">
            {isEn ? 'Retry' : '重試'}
          </NeoButton>
        </div>
      )}

      {/* 🚀 Hero KPI Grid (API Quota & Health Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Daily Quota Usage */}
        <div className="bg-white border-4 border-black rounded-[2rem] p-4 shadow-neo space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
              <Activity size={14} className="text-black" />
              {isEn ? 'Daily AI Quota' : '當日 AI 呼叫額度'}
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border border-black ${quotaPercent >= 90 ? 'bg-rose-100 text-rose-800' : quotaPercent >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {quotaPercent}%
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono tracking-tight">{quotaUsed}</span>
              <span className="text-xs font-black font-mono text-zinc-400">/ {quotaMax} calls</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-3 bg-zinc-100 border-2 border-black rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-700 ${quotaPercent >= 90 ? 'bg-rose-500' : quotaPercent >= 70 ? 'bg-amber-400' : 'bg-accent'}`}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          </div>
          <p className="text-[9px] font-bold text-zinc-400">
            {isEn ? 'Resets at 00:00 Taiwan Time (GMT+8)' : '每日台灣時間 00:00 自動重設歸零'}
          </p>
        </div>

        {/* KPI 2: Real-time RPM */}
        <div className="bg-white border-4 border-black rounded-[2rem] p-4 shadow-neo space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
              <Zap size={14} className="text-amber-500" />
              {isEn ? 'Rolling Rate (RPM)' : '即時速率限制 (RPM)'}
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border border-black ${currentRpm >= 12 ? 'bg-rose-100 text-rose-800 animate-pulse' : currentRpm >= 8 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {currentRpm >= 12 ? 'HIGH' : currentRpm >= 8 ? 'NORMAL' : 'CLEAR'}
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono tracking-tight">{currentRpm}</span>
              <span className="text-xs font-black font-mono text-zinc-400">/ {maxRpm} RPM max</span>
            </div>
            {/* RPM Meter */}
            <div className="w-full h-3 bg-zinc-100 border-2 border-black rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-500 ${currentRpm >= 12 ? 'bg-rose-500' : currentRpm >= 8 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${rpmPercent}%` }}
              />
            </div>
          </div>
          <p className="text-[9px] font-bold text-zinc-400">
            {isEn ? 'Sliding 60-second window quota guard' : '動態 60 秒滾動防刷保護窗口'}
          </p>
        </div>

        {/* KPI 3: Success Rate */}
        <div className="bg-white border-4 border-black rounded-[2rem] p-4 shadow-neo space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              {isEn ? 'Success Rate' : 'AI 調用成功率'}
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-zinc-100 border border-black text-black">
              {totalCalls} {isEn ? 'Total' : '總次數'}
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono tracking-tight text-emerald-600">{successRate}%</span>
              <span className="text-xs font-bold text-zinc-400 ml-1">
                ({successCount} OK / {failCount} Err)
              </span>
            </div>
            {/* Split Bar */}
            <div className="w-full h-3 bg-zinc-100 border-2 border-black rounded-full overflow-hidden mt-2 flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${successRate}%` }} />
              <div className="bg-rose-500 h-full" style={{ width: `${100 - successRate}%` }} />
            </div>
          </div>
          <p className="text-[9px] font-bold text-zinc-400">
            {failCount > 0 ? `⚠️ ${failCount} 次請求遇到伺服端或模型異常` : '🟢 所有調用正常執行，無故障通報'}
          </p>
        </div>

        {/* KPI 4: Active Models Distribution */}
        <div className="bg-white border-4 border-black rounded-[2rem] p-4 shadow-neo space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
              <Cpu size={14} className="text-purple-500" />
              {isEn ? 'Models Active' : '活躍 Gemini 模型'}
            </span>
            <span className="text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full">
              {Object.keys(models).length} {isEn ? 'Models' : '款模型'}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[70px] overflow-y-auto custom-scrollbar pr-1">
            {Object.keys(models).length === 0 ? (
              <p className="text-xs font-bold text-zinc-400 italic pt-2">
                {isEn ? 'No model calls recorded yet today.' : '今日尚無模型調用紀錄'}
              </p>
            ) : (
              Object.entries(models).map(([mName, mStats]) => (
                <div key={mName} className="flex items-center justify-between text-xs font-bold border border-black/10 rounded-lg px-2 py-1 bg-zinc-50">
                  <span className="font-mono text-[10px] truncate max-w-[120px]">{mName}</span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <span className="bg-black text-white px-1.5 py-0.2 rounded font-black">{mStats.count || 0}</span>
                    {mStats.fail > 0 && <span className="text-rose-600 font-black">({mStats.fail}x)</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ⚠️ Recent Errors Alert Panel (if any) */}
      {recentErrors.length > 0 && (
        <div className="bg-rose-50 border-4 border-rose-500 rounded-[2rem] p-4 shadow-neo-sm space-y-2">
          <div className="flex items-center gap-2 text-rose-800 font-black text-xs uppercase tracking-wider">
            <AlertTriangle size={16} className="text-rose-600" />
            {isEn ? 'Recent Model Failures & System Alerts' : '近期 API 調用異常與伺服器故障通報'}
          </div>
          <div className="space-y-1.5">
            {recentErrors.slice(0, 3).map((errItem, idx) => (
              <div key={idx} className="bg-white border-2 border-rose-200 rounded-xl p-2 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-zinc-400">{errItem.time || '剛剛'}</span>
                <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded text-[10px] font-mono">
                  {errItem.model || 'Unknown'}
                </span>
                <span className="text-rose-700 truncate max-w-sm flex-1 font-mono text-[11px]">
                  {errItem.error || 'Request Error'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔍 Search & Category Filter Toolbar */}
      <div className="bg-white border-4 border-black rounded-[2rem] p-4 shadow-neo space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search user ID, food name, comment, or query...' : '搜尋用戶 ID、餐點名稱、AI 評語或原始對話...'}
              className="w-full bg-zinc-50 border-2 border-black rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-black font-black"
              >
                ✕
              </button>
            )}
          </div>

          {/* Records Counter */}
          <div className="bg-zinc-100 border-2 border-black rounded-2xl px-4 py-2 flex items-center justify-between sm:justify-center gap-2 shrink-0 font-bold text-xs">
            <span className="text-zinc-500">{isEn ? 'Showing:' : '目前顯示：'}</span>
            <span className="font-mono font-black text-sm bg-black text-white px-2 py-0.5 rounded-lg">
              {filteredLogs.length} / {logs.length}
            </span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2 ${
                selectedCategory === cat.id
                  ? 'bg-black text-white border-black shadow-neo-xs'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-black'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📜 Log Stream / Table Section */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white border-4 border-black rounded-[2.5rem] p-12 text-center shadow-neo space-y-3">
            <div className="text-5xl mb-2">🔍</div>
            <h3 className="text-lg font-black italic">{isEn ? 'No Matching Logs Found' : '查無符合條件的運作日誌'}</h3>
            <p className="text-xs font-bold text-zinc-400 max-w-sm mx-auto">
              {isEn ? 'Try adjusting your search keywords or switching category filters.' : '請嘗試更換搜尋關鍵字或點選「全部日誌」分類。'}
            </p>
          </div>
        ) : (
          filteredLogs.map((item, index) => {
            const [time = '', op = '', uId = '', query = '', nutrients = '', result = '', src = ''] = Array.isArray(item) ? item : [];
            const isAlert = String(op).includes('異常') || String(result).includes('失敗') || String(op).includes('報警');
            const isPhoto = String(op).includes('照片') || String(op).includes('Photo');
            const isText = String(op).includes('文字') || String(op).includes('Text');
            const isWater = String(op).includes('水') || String(op).includes('Water');
            const isPortion = String(op).includes('倍') || String(op).includes('半') || String(op).includes('份量');
            const isGoal = String(op).includes('目標');
            const isFav = String(op).includes('常用');

            // Distinct Operation Badge Color
            let badgeBg = 'bg-zinc-100 text-zinc-800 border-zinc-300';
            if (isAlert) badgeBg = 'bg-rose-100 text-rose-800 border-rose-300';
            else if (isPhoto) badgeBg = 'bg-indigo-100 text-indigo-800 border-indigo-300';
            else if (isText) badgeBg = 'bg-blue-100 text-blue-800 border-blue-300';
            else if (isWater) badgeBg = 'bg-cyan-100 text-cyan-800 border-cyan-300';
            else if (isPortion) badgeBg = 'bg-amber-100 text-amber-900 border-amber-300';
            else if (isGoal) badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            else if (isFav) badgeBg = 'bg-pink-100 text-pink-800 border-pink-300';

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white border-4 border-black rounded-[2rem] p-4 sm:p-5 shadow-neo hover:shadow-neo-lg transition-all space-y-3 ${isAlert ? 'border-l-8 border-l-rose-500' : ''}`}
              >
                {/* Header Row: Time + Op Badge + User + Source */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-zinc-100 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Time */}
                    <span className="text-[11px] font-mono font-black text-zinc-500 flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded-lg">
                      <Clock size={12} />
                      {time}
                    </span>

                    {/* Operation Badge */}
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badgeBg}`}>
                      {op || 'System Action'}
                    </span>

                    {/* Source Tag */}
                    {src && (
                      <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 rounded-md">
                        {src}
                      </span>
                    )}
                  </div>

                  {/* User Identifier */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <User size={10} />
                      {uId ? (uId.length > 12 ? `${uId.slice(0, 6)}...${uId.slice(-4)}` : uId) : 'System'}
                    </span>
                    {uId && (
                      <button
                        onClick={() => copyToClipboard(uId, `uid-${index}`)}
                        className="p-1 text-zinc-400 hover:text-black transition-colors"
                        title={isEn ? 'Copy User ID' : '複製完整 User ID'}
                      >
                        {copiedId === `uid-${index}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Body Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Left: Input / Query */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">
                      {isEn ? 'Input / Trigger' : '用戶輸入 / 觸發事件'}
                    </span>
                    <div className="bg-zinc-50 border-2 border-black/10 rounded-xl p-2.5 font-mono text-xs font-bold text-zinc-800 break-words leading-relaxed">
                      {query || '—'}
                    </div>
                  </div>

                  {/* Right: Response / Result */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">
                      {isEn ? 'Nutrients / Coach Response' : '營養數值 / 教練回應'}
                    </span>
                    <div className="bg-accent/10 border-2 border-black/10 rounded-xl p-2.5 text-xs font-bold text-zinc-900 break-words leading-relaxed">
                      {nutrients && (
                        <div className="font-mono font-black text-xs text-black mb-1">
                          {nutrients}
                        </div>
                      )}
                      {result ? (
                        <div className="text-zinc-700 italic">
                          {result}
                        </div>
                      ) : (
                        !nutrients && <span className="text-zinc-400 italic font-normal">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer Spacer */}
      <div className="h-12" />
    </div>
  );
}
