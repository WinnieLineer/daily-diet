/**
 * 🎖️ 創始支持者特權服務 (Founder Supporter Service)
 * 管理創始支持者身分快取、專屬特權、金色流光主題與雲端即時校驗
 */

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxmQC8f0NxOKRAIuLTSTVC-Vinf9lmU0cnb1akR5oKUEYD-3h7XjFV8Zm_LPkv_kdQo/exec';
const IS_FOUNDER_KEY = 'daily_diet_is_founder';
const FOUNDER_DATA_KEY = 'daily_diet_founder_data';
const FOUNDER_GLOW_KEY = 'daily_diet_founder_glow';

/**
 * 檢查當前用戶是否為創始支持者
 * @returns {boolean}
 */
export function isFounderUser() {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('founder') === '1' || params.get('founder') === 'true') return true;
    }
    return localStorage.getItem(IS_FOUNDER_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * 取得當前創始支持者的詳細資料
 * @returns {Object|null}
 */
export function getFounderData() {
  try {
    const raw = localStorage.getItem(FOUNDER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * 檢查是否啟用創始者專屬金色流光光環
 * @returns {boolean}
 */
export function isFounderGlowEnabled() {
  try {
    return localStorage.getItem(FOUNDER_GLOW_KEY) !== 'false';
  } catch (e) {
    return true;
  }
}

/**
 * 切換創始者金色流光光環
 * @param {boolean} enabled 
 */
export function toggleFounderGlow(enabled) {
  try {
    localStorage.setItem(FOUNDER_GLOW_KEY, enabled ? 'true' : 'false');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('founder-glow-updated', { detail: { enabled } }));
    }
  } catch (e) {}
}

/**
 * 設定並快取創始支持者身分
 * @param {boolean} isFounder 
 * @param {Object} data 
 */
export function setFounderStatus(isFounder, data = null) {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('founder') === '1' || params.get('founder') === 'true') {
        isFounder = true;
      }
    }
    if (isFounder) {
      localStorage.setItem(IS_FOUNDER_KEY, 'true');
      if (data) localStorage.setItem(FOUNDER_DATA_KEY, JSON.stringify(data));
      // 自動解鎖並戴上熊貓金色皇冠
      localStorage.setItem('panda_sponsor_crown', 'true');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('panda-crown-updated'));
        window.dispatchEvent(new CustomEvent('founder-status-updated', { detail: { isFounder: true, data } }));
      }
    } else {
      localStorage.removeItem(IS_FOUNDER_KEY);
      localStorage.removeItem(FOUNDER_DATA_KEY);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('founder-status-updated', { detail: { isFounder: false, data: null } }));
      }
    }
  } catch (e) {
    console.warn('Failed to set founder status:', e);
  }
}

/**
 * 向雲端後端即時查詢創始支持者狀態
 * @param {string} userId 
 * @param {string} userName 
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
export async function checkFounderStatusFromCloud(userId, userName, email = '', forceOverwrite = false) {
  const queryParams = new URLSearchParams({
    action: 'checkFounderStatus',
    userId: userId || '',
    userName: userName || '',
    _t: String(Date.now())
  });
  if (email) queryParams.append('email', email);

  try {
    const res = await fetch(`${GAS_API_URL}?${queryParams.toString()}`);
    if (!res.ok) return isFounderUser();
    const data = await res.json();
    if (data && data.status === 'ok') {
      const isF = Boolean(data.isFounder);
      if (isF) {
        setFounderStatus(true, data.data);
        return true;
      }
      if (forceOverwrite) {
        setFounderStatus(false, null);
        return false;
      }
      return isFounderUser();
    }
  } catch (err) {
    console.warn('Failed to query founder status from cloud:', err);
  }
  return isFounderUser();
}
