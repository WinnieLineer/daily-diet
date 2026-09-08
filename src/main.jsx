import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

function reportWebErrorToWeb3Forms(title, message, stack) {
  try {
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
    const lastSig = sessionStorage.getItem(lastSentKey);
    const lastTime = Number(sessionStorage.getItem(lastTimeKey) || 0);
    if (lastSig === errSig && Date.now() - lastTime < 60000) return;
    sessionStorage.setItem(lastSentKey, errSig);
    sessionStorage.setItem(lastTimeKey, String(Date.now()));

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
      const reloadCount = Number(sessionStorage.getItem('chunk_reload_count') || 0);
      if (reloadCount < 2) {
        sessionStorage.setItem('chunk_reload_count', String(reloadCount + 1));
        console.warn('🔄 Detected outdated chunk from past deployment, auto-refreshing page...');
        window.location.reload();
        return;
      }
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
  const reloadCount = Number(sessionStorage.getItem('chunk_reload_count') || 0);
  if (reloadCount < 2) {
    sessionStorage.setItem('chunk_reload_count', String(reloadCount + 1));
    console.warn('🔄 Vite preload error (new deployment detected), refreshing...');
    window.location.reload();
  }
});

// Global error catcher for non-React errors
window.addEventListener('error', (event) => {
  const message = event.message || '';
  const stack = event.error?.stack || `${event.filename}:${event.lineno}`;

  // Ignore benign browser/extension noise and dynamic module load errors
  if (
    message.includes('ResizeObserver') ||
    message.includes('Script error') ||
    message.includes('chrome-extension') ||
    message.includes('dynamically imported module') ||
    message.includes('Importing a module script failed')
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

  // Filter out harmless browser/security noise:
  // 1. ServiceWorker registration rejection in Incognito / Private Browsing / enterprise restrictions
  // 2. AbortError / user cancelled fetch
  // 3. Network or ad-blocker blocked tracking
  // 4. Stale dynamic import chunks after new deployment
  if (
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
