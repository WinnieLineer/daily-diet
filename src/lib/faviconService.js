/**
 * 🐼 Daily Diet 動態 Favicon 與標題切換服務
 * 支援一般用戶介面與管理員維護後台 (#/admin) 專屬 Favicon
 */

const ADMIN_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="512" height="512">
  <!-- Neo-brutalist 醒目亮黃圓角徽章背景 + 粗黑邊框 -->
  <rect x="10" y="10" width="180" height="180" rx="48" fill="#FDE047" stroke="#000000" stroke-width="14" />
  
  <!-- 熊貓耳朵 -->
  <circle cx="54" cy="62" r="28" fill="#000000" />
  <circle cx="146" cy="62" r="28" fill="#000000" />
  
  <!-- 熊貓臉部主體 -->
  <ellipse cx="100" cy="118" rx="68" ry="58" fill="#FFFFFF" stroke="#000000" stroke-width="10" />
  
  <!-- 特務/維護者酷炫黑墨鏡 (Neo-brutalist Sunglasses) -->
  <rect x="44" y="94" width="48" height="32" rx="7" fill="#000000" />
  <rect x="108" y="94" width="48" height="32" rx="7" fill="#000000" />
  <rect x="88" y="101" width="24" height="6" rx="2" fill="#000000" />
  
  <!-- 墨鏡高質感霓虹藍反光條 -->
  <polygon points="50,118 60,98 67,98 57,118" fill="#38BDF8" />
  <polygon points="66,118 73,105 78,105 71,118" fill="#38BDF8" opacity="0.85" />
  <polygon points="114,118 124,98 131,98 121,118" fill="#38BDF8" />
  <polygon points="130,118 137,105 142,105 135,118" fill="#38BDF8" opacity="0.85" />
  
  <!-- 鼻子 -->
  <ellipse cx="100" cy="137" rx="10" ry="7" fill="#000000" />
  
  <!-- 自信微笑 -->
  <path d="M 86 148 Q 100 160 114 148" fill="none" stroke="#000000" stroke-width="5" stroke-linecap="round" />

  <!-- 管理員專屬徽章 (右上角：黑底閃電 ⚡ 標章) -->
  <rect x="122" y="10" width="66" height="38" rx="14" fill="#000000" stroke="#FDE047" stroke-width="4" />
  <path d="M 158 15 L 145 28 L 153 28 L 148 42 L 165 26 L 157 26 Z" fill="#38BDF8" />
</svg>`;

const ADMIN_FAVICON_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ADMIN_FAVICON_SVG)}`;

/**
 * 動態更新瀏覽器分頁 Favicon 與 Document Title
 * @param {boolean} isAdmin 是否處於管理員後台介面
 */
export function updateAppFavicon(isAdmin) {
  try {
    const head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return;

    // 清理舊的 icon 標籤以觸發瀏覽器分頁即時重繪
    const existingIcons = document.querySelectorAll("link[rel*='icon']");
    existingIcons.forEach(el => el.remove());

    const newLink = document.createElement('link');
    newLink.rel = 'icon';

    if (isAdmin) {
      newLink.type = 'image/svg+xml';
      newLink.href = ADMIN_FAVICON_DATA_URI;
      document.title = 'Daily Diet ⚡ 管理後台即時監控';
    } else {
      newLink.type = 'image/png';
      const baseUrl = import.meta.env.BASE_URL || '/';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      newLink.href = `${cleanBase}favicon.png`;
      document.title = 'Daily Diet - Panda Coach';
    }

    head.appendChild(newLink);
  } catch (err) {
    console.warn('動態切換 Favicon 失敗:', err);
  }
}
