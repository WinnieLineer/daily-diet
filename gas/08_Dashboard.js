/**
 * ========================================================
 * 08_Dashboard.js - 運作日誌儀表板轉導模組
 * ========================================================
 * 原 GAS 舊版 HTML 儀表板已全面除役並遷移至 Web 前端專屬維護者密碼保護端點：
 * https://winnie-lin.space/daily-diet/?view=admin
 */

function generateDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>🛡️ 轉導至維護者監控中心</title>
  <meta http-equiv="refresh" content="0; url=https://winnie-lin.space/daily-diet/?view=admin">
  <script>window.location.replace("https://winnie-lin.space/daily-diet/?view=admin");</script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #FFFDF5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #FFFFFF;
      border: 4px solid #000000;
      border-radius: 24px;
      box-shadow: 6px 6px 0px #000000;
      max-width: 440px;
      padding: 32px;
      text-align: center;
    }
    .btn {
      display: inline-block;
      margin-top: 20px;
      background: #000000;
      color: #FFFFFF;
      font-weight: 900;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 16px;
      border: 2px solid #000000;
    }
    .btn:hover { background: #FDE047; color: #000000; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 48px; margin-bottom: 12px;">🛡️</div>
    <h2 style="font-weight: 900; margin-bottom: 8px;">監控儀表板已遷移</h2>
    <p style="color: #666; font-size: 14px; line-height: 1.6;">
      為保障伺服器安全，日誌與 API 監控中心已移至 Web 前端並啟用維護者密碼驗證。<br>
      正在自動跳轉至安全端點...
    </p>
    <a href="https://winnie-lin.space/daily-diet/?view=admin" class="btn">立即前往 Web 監控中心 ➔</a>
  </div>
</body>
</html>`;
}
