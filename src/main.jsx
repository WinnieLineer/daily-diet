import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

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
      /global code@.*:1:\d+/.test(combinedMsg) ||
      (combinedMsg.includes("Can't find variable: __") && /iphone|ipad|ipod/i.test(navigator.userAgent || ''))
    ) {
      console.debug('Suppressed third-party browser / extension noise:', title, message);
      return;
    }
    let userName = 'Web 訪客';
    let userId = 'web_guest';
    try {
      userId = localStorage.getItem('line_user_id') || 'web_user';
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

    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'N/A';
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
    this.state = { hasError: false, error: null, errorInfo: null };
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

    reportWebErrorToWeb3Forms('React ErrorBoundary Crash', error?.message || error?.toString(), errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#ffebee', color: '#c62828', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>App Crashed!</h1>
          <details style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
            <summary style={{ fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer' }}>
              {this.state.error && this.state.error.toString()}
            </summary>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <div style={{ marginTop: '20px' }} id="global-errors"></div>
          <button 
            onClick={async () => { 
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
              } catch (e) {}
              window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
            }}
            style={{ marginTop: '20px', padding: '10px 15px', background: '#c62828', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Clear Cache & Reload
          </button>
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
    reasonStr.includes('dynamically imported module') ||
    reasonStr.includes('Importing a module script failed') ||
    stack.includes('registerSW') ||
    stack.includes('ServiceWorker') ||
    stack.includes('gistService')
  ) {
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
