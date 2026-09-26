import { getLocalDateString } from './constants';
import { getEffectiveIds } from './syncService';

const GITHUB_API = 'https://api.github.com/gists';
const BACKUP_FILENAME = 'daily-diet-backup.json';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxmQC8f0NxOKRAIuLTSTVC-Vinf9lmU0cnb1akR5oKUEYD-3h7XjFV8Zm_LPkv_kdQo/exec';

/**
 * Get GitHub PAT (from env or user settings in IndexedDB)
 */
function getGistToken() {
  try {
    const localToken = typeof localStorage !== 'undefined' ? localStorage.getItem('github_pat') : null;
    return localToken || null;
  } catch (e) {
    return null;
  }
}

/**
 * Get stored Gist ID for this device
 */
function getStoredGistId() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('gist_backup_id') : null;
  } catch (e) {
    return null;
  }
}

/**
 * Save Gist ID for this device
 */
function setStoredGistId(id) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (id) {
      localStorage.setItem('gist_backup_id', id);
    } else {
      localStorage.removeItem('gist_backup_id');
    }
  } catch (e) {}
}

/**
 * Get current Gist ID (for display in settings)
 */
export function getCurrentGistId() {
  return getStoredGistId();
}

/**
 * Set Gist ID manually (for cross-device restore)
 */
export function setGistId(id) {
  setStoredGistId(id);
}

/**
 * Get info about the current backup on Gist
 */
export async function getBackupInfo() {
  const gistId = getStoredGistId();
  if (!gistId) return null;
  const token = getGistToken();

  try {
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${GITHUB_API}/${gistId}`, { headers });
    if (!res.ok) {
      if (res.status === 404) {
        try {
          localStorage.removeItem('gist_backup_id');
        } catch (e) {}
        return null;
      }
      return null;
    }

    const data = await res.json();
    const file = data.files?.[BACKUP_FILENAME];
    return {
      id: data.id,
      modifiedTime: data.updated_at,
      size: file ? file.size : 0,
      description: data.description,
    };
  } catch (err) {
    console.error("Failed to get backup info:", err);
    return null;
  }
}

/**
 * Upload backup to GitHub Gist (create or update)
 * 🌟 具備智慧代理：若本機無 PAT，自動委託 GAS 後端以 GITHUB_PAT 代行同步
 */
export async function uploadToGist(jsonData, explicitGistId = null) {
  const token = getGistToken();
  const gistId = explicitGistId || getStoredGistId();

  // 1. 若本機已手動配置 GitHub PAT (例如開發者本機環境)，直接調用 GitHub REST API
  if (token) {
    const fileContent = JSON.stringify(jsonData, null, 0);
    const gistPayload = {
      description: `Daily Diet Backup - ${getLocalDateString()}`,
      public: false,
      files: {
        [BACKUP_FILENAME]: {
          content: fileContent
        }
      }
    };

    let url, method;
    if (gistId) {
      url = `${GITHUB_API}/${gistId}`;
      method = 'PATCH';
    } else {
      url = GITHUB_API;
      method = 'POST';
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gistPayload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = String(errData.message || '');
      if (method === 'PATCH' && (res.status === 404 || res.status === 422 || res.status === 403 || errMsg.includes('cannot be updated') || errMsg.includes('Not Found'))) {
        console.warn(`[Gist] Stored gist ${gistId} cannot be updated (${errMsg || res.status}), self-healing by creating a fresh backup gist...`);
        try {
          localStorage.removeItem('gist_backup_id');
        } catch (e) {}
        return uploadToGist(jsonData, null);
      }
      throw new Error(errMsg || `Failed to upload to Gist (${res.status})`);
    }

    const data = await res.json();
    if (data?.id) {
      setStoredGistId(data.id);
      console.log(`✅ [Gist Direct] Backup saved to gist: ${data.id}`);
    }
    return data;
  }

  // 2. 🌟 免 PAT 模式 (生產環境所有一般用戶 / Web App)：透過 GAS 後端安全代行 Gist 同步
  try {
    const { userId, userName } = typeof getEffectiveIds === 'function' ? getEffectiveIds() : { userId: '', userName: '' };
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'backupToGist',
        userId: userId || 'web_user',
        userName: userName || 'Web訪客',
        gistId: gistId || '',
        data: jsonData
      })
    });

    if (!res.ok) {
      throw new Error(`雲端同步伺服器連線異常 (${res.status})`);
    }

    const result = await res.json();
    if (result.status !== 'ok') {
      throw new Error(result.message || '雲端同步失敗');
    }

    if (result.gistId) {
      setStoredGistId(result.gistId);
      console.log(`✅ [Gist Cloud Proxy] 已透過雲端後端成功備份至 Gist: ${result.gistId}`);
    }
    return result;
  } catch (gasErr) {
    console.error("[Gist] Cloud backup proxy failed:", gasErr);
    throw gasErr;
  }
}

/**
 * Download backup from GitHub Gist
 * 優先以前端直接取得，若遭遇頻率限制或 CORS 則自動透過 GAS 後端備援
 */
export async function downloadFromGist(explicitGistId = null) {
  const token = getGistToken();
  const gistId = explicitGistId || getStoredGistId();
  if (!gistId) return null;

  // 1. 優先嘗試由前端直接向 GitHub API 下載
  try {
    const headers = {
      'Accept': 'application/vnd.github+json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${GITHUB_API}/${gistId}`, { headers });
    if (res.ok) {
      const data = await res.json();
      const file = data.files?.[BACKUP_FILENAME];
      if (file) {
        let content = file.content;
        if (file.truncated && file.raw_url) {
          const rawRes = await fetch(file.raw_url);
          content = await rawRes.text();
        }
        return JSON.parse(content);
      }
    } else if (res.status === 404) {
      try {
        localStorage.removeItem('gist_backup_id');
      } catch (e) {}
      throw new Error("備份 Gist 不存在或已被刪除 (404)。");
    }
  } catch (directErr) {
    console.warn("[Gist] Direct download failed, attempting GAS fallback:", directErr?.message);
  }

  // 2. 備援方案：若 GitHub 直連受限，向 GAS 後端請求代拉 Gist
  try {
    const res = await fetch(`${GAS_URL}?action=restoreFromGist&gistId=${encodeURIComponent(gistId)}`);
    if (res.ok) {
      const result = await res.json();
      if (result.status === 'ok' && result.data) {
        return result.data;
      }
    }
  } catch (gasErr) {
    console.warn("[Gist] GAS download fallback failed:", gasErr);
  }

  throw new Error("無法從雲端讀取備份資料，請確認網路連線或 Gist ID 是否正確。");
}
