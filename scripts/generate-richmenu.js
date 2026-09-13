import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outDir = './public';
const scratchDir = './scratch';

if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

function getHtml(isEn) {
  const cards = [
    {
      // 1. Camera
      bg: '#FFFFFF',
      titleColor: '#000000',
      badgeBg: '#000000',
      badgeColor: '#FDE047',
      title: isEn ? 'AI CAMERA' : '拍照辨識',
      badge: isEn ? '⚡ AUTO NUTRITION' : '⚡ 拍照即辨識',
      iconSvg: `
        <svg width="300" height="300" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Panda Ears -->
          <circle cx="36" cy="30" r="16" fill="#000000"/>
          <circle cx="84" cy="30" r="16" fill="#000000"/>
          <circle cx="36" cy="30" r="8" fill="#FFFFFF"/>
          <circle cx="84" cy="30" r="8" fill="#FFFFFF"/>
          <!-- Camera Body -->
          <rect x="14" y="38" width="92" height="66" rx="18" fill="#FDE047" stroke="#000000" stroke-width="7"/>
          <path d="M42 38V28C42 24 46 22 50 22H70C74 22 78 24 78 28V38" fill="#000000"/>
          <!-- Lens Outer -->
          <circle cx="60" cy="71" r="23" fill="#FFFFFF" stroke="#000000" stroke-width="7"/>
          <!-- Lens Inner -->
          <circle cx="60" cy="71" r="14" fill="#000000"/>
          <circle cx="65" cy="66" r="5" fill="#FFFFFF"/>
          <circle cx="88" cy="52" r="5" fill="#E11D48"/>
          <!-- Flash Burst -->
          <path d="M22 24L26 32L34 34L28 40L30 48L22 43L15 48L17 40L11 34L19 32Z" fill="#F59E0B" stroke="#000000" stroke-width="2.5"/>
        </svg>
      `
    },
    {
      // 2. Favorites
      bg: '#FEF08A',
      titleColor: '#000000',
      badgeBg: '#000000',
      badgeColor: '#FFFFFF',
      title: isEn ? 'FAVORITES' : '常用餐點',
      badge: isEn ? '⭐ QUICK LOG' : '⭐ 一鍵秒記錄',
      iconSvg: `
        <svg width="300" height="300" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- 3D Star with Face -->
          <path d="M60 12L74 44L108 48L83 72L90 106L60 88L30 106L37 72L12 48L46 44Z" fill="#FBBF24" stroke="#000000" stroke-width="7" stroke-linejoin="round"/>
          <path d="M60 12L74 44L108 48L83 72L60 60Z" fill="#FDE68A"/>
          <!-- White Center Circle Badge -->
          <circle cx="60" cy="62" r="18" fill="#FFFFFF" stroke="#000000" stroke-width="5"/>
          <!-- Happy Face -->
          <circle cx="53" cy="59" r="3.5" fill="#000000"/>
          <circle cx="67" cy="59" r="3.5" fill="#000000"/>
          <path d="M54 67C57 71 63 71 66 67" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
        </svg>
      `
    },
    {
      // 3. Water
      bg: '#BAE6FD',
      titleColor: '#000000',
      badgeBg: '#000000',
      badgeColor: '#38BDF8',
      title: isEn ? '+500ml WATER' : '快速補水',
      badge: isEn ? '💧 HYDRATION' : '💧 喝水 +500ml',
      iconSvg: `
        <svg width="300" height="300" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Water Droplet 3D -->
          <path d="M60 14C60 14 24 56 24 78C24 98 40 110 60 110C80 110 96 98 96 78C96 56 60 14 60 14Z" fill="#38BDF8" stroke="#000000" stroke-width="7" stroke-linejoin="round"/>
          <!-- Shine highlight -->
          <path d="M40 74C40 60 50 48 60 36" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>
          <circle cx="75" cy="85" r="6" fill="#FFFFFF"/>
        </svg>
      `
    },
    {
      // 4. Summary
      bg: '#18181B',
      titleColor: '#FFFFFF',
      badgeBg: '#FDE047',
      badgeColor: '#000000',
      title: isEn ? 'SUMMARY' : '今日總結',
      badge: isEn ? '📊 DAILY REPORT' : '📊 營養赤字檢視',
      iconSvg: `
        <svg width="300" height="300" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- 3D Bar Chart -->
          <rect x="20" y="62" width="22" height="42" rx="5" fill="#F87171" stroke="#FFFFFF" stroke-width="5"/>
          <rect x="49" y="38" width="22" height="66" rx="5" fill="#FDE047" stroke="#FFFFFF" stroke-width="5"/>
          <rect x="78" y="18" width="22" height="86" rx="5" fill="#34D399" stroke="#FFFFFF" stroke-width="5"/>
          <path d="M16 106H104" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>
          <!-- Upward Arrow Trend -->
          <path d="M28 52L58 28L88 12" stroke="#60A5FA" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="88" cy="12" r="7" fill="#FFFFFF" stroke="#000000" stroke-width="3"/>
        </svg>
      `
    },
    {
      // 5. Guide
      bg: '#EDE9FE',
      titleColor: '#000000',
      badgeBg: '#000000',
      badgeColor: '#A78BFA',
      title: isEn ? 'GUIDE' : '功能說明',
      badge: isEn ? '📖 HOW TO USE' : '📖 指令手冊教學',
      iconSvg: `
        <svg width="300" height="300" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- 3D Lightbulb -->
          <path d="M40 82H80M44 94H76M52 106H68" stroke="#000000" stroke-width="7" stroke-linecap="round"/>
          <path d="M40 76C32 68 26 56 26 44C26 25 41 13 60 13C79 13 94 25 94 44C94 56 88 68 80 76V82H40V76Z" fill="#FBBF24" stroke="#000000" stroke-width="7" stroke-linejoin="round"/>
          <!-- Glow reflection -->
          <path d="M44 38C44 28 52 20 60 20" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
          <!-- Shine Rays -->
          <path d="M60 4V9M16 26L21 30M104 26L99 30" stroke="#000000" stroke-width="6" stroke-linecap="round"/>
        </svg>
      `
    },
    {
      // 6. Diary App
      bg: '#DCFCE7',
      titleColor: '#000000',
      badgeBg: '#000000',
      badgeColor: '#4ADE80',
      title: isEn ? 'DIARY APP' : '飲食日記',
      badge: isEn ? '📱 OPEN DIARY' : '📱 個人飲食日記',
      iconSvg: `
        <svg width="300" height="300" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- 3D Smartphone -->
          <rect x="28" y="10" width="64" height="100" rx="16" fill="#18181B" stroke="#000000" stroke-width="7"/>
          <rect x="35" y="20" width="50" height="76" rx="8" fill="#FFFFFF"/>
          <!-- Screen contents -->
          <circle cx="60" cy="38" r="11" fill="#FDE047" stroke="#000000" stroke-width="3"/>
          <rect x="42" y="55" width="36" height="7" rx="3.5" fill="#22C55E"/>
          <rect x="42" y="67" width="26" height="7" rx="3.5" fill="#000000"/>
          <rect x="42" y="79" width="20" height="6" rx="3" fill="#94A3B8"/>
          <!-- Home button bar -->
          <line x1="52" y1="102" x2="68" y2="102" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/>
        </svg>
      `
    }
  ];

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>Rich Menu 2500x1686</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Noto+Sans+TC:wght@900&display=swap');
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    body {
      width: 2500px;
      height: 1686px;
      overflow: hidden;
      background-color: #F1F5F9;
      background-image: radial-gradient(#CBD5E1 2.5px, transparent 2.5px);
      background-size: 44px 44px;
      display: grid;
      grid-template-columns: 833px 834px 833px;
      grid-template-rows: 843px 843px;
      font-family: 'Outfit', 'Noto Sans TC', -apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", sans-serif;
    }
    .grid-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 22px;
    }
    .neo-btn {
      width: 100%;
      height: 100%;
      background: var(--btn-bg);
      border: 8px solid #000000;
      border-radius: 44px;
      box-shadow: 18px 18px 0px #000000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px 20px;
      position: relative;
    }
    .icon-wrap {
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .title {
      font-size: 88px;
      font-weight: 900;
      letter-spacing: 2.5px;
      margin-top: 10px;
      text-align: center;
      line-height: 1.1;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 13px 36px;
      border-radius: 999px;
      font-size: 35px;
      font-weight: 900;
      letter-spacing: 1.5px;
      margin-top: 24px;
      border: 4.5px solid #000000;
      box-shadow: 5px 5px 0px #000000;
    }
  </style>
</head>
<body>
  ${cards.map((c, i) => `
    <div class="grid-cell" id="cell-${i}">
      <div class="neo-btn" style="--btn-bg: ${c.bg};">
        <div class="icon-wrap">
          ${c.iconSvg}
        </div>
        <div class="title" style="color: ${c.titleColor};">${c.title}</div>
        <div class="badge" style="background-color: ${c.badgeBg}; color: ${c.badgeColor};">
          ${c.badge}
        </div>
      </div>
    </div>
  `).join('')}
</body>
</html>`;

  return html;
}

// 1. 寫入中、英 HTML
const zhHtmlPath = path.resolve(scratchDir, 'richmenu-zh.html');
const enHtmlPath = path.resolve(scratchDir, 'richmenu-en.html');

fs.writeFileSync(zhHtmlPath, getHtml(false), 'utf8');
fs.writeFileSync(enHtmlPath, getHtml(true), 'utf8');
console.log('✅ Generated refined HTML templates in scratch/');

// 2. Headless Chrome 截圖
const targets = [
  {
    html: zhHtmlPath,
    outs: [
      path.resolve(outDir, 'richmenu-2500x1686.jpg'),
      path.resolve(outDir, 'rich-menu-2500x1686.jpg'),
      path.resolve(outDir, 'richmenu-6grid.jpg'),
      path.resolve(outDir, 'rich-menu-banner.jpg')
    ]
  },
  {
    html: enHtmlPath,
    outs: [
      path.resolve(outDir, 'richmenu-en-2500x1686.jpg')
    ]
  }
];

for (const t of targets) {
  const tmpOut = path.resolve(scratchDir, `shot_${Date.now()}.jpg`);
  // 加上 --run-all-compositor-stages-before-draw 確保字型完全載入
  const cmd = `"${chromePath}" --headless --disable-gpu --hide-scrollbars --window-size=2500,1686 --screenshot="${tmpOut}" "file://${t.html}"`;
  console.log(`📸 Capturing screenshot for ${path.basename(t.html)}...`);
  execSync(cmd, { stdio: 'pipe' });

  for (const dest of t.outs) {
    fs.copyFileSync(tmpOut, dest);
    const stat = fs.statSync(dest);
    console.log(`  ➔ Saved: ${dest} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
  fs.unlinkSync(tmpOut);
}

console.log('🎉 All Rich Menu Neo-Brutalist images generated and refined successfully!');
