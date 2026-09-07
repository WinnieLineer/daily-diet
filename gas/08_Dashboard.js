function generateDashboardHtml(initialLogs, sheetUrl, initialAiQuota) {
  const aiQuotaJson = JSON.stringify(initialAiQuota || getAiQuotaStats()).replace(/</g, '\\u003c');
  const initialJson = JSON.stringify(initialLogs || []).replace(/</g, '\\u003c');
  const safeSheetUrl = sheetUrl || '';

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>🐼 Daily Diet 實時對話與運作日誌</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Outfit:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F8FAFC;
      --black: #000000;
      --white: #FFFFFF;
      --yellow: #FDE047;
      --yellow-hover: #FACC15;
      --purple: #EDE9FE;
      --purple-text: #6D28D9;
      --blue: #E0F2FE;
      --blue-text: #0369A1;
      --green: #DCFCE7;
      --green-text: #15803D;
      --red: #FFE4E6;
      --red-text: #BE123C;
      --amber: #FEF9C3;
      --amber-text: #854D0E;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
      background-color: var(--bg);
      background-image: radial-gradient(#CBD5E1 1.5px, transparent 1.5px);
      background-size: 24px 24px;
      color: var(--black);
      min-height: 100vh;
      padding: 20px;
      -webkit-font-smoothing: antialiased;
    }

    .app-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* 🏷️ Neo-Brutalist 卡片容器基礎 */
    .neo-box {
      background: var(--white);
      border: 3px solid var(--black);
      border-radius: 20px;
      box-shadow: 4px 4px 0px 0px var(--black);
      transition: all 0.15s ease;
    }

    /* 頂部 Header */
    .header-panel {
      padding: 20px 24px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      background: #FFFFFF;
      border: 4px solid var(--black);
      border-radius: 24px;
      box-shadow: 6px 6px 0px 0px var(--black);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      font-size: 32px;
      background: var(--yellow);
      border: 3px solid var(--black);
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      box-shadow: 3px 3px 0px 0px var(--black);
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: var(--black);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .brand-subtitle {
      font-size: 13px;
      color: #52525B;
      font-weight: 700;
      margin-top: 2px;
    }

    /* 狀態徽章 */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--green);
      color: var(--green-text);
      border: 2px solid var(--black);
      box-shadow: 2px 2px 0px 0px var(--black);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      background: #16A34A;
      border-radius: 50%;
      border: 1px solid var(--black);
      animation: pulse 1.6s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(0.8); opacity: 0.5; }
    }

    /* 按鈕群組 */
    .btn-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .neo-btn {
      background: var(--white);
      color: var(--black);
      border: 3px solid var(--black);
      box-shadow: 3px 3px 0px 0px var(--black);
      padding: 8px 16px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.1s ease;
      text-decoration: none;
      user-select: none;
    }
    .neo-btn:hover {
      transform: translate(-1px, -1px);
      box-shadow: 4px 4px 0px 0px var(--black);
    }
    .neo-btn:active {
      transform: translate(2px, 2px);
      box-shadow: 1px 1px 0px 0px var(--black);
    }
    .neo-btn-primary {
      background: var(--yellow);
    }
    .neo-btn-primary:hover {
      background: var(--yellow-hover);
    }
    .neo-btn-green {
      background: var(--green);
      color: var(--green-text);
    }
    .neo-btn-blue {
      background: var(--blue);
      color: var(--blue-text);
    }

    /* 📊 遙測統計卡片 Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }
    .metric-card {
      padding: 16px 18px;
      border: 3px solid var(--black);
      border-radius: 18px;
      box-shadow: 4px 4px 0px 0px var(--black);
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: transform 0.15s ease;
    }
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 5px 5px 0px 0px var(--black);
    }
    .metric-label {
      font-size: 12px;
      font-weight: 900;
      color: var(--black);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .metric-val {
      font-size: 28px;
      font-weight: 900;
      font-family: 'JetBrains Mono', 'Inter', monospace;
      color: var(--black);
      letter-spacing: -1px;
    }

    /* 🔍 搜尋與分類篩選工具列 */
    .toolbar-panel {
      padding: 14px 18px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      border: 3px solid var(--black);
      border-radius: 18px;
      box-shadow: 4px 4px 0px 0px var(--black);
    }
    .search-box {
      flex: 1;
      min-width: 260px;
      position: relative;
    }
    .search-input {
      width: 100%;
      background: #F8FAFC;
      border: 3px solid var(--black);
      border-radius: 14px;
      padding: 10px 14px 10px 40px;
      color: var(--black);
      font-size: 13px;
      font-weight: 800;
      outline: none;
      box-shadow: 2px 2px 0px 0px var(--black);
      transition: all 0.15s ease;
    }
    .search-input:focus {
      background: #FFFFFF;
      box-shadow: 3px 3px 0px 0px var(--black);
      border-color: var(--black);
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 15px;
      color: var(--black);
    }

    .filter-pills {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .pill-btn {
      background: var(--white);
      border: 2px solid var(--black);
      box-shadow: 2px 2px 0px 0px var(--black);
      color: var(--black);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.1s ease;
    }
    .pill-btn:hover {
      transform: translate(-1px, -1px);
      box-shadow: 3px 3px 0px 0px var(--black);
    }
    .pill-btn:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0px 0px var(--black);
    }
    .pill-btn.active {
      background: var(--black);
      color: var(--yellow);
      border-color: var(--black);
    }

    /* 📋 表格樣式 */
    .table-container {
      background: var(--white);
      border: 4px solid var(--black);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 6px 6px 0px 0px var(--black);
    }
    .log-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .log-table th {
      background: var(--black);
      color: var(--white);
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 14px 16px;
      border-bottom: 3px solid var(--black);
    }
    .log-table td {
      padding: 14px 16px;
      font-size: 13px;
      border-bottom: 2px solid #E2E8F0;
      vertical-align: middle;
      color: var(--black);
    }
    .log-table tr:hover td {
      background: #F8FAFC;
    }

    /* 標籤徽章 */
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 9px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 900;
      border: 2px solid var(--black);
      box-shadow: 2px 2px 0px 0px var(--black);
      white-space: nowrap;
    }
    .tag-photo { background: var(--purple); color: var(--purple-text); }
    .tag-text { background: var(--blue); color: var(--blue-text); }
    .tag-goal { background: var(--amber); color: var(--amber-text); }
    .tag-sec { background: var(--red); color: var(--red-text); }
    .tag-sync { background: var(--green); color: var(--green-text); }
    .tag-mgmt { background: #F1F5F9; color: #1E293B; }

    .time-cell {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 800;
      color: #64748B;
      white-space: nowrap;
    }
    .user-cell {
      font-weight: 900;
      color: var(--black);
      white-space: nowrap;
    }
    .input-cell {
      font-weight: 800;
      color: var(--black);
      word-break: break-word;
      max-width: 320px;
    }
    .ai-cell {
      font-weight: 700;
      color: #2563EB;
      word-break: break-word;
      max-width: 300px;
    }
    .output-cell {
      font-weight: 700;
      color: #15803D;
      word-break: break-word;
    }

    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: #64748B;
    }
    .empty-state-icon { font-size: 44px; margin-bottom: 12px; }

    /* Footer */
    .footer-bar {
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #64748B;
      font-weight: 800;
      padding: 0 6px;
      flex-wrap: wrap;
      gap: 8px;
    }

    @media (max-width: 768px) {
      body { padding: 12px; }
      .header-panel { padding: 16px; border-radius: 18px; }
      .brand-title { font-size: 18px; }
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .log-table th:nth-child(5), .log-table td:nth-child(5) { display: none; }
    }
  </style>
</head>
<body>
  <div class="app-container">
    <!-- 頂部面板 -->
    <header class="header-panel">
      <div class="brand">
        <div class="brand-logo">🐼</div>
        <div>
          <div class="brand-title">
            DAILY DIET 實時對話與運作日誌
            <span class="status-badge"><span class="live-dot"></span> LIVE</span>
          </div>
          <div class="brand-subtitle">Gemini 多模態視覺辨識 · Google 試算表永久存檔 · 防盜刷即時遙測</div>
        </div>
      </div>
      <div class="btn-group">
        <button class="neo-btn neo-btn-primary" onclick="triggerManualRefresh()">🔄 立即刷新</button>
        <button class="neo-btn neo-btn-blue" onclick="exportLogsToCsv()">📥 匯出 CSV</button>
        <a id="sheetLinkBtn" href="${safeSheetUrl || '#'}" target="_blank" class="neo-btn neo-btn-green" style="${safeSheetUrl ? '' : 'display:none;'}">📊 永久雲端試算表</a>
        <button class="neo-btn" id="toggleAutoBtn" onclick="toggleAutoRefresh()">⏸️ 暫停輪詢</button>
        <a href="https://winnielineer.github.io/daily-diet/privacy.html" target="_blank" class="neo-btn">🛡️ 隱私政策</a>
      </div>
    </header>

    <!-- ⚡ Gemini AI 即時速率監控 (RPM Monitor) -->
    <div class="ai-quota-panel neo-box" style="background:#FFFFFF; border:3.5px solid var(--black); border-radius:22px; padding:18px 22px; margin-bottom:18px; box-shadow:5px 5px 0px 0px var(--black);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:26px; background:var(--yellow); border:3px solid var(--black); border-radius:12px; width:48px; height:48px; display:flex; align-items:center; justify-content:center; box-shadow:2px 2px 0px var(--black);">⚡</div>
          <div>
            <div style="font-size:18px; font-weight:900; color:var(--black); display:flex; align-items:center; gap:10px;">
              Gemini AI 即時速率監控 (RPM)
              <span id="aiBadge" class="status-badge" style="background:var(--green); color:var(--green-text); font-size:11px;">🟢 速率極佳</span>
            </div>
            <div style="font-size:12px; color:#52525B; font-weight:700; margin-top:2px;">
              模型：<code id="aiModelName" style="background:#F1F5F9; padding:2px 6px; border-radius:6px; font-family:'JetBrains Mono'; font-weight:800; color:#000;">gemini-3.5-flash-lite</code> ｜ 免費上限 15 次/分 (60 秒滑動窗口)
            </div>
          </div>
        </div>
        <div style="display:flex; gap:14px; align-items:center;">
          <div style="text-align:right;">
            <div style="font-size:11px; font-weight:800; color:#71717A;">⚡ 即時調用速率 (RPM)</div>
            <div style="font-size:26px; font-weight:900; font-family:'JetBrains Mono'; color:#15803D;" id="aiRpmHero">0 <span style="font-size:15px; color:#71717A; font-weight:800;">/ 15 RPM</span></div>
          </div>
        </div>
      </div>

      <!-- RPM 即時速率條 (0~15 RPM) -->
      <div style="background:#F1F5F9; border:3px solid var(--black); border-radius:999px; height:20px; position:relative; overflow:hidden; box-shadow:2px 2px 0px var(--black);">
        <div id="aiProgressBar" style="background:var(--green); height:100%; width:0%; border-right:2px solid var(--black); transition:width 0.4s ease, background-color 0.4s ease;"></div>
      </div>

      <!-- RPM 指標卡片群 -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px; margin-top:14px;">
        <div style="background:#DCFCE7; border:2.5px solid var(--black); border-radius:14px; padding:10px 14px; box-shadow:3px 3px 0px var(--black);">
          <div style="font-size:11px; font-weight:800; color:#15803D;">當前速率 (Current RPM)</div>
          <div style="font-size:20px; font-weight:900; font-family:'JetBrains Mono'; color:#15803D;" id="aiCurrentRpm">0 / 15</div>
        </div>
        <div style="background:#EFF6FF; border:2.5px solid var(--black); border-radius:14px; padding:10px 14px; box-shadow:3px 3px 0px var(--black);">
          <div style="font-size:11px; font-weight:800; color:#1D4ED8;">今日累計 (RPD)</div>
          <div style="font-size:20px; font-weight:900; font-family:'JetBrains Mono'; color:#1D4ED8;" id="aiUsedCount">0 / 1,500</div>
        </div>
        <div style="background:#FEF9C3; border:2.5px solid var(--black); border-radius:14px; padding:10px 14px; box-shadow:3px 3px 0px var(--black);">
          <div style="font-size:11px; font-weight:800; color:#854D0E;">冷卻狀態 (Status)</div>
          <div style="font-size:20px; font-weight:900; font-family:'JetBrains Mono'; color:#854D0E;" id="aiStatusText">無排隊阻塞</div>
        </div>
        <div style="background:#F3E8FF; border:2.5px solid var(--black); border-radius:14px; padding:10px 14px; box-shadow:3px 3px 0px var(--black);">
          <div style="font-size:11px; font-weight:800; color:#7E22CE;">調用成功率</div>
          <div style="font-size:20px; font-weight:900; font-family:'JetBrains Mono'; color:#7E22CE;" id="aiSuccessRate">100%</div>
        </div>
      </div>
    </div>

    <!-- 📊 統計指標卡片 (Neo-Brutalist Colors) -->
    <div class="metrics-grid">
      <div class="metric-card" style="background:#FFFFFF;">
        <div class="metric-label"><span>總歷史筆數 (Total)</span><span>📦</span></div>
        <div class="metric-val" id="metricTotal">0</div>
      </div>
      <div class="metric-card" style="background:var(--purple);">
        <div class="metric-label"><span>📸 照片視覺辨識</span><span style="color:var(--purple-text);">Vision</span></div>
        <div class="metric-val" id="metricPhoto" style="color:var(--purple-text);">0</div>
      </div>
      <div class="metric-card" style="background:var(--blue);">
        <div class="metric-label"><span>💬 文字與記餐</span><span style="color:var(--blue-text);">Text</span></div>
        <div class="metric-val" id="metricText" style="color:var(--blue-text);">0</div>
      </div>
      <div class="metric-card" style="background:var(--amber);">
        <div class="metric-label"><span>🎯 目標與同步</span><span style="color:var(--amber-text);">Sync</span></div>
        <div class="metric-val" id="metricSync" style="color:var(--amber-text);">0</div>
      </div>
      <div class="metric-card" style="background:var(--red);">
        <div class="metric-label"><span>🛡️ 安全防禦阻擋</span><span style="color:var(--red-text);">Shield</span></div>
        <div class="metric-val" id="metricSec" style="color:var(--red-text);">0</div>
      </div>
    </div>

    <!-- 🔍 搜尋與分類篩選工具列 -->
    <div class="toolbar-panel neo-box">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="searchInput" class="search-input" placeholder="搜尋用戶名稱、輸入文字、辨識結果..." oninput="handleSearch()">
      </div>
      <div class="filter-pills">
        <button class="pill-btn active" data-filter="all" onclick="setFilter('all', this)">全部紀錄</button>
        <button class="pill-btn" data-filter="photo" onclick="setFilter('photo', this)">📸 照片辨識</button>
        <button class="pill-btn" data-filter="text" onclick="setFilter('text', this)">💬 文字紀錄</button>
        <button class="pill-btn" data-filter="goal" onclick="setFilter('goal', this)">🎯 體態目標</button>
        <button class="pill-btn" data-filter="sync" onclick="setFilter('sync', this)">⚡ Web同步</button>
        <button class="pill-btn" data-filter="sec" onclick="setFilter('sec', this)">🛡️ 安全攔截</button>
      </div>
    </div>

    <!-- 📋 日誌主表格 -->
    <div class="table-container">
      <table class="log-table">
        <thead>
          <tr>
            <th style="width: 150px;">時間</th>
            <th style="width: 140px;">用戶</th>
            <th style="width: 130px;">操作類型</th>
            <th>用戶傳送內容</th>
            <th>AI 辨識結果</th>
            <th>處理與回應狀態</th>
          </tr>
        </thead>
        <tbody id="logTableBody"></tbody>
      </table>
    </div>

    <!-- 底部資訊欄 -->
    <div class="footer-bar">
      <div>最後更新時間：<span id="lastUpdatedTime" style="font-family:'JetBrains Mono'; color:var(--black); font-weight:900;">--:--:--</span> (每 3 秒自動更新 · 永久保留所有歷史紀錄)</div>
      <div>Daily Diet v3.1 Engine · Neo-Brutalism Architecture</div>
    </div>
  </div>

  <script>
    let allLogs = ${initialJson};
    let currentAiQuota = ${aiQuotaJson};
    let currentFilter = 'all';
    let searchQuery = '';
    let autoRefreshActive = true;
    let refreshTimer = null;
    let sheetUrl = '${safeSheetUrl}';

    function escapeHtml(str) {
      return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getBadgeClass(type) {
      if (!type) return 'tag-mgmt';
      if (type.includes('照片') || type.includes('圖片')) return 'tag-photo';
      if (type.includes('文字') || type.includes('對話')) return 'tag-text';
      if (type.includes('目標') || type.includes('體態')) return 'tag-goal';
      if (type.includes('安全') || type.includes('攔截') || type.includes('防盜刷')) return 'tag-sec';
      if (type.includes('Web') || type.includes('同步') || type.includes('常用')) return 'tag-sync';
      return 'tag-mgmt';
    }

    function updateMetrics(logs) {
      const list = logs || [];
      document.getElementById('metricTotal').textContent = list.length;
      
      let photo = 0, text = 0, sync = 0, sec = 0;
      list.forEach(l => {
        const t = l.type || '';
        if (t.includes('照片') || t.includes('圖片')) photo++;
        else if (t.includes('文字') || t.includes('對話')) text++;
        else if (t.includes('目標') || t.includes('體態') || t.includes('Web') || t.includes('常用') || t.includes('同步')) sync++;
        else if (t.includes('安全') || t.includes('攔截') || t.includes('防盜刷') || t.includes('失敗')) sec++;
      });

      document.getElementById('metricPhoto').textContent = photo;
      document.getElementById('metricText').textContent = text;
      document.getElementById('metricSync').textContent = sync;
      document.getElementById('metricSec').textContent = sec;
    }

    function updateAiQuotaUI(quota) {
      if (!quota) return;
      const currentRpm = quota.currentRpm || 0;
      const rpmLimit = quota.rpmLimit || 15;
      const rpmPercent = Math.min(100, Math.round((currentRpm / rpmLimit) * 100));
      const dailyUsed = quota.used || 0;
      const dailyLimit = quota.limit || 1500;
      const successRate = quota.successRate !== undefined ? quota.successRate : 100;
      
      const progressBar = document.getElementById('aiProgressBar');
      if (progressBar) {
        progressBar.style.width = Math.max(currentRpm > 0 ? 5 : 0, rpmPercent) + '%';
        if (currentRpm >= 13) progressBar.style.background = '#EF4444';
        else if (currentRpm >= 9) progressBar.style.background = '#F59E0B';
        else progressBar.style.background = '#10B981';
      }

      const rpmHero = document.getElementById('aiRpmHero');
      if (rpmHero) {
        const color = currentRpm >= 13 ? '#DC2626' : (currentRpm >= 9 ? '#D97706' : '#15803D');
        rpmHero.innerHTML = currentRpm + ' <span style="font-size:15px; color:#71717A; font-weight:800;">/ ' + rpmLimit + ' RPM</span>';
        rpmHero.style.color = color;
      }

      const currentRpmEl = document.getElementById('aiCurrentRpm');
      if (currentRpmEl) currentRpmEl.textContent = currentRpm + ' / ' + rpmLimit;

      const usedCount = document.getElementById('aiUsedCount');
      if (usedCount) usedCount.textContent = dailyUsed + ' / ' + dailyLimit.toLocaleString();

      const sRate = document.getElementById('aiSuccessRate');
      if (sRate) sRate.textContent = successRate + '%';

      const statusText = document.getElementById('aiStatusText');
      if (statusText) {
        if (currentRpm >= 13) statusText.textContent = '接近限流 (警戒)';
        else if (currentRpm >= 9) statusText.textContent = '速率偏高';
        else statusText.textContent = '無排隊阻塞';
      }

      const badge = document.getElementById('aiBadge');
      if (badge) {
        if (currentRpm >= 13) {
          badge.textContent = '🔴 接近限流 (' + currentRpm + '/15)';
          badge.style.background = '#FEE2E2';
          badge.style.color = '#B91C1C';
        } else if (currentRpm >= 9) {
          badge.textContent = '🟡 速率注意 (' + currentRpm + '/15)';
          badge.style.background = '#FEF9C3';
          badge.style.color = '#854D0E';
        } else {
          badge.textContent = '🟢 速率安全 (' + currentRpm + '/15)';
          badge.style.background = '#DCFCE7';
          badge.style.color = '#15803D';
        }
      }

      const modelName = document.getElementById('aiModelName');
      if (modelName && quota.currentModel) {
        modelName.textContent = quota.currentModel;
      }
    }


    function renderTable() {
      const tbody = document.getElementById('logTableBody');
      if (!tbody) return;

      const q = searchQuery.toLowerCase().trim();
      const filtered = allLogs.filter(item => {
        // 類別篩選
        if (currentFilter === 'photo' && !item.type.includes('照片')) return false;
        if (currentFilter === 'text' && !item.type.includes('文字') && !item.type.includes('對話')) return false;
        if (currentFilter === 'goal' && !item.type.includes('目標')) return false;
        if (currentFilter === 'sync' && !item.type.includes('Web') && !item.type.includes('常用') && !item.type.includes('同步')) return false;
        if (currentFilter === 'sec' && !item.type.includes('安全') && !item.type.includes('攔截')) return false;

        // 搜尋篩選
        if (q) {
          const matchUser = (item.userId || '').toLowerCase().includes(q);
          const matchType = (item.type || '').toLowerCase().includes(q);
          const matchInput = (item.input || '').toLowerCase().includes(q);
          const matchAi = (item.aiResult || '').toLowerCase().includes(q);
          const matchOutput = (item.output || '').toLowerCase().includes(q);
          return matchUser || matchType || matchInput || matchAi || matchOutput;
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🐼</div><div style="font-weight:900; font-size:16px; color:#000000; margin-bottom:6px;">尚無符合的對話紀錄</div><div>在 LINE 聊天室發送照片或文字，即時遙測將即刻顯示於此！</div></div></td></tr>';
        return;
      }

      let rows = '';
      filtered.forEach(l => {
        const badgeCls = getBadgeClass(l.type);

        rows += '<tr>' +
          '<td class="time-cell" title="' + escapeHtml(l.time) + '">' + escapeHtml(l.time) + '</td>' +
          '<td class="user-cell">👤 ' + escapeHtml(l.userId || '用戶') + '</td>' +
          '<td><span class="tag ' + badgeCls + '">' + escapeHtml(l.type) + '</span></td>' +
          '<td class="input-cell">' + escapeHtml(l.input) + '</td>' +
          '<td class="ai-cell">' + escapeHtml(l.aiResult) + '</td>' +
          '<td class="output-cell">' + escapeHtml(l.output) + '</td>' +
        '</tr>';
      });

      tbody.innerHTML = rows;
    }

    function setFilter(type, btn) {
      currentFilter = type;
      document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      renderTable();
    }

    function handleSearch() {
      searchQuery = document.getElementById('searchInput').value;
      renderTable();
    }

    function updateLogs(newLogs, newSheetUrl, newAiQuota) {
      if (newLogs && Array.isArray(newLogs)) {
        allLogs = newLogs;
        updateMetrics(allLogs);
        renderTable();
        updateAiQuotaUI(currentAiQuota);
        document.getElementById('lastUpdatedTime').textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false });
      }
      if (newAiQuota) updateAiQuotaUI(newAiQuota);
      if (newSheetUrl) {
        sheetUrl = newSheetUrl;
        const btn = document.getElementById('sheetLinkBtn');
        if (btn) {
          btn.href = sheetUrl;
          btn.style.display = 'inline-flex';
        }
      }
    }

    function fetchLogs() {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(function(data) {
          updateLogs(data.logs, data.sheetUrl, data.aiQuota);
        }).getRecentLogsData(300);
      } else {
        fetch('?action=getRecentLogs&limit=300')
          .then(r => r.json())
          .then(data => {
            if (data.status === 'ok') updateLogs(data.logs, data.sheetUrl, data.aiQuota);
          })
          .catch(e => console.warn('Fetch logs error:', e));
      }
    }

    function triggerManualRefresh() {
      fetchLogs();
    }

    function toggleAutoRefresh() {
      autoRefreshActive = !autoRefreshActive;
      const btn = document.getElementById('toggleAutoBtn');
      if (autoRefreshActive) {
        btn.innerHTML = '⏸️ 暫停輪詢';
        refreshTimer = setInterval(fetchLogs, 3000);
      } else {
        btn.innerHTML = '▶️ 啟動輪詢';
        if (refreshTimer) clearInterval(refreshTimer);
      }
    }

    function exportLogsToCsv() {
      if (!allLogs || allLogs.length === 0) {
        alert('尚無任何日誌可供匯出！');
        return;
      }
      let csvContent = "\\uFEFF時間,用戶名稱,操作類型,用戶傳送內容,AI辨識結果,處理狀態\\n";
      allLogs.forEach(l => {
        const escapeCsv = (str) => '"' + String(str || '').replace(/"/g, '""') + '"';
        csvContent += [
          escapeCsv(l.time),
          escapeCsv(l.userId),
          escapeCsv(l.type),
          escapeCsv(l.input),
          escapeCsv(l.aiResult),
          escapeCsv(l.output)
        ].join(',') + '\\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'Daily_Diet_Logs_' + new Date().toISOString().slice(0, 10) + '.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // 初始化渲染
    updateMetrics(allLogs);
    renderTable();
    document.getElementById('lastUpdatedTime').textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    refreshTimer = setInterval(fetchLogs, 3000);
  </script>
</body>
</html>`;
}

// ========================================================
// 📸 12. 原生相機圖文選單 API 部署核心 (LINE Messaging API)
// ========================================================

