import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Server,
  Globe,
  Smartphone,
  Laptop,
  ChevronRight,
  ChevronDown,
  Table as TableIcon,
  LayoutList,
  Terminal,
  Code,
  MapPin,
  ShieldAlert,
  Download
} from 'lucide-react';
import NeoButton from './NeoButton';

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxmQC8f0NxOKRAIuLTSTVC-Vinf9lmU0cnb1akR5oKUEYD-3h7XjFV8Zm_LPkv_kdQo/exec';
const REQUIRED_MAINTAINER_USER = 'Winnie';
const REQUIRED_MAINTAINER_PASS = '1qaZXCVBNM<>?';
const PERMANENT_TOKEN_KEY = 'daily_diet_maintainer_token_v2';
const CLIENT_INFO_KEY = 'daily_diet_maintainer_client_info';
const MAINTAINER_NAME_KEY = 'daily_diet_maintainer_name';

// Helper to safely normalize log records (Supports both Object format and Array format from GAS)
const normalizeLog = (item) => {
  if (!item) return null;
  if (Array.isArray(item)) {
    const time = String(item[0] || '');
    const userName = String(item[1] || item[2] || 'LINE 用戶');
    const userId = String(item[2] || item[1] || 'user');
    const type = String(item[3] || item[1] || '系統操作');
    const input = String(item[4] || '');
    const aiResult = String(item[5] || '');
    const output = String(item[6] || '');
    const ip = String(item[7] || '');
    const location = String(item[8] || '');
    return {
      time,
      userName,
      userId,
      type,
      input,
      aiResult,
      output,
      source: 'LINE / GAS',
      ip,
      location,
      device: ''
    };
  }

  const inputStr = String(item.input || item.query || '');
  const aiResultStr = String(item.aiResult || item.nutrients || '');
  const outputStr = String(item.output || item.result || '');

  // Extract ip and location if embedded in input / output
  let ip = item.ip || '';
  let location = item.location || '';
  let device = item.device || '';

  if (!ip && inputStr.includes('IP:')) {
    const ipMatch = inputStr.match(/IP:\s*([^\s·|,]+)/);
    if (ipMatch) ip = ipMatch[1];
  }
  if (!location && inputStr.includes('位置:')) {
    const locMatch = inputStr.match(/位置:\s*([^·|]+)/);
    if (locMatch) location = locMatch[1].trim();
  }
  if (!device && inputStr.includes('OS:')) {
    const devMatch = inputStr.match(/(?:OS:[^|]+)/);
    if (devMatch) device = devMatch[0].trim();
  }

  return {
    time: String(item.time || ''),
    userName: String(item.userName || item.userId || 'LINE 用戶'),
    userId: String(item.rawUserId || item.userId || 'user'),
    type: String(item.type || item.op || '系統操作'),
    input: inputStr,
    aiResult: aiResultStr,
    output: outputStr,
    source: String(item.source || (item.type?.includes('維護者') ? 'Web 維護者後台' : 'LINE Bot')),
    ip,
    location,
    device
  };
};

export default function LogMonitorDashboard({ onBack, lang = 'zh' }) {
  const isEn = lang === 'en';

  // 🔐 Permanent Pass Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem(PERMANENT_TOKEN_KEY));
  });
  const [permanentToken, setPermanentToken] = useState(() => {
    return localStorage.getItem(PERMANENT_TOKEN_KEY) || '';
  });
  const [maintainerName, setMaintainerName] = useState(() => {
    return localStorage.getItem(MAINTAINER_NAME_KEY) || localStorage.getItem('user_name') || 'Winnie';
  });
  const [maintainerNameInput, setMaintainerNameInput] = useState(() => {
    return localStorage.getItem(MAINTAINER_NAME_KEY) || localStorage.getItem('user_name') || 'Winnie';
  });
  const [clientInfo, setClientInfo] = useState(() => {
    try {
      const raw = localStorage.getItem(CLIENT_INFO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isRegisteringAudit, setIsRegisteringAudit] = useState(false);

  // 📊 Dashboard Data States
  const [rawLogs, setRawLogs] = useState([]);
  const [aiQuota, setAiQuota] = useState(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [lastMaintainerLogin, setLastMaintainerLogin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // ⚙️ View & Filtering States
  const [viewMode, setViewMode] = useState('kibana'); // 'kibana' (table) or 'cards' (stream)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(10); // seconds (0 = off)
  const [countdown, setCountdown] = useState(10);
  const [copiedId, setCopiedId] = useState(null);

  // 📑 Kibana Row Expansion & Inspector States
  const [expandedRowIds, setExpandedRowIds] = useState(new Set([0])); // default expand 1st row
  const [rowInspectorTab, setRowInspectorTab] = useState({}); // { [rowId]: 'table' | 'json' }

  const toggleRowExpansion = (rowId) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const setRowTab = (rowId, tab) => {
    setRowInspectorTab((prev) => ({ ...prev, [rowId]: tab }));
  };

  // 🕵️ Collect Device, IP & Geo Location Info
  const collectDeviceInfo = async () => {
    let ip = 'Unknown IP';
    let location = 'Local / Direct';

    try {
      const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3500) });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.ip) ip = ipData.ip;
      }
    } catch (e) {}

    try {
      if (ip !== 'Unknown IP') {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(3500) });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          const parts = [geo.city, geo.region, geo.country_name].filter(Boolean);
          if (parts.length > 0) location = parts.join(', ');
        }
      }
    } catch (e) {}

    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';

    let browser = 'Unknown Browser';
    if (ua.includes('Line')) browser = 'LINE in-app';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';

    const device = `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio || 1}x)`;

    return { 
      ip, 
      location, 
      os, 
      browser, 
      device, 
      userName: maintainerName || 'Winnie',
      timestamp: new Date().toISOString() 
    };
  };

  // 📡 Send Maintainer Login Audit to GAS Backend
  const recordMaintainerAuditToBackend = async (info, token, userNameOverride) => {
    try {
      setIsRegisteringAudit(true);
      const name = userNameOverride || maintainerName || info.userName || 'Winnie';
      const params = new URLSearchParams({
        action: 'recordMaintainerLogin',
        userName: name,
        ip: info.ip || '',
        location: info.location || '',
        device: info.device || '',
        browser: info.browser || '',
        os: info.os || '',
        token: token || ''
      });
      await fetch(`${GAS_API_URL}?${params.toString()}`, { method: 'GET', mode: 'no-cors' });
      console.log('✅ [Maintainer Audit] 登入日誌已記錄 (含使用者名字、位置與 IP)');
    } catch (err) {
      console.warn('⚠️ 記錄維護者登入日誌失敗:', err);
    } finally {
      setIsRegisteringAudit(false);
    }
  };

  // Handle Login & Issue Permanent Pass
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    const cleanInput = passwordInput.trim();
    const cleanName = maintainerNameInput.trim();

    const isUserValid = cleanName.toLowerCase() === REQUIRED_MAINTAINER_USER.toLowerCase();
    const isPassValid = cleanInput === REQUIRED_MAINTAINER_PASS;

    if (isUserValid && isPassValid) {
      // Generate permanent pass token
      const newToken = `PANDA_PASS_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(PERMANENT_TOKEN_KEY, newToken);
      localStorage.setItem(MAINTAINER_NAME_KEY, REQUIRED_MAINTAINER_USER);
      setPermanentToken(newToken);
      setMaintainerName(REQUIRED_MAINTAINER_USER);
      setIsAuthenticated(true);
      setAuthError('');

      // Collect device & IP info and record to backend
      const info = await collectDeviceInfo();
      info.userName = REQUIRED_MAINTAINER_USER;
      localStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(info));
      setClientInfo(info);

      // Instantly inject a local login record so user immediately sees their own login log
      const nowStr = new Date().toLocaleString('zh-TW', { hour12: false });
      const instantLoginLog = {
        time: nowStr,
        userName: REQUIRED_MAINTAINER_USER,
        userId: 'Maintainer',
        type: '維護者登入',
        input: `IP: ${info.ip} · 位置: ${info.location}`,
        aiResult: `OS: ${info.os} · 瀏覽器: ${info.browser} · 螢幕: ${info.device}`,
        output: `✅ 永久通行證已核發 (${nowStr})`,
        source: 'Web 維護者後台 (#/admin)',
        ip: info.ip,
        location: info.location,
        device: `${info.os} · ${info.browser}`
      };
      setRawLogs((prev) => [instantLoginLog, ...prev]);

      // Report to GAS
      recordMaintainerAuditToBackend(info, newToken, REQUIRED_MAINTAINER_USER);
    } else {
      if (!isUserValid && isPassValid) {
        setAuthError(isEn ? 'Maintainer account must be Winnie.' : '維護者帳號必須為 Winnie。');
      } else {
        setAuthError(isEn ? 'Incorrect account or password. Access denied.' : '帳號或密碼不正確，存取被拒絕。');
      }
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    }
  };

  // Revoke Permanent Pass (Sign out)
  const handleRevokePermanentPass = () => {
    localStorage.removeItem(PERMANENT_TOKEN_KEY);
    localStorage.removeItem(CLIENT_INFO_KEY);
    localStorage.removeItem(MAINTAINER_NAME_KEY);
    localStorage.removeItem('maintainer_custom_pass');
    localStorage.removeItem('daily_diet_maintainer_permanent_token');
    sessionStorage.removeItem('maintainer_auth');
    setIsAuthenticated(false);
    setPermanentToken('');
    setClientInfo(null);
    setPasswordInput('');
  };

  // Fetch Dashboard Logs and Quota from GAS
  const fetchDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setFetchError(null);
    try {
      const targetUrl = `${GAS_API_URL}?action=getRecentLogs&limit=250&_t=${Date.now()}`;
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      if (data.status === 'ok') {
        const fetchedLogs = Array.isArray(data.logs) ? data.logs : [];

        // If backend returned lastMaintainerLogin, ensure it exists in the log list
        if (data.lastMaintainerLogin && data.lastMaintainerLogin.ip) {
          const lml = data.lastMaintainerLogin;
          setLastMaintainerLogin(lml);
          const hasLoginInLogs = fetchedLogs.some((l) => {
            const lType = String(l.type || l[3] || '');
            const lInput = String(l.input || l[4] || '');
            return (lType.includes('登入') || lType.includes('Login')) && (lInput.includes(lml.ip) || lInput.includes(lml.location));
          });
          if (!hasLoginInLogs) {
            fetchedLogs.unshift({
              time: lml.time || new Date().toLocaleString(),
              userName: lml.userName || '系統維護者',
              userId: 'Maintainer',
              type: '維護者登入',
              input: `IP: ${lml.ip} · 位置: ${lml.location}`,
              aiResult: `OS: ${lml.os} · 瀏覽器: ${lml.browser} · 螢幕: ${lml.device}`,
              output: `✅ 永久通行證已核發 (Token: ${lml.tokenPrefix})`,
              source: 'Web 維護者後台 (#/admin)',
              ip: lml.ip,
              location: lml.location,
              device: `${lml.os} · ${lml.browser}`
            });
          }
        }

        setRawLogs(fetchedLogs);
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

      // If permanent token exists but client info is missing, populate it
      if (!clientInfo) {
        collectDeviceInfo().then((info) => {
          localStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(info));
          setClientInfo(info);
          recordMaintainerAuditToBackend(info, permanentToken);
        });
      }
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
    { id: 'LOGIN', label: isEn ? '🛡️ Logins' : '🛡️ 後台登入' },
    { id: 'ALERT', label: isEn ? '🚨 Errors' : '🚨 異常通報' },
    { id: 'PHOTO', label: isEn ? '📸 Photo' : '📸 照片辨識' },
    { id: 'TEXT', label: isEn ? '💬 Text' : '💬 文字記餐' },
    { id: 'WATER', label: isEn ? '🚰 Water' : '🚰 喝水記錄' },
    { id: 'PORTION', label: isEn ? '⚖️ Portion' : '⚖️ 份量調整' },
    { id: 'SYNC', label: isEn ? '⚡ Web Sync' : '⚡ Web 同步' },
    { id: 'GOAL', label: isEn ? '🎯 Goals' : '🎯 體態目標' },
  ], [isEn]);

  // Normalized & Filtered Logs
  const normalizedLogs = useMemo(() => {
    if (!rawLogs || !rawLogs.length) return [];
    return rawLogs.map(normalizeLog).filter(Boolean);
  }, [rawLogs]);

  const filteredLogs = useMemo(() => {
    if (!normalizedLogs || !normalizedLogs.length) return [];
    return normalizedLogs.filter((log) => {
      const { time, userName, userId, type, input, aiResult, output, source, ip, location } = log;

      // Category matching
      if (selectedCategory === 'LOGIN') {
        const isLogin = type.includes('登入') || type.includes('Login') || userId === 'Maintainer' || input.includes('IP:');
        if (!isLogin) return false;
      }
      if (selectedCategory === 'PHOTO' && !type.includes('照片') && !type.includes('Photo') && !type.includes('Vision')) return false;
      if (selectedCategory === 'TEXT' && !type.includes('文字') && !type.includes('Text') && !type.includes('對話') && !type.includes('語意')) return false;
      if (selectedCategory === 'WATER' && !type.includes('水') && !type.includes('Water') && !input.includes('水') && !aiResult.includes('水')) return false;
      if (selectedCategory === 'PORTION' && !type.includes('倍') && !type.includes('半') && !type.includes('份量') && !type.includes('碳水減半')) return false;
      if (selectedCategory === 'GOAL' && !type.includes('目標') && !type.includes('Goal')) return false;
      if (selectedCategory === 'SYNC' && !type.includes('Web') && !type.includes('同步')) return false;
      if (selectedCategory === 'ALERT' && !type.includes('異常') && !type.includes('Alert') && !type.includes('錯誤') && !output.includes('失敗')) return false;

      // Text Search matching (includes userName, location, ip, type, etc.)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullContent = `${time} ${userName} ${userId} ${type} ${input} ${aiResult} ${output} ${source} ${ip} ${location}`.toLowerCase();
        if (!fullContent.includes(q)) return false;
      }

      return true;
    });
  }, [normalizedLogs, selectedCategory, searchQuery]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Export visible logs as JSON
  const exportLogsAsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `daily-diet-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // ==========================================
  // 🔒 Render Password Gate Screen (If no permanent pass)
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
                  Maintainer Access
                </span>
                <h2 className="text-2xl font-black italic tracking-tight mt-2">
                  {isEn ? 'System Log & API Monitor' : '雲端運作日誌與 API 監控中心'}
                </h2>
                <p className="text-xs font-bold text-zinc-500 mt-1 leading-relaxed">
                  {isEn 
                    ? 'Enter your maintainer name and password to issue a permanent pass on this device. Device info & IP will be logged.'
                    : '請輸入維護者名稱與密碼，驗證通過後將為此裝置永久核發通行證。系統將同步記錄本次登入之 IP 與位置資訊。'}
                </p>
              </div>
            </div>

            {/* Password Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Maintainer Name Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block ml-1">
                  {isEn ? 'Maintainer Account' : '維護者帳號'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={maintainerNameInput}
                    onChange={(e) => setMaintainerNameInput(e.target.value)}
                    placeholder="Winnie"
                    className="w-full bg-zinc-50 border-4 border-black p-3.5 pl-10 rounded-2xl font-bold text-sm outline-none focus:bg-white shadow-neo-xs transition-colors"
                  />
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                </div>
              </div>

              {/* Security Password Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block ml-1">
                  {isEn ? 'Maintainer Security Password' : '維護者身分驗證密碼'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={isEn ? 'Enter password' : '請輸入密碼'}
                    className="w-full bg-zinc-50 border-4 border-black p-3.5 pr-12 pl-10 rounded-2xl font-mono font-bold text-base outline-none focus:bg-white shadow-neo-xs transition-colors"
                    autoFocus
                  />
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
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
                {isEn ? 'Unlock & Issue Permanent Pass' : '解鎖並永久核發通行證'}
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
                {isEn ? 'Back to Daily Diet' : '返回飲食紀錄主畫面'}
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
    <div className="min-h-screen bg-[#FFFDF5] p-3 sm:p-6 lg:p-8 w-full space-y-5">
      {/* 🏷️ Top Permanent Pass Status Badge */}
      <div className="bg-emerald-50 border-3 border-black rounded-2xl px-4 py-2.5 shadow-neo-xs flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-emerald-950">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-emerald-500 text-white p-1 rounded-lg">
            <Check size={14} strokeWidth={3} />
          </span>
          <span className="font-black">
            {isEn ? 'Permanent Maintainer Pass Active' : '已核發本機永久維護者通行證'}
          </span>
          <span className="font-black bg-black text-white px-2 py-0.5 rounded-lg text-[10px]">
            👤 {maintainerName}
          </span>
          {clientInfo && (
            <span className="font-mono text-[11px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-300 flex items-center gap-1">
              <MapPin size={11} /> {clientInfo.location} · 🌐 {clientInfo.ip} · 💻 {clientInfo.os} ({clientInfo.browser})
            </span>
          )}
        </div>
        <button
          onClick={handleRevokePermanentPass}
          className="text-[11px] font-black text-rose-600 hover:text-rose-800 underline decoration-2 underline-offset-2 ml-auto"
        >
          {isEn ? 'Revoke Pass & Lock' : '註銷永久通行證並鎖定'}
        </button>
      </div>

      {/* Navigation & Header */}
      <header className="bg-white border-4 border-black rounded-[2.5rem] p-4 sm:p-6 shadow-neo space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Title & Live Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="bg-black text-white p-2.5 rounded-2xl hover:bg-accent hover:text-black transition-colors border-2 border-black active:scale-95 shadow-neo-xs shrink-0"
              title={isEn ? 'Back to Tracker' : '返回主畫面'}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black italic tracking-tight leading-none">
                  🐼 {isEn ? 'Live System & API Monitor' : '實時系統運作與 API 流量監控'}
                </h1>
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  KIBANA DISCOVER
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-zinc-500 mt-1">
                {lastFetchedAt 
                  ? `${isEn ? 'Last updated:' : '最後同步：'} ${lastFetchedAt.toLocaleTimeString()}`
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
              {isLoading ? (isEn ? 'Syncing...' : '讀取中...') : (isEn ? 'Refresh' : '重新整理')}
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
                <span className="hidden sm:inline">{isEn ? 'Google Sheet' : '雲端試算表'}</span>
                <ExternalLink size={12} />
              </a>
            )}

            {/* Export JSON */}
            <button
              onClick={exportLogsAsJson}
              className="h-10 px-3 bg-zinc-100 hover:bg-zinc-200 border-2 border-black rounded-2xl flex items-center gap-1.5 text-xs font-black text-black transition-colors shadow-neo-xs"
              title="匯出篩選日誌 JSON"
            >
              <Download size={14} />
              <span className="hidden sm:inline">JSON</span>
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

      {/* 🛡️ Latest Maintainer Login Session Widget */}
      {(lastMaintainerLogin || clientInfo) && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border-4 border-black rounded-[2rem] p-4 sm:p-5 shadow-neo space-y-2 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-purple-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-black text-white rounded-xl text-xs">
                🛡️
              </span>
              <h3 className="font-black text-sm italic tracking-tight text-purple-950">
                {isEn ? 'Latest Maintainer Login Session (Audited)' : '最新後台維護者登入日誌審核'}
              </h3>
              <span className="bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                SECURITY LOG
              </span>
            </div>
            <span className="font-mono text-xs font-black text-purple-800">
              🕒 {lastMaintainerLogin?.time || clientInfo?.timestamp?.replace('T', ' ').slice(0, 19) || '剛剛'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-white/80 border-2 border-purple-200 rounded-xl p-2.5">
              <span className="text-[10px] font-black uppercase text-purple-400 block">
                {isEn ? 'Maintainer Name' : '使用者名字'}
              </span>
              <span className="font-black text-xs text-black flex items-center gap-1 mt-0.5">
                <User size={12} className="text-purple-600" />
                {lastMaintainerLogin?.userName || maintainerName || '系統維護者'}
              </span>
            </div>

            <div className="bg-white/80 border-2 border-purple-200 rounded-xl p-2.5">
              <span className="text-[10px] font-black uppercase text-purple-400 block">
                {isEn ? 'IP Address' : '來源 IP 地址'}
              </span>
              <span className="font-mono font-black text-xs text-purple-900 flex items-center gap-1 mt-0.5">
                <Globe size={12} className="text-purple-600" />
                {lastMaintainerLogin?.ip || clientInfo?.ip || '未知 IP'}
              </span>
            </div>

            <div className="bg-white/80 border-2 border-purple-200 rounded-xl p-2.5">
              <span className="text-[10px] font-black uppercase text-purple-400 block">
                {isEn ? 'Location' : '地理登入位置'}
              </span>
              <span className="font-black text-xs text-zinc-900 flex items-center gap-1 mt-0.5 truncate">
                <MapPin size={12} className="text-rose-500 shrink-0" />
                <span className="truncate">{lastMaintainerLogin?.location || clientInfo?.location || 'Direct / Local'}</span>
              </span>
            </div>

            <div className="bg-white/80 border-2 border-purple-200 rounded-xl p-2.5">
              <span className="text-[10px] font-black uppercase text-purple-400 block">
                {isEn ? 'OS & Browser' : '系統與瀏覽器'}
              </span>
              <span className="font-mono text-xs font-bold text-zinc-700 flex items-center gap-1 mt-0.5 truncate">
                <Laptop size={12} className="text-indigo-600 shrink-0" />
                <span className="truncate">
                  {lastMaintainerLogin?.os || clientInfo?.os || 'OS'} · {lastMaintainerLogin?.browser || clientInfo?.browser || 'Browser'}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

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

      {/* 🔍 Search & Category Filter & View Mode Toolbar (Kibana Discover Bar) */}
      <div className="bg-white border-4 border-black rounded-[2rem] p-4 shadow-neo space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search user name, IP, location, action, message, food...' : '搜尋使用者名稱、IP、位置、日誌類型、餐點品項或輸入內容...'}
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

          {/* View Mode Switcher (Kibana Table vs Stream Cards) */}
          <div className="flex items-center gap-1 bg-zinc-100 border-2 border-black rounded-2xl p-1 shrink-0">
            <button
              onClick={() => setViewMode('kibana')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                viewMode === 'kibana'
                  ? 'bg-black text-white shadow-neo-xs'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              <TableIcon size={14} />
              <span>{isEn ? 'Kibana List' : 'Kibana 列表'}</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                viewMode === 'cards'
                  ? 'bg-black text-white shadow-neo-xs'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              <LayoutList size={14} />
              <span>{isEn ? 'Cards Stream' : '卡片流'}</span>
            </button>
          </div>

          {/* Records Counter */}
          <div className="bg-zinc-100 border-2 border-black rounded-2xl px-4 py-2 flex items-center justify-between sm:justify-center gap-2 shrink-0 font-bold text-xs">
            <span className="text-zinc-500">{isEn ? 'Hits:' : '符合筆數：'}</span>
            <span className="font-mono font-black text-sm bg-black text-white px-2 py-0.5 rounded-lg">
              {filteredLogs.length} / {normalizedLogs.length}
            </span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-1">
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

      {/* ==========================================
          📋 1. KIBANA DISCOVER LIST TABLE VIEW (Default)
          ========================================== */}
      {viewMode === 'kibana' && (
        <div className="bg-white border-4 border-black rounded-[2.5rem] overflow-hidden shadow-neo">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="text-5xl mb-2">🔍</div>
              <h3 className="text-lg font-black italic">{isEn ? 'No Matching Logs Found' : '查無符合條件的運作日誌'}</h3>
              <p className="text-xs font-bold text-zinc-400 max-w-sm mx-auto">
                {isEn ? 'Try adjusting your search keywords or switching category filters.' : '請嘗試更換搜尋關鍵字或點選「全部日誌」分類。'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900 text-white font-mono text-[11px] font-black uppercase tracking-wider select-none">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[140px]">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-accent" />
                        Time (@timestamp)
                      </span>
                    </th>
                    <th className="py-3 px-3 min-w-[120px]">
                      <span>Action (Type)</span>
                    </th>
                    <th className="py-3 px-3 min-w-[140px]">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-accent" />
                        User / Name
                      </span>
                    </th>
                    <th className="py-3 px-3 min-w-[180px]">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-rose-400" />
                        Location / IP
                      </span>
                    </th>
                    <th className="py-3 px-4 min-w-[280px]">
                      <span>Message / Payload Preview</span>
                    </th>
                    <th className="py-3 px-3 w-16 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-sans text-xs">
                  {filteredLogs.map((log, index) => {
                    const { time, userName, userId, type, input, aiResult, output, source, ip, location, device } = log;
                    const isExpanded = expandedRowIds.has(index);
                    const currentTab = rowInspectorTab[index] || 'table';

                    const isLogin = type.includes('登入') || type.includes('Login') || userId === 'Maintainer';
                    const isAlert = type.includes('異常') || output.includes('失敗') || type.includes('報警');
                    const isPhoto = type.includes('照片') || type.includes('Photo');
                    const isText = type.includes('文字') || type.includes('Text');
                    const isWater = type.includes('水') || type.includes('Water') || input.includes('水');
                    const isPortion = type.includes('倍') || type.includes('半') || type.includes('份量');
                    const isGoal = type.includes('目標');
                    const isSync = type.includes('Web') || type.includes('同步');

                    // Badge Styling
                    let badgeClass = 'bg-zinc-100 text-zinc-800 border-zinc-300';
                    if (isLogin) badgeClass = 'bg-purple-100 text-purple-900 border-purple-400 font-black';
                    else if (isAlert) badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-black';
                    else if (isPhoto) badgeClass = 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 font-black';
                    else if (isText) badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 font-black';
                    else if (isWater) badgeClass = 'bg-cyan-100 text-cyan-800 border-cyan-300 font-black';
                    else if (isPortion) badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-black';
                    else if (isGoal) badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black';
                    else if (isSync) badgeClass = 'bg-teal-100 text-teal-800 border-teal-300 font-black';

                    // Row Background
                    let rowBg = 'hover:bg-amber-50/40';
                    if (isLogin) rowBg = 'bg-purple-50/40 hover:bg-purple-100/50';
                    else if (isAlert) rowBg = 'bg-rose-50/40 hover:bg-rose-100/50';

                    // Prepare document object for JSON tab
                    const docJson = {
                      "@timestamp": time,
                      "event": { "action": type, "source": source },
                      "user": { "name": userName, "id": userId },
                      "client": { "ip": ip || null, "geo": { "location": location || null }, "device": device || null },
                      "message": { "input": input || null, "analysis": aiResult || null, "output": output || null }
                    };

                    return (
                      <React.Fragment key={index}>
                        <tr 
                          onClick={() => toggleRowExpansion(index)}
                          className={`cursor-pointer transition-colors ${rowBg} ${isExpanded ? 'bg-zinc-100/80 font-medium' : ''}`}
                        >
                          {/* Expand Toggle */}
                          <td className="py-3 px-3 text-center text-zinc-400">
                            {isExpanded ? (
                              <ChevronDown size={16} className="text-black font-black mx-auto" />
                            ) : (
                              <ChevronRight size={16} className="text-zinc-400 mx-auto" />
                            )}
                          </td>

                          {/* Time */}
                          <td className="py-3 px-3 font-mono text-[11px] font-bold text-zinc-700 whitespace-nowrap">
                            {time}
                          </td>

                          {/* Action Badge */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${badgeClass}`}>
                              {isLogin && '🛡️'}
                              {isAlert && '🚨'}
                              {isPhoto && '📸'}
                              {isText && '💬'}
                              {isWater && '🚰'}
                              {isPortion && '⚖️'}
                              {isSync && '⚡'}
                              {type || '系統操作'}
                            </span>
                          </td>

                          {/* User Name */}
                          <td className="py-3 px-3 font-bold text-black whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span className="truncate max-w-[120px] font-black">{userName}</span>
                              {userId && userId !== 'user' && (
                                <span className="font-mono text-[9px] text-zinc-400 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">
                                  {userId.length > 8 ? userId.slice(-4) : userId}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Location / IP */}
                          <td className="py-3 px-3 font-mono text-[11px] text-zinc-700 whitespace-nowrap">
                            {ip || location ? (
                              <div className="space-y-0.5">
                                {location && (
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-800">
                                    <MapPin size={10} className="text-rose-500 shrink-0" />
                                    <span className="truncate max-w-[140px]">{location}</span>
                                  </div>
                                )}
                                {ip && (
                                  <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                    <Globe size={10} className="text-purple-600 shrink-0" />
                                    <span>{ip}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-zinc-400 italic text-[10px]">— (LINE Bot / Cloud)</span>
                            )}
                          </td>

                          {/* Message Preview */}
                          <td className="py-3 px-4 max-w-md xl:max-w-2xl 2xl:max-w-4xl">
                            <div className="font-mono text-[11px] text-zinc-800 truncate">
                              {input ? (
                                <span><strong className="text-black">{input}</strong></span>
                              ) : null}
                              {aiResult ? (
                                <span className="text-purple-700 ml-1">➔ {aiResult}</span>
                              ) : null}
                              {output && !aiResult ? (
                                <span className="text-zinc-500 ml-1">➔ {output}</span>
                              ) : null}
                              {!input && !aiResult && !output && (
                                <span className="text-zinc-400 italic">—</span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => copyToClipboard(JSON.stringify(docJson, null, 2), `row-${index}`)}
                              className="p-1.5 hover:bg-black hover:text-white rounded-lg border border-black/20 text-zinc-600 transition-colors text-xs font-mono inline-flex items-center"
                              title="複製 JSON 格式"
                            >
                              {copiedId === `row-${index}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                          </td>
                        </tr>

                        {/* 📑 Kibana Expanded Document Inspector */}
                        {isExpanded && (
                          <tr className="bg-zinc-50/90 border-b-2 border-black">
                            <td colSpan={7} className="p-4 sm:p-6">
                              <div className="bg-white border-2 border-black rounded-2xl shadow-neo-sm overflow-hidden space-y-3">
                                {/* Inspector Header Tabs */}
                                <div className="bg-zinc-100 border-b-2 border-black px-4 py-2 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-xs uppercase tracking-wider text-black flex items-center gap-1">
                                      <Terminal size={14} className="text-accent" />
                                      Document Inspector
                                    </span>
                                    <div className="flex items-center bg-zinc-200 border border-black rounded-xl p-0.5 text-xs">
                                      <button
                                        onClick={() => setRowTab(index, 'table')}
                                        className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all ${
                                          currentTab === 'table'
                                            ? 'bg-black text-white'
                                            : 'text-zinc-600 hover:text-black'
                                        }`}
                                      >
                                        Table (欄位)
                                      </button>
                                      <button
                                        onClick={() => setRowTab(index, 'json')}
                                        className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all ${
                                          currentTab === 'json'
                                            ? 'bg-black text-white'
                                            : 'text-zinc-600 hover:text-black'
                                        }`}
                                      >
                                        JSON (原始)
                                      </button>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => copyToClipboard(JSON.stringify(docJson, null, 2), `doc-${index}`)}
                                    className="bg-black text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-neo-xs hover:bg-accent hover:text-black transition-all"
                                  >
                                    {copiedId === `doc-${index}` ? <Check size={12} /> : <Copy size={12} />}
                                    {copiedId === `doc-${index}` ? 'Copied' : 'Copy JSON'}
                                  </button>
                                </div>

                                {/* Inspector Content */}
                                <div className="p-4">
                                  {currentTab === 'table' ? (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left font-mono text-xs border border-zinc-200 rounded-xl overflow-hidden">
                                        <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[10px] uppercase">
                                          <tr>
                                            <th className="py-1.5 px-3 w-48">Field</th>
                                            <th className="py-1.5 px-3">Value</th>
                                            <th className="py-1.5 px-3 w-16 text-right">Action</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                          {[
                                            { key: '@timestamp', val: time },
                                            { key: 'event.action', val: type },
                                            { key: 'user.name', val: userName },
                                            { key: 'user.id', val: userId },
                                            { key: 'client.ip', val: ip || '—' },
                                            { key: 'client.geo.location', val: location || '—' },
                                            { key: 'client.device', val: device || '—' },
                                            { key: 'message.input', val: input || '—' },
                                            { key: 'message.analysis', val: aiResult || '—' },
                                            { key: 'message.output', val: output || '—' },
                                            { key: 'source', val: source || 'LINE Bot' }
                                          ].map((field) => (
                                            <tr key={field.key} className="hover:bg-zinc-50">
                                              <td className="py-2 px-3 font-bold text-zinc-500 whitespace-nowrap">{field.key}</td>
                                              <td className="py-2 px-3 font-medium text-black break-words max-w-xl xl:max-w-4xl">{field.val}</td>
                                              <td className="py-2 px-3 text-right">
                                                {field.val && field.val !== '—' && (
                                                  <button
                                                    onClick={() => copyToClipboard(field.val, `${index}-${field.key}`)}
                                                    className="p-1 text-zinc-400 hover:text-black transition-colors"
                                                    title="複製此欄位"
                                                  >
                                                    {copiedId === `${index}-${field.key}` ? (
                                                      <Check size={12} className="text-emerald-500" />
                                                    ) : (
                                                      <Copy size={12} />
                                                    )}
                                                  </button>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="bg-zinc-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto border-2 border-black max-h-80 custom-scrollbar">
                                      <pre>{JSON.stringify(docJson, null, 2)}</pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          🗂️ 2. CARDS STREAM VIEW (Alternative View)
          ========================================== */}
      {viewMode === 'cards' && (
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
              const { time, userName, userId, type, input, aiResult, output, source, ip, location } = item;
              const isLogin = type.includes('登入') || type.includes('Login') || userId === 'Maintainer';
              const isAlert = type.includes('異常') || output.includes('失敗') || type.includes('報警');
              const isPhoto = type.includes('照片') || type.includes('Photo');
              const isText = type.includes('文字') || type.includes('Text') || type.includes('對話');
              const isWater = type.includes('水') || type.includes('Water') || input.includes('水');
              const isPortion = type.includes('倍') || type.includes('半') || type.includes('份量');
              const isGoal = type.includes('目標');
              const isSync = type.includes('Web') || type.includes('同步');

              // Distinct Operation Badge Color
              let badgeBg = 'bg-zinc-100 text-zinc-800 border-zinc-300';
              if (isLogin) badgeBg = 'bg-purple-100 text-purple-900 border-purple-400 font-black';
              else if (isAlert) badgeBg = 'bg-rose-100 text-rose-800 border-rose-300 font-black';
              else if (isPhoto) badgeBg = 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 font-black';
              else if (isText) badgeBg = 'bg-blue-100 text-blue-800 border-blue-300 font-black';
              else if (isWater) badgeBg = 'bg-cyan-100 text-cyan-800 border-cyan-300 font-black';
              else if (isPortion) badgeBg = 'bg-amber-100 text-amber-900 border-amber-300 font-black';
              else if (isGoal) badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black';
              else if (isSync) badgeBg = 'bg-teal-100 text-teal-800 border-teal-300 font-black';

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white border-4 border-black rounded-[2rem] p-4 sm:p-5 shadow-neo hover:shadow-neo-lg transition-all space-y-3 ${isAlert ? 'border-l-8 border-l-rose-500' : ''} ${isLogin ? 'border-l-8 border-l-purple-600' : ''}`}
                >
                  {/* Header Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-zinc-100 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono font-black text-zinc-600 flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded-lg border border-black/10">
                        <Clock size={12} />
                        {time}
                      </span>
                      <span className={`text-[10px] uppercase px-2.5 py-0.5 rounded-full border ${badgeBg}`}>
                        {isLogin && '🛡️ '}
                        {type || '系統操作'}
                      </span>
                      {source && (
                        <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 rounded-md">
                          {source}
                        </span>
                      )}
                    </div>

                    {/* User Identifier + Location */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-black text-black bg-accent/30 border border-black/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <User size={12} />
                        {userName}
                      </span>
                      {location && (
                        <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <MapPin size={10} /> {location}
                        </span>
                      )}
                      {ip && (
                        <span className="text-[10px] font-mono text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                          🌐 {ip}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">
                        {isEn ? 'User Input / Trigger' : '用戶輸入 / 觸發事件'}
                      </span>
                      <div className="bg-zinc-50 border-2 border-black/10 rounded-xl p-3 font-mono text-xs font-bold text-zinc-800 break-words leading-relaxed">
                        {input || '—'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">
                        {isEn ? 'AI Analysis / Output' : 'AI 辨識結果 / 處理輸出'}
                      </span>
                      <div className="bg-accent/10 border-2 border-black/10 rounded-xl p-3 text-xs font-bold text-zinc-900 break-words leading-relaxed">
                        {aiResult && (
                          <div className="font-mono font-black text-xs text-black mb-1">
                            {aiResult}
                          </div>
                        )}
                        {output ? (
                          <div className="text-zinc-700 italic">
                            {output}
                          </div>
                        ) : (
                          !aiResult && <span className="text-zinc-400 italic font-normal">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Footer Spacer */}
      <div className="h-12" />
    </div>
  );
}
