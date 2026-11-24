import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const outDir = './public';
const scratchDir = './scratch';
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

function getSvg(isEn = false) {
  // 8 Cards: 4 columns x 2 rows
  // Grid: 2500 x 1686, Cell width = 625, Cell height = 843
  const cards = [
    // --- Row 1 ---
    {
      col: 0, row: 0,
      bg: '#FDE047',
      title: isEn ? 'AI CAMERA' : '拍照記錄',
      subtitle: isEn ? 'SCAN MEAL' : '拍照辨識',
      accentBg: '#000000',
      accentText: '#FDE047',
      iconSvg: `
        <!-- Camera Body -->
        <g transform="translate(142, 100) scale(2.8)">
          <rect x="10" y="24" width="100" height="74" rx="16" fill="#18181B" stroke="#000000" stroke-width="6"/>
          <path d="M38 24 L46 12 L74 12 L82 24 Z" fill="#F59E0B" stroke="#000000" stroke-width="5" stroke-linejoin="round"/>
          <!-- Flash -->
          <circle cx="28" cy="40" r="6" fill="#FDE047" stroke="#000000" stroke-width="3"/>
          <!-- Lens Outer -->
          <circle cx="60" cy="60" r="26" fill="#FFFFFF" stroke="#000000" stroke-width="5"/>
          <circle cx="60" cy="60" r="18" fill="#3B82F6" stroke="#000000" stroke-width="4"/>
          <circle cx="60" cy="60" r="10" fill="#1E1B4B"/>
          <!-- Lens Reflection -->
          <circle cx="56" cy="56" r="4" fill="#FFFFFF"/>
        </g>
      `
    },
    {
      col: 1, row: 0,
      bg: '#FEF08A', // Extra warm focus for the requested feature
      title: isEn ? 'WHAT TO EAT' : '待會吃什麼',
      subtitle: isEn ? 'AI ADVISOR' : '智能推薦',
      accentBg: '#EF4444',
      accentText: '#FFFFFF',
      badge: 'AI HOT',
      iconSvg: `
        <!-- Cloche / Delicious Dish -->
        <g transform="translate(142, 100) scale(2.8)">
          <!-- Plate Base -->
          <ellipse cx="60" cy="84" rx="52" ry="12" fill="#FFFFFF" stroke="#000000" stroke-width="6"/>
          <!-- Food dome / cloche -->
          <path d="M18 80 C18 42 40 28 60 28 C80 28 102 42 102 80 Z" fill="#F59E0B" stroke="#000000" stroke-width="6"/>
          <!-- Handle knob -->
          <circle cx="60" cy="22" r="7" fill="#FDE047" stroke="#000000" stroke-width="4"/>
          <!-- Sparkles -->
          <path d="M22 22 L26 12 L30 22 L40 26 L30 30 L26 40 L22 30 L12 26 Z" fill="#EF4444" stroke="#000000" stroke-width="2.5"/>
          <path d="M96 24 L99 17 L102 24 L109 27 L102 30 L99 37 L96 30 L89 27 Z" fill="#F59E0B" stroke="#000000" stroke-width="2.5"/>
          <!-- Gloss line -->
          <path d="M34 50 C40 38 52 34 60 34" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
        </g>
      `
    },
    {
      col: 2, row: 0,
      bg: '#FDE047',
      title: isEn ? 'FAVORITES' : '常用餐點',
      subtitle: isEn ? 'QUICK LOG' : '一鍵秒記',
      accentBg: '#000000',
      accentText: '#FDE047',
      iconSvg: `
        <!-- Smiling Star Mascot -->
        <g transform="translate(142, 100) scale(2.8)">
          <path d="M60 8L75 42L112 46L85 71L92 108L60 89L28 108L35 71L8 46L45 42Z" fill="#F59E0B" stroke="#000000" stroke-width="6" stroke-linejoin="round"/>
          <path d="M60 8L75 42L112 46L85 71L60 60Z" fill="#FEF08A"/>
          <circle cx="60" cy="62" r="20" fill="#FFFFFF" stroke="#000000" stroke-width="5"/>
          <circle cx="53" cy="59" r="4" fill="#000000"/>
          <circle cx="67" cy="59" r="4" fill="#000000"/>
          <path d="M53 67C56 72 64 72 67 67" stroke="#000000" stroke-width="3.5" stroke-linecap="round"/>
        </g>
      `
    },
    {
      col: 3, row: 0,
      bg: '#FDE047',
      title: isEn ? '+500ml WATER' : '快速補水',
      subtitle: isEn ? 'HYDRATE' : '喝水打卡',
      accentBg: '#0284C7',
      accentText: '#FFFFFF',
      iconSvg: `
        <!-- Glossy Water Droplet -->
        <g transform="translate(142, 100) scale(2.8)">
          <path d="M60 10C60 10 20 56 20 82C20 104 38 114 60 114C82 114 100 104 100 82C100 56 60 10 60 10Z" fill="#38BDF8" stroke="#000000" stroke-width="6.5" stroke-linejoin="round"/>
          <path d="M60 114C78 114 94 105 96 86C97 72 82 46 64 26C62 23 60 21 60 21C60 21 58 23 56 26C45 40 34 58 31 72C38 88 50 114 60 114Z" fill="#0284C7"/>
          <path d="M38 78C38 64 46 50 56 40" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
          <circle cx="78" cy="88" r="6" fill="#FFFFFF"/>
        </g>
      `
    },

    // --- Row 2 ---
    {
      col: 0, row: 1,
      bg: '#FDE047',
      title: isEn ? 'SUMMARY' : '今日總結',
      subtitle: isEn ? 'DAILY STATS' : '進度儀表板',
      accentBg: '#000000',
      accentText: '#FDE047',
      iconSvg: `
        <!-- Bar Chart with Trend -->
        <g transform="translate(142, 100) scale(2.8)">
          <rect x="16" y="60" width="22" height="46" rx="5" fill="#FFFFFF" stroke="#000000" stroke-width="5"/>
          <rect x="48" y="38" width="22" height="68" rx="5" fill="#F59E0B" stroke="#000000" stroke-width="5"/>
          <rect x="80" y="16" width="22" height="90" rx="5" fill="#18181B" stroke="#000000" stroke-width="5"/>
          <path d="M10 108H110" stroke="#000000" stroke-width="6.5" stroke-linecap="round"/>
          <path d="M24 50L56 26L90 10" stroke="#EF4444" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
          <polygon points="90,6 98,18 86,16" fill="#EF4444" stroke="#000000" stroke-width="2"/>
        </g>
      `
    },
    {
      col: 1, row: 1,
      bg: '#FDE047',
      title: isEn ? 'GOALS' : '體態目標',
      subtitle: isEn ? 'TARGET &amp; BMR' : '熱量與熱量赤字',
      accentBg: '#000000',
      accentText: '#FDE047',
      iconSvg: `
        <!-- Bulls-eye Target with Arrow -->
        <g transform="translate(142, 100) scale(2.8)">
          <circle cx="60" cy="60" r="46" fill="#FFFFFF" stroke="#000000" stroke-width="6"/>
          <circle cx="60" cy="60" r="34" fill="#EF4444" stroke="#000000" stroke-width="5"/>
          <circle cx="60" cy="60" r="22" fill="#FFFFFF" stroke="#000000" stroke-width="4"/>
          <circle cx="60" cy="60" r="10" fill="#EF4444" stroke="#000000" stroke-width="3"/>
          <!-- Dart Arrow hitting center -->
          <path d="M60 60 L92 28" stroke="#18181B" stroke-width="6" stroke-linecap="round"/>
          <polygon points="86,22 100,20 98,34" fill="#F59E0B" stroke="#000000" stroke-width="2.5"/>
        </g>
      `
    },
    {
      col: 2, row: 1,
      bg: '#FDE047',
      title: isEn ? 'GUIDE' : '功能說明',
      subtitle: isEn ? 'TUTORIAL' : '新手操作指引',
      accentBg: '#000000',
      accentText: '#FDE047',
      iconSvg: `
        <!-- Lightbulb -->
        <g transform="translate(142, 100) scale(2.8)">
          <path d="M38 84H82M43 94H77M50 104H70" stroke="#000000" stroke-width="6" stroke-linecap="round"/>
          <path d="M38 78C30 70 24 57 24 44C24 24 40 12 60 12C80 12 96 24 96 44C96 57 90 70 82 78V84H38V78Z" fill="#F59E0B" stroke="#000000" stroke-width="6" stroke-linejoin="round"/>
          <path d="M42 38C42 26 50 18 60 18" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
          <path d="M60 2V7M12 24L18 28M108 24L102 28" stroke="#000000" stroke-width="5" stroke-linecap="round"/>
        </g>
      `
    },
    {
      col: 3, row: 1,
      bg: '#FDE047',
      title: isEn ? 'DIARY APP' : '飲食日記',
      subtitle: isEn ? 'OPEN WEB' : '開啟雲端看板',
      accentBg: '#10B981',
      accentText: '#FFFFFF',
      iconSvg: `
        <!-- Smartphone App -->
        <g transform="translate(142, 100) scale(2.8)">
          <rect x="28" y="10" width="64" height="100" rx="14" fill="#18181B" stroke="#000000" stroke-width="6"/>
          <rect x="35" y="20" width="50" height="76" rx="8" fill="#FFFFFF"/>
          <circle cx="60" cy="38" r="11" fill="#FDE047" stroke="#000000" stroke-width="3"/>
          <rect x="42" y="56" width="36" height="6" rx="3" fill="#18181B"/>
          <rect x="42" y="66" width="26" height="6" rx="3" fill="#94A3B8"/>
          <rect x="42" y="76" width="18" height="6" rx="3" fill="#CBD5E1"/>
          <line x1="52" y1="102" x2="68" y2="102" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
        </g>
      `
    }
  ];

  const cellW = 625;
  const cellH = 843;
  const padX = 16;
  const padY = 18;
  const cardW = cellW - padX * 2; // 593
  const cardH = cellH - padY * 2; // 807

  return `
<svg width="2500" height="1686" viewBox="0 0 2500 1686" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&amp;family=Noto+Sans+TC:wght@900&amp;display=swap');
      .card-title {
        font-family: 'Outfit', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
        font-weight: 900;
        fill: #000000;
        text-anchor: middle;
      }
      .card-sub {
        font-family: 'Outfit', 'Noto Sans TC', sans-serif;
        font-weight: 800;
        text-anchor: middle;
        letter-spacing: 2px;
      }
    </style>
    <!-- Dot matrix background pattern -->
    <pattern id="dotGrid" width="38" height="38" patternUnits="userSpaceOnUse">
      <circle cx="19" cy="19" r="3.5" fill="#D97706" />
    </pattern>
  </defs>

  <!-- Background Base -->
  <rect width="2500" height="1686" fill="#F59E0B" />
  <rect width="2500" height="1686" fill="url(#dotGrid)" />

  <!-- 8 Cards -->
  ${cards.map((c) => {
    const x = c.col * cellW + padX;
    const y = c.row * cellH + padY;
    const centerX = x + cardW / 2;

    return `
      <!-- Card Cell (${c.col}, ${c.row}) -->
      <g>
        <!-- Drop Shadow -->
        <rect x="${x + 14}" y="${y + 14}" width="${cardW}" height="${cardH}" rx="38" fill="#000000" />
        
        <!-- Main Card Body -->
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="38" fill="${c.bg}" stroke="#000000" stroke-width="8" />

        <!-- Badge if any -->
        ${c.badge ? `
          <g transform="translate(${x + cardW - 130}, ${y + 24})">
            <rect width="105" height="42" rx="12" fill="${c.accentBg}" stroke="#000000" stroke-width="4" />
            <text x="52.5" y="27" font-family="'Outfit', sans-serif" font-weight="900" font-size="20" fill="${c.accentText}" text-anchor="middle">${c.badge}</text>
          </g>
        ` : ''}

        <!-- Icon Area (Upper half) -->
        <g transform="translate(${x}, ${y + 30})">
          ${c.iconSvg}
        </g>

        <!-- Subtitle Pill -->
        <g transform="translate(${centerX - 100}, ${y + 575})">
          <rect width="200" height="46" rx="23" fill="${c.accentBg}" stroke="#000000" stroke-width="4" />
          <text x="100" y="30" class="card-sub" font-size="20" fill="${c.accentText}">${c.subtitle}</text>
        </g>

        <!-- Main Title (Large, bold, high contrast) -->
        <text x="${centerX}" y="${y + 705}" class="card-title" font-size="${isEn ? '62' : '76'}" letter-spacing="${isEn ? '1px' : '2px'}">
          ${c.title}
        </text>
      </g>
    `;
  }).join('')}
</svg>
  `.trim();
}

async function run() {
  console.log('🎨 Generating 8-Grid Rich Menu SVGs...');
  const zhSvg = getSvg(false);
  const enSvg = getSvg(true);

  const zhSvgPath = path.resolve(scratchDir, 'richmenu-8grid-zh.svg');
  const enSvgPath = path.resolve(scratchDir, 'richmenu-8grid-en.svg');

  fs.writeFileSync(zhSvgPath, zhSvg, 'utf8');
  fs.writeFileSync(enSvgPath, enSvg, 'utf8');
  console.log('✅ SVGs written to scratch/');

  console.log('📸 Rendering High-Res 2500x1686 JPEG with Sharp...');
  
  // Render ZH
  const zhBuffer = await sharp(Buffer.from(zhSvg))
    .jpeg({ quality: 96, chromaSubsampling: '4:4:4' })
    .toBuffer();

  const zhTargets = [
    path.resolve(outDir, 'richmenu-2500x1686.jpg'),
    path.resolve(outDir, 'rich-menu-2500x1686.jpg'),
    path.resolve(outDir, 'richmenu-6grid.jpg'), // fallback alias
    path.resolve(outDir, 'rich-menu-banner.jpg')
  ];

  for (const dest of zhTargets) {
    fs.writeFileSync(dest, zhBuffer);
    const size = (fs.statSync(dest).size / 1024).toFixed(1);
    console.log(`  ➔ Saved: ${dest} (${size} KB)`);
  }

  // Render EN
  const enBuffer = await sharp(Buffer.from(enSvg))
    .jpeg({ quality: 96, chromaSubsampling: '4:4:4' })
    .toBuffer();

  const enDest = path.resolve(outDir, 'richmenu-en-2500x1686.jpg');
  fs.writeFileSync(enDest, enBuffer);
  const enSize = (fs.statSync(enDest).size / 1024).toFixed(1);
  console.log(`  ➔ Saved: ${enDest} (${enSize} KB)`);

  console.log('🎉 8-Grid Rich Menu images generated successfully!');
}

run().catch((err) => {
  console.error('❌ Error generating rich menu:', err);
  process.exit(1);
});
