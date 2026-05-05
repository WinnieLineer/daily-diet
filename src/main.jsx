import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

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
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '20px', padding: '10px 15px', background: '#c62828', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            Clear Data & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global error catcher for non-React errors
window.addEventListener('error', (event) => {
  const div = document.createElement('div');
  div.style.padding = '10px';
  div.style.background = '#ffebee';
  div.style.color = '#c62828';
  div.style.fontFamily = 'monospace';
  div.style.fontSize = '12px';
  div.style.wordBreak = 'break-word';
  div.style.borderBottom = '1px solid #ef5350';
  div.style.zIndex = '99999';
  div.style.position = 'relative';
  div.innerText = `Global Error: ${event.message}\nAt: ${event.filename}:${event.lineno}\nStack: ${event.error?.stack}`;
  document.body.prepend(div);
});

window.addEventListener('unhandledrejection', (event) => {
  const div = document.createElement('div');
  div.style.padding = '10px';
  div.style.background = '#fff3e0';
  div.style.color = '#e65100';
  div.style.fontFamily = 'monospace';
  div.style.fontSize = '12px';
  div.style.wordBreak = 'break-word';
  div.style.borderBottom = '1px solid #ff9800';
  div.style.zIndex = '99999';
  div.style.position = 'relative';
  div.innerText = `Unhandled Promise Rejection: ${event.reason}`;
  document.body.prepend(div);
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/daily-diet/sw.js', { scope: '/daily-diet/' })
      .then(reg => console.log('SW registered:', reg))
      .catch(err => console.error('SW registration failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
