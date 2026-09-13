import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const scratchDir = './scratch';
const pandaB64 = fs.readFileSync(path.resolve(scratchDir, 'panda_b64.txt'), 'utf8');

function getHtml(isEn = false) {
  const cards = [
    {
      // 1. Camera with Cute Panda Mascot!
      bg: '#FDE047',
      title: isEn ? 'AI CAMERA' : '拍照辨識',
      iconHtml: `
        <img src="data:image/png;base64,${pandaB64}" style="width: 440px; height: 350px; object-fit: contain; filter: drop-shadow(6px 8px 0px rgba(0,0,0,0.2));" />
      `
    },
    {
      // 2. Favorites
      bg: '#FDE047',
      title: isEn ? 'FAVORITES' : '常用餐點',
      iconHtml: `
        <svg width="340" height="310" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- 3D Star in Black/White/Yellow -->
          <path d="M60 8L75 42L112 46L85 71L92 108L60 89L28 108L35 71L8 46L45 42Z" fill="#F59E0B" stroke="#000000" stroke-width="7" stroke-linejoin="round"/>
          <path d="M60 8L75 42L112 46L85 71L60 60Z" fill="#FEF08A"/>
          <!-- White Center Face -->
          <circle cx="60" cy="62" r="21" fill="#FFFFFF" stroke="#000000" stroke-width="5.5"/>
          <circle cx="53" cy="59" r="4" fill="#000000"/>
          <circle cx="67" cy="59" r="4" fill="#000000"/>
          <path d="M53 67C56 72 64 72 67 67" stroke="#000000" stroke-width="4" stroke-linecap="round"/>
        </svg>
      `
    },
    {
      // 3. Water
      bg: '#FDE047',
      title: isEn ? '+500ml WATER' : '快速補水',
      iconHtml: `
        <svg width="340" height="310" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Water Droplet in Black, White, Grayscale with Yellow Accent -->
          <path d="M60 10C60 10 20 56 20 82C20 104 38 114 60 114C82 114 100 104 100 82C100 56 60 10 60 10Z" fill="#FFFFFF" stroke="#000000" stroke-width="7.5" stroke-linejoin="round"/>
          <!-- Grayscale Inner Tone Depth -->
          <path d="M60 114C78 114 94 105 96 86C97 72 82 46 64 26C62 23 60 21 60 21C60 21 58 23 56 26C45 40 34 58 31 72C38 88 50 114 60 114Z" fill="#F1F5F9"/>
          <!-- Glossy Reflection Highlight -->
          <path d="M36 78C36 62 46 48 58 36" stroke="#000000" stroke-width="6" stroke-linecap="round"/>
          <circle cx="78" cy="88" r="7.5" fill="#000000"/>
        </svg>
      `
    },
    {
      // 4. Summary
      bg: '#FDE047',
      title: isEn ? 'SUMMARY' : '今日總結',
      iconHtml: `
        <svg width="340" height="310" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- 3D Bar Chart in Black, White, Grayscale, Yellow -->
          <rect x="16" y="60" width="23" height="46" rx="5" fill="#FFFFFF" stroke="#000000" stroke-width="6"/>
          <rect x="48" y="36" width="23" height="70" rx="5" fill="#F59E0B" stroke="#000000" stroke-width="6"/>
          <rect x="80" y="14" width="23" height="92" rx="5" fill="#18181B" stroke="#000000" stroke-width="6"/>
          <path d="M10 108H110" stroke="#000000" stroke-width="8" stroke-linecap="round"/>
          <!-- Trend Arrow -->
          <path d="M24 50L56 24L90 8" stroke="#000000" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
          <polygon points="92,5 98,16 87,14" fill="#000000"/>
          <circle cx="56" cy="24" r="5" fill="#FFFFFF" stroke="#000000" stroke-width="3"/>
        </svg>
      `
    },
    {
      // 5. Guide
      bg: '#FDE047',
      title: isEn ? 'GUIDE' : '功能說明',
      iconHtml: `
        <svg width="340" height="310" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- 3D Lightbulb in Black, White, Yellow -->
          <path d="M38 84H82M43 96H77M51 108H69" stroke="#000000" stroke-width="7" stroke-linecap="round"/>
          <path d="M38 78C30 70 24 57 24 44C24 24 40 12 60 12C80 12 96 24 96 44C96 57 90 70 82 78V84H38V78Z" fill="#F59E0B" stroke="#000000" stroke-width="7" stroke-linejoin="round"/>
          <!-- Glossy shine arc -->
          <path d="M42 38C42 26 50 18 60 18" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>
          <!-- Shine Rays -->
          <path d="M60 2V7M12 24L18 28M108 24L102 28" stroke="#000000" stroke-width="6.5" stroke-linecap="round"/>
        </svg>
      `
    },
    {
      // 6. Diary App
      bg: '#FDE047',
      title: isEn ? 'DIARY APP' : '飲食日記',
      iconHtml: `
        <svg width="340" height="310" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- 3D Smartphone in Black, White, Yellow, Grayscale -->
          <rect x="26" y="8" width="68" height="104" rx="16" fill="#18181B" stroke="#000000" stroke-width="7"/>
          <rect x="33" y="18" width="54" height="80" rx="8" fill="#FFFFFF"/>
          <!-- Screen contents -->
          <circle cx="60" cy="38" r="12" fill="#FDE047" stroke="#000000" stroke-width="3.5"/>
          <rect x="42" y="56" width="36" height="7" rx="3.5" fill="#18181B"/>
          <rect x="42" y="68" width="26" height="7" rx="3.5" fill="#94A3B8"/>
          <rect x="42" y="80" width="18" height="6" rx="3" fill="#CBD5E1"/>
          <!-- Home button bar -->
          <line x1="52" y1="105" x2="68" y2="105" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/>
        </svg>
      `
    }
  ];

  const bgColor = '#F59E0B'; // Deep warm amber yellow canvas
  const dotColor = '#D97706'; // Dot matrix pattern

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>Daily Diet Rich Menu 2500x1686</title>
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
      background-color: ${bgColor};
      background-image: radial-gradient(${dotColor} 3px, transparent 3px);
      background-size: 38px 38px;
      display: grid;
      grid-template-columns: 833px 834px 833px;
      grid-template-rows: 843px 843px;
      font-family: 'Outfit', 'Noto Sans TC', -apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", sans-serif;
    }
    .grid-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 22px 20px;
    }
    .neo-btn {
      width: 100%;
      height: 100%;
      background: var(--btn-bg);
      border: 8.5px solid #000000;
      border-radius: 46px;
      box-shadow: 18px 18px 0px #000000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px 16px;
      position: relative;
    }
    .icon-wrap {
      height: 380px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .title {
      font-size: 106px;
      font-weight: 900;
      letter-spacing: 3.5px;
      margin-top: 16px;
      text-align: center;
      line-height: 1.1;
      color: #000000;
    }
  </style>
</head>
<body>
  ${cards.map((c, i) => `
    <div class="grid-cell" id="cell-${i}">
      <div class="neo-btn" style="--btn-bg: ${c.bg};">
        <div class="icon-wrap">
          ${c.iconHtml}
        </div>
        <div class="title">${c.title}</div>
      </div>
    </div>
  `).join('')}
</body>
</html>`;
}

// 1. 生成中文版 HTML
const htmlZh = getHtml(false);
fs.writeFileSync(path.resolve(scratchDir, 'refined_b_zh.html'), htmlZh, 'utf8');

// 2. 生成英文版 HTML
const htmlEn = getHtml(true);
fs.writeFileSync(path.resolve(scratchDir, 'refined_b_en.html'), htmlEn, 'utf8');

console.log('Rendering screenshots for Refined Option B (Black, White, Yellow, No tiny text)...');
const shotZh = path.resolve(scratchDir, 'preview_option_b_refined.jpg');
const shotEn = path.resolve(scratchDir, 'preview_option_b_refined_en.jpg');

execSync(`"${chromePath}" --headless --disable-gpu --hide-scrollbars --window-size=2500,1686 --screenshot="${shotZh}" "file://${path.resolve(scratchDir, 'refined_b_zh.html')}"`);
console.log('Saved Refined Option B (ZH):', shotZh);

execSync(`"${chromePath}" --headless --disable-gpu --hide-scrollbars --window-size=2500,1686 --screenshot="${shotEn}" "file://${path.resolve(scratchDir, 'refined_b_en.html')}"`);
console.log('Saved Refined Option B (EN):', shotEn);
