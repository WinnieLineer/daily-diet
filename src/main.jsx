import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { getOrCreateClientId } from './lib/syncService'
import { handleIndexedDbServerError } from './db'

// 🛡️ Defense against Google Translate & browser extension DOM mutations breaking React
// Fixes: "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('Cannot remove child: not a child of this node. Ignored to prevent translation crash.', child, this);
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('Cannot insertBefore: reference node not a child of this node. Appending instead.', referenceNode, this);
      }
      return originalInsertBefore.call(this, newNode, null);
    }
    return originalInsertBefore.apply(this, arguments);
  };
}

let memoryLastAlertSig = '';
let memoryLastAlertTime = 0;

function reportWebErrorToWeb3Forms(title, message, stack) {
  try {
    const combinedMsg = `${message || ""} ${stack || ""}`;
    // 忽略第三方瀏覽器內部注入腳本 (如 Firefox/Brave iOS 的 __firefox__) 與外掛雜訊
    if (
      combinedMsg.includes('__firefox__') ||
      combinedMsg.includes('__gCrWeb') ||
      combinedMsg.includes('__brave__') ||
      combinedMsg.includes('__ddg_') ||
      combinedMsg.includes('ResizeObserver') ||
      combinedMsg.includes('Script error') ||
      combinedMsg.includes('chrome-extension') ||
      combinedMsg.includes('safari-extension') ||
      combinedMsg.includes('safari-web-extension') ||
      combinedMsg.includes('moz-extension') ||
      combinedMsg.includes('webkit.messageHandlers') ||
      combinedMsg.includes('Indexed Database server') ||
      combinedMsg.includes('internal error was encountered in the Indexed Database server') ||
      /global code@.*:1:\d+/.test(combinedMsg) ||
      (combinedMsg.includes("Can't find variable: __") && /iphone|ipad|ipod/i.test(navigator.userAgent || ''))
    ) {
      console.debug('Suppressed third-party browser / extension noise:', title, message);
      return;
    }
    let userName = 'Web 訪客';
    let userId = 'web_guest';
    try {
      userId = localStorage.getItem('line_user_id') || getOrCreateClientId();
      userName = localStorage.getItem('line_user_name') || localStorage.getItem('user_name') || `Web 用戶 (${userId.slice(-6)})`;
    } catch (e) {}

    const timeStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    const errSig = `${title}_${message}`;
    const lastSentKey = 'last_web3_alert_sig';
    const lastTimeKey = 'last_web3_alert_time';
    let lastSig = memoryLastAlertSig;
    let lastTime = memoryLastAlertTime;
    try {
      lastSig = sessionStorage.getItem(lastSentKey) || memoryLastAlertSig;
      lastTime = Number(sessionStorage.getItem(lastTimeKey) || memoryLastAlertTime);
    } catch (e) {}

    if (lastSig === errSig && Date.now() - lastTime < 60000) return;

    memoryLastAlertSig = errSig;
    memoryLastAlertTime = Date.now();
    try {
      sessionStorage.setItem(lastSentKey, errSig);
      sessionStorage.setItem(lastTimeKey, String(Date.now()));
    } catch (e) {}

    let currentUrl = 'N/A';
    if (typeof window !== 'undefined' && window.location) {
      try {
        const u = new URL(window.location.href);
        ['token', 'pass', 'password', 'key', 'adminKey', 'secret'].forEach(p => {
          if (u.searchParams.has(p)) u.searchParams.set(p, '***REDACTED***');
        });
        currentUrl = u.toString();
      } catch (e) {
        currentUrl = (window.location.href || '').split('?')[0];
      }
    }
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A';

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: '72d7f10c-b6c8-42f2-9c40-fc5fac45cad0',
        subject: `🚨 [Daily-Diet Web前端異常] ${userName} | ${title.slice(0, 40)}`,
        from_name: '🐼 Daily-Diet 前端異常監控',
        time: timeStr,
        user_name: userName,
        user_id: userId,
        operation: `Web 頁面/操作: ${currentUrl}`,
        error_message: message,
        message: [
          `🚨 【Daily-Diet Web 前端異常自動回報】`,
          `----------------------------------------`,
          `⏰ 發生時間：${timeStr} (台灣時間 GMT+8)`,
          `👤 相關用戶：${userName}`,
          `🆔 用戶識別碼：${userId}`,
          `🕹️ 當前頁面/操作：${currentUrl}`,
          `❌ 錯誤類型：${title}`,
          `💬 錯誤訊息：${message}`,
          stack ? `\n📜 呼叫堆疊 (Stack Trace)：\n${stack}` : '',
          `\n📱 裝置資訊：${userAgent}`
        ].join('\n')
      })
    }).catch(() => {});
  } catch (err) {}
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isClearing: false, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);

    const errMsg = error?.message || error?.toString() || '';
    if (
      errMsg.includes('dynamically imported module') ||
      errMsg.includes('Importing a module script failed') ||
      errMsg.includes('error loading dynamically imported module') ||
      errMsg.includes('Loading chunk')
    ) {
      let reloadCount = 0;
      try {
        reloadCount = Number(sessionStorage.getItem('chunk_reload_count') || 0);
        if (reloadCount < 2) {
          sessionStorage.setItem('chunk_reload_count', String(reloadCount + 1));
          console.warn('🔄 Detected outdated chunk from past deployment, auto-refreshing page...');
          window.location.reload();
          return;
        }
      } catch (e) {}
    }

    if (
      errMsg.includes('removeChild') ||
      errMsg.includes('not a child of this node') ||
      errMsg.includes('insertBefore')
    ) {
      let domReloadCount = 0;
      try {
        domReloadCount = Number(sessionStorage.getItem('dom_reload_count') || 0);
        if (domReloadCount < 2) {
          sessionStorage.setItem('dom_reload_count', String(domReloadCount + 1));
          console.warn('🔄 Detected DOM mutation crash (browser translation/extension), auto-recovering...');
          window.location.reload();
          return;
        }
      } catch (e) {}
    }

    if (
      errMsg.includes('Indexed Database server') ||
      errMsg.includes('internal error was encountered in the Indexed Database server')
    ) {
      let idbReloadCount = 0;
      try {
        idbReloadCount = Number(sessionStorage.getItem('idb_reload_count') || 0);
        if (idbReloadCount < 2) {
          sessionStorage.setItem('idb_reload_count', String(idbReloadCount + 1));
          console.warn('🔄 Detected WebKit IndexedDB internal crash, auto-recovering connection...');
          window.location.reload();
          return;
        }
      } catch (e) {}
    }

    reportWebErrorToWeb3Forms('React ErrorBoundary Crash', error?.message || error?.toString(), errorInfo?.componentStack);
  }

  handleClearCacheAndReload = async () => {
    this.setState({ isClearing: true });
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.warn('Failed clearing cache:', e);
    }
    const hash = window.location.hash || '';
    window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now() + hash;
  };

  handleGoHome = () => {
    window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
  };

  handleCopyError = () => {
    try {
      const text = `${this.state.error?.toString()}\n\n${this.state.errorInfo?.componentStack || ''}`;
      navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen min-h-dvh bg-[#F8FAFC] flex items-center justify-center p-4 selection:bg-accent selection:text-black">
          <div className="max-w-md w-full bg-white border-4 border-black rounded-[2.5rem] shadow-neo p-6 sm:p-8 flex flex-col items-center text-center relative">
            {/* 🐼 可愛吉祥物徽章 */}
            <div className="w-20 h-20 bg-amber-100 border-4 border-black rounded-3xl flex items-center justify-center text-4xl shadow-neo-sm mb-4 select-none animate-bounce">
              🐼
            </div>

            {/* 標題與友善說明 */}
            <h1 className="text-xl sm:text-2xl font-black italic tracking-tight text-zinc-950 mb-2">
              哎呀！遇到小插曲 🐾
            </h1>
            <p className="text-xs sm:text-sm font-bold text-zinc-500 leading-relaxed mb-6 max-w-xs">
              可能剛好遇上新功能版本更新，或是瀏覽器暫存需要重新同步。<br />
              <span className="text-zinc-700 font-black">請放心，您的飲食與體重紀錄都妥善保存在本機！</span>
            </p>

            {/* 核心操作按鈕群組 (Neo-Brutalist 風格) */}
            <div className="w-full space-y-2.5">
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                disabled={this.state.isClearing}
                className="w-full bg-accent hover:bg-yellow-300 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none text-black border-4 border-black py-3.5 px-4 rounded-2xl font-black text-sm shadow-neo transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="text-base">{this.state.isClearing ? '⏳' : '🔄'}</span>
                <span>{this.state.isClearing ? '正在清理快取並載入最新版...' : '清除快取並重新載入 (Clear Cache)'}</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full bg-white hover:bg-zinc-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-zinc-800 border-4 border-black py-2.5 px-4 rounded-2xl font-black text-xs shadow-neo-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🏠</span>
                <span>嘗試直接返回首頁</span>
              </button>
            </div>

            {/* 技術診斷摺疊區 (平時收合，不造成用戶恐慌) */}
            <details className="w-full mt-6 text-left border-2 border-black/15 rounded-2xl overflow-hidden bg-zinc-50 group">
              <summary className="px-3.5 py-2.5 text-[11px] font-black cursor-pointer select-none text-zinc-500 hover:text-zinc-800 flex items-center justify-between list-none">
                <span className="flex items-center gap-1.5">
                  <span>🔍</span>
                  <span>技術診斷資訊 (Technical Details)</span>
                </span>
                <span className="text-xs text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-3 bg-zinc-100 border-t-2 border-black/10 text-[10px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all max-h-44 text-zinc-700">
                <div className="font-bold text-rose-600 mb-2">
                  {this.state.error && this.state.error.toString()}
                </div>
                <div className="text-zinc-500 text-[9px] mb-3">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </div>
                <div className="pt-2 border-t border-zinc-200 flex justify-end">
                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="px-2.5 py-1 bg-white border-2 border-black rounded-lg text-[9px] font-black text-black shadow-neo-xs hover:bg-zinc-100 cursor-pointer"
                  >
                    {this.state.copied ? '✓ 已複製到剪貼簿' : '📋 複製錯誤日誌'}
                  </button>
                </div>
              </div>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Vite dynamic preload error auto-recovery on new deployment
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  let reloadCount = 0;
  try {
    reloadCount = Number(sessionStorage.getItem('chunk_reload_count') || 0);
    if (reloadCount < 2) {
      sessionStorage.setItem('chunk_reload_count', String(reloadCount + 1));
      console.warn('🔄 Vite preload error (new deployment detected), refreshing...');
      window.location.reload();
    }
  } catch (e) {}
});

// Global error catcher for non-React errors
window.addEventListener('error', (event) => {
  const message = event.message || '';
  const stack = event.error?.stack || `${event.filename}:${event.lineno}`;
  const filename = event.filename || '';

  // 1. 忽略 iOS WebKit 外部包裹瀏覽器注入的使用者腳本 (如 Brave/Firefox iOS 的 global code@...:1:12)
  const isRootInjectedScript = (event.lineno === 1 && (event.colno || 0) < 150) &&
    (!filename || filename === window.location.href || filename.endsWith('/') || filename.includes('index.html'));

  if (isRootInjectedScript) {
    console.debug('Suppressed root injected browser user script error:', message);
    return;
  }

  // 2. Ignore benign browser/extension noise, iOS browser injected scripts and dynamic module load errors
  const combined = `${message} ${stack}`;
  if (
    combined.includes('ResizeObserver') ||
    combined.includes('Script error') ||
    combined.includes('chrome-extension') ||
    combined.includes('safari-extension') ||
    combined.includes('safari-web-extension') ||
    combined.includes('moz-extension') ||
    combined.includes('__firefox__') ||
    combined.includes('__gCrWeb') ||
    combined.includes('__brave__') ||
    combined.includes('__ddg_') ||
    combined.includes('webkit.messageHandlers') ||
    combined.includes('dynamically imported module') ||
    combined.includes('Importing a module script failed') ||
    /global code@.*:1:\d+/.test(combined) ||
    (combined.includes("Can't find variable: __") && /iphone|ipad|ipod/i.test(navigator.userAgent || ''))
  ) {
    return;
  }

  console.error("Global Window Error:", event.error || event.message);
  reportWebErrorToWeb3Forms('Global Window Error', message, stack);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonStr = String(reason?.message || reason || '');
  const stack = reason?.stack || '';
  const combined = `${reasonStr} ${stack}`;

  // Filter out harmless browser/security noise:
  // 1. ServiceWorker registration rejection in Incognito / Private Browsing / enterprise restrictions
  // 2. AbortError / user cancelled fetch
  // 3. Network or ad-blocker blocked tracking
  // 4. Stale dynamic import chunks after new deployment
  // 5. Browser injected scripts (Firefox iOS, Chrome iOS, WebKit extensions)
  if (
    combined.includes('__firefox__') ||
    combined.includes('__gCrWeb') ||
    combined.includes('__brave__') ||
    combined.includes('__ddg_') ||
    combined.includes('chrome-extension') ||
    combined.includes('safari-extension') ||
    combined.includes('safari-web-extension') ||
    combined.includes('moz-extension') ||
    combined.includes('ResizeObserver') ||
    reasonStr.includes('Rejected') ||
    reasonStr.includes('ServiceWorker') ||
    reasonStr.includes('AbortError') ||
    reasonStr.includes('Failed to fetch') ||
    reasonStr.includes('NetworkError') ||
    reasonStr.includes('cannot be updated') ||
    reasonStr.includes('Failed to upload to Gist') ||
    reasonStr.includes('Unable to open cursor') ||
    combined.includes('open cursor') ||
    reasonStr.includes('DatabaseClosedError') ||
    reasonStr.includes('Indexed Database server') ||
    combined.includes('Indexed Database server') ||
    reasonStr.includes('internal error was encountered in the Indexed Database server') ||
    reasonStr.includes('dynamically imported module') ||
    reasonStr.includes('Importing a module script failed') ||
    stack.includes('registerSW') ||
    stack.includes('ServiceWorker') ||
    stack.includes('gistService')
  ) {
    if (combined.includes('Indexed Database server') || combined.includes('DatabaseClosedError')) {
      try {
        if (typeof handleIndexedDbServerError === 'function') handleIndexedDbServerError(reason);
      } catch (e) {}
    }
    console.debug('Suppressed benign unhandled promise rejection:', reason);
    return;
  }

  console.error("Unhandled Promise Rejection:", reason);
  reportWebErrorToWeb3Forms('Unhandled Promise Rejection', reasonStr, stack);
});

// Safe Service Worker Registration with Graceful Rejection Catch
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL })
      .then((reg) => {
        // Auto-check for Service Worker updates periodically
        if (reg) {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New app version available in ServiceWorker cache');
                  window.dispatchEvent(new CustomEvent('dd:new-version-available'));
                }
              });
            }
          });
        }
      })
      .catch((err) => {
        // Gracefully ignore service worker registration rejection in private/incognito/restricted browsing
        console.warn('PWA ServiceWorker registration skipped/rejected (normal in Incognito/restricted modes):', err?.message || err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
