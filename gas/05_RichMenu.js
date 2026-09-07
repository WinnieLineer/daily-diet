/**
 * ========================================================
 * 05_RichMenu.js - LINE 原生相機雙語圖文選單 (Rich Menu)
 * 支援：中文選單、英文選單、自動建立、背景上傳與依用戶語系切換
 * ========================================================
 */

/**
 * 建立並發布中文版 6 宮格原生相機圖文選單
 * @param {string} channelAccessToken
 * @param {string} liffId
 * @param {GoogleAppsScript.Properties.Properties} [props]
 * @returns {string} richMenuId
 */
function setupChineseNativeCameraRichMenu(channelAccessToken, liffId, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const token = channelAccessToken || props.getProperty('CHANNEL_ACCESS_TOKEN') || props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token) throw new Error("缺少 CHANNEL_ACCESS_TOKEN");

  const actualLiffId = liffId || props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';

  // 1. 定義 6 宮格 Rich Menu 物件 (2500 x 1686)
  const richMenuPayload = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "Daily Diet 6-Grid Native Menu (ZH)",
    chatBarText: t('menuChatBar', 'zh'),
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: "camera" }
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: "message", text: "常用" }
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "喝水 500" }
      },
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "今日總結" }
      },
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: "message", text: "說明" }
      },
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: "uri", uri: `https://liff.line.me/${actualLiffId}` }
      }
    ]
  };

  // 2. 透過 LINE API 建立 Rich Menu
  const createRes = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(richMenuPayload),
    muteHttpExceptions: true
  });

  const createStatus = createRes.getResponseCode();
  const createBody = JSON.parse(createRes.getContentText() || '{}');
  if (createStatus !== 200 || !createBody.richMenuId) {
    throw new Error(`建立中文選單失敗 (HTTP ${createStatus}): ${createRes.getContentText()}`);
  }
  const richMenuId = createBody.richMenuId;
  console.log(`✅ 中文 Rich Menu 建立成功，ID: ${richMenuId}`);

  // 3. 自 GitHub 下載 2500x1686 圖片並上傳至 LINE
  const imageUrl = RICH_MENU_IMAGE_ZH || 'https://raw.githubusercontent.com/WinnieLineer/daily-diet/main/public/richmenu-2500x1686.jpg';
  const imgRes = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true });
  if (imgRes.getResponseCode() !== 200) {
    throw new Error(`下載中文選單圖片失敗: HTTP ${imgRes.getResponseCode()}`);
  }
  const imageBlob = imgRes.getBlob().setContentType('image/jpeg');

  const uploadRes = UrlFetchApp.fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'post',
    headers: { 'Authorization': `Bearer ${token}` },
    payload: imageBlob,
    muteHttpExceptions: true
  });

  if (uploadRes.getResponseCode() !== 200) {
    throw new Error(`上傳中文選單圖片失敗: HTTP ${uploadRes.getResponseCode()} - ${uploadRes.getContentText()}`);
  }
  console.log(`✅ 中文選單背景圖片上傳成功！`);

  // 4. 設定為所有使用者的全局預設圖文選單
  const setDefaultRes = UrlFetchApp.fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: 'post',
    headers: { 'Authorization': `Bearer ${token}` },
    muteHttpExceptions: true
  });

  if (setDefaultRes.getResponseCode() !== 200) {
    throw new Error(`設定預設選單失敗: HTTP ${setDefaultRes.getResponseCode()}`);
  }
  console.log(`✅ 已成功將 ${richMenuId} 設定為全局預設圖文選單！`);

  props.setProperty('CURRENT_RICH_MENU_ID', richMenuId);
  return richMenuId;
}

/**
 * 建立英文版 6 宮格原生相機圖文選單
 * @param {string} channelAccessToken
 * @param {string} liffId
 * @param {GoogleAppsScript.Properties.Properties} [props]
 * @returns {string} richMenuId
 */
function setupEnglishNativeCameraRichMenu(channelAccessToken, liffId, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const token = channelAccessToken || props.getProperty('CHANNEL_ACCESS_TOKEN') || props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token) throw new Error("缺少 CHANNEL_ACCESS_TOKEN");

  const actualLiffId = liffId || props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';

  // 1. 定義英文 6 宮格 Rich Menu 物件 (2500 x 1686)
  const richMenuPayload = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "Daily Diet 6-Grid Native Menu (EN)",
    chatBarText: t('menuChatBar', 'en'),
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: "camera" }
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: "message", text: "Favorites" }
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "+500ml Water" }
      },
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "Daily Summary" }
      },
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: "message", text: "Guide" }
      },
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: "uri", uri: `https://liff.line.me/${actualLiffId}` }
      }
    ]
  };

  // 2. 透過 LINE API 建立 Rich Menu
  const createRes = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(richMenuPayload),
    muteHttpExceptions: true
  });

  const createStatus = createRes.getResponseCode();
  const createBody = JSON.parse(createRes.getContentText() || '{}');
  if (createStatus !== 200 || !createBody.richMenuId) {
    throw new Error(`建立英文選單失敗 (HTTP ${createStatus}): ${createRes.getContentText()}`);
  }
  const richMenuId = createBody.richMenuId;
  console.log(`✅ 英文 Rich Menu 建立成功，ID: ${richMenuId}`);

  // 3. 自 GitHub 下載 2500x1686 英文選單圖片並上傳至 LINE
  const imageUrl = RICH_MENU_IMAGE_EN || 'https://raw.githubusercontent.com/WinnieLineer/daily-diet/main/public/richmenu-en-2500x1686.jpg';
  const imgRes = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true });
  if (imgRes.getResponseCode() !== 200) {
    throw new Error(`下載英文選單圖片失敗: HTTP ${imgRes.getResponseCode()}`);
  }
  const imageBlob = imgRes.getBlob().setContentType('image/jpeg');

  const uploadRes = UrlFetchApp.fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'post',
    headers: { 'Authorization': `Bearer ${token}` },
    payload: imageBlob,
    muteHttpExceptions: true
  });

  if (uploadRes.getResponseCode() !== 200) {
    throw new Error(`上傳英文選單圖片失敗: HTTP ${uploadRes.getResponseCode()} - ${uploadRes.getContentText()}`);
  }
  console.log(`✅ 英文選單背景圖片上傳成功！`);

  props.setProperty('ENGLISH_RICH_MENU_ID', richMenuId);
  return richMenuId;
}

/**
 * 依據使用者偏好語言，即時切換專屬圖文選單 (中/英)
 * @param {string} userId LINE 使用者 ID
 * @param {string} lang 語言 ('zh' | 'en')
 * @param {GoogleAppsScript.Properties.Properties} [props]
 */
function switchUserRichMenuByLanguage(userId, lang, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const token = props.getProperty('CHANNEL_ACCESS_TOKEN') || props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token) return;

  let targetId = userId;
  if (!targetId || !targetId.startsWith('U') || targetId.length < 20) {
    targetId = props.getProperty('LAST_ACTIVE_LINE_USER_ID');
  }
  if (!targetId || !targetId.startsWith('U') || targetId.length < 20) return;

  try {
    if (lang === 'en') {
      let enMenuId = props.getProperty('ENGLISH_RICH_MENU_ID');
      if (!enMenuId) {
        const liffId = props.getProperty('LIFF_ID');
        enMenuId = setupEnglishNativeCameraRichMenu(token, liffId, props);
      }
      if (enMenuId) {
        const res = UrlFetchApp.fetch(`https://api.line.me/v2/bot/user/${targetId}/richmenu/${enMenuId}`, {
          method: 'post',
          headers: { 'Authorization': `Bearer ${token}` },
          muteHttpExceptions: true
        });
        console.log(`🔗 [Rich Menu] 已為用戶 ${targetId} 綁定英文圖文選單 (${enMenuId}), HTTP: ${res.getResponseCode()}`);
      }
    } else {
      // 繁體中文：切換回全局預設或中文選單
      const currentMenuId = props.getProperty('CURRENT_RICH_MENU_ID');
      if (currentMenuId) {
        UrlFetchApp.fetch(`https://api.line.me/v2/bot/user/${targetId}/richmenu/${currentMenuId}`, {
          method: 'post',
          headers: { 'Authorization': `Bearer ${token}` },
          muteHttpExceptions: true
        });
        console.log(`🔗 [Rich Menu] 已為用戶 ${targetId} 綁定中文圖文選單 (${currentMenuId})`);
      } else {
        UrlFetchApp.fetch(`https://api.line.me/v2/bot/user/${targetId}/richmenu`, {
          method: 'delete',
          headers: { 'Authorization': `Bearer ${token}` },
          muteHttpExceptions: true
        });
        console.log(`🔗 [Rich Menu] 已為用戶 ${targetId} 解除個人選單綁定 (恢復全局中文預設)`);
      }
    }
  } catch (err) {
    console.warn(`切換用戶圖文選單失敗:`, err);
  }
}

/**
 * 刪除指定的圖文選單
 */
function deleteRichMenu(richMenuId, channelAccessToken) {
  const token = channelAccessToken || PropertiesService.getScriptProperties().getProperty('CHANNEL_ACCESS_TOKEN');
  if (!token || !richMenuId) return;
  UrlFetchApp.fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
    method: 'delete',
    headers: { 'Authorization': `Bearer ${token}` },
    muteHttpExceptions: true
  });
}

/**
 * 列出當前所有存在的圖文選單
 */
function listRichMenus(channelAccessToken) {
  const token = channelAccessToken || PropertiesService.getScriptProperties().getProperty('CHANNEL_ACCESS_TOKEN');
  if (!token) return [];
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu/list', {
    headers: { 'Authorization': `Bearer ${token}` },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() === 200) {
    return JSON.parse(res.getContentText()).richmenus || [];
  }
  return [];
}
