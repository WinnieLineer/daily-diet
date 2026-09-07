/**
 * ========================================================
 * 08_Dashboard.js - 運作日誌儀表板轉導模組
 * ========================================================
 * 原 GAS 舊版 HTML 儀表板已全面除役並遷移至 Web 前端專屬維護者密碼保護端點：
 * https://winnie-lin.space/daily-diet/?view=admin
 */

function generateDashboardHtml() {
  const targetUrl = "https://winnie-lin.space/daily-diet/?view=admin";
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>🛡️ 轉導至維護者監控中心</title>
  <base target="_top">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #FFFDF5;
      color: #1F2937;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      cursor: pointer;
    }
    .card {
      background: #FFFFFF;
      border: 4px solid #000000;
      border-radius: 24px;
      box-shadow: 8px 8px 0px #000000;
      max-width: 480px;
      width: 100%;
      padding: 36px 28px;
      text-align: center;
      transition: transform 0.15s ease;
    }
    .card:hover {
      transform: translate(-2px, -2px);
      box-shadow: 10px 10px 0px #000000;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FEF08A;
      border: 2px solid #000000;
      border-radius: 999px;
      padding: 4px 14px;
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 16px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 5px solid #F3F4F6;
      border-top-color: #F59E0B;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 16px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .btn {
      display: block;
      margin-top: 24px;
      background: #000000;
      color: #FFFFFF !important;
      font-weight: 900;
      font-size: 16px;
      text-decoration: none;
      padding: 16px 24px;
      border-radius: 16px;
      border: 3px solid #000000;
      box-shadow: 4px 4px 0px #F59E0B;
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .btn:hover {
      background: #F59E0B;
      color: #000000 !important;
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0px #000000;
    }
    .hint {
      color: #6B7280;
      font-size: 12px;
      margin-top: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body onclick="executeBreakout()">
  <div class="card">
    <div style="font-size: 52px; margin-bottom: 8px;">🛡️</div>
    <div class="badge">🔒 維護者安全中心</div>
    <h2 style="font-weight: 900; margin: 0 0 10px; font-size: 22px;">正在轉導至 Web 監控中心</h2>
    <p style="color: #4B5563; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      舊版 GAS 日誌頁面已全面除役並遷移至前端專屬密碼保護端點。<br>
      若瀏覽器未自動跳轉，請直接點擊下方按鈕或點擊畫面任一處：
    </p>
    <div class="spinner"></div>
    <a id="redirectLink" href="${targetUrl}" target="_top" class="btn">
      👉 立即進入維護者監控中心 ➔
    </a>
    <div class="hint">⚡ 支援通行證記住與即時登入安全審核</div>
  </div>

  <script>
    const TARGET = "${targetUrl}";

    function executeBreakout() {
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = TARGET;
          return;
        }
      } catch (e) {
        console.warn("window.top direct assignment blocked:", e);
      }
      try {
        window.open(TARGET, "_top");
      } catch (e2) {
        window.location.href = TARGET;
      }
    }

    // 1. 立即嘗試跳出沙盒轉導
    executeBreakout();

    // 2. 透過 DOM 模擬點擊 <a> 標籤 (含有 target="_top")
    setTimeout(function() {
      try {
        const link = document.getElementById('redirectLink');
        if (link) link.click();
      } catch (err) {
        console.warn("Auto-click blocked:", err);
      }
    }, 100);

    // 3. 500ms 後再次嘗試跳轉
    setTimeout(executeBreakout, 500);
  </script>
</body>
</html>`;
}
