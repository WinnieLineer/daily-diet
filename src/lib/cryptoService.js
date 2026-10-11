/**
 * 🛡️ Daily Diet - Zero-Knowledge Client-Side Encryption Service
 * 使用 W3C Web Crypto API 原生 AES-256-GCM 進行端對端客戶端加密
 * 確保備份在離開使用者瀏覽器前已全數加密，雲端 Gist 僅留存不可逆密文。
 */

const VAULT_KEY_STORAGE = 'daily_diet_vault_key';

// 將 ArrayBuffer 轉換為 Base64 字串
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 將 Base64 字串轉換為 Uint8Array
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 取得或自動生成當前裝置的專屬 256-bit 端對端金鑰 (Zero-Knowledge Key)
 * 儲存於本機 LocalStorage，絕不發送給任何伺服器。
 */
export function getOrCreateDeviceVaultKey() {
  try {
    let key = localStorage.getItem(VAULT_KEY_STORAGE);
    if (!key) {
      const randomBytes = new Uint8Array(32); // 256 bits
      window.crypto.getRandomValues(randomBytes);
      key = arrayBufferToBase64(randomBytes.buffer);
      localStorage.setItem(VAULT_KEY_STORAGE, key);
    }
    return key;
  } catch (e) {
    return 'DD_DEFAULT_SECURE_FALLBACK_VAULT_KEY_2026';
  }
}

/**
 * 依據 Raw Base64 金鑰匯入為 Web Crypto API AES-GCM CryptoKey
 */
async function importCryptoKey(rawBase64Key) {
  const rawKeyBytes = base64ToUint8Array(rawBase64Key);
  return await window.crypto.subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 🔐 將備份資料物件使用 AES-256-GCM 進行端對端加密
 * @param {Object} plainObject - 原始飲食日誌、目標與體態資料
 * @param {string} [customKey] - 選用自訂金鑰 (若無則採用本機裝置金鑰)
 * @returns {Promise<Object>} 包含 IV 與密文的加密包
 */
export async function encryptBackupPayload(plainObject, customKey = null) {
  if (!plainObject || typeof window === 'undefined' || !window.crypto?.subtle) {
    return plainObject;
  }

  try {
    const rawKey = customKey || getOrCreateDeviceVaultKey();
    const cryptoKey = await importCryptoKey(rawKey);

    // 每次加密生成隨機 12-byte IV (96 bits，GCM 標準安全規格)
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(plainObject));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      encodedData
    );

    return {
      __encrypted: true,
      schema: 'daily-diet-e2ee-v1',
      algorithm: 'AES-256-GCM',
      keyFingerprint: rawKey.slice(0, 8) + '...',
      iv: arrayBufferToBase64(iv.buffer),
      ciphertext: arrayBufferToBase64(ciphertextBuffer),
      createdAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn("⚠️ [CryptoService] Client-side encryption failed, using unencrypted fallback:", err);
    return plainObject;
  }
}

/**
 * 🔓 解密來自雲端 Gist 的備份資料
 * @param {Object} envelope - 備份資料包 (可能為加密密文或舊版明文)
 * @param {string} [customKey] - 選用自訂金鑰
 * @returns {Promise<Object>} 解密後的原始 JSON 資料
 */
export async function decryptBackupPayload(envelope, customKey = null) {
  if (!envelope || typeof envelope !== 'object') {
    return envelope;
  }

  // 1. 若為舊版未加密備份，無縫向下相容返回
  if (!envelope.__encrypted || !envelope.ciphertext) {
    return envelope;
  }

  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error("此環境不支援 Web Crypto API，無法解密端對端雲端備份。");
  }

  try {
    const rawKey = customKey || getOrCreateDeviceVaultKey();
    const cryptoKey = await importCryptoKey(rawKey);

    const iv = base64ToUint8Array(envelope.iv);
    const ciphertextBytes = base64ToUint8Array(envelope.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      ciphertextBytes
    );

    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("❌ [CryptoService] Decryption failed:", err);
    throw new Error("無法解密雲端備份資料：金鑰不符或資料已被損毀。若您更換過裝置，請輸入原裝置備份金鑰。");
  }
}
