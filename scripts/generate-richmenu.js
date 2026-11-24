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
      bg: '#FEE047',
      title: isEn ? 'AI CAMERA' : '拍照記錄',
      badge: isEn ? 'NATIVE' : '原生相機',
      badgeBg: '#18181B',
      badgeColor: '#FDE047',
      // Retro-Modern AI Rangefinder Camera
      iconSvg: `
        <g transform="translate(48, 20) scale(1.05)">
          <!-- Camera Body Shadow/Base -->
          <rect x="70" y="90" width="360" height="260" rx="48" fill="#18181B" stroke="#000000" stroke-width="10"/>
          
          <!-- Top Accent Plate -->
          <path d="M70 150 L70 138 C70 112 90 90 118 90 L382 90 C410 90 430 112 430 138 L430 150 Z" fill="#F59E0B" stroke="#000000" stroke-width="10"/>
          
          <!-- Grip textured panel -->
          <rect x="90" y="165" width="320" height="160" rx="28" fill="#27272A"/>
          <line x1="105" y1="210" x2="105" y2="280" stroke="#3F3F46" stroke-width="6" stroke-linecap="round"/>
          <line x1="120" y1="210" x2="120" y2="280" stroke="#3F3F46" stroke-width="6" stroke-linecap="round"/>
          
          <!-- Shutter Button & Dial -->
          <rect x="110" y="65" width="48" height="25" rx="8" fill="#EF4444" stroke="#000000" stroke-width="8"/>
          <rect x="330" y="70" width="60" height="20" rx="6" fill="#D4D4D8" stroke="#000000" stroke-width="8"/>
          
          <!-- Flash Window -->
          <rect x="320" y="108" width="60" height="30" rx="8" fill="#FEF08A" stroke="#000000" stroke-width="7"/>
          <circle cx="350" cy="123" r="6" fill="#FFFFFF"/>
          
          <!-- Giant Multi-Layer Coated Glass Lens -->
          <circle cx="250" cy="225" r="105" fill="#FFFFFF" stroke="#000000" stroke-width="11"/>
          <circle cx="250" cy="225" r="88" fill="#0284C7" stroke="#000000" stroke-width="9"/>
          <circle cx="250" cy="225" r="68" fill="#0369A1" stroke="#000000" stroke-width="7"/>
          <circle cx="250" cy="225" r="46" fill="#09090B"/>
          
          <!-- Lens Glass Specular Curved Highlights -->
          <path d="M200 175 C215 155 245 150 270 155" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" fill="none"/>
          <circle cx="230" cy="205" r="12" fill="#FFFFFF"/>
          <circle cx="270" cy="245" r="6" fill="#38BDF8"/>
          
          <!-- Cute Panda Ear Accents on Camera! -->
          <circle cx="100" cy="85" r="26" fill="#000000"/>
          <circle cx="400" cy="85" r="26" fill="#000000"/>
        </g>
      `
    },
    {
      col: 1, row: 0,
      bg: '#FFFBEB', // High-contrast premium cream gold for the requested hero card
      title: isEn ? 'WHAT TO EAT' : '待會吃什麼',
      badge: isEn ? 'AI HERO' : '✨ AI 智能',
      badgeBg: '#EF4444',
      badgeColor: '#FFFFFF',
      // High-End Cloche / Hot Delicious AI Recommendation
      iconSvg: `
        <g transform="translate(48, 15) scale(1.05)">
          <!-- Magical Aroma Steam Swirls -->
          <path d="M170 95 C160 65 190 40 180 15" stroke="#EF4444" stroke-width="8" stroke-linecap="round" fill="none"/>
          <path d="M250 85 C240 50 270 30 260 8" stroke="#F59E0B" stroke-width="9" stroke-linecap="round" fill="none"/>
          <path d="M330 95 C340 65 310 40 320 15" stroke="#EF4444" stroke-width="8" stroke-linecap="round" fill="none"/>

          <!-- Golden Cloche / Serving Dome (Lifting Up!) -->
          <!-- Handle Knob -->
          <circle cx="250" cy="72" r="24" fill="#FDE047" stroke="#000000" stroke-width="9"/>
          
          <!-- Main Dome Body -->
          <path d="M100 230 C100 120 165 90 250 90 C335 90 400 120 400 230 Z" fill="#F59E0B" stroke="#000000" stroke-width="11"/>
          
          <!-- Dome Golden Inner Tone / Highlight Section -->
          <path d="M135 210 C145 140 190 115 250 115 C265 115 285 118 300 124 C255 120 205 145 190 210 Z" fill="#FEF08A"/>
          <path d="M145 160 C165 130 200 120 230 120" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" fill="none"/>
          
          <!-- Cloche Bottom Rim Bar -->
          <rect x="90" y="222" width="320" height="24" rx="12" fill="#FDE047" stroke="#000000" stroke-width="9"/>

          <!-- Silver Luxury Serving Platter Base -->
          <ellipse cx="250" cy="275" rx="190" ry="46" fill="#000000"/>
          <ellipse cx="250" cy="265" rx="186" ry="42" fill="#FFFFFF" stroke="#000000" stroke-width="10"/>
          <ellipse cx="250" cy="265" rx="150" ry="28" fill="#E2E8F0" stroke="#000000" stroke-width="6"/>

          <!-- Sparkling Stars of AI Deliciousness -->
          <path d="M90 120 L96 95 L102 120 L127 126 L102 132 L96 157 L90 132 L65 126 Z" fill="#EF4444" stroke="#000000" stroke-width="4"/>
          <path d="M405 110 L410 90 L415 110 L435 115 L415 120 L410 140 L405 120 L385 115 Z" fill="#FDE047" stroke="#000000" stroke-width="4"/>
          <circle cx="380" cy="70" r="8" fill="#EF4444"/>
        </g>
      `
    },
    {
      col: 2, row: 0,
      bg: '#FEE047',
      title: isEn ? 'FAVORITES' : '常用餐點',
      badge: isEn ? 'SAVED' : '快速點餐',
      badgeBg: '#18181B',
      badgeColor: '#FDE047',
      // 3D Cute Mascot Star
      iconSvg: `
        <g transform="translate(48, 15) scale(1.05)">
          <!-- Faceted Star Body -->
          <!-- Star Outline and Base Shadow -->
          <path d="M250 25 L295 140 L420 152 L325 235 L352 355 L250 290 L148 355 L175 235 L80 152 L205 140 Z" fill="#F59E0B" stroke="#000000" stroke-width="11" stroke-linejoin="round"/>
          
          <!-- 3D Shading Facets -->
          <path d="M250 25 L295 140 L250 200 Z" fill="#FEF08A"/>
          <path d="M420 152 L325 235 L250 200 Z" fill="#FBBF24"/>
          <path d="M352 355 L250 290 L250 200 Z" fill="#D97706"/>
          <path d="M148 355 L175 235 L250 200 Z" fill="#F59E0B"/>
          <path d="M80 152 L205 140 L250 200 Z" fill="#FEF08A"/>

          <!-- Chef Hat on Left Star Tip -->
          <g transform="translate(100, 35) rotate(-20)">
            <ellipse cx="60" cy="55" rx="35" ry="16" fill="#FFFFFF" stroke="#000000" stroke-width="7"/>
            <path d="M30 55 C20 30 45 15 60 20 C75 10 100 30 90 55 Z" fill="#FFFFFF" stroke="#000000" stroke-width="7"/>
            <rect x="36" y="52" width="48" height="15" fill="#EF4444" stroke="#000000" stroke-width="5"/>
          </g>

          <!-- Cute Star Face Center -->
          <circle cx="250" cy="200" r="70" fill="#FFFFFF" stroke="#000000" stroke-width="9"/>
          <!-- Rosy Cheeks -->
          <ellipse cx="205" cy="215" rx="14" ry="9" fill="#FCA5A5"/>
          <ellipse cx="295" cy="215" rx="14" ry="9" fill="#FCA5A5"/>
          <!-- Big Anime Happy Eyes -->
          <ellipse cx="220" cy="188" rx="11" ry="14" fill="#000000"/>
          <circle cx="223" cy="184" r="5" fill="#FFFFFF"/>
          <ellipse cx="280" cy="188" rx="11" ry="14" fill="#000000"/>
          <circle cx="283" cy="184" r="5" fill="#FFFFFF"/>
          <!-- Wide Smile -->
          <path d="M232 212 C240 226 260 226 268 212" stroke="#000000" stroke-width="8" stroke-linecap="round" fill="none"/>
        </g>
      `
    },
    {
      col: 3, row: 0,
      bg: '#FEE047',
      title: isEn ? '+500ml WATER' : '快速補水',
      badge: isEn ? 'HYDRATE' : '+500ml',
      badgeBg: '#0284C7',
      badgeColor: '#FFFFFF',
      // High-Gloss 3D Water Droplet
      iconSvg: `
        <g transform="translate(48, 15) scale(1.05)">
          <!-- Base Ripple -->
          <ellipse cx="250" cy="340" rx="140" ry="26" fill="#0284C7" stroke="#000000" stroke-width="9"/>
          <ellipse cx="250" cy="336" rx="95" ry="16" fill="#BAE6FD" stroke="#000000" stroke-width="6"/>

          <!-- Droplet Main Shell -->
          <path d="M250 35 C250 35 120 180 120 255 C120 325 178 355 250 355 C322 355 380 325 380 255 C380 180 250 35 250 35 Z" fill="#38BDF8" stroke="#000000" stroke-width="11" stroke-linejoin="round"/>
          
          <!-- Deep Blue Shadow Core -->
          <path d="M250 355 C310 355 360 325 365 265 C370 215 320 135 265 70 C260 62 250 50 250 50 C250 50 240 62 235 70 C200 115 160 170 155 215 C175 270 215 355 250 355 Z" fill="#0284C7"/>
          
          <!-- Internal Cyan/White Glow -->
          <path d="M250 340 C210 340 150 290 150 245 C150 190 230 90 245 65 C240 95 200 180 200 240 C200 290 235 330 250 340 Z" fill="#E0F2FE"/>

          <!-- Glossy Specular Curved Highlight -->
          <path d="M175 235 C175 190 205 145 235 110" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" fill="none"/>
          <circle cx="310" cy="275" r="16" fill="#FFFFFF"/>
          
          <!-- Cute Water Plus Badge -->
          <g transform="translate(305, 120)">
            <circle cx="28" cy="28" r="28" fill="#FDE047" stroke="#000000" stroke-width="7"/>
            <path d="M28 14 L28 42 M14 28 L42 28" stroke="#000000" stroke-width="8" stroke-linecap="round"/>
          </g>
        </g>
      `
    },

    // --- Row 2 ---
    {
      col: 0, row: 1,
      bg: '#FEE047',
      title: isEn ? 'SUMMARY' : '今日總結',
      badge: isEn ? 'TODAY' : '儀表板',
      badgeBg: '#18181B',
      badgeColor: '#FDE047',
      // 3D Isometric Bar Chart with Soaring Rocket Arrow
      iconSvg: `
        <g transform="translate(48, 15) scale(1.05)">
          <!-- Ground Axis -->
          <rect x="70" y="325" width="360" height="20" rx="10" fill="#18181B" stroke="#000000" stroke-width="7"/>

          <!-- Pillar 1: Silver White (Low) -->
          <rect x="100" y="210" width="70" height="120" rx="16" fill="#FFFFFF" stroke="#000000" stroke-width="9"/>
          <rect x="110" y="222" width="18" height="96" rx="9" fill="#E2E8F0"/>

          <!-- Pillar 2: Warm Amber Yellow (Medium) -->
          <rect x="200" y="145" width="70" height="185" rx="16" fill="#F59E0B" stroke="#000000" stroke-width="9"/>
          <rect x="210" y="157" width="18" height="161" rx="9" fill="#FEF08A"/>

          <!-- Pillar 3: Obsidian Charcoal (High/Goal Met!) -->
          <rect x="300" y="80" width="70" height="250" rx="16" fill="#18181B" stroke="#000000" stroke-width="9"/>
          <rect x="310" y="92" width="18" height="226" rx="9" fill="#3F3F46"/>

          <!-- Soaring Dynamic Red Trend Arrow -->
          <path d="M120 180 L220 115 L340 45" stroke="#EF4444" stroke-width="15" stroke-linecap="round" fill="none"/>
          <polygon points="330,25 375,40 348,78" fill="#EF4444" stroke="#000000" stroke-width="6"/>

          <!-- Star of achievement -->
          <circle cx="220" cy="115" r="14" fill="#FDE047" stroke="#000000" stroke-width="5"/>
          <circle cx="120" cy="180" r="10" fill="#FFFFFF" stroke="#000000" stroke-width="4"/>
        </g>
      `
    },
    {
      col: 1, row: 1,
      bg: '#FEE047',
      title: isEn ? 'GOALS' : '體態目標',
      badge: isEn ? 'TDEE' : 'BMR/赤字',
      badgeBg: '#18181B',
      badgeColor: '#FDE047',
      // Bullseye Target with Impaled Golden Arrow
      iconSvg: `
        <g transform="translate(48, 15) scale(1.05)">
          <!-- Target Stand / Drop Shadow -->
          <ellipse cx="250" cy="335" rx="130" ry="24" fill="#000000" opacity="0.3"/>

          <!-- Outer White Ring -->
          <circle cx="250" cy="195" r="140" fill="#FFFFFF" stroke="#000000" stroke-width="11"/>
          
          <!-- Outer Red Band -->
          <circle cx="250" cy="195" r="108" fill="#EF4444" stroke="#000000" stroke-width="9"/>
          
          <!-- Inner White Ring -->
          <circle cx="250" cy="195" r="74" fill="#FFFFFF" stroke="#000000" stroke-width="8"/>
          
          <!-- Golden Bullseye Center -->
          <circle cx="250" cy="195" r="40" fill="#FDE047" stroke="#000000" stroke-width="8"/>
          <circle cx="250" cy="195" r="14" fill="#18181B"/>

          <!-- Arrow Piercing Exactly into Center! -->
          <!-- Shaft -->
          <line x1="250" y1="195" x2="370" y2="75" stroke="#18181B" stroke-width="14" stroke-linecap="round"/>
          <line x1="250" y1="195" x2="370" y2="75" stroke="#F59E0B" stroke-width="6" stroke-linecap="round"/>
          
          <!-- Golden Fletching (Feathers) -->
          <polygon points="345,65 395,50 375,95" fill="#EF4444" stroke="#000000" stroke-width="6"/>
          <polygon points="370,40 405,65 385,85" fill="#FDE047" stroke="#000000" stroke-width="5"/>

          <!-- Impact Flash / Stars -->
          <path d="M225 155 L235 170 L220 175 L235 180 L225 195 L245 185 L255 200 L255 185 L270 190 L260 175 L275 170 L260 165 Z" fill="#FDE047" stroke="#000000" stroke-width="4"/>
        </g>
      `
    },
    {
      col: 2, row: 1,
      bg: '#FEE047',
      title: isEn ? 'GUIDE' : '功能說明',
      badge: isEn ? 'HELP' : '使用秘技',
      badgeBg: '#18181B',
      badgeColor: '#FDE047',
      // 3D Glowing Idea Lightbulb
      iconSvg: `
        <g transform="translate(48, 15) scale(1.05)">
          <!-- Radiating Idea Spark Rays -->
          <line x1="250" y1="20" x2="250" y2="45" stroke="#000000" stroke-width="10" stroke-linecap="round"/>
          <line x1="110" y1="95" x2="135" y2="115" stroke="#000000" stroke-width="10" stroke-linecap="round"/>
          <line x1="390" y1="95" x2="365" y2="115" stroke="#000000" stroke-width="10" stroke-linecap="round"/>
          <line x1="80" y1="200" x2="110" y2="200" stroke="#000000" stroke-width="10" stroke-linecap="round"/>
          <line x1="420" y1="200" x2="390" y2="200" stroke="#000000" stroke-width="10" stroke-linecap="round"/>

          <!-- Screw Base -->
          <rect x="200" y="275" width="100" height="20" rx="8" fill="#71717A" stroke="#000000" stroke-width="8"/>
          <rect x="210" y="295" width="80" height="18" rx="8" fill="#52525B" stroke="#000000" stroke-width="7"/>
          <path d="M225 313 C225 328 275 328 275 313 Z" fill="#18181B" stroke="#000000" stroke-width="6"/>

          <!-- Main Bulb Glass Body -->
          <path d="M190 275 C160 250 130 200 130 150 C130 85 185 35 250 35 C315 35 370 85 370 150 C370 200 340 250 310 275 Z" fill="#F59E0B" stroke="#000000" stroke-width="11"/>
          
          <!-- Inner Glowing Core -->
          <path d="M195 260 C175 235 155 195 155 150 C155 98 198 55 250 55 C265 55 285 62 295 70 C245 68 185 105 185 175 C185 220 205 250 215 260 Z" fill="#FEF08A"/>

          <!-- Curved Glass Reflection -->
          <path d="M175 130 C175 90 205 65 245 65" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round" fill="none"/>

          <!-- Filament -->
          <path d="M215 265 L225 180 L240 195 L250 180 L260 195 L275 180 L285 265" stroke="#18181B" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <circle cx="235" cy="188" r="7" fill="#FDE047"/>
          <circle cx="265" cy="188" r="7" fill="#FDE047"/>
        </g>
      `
    },
    {
      col: 3, row: 1,
      bg: '#FEE047',
      title: isEn ? 'DIARY APP' : '飲食日記',
      badge: isEn ? 'WEB/PWA' : '雲端看板',
      badgeBg: '#10B981',
      badgeColor: '#FFFFFF',
      // 3D Smartphone with Live Daily Diet Dashboard Preview
      iconSvg: `
        <g transform="translate(48, 15) scale(1.05)">
          <!-- Outer Phone Chassis -->
          <rect x="135" y="40" width="230" height="315" rx="42" fill="#18181B" stroke="#000000" stroke-width="11"/>
          
          <!-- Phone Speaker & Camera Notch -->
          <rect x="215" y="52" width="70" height="10" rx="5" fill="#3F3F46"/>
          <circle cx="300" cy="57" r="4" fill="#0284C7"/>

          <!-- Screen Frame (High-Contrast White UI Canvas) -->
          <rect x="150" y="70" width="200" height="255" rx="24" fill="#FFFFFF" stroke="#000000" stroke-width="6"/>

          <!-- Top Brand Header Pill inside Screen -->
          <rect x="165" y="85" width="90" height="16" rx="8" fill="#FDE047" stroke="#000000" stroke-width="3.5"/>

          <!-- Ring Progress Dashboard Preview -->
          <circle cx="250" cy="160" r="38" fill="none" stroke="#E2E8F0" stroke-width="14"/>
          <path d="M250 122 A 38 38 0 1 1 213 175" fill="none" stroke="#F59E0B" stroke-width="14" stroke-linecap="round"/>
          <circle cx="250" cy="160" r="22" fill="#FEF08A"/>
          <circle cx="250" cy="160" r="10" fill="#18181B"/>

          <!-- Today's Meal Cards Preview -->
          <rect x="165" y="215" width="170" height="28" rx="8" fill="#FFFBEB" stroke="#000000" stroke-width="3.5"/>
          <circle cx="182" cy="229" r="6" fill="#EF4444"/>
          <rect x="198" y="224" width="70" height="6" rx="3" fill="#18181B"/>
          <rect x="198" y="233" width="45" height="5" rx="2.5" fill="#94A3B8"/>

          <rect x="165" y="250" width="170" height="28" rx="8" fill="#F0FDF4" stroke="#000000" stroke-width="3.5"/>
          <circle cx="182" cy="264" r="6" fill="#10B981"/>
          <rect x="198" y="259" width="80" height="6" rx="3" fill="#18181B"/>
          <rect x="198" y="268" width="50" height="5" rx="2.5" fill="#94A3B8"/>

          <!-- Home Bottom Indicator Bar -->
          <line x1="220" y1="312" x2="280" y2="312" stroke="#18181B" stroke-width="6" stroke-linecap="round"/>
        </g>
      `
    }
  ];

  const cellW = 625;
  const cellH = 843;
  const padX = 14;
  const padY = 14;
  const cardW = cellW - padX * 2; // 597
  const cardH = cellH - padY * 2; // 815

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
      .badge-text {
        font-family: 'Outfit', 'Noto Sans TC', sans-serif;
        font-weight: 900;
        text-anchor: middle;
        letter-spacing: 1px;
      }
    </style>
    <!-- Dot matrix background pattern -->
    <pattern id="dotGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="3.5" fill="#D97706" />
    </pattern>
  </defs>

  <!-- Canvas Background -->
  <rect width="2500" height="1686" fill="#F59E0B" />
  <rect width="2500" height="1686" fill="url(#dotGrid)" />

  <!-- 8 Cards Grid -->
  ${cards.map((c) => {
    const x = c.col * cellW + padX;
    const y = c.row * cellH + padY;
    const centerX = x + cardW / 2;

    // Calculate optimal title font size for 4-column layout
    let fontSize = isEn ? '80' : '96';
    if (!isEn && c.title.length === 5) fontSize = '92'; // "待會吃什麼" fits 92px perfectly!
    if (isEn && c.title.length > 9) fontSize = '72';

    return `
      <!-- Card Cell (${c.col}, ${c.row}): ${c.title} -->
      <g>
        <!-- Heavy Neo-Brutalist Drop Shadow -->
        <rect x="${x + 16}" y="${y + 16}" width="${cardW}" height="${cardH}" rx="44" fill="#000000" />
        
        <!-- Main Card Surface -->
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="44" fill="${c.bg}" stroke="#000000" stroke-width="8.5" />

        <!-- Top Right Mini Tech Badge -->
        <g transform="translate(${x + cardW - 146}, ${y + 24})">
          <rect width="122" height="42" rx="14" fill="${c.badgeBg}" stroke="#000000" stroke-width="4.5" />
          <text x="61" y="28" class="badge-text" font-size="20" fill="${c.badgeColor}">${c.badge}</text>
        </g>

        <!-- Dynamic Icon Center Area (y: 60px to 540px) -->
        <g transform="translate(${x}, ${y + 60})">
          ${c.iconSvg}
        </g>

        <!-- Divider Line Separating Icon and Huge Title -->
        <line x1="${x + 40}" y1="${y + 580}" x2="${x + cardW - 40}" y2="${y + 580}" stroke="#000000" stroke-width="4" stroke-dasharray="8 8" opacity="0.3" />

        <!-- GIGANTIC, ULTRA-READABLE TITLE (y: 700px) -->
        <text x="${centerX}" y="${y + 705}" class="card-title" font-size="${fontSize}" letter-spacing="${isEn ? '1.5px' : '2.5px'}">
          ${c.title}
        </text>
      </g>
    `;
  }).join('')}
</svg>
  `.trim();
}

async function run() {
  console.log('🎨 Generating High-End 8-Grid Rich Menu SVGs with Giant Typography...');
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

  console.log('🎉 High-End 8-Grid Rich Menu images generated successfully!');
}

run().catch((err) => {
  console.error('❌ Error generating rich menu:', err);
  process.exit(1);
});
