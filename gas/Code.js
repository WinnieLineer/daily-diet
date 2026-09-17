/**
 * ========================================================
 * Daily-Diet LINE Bot & Cloud Backend (Google Apps Script)
 * ========================================================
 * 
 * 🏗️ 模組架構說明 (Modular Architecture Overview)
 * 本專案已從單一龐大檔案重構為 9 個高內聚、低耦合之專屬模組：
 * 
 * 1. 00_Config.js:
 *    - 系統全域常數、預設目標值 (預設熱量/蛋白質/水分)、LIFF 識別碼
 * 
 * 2. 01_I18n.js:
 *    - 雙語辭典 (ZH/EN)、`t(key, lang)` 國際化字典、用戶語言偏好取得與設定
 * 
 * 3. 02_Database.js:
 *    - 今日紀錄、目標設定、常用餐點庫、日誌記錄 (Google Sheets / PropertiesService / GitHub Gist 雲端同步)
 * 
 * 4. 03_AiService.js:
 *    - Gemini AI 模型調用 (多模態圖片分析、文字營養辨識、教練建議生成、Web AI 防盜刷驗證)
 * 
 * 5. 04_LineMessaging.js:
 *    - LINE Messaging API 通訊封裝 (TextMessage, FlexMessage, Loading 動畫, 快捷回覆按鈕 Quick Reply)
 * 
 * 6. 05_RichMenu.js:
 *    - 中英文雙語圖文選單 (Rich Menu) 自動建立、區域座標配置、語系切換綁定
 * 
 * 7. 06_FlexMessages.js:
 *    - Neo-Brutalist 高對比設計風格之 LINE Flex 訊息卡片產生器 (全雙語支持)
 * 
 * 8. 07_Webhook.js:
 *    - doGet(e) 與 doPost(e) Webhook 路由派發、事件處理、目標推算與 Web3Forms 異常通報
 * 
 * 9. 08_Dashboard.js:
 *    - 實時運作日誌視覺化儀表板 HTML 模板 (支援即時瀏覽 AI 分析紀錄與對話)
 * 
 * 註：GAS 環境中所有 .js 檔案均共用全域範疇 (Global Scope)，無須額外 require 或 import。
 * 原始舊代碼已安全封存於 Code.legacy.js 備份檔。
 */

function getSystemInfo() {
  return {
    name: "Daily-Diet LINE Bot & Cloud Backend",
    version: "2.0.0-modular",
    status: "healthy",
    modules: [
      "00_Config.js",
      "01_I18n.js",
      "02_Database.js",
      "03_AiService.js",
      "04_LineMessaging.js",
      "05_RichMenu.js",
      "06_FlexMessages.js",
      "07_Webhook.js",
      "08_Dashboard.js"
    ]
  };
}

// ========================================================
// 🛠️ 屬性管理輔助函式 (當 GAS 介面屬性超過 50 個唯讀時使用)
// ========================================================

/**
 * 🔑 透過程式碼直接設定維護者密碼與帳號
 * 解決 GAS 後台網頁介面因「指令碼具有 50 個以上的屬性」而變成唯讀的問題
 */
function setMaintainerCredentials(customAccount, customPassword) {
  const props = PropertiesService.getScriptProperties();
  
  // 👉 安全憑證設定：優先使用傳入之參數或保留既有設定，避免明文密碼留存在版本控制中
  const newAccount = customAccount || props.getProperty('MAINTAINER_USER') || 'Winnie';
  const newPassword = customPassword || props.getProperty('MAINTAINER_PASS') || props.getProperty('MAINTAINER_PASSWORD');
  
  if (!newPassword) {
    console.warn('⚠️ 請傳入自訂密碼執行：setMaintainerCredentials("帳號", "密碼")');
    return;
  }
  
  props.setProperty('MAINTAINER_PASS', newPassword);
  props.setProperty('MAINTAINER_PASSWORD', newPassword);
  props.setProperty('MAINTAINER_USER', newAccount);
  
  console.log('🎉 維護者憑證已成功寫入指令碼屬性！');
  console.log('👤 維護者帳號：', props.getProperty('MAINTAINER_USER'));
  console.log('🔒 維護者密碼：', (props.getProperty('MAINTAINER_PASS') || props.getProperty('MAINTAINER_PASSWORD')) ? '****** (已成功設定)' : '設定失敗');
}

/**
 * 📋 檢視目前所有指令碼屬性清單 (可於 GAS「執行紀錄」中查看完整清單)
 */
function listAllScriptProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const keys = Object.keys(props);
  console.log(`📊 系統目前總共有 ${keys.length} 個屬性：`);
  keys.forEach(k => {
    const isSensitive = k.includes('PASS') || k.includes('PAT') || k.includes('TOKEN') || k.includes('SECRET') || k.includes('KEY');
    const val = isSensitive ? '******' : props[k];
    console.log(`- [${k}]: ${val}`);
  });
}

/**
 * 🧹 一鍵清除被誤設為「餐點名」的用戶暱稱快取，並重新向 LINE Profile API 同步正確暱稱
 */
function fixPoisonedUserNames() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  const allProps = props.getProperties();
  let fixedCount = 0;
  
  for (const k in allProps) {
    if (k.startsWith('USER_NAME_')) {
      const currentVal = allProps[k];
      const isFoodLike = /[\+＋]|蛋|水|飯|麵|湯|排|奶|茶|肉|咖啡|便當|吐司/.test(currentVal);
      const uid = k.replace('USER_NAME_', '');
      
      if (uid.startsWith('U')) {
        if (token) {
          try {
            const res = UrlFetchApp.fetch(`https://api.line.me/v2/bot/profile/${uid}`, {
              headers: { Authorization: `Bearer ${token}` },
              muteHttpExceptions: true
            });
            if (res.getResponseCode() === 200) {
              const profile = JSON.parse(res.getContentText());
              if (profile.displayName) {
                props.setProperty(k, profile.displayName);
                console.log(`✅ 已修復用戶 [${uid}]: 原為「${currentVal}」➔ 已更正為 LINE 暱稱「${profile.displayName}」`);
                fixedCount++;
                continue;
              }
            }
          } catch (e) {
            console.warn(`修復 ${uid} 失敗:`, e);
          }
        }
      } else if (isFoodLike) {
        props.deleteProperty(k);
        console.log(`🗑️ 已清除異常快取 [${k}]: 「${currentVal}」`);
        fixedCount++;
      }
    }
  }
  console.log(`🎉 暱稱修復程序完成！共更正/清除了 ${fixedCount} 筆異常名稱。`);
}

/**
 * 📢 一鍵推播「最新版本與服務修復公告卡片」給所有 LINE 好友 (Broadcast)
 * 💡 若要先推給自己測試，可傳入自己的 LINE User ID：sendAnnouncementBroadcast('Uxxxxxxxxxxxx')
 */
function sendAnnouncementBroadcast(testUserId) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN');
  const liffId = props.getProperty('LINE_LIFF_ID') || props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';
  
  if (!token) {
    console.error('❌ 找不到 LINE_CHANNEL_ACCESS_TOKEN，無法發送推播！');
    return;
  }
  
  const targetUser = testUserId || props.getProperty('ADMIN_LINE_USER_ID') || '';
  const flexMsg = generateFeatureAnnouncementFlex(targetUser || 'default_user', liffId, '', props, 'zh');
  
  if (testUserId && String(testUserId).startsWith('U')) {
    console.log(`🚀 正在向測試用戶 [${testUserId}] 發送測試公告...`);
    pushFlexMessage(testUserId, flexMsg, token, props);
    console.log(`✅ 測試公告已成功送達 ${testUserId}！`);
  } else {
    console.log('📣 正在向全體 LINE 好友發送官方廣播 (Broadcast)...');
    const res = broadcastFlexMessage(flexMsg, token);
    console.log('📊 廣播執行結果：', JSON.stringify(res));
    if (res.success) {
      console.log('🎉 恭喜！官方更新公告已成功推播給所有好友！');
    } else {
      console.error('⚠️ 廣播失敗或受配額限制：', res.response || res.error);
    }
  }
}

/**
 * 📊 查詢本月 LINE 官方帳號剩餘可推播訊息額度
 */
function checkLineMessageQuota() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN');
  if (!token) {
    console.error('❌ 找不到 LINE_CHANNEL_ACCESS_TOKEN');
    return;
  }
  try {
    const quotaRes = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/quota", {
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true
    });
    const consumptionRes = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/quota/consumption", {
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true
    });
    console.log('📊 本月總額度：', quotaRes.getContentText());
    console.log('📈 本月已發送數：', consumptionRes.getContentText());
  } catch (e) {
    console.error('查詢額度失敗：', e.message);
  }
}

