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
  Download,
  X
} from 'lucide-react';
import NeoButton from './NeoButton';

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxmQC8f0NxOKRAIuLTSTVC-Vinf9lmU0cnb1akR5oKUEYD-3h7XjFV8Zm_LPkv_kdQo/exec';
const DEFAULT_MAINTAINER_USER = 'Winnie';
const PERMANENT_TOKEN_KEY = 'daily_diet_maintainer_token_v2';
const CLIENT_INFO_KEY = 'daily_diet_maintainer_client_info';
const MAINTAINER_NAME_KEY = 'daily_diet_maintainer_name';

// 統一時間戳記格式化工具：保證所有日誌一律為 YYYY-MM-DD HH:mm:ss
const formatUnifiedTimestamp = (rawTime) => {
  if (!rawTime) return '';
  const str = String(rawTime).trim();
  // 若已經是標準 YYYY-MM-DD HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(str)) {
    return str;
  }
  // 若缺少秒數 YYYY-MM-DD HH:mm
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(str)) {
    return `${str}:00`;
  }
  // 若僅有時間 HH:mm:ss 或 HH:mm（如 GAS recentErrors）
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const parts = str.split(':');
    const hh = parts[0].padStart(2, '0');
    const min = parts[1].padStart(2, '0');
    const ss = (parts[2] || '00').padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }
  // 若為 ISO 8601 或可解析字串
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }
  return str;
};

// Helper to safely normalize log records (Supports both Object format and Array format from GAS)
const normalizeLog = (item) => {
  if (!item) return null;
  let raw = {};
  if (Array.isArray(item)) {
    raw = {
      time: item[0],
      userName: item[1],
      userId: item[2],
      type: item[3],
      input: item[4],
      aiResult: item[5],
      output: item[6],
      ip: item[7],
      location: item[8],
      device: '',
      source: ''
    };
  } else {
    raw = { ...item };
  }

  const type = String(raw.type || raw.op || '系統操作');
  const userId = String(raw.userId || raw.rawUserId || '');
  const caller = String(raw.caller || raw.callerName || '');
  let userName = String(raw.userName || caller || raw.name || '');
  const inputStr = String(raw.input || raw.query || '');
  const aiResultStr = String(raw.aiResult || raw.nutrients || '');
  const outputStr = String(raw.output || raw.result || '');

  let ip = raw.ip || '';
  let location = raw.location || '';
  let device = raw.device || '';

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

  // 決定來源通道 (LINE 智慧助理 vs Web 飲食管家 vs 系統核心)
  const rawSource = String(raw.source || '');
  const isWeb = 
    type.startsWith('Web') || 
    type.includes('維護者') || 
    location.includes('Web') || 
    rawSource.includes('Web') || 
    outputStr.includes('Web') ||
    userId === 'Maintainer' ||
    userId.startsWith('web_');

  const isLine = 
    !isWeb && (
      userId.startsWith('U') || 
      type.includes('LINE') || 
      location.includes('LINE') || 
      rawSource.includes('LINE') ||
      ['記餐', '喝水', '常用', '總結', '清單', '週報', '語言', '性格', '份量', '倍數', '手冊', '引導', '撤回'].some(t => type.includes(t))
    );

  let source = '⚡ 系統核心';
  let channel = 'System';
  if (isWeb) {
    source = '🌐 Web 飲食管家';
    channel = 'Web';
    if (!location || location === '-' || location.includes('Cloud')) {
      location = 'Web 飲食管家';
    }
  } else if (isLine) {
    source = '🟢 LINE 智慧助理';
    channel = 'LINE';
    if (!location || location === '-' || location.includes('Cloud')) {
      location = 'LINE 智慧助理';
    }
  } else {
    if (!location || location === '-') {
      location = 'Cloud 雲端核心';
    }
  }

  // Web 用戶 caller 的名稱拿不到就用他的名字（自動清理歷史殘留的「用戶 (user)」）
  let finalUserName = userName;
  if (isWeb || finalUserName.includes('(user)') || finalUserName.includes('(ient)')) {
    if (!finalUserName || ['Web 用戶', '用戶', '訪客', 'web_user', 'default_user', 'web_client', '用戶 (user)', '用戶 (ient)'].includes(finalUserName) || finalUserName.startsWith('用戶 (')) {
      if (userId && !userId.startsWith('U') && !['web_user', 'default_user', 'web_client', 'API-Gateway', 'unknown', 'user', 'ient'].includes(userId)) {
        finalUserName = userId; // 用他的名字
      } else if (raw.name) {
        finalUserName = raw.name;
      } else {
        const currentName = (typeof localStorage !== 'undefined' && (localStorage.getItem('line_user_name') || localStorage.getItem('user_name'))) || '';
        finalUserName = currentName || 'Web 用戶';
      }
    }
  }

  return {
    time: formatUnifiedTimestamp(raw.time),
    userName: String(finalUserName || (isWeb ? 'Web 用戶' : (isLine ? 'LINE 用戶' : '系統服務'))),
    userId: String(raw.rawUserId || raw.userId || 'user'),
    type: type,
    input: inputStr,
    aiResult: aiResultStr,
    output: outputStr,
    source,
    channel,
    ip,
    location,
    device
  };
};

const safeGetStorage = (key) => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch (e) {
    return null;
  }
};

const safeSetStorage = (key, val) => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
  } catch (e) {}
};

const safeRemoveStorage = (key) => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch (e) {}
};

export default function LogMonitorDashboard({ onBack, lang = 'zh' }) {
  const isEn = lang === 'en';

  // 🔐 Permanent Pass Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(safeGetStorage(PERMANENT_TOKEN_KEY));
  });
  const [permanentToken, setPermanentToken] = useState(() => {
    return safeGetStorage(PERMANENT_TOKEN_KEY) || '';
  });
  const [maintainerName, setMaintainerName] = useState(() => {
    return safeGetStorage(MAINTAINER_NAME_KEY) || '';
  });
  const [maintainerNameInput, setMaintainerNameInput] = useState(() => {
    return safeGetStorage(MAINTAINER_NAME_KEY) || '';
  });
  const [clientInfo, setClientInfo] = useState(() => {
    try {
      const raw = safeGetStorage(CLIENT_INFO_KEY);
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
  const [retentionDays, setRetentionDays] = useState(30); // 預設留存 30 天 (1個月)
  const [logLimit, setLogLimit] = useState(1000); // 預設讀取上限 1000 筆
  const [viewMode, setViewMode] = useState('kibana'); // 'kibana' (table) or 'cards' (stream)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedActionType, setSelectedActionType] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(10); // seconds (0 = off)
  const [countdown, setCountdown] = useState(10);
  const [copiedId, setCopiedId] = useState(null);

  // 🎯 操作類型切換與聯動
  const handleSelectActionType = (actType) => {
    setSelectedActionType(actType);
    if (actType !== 'ALL') {
      setSelectedCategory('ALL'); // 避免大類別互斥過濾
    }
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    if (catId !== 'ALL') {
      setSelectedActionType('ALL'); // 切換大類別時重設細部操作類型
    }
  };

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
      userName: maintainerName || 'Admin',
      timestamp: new Date().toISOString() 
    };
  };

  // 📡 Send Maintainer Login Audit to GAS Backend
  const recordMaintainerAuditToBackend = async (info, token, userNameOverride) => {
    try {
      setIsRegisteringAudit(true);
      const name = userNameOverride || maintainerName || info.userName || 'Admin';
      const currentToken = token || permanentToken || safeGetStorage(PERMANENT_TOKEN_KEY) || '';
      const params = new URLSearchParams({
        action: 'recordMaintainerLogin',
        userName: name,
        ip: info.ip || '',
        location: info.location || '',
        device: info.device || '',
        browser: info.browser || '',
        os: info.os || '',
        token: currentToken
      });
      await fetch(`${GAS_API_URL}?${params.toString()}`);
      console.log('✅ [Maintainer Audit] 登入日誌已記錄 (含使用者名字、位置與 IP)');
    } catch (err) {
      console.warn('⚠️ 記錄維護者登入日誌失敗:', err);
    } finally {
      setIsRegisteringAudit(false);
    }
  };

  // Handle Login & Issue Permanent Pass (透過後端 GAS 進行動態身分安全校驗)
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    const cleanInput = passwordInput.trim();
    const cleanName = maintainerNameInput.trim() || DEFAULT_MAINTAINER_USER;

    if (!cleanInput) {
      setAuthError(isEn ? 'Please enter password' : '請輸入維護者密碼');
      return;
    }

    setIsRegisteringAudit(true);
    setAuthError('');

    try {
      let data = null;
      try {
        // 優先以 POST 發送，避免維護者密碼被記錄至瀏覽器歷史或 GET URL 日誌中
        const postRes = await fetch(GAS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'verifyMaintainerAuth',
            user: cleanName,
            pass: cleanInput,
            timestamp: Date.now()
          })
        });
        data = await postRes.json();
      } catch (postErr) {
        // 若 POST 因網路環境異常，優雅 fallback 至 GET
        const verifyUrl = `${GAS_API_URL}?action=verifyMaintainerAuth&user=${encodeURIComponent(cleanName)}&pass=${encodeURIComponent(cleanInput)}&_t=${Date.now()}`;
        const res = await fetch(verifyUrl);
        data = await res.json();
      }

      if (data && data.status === 'ok' && data.authenticated) {
        const validatedToken = data.token || cleanInput;
        const validatedUser = data.userName || cleanName;

        safeSetStorage(PERMANENT_TOKEN_KEY, validatedToken);
        safeSetStorage(MAINTAINER_NAME_KEY, validatedUser);
        setPermanentToken(validatedToken);
        setMaintainerName(validatedUser);
        setIsAuthenticated(true);
        setAuthError('');

        // Collect device & IP info and record to backend
        const info = await collectDeviceInfo();
        info.userName = validatedUser;
        safeSetStorage(CLIENT_INFO_KEY, JSON.stringify(info));
        setClientInfo(info);

        // Instantly inject a local login record so user immediately sees their own login log
        const nowStr = new Date().toLocaleString('zh-TW', { hour12: false });
        const instantLoginLog = {
          time: nowStr,
          userName: validatedUser,
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

        // Report to GAS with verified token
        await recordMaintainerAuditToBackend(info, validatedToken, validatedUser);

        // Fetch dashboard data with new token
        fetchDashboardData(false, retentionDays, logLimit, validatedToken);
      } else {
        setAuthError(data.message || (isEn ? 'Incorrect account or password. Access denied.' : '帳號或密碼不正確，存取被拒絕。'));
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
      }
    } catch (err) {
      console.error('維護者身分驗證失敗:', err);
      setAuthError(isEn ? 'Network error or service unavailable. Please retry.' : '連線失敗或後端未回應，請檢查網路後再試。');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    } finally {
      setIsRegisteringAudit(false);
    }
  };

  // Revoke Permanent Pass (Sign out)
  const handleRevokePermanentPass = () => {
    safeRemoveStorage(PERMANENT_TOKEN_KEY);
    safeRemoveStorage(CLIENT_INFO_KEY);
    safeRemoveStorage(MAINTAINER_NAME_KEY);
    safeRemoveStorage('maintainer_custom_pass');
    safeRemoveStorage('daily_diet_maintainer_permanent_token');
    try { sessionStorage.removeItem('maintainer_auth'); } catch (e) {}
    setIsAuthenticated(false);
    setPermanentToken('');
    setClientInfo(null);
    setPasswordInput('');
  };

  // Fetch Dashboard Logs and Quota from GAS (支援自訂留存天數與筆數，攜帶後端權杖)
  const fetchDashboardData = async (silent = false, customDays = retentionDays, customLimit = logLimit, explicitToken = null) => {
    if (!silent) setIsLoading(true);
    setFetchError(null);
    try {
      const activeToken = explicitToken || permanentToken || safeGetStorage(PERMANENT_TOKEN_KEY) || '';
      const targetUrl = `${GAS_API_URL}?action=getRecentLogs&limit=${customLimit}&days=${customDays}&token=${encodeURIComponent(activeToken)}&_t=${Date.now()}`;
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();

      if (data.code === 'UNAUTHORIZED' || (data.status === 'error' && String(data.message).includes('Forbidden'))) {
        handleRevokePermanentPass();
        setAuthError(isEn ? 'Session expired or invalid token. Please log in again.' : '登入憑證已失效或未經授權，請重新輸入密碼登入。');
        return;
      }

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

        setRawLogs((prev) => {
          const seen = new Set();
          const combined = [];
          for (const item of (fetchedLogs || [])) {
            const timeStr = String(item.time || item[0] || '').trim();
            const userStr = String(item.userId || item.userName || item[1] || item[2] || '').trim();
            const typeStr = String(item.type || item[3] || '').trim();
            const inputStr = String(item.input || item[4] || '').slice(0, 30).trim();
            const k = `${timeStr}_${userStr}_${typeStr}_${inputStr}`;
            if (!seen.has(k)) {
              seen.add(k);
              combined.push(item);
            }
          }
          // 保留之前已載入的歷史日誌，防止任何短暫中斷導致日誌消失
          for (const item of (prev || [])) {
            const timeStr = String(item.time || item[0] || '').trim();
            const userStr = String(item.userId || item.userName || item[1] || item[2] || '').trim();
            const typeStr = String(item.type || item[3] || '').trim();
            const inputStr = String(item.input || item[4] || '').slice(0, 30).trim();
            const k = `${timeStr}_${userStr}_${typeStr}_${inputStr}`;
            if (!seen.has(k)) {
              seen.add(k);
              combined.push(item);
            }
          }
          combined.sort((a, b) => {
            const timeA = String(a.time || a[0] || '');
            const timeB = String(b.time || b[0] || '');
            return timeB.localeCompare(timeA);
          });
          return combined;
        });

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
          safeSetStorage(CLIENT_INFO_KEY, JSON.stringify(info));
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

  // Normalized & Filtered Logs
  const normalizedLogs = useMemo(() => {
    const list = (!rawLogs || !rawLogs.length) ? [] : rawLogs.map(normalizeLog).filter(Boolean);

    // 整合模型異常與伺服器故障通報至日誌列表，保證格式、調用者與時間格式完全統一
    const recentErrors = Array.isArray(aiQuota?.recentErrors) ? aiQuota.recentErrors : [];
    if (recentErrors.length > 0) {
      recentErrors.forEach((err) => {
        const fullTime = formatUnifiedTimestamp(err.time);
        const errDesc = `[${err.model || 'Gemini'}] ${err.error || 'Request Error'}`;
        const exists = list.some((l) => l.output && l.output.includes(err.error));
        if (!exists) {
          const isWebError = (err.operation && err.operation.includes('Web')) || (err.model && err.model.includes('Web'));
          let callerName = err.caller || err.userName || err.name || '';
          if (!callerName && err.userId && !err.userId.startsWith('U') && !['API-Gateway', 'web_user', 'default_user'].includes(err.userId)) {
            callerName = err.userId; // Web 用戶 caller 的名稱拿不到就用他的名字
          }
          if (!callerName) {
            callerName = err.userId ? `用戶 (${err.userId.slice(-4)})` : (isWebError ? 'Web 用戶' : '系統服務 (AI Gateway)');
          }
          const callerId = err.userId || 'API-Gateway';
          const opName = err.operation || '模型運算';
          list.unshift({
            time: fullTime,
            userName: callerName,
            userId: callerId,
            type: '模型調用異常',
            input: `調用操作: ${opName} (${err.model || 'Gemini'})`,
            aiResult: '',
            output: `⚠️ 錯誤詳情: ${errDesc}`,
            source: 'Gemini API / Cloud',
            ip: '',
            location: 'Google AI Studio',
            device: 'Cloud Function'
          });
        }
      });
    }

    // 依統一時間戳記倒序排序（最新時間排在最上方）
    list.sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return String(b.time).localeCompare(String(a.time));
    });

    return list;
  }, [rawLogs, aiQuota]);

  // Filter Categories
  const categories = useMemo(() => {
    const errorCount = normalizedLogs.filter(log => {
      const { type = '', output = '' } = log;
      return type.includes('異常') || type.includes('Alert') || type.includes('錯誤') || output.includes('失敗') || output.includes('異常');
    }).length;

    return [
      { id: 'ALL', label: isEn ? 'All Logs' : '全部日誌' },
      { id: 'LOGIN', label: isEn ? '🛡️ Logins' : '🛡️ 後台登入' },
      { 
        id: 'ALERT', 
        label: isEn 
          ? `🚨 Errors${errorCount > 0 ? ` (${errorCount})` : ''}` 
          : `🚨 異常通報${errorCount > 0 ? ` (${errorCount})` : ''}`
      },
      { id: 'PHOTO', label: isEn ? '📸 Photo' : '📸 照片辨識' },
      { id: 'TEXT', label: isEn ? '💬 Text' : '💬 文字記餐' },
      { id: 'WATER', label: isEn ? '🚰 Water' : '🚰 喝水記錄' },
      { id: 'PORTION', label: isEn ? '⚖️ Portion' : '⚖️ 份量調整' },
      { id: 'SYNC', label: isEn ? '⚡ Web Sync' : '⚡ Web 同步' },
      { id: 'GOAL', label: isEn ? '🎯 Goals' : '🎯 體態目標' },
    ];
  }, [isEn, normalizedLogs]);

  // ⚡ 動態統計所有日誌中的具體操作類型及其計數 (支援所有自訂操作類型)
  const allActionTypes = useMemo(() => {
    if (!normalizedLogs || !normalizedLogs.length) return [];
    const countMap = {};
    normalizedLogs.forEach((log) => {
      const t = (log.type || '未分類').trim();
      countMap[t] = (countMap[t] || 0) + 1;
    });
    return Object.entries(countMap).sort((a, b) => b[1] - a[1]);
  }, [normalizedLogs]);

  // 👥 動態統計所有日誌中的具體用戶及其計數 (支援依用戶/人名精準篩選)
  const allUsers = useMemo(() => {
    if (!normalizedLogs || !normalizedLogs.length) return [];
    const countMap = {};
    normalizedLogs.forEach((log) => {
      const u = (log.userName || log.userId || (isEn ? 'Unknown' : '未知用戶')).trim();
      countMap[u] = (countMap[u] || 0) + 1;
    });
    return Object.entries(countMap).sort((a, b) => b[1] - a[1]);
  }, [normalizedLogs, isEn]);

  const filteredLogs = useMemo(() => {
    if (!normalizedLogs || !normalizedLogs.length) return [];
    return normalizedLogs.filter((log) => {
      const { time, userName, userId, type, input, aiResult, output, source, ip, location } = log;

      // 0. 用戶人員篩選 (User / Caller Filter)
      if (selectedUser !== 'ALL') {
        const u = (userName || userId || '').trim();
        if (u !== selectedUser) return false;
      }

      // 1. 精確操作類型篩選 (Action Type Filter - 支援全量操作類型)
      if (selectedActionType !== 'ALL') {
        const logType = (type || '未分類').trim();
        if (logType !== selectedActionType) return false;
      }

      // 2. 既有大分類篩選 (Category matching)
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

      // 3. 關鍵字全文搜尋 (包含日誌內容、對話輸入、AI分析結果、回傳內容、餐點名稱、使用者等)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullContent = `${time} ${userName} ${userId} ${type} ${input} ${aiResult} ${output} ${source} ${ip} ${location}`.toLowerCase();
        if (!fullContent.includes(q)) return false;
      }

      return true;
    });
  }, [normalizedLogs, selectedCategory, selectedActionType, selectedUser, searchQuery]);

  // ⚡ 智能對齊：從實際日誌中統計 AI 運算記錄，確保即使後端計數器重置或有前序重試，成功率亦能精準反映現況
  // 遵守 React 頂層 Hooks 調用規則：必須置於任何條件 return 之前
  const logAiStats = useMemo(() => {
    let success = 0;
    let fail = 0;
    (normalizedLogs || []).forEach(log => {
      const t = String(log.type || '');
      const out = String(log.output || '');
      const isAiOp = t.includes('辨識') || t.includes('記餐') || t.includes('AI') || t.includes('智能') || t.includes('模型');
      if (isAiOp) {
        if (t.includes('異常') || t.includes('失敗') || out.includes('失敗') || out.includes('異常')) {
          fail++;
        } else {
          success++;
        }
      }
    });
    return { success, fail };
  }, [normalizedLogs]);

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
                    placeholder={isEn ? 'Enter account' : '請輸入帳號'}
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
  const successCount = Math.max(aiQuota?.successCount || 0, logAiStats.success);
  const failCount = Math.max(aiQuota?.failCount || 0, logAiStats.fail);
  const totalCalls = successCount + failCount;
  const successRate = totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 100;

  const quotaUsed = Math.max(aiQuota?.used || 0, totalCalls);
  const quotaMax = aiQuota?.limit || aiQuota?.max || 1500;
  const quotaPercent = Math.min(Math.round((quotaUsed / quotaMax) * 100), 100);
  const currentRpm = aiQuota?.currentRpm || aiQuota?.rpm || 0;
  const maxRpm = aiQuota?.rpmLimit || aiQuota?.maxRpm || 15;
  const rpmPercent = Math.min(Math.round((currentRpm / maxRpm) * 100), 100);
  const models = aiQuota?.models || {};
  const recentErrors = Array.isArray(aiQuota?.recentErrors) ? aiQuota.recentErrors : [];

  return (
    <div className="min-h-screen bg-[#FFFDF5] p-3 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden space-y-5">
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
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-400 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-neo-xs">
                  <span>🛡️</span> {isEn ? 'Google Sheets Archive: 30+ Days Guaranteed Retention' : '試算表永久存檔 · 保證留存 30 天以上'}
                </span>
                <span className="text-[10px] font-bold text-zinc-400">
                  ({isEn ? `Loaded ${normalizedLogs.length} logs (${retentionDays ? `past ${retentionDays} days` : 'all history'})` : `已載入過去 ${retentionDays ? `${retentionDays} 天` : '全量'} 共 ${normalizedLogs.length} 筆日誌`})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Retention Range Selector */}
            <div className="flex items-center gap-1 bg-amber-50 border-2 border-black rounded-xl p-1 text-xs font-bold shadow-neo-xs">
              <Database size={14} className="text-amber-700 ml-1" />
              <span className="text-[11px] font-black text-amber-900 hidden sm:inline">{isEn ? 'Range:' : '範圍:'}</span>
              <select
                value={retentionDays}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setRetentionDays(d);
                  fetchDashboardData(false, d, logLimit);
                }}
                className="bg-transparent font-black text-xs outline-none cursor-pointer pr-1 text-amber-950"
              >
                <option value={1}>{isEn ? 'Last 24 Hours' : '最近 24 小時'}</option>
                <option value={7}>{isEn ? 'Last 7 Days' : '最近 7 天'}</option>
                <option value={30}>{isEn ? 'Last 30 Days (1 Month) ⭐' : '最近 30 天 (1個月) ⭐'}</option>
                <option value={60}>{isEn ? 'Last 60 Days (2 Months)' : '最近 60 天 (2個月)'}</option>
                <option value={90}>{isEn ? 'Last 90 Days (3 Months)' : '最近 90 天 (3個月)'}</option>
                <option value={0}>{isEn ? 'All Historical' : '全部歷史紀錄'}</option>
              </select>
            </div>

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

            {/* Cloud Archive / Google Sheets Link */}
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-3 bg-emerald-50 border-2 border-black rounded-2xl flex items-center gap-1.5 text-xs font-black text-emerald-900 hover:bg-emerald-100 transition-colors shadow-neo-xs"
                title={sheetUrl.includes('gist') ? '前往 GitHub Gist 永久日誌庫' : '前往 Google Sheets 試算表'}
              >
                <FileSpreadsheet size={14} />
                <span className="hidden sm:inline">{sheetUrl.includes('gist') ? (isEn ? 'Gist Archive' : 'Gist 雲端日誌庫') : (isEn ? 'Google Sheet' : '雲端試算表')}</span>
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
        <div 
          onClick={() => setSelectedCategory('ALERT')}
          className="bg-white border-4 border-black rounded-[2rem] p-4 shadow-neo space-y-3 relative overflow-hidden cursor-pointer hover:shadow-neo-lg transition-all"
          title={isEn ? 'Click to view Error logs' : '點擊查看異常日誌'}
        >
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
              <span className={`text-3xl font-black font-mono tracking-tight ${successRate >= 90 ? 'text-emerald-600' : successRate >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{successRate}%</span>
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
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
              <Cpu size={14} className="text-purple-500" />
              {isEn ? 'Models Active' : '活躍 Gemini 模型'}
            </span>
            <div className="flex items-center gap-1">
              {aiQuota?.lastSuccessfulModel && (
                <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-md" title="最後成功調用之模型">
                  ✅ {aiQuota.lastSuccessfulModel}
                </span>
              )}
              <span className="text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full">
                {Object.keys(models).length} {isEn ? 'Models' : '款模型'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[70px] overflow-y-auto custom-scrollbar pr-1">
            {Object.keys(models).length === 0 ? (
              <p className="text-xs font-bold text-zinc-400 italic pt-2">
                {isEn ? 'No model calls recorded yet today.' : '今日尚無模型調用紀錄'}
              </p>
            ) : (
              Object.entries(models).map(([mName, mStats]) => (
                <div key={mName} className={`flex items-center justify-between text-xs font-bold border rounded-lg px-2 py-1 ${mName === aiQuota?.lastSuccessfulModel ? 'bg-emerald-50/80 border-emerald-300' : 'bg-zinc-50 border-black/10'}`}>
                  <span className="font-mono text-[10px] truncate max-w-[120px] flex items-center gap-1">
                    {mName === aiQuota?.lastSuccessfulModel && <span className="text-emerald-600 font-black">●</span>}
                    {mName}
                  </span>
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
              placeholder={isEn ? 'Search log content (food name, prompt, AI analysis, output, user, IP)...' : '搜尋日誌內容（輸入內容、餐點名稱、AI分析、回覆訊息、用戶名、IP...）'}
              className="w-full bg-zinc-50 border-2 border-black rounded-2xl pl-10 pr-8 py-2.5 text-xs font-bold outline-none focus:bg-white transition-colors shadow-neo-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-black font-black p-1"
                title={isEn ? 'Clear search' : '清除搜尋'}
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

        {/* 內容搜尋熱門捷徑列 */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px] font-bold">
          <span className="text-zinc-400 font-black text-[10px] uppercase flex items-center gap-1">
            <Search size={11} />
            {isEn ? 'Content Quick Search:' : '日誌內容搜尋快捷：'}
          </span>
          {['雞胸肉', '蛋', '水', '目標', '減脂', '增肌', '倍', '常用', '異常', '成功'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchQuery(searchQuery === tag ? '' : tag)}
              className={`px-2 py-0.5 rounded-lg border transition-all text-[11px] cursor-pointer ${
                searchQuery === tag 
                  ? 'bg-black text-white border-black font-black shadow-neo-xs' 
                  : 'bg-zinc-100/80 text-zinc-600 border-zinc-200 hover:border-black'
              }`}
            >
              {tag}
            </button>
          ))}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-rose-600 hover:underline text-[10px] font-black ml-1 cursor-pointer flex items-center gap-0.5"
            >
              <X size={10} />
              {isEn ? 'Reset content search' : '重設搜尋內容'}
            </button>
          )}
        </div>

        {/* Category Filter Pills & User / Action Selectors */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1.5 border-t-2 border-dashed border-zinc-100">
          {/* 大類別標籤列 */}
          <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-1 flex-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2 cursor-pointer ${
                  selectedCategory === cat.id && selectedActionType === 'ALL'
                    ? 'bg-black text-white border-black shadow-neo-xs'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-black'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 下拉篩選群組：用戶篩選 + 操作類型篩選 */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
            {/* 👥 用戶人員篩選 */}
            <div className="flex items-center gap-1.5 bg-zinc-50 border-2 border-black rounded-xl px-2.5 py-1 shadow-neo-xs">
              <User size={13} className="text-blue-600 shrink-0" />
              <span className="text-[11px] font-black text-zinc-600 whitespace-nowrap hidden sm:inline">
                {isEn ? 'User:' : '用戶:'}
              </span>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-transparent text-xs font-black text-black outline-none cursor-pointer pr-1 max-w-[150px] sm:max-w-none"
              >
                <option value="ALL">
                  {isEn ? `👥 All Users (${allUsers.length})` : `👥 全部用戶 (${allUsers.length} 人)`}
                </option>
                {allUsers.map(([uName, count]) => (
                  <option key={uName} value={uName}>
                    {uName} ({count} 筆)
                  </option>
                ))}
              </select>
              {selectedUser !== 'ALL' && (
                <button
                  onClick={() => setSelectedUser('ALL')}
                  className="text-zinc-400 hover:text-black p-0.5 rounded hover:bg-zinc-200 transition-colors cursor-pointer"
                  title={isEn ? 'Reset user filter' : '重設用戶篩選'}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* ⚡ 全量操作類型精確下拉篩選 */}
            <div className="flex items-center gap-1.5 bg-zinc-50 border-2 border-black rounded-xl px-2.5 py-1 shadow-neo-xs">
              <Filter size={13} className="text-zinc-600 shrink-0" />
              <span className="text-[11px] font-black text-zinc-600 whitespace-nowrap hidden sm:inline">
                {isEn ? 'Action:' : '操作:'}
              </span>
              <select
                value={selectedActionType}
                onChange={(e) => handleSelectActionType(e.target.value)}
                className="bg-transparent text-xs font-black text-black outline-none cursor-pointer pr-1 max-w-[150px] sm:max-w-none"
              >
                <option value="ALL">
                  {isEn ? `⚡ All Actions (${normalizedLogs.length})` : `⚡ 全部操作 (${normalizedLogs.length})`}
                </option>
                {allActionTypes.map(([actType, count]) => (
                  <option key={actType} value={actType}>
                    {actType} ({count})
                  </option>
                ))}
              </select>
              {selectedActionType !== 'ALL' && (
                <button
                  onClick={() => handleSelectActionType('ALL')}
                  className="text-zinc-400 hover:text-black p-0.5 rounded hover:bg-zinc-200 transition-colors cursor-pointer"
                  title={isEn ? 'Reset action filter' : '重設操作類型篩選'}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 作用中的用戶篩選提示條 */}
        {selectedUser !== 'ALL' && (
          <div className="flex flex-wrap items-center gap-2 bg-blue-50 border-2 border-blue-300 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-900">
            <span>👤 {isEn ? 'Filtering specific user:' : '目前僅篩選用戶：'}</span>
            <span className="bg-black text-white px-2.5 py-0.5 rounded-md font-mono font-black text-[11px] flex items-center gap-1">
              {selectedUser}
            </span>
            <span className="text-zinc-500 font-normal">
              ({filteredLogs.length} {isEn ? 'records' : '筆符合'})
            </span>
            <button
              onClick={() => setSelectedUser('ALL')}
              className="ml-auto text-xs underline hover:text-black font-black flex items-center gap-1 cursor-pointer"
            >
              <X size={12} />
              {isEn ? 'Clear User Filter' : '清除用戶篩選'}
            </button>
          </div>
        )}

        {/* 作用中的操作類型篩選提示條 */}
        {selectedActionType !== 'ALL' && (
          <div className="flex flex-wrap items-center gap-2 bg-amber-50 border-2 border-amber-300 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-900">
            <span>🎯 {isEn ? 'Filtering specific action type:' : '目前僅篩選操作類型：'}</span>
            <span className="bg-black text-white px-2.5 py-0.5 rounded-md font-mono font-black text-[11px] flex items-center gap-1">
              {selectedActionType}
            </span>
            <span className="text-zinc-500 font-normal">
              ({filteredLogs.length} {isEn ? 'records' : '筆符合'})
            </span>
            <button
              onClick={() => handleSelectActionType('ALL')}
              className="ml-auto text-xs underline hover:text-black font-black flex items-center gap-1 cursor-pointer"
            >
              <X size={12} />
              {isEn ? 'Clear Action Filter' : '清除操作篩選'}
            </button>
          </div>
        )}
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
            <>
              {/* 📱 1.1 Mobile & Small Screen Card Stream (Zero Horizontal Overflow, Action Never Obscured) */}
              <div className="block md:hidden divide-y-2 divide-zinc-200">
                {filteredLogs.map((log, index) => {
                  const { time, userName, userId, type, input, aiResult, output, source, ip, location, device } = log;
                  const isExpanded = expandedRowIds.has(index);
                  const currentTab = rowInspectorTab[index] || 'table';

                  const isLogin = type.includes('登入') || type.includes('Login') || userId === 'Maintainer';
                  const isFallback = type.includes('降級') || type.includes('容錯') || type.includes('切換');
                  const isAlert = (type.includes('異常') || output.includes('失敗') || type.includes('報警') || output.includes('錯誤')) && !isFallback;
                  const isPhoto = type.includes('照片') || type.includes('Photo');
                  const isText = type.includes('文字') || type.includes('Text');
                  const isWater = type.includes('水') || type.includes('Water') || input.includes('水');
                  const isPortion = type.includes('倍') || type.includes('半') || type.includes('份量');
                  const isGoal = type.includes('目標');
                  const isSync = type.includes('Web') || type.includes('同步');

                  let badgeClass = 'bg-zinc-100 text-zinc-800 border-zinc-300';
                  if (isLogin) badgeClass = 'bg-purple-100 text-purple-900 border-purple-400 font-black';
                  else if (isFallback) badgeClass = 'bg-amber-100 text-amber-900 border-amber-400 font-black';
                  else if (isAlert) badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-black';
                  else if (isPhoto) badgeClass = 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 font-black';
                  else if (isText) badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 font-black';
                  else if (isWater) badgeClass = 'bg-cyan-100 text-cyan-800 border-cyan-300 font-black';
                  else if (isPortion) badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-black';
                  else if (isGoal) badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black';
                  else if (isSync) badgeClass = 'bg-teal-100 text-teal-800 border-teal-300 font-black';

                  let cardBg = 'bg-white';
                  if (isLogin) cardBg = 'bg-purple-50/40';
                  else if (isAlert) cardBg = 'bg-rose-50/40';

                  const docJson = {
                    "@timestamp": time,
                    "event": { "action": type, "source": source },
                    "user": { "name": userName, "id": userId },
                    "client": { "ip": ip || null, "geo": { "location": location || null }, "device": device || null },
                    "message": { "input": input || null, "analysis": aiResult || null, "output": output || null }
                  };

                  return (
                    <div key={`mob-${index}`} className={`p-4 transition-colors ${cardBg}`}>
                      {/* Top Bar: Action badge + Time + Action Button */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            onClick={() => type && handleSelectActionType(type)}
                            className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border cursor-pointer ${badgeClass}`}
                          >
                            {isLogin && '🛡️'}
                            {isFallback && '🔄'}
                            {isAlert && '🚨'}
                            {isPhoto && '📸'}
                            {isText && '💬'}
                            {isWater && '🚰'}
                            {isPortion && '⚖️'}
                            {isSync && '⚡'}
                            {type || '系統操作'}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-zinc-600">
                            {time}
                          </span>
                        </div>

                        {/* Pinned Action Controls: Copy JSON & Expand */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(docJson, null, 2), `mob-${index}`)}
                            className="p-1.5 bg-zinc-100 hover:bg-black hover:text-white rounded-lg border border-black/20 text-zinc-700 transition-colors text-xs font-mono inline-flex items-center gap-1 active:scale-95 shadow-neo-xs"
                            title="複製 JSON 格式"
                          >
                            {copiedId === `mob-${index}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                            <span className="text-[10px] font-black">JSON</span>
                          </button>
                          <button
                            onClick={() => toggleRowExpansion(index)}
                            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg border border-black/20 text-zinc-700 transition-colors text-xs inline-flex items-center active:scale-95 shadow-neo-xs"
                            title="展開詳細資訊"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Middle: User & Location */}
                      <div className="flex items-center justify-between text-xs text-zinc-700 mb-2 gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-blue-600" />
                          <span
                            onClick={() => setSelectedUser(selectedUser === userName ? 'ALL' : userName)}
                            className="font-black text-black cursor-pointer hover:underline"
                          >
                            {userName}
                          </span>
                          {userId && (
                            <span className="font-mono text-[9px] px-1 py-0.5 rounded border bg-zinc-100 text-zinc-600 font-bold">
                              {userId === 'Maintainer' ? 'ADMIN' : (userId.startsWith('U') ? `#${userId.slice(-6)}` : userId)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-black ${
                            source?.includes('Web') ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}>
                            {source?.includes('Web') ? '🌐 Web' : '🟢 LINE'}
                          </span>
                          {location && location !== '-' && (
                            <span className="flex items-center gap-0.5 text-zinc-700 font-bold truncate max-w-[130px]">
                              <MapPin size={10} className="text-rose-500 shrink-0" />
                              {location}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Message / Payload Preview */}
                      <div
                        onClick={() => toggleRowExpansion(index)}
                        className="bg-zinc-50 border border-black/15 p-2.5 rounded-xl font-mono text-xs text-zinc-800 cursor-pointer hover:border-black transition-colors"
                      >
                        {isAlert ? (
                          <span className="text-rose-700 font-bold">
                            {output || aiResult || input || '⚠️ 系統異常通報'}
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            {input && <div><strong className="text-black font-sans">{input}</strong></div>}
                            {aiResult && <div className="text-purple-700 text-[11px]">➔ {aiResult}</div>}
                            {output && <div className="text-emerald-700 text-[11px]">💬 {output}</div>}
                            {!input && !aiResult && !output && <div className="text-zinc-400 italic">—</div>}
                          </div>
                        )}
                      </div>

                      {/* Expanded Document Inspector inside Mobile Card */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t-2 border-dashed border-zinc-200">
                          <div className="bg-white border-2 border-black rounded-2xl shadow-neo-sm overflow-hidden space-y-3">
                            <div className="bg-zinc-100 border-b-2 border-black px-3 py-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 bg-zinc-200 border border-black rounded-xl p-0.5 text-xs">
                                <button
                                  onClick={() => setRowTab(index, 'table')}
                                  className={`px-2 py-0.5 rounded-lg font-black text-[10px] transition-all ${
                                    currentTab === 'table' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                                  }`}
                                >
                                  Table
                                </button>
                                <button
                                  onClick={() => setRowTab(index, 'json')}
                                  className={`px-2 py-0.5 rounded-lg font-black text-[10px] transition-all ${
                                    currentTab === 'json' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                                  }`}
                                >
                                  JSON
                                </button>
                              </div>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(docJson, null, 2), `doc-${index}`)}
                                className="bg-black text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-neo-xs"
                              >
                                {copiedId === `doc-${index}` ? <Check size={10} /> : <Copy size={10} />}
                                {copiedId === `doc-${index}` ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <div className="p-3">
                              {currentTab === 'table' ? (
                                <div className="divide-y divide-zinc-100 font-mono text-[11px]">
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
                                    <div key={field.key} className="py-1.5 flex items-start justify-between gap-2">
                                      <span className="font-bold text-zinc-500 shrink-0 text-[10px]">{field.key}:</span>
                                      <span className="font-medium text-black break-all text-right">{field.val}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="bg-zinc-950 text-emerald-400 p-3 rounded-xl font-mono text-[10px] overflow-x-auto border border-black max-h-60 custom-scrollbar">
                                  <pre>{JSON.stringify(docJson, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 💻 1.2 Desktop Responsive Table View (Fits 100% width, Sticky Actions Never Obscured) */}
              <div className="hidden md:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="bg-zinc-900 text-white font-mono text-[11px] font-black uppercase tracking-wider select-none">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 w-36">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-accent" />
                          {isEn ? 'Time (@timestamp)' : '時間 (@timestamp)'}
                        </span>
                      </th>
                      <th className="py-3 px-3 w-32">
                        <span>{isEn ? 'Action (Type)' : '操作類型 (Action)'}</span>
                      </th>
                      <th className="py-3 px-3 w-36">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-accent" />
                          {isEn ? 'Caller / User' : '調用者 / 用戶'}
                        </span>
                      </th>
                      <th className="py-3 px-3 w-40">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-rose-400" />
                          {isEn ? 'Location / Source' : '來源 / IP 位置'}
                        </span>
                      </th>
                      <th className="py-3 px-4 min-w-0">
                        <span>{isEn ? 'Payload / Result Preview' : '訊息與執行結果預覽'}</span>
                      </th>
                      <th className="py-3 px-3 w-16 text-center sticky right-0 bg-zinc-900 z-20 border-l border-zinc-800 shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-sans text-xs">
                    {filteredLogs.map((log, index) => {
                      const { time, userName, userId, type, input, aiResult, output, source, ip, location, device } = log;
                      const isExpanded = expandedRowIds.has(index);
                      const currentTab = rowInspectorTab[index] || 'table';

                      const isLogin = type.includes('登入') || type.includes('Login') || userId === 'Maintainer';
                      const isFallback = type.includes('降級') || type.includes('容錯') || type.includes('切換');
                      const isAlert = (type.includes('異常') || output.includes('失敗') || type.includes('報警') || output.includes('錯誤')) && !isFallback;
                      const isPhoto = type.includes('照片') || type.includes('Photo');
                      const isText = type.includes('文字') || type.includes('Text');
                      const isWater = type.includes('水') || type.includes('Water') || input.includes('水');
                      const isPortion = type.includes('倍') || type.includes('半') || type.includes('份量');
                      const isGoal = type.includes('目標');
                      const isSync = type.includes('Web') || type.includes('同步');

                      let badgeClass = 'bg-zinc-100 text-zinc-800 border-zinc-300';
                      if (isLogin) badgeClass = 'bg-purple-100 text-purple-900 border-purple-400 font-black';
                      else if (isFallback) badgeClass = 'bg-amber-100 text-amber-900 border-amber-400 font-black';
                      else if (isAlert) badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-black';
                      else if (isPhoto) badgeClass = 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 font-black';
                      else if (isText) badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 font-black';
                      else if (isWater) badgeClass = 'bg-cyan-100 text-cyan-800 border-cyan-300 font-black';
                      else if (isPortion) badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-black';
                      else if (isGoal) badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black';
                      else if (isSync) badgeClass = 'bg-teal-100 text-teal-800 border-teal-300 font-black';

                      let rowBg = 'hover:bg-amber-50/40 group';
                      let stickyActionBg = 'bg-white group-hover:bg-[#fffdf5]';
                      if (isLogin) {
                        rowBg = 'bg-purple-50/40 hover:bg-purple-100/50 group';
                        stickyActionBg = 'bg-[#fbf7fe] group-hover:bg-[#f3e8ff]';
                      } else if (isAlert) {
                        rowBg = 'bg-rose-50/40 hover:bg-rose-100/50 group';
                        stickyActionBg = 'bg-[#fff5f5] group-hover:bg-[#fee2e2]';
                      } else if (isExpanded) {
                        rowBg = 'bg-zinc-100/80 font-medium group';
                        stickyActionBg = 'bg-[#f4f4f5]';
                      }

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
                            className={`cursor-pointer transition-colors ${rowBg}`}
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
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (type) handleSelectActionType(type);
                                }}
                                title={isEn ? `Filter action: "${type}"` : `點擊直接篩選操作類型：「${type}」`}
                                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border cursor-pointer hover:ring-2 hover:ring-black transition-all ${badgeClass}`}
                              >
                                {isLogin && '🛡️'}
                                {isFallback && '🔄'}
                                {isAlert && '🚨'}
                                {isPhoto && '📸'}
                                {isText && '💬'}
                                {isWater && '🚰'}
                                {isPortion && '⚖️'}
                                {isSync && '⚡'}
                                {type || '系統操作'}
                              </span>
                            </td>

                            {/* User Name / Caller */}
                            <td className="py-3 px-3 font-bold text-black whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {isLogin && <ShieldAlert size={14} className="text-purple-600 shrink-0" />}
                                <span className="truncate max-w-[120px]" title={userName}>
                                  {userName || '—'}
                                </span>
                                {userId && userId !== 'Maintainer' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectUser(userId, userName);
                                    }}
                                    title={isEn ? `Filter user: ${userName} (${userId})` : `點擊直接篩選用戶：${userName} (${userId})`}
                                    className="text-[10px] text-zinc-400 hover:text-black font-mono underline ml-0.5"
                                  >
                                    ID
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Location / Device / Source */}
                            <td className="py-3 px-3 text-zinc-600 whitespace-nowrap">
                              <div className="flex flex-col text-[11px] leading-tight">
                                <span className="font-bold text-zinc-800 flex items-center gap-1 truncate max-w-[140px]">
                                  {location ? (
                                    <>
                                      <span>📍</span>
                                      <span title={location}>{location}</span>
                                    </>
                                  ) : (
                                    <span className="text-zinc-400 font-mono text-[10px]">{ip || '—'}</span>
                                  )}
                                </span>
                                <span className="text-[10px] text-zinc-400 truncate max-w-[140px] flex items-center gap-1">
                                  {device && <span>📱 {device}</span>}
                                  {!device && <span>🌐 {source || 'LINE'}</span>}
                                </span>
                              </div>
                            </td>

                            {/* Message / Payload Preview */}
                            <td className="py-3 px-4 max-w-xs md:max-w-md xl:max-w-xl truncate text-zinc-600 font-mono text-[11px]">
                              <div className="truncate">
                                {input ? (
                                  <span className="text-zinc-900 font-sans font-medium">🗣️ {input}</span>
                                ) : null}
                                {aiResult ? (
                                  <span className="text-blue-700 ml-1">🤖 {aiResult}</span>
                                ) : null}
                                {output ? (
                                  <span className="text-emerald-700 ml-1">💬 {output}</span>
                                ) : null}
                                {!input && !aiResult && !output && (
                                  <span className="text-zinc-400 italic">—</span>
                                )}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className={`py-3 px-3 text-center whitespace-nowrap sticky right-0 z-10 border-l border-zinc-200/80 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] ${stickyActionBg}`} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(docJson, null, 2), `row-${index}`)}
                                className="p-1.5 hover:bg-black hover:text-white rounded-lg border border-black/20 text-zinc-600 transition-colors text-xs font-mono inline-flex items-center bg-white shadow-sm"
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
            </>
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
                      <span 
                        onClick={() => {
                          if (type) handleSelectActionType(type);
                        }}
                        title={isEn ? `Filter action: "${type}"` : `點擊直接篩選操作類型：「${type}」`}
                        className={`text-[10px] uppercase px-2.5 py-0.5 rounded-full border cursor-pointer hover:ring-2 hover:ring-black transition-all ${badgeBg}`}
                      >
                        {isLogin && '🛡️ '}
                        {type || '系統操作'}
                      </span>
                      {source && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${
                          source.includes('Web')
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : source.includes('LINE')
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-zinc-900 text-white border-black'
                        }`}>
                          {source}
                        </span>
                      )}
                    </div>

                    {/* User Identifier + Location */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span 
                        onClick={() => setSelectedUser(selectedUser === userName ? 'ALL' : userName)}
                        className={`text-xs font-black px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer border transition-all ${
                          selectedUser === userName 
                            ? 'bg-blue-600 text-white border-black ring-2 ring-black shadow-neo-xs' 
                            : 'text-black bg-accent/30 border-black/20 hover:ring-2 hover:ring-black'
                        }`}
                        title={isEn ? `Click to filter logs by ${userName}` : `點擊僅篩選【${userName}】的日誌`}
                      >
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const cardDocJson = {
                            "@timestamp": time,
                            "event": { "action": type, "source": source },
                            "user": { "name": userName, "id": userId },
                            "client": { "ip": ip || null, "geo": { "location": location || null } },
                            "message": { "input": input || null, "analysis": aiResult || null, "output": output || null }
                          };
                          copyToClipboard(JSON.stringify(cardDocJson, null, 2), `card-${index}`);
                        }}
                        className="p-1 bg-zinc-100 hover:bg-black hover:text-white rounded-lg border border-black/20 text-zinc-700 transition-colors text-xs font-mono inline-flex items-center gap-1 active:scale-95 shadow-neo-xs ml-auto"
                        title="複製 JSON 格式"
                      >
                        {copiedId === `card-${index}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        <span className="text-[9px] font-black">JSON</span>
                      </button>
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
