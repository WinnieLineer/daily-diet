const CLIENT_ID = "59091503979-3l5a1kue9umin15hk8arihu7rc2v2i83.apps.googleusercontent.com";
const SCOPES = [
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email"
].join(" ");

let tokenClient = null;
let accessToken = null;
let userInfo = null;

/**
 * Initialize Google Identity Services
 */
export function initGoogleAuth() {
  if (typeof google === 'undefined') {
    console.warn("Google GIS SDK not loaded yet.");
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.error !== undefined) {
        throw response;
      }
      accessToken = response.access_token;
      // Fetch user info using the token
      fetchUserInfo(accessToken);
    },
  });
}

async function fetchUserInfo(token) {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    userInfo = data;
    localStorage.setItem('google_user', JSON.stringify(data));
    localStorage.setItem('google_access_token', token);
    localStorage.setItem('google_token_expiry', Date.now() + 3600 * 1000); // 1 hour
    window.dispatchEvent(new Event('google-auth-change'));
  } catch (err) {
    console.error("Failed to fetch user info", err);
  }
}

export function login() {
  if (!tokenClient) initGoogleAuth();
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

export function logout() {
  accessToken = null;
  userInfo = null;
  localStorage.removeItem('google_user');
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_token_expiry');
  window.dispatchEvent(new Event('google-auth-change'));
}

export function getAccessToken() {
  const expiry = localStorage.getItem('google_token_expiry');
  if (expiry && Date.now() < Number(expiry)) {
    return localStorage.getItem('google_access_token');
  }
  return null;
}

export function getUserInfo() {
  const saved = localStorage.getItem('google_user');
  return saved ? JSON.parse(saved) : null;
}

export function isLoggedIn() {
  return !!getAccessToken();
}
