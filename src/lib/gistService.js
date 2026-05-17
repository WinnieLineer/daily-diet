const GITHUB_API = 'https://api.github.com/gists';
const BACKUP_FILENAME = 'daily-diet-backup.json';

/**
 * Get GitHub PAT (from env or user settings in IndexedDB)
 */
function getGistToken() {
  // Production: env var; localhost: user may set via settings
  const envToken = import.meta.env.VITE_GITHUB_PAT;
  if (envToken) return envToken;

  // Fallback: check localStorage for manually entered token (localhost dev)
  const localToken = localStorage.getItem('github_pat');
  return localToken || null;
}

/**
 * Get stored Gist ID for this device
 */
function getStoredGistId() {
  return localStorage.getItem('gist_backup_id');
}

/**
 * Save Gist ID for this device
 */
function setStoredGistId(id) {
  localStorage.setItem('gist_backup_id', id);
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
  const token = getGistToken();
  if (!token) return null;

  const gistId = getStoredGistId();
  if (!gistId) return null;

  try {
    const res = await fetch(`${GITHUB_API}/${gistId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      }
    });

    if (!res.ok) {
      if (res.status === 404) {
        // Gist was deleted, clear stored ID
        localStorage.removeItem('gist_backup_id');
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
 */
export async function uploadToGist(jsonData) {
  const token = getGistToken();
  if (!token) throw new Error("Missing GitHub PAT. Please configure in settings or environment.");

  const fileContent = JSON.stringify(jsonData, null, 0);
  const gistId = getStoredGistId();

  const gistPayload = {
    description: `Daily Diet Backup - ${new Date().toISOString().split('T')[0]}`,
    public: false,
    files: {
      [BACKUP_FILENAME]: {
        content: fileContent
      }
    }
  };

  let url, method;
  if (gistId) {
    // Update existing gist
    url = `${GITHUB_API}/${gistId}`;
    method = 'PATCH';
  } else {
    // Create new gist
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

    // If PATCH 404, gist was deleted — try creating a new one
    if (res.status === 404 && method === 'PATCH') {
      console.warn("[Gist] Stored gist not found, creating new one...");
      localStorage.removeItem('gist_backup_id');
      return uploadToGist(jsonData);
    }

    throw new Error(errData.message || `Failed to upload to Gist (${res.status})`);
  }

  const data = await res.json();

  // Store the gist ID for future updates
  if (!gistId) {
    setStoredGistId(data.id);
    console.log(`✅ [Gist] Created new backup gist: ${data.id}`);
  } else {
    console.log(`✅ [Gist] Updated backup gist: ${data.id}`);
  }

  return data;
}

/**
 * Download backup from GitHub Gist
 */
export async function downloadFromGist() {
  const token = getGistToken();
  if (!token) throw new Error("Missing GitHub PAT. Please configure in settings or environment.");

  const gistId = getStoredGistId();
  if (!gistId) return null;

  const res = await fetch(`${GITHUB_API}/${gistId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
    }
  });

  if (!res.ok) {
    if (res.status === 404) {
      localStorage.removeItem('gist_backup_id');
      throw new Error("Backup gist not found. It may have been deleted.");
    }
    throw new Error(`Failed to download from Gist (${res.status})`);
  }

  const data = await res.json();
  const file = data.files?.[BACKUP_FILENAME];

  if (!file) {
    throw new Error("Backup file not found in gist.");
  }

  // If content is truncated, fetch raw URL
  let content = file.content;
  if (file.truncated && file.raw_url) {
    const rawRes = await fetch(file.raw_url);
    content = await rawRes.text();
  }

  return JSON.parse(content);
}
