/**
 * ========================================================
 * 07_Webhook.js - LINE Bot Webhook / Web API 路由與主調度核心
 * 包含：doGet(e), doPost(e), handleGoalSettingWithAI, Web3Forms 異常通報
 * ========================================================
 */

// ========================================================
// 🌐 1. doGet(e) - Web App 雙向同步、管理日誌與部署端點
// ========================================================

/**
 * 🛡️ 驗證維護者與管理端點權限
 * 支援由 URL 參數或 Body (token, adminKey, pass, password) 驗證
 * 同時相容原始主密碼以及暫態 HMAC-SHA256 Session Token
 * 遵循安全原則：若環境中尚未設定 MAINTAINER_PASS，一律拒絕存取 (Fail-Closed)
 */
function verifyAdminAccess(e, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const configuredPass = props.getProperty('MAINTAINER_PASS') || props.getProperty('MAINTAINER_PASSWORD');
  if (!configuredPass) return false;
  const incomingToken = e?.parameter?.token || e?.parameter?.adminKey || e?.parameter?.pass || e?.parameter?.password;
  if (!incomingToken) return false;

  // 1. 直接主密碼校驗 (支援既有自動化腳本或直接傳遞)
  if (incomingToken === configuredPass) return true;

  // 2. 暫態 Session Token 校驗 (支援當日與跨午夜容錯)
  const configuredUser = (props.getProperty('MAINTAINER_USER') || 'Winnie').trim();
  const todayToken = generateSessionToken(configuredUser, configuredPass, 0);
  if (todayToken && incomingToken === todayToken) return true;
  const yesterdayToken = generateSessionToken(configuredUser, configuredPass, -1);
  if (yesterdayToken && incomingToken === yesterdayToken) return true;

  return false;
}

/**
 * 📨 發送 OTP 動態驗證碼至管理員 LINE 官方帳號與 Email 信箱
 */
function sendOtpToAdmin(otpCode, configuredUser, props) {
  if (!props) props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN');
  const adminLineId = props.getProperty('ADMIN_LINE_USER_ID');
  const adminEmail = (typeof DEFAULT_ADMIN_EMAIL !== 'undefined' && DEFAULT_ADMIN_EMAIL) || props.getProperty('ADMIN_EMAIL') || 'hi@winnie-lin.space';

  let lineSent = false;
  let emailSent = false;

  // 1. LINE 推播
  if (adminLineId && token) {
    try {
      if (typeof generateAdminOtpFlex === 'function') {
        const otpFlex = generateAdminOtpFlex(otpCode, 5);
        pushFlexMessage(adminLineId, otpFlex, token, props);
      } else {
        pushTextMessage(adminLineId, `🔐 [Daily-Diet 後台登入驗證碼]\n您的 6 位數驗證碼為：${otpCode}\n有效時間：5 分鐘。\n若非本人操作請儘速檢查密碼！`, token, props);
      }
      lineSent = true;
      console.log(`✅ [Admin OTP] LINE 動態驗證碼已成功推播至管理員 (${adminLineId.slice(-6)})`);
    } catch (lineErr) {
      console.warn('⚠️ [Admin OTP] 推播 LINE 失敗:', lineErr);
    }
  }

  // 2. Email 寄送 (雙軌並進)
  if (adminEmail) {
    try {
      const subject = `🔐 [Daily-Diet] 後台登入動態驗證碼：${otpCode}`;
      const textBody = `【Daily-Diet 後台登入動態驗證碼】\n\n您的 6 位數一次性驗證碼為：${otpCode}\n\n有效時間：5 分鐘\n\n若非您本人操作，代表您的管理員密碼可能已洩露，請立即檢查！\n\n時間：${new Date().toLocaleString('zh-TW', { hour12: false })}`;
      
      const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 2px solid #000000; border-radius: 16px; background-color: #ffffff; box-shadow: 4px 4px 0px #000000;">
  <div style="display: inline-block; padding: 4px 10px; background-color: #2563EB; color: #ffffff; font-size: 11px; font-weight: 800; border-radius: 6px; letter-spacing: 1px;">
    2FA SECURITY NOTICE
  </div>
  <h2 style="font-size: 20px; font-weight: 900; color: #18181b; margin-top: 14px; margin-bottom: 8px;">
    🔐 後台管理員登入動態驗證碼
  </h2>
  <p style="font-size: 13px; color: #52525b; line-height: 1.6; margin-bottom: 20px;">
    您好，系統偵測到正在登入 Daily-Diet 維護者後台（#/admin）。請於登入驗證頁面輸入以下 6 位數一次性驗證碼：
  </p>
  <div style="text-align: center; margin: 20px 0; padding: 18px; background-color: #EFF6FF; border: 2px solid #2563EB; border-radius: 12px;">
    <span style="font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #1D4ED8; font-family: monospace;">
      ${otpCode}
    </span>
    <div style="font-size: 12px; color: #2563EB; font-weight: bold; margin-top: 6px;">
      ⏱️ 有效期限：5 分鐘內有效
    </div>
  </div>
  <div style="padding: 10px 14px; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; font-size: 12px; color: #991B1B; line-height: 1.5;">
    ⚠️ <strong>安全提示</strong>：此驗證碼僅供管理員 Winnie 登入使用。若非您本人發起，請儘速確認密碼安全。
  </div>
  <p style="font-size: 11px; color: #A1A1AA; margin-top: 20px; text-align: center;">
    此為 Daily-Diet 系統自動發送之安全通知，請勿直接回覆。
  </p>
</div>`;

      try {
        MailApp.sendEmail({
          to: adminEmail,
          subject: subject,
          body: textBody,
          htmlBody: htmlBody
        });
        emailSent = true;
      } catch (mailErr) {
        GmailApp.sendEmail(adminEmail, subject, textBody, { htmlBody: htmlBody });
        emailSent = true;
      }
      console.log(`✅ [Admin OTP] 動態驗證碼郵件已成功寄送至 ${adminEmail}`);
    } catch (emailErr) {
      console.warn('⚠️ [Admin OTP] 寄送郵件失敗:', emailErr);
    }
  }

  return { lineSent, emailSent };
}

/**
 * 🛡️ 統整維護者身分驗證與 OTP 雙重認證處理函式
 */
function handleMaintainerAuthActions(action, paramData, props) {
  const cache = CacheService.getScriptCache();
  const failKey = 'MAINTAINER_AUTH_FAIL_COUNT';
  const otpFailKey = 'MAINTAINER_OTP_FAIL_COUNT';
  const configuredPass = props.getProperty('MAINTAINER_PASS') || props.getProperty('MAINTAINER_PASSWORD');
  const configuredUser = (props.getProperty('MAINTAINER_USER') || 'Winnie').trim();

  if (!configuredPass) {
    console.warn('⚠️ MAINTAINER_PASS 尚未於指令碼屬性中設定，身分驗證被拒絕。');
    return {
      status: 'error',
      authenticated: false,
      message: '系統安全提醒：維護者密碼尚未於指令碼屬性中設定，請聯繫管理員配置。'
    };
  }

  // ── 階段 1：帳號密碼驗證 (verifyMaintainerAuth / verifyAuth) ──
  if (action === 'verifyMaintainerAuth' || action === 'verifyAuth') {
    const failCount = Number(cache.get(failKey) || 0);
    if (failCount >= 5) {
      console.warn(`🚨 [防暴力破解] 維護者登入嘗試失敗超過 5 次，系統已鎖定 15 分鐘！`);
      return {
        status: 'error',
        code: 'RATE_LIMIT',
        authenticated: false,
        message: '安全防護：登入失敗次數過多，為維護安全系統已鎖定 15 分鐘，請稍候再試。'
      };
    }

    const incomingPass = String(paramData?.pass || paramData?.password || paramData?.token || '').trim();
    const incomingUser = String(paramData?.user || paramData?.userName || '').trim();
    const isUserMatch = incomingUser && incomingUser.toLowerCase() === configuredUser.toLowerCase();

    // 檢查是否為既有的有效 Session Token (跨午夜容錯)
    const todayToken = generateSessionToken(configuredUser, configuredPass, 0);
    const yesterdayToken = generateSessionToken(configuredUser, configuredPass, -1);
    const isSessionTokenMatch = incomingPass && (incomingPass === todayToken || incomingPass === yesterdayToken);

    if (isUserMatch && isSessionTokenMatch) {
      // 既有合法權杖，直接通過身分校驗 (供頁面自動刷新復原狀態)
      cache.remove(failKey);
      return {
        status: 'ok',
        authenticated: true,
        token: incomingPass,
        userName: configuredUser
      };
    }

    const isPasswordMatch = incomingPass && incomingPass === configuredPass;
    if (isUserMatch && isPasswordMatch) {
      cache.remove(failKey);

      // 產生 6 位數密碼級隨機 OTP
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      cache.put('MAINTAINER_LOGIN_OTP', otpCode, 300); // 5 分鐘有效
      cache.put('MAINTAINER_OTP_USER', configuredUser, 300);
      cache.remove(otpFailKey);

      // 發送 OTP 至 LINE 與 Email
      const dispatchResult = sendOtpToAdmin(otpCode, configuredUser, props);

      return {
        status: 'ok',
        otpRequired: true,
        expiresIn: 300,
        maskedEmail: 'hi***@winnie-lin.space',
        lineSent: dispatchResult.lineSent,
        emailSent: dispatchResult.emailSent,
        message: '動態驗證碼已發送至您的 LINE 官方帳號與管理員信箱 (hi@winnie-lin.space)'
      };
    } else {
      cache.put(failKey, String(failCount + 1), 900);
      return {
        status: 'error',
        authenticated: false,
        message: '身分驗證失敗：維護者帳號或密碼不正確'
      };
    }
  }

  // ── 階段 2：輸入 OTP 驗證完成登入 (verifyMaintainerOtp) ──
  if (action === 'verifyMaintainerOtp') {
    const otpFailCount = Number(cache.get(otpFailKey) || 0);
    if (otpFailCount >= 5) {
      return {
        status: 'error',
        code: 'RATE_LIMIT',
        authenticated: false,
        message: '安全防護：OTP 驗證失敗次數過多，為維護安全系統已鎖定 15 分鐘，請稍候再試。'
      };
    }

    const incomingOtp = String(paramData?.otp || '').trim().replace(/\s+/g, '');
    const incomingUser = String(paramData?.user || paramData?.userName || '').trim();
    const cachedOtp = cache.get('MAINTAINER_LOGIN_OTP');
    const cachedUser = cache.get('MAINTAINER_OTP_USER') || configuredUser;

    if (!cachedOtp) {
      return {
        status: 'error',
        code: 'EXPIRED',
        authenticated: false,
        message: '驗證碼已逾時或不存在，請點擊「重新發送驗證碼」。'
      };
    }

    if (incomingUser && incomingUser.toLowerCase() !== cachedUser.toLowerCase()) {
      return {
        status: 'error',
        authenticated: false,
        message: '使用者名稱不相符，存取被拒絕。'
      };
    }

    if (incomingOtp === cachedOtp) {
      // 驗證成功！清除 OTP 避免重複使用
      cache.remove('MAINTAINER_LOGIN_OTP');
      cache.remove('MAINTAINER_OTP_USER');
      cache.remove(otpFailKey);
      cache.remove(failKey);

      const sessionToken = generateSessionToken(configuredUser, configuredPass, 0) || configuredPass;
      recordSystemLog('維護者OTP登入', 'Maintainer', 'OTP雙重驗證', '驗證成功', '管理員已通過 LINE/Email OTP 雙重驗證成功登入後台', configuredUser);

      return {
        status: 'ok',
        authenticated: true,
        token: sessionToken,
        userName: configuredUser,
        message: '雙重身分驗證成功！'
      };
    } else {
      const newFailCount = otpFailCount + 1;
      cache.put(otpFailKey, String(newFailCount), 900);
      const remaining = Math.max(0, 5 - newFailCount);
      return {
        status: 'error',
        code: 'INVALID_OTP',
        authenticated: false,
        remainingAttempts: remaining,
        message: remaining > 0 
          ? `驗證碼不正確，請重新確認 (剩餘 ${remaining} 次嘗試機會)`
          : '驗證碼錯誤次數過多，系統已鎖定 15 分鐘。'
      };
    }
  }

  // ── 重新發送 OTP (resendMaintainerOtp) ──
  if (action === 'resendMaintainerOtp') {
    const cooldownKey = 'MAINTAINER_OTP_RESEND_COOLDOWN';
    if (cache.get(cooldownKey)) {
      return {
        status: 'error',
        code: 'COOLDOWN',
        message: '發送請求過於頻繁，請等待 60 秒冷卻時間後再試。'
      };
    }

    const incomingPass = String(paramData?.pass || paramData?.password || '').trim();
    const incomingUser = String(paramData?.user || paramData?.userName || '').trim();
    const isUserMatch = incomingUser && incomingUser.toLowerCase() === configuredUser.toLowerCase();
    const isPassMatch = incomingPass && incomingPass === configuredPass;

    if (!isUserMatch || !isPassMatch) {
      return {
        status: 'error',
        authenticated: false,
        message: '重發驗證碼失敗：身分憑證不相符。'
      };
    }

    cache.put(cooldownKey, '1', 60); // 60 秒冷卻
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    cache.put('MAINTAINER_LOGIN_OTP', otpCode, 300);
    cache.put('MAINTAINER_OTP_USER', configuredUser, 300);
    cache.remove(otpFailKey);

    const dispatchResult = sendOtpToAdmin(otpCode, configuredUser, props);

    return {
      status: 'ok',
      otpRequired: true,
      expiresIn: 300,
      lineSent: dispatchResult.lineSent,
      emailSent: dispatchResult.emailSent,
      message: '全新動態驗證碼已重新發送至您的 LINE 官方帳號與管理員信箱！'
    };
  }

  return null;
}

function doGet(e) {
  try {
    const action = e?.parameter?.action;
    let userId = e?.parameter?.userId;
    const incomingGist = e?.parameter?.gistId;
    // 🛡️ 僅接收 caller 與 userName，絕不使用 name (因為 name 常用於表示菜名/餐點名，避免用戶名字被污染為餐點名稱)
    const incomingCaller = e?.parameter?.caller || e?.parameter?.userName || '';

    const props = PropertiesService.getScriptProperties();
    // 🛡️ 自動清理殘留之泛用訪客共用屬性（杜絕跨用戶資料串聯）
    if (typeof purgeSharedGenericData === 'function') {
      purgeSharedGenericData(props);
    }
    const allProps = props.getProperties();
    const CHANNEL_ACCESS_TOKEN = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN') || '';
    const pat = props.getProperty('GITHUB_PAT');
    const isAdmin = verifyAdminAccess(e, props);


    // 🛡️ 0.1 維護者登入與 OTP 雙重認證端點 (GET 支援)
    if (action === 'verifyMaintainerAuth' || action === 'verifyAuth' || action === 'verifyMaintainerOtp' || action === 'resendMaintainerOtp') {
      const paramData = {
        pass: e?.parameter?.pass || e?.parameter?.password || e?.parameter?.token,
        user: e?.parameter?.user || e?.parameter?.userName,
        otp: e?.parameter?.otp
      };
      const authRes = handleMaintainerAuthActions(action, paramData, props);
      return ContentService.createTextOutput(JSON.stringify(authRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 📬 0.2 Web 用戶反饋 / 問題回報端點 (GET 支援，具備 Cache 5 分鐘冷卻鎖與長度截斷防護)
    if (action === 'sendFeedback' || action === 'reportBug') {
      const message = e?.parameter?.message || '';
      const subject = e?.parameter?.subject || '用戶意見反饋';
      const contact = e?.parameter?.contact || '';
      const clientDevice = e?.parameter?.device || '';
      const caller = e?.parameter?.userName || e?.parameter?.caller || 'Web 訪客';
      const uid = e?.parameter?.userId || 'web_user';

      if (!message.trim()) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: '訊息內容不可為空' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // 🛡️ 5 分鐘冷卻與每小時全局頻率限制 (防範 MailApp / Web3Forms 每日配額耗盡)
      try {
        const cache = CacheService.getScriptCache();
        const globalKey = 'FEEDBACK_COOLDOWN_GLOBAL_1H';
        const globalCount = Number(cache.get(globalKey) || 0);
        if (globalCount >= 20) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            code: 'RATE_LIMIT',
            message: '系統目前接收意見回饋量較大，為防範服務超載請稍候 1 小時後再試。'
          })).setMimeType(ContentService.MimeType.JSON);
        }
        cache.put(globalKey, String(globalCount + 1), 3600);

        const senderKey = 'FEEDBACK_COOLDOWN_' + (uid ? uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(-32) : 'guest');
        if (cache.get(senderKey)) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            code: 'RATE_LIMIT',
            message: '您剛剛已送出過反饋，請稍候 5 分鐘後再試 (Please wait 5 minutes before submitting again)'
          })).setMimeType(ContentService.MimeType.JSON);
        }
        cache.put(senderKey, '1', 300);
      } catch (cacheErr) {}

      // 🛡️ 限制長度防範超大 payload
      const cleanMessage = String(message).trim().slice(0, 1000);
      const cleanContact = String(contact).trim().slice(0, 100);
      const cleanDevice = String(clientDevice).trim().slice(0, 150);
      const cleanCaller = String(caller).trim().slice(0, 50);

      const issueDetails = [
        cleanMessage,
        '',
        `📱 裝置與環境：${cleanDevice || '未知'}`,
        `📫 聯絡方式：${cleanContact || '未提供'}`
      ].join('\n');

      const mailResult = sendBugReportNotification({
        userId: uid,
        userName: cleanCaller,
        issueDetails: issueDetails,
        userLang: 'zh',
        persona: 'tsundere',
        userGistId: '',
        props: props
      });

      if (typeof recordSystemLog === 'function') {
        recordSystemLog('用戶意見反饋', uid, String(subject).slice(0, 50), `聯絡方式: ${cleanContact}`, `狀態: ${mailResult.success ? '已成功送出信件' : '信件發送失敗'}`, cleanCaller);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: mailResult.success ? 'ok' : 'partial_success',
        success: true,
        message: '反饋已送達開發團隊！'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 🛡️ 0.3 Gist 所有權安全校驗：防範跨用戶資料串聯與越權存取 (IDOR)
    if (incomingGist && !verifyGistOwnership(incomingGist, userId, props)) {
      console.warn(`🚨 [Gist 越權存取拒絕 (GET)] 用戶 ${userId || '匿名/Web'} 企圖存取非授權 Gist: ${incomingGist}`);
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        code: 'FORBIDDEN', 
        message: '存取被拒絕：無權存取該 Gist 資料來源 (Access Denied)' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 🔗 帳號與身分識別校驗 (防止未授權訪客冒用 LINE 原生用戶或維護者身分)
    if (!userId || !userId.startsWith('U') || userId === 'default_user' || userId === 'undefined') {
      const queryName = (incomingCaller || userId || '').trim();
      // 僅在通過管理員密碼/權杖驗證的前提下，才允許維護者別名自動綁定至 ADMIN_LINE_USER_ID
      if (isAdmin && queryName) {
        const maintainerUser = (props.getProperty('MAINTAINER_USER') || 'Winnie').trim();
        const adminLineId = props.getProperty('ADMIN_LINE_USER_ID');
        if (adminLineId && queryName.toLowerCase() === maintainerUser.toLowerCase()) {
          console.log(`🔗 [維護者自動綁定] 維護者 ${queryName} 權限校驗通過，對應至 LINE 用戶 ${adminLineId}`);
          userId = adminLineId;
        }
      }
    }
    // Web 用戶 caller 的名稱拿不到就用其輸入名稱或預設 web_user
    if ((!userId || userId === 'default_user' || userId === 'undefined') && incomingCaller) {
      userId = incomingCaller;
    }
    if (!userId) userId = 'web_user';

    // 🛡️ LINE 原生用戶 (U 開頭) 的名稱由 LINE Profile API / props 取得，優先於 Web 前端傳入的暫存 caller
    const isGistStr = (s) => s && (/^[0-9a-fA-F]{20,40}$/.test(String(s).trim()) || /^gist[-_]/i.test(String(s).trim()));
    const cleanCaller = isGistStr(incomingCaller) ? '' : incomingCaller;
    const cleanUserIdName = (!userId.startsWith('U') && userId !== 'default_user' && userId !== 'web_user' && !isGistStr(userId)) ? userId : '';
    const resolvedLineName = (userId && userId.startsWith('U')) ? (props.getProperty(`USER_NAME_${userId}`) || getUserDisplayName(userId, CHANNEL_ACCESS_TOKEN, props) || '') : '';
    const webCallerName = resolvedLineName || cleanCaller || cleanUserIdName || '';
    if (webCallerName && !isGistStr(webCallerName) && userId && !userId.startsWith('U') && userId !== 'default_user' && userId !== 'web_user' && !isGistStr(userId)) {
      props.setProperty(`USER_NAME_${userId}`, webCallerName);
    }

    // 🚀 0.2 觸發一鍵部署原生相機圖文選單 (需管理員權限)
    if (action === 'deployRichMenu' || action === 'setupRichMenu') {
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', code: 'UNAUTHORIZED', message: 'Forbidden: Unauthorized' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN');
      const liffId = props.getProperty('LINE_LIFF_ID') || props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';
      try {
        const richMenuId = setupNativeCameraRichMenu(token, liffId, props);
        let enRichMenuId = '';
        try {
          enRichMenuId = setupEnglishNativeCameraRichMenu(token, liffId, props);
        } catch (enErr) {
          console.warn('部署英文選單警告:', enErr);
        }
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'ok', 
          richMenuId, 
          enRichMenuId, 
          message: '中英文原生相機圖文選單已成功部署！' 
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'deployEnglishRichMenu') {
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', code: 'UNAUTHORIZED', message: 'Forbidden: Unauthorized' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN');
      const liffId = props.getProperty('LINE_LIFF_ID') || props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';
      try {
        const enRichMenuId = setupEnglishNativeCameraRichMenu(token, liffId, props);
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'ok', 
          enRichMenuId, 
          message: '英文原生相機圖文選單已成功部署！' 
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 1. 查詢/綁定個人 Gist ID
    if (action === 'getGistId' && userId) {
      if (incomingGist && !isGenericUserId(userId)) {
        const existingGist = props.getProperty(`USER_GIST_${userId}`);
        if (!existingGist || isAdmin) {
          props.setProperty(`USER_GIST_${userId}`, incomingGist);
        }
      }
      const gistId = getOrCreateUserGist(userId, pat, props);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', userId, gistId }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. 查詢個人今日飲食紀錄、目標與 Gist (支援 Web App 開啟時即時雙向同步)
    if (action === 'getLogs' && userId) {
      if (incomingGist && !isGenericUserId(userId)) {
        const existingGist = props.getProperty(`USER_GIST_${userId}`);
        // 🛡️ 防竄改防護：若該 LINE 用戶已綁定 Gist，不允許透過無認證的公開 GET 覆寫其 Gist ID
        if (!existingGist || isAdmin) {
          props.setProperty(`USER_GIST_${userId}`, incomingGist);
          console.log(`☁️ [Web 端連動] 已自動將用戶 ${userId} 綁定 Gist ID: ${incomingGist}`);
        }
      }
      const incomingCal = Number(e?.parameter?.cal);
      const incomingPro = Number(e?.parameter?.pro);
      const incomingWat = Number(e?.parameter?.wat);
      if (!isGenericUserId(userId)) {
        if (incomingCal) props.setProperty(`CALORIE_GOAL_${userId}`, String(incomingCal));
        if (incomingPro) props.setProperty(`PROTEIN_GOAL_${userId}`, String(incomingPro));
        if (incomingWat) props.setProperty(`WATER_GOAL_${userId}`, String(incomingWat));
      }

      const todayStr = getTodayDateString();
      const todayLogs = getTodayLogs(userId, todayStr, props, incomingGist);
      const gistId = getOrCreateUserGist(userId, pat, props);
      const goals = getUserGoals(userId, props, incomingGist);
      const persona = getUserPersona(userId, props, incomingGist, pat);
      const userLanguage = getUserLanguage(userId, props, incomingGist, pat);

      const weightLogs = (typeof getUserWeightHistory === 'function') ? getUserWeightHistory(userId, 30, props, incomingGist) : [];
      const poopLogs = (typeof getUserPoopHistory === 'function') ? getUserPoopHistory(userId, 30, props, incomingGist) : [];

      let lineDisplayName = '';
      if (userId && userId.startsWith('U')) {
        lineDisplayName = props.getProperty(`USER_NAME_${userId}`) || getUserDisplayName(userId, CHANNEL_ACCESS_TOKEN, props) || '';
      }
      if (!lineDisplayName && incomingGist) {
        for (const k in allProps) {
          if (k.startsWith('USER_GIST_') && allProps[k] === incomingGist) {
            const matchedLineId = k.replace('USER_GIST_', '');
            if (matchedLineId.startsWith('U')) {
              lineDisplayName = props.getProperty(`USER_NAME_${matchedLineId}`) || getUserDisplayName(matchedLineId, CHANNEL_ACCESS_TOKEN, props) || '';
              if (lineDisplayName) break;
            }
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok',
        userId,
        userName: lineDisplayName || webCallerName || '',
        lineUserName: lineDisplayName || '',
        gistId,
        todayLogs,
        weightLogs,
        poopLogs,
        goals,
        persona,
        language: userLanguage,
        favorites: getUserFavorites(userId, props, incomingGist)
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Web App 觸發記錄/新增餐點 (即時雙向同步至 LINE 今日快取與 Gist 雲端)
    if ((action === 'saveMeal' || action === 'addMeal') && userId) {
      const dishName = e?.parameter?.dishName || e?.parameter?.name || '美味餐點';
      const calories = Number(e?.parameter?.calories || e?.parameter?.cal || 0);
      const protein = Number(e?.parameter?.protein || e?.parameter?.pro || 0);
      const water = Number(e?.parameter?.water || e?.parameter?.wat || 0);
      const carbs = Number(e?.parameter?.carbs || 0);
      const fat = Number(e?.parameter?.fat || 0);
      const category = e?.parameter?.category || '';
      const comment = e?.parameter?.comment || '';
      const date = e?.parameter?.date || getTodayDateString();
      const time = e?.parameter?.time || new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' });
      const id = Number(e?.parameter?.id || Date.now());

      const meal = { id, date, time, dish_name: dishName, calories, protein, carbs, fat, water, category, comment, source: 'WEB_APP' };
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      saveMealLog(userId, meal, userGistId, pat, props);
      recordSystemLog('Web同步餐點', userId, dishName, `${calories}卡 / ${protein}g蛋 / ${water}ml水`, `已同步儲存：【${dishName}】${calories} kcal · ${protein}g 蛋 · ${water}ml 水`, webCallerName || userId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', meal }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Web App 觸發刪除指定餐點
    if (action === 'deleteMeal' && userId) {
      const dishName = e?.parameter?.dishName;
      const targetId = e?.parameter?.id;
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      const deletedMeal = deleteMealLog(userId, targetId || dishName, userGistId, pat, props);
      const displayTitle = (dishName && isNaN(Number(dishName))) ? dishName : ((deletedMeal && deletedMeal.dish_name) ? deletedMeal.dish_name : (dishName || targetId));
      recordSystemLog('Web刪除餐點', userId, displayTitle, '', `已自雲端資料庫刪除紀錄：${displayTitle}`, webCallerName || userId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', deletedMeal }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Web App 觸發清空今日紀錄
    if (action === 'clearToday' && userId) {
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      clearTodayLogs(userId, userGistId, pat, props);
      recordSystemLog('Web清空今日', userId, '清空今日餐點', '', '已清空今日所有餐點與補水紀錄', webCallerName || userId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 6. Web App 觸發新增常用餐點
    if (action === 'addFavorite' && userId) {
      const dishName = e?.parameter?.dishName || e?.parameter?.name || '常用餐點';
      const calories = Number(e?.parameter?.calories) || Number(e?.parameter?.cal) || 0;
      const protein = Number(e?.parameter?.protein) || Number(e?.parameter?.pro) || 0;
      const water = Number(e?.parameter?.water) || Number(e?.parameter?.wat) || 0;
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      const favItem = { id: Date.now(), dish_name: dishName, calories, protein, water };
      saveUserFavorite(userId, favItem, userGistId, pat, props);
      recordSystemLog('Web加常用', userId, dishName, `${calories}卡 / ${protein}g蛋`, `已新增至常用清單：【${dishName}】${calories} kcal · ${protein}g 蛋`, webCallerName || userId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 7. Web App 觸發刪除常用餐點
    if (action === 'deleteFavorite' && userId) {
      const favId = e?.parameter?.id || e?.parameter?.favId || e?.parameter?.dishName || e?.parameter?.name;
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      deleteUserFavorite(userId, favId, userGistId, pat, props);
      recordSystemLog('Web刪除常用', userId, favId, '', `已自常用庫移除標識：${favId}`, webCallerName || userId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 7.5 Web App 觸發常用餐點排序更新
    if (action === 'reorderFavorites' && userId) {
      const favId = e?.parameter?.id || e?.parameter?.favId || e?.parameter?.dishName || e?.parameter?.name;
      const dir = e?.parameter?.dir || e?.parameter?.direction || 'up';
      const orderStr = e?.parameter?.order;
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      let updated = [];
      if (orderStr) {
        updated = saveAllUserFavoritesOrder(userId, orderStr.split(','), userGistId, pat, props);
      } else if (favId) {
        updated = reorderUserFavorites(userId, favId, dir, userGistId, pat, props);
      }
      recordSystemLog('Web換常用順序', userId, favId ? `${favId} (${dir})` : '批量排序', '', '已更新常用餐點順序', webCallerName || userId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', favorites: updated }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 8. Web App 觸發更新個人飲食目標與進食窗口
    if (action === 'updateGoals' && userId) {
      const calories = Number(e?.parameter?.calories);
      const protein = Number(e?.parameter?.protein);
      const water = Number(e?.parameter?.water);
      const carbs = Number(e?.parameter?.carbs);
      const fat = Number(e?.parameter?.fat);
      const showCarbsFatRaw = e?.parameter?.show_carbs_fat;
      const showCarbsFat = showCarbsFatRaw === 'true';

      const fastingEnabledRaw = e?.parameter?.fasting_enabled;
      const fastingStart = e?.parameter?.fasting_start;
      const fastingEnd = e?.parameter?.fasting_end;

      let fastingLogStr = '';
      let isFastingEnabled = false;
      if (!isGenericUserId(userId)) {
        if (calories) props.setProperty(`CALORIE_GOAL_${userId}`, String(calories));
        if (protein) props.setProperty(`PROTEIN_GOAL_${userId}`, String(protein));
        if (water) props.setProperty(`WATER_GOAL_${userId}`, String(water));
        if (carbs) props.setProperty(`CARBS_GOAL_${userId}`, String(carbs));
        if (fat) props.setProperty(`FAT_GOAL_${userId}`, String(fat));
        if (showCarbsFatRaw !== undefined) props.setProperty(`SHOW_CARBS_FAT_${userId}`, String(showCarbsFat));

        if (fastingEnabledRaw !== undefined) {
          isFastingEnabled = fastingEnabledRaw === 'true';
          props.setProperty(`FASTING_ENABLED_${userId}`, String(isFastingEnabled));
          if (fastingStart) props.setProperty(`FASTING_START_${userId}`, String(fastingStart));
          if (fastingEnd) props.setProperty(`FASTING_END_${userId}`, String(fastingEnd));
        }
      }
      if (fastingEnabledRaw !== undefined) {
        isFastingEnabled = fastingEnabledRaw === 'true';
        fastingLogStr = ` / 窗口:${fastingStart || '12:00'}~${fastingEnd || '20:00'} (${isFastingEnabled ? '開啟' : '關閉'})`;
      }

      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      if (pat && userGistId) {
        syncGoalsToUserGist({
          calories,
          protein,
          water,
          carbs,
          fat,
          show_carbs_fat: showCarbsFat,
          fasting_enabled: fastingEnabledRaw !== undefined ? isFastingEnabled : undefined,
          fasting_start: fastingStart,
          fasting_end: fastingEnd
        }, pat, userGistId);
      }
      const carbsStatus = showCarbsFatRaw !== undefined ? ` / 碳水:${carbs}g 脂肪:${fat}g (顯示:${showCarbsFat})` : '';
      recordSystemLog('Web更新目標', userId, `${calories}卡 / ${protein}g蛋 / ${water}ml水${carbsStatus}${fastingLogStr}`, '', `已更新體態與進食窗口目標：每日熱量 ${calories} kcal · 蛋白質 ${protein}g · 水分 ${water}ml${fastingLogStr}`, webCallerName || userId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 9. Web App 觸發更新教練性格
    if (action === 'updatePersona' && userId) {
      const persona = e?.parameter?.persona || 'tsundere';
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      setUserPersona(userId, persona, userGistId, pat, props);
      recordSystemLog('Web更新性格', userId, persona, '', `已更新教練性格為「${persona}」`, webCallerName || userId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', persona }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 10. Web App 觸發更新語言偏好 (支援中英雙語，若為 LINE 原生用戶即時切換其圖文選單)
    if (action === 'updateLanguage') {
      const lang = e?.parameter?.lang || 'zh';
      const rawUserId = userId || e?.parameter?.userId || '';
      const userGistId = incomingGist || (rawUserId ? getOrCreateUserGist(rawUserId, pat, props) : '');
      const updated = setUserLanguage(rawUserId || 'web_user', lang, userGistId, pat, props);
      if (rawUserId && rawUserId.startsWith('U')) {
        switchUserRichMenuByLanguage(rawUserId, updated, props);
      }

      recordSystemLog('Web更新語言', rawUserId || 'web_user', updated, '', `已更新用戶語言為「${updated}」`, webCallerName || userId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', language: updated, lineUserId: (rawUserId && rawUserId.startsWith('U')) ? rawUserId : '' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 10.5 Web App 觸發記錄體重
    if (action === 'saveWeight' && userId) {
      const weight = Number(e?.parameter?.weight || e?.parameter?.val || 0);
      const date = e?.parameter?.date || getTodayDateString();
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      let res = {};
      if (typeof saveWeightLog === 'function') {
        res = saveWeightLog(userId, weight, date, userGistId, pat, props);
      }
      recordSystemLog('Web同步體重', userId, `${weight} kg`, `日期: ${date}`, `已同步體重：${weight} kg`, webCallerName || userId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', ...res }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 10.6 Web App 觸發記錄排便打卡
    if (action === 'savePoop' && userId) {
      const timestamp = Number(e?.parameter?.timestamp) || Date.now();
      const userGistId = incomingGist || getOrCreateUserGist(userId, pat, props);
      let res = {};
      if (typeof savePoopLog === 'function') {
        res = savePoopLog(userId, timestamp, userGistId, pat, props);
      }
      recordSystemLog('Web同步排便', userId, '便便打卡', '', `已同步排便打卡`, webCallerName || userId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', ...res }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 10.8 觸發 LINE 全員功能升級廣播 (限維護者授權)
    if (action === 'broadcastAnnouncement' || action === 'broadcastUpdate') {
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', code: 'UNAUTHORIZED', message: 'Forbidden: Unauthorized maintainer access' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN');
      const liffId = props.getProperty('LINE_LIFF_ID') || props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';
      const testUser = e?.parameter?.testUser || e?.parameter?.userId;
      const flexMsg = generateFeatureAnnouncementFlex(testUser || 'default_user', liffId, '', props, 'zh');
      
      let res;
      if (testUser && testUser.startsWith('U')) {
        pushFlexMessage(testUser, flexMsg, token, props);
        res = { status: 'ok', type: 'test_push', target: testUser, message: `已成功推播測試功能公告至用戶 ${testUser}` };
      } else {
        const bRes = broadcastFlexMessage(flexMsg, token);
        res = { status: bRes.success ? 'ok' : 'error', type: 'broadcast', details: bRes };
      }
      recordSystemLog('管理員推播公告', 'admin', action, JSON.stringify(res), '執行功能更新推播', '管理員');
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 10.9 查詢 LINE 官方帳號本月發送額度與已使用則數 (限維護者授權)
    if (action === 'getLineQuota' || action === 'checkQuota') {
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', code: 'UNAUTHORIZED', message: 'Forbidden: Unauthorized maintainer access' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN');
      let total = '未知';
      let used = 0;
      let rawQuota = {};
      let rawConsumption = {};
      try {
        const quotaRes = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/quota", {
          headers: { Authorization: `Bearer ${token}` },
          muteHttpExceptions: true
        });
        rawQuota = JSON.parse(quotaRes.getContentText() || '{}');
        if (rawQuota.value !== undefined) total = rawQuota.value;
        else if (rawQuota.type === 'none') total = '無上限';
      } catch (e) {}
      try {
        const consumptionRes = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/quota/consumption", {
          headers: { Authorization: `Bearer ${token}` },
          muteHttpExceptions: true
        });
        rawConsumption = JSON.parse(consumptionRes.getContentText() || '{}');
        if (rawConsumption.totalUsage !== undefined) used = rawConsumption.totalUsage;
      } catch (e) {}

      const remaining = typeof total === 'number' ? (total - used) : total;
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok',
        totalQuota: total,
        usedMessages: used,
        remainingMessages: remaining,
        rawQuota: rawQuota,
        rawConsumption: rawConsumption
      }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    }

    // 11. 實時運作日誌 API (限維護者授權存取)
    if (action === 'getRecentLogs') {
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'error', 
          code: 'UNAUTHORIZED',
          message: 'Forbidden: 維護者身分驗證失敗，請先登入後台' 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      const limit = Number(e?.parameter?.limit) || 1000;
      const days = typeof e?.parameter?.days !== 'undefined' ? Number(e?.parameter?.days) : 30;
      // 確保自動永久清除系統 Gist
      purgeSystemLogsGist(props);
      const logs = getRecentLogsData(limit, days);
      const sheetId = props.getProperty('LOG_SHEET_ID');
      const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : '';
      const aiQuota = getAiQuotaStats(props);
      let lastMaintainerLogin = null;
      try {
        const rawLogin = props.getProperty('LAST_MAINTAINER_LOGIN');
        if (rawLogin) lastMaintainerLogin = JSON.parse(rawLogin);
      } catch (e) {}
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'ok', 
        logs, 
        sheetUrl, 
        aiQuota, 
        lastMaintainerLogin,
        retentionPolicy: 'Google Apps Script 伺服端 Multi-Slot 快取 (100% 內部私有，無任何公開外洩)',
        daysRequested: days,
        totalLogsReturned: logs.length 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 11.1 綁定/設定系統日誌 Google 試算表 ID (限維護者授權存取)
    if (action === 'bindLogSheet' || action === 'setLogSheet') {
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', code: 'UNAUTHORIZED', message: 'Forbidden: Unauthorized' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const input = (e?.parameter?.url || e?.parameter?.sheetId || e?.parameter?.id || '').trim();
      let cleanId = input;
      const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) cleanId = match[1];

      if (cleanId) {
        props.setProperty('LOG_SHEET_ID', cleanId);
        try {
          const ss = SpreadsheetApp.openById(cleanId);
          const sheet = ss.getSheets()[0];
          if (sheet.getLastRow() === 0) {
            sheet.appendRow(["時間", "用戶名稱", "用戶識別碼", "操作類型", "用戶傳送內容", "AI辨識結果", "回傳內容 / 處理狀態", "IP", "地理位置"]);
            const headerRange = sheet.getRange(1, 1, 1, 9);
            headerRange.setBackground("#000000").setFontColor("#FDE047").setFontWeight("bold").setFontSize(11);
            sheet.setFrozenRows(1);
          }
          return ContentService.createTextOutput(JSON.stringify({ 
            status: 'ok', 
            message: '✅ 成功綁定 Google 試算表！日誌將即時同步追加。',
            sheetId: cleanId,
            sheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`
          })).setMimeType(ContentService.MimeType.JSON);
        } catch (err) {
          return ContentService.createTextOutput(JSON.stringify({ 
            status: 'warning', 
            message: `已儲存試算表 ID，但嘗試存取時發生提示: ${err.message}`,
            sheetId: cleanId,
            sheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: '請提供 url 或 sheetId 參數' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 11.2 刪除指定異常用戶名之日誌列 (限維護者授權存取)
    if (action === 'deleteInvalidLogs' || action === 'purgeInvalidLogs') {
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'error', 
          code: 'UNAUTHORIZED', 
          message: 'Forbidden: Unauthorized' 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      const result = deleteInvalidUserNameLogs(props);
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'ok', 
        deletedCount: result.deletedCount, 
        samples: result.samples,
        message: `已成功自 Google Sheets 實體刪除 ${result.deletedCount} 筆異常用戶名日誌！` 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 12. 實時運作日誌儀表板 (已全面遷移至 Web 前端專屬維護者密碼保護端點，自動轉導)
    if (action === 'logs' || action === 'viewLogs' || action === 'log') {
      return HtmlService.createHtmlOutput(generateDashboardHtml())
        .setTitle("🛡️ 轉導至維護者監控中心")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // 13. 測試郵件發送診斷端點 (限維護者授權存取)
    if (action === 'testMail' || action === 'testEmail') {
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', code: 'UNAUTHORIZED', message: 'Forbidden: Unauthorized' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const targetEmail = e?.parameter?.email || (typeof DEFAULT_ADMIN_EMAIL !== 'undefined' && DEFAULT_ADMIN_EMAIL) || 'hi@winnie-lin.space';
      const timeNow = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
      const testSub = `🐼 Daily-Diet 郵件發送診斷測試 (${timeNow})`;
      const testBody = `這是一封來自 Daily-Diet LINE Bot 的測試郵件！\n\n⏰ 測試時間：${timeNow} (UTC+8)\n📬 收件信箱：${targetEmail}\n\n若您收到此信，代表 Google Apps Script 郵件發送服務（MailApp）運作 100% 正常！`;

      let isSent = false;
      let errDetail = '';
      try {
        MailApp.sendEmail({ to: targetEmail, subject: testSub, body: testBody });
        isSent = true;
      } catch (mErr) {
        errDetail = mErr.message || String(mErr);
        try {
          GmailApp.sendEmail(targetEmail, testSub, testBody);
          isSent = true;
          errDetail = '';
        } catch (gErr) {
          errDetail = `MailApp: ${errDetail} | GmailApp: ${gErr.message || String(gErr)}`;
        }
      }

      if (isSent) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'ok',
          message: `✅ 測試信件已成功寄送至 ${targetEmail}！請檢查您的收件匣或垃圾郵件。`
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          error: errDetail,
          hint: '若出現權限錯誤，代表 Apps Script 需要進行一次性授權：請在 Google Apps Script 編輯器中選擇 testMailAuthorization 函式並點擊「執行 (Run)」完成 Google 帳號授權。'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 14. 維護者登入安全遙測與裝置資訊登記 (限維護者授權存取)
    if (action === 'recordMaintainerLogin') {
      if (!isAdmin) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', code: 'UNAUTHORIZED', message: 'Forbidden: Unauthorized' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const ip = e?.parameter?.ip || '未知 IP';
      const location = e?.parameter?.location || '未知位置';
      const device = e?.parameter?.device || '未知裝置';
      const browser = e?.parameter?.browser || '';
      const os = e?.parameter?.os || '';
      const token = e?.parameter?.token || '';
      const userName = e?.parameter?.userName || e?.parameter?.user || '系統維護者';
      const timeStr = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");

      const auditRecord = {
        time: timeStr,
        userName: userName,
        ip: ip,
        location: location,
        device: device,
        browser: browser,
        os: os,
        tokenPrefix: token ? token.substring(0, 12) + '...' : 'none'
      };

      props.setProperty('LAST_MAINTAINER_LOGIN', JSON.stringify(auditRecord));
      recordSystemLog(
        '維護者登入', 
        'Maintainer', 
        `IP: ${ip} · 位置: ${location}`, 
        `OS: ${os} · 瀏覽器: ${browser} · 螢幕: ${device}`, 
        `✅ 永久通行證已核發 (${timeStr})`, 
        userName,
        { ip: ip, location: location, device: `${os} · ${browser}` }
      );

      try {
        sendMaintainerLoginNotification({
          userName: userName,
          ip: ip,
          location: location,
          device: device,
          browser: browser,
          os: os,
          source: 'Web 維護者後台 (#/admin)'
        });
      } catch (mailErr) {
        console.warn('發送登入安全通知失敗:', mailErr);
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'ok', 
        message: '維護者登入日誌已記錄', 
        audit: auditRecord 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput("Daily Diet LINE Bot is running! 🐼");
  } catch (err) {
    console.error("doGet 處理時發生錯誤:", err);
    sendErrorAlertToWeb3Forms({
      error: err,
      userId: e?.parameter?.userId || 'web_user',
      operation: `Web API GET (action: ${e?.parameter?.action || 'none'})`,
      userInput: JSON.stringify(e?.parameter || {}),
      source: 'Web App ➔ GAS doGet'
    });
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message || err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================================
// 📩 2. doPost(e) - LINE Webhook 事件處理核心
// ========================================================

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const props = PropertiesService.getScriptProperties();

  let currentReplyToken = null;
  let currentToken = null;
  let currentUserId = 'system';
  let currentOperation = '接收請求';
  let currentUserInput = '';

  try {
    let data = {};
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      data = {};
    }

    const action = e.parameter?.action || data?.action;
    const GEMINI_API_KEY = props.getProperty('GEMINI_API_KEY');
    const CHANNEL_ACCESS_TOKEN = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || props.getProperty('CHANNEL_ACCESS_TOKEN') || '';
    const GITHUB_PAT = props.getProperty('GITHUB_PAT');
    const LIFF_ID = props.getProperty('LINE_LIFF_ID') || props.getProperty('LIFF_ID') || '2011098313-nFOisgmf';
    currentToken = CHANNEL_ACCESS_TOKEN;

    // 🛡️ 0.1 維護者登入與 OTP 雙重認證端點 (POST 支援)
    if (action === 'verifyMaintainerAuth' || action === 'verifyAuth' || action === 'verifyMaintainerOtp' || action === 'resendMaintainerOtp') {
      const paramData = {
        pass: data?.pass || data?.password || data?.token || e?.parameter?.pass || e?.parameter?.password || e?.parameter?.token,
        user: data?.user || data?.userName || e?.parameter?.user || e?.parameter?.userName,
        otp: data?.otp || e?.parameter?.otp
      };
      const authRes = handleMaintainerAuthActions(action, paramData, props);
      return ContentService.createTextOutput(JSON.stringify(authRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 📬 0.2 Web 用戶反饋 / 問題回報端點 (POST 支援，具備 Cache 5 分鐘冷卻鎖與長度截斷防護)
    if (action === 'sendFeedback' || action === 'reportBug') {
      const message = data?.message || e?.parameter?.message || '';
      const subject = data?.subject || e?.parameter?.subject || '用戶意見反饋';
      const contact = data?.contact || e?.parameter?.contact || '';
      const clientDevice = data?.device || e?.parameter?.device || '';
      const caller = data?.userName || e?.parameter?.userName || data?.caller || 'Web 訪客';
      const uid = data?.userId || e?.parameter?.userId || 'web_user';

      if (!message.trim()) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: '訊息內容不可為空' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // 🛡️ 5 分鐘冷卻與每小時全局頻率限制 (防範 MailApp 每日配額耗盡)
      try {
        const cache = CacheService.getScriptCache();
        const globalKey = 'FEEDBACK_COOLDOWN_GLOBAL_1H';
        const globalCount = Number(cache.get(globalKey) || 0);
        if (globalCount >= 20) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            code: 'RATE_LIMIT',
            message: '系統目前接收意見回饋量較大，為防範服務超載請稍候 1 小時後再試。'
          })).setMimeType(ContentService.MimeType.JSON);
        }
        cache.put(globalKey, String(globalCount + 1), 3600);

        const senderKey = 'FEEDBACK_COOLDOWN_' + (uid ? uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(-32) : 'guest');
        if (cache.get(senderKey)) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            code: 'RATE_LIMIT',
            message: '您剛剛已送出過反饋，請稍候 5 分鐘後再試 (Please wait 5 minutes before submitting again)'
          })).setMimeType(ContentService.MimeType.JSON);
        }
        cache.put(senderKey, '1', 300);
      } catch (cacheErr) {}

      // 🛡️ 限制長度防範超大 payload
      const cleanMessage = String(message).trim().slice(0, 1000);
      const cleanContact = String(contact).trim().slice(0, 100);
      const cleanDevice = String(clientDevice).trim().slice(0, 150);
      const cleanCaller = String(caller).trim().slice(0, 50);

      const issueDetails = [
        cleanMessage,
        '',
        `📱 裝置與環境：${cleanDevice || '未知'}`,
        `📫 聯絡方式：${cleanContact || '未提供'}`
      ].join('\n');

      const mailResult = sendBugReportNotification({
        userId: uid,
        userName: cleanCaller,
        issueDetails: issueDetails,
        userLang: 'zh',
        persona: 'tsundere',
        userGistId: '',
        props: props
      });

      if (typeof recordSystemLog === 'function') {
        recordSystemLog('用戶意見反饋', uid, String(subject).slice(0, 50), `聯絡方式: ${cleanContact}`, `狀態: ${mailResult.success ? '已成功送出信件' : '信件發送失敗'}`, cleanCaller);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: mailResult.success ? 'ok' : 'partial_success',
        success: true,
        message: '反饋已送達開發團隊！'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 🛡️ 0.3 維護者登入安全遙測與裝置資訊登記 (POST 支援)
    if (action === 'recordMaintainerLogin') {
      const incomingToken = data?.token || e?.parameter?.token || '';
      const configuredPass = props.getProperty('MAINTAINER_PASS') || props.getProperty('MAINTAINER_PASSWORD');
      const configuredUser = (props.getProperty('MAINTAINER_USER') || 'Winnie').trim();
      const todayToken = generateSessionToken(configuredUser, configuredPass, 0);
      const yesterdayToken = generateSessionToken(configuredUser, configuredPass, -1);
      const isAuthValid = configuredPass && (
        incomingToken === configuredPass ||
        (todayToken && incomingToken === todayToken) ||
        (yesterdayToken && incomingToken === yesterdayToken)
      );

      if (!isAuthValid) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', code: 'UNAUTHORIZED', message: 'Forbidden: Unauthorized' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const ip = data?.ip || e?.parameter?.ip || '未知 IP';
      const location = data?.location || e?.parameter?.location || '未知位置';
      const device = data?.device || e?.parameter?.device || '未知裝置';
      const browser = data?.browser || e?.parameter?.browser || '';
      const os = data?.os || e?.parameter?.os || '';
      const userName = data?.userName || data?.user || e?.parameter?.userName || e?.parameter?.user || '系統維護者';
      const timeStr = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");

      const auditRecord = {
        time: timeStr,
        userName: userName,
        ip: ip,
        location: location,
        device: device,
        browser: browser,
        os: os,
        tokenPrefix: incomingToken ? incomingToken.substring(0, 12) + '...' : 'none'
      };

      props.setProperty('LAST_MAINTAINER_LOGIN', JSON.stringify(auditRecord));
      recordSystemLog(
        '維護者登入', 
        'Maintainer', 
        `IP: ${ip} · 位置: ${location}`, 
        `OS: ${os} · 瀏覽器: ${browser} · 螢幕: ${device}`, 
        `✅ 永久通行證已核發 (${timeStr})`, 
        userName,
        { ip: ip, location: location, device: `${os} · ${browser}` }
      );

      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 🌟 1. Web App 專屬安全通道：Gemini AI 辨識 API (含防盜刷、時戳驗證與頻率防護)
    if (action === 'analyzeMeal' || action === 'analyzeFoodImage' || action === 'analyzeText' || action === 'analyzeFoodText' || action === 'completeText' || action === 'getPandaAdvice') {
      const sec = verifyWebAIRequest(data, e);
      if (!sec.valid) {
        console.warn(`🚨 [Web AI 安全攔截] ${sec.reason}`);
        recordSystemLog('安全攔截', 'web_client', 'Web AI 盜刷防護', sec.reason, '已拒絕處理');
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: `Forbidden: ${sec.reason}` }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // 🛡️ 僅接收 caller 與 userName，絕不使用 name 避免餐點名稱污染用戶暱稱
      const incomingCallerName = data?.caller || data?.userName || e?.parameter?.caller || e?.parameter?.userName || '';
      let webUserId = data?.userId || e?.parameter?.userId || '';
      const incomingGist = data?.gistId || e?.parameter?.gistId || '';

      // 🛡️ 驗證傳入之 Gist 是否合法
      if (incomingGist && !verifyGistOwnership(incomingGist, webUserId, props)) {
        console.warn(`🚨 [Gist 越權存取拒絕 (Web AI)] 用戶 ${webUserId || '匿名/Web'} 企圖關聯非授權 Gist: ${incomingGist}`);
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'error', 
          message: 'Forbidden: 無權存取該 Gist 資料來源' 
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if ((!webUserId || webUserId === 'web_user' || webUserId === 'default_user') && incomingCallerName) {
        webUserId = incomingCallerName;
      }
      if (!webUserId) webUserId = 'web_user';
      const resolvedLineName = (webUserId && webUserId.startsWith('U')) ? (props.getProperty(`USER_NAME_${webUserId}`) || getUserDisplayName(webUserId, CHANNEL_ACCESS_TOKEN, props) || '') : '';
      const webCaller = resolvedLineName || incomingCallerName || (!webUserId.startsWith('U') && webUserId !== 'web_user' ? webUserId : 'Web 用戶');
      if (webCaller && webUserId && !webUserId.startsWith('U') && webUserId !== 'web_user') {
        props.setProperty(`USER_NAME_${webUserId}`, webCaller);
      }
      const aiCallerInfo = { userId: webUserId, userName: webCaller, caller: webCaller };

      if (action === 'analyzeMeal' || action === 'analyzeFoodImage') {
        const base64 = data?.image || data?.base64Image || e.parameter?.image;
        aiCallerInfo.operation = 'Web照片辨識';
        const result = analyzeMealWithGeminiFull(base64, GEMINI_API_KEY, data?.context, data?.language, aiCallerInfo);
        if (result && typeof recordSystemLog === 'function') {
          const mUsed = result.model_used || 'Gemini';
          const fallbackNote = (result.failed_attempts && result.failed_attempts.length > 0)
            ? ` (前序 ${result.failed_attempts.length} 次重試)`
            : '';
          recordSystemLog(
            'Web照片辨識', 
            webUserId, 
            '上傳餐點照片辨識', 
            `[${mUsed}${fallbackNote}] ${result.dish_name || '餐點'} (${result.calories || 0}卡 / ${result.protein || 0}g蛋)`, 
            `[模型: ${mUsed}] 回傳分析結果：【${result.dish_name || '美味餐點'}】${result.calories || 0} kcal · ${result.protein || 0}g 蛋 · ${result.carbs || 0}g 碳 · ${result.fat || 0}g 脂${result.panda_comment ? ' · 教練：「' + result.panda_comment + '」' : ''}`,
            webCaller
          );
        }
        return ContentService.createTextOutput(JSON.stringify({ status: 'ok', data: result }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'analyzeText' || action === 'analyzeFoodText') {
        const text = data?.text || data?.textInstruction || e.parameter?.text;
        aiCallerInfo.operation = 'Web文字辨識';
        const result = parseTextWithGeminiFull(text, GEMINI_API_KEY, data?.context, data?.language, aiCallerInfo);
        if (result && typeof recordSystemLog === 'function') {
          const mUsed = result.model_used || 'Gemini';
          const fallbackNote = (result.failed_attempts && result.failed_attempts.length > 0)
            ? ` (前序 ${result.failed_attempts.length} 次重試)`
            : '';
          recordSystemLog(
            'Web文字辨識', 
            webUserId, 
            text || '輸入餐點文字辨識', 
            `[${mUsed}${fallbackNote}] ${result.dish_name || '餐點'} (${result.calories || 0}卡 / ${result.protein || 0}g蛋)`, 
            `[模型: ${mUsed}] 回傳分析結果：【${result.dish_name || '美味餐點'}】${result.calories || 0} kcal · ${result.protein || 0}g 蛋 · ${result.carbs || 0}g 碳 · ${result.fat || 0}g 脂${result.panda_comment ? ' · 教練：「' + result.panda_comment + '」' : ''}`,
            webCaller
          );
        }
        return ContentService.createTextOutput(JSON.stringify({ status: 'ok', data: result }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'completeText' || action === 'getPandaAdvice') {
        const prompt = data?.prompt || e.parameter?.prompt;
        const result = generateGeminiText(prompt, GEMINI_API_KEY);
        if (typeof recordSystemLog === 'function') {
          recordSystemLog(
            'Web教練諮詢', 
            webUserId, 
            typeof prompt === 'string' ? prompt : '教練諮詢', 
            '', 
            `回傳教練建議：${typeof result === 'string' ? result : ''}`,
            webCaller
          );
        }
        return ContentService.createTextOutput(JSON.stringify({ status: 'ok', text: result }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 🛡️ LINE Webhook 事件安全驗證
    const CHANNEL_SECRET = props.getProperty('LINE_CHANNEL_SECRET');
    const REQUIRE_WEBHOOK_SECRET = props.getProperty('REQUIRE_WEBHOOK_SECRET') === 'true';
    if (CHANNEL_SECRET) {
      const incomingSecret = e.parameter?.secret || e.parameter?.token;
      if ((REQUIRE_WEBHOOK_SECRET && !incomingSecret) || (incomingSecret && incomingSecret !== CHANNEL_SECRET)) {
        console.warn("🚨 [安全攔截] 收到未經授權的 Webhook 請求！URL Secret 不符或缺失。");
        recordSystemLog('安全攔截', 'unknown', '偽造Webhook請求', 'HTTP 403', '已拒絕處理');
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Forbidden: Invalid secret' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    const events = data.events || [];

    if (events.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 🛡️ LINE 存取權杖與環境常數已於頂層初始化完成

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const replyToken = event.replyToken;
      currentReplyToken = replyToken;
      const userId = event.source?.userId || 'default_user';
      currentUserId = userId;
      currentOperation = `LINE 事件 (${event.type})`;
      currentUserInput = '';

      // 🛑【LINE 去重防重試機制】以 webhookEventId / message.id / postback.data 結合建立 Idempotency Key
      const eventUniqueId = event.webhookEventId || event.message?.id || (event.postback ? `${userId}_${event.postback.data}_${event.timestamp}` : null);
      if (eventUniqueId) {
        const cache = CacheService.getScriptCache();
        const cacheKey = `LINE_EVENT_SEEN_${eventUniqueId}`.slice(0, 100);
        if (cache.get(cacheKey)) {
          console.warn(`⚠️ [LINE 重試防護] 偵測到重複發送之事件 ${eventUniqueId}，已自動阻擋避免重複記帳！`);
          continue;
        }
        // 暫存 60 秒（覆蓋 LINE 的自動重試窗口）
        cache.put(cacheKey, 'processed', 60);
      }

      console.log(`\n========================================`);
      console.log(`📩 [LINE 事件收到] 用戶 ID: ${userId} | 類型: ${event.type}`);

      // 🌟 強制依語系綁定正確圖文選單 (突破 LINE App 本地快取)
      if (userId && userId.startsWith('U') && userId.length >= 20) {
        const userLang = getUserLanguage(userId, props);
        const targetMenuId = (userLang === 'en')
          ? props.getProperty('ENGLISH_RICH_MENU_ID')
          : props.getProperty('CURRENT_RICH_MENU_ID');
        if (targetMenuId) {
          try {
            UrlFetchApp.fetch('https://api.line.me/v2/bot/user/' + userId + '/richmenu/' + targetMenuId, {
              method: 'post',
              headers: { 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN },
              muteHttpExceptions: true
            });
          } catch (rmErr) {}
        }
      }

      if (!CHANNEL_ACCESS_TOKEN) throw new Error("LINE_CHANNEL_ACCESS_TOKEN 尚未設定！");
      if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY 尚未設定！");

      // 🔍 自動取得或為該用戶建立專屬 Gist ID
      let userGistId = '';
      if (GITHUB_PAT) {
        try {
          userGistId = getOrCreateUserGist(userId, GITHUB_PAT, props);
          console.log(`☁️ [Gist 綁定] 用戶 Gist ID: ${userGistId || '未建立'}`);
        } catch (gistErr) {
          console.error("取得使用者 Gist 失敗:", gistErr);
        }
      } else {
        console.warn("⚠️ [提示] GITHUB_PAT 尚未在指令碼屬性中設定，Gist 雲端同步暫時關閉。");
      }

      const userLang = getUserLanguage(userId, props, userGistId, GITHUB_PAT);
      const isEn = userLang === 'en';

      // 👑 自動識別並快取系統管理員 LINE ID (唯一限定末尾 497c66 之 Winnie Lin)
      const adminSuffix = (typeof MASTER_ADMIN_LINE_SUFFIX !== 'undefined' && MASTER_ADMIN_LINE_SUFFIX) || '497c66';
      if (userId && userId.endsWith(adminSuffix)) {
        if (props.getProperty('ADMIN_LINE_USER_ID') !== userId) {
          props.setProperty('ADMIN_LINE_USER_ID', userId);
          console.log(`👑 [管理員識別] 已自動鎖定唯一 ADMIN_LINE_USER_ID = ${userId}`);
        }
      }

      // 🌟 Case 0: 首次加入好友 (Follow 事件)
      if (event.type === 'follow') {
        currentOperation = '首次加入好友 (Follow)';
        currentUserInput = '加入好友';
        recordSystemLog('新用戶加入', userId, '加入好友', '', '回傳精美圖文歡迎卡片、新手30秒引導與免責聲明');
        const welcomeFlex = generateWelcomeFlex(userId, LIFF_ID, userGistId, userLang);
        replyFlexMessage(replyToken, welcomeFlex, CHANNEL_ACCESS_TOKEN, userId, props);
        continue;
      }

      // 🔘 Case 1: 用戶點擊按鈕 (Postback 事件)
      if (event.type === 'postback') {
        let payload = {};
        try {
          payload = JSON.parse(event.postback.data);
        } catch (e) {
          payload = {};
        }

        currentOperation = `點擊按鈕: ${payload.action || '未知動作'}`;
        currentUserInput = event.postback?.data || '';

        console.log(`🔘 [按鈕點擊] 動作: ${payload.action} | 內容:`, JSON.stringify(payload));

        // 🐣 / 🌐 新舊用戶分流引導
        if (payload.action === 'onboarding') {
          if (payload.type === 'new') {
            recordSystemLog('新手引導', userId, '點擊全新用戶', '', '回傳新手30秒操作引導卡片');
            const newGuideFlex = generateCommandMenuFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, newGuideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          } else if (payload.type === 'web_user') {
            recordSystemLog('老用戶連動', userId, '點擊Web舊用戶', '', '回傳Web舊用戶資料連動引導卡片');
            const webGuideFlex = generateWebUserGuideFlex(userId, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, webGuideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }
        }

        // 🎯 體態目標推薦導引
        if (payload.action === 'goalGuide') {
          recordSystemLog('目標推薦導引', userId, '點擊目標推薦', '', '回傳 AI 體態目標推薦導引卡片');
          const guideFlex = generateGoalGuideFlex(userId, LIFF_ID, userGistId, userLang);
          replyFlexMessage(replyToken, guideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 📖 查看完整操作指令手冊
        if (payload.action === 'showHelp' || payload.action === 'help') {
          recordSystemLog('指令手冊', userId, '點擊查看指令手冊', '', '回傳完整操作指令手冊卡片');
          const helpFlex = generateCommandMenuFlex(userId, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, helpFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🚀 查看最新功能與版本更新通知
        if (payload.action === 'showWhatsNew' || payload.action === 'whatsnew' || payload.action === 'featureAnnouncement') {
          recordSystemLog('查看新功能通知', userId, '點擊新功能通知', '', '回傳最新版本功能升級卡片');
          const announceFlex = generateFeatureAnnouncementFlex(userId, LIFF_ID, userGistId, props, userLang);
          replyFlexMessage(replyToken, announceFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🌐 語言設定 Postback
        if (payload.action === 'setLanguage') {
          const chosen = setUserLanguage(userId, payload.lang, userGistId, GITHUB_PAT, props);
          switchUserRichMenuByLanguage(userId, chosen, props);
          const langReply = (chosen === 'en')
            ? "🌐 Language switched to English! 🐼✨\nFrom now on, Panda Coach will analyze your meals, estimate nutrients, and respond in English!\nYour Rich Menu has also been updated to English.\n\n(Type \"中文\" anytime to switch back)"
            : "🌐 語言已成功切換為繁體中文！ 🐼✨\n熊貓教練會以繁體中文為您分析餐點與計算營養囉！\n圖文選單也已為您切換為繁體中文。\n\n（輸入「English」可隨時切換為英文）";
          recordSystemLog('切換語言', userId, `點擊切換為 ${chosen}`, chosen, `回傳提示：${langReply.slice(0, 120)}`);
          replyTextMessage(replyToken, langReply, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        if (payload.action === 'chooseLanguage') {
          const curLang = getUserLanguage(userId, props, userGistId, GITHUB_PAT);
          recordSystemLog('切換語言', userId, '點擊切換語言', curLang, '回傳語言選擇卡片 (繁體中文/English)');
          const langFlex = generateLanguageSelectionFlex(userId, LIFF_ID, userGistId, curLang);
          replyFlexMessage(replyToken, langFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🐛 問題回報引導 Postback
        if (payload.action === 'bugReport') {
          const promptMsg = isEn
            ? "🐛 【Bug Report】\nPlease reply directly with your issue description starting with 'Bug: '!\nExample:\n`Bug: The protein calculation seems off` 🐼"
            : "🐛 【問題與建議回報】\n請直接在下方對話框輸入「回報」加上您的問題內容喔！\n例如：\n`回報 照片辨識蛋白質有誤` 🐼";
          recordSystemLog('問題回報指引', userId, '點擊問題回報按鈕', '', `回傳指引提示：${promptMsg.slice(0, 100)}`);
          replyTextMessage(replyToken, promptMsg, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🎭 挑選教練性格
        if (payload.action === 'choosePersona') {
          recordSystemLog('切換性格', userId, '點擊切換教練性格', '', '回傳教練性格選擇卡片 (傲嬌/溫柔/魔鬼)');
          const personaFlex = generatePersonaSelectionFlex(userId, LIFF_ID, userGistId, props, userLang);
          replyFlexMessage(replyToken, personaFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🎭 設定教練性格
        if (payload.action === 'setPersona') {
          const newPersona = payload.persona || 'tsundere';
          setUserPersona(userId, newPersona, userGistId, GITHUB_PAT, props);
          const personaNamesZh = { tsundere: '傲嬌毒舌教練 🐼😡', gentle: '治癒天使 🐼🥰', hardcore: '魔鬼士官長 🐼🔥' };
          const personaNamesEn = { tsundere: 'Tsundere Coach 🐼😡', gentle: 'Healing Angel 🐼🥰', hardcore: 'Drill Sergeant 🐼🔥' };
          const pName = isEn ? (personaNamesEn[newPersona] || newPersona) : (personaNamesZh[newPersona] || newPersona);
          
          const replyMsg = isEn
            ? `🎭 Successfully switched Panda Coach persona to 【${pName}】!\nSend a meal photo or food name to see your coach's unique critique 🐼✨`
            : `🎭 已成功將熊貓教練性格切換為【${pName}】！\n現在傳送餐點照片或輸入食物，教練就會以全新性格為您專業分析與吐槽囉 🐼✨`;
          recordSystemLog('切換性格', userId, newPersona, '', `回傳確認：${replyMsg.slice(0, 120)}`);
          replyTextMessage(replyToken, replyMsg, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // ⚖️ 點擊記錄體重指引 (桌面版或手動觸發備援)
        if (payload.action === 'promptWeight') {
          const promptMsg = isEn
            ? "⚖️ 【Record Weight】\nPlease reply with your weight, e.g.:\n`Weight 65.2` or `64.5kg` 🐼"
            : "⚖️ 【記錄體重】\n請在對話框輸入您的體重喔！\n例如：\n`體重 65.2` 或 `64.5kg` 🐼";
          recordSystemLog('記錄體重指引', userId, '點擊記體重按鈕', '', '回傳記體重對話框引導提示');
          replyTextMessage(replyToken, promptMsg, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 📸 拍照指引 Postback (點擊功能手冊或指令中的「拍照指引」按鈕)
        if (payload.action === 'guideCamera' || payload.action === 'cameraGuide') {
          const cameraGuideText = isEn
            ? "📸 Please tap the 【📷 Open Camera】button below to take a photo, or choose from your album! AI Panda will analyze calories and nutrients immediately! 🐼✨"
            : "📸 請點擊下方快捷按鈕【📷 開啟相機】直接拍照，或從【🖼️ 挑選照片】選取餐點傳送！AI 熊貓立刻為您分析熱量與營養素！🐼✨";
          recordSystemLog('拍照引導', userId, '點擊拍照指引按鈕', '', `回傳指引與相機按鈕：${cameraGuideText.slice(0, 80)}`);
          const cameraQuickReply = {
            items: [
              {
                type: "action",
                action: {
                  type: "camera",
                  label: isEn ? "📷 Open Camera" : "📷 開啟相機"
                }
              },
              {
                type: "action",
                action: {
                  type: "cameraRoll",
                  label: isEn ? "🖼️ Camera Roll" : "🖼️ 挑選照片"
                }
              }
            ]
          };
          replyTextMessage(replyToken, cameraGuideText, CHANNEL_ACCESS_TOKEN, userId, props, cameraQuickReply);
          continue;
        }

        // ⭐ 常用餐點與補水輪播庫 Postback (點擊功能手冊中的「常用餐點」按鈕)
        if (payload.action === 'viewFavorites' || payload.action === 'favorites') {
          recordSystemLog('常用輪播', userId, '點擊常用餐點按鈕', '', '回傳常用餐點與補水快捷輪播卡片');
          const favCarousel = generateFavoritesCarouselFlex(userId, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, favCarousel, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 💩 點擊排便打卡
        if (payload.action === 'logPoop') {
          console.log(`💩 [按鈕排便打卡] 用戶: ${userId}`);
          let poopRes = {};
          if (typeof savePoopLog === 'function') {
            poopRes = savePoopLog(userId, Date.now(), userGistId, GITHUB_PAT, props);
          }
          recordSystemLog('按鈕排便打卡', userId, '便便打卡', poopRes.elapsedHours ? `間隔 ${poopRes.elapsedHours} 小時` : '初次打卡', '回傳排便打卡確認卡片');
          const poopFlex = generatePoopConfirmFlex(userId, poopRes, LIFF_ID, userGistId, props, userLang);
          replyFlexMessage(replyToken, poopFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 📈 體態與排便圖表 / 趨勢
        if (payload.action === 'weightTrend' || payload.action === 'poopTrend' || payload.action === 'bodyTrend') {
          console.log(`📈 [查看體重/排便趨勢] 用戶: ${userId}`);
          recordSystemLog('查看體重排便趨勢', userId, '圖表查看', '', '回傳體重與排便趨勢圖表卡片');
          const chartFlex = generateWeightPoopChartFlex(userId, LIFF_ID, userGistId, props, userLang);
          replyFlexMessage(replyToken, chartFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🔢 餐點倍數調整 (0.5x, 1x, 1.5x, 2x, 自訂等)
        if (payload.action === 'setMultiplier') {
          const m = Number(payload.m) || 1;
          const todayStr = getTodayDateString();
          const logs = getTodayLogs(userId, todayStr, props, userGistId);
          let targetMeal = null;
          if (logs.length > 0) {
            let targetIndex = logs.length - 1;
            if (payload.id) {
              const idx = logs.findIndex(l => String(l.id) === String(payload.id));
              if (idx !== -1) targetIndex = idx;
            }
            targetMeal = logs[targetIndex];
          }

          const baseCal = Number(payload.baseCal) || (targetMeal ? (Number(targetMeal.baseCalories) || Number(targetMeal.calories)) : 0);
          const basePro = (payload.basePro !== undefined && !isNaN(Number(payload.basePro)) && payload.basePro !== '') ? Number(payload.basePro) : (targetMeal ? (Number(targetMeal.baseProtein) || Number(targetMeal.protein) || 0) : 0);
          const baseCarb = (payload.baseCarb !== undefined && !isNaN(Number(payload.baseCarb)) && payload.baseCarb !== '') ? Number(payload.baseCarb) : (targetMeal ? (Number(targetMeal.baseCarbs) || Number(targetMeal.carbs) || 0) : 0);
          const baseFat = (payload.baseFat !== undefined && !isNaN(Number(payload.baseFat)) && payload.baseFat !== '') ? Number(payload.baseFat) : (targetMeal ? (Number(targetMeal.baseFat) || Number(targetMeal.fat) || 0) : 0);
          const baseWat = (payload.baseWat !== undefined && !isNaN(Number(payload.baseWat)) && payload.baseWat !== '') ? Number(payload.baseWat) : (targetMeal ? (Number(targetMeal.baseWater) || Number(targetMeal.water) || 0) : 0);
          
          let baseName = payload.baseName ? decodeURIComponent(payload.baseName) : (targetMeal ? (targetMeal.baseDishName || targetMeal.dish_name) : (isEn ? 'Meal' : '餐點'));
          baseName = (baseName || (isEn ? 'Meal' : '餐點')).replace(/^[0-9]+(?:\.[0-9]+)?(?:倍的|x\s*)/i, '').replace(/\s*\(.*倍.*份量\)/g, '').trim();

          const newCal = Math.round(baseCal * m);
          const newPro = Number((basePro * m).toFixed(1));
          const newCarb = Number((baseCarb * m).toFixed(1));
          const newFat = Number((baseFat * m).toFixed(1));
          const newWat = Math.round(baseWat * m);
          const newName = m === 1 ? baseName : (isEn ? `${m}x ${baseName}` : `${m}倍的${baseName}`);

          const baseBreakdown = (targetMeal && targetMeal.baseBreakdown && Array.isArray(targetMeal.baseBreakdown) && targetMeal.baseBreakdown.length > 0)
            ? targetMeal.baseBreakdown
            : (targetMeal && targetMeal.breakdown && Array.isArray(targetMeal.breakdown) ? targetMeal.breakdown : []);

          const scaledBreakdown = baseBreakdown.map(item => ({
            ...item,
            calories: Math.round((item.calories || 0) * m),
            protein: Number(((item.protein || 0) * m).toFixed(1))
          }));

          const updateFields = {
            id: payload.id || (targetMeal ? targetMeal.id : Date.now()),
            dish_name: newName,
            calories: newCal,
            protein: newPro,
            carbs: newCarb,
            fat: newFat,
            water: newWat,
            breakdown: scaledBreakdown.length > 0 ? scaledBreakdown : (targetMeal ? targetMeal.breakdown : []),
            baseBreakdown: baseBreakdown.length > 0 ? baseBreakdown : undefined,
            comment: (targetMeal && targetMeal.comment ? targetMeal.comment.replace(/\s*\(.*倍.*份量\)/g, '').replace(/\s*\(.*x portion\)/gi, '') : '') + (m === 1 ? '' : (isEn ? ` (${m}x portion)` : ` (${m}倍份量)`)),
            baseDishName: baseName,
            baseCalories: baseCal,
            baseProtein: basePro,
            baseCarbs: baseCarb,
            baseFat: baseFat,
            baseWater: baseWat,
            multiplier: m
          };

          const updatedMeal = updateOrSaveMealLog(userId, updateFields, userGistId, GITHUB_PAT, props);
          recordSystemLog('倍數調整', userId, `${baseName} -> x${m}`, `${newCal}卡 / ${newPro}g蛋`, `回傳調整卡片：【${newName}】${newCal} kcal · ${newPro}g 蛋 (${m}倍份量)`);
          replyMealConfirmCard(replyToken, updatedMeal, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // ✏️ 自訂倍數點擊 Fallback (若用戶客戶端不支援 openKeyboard)
        if (payload.action === 'fillCustomMult') {
          replyTextMessage(replyToken, isEn 
            ? "✏️ Please type your desired portion multiplier, e.g.:\n• 2x or double (Double portion)\n• 0.5x or half (Half portion)\n• 1.2x (or type '改 1.2倍')"
            : "✏️ 請直接輸入您想調整的整份倍數，例如：\n• 2倍 或 雙倍 / 兩倍 (整份雙倍)\n• 一半 或 半份 (0.5倍)\n• 改 1.2倍 (指定倍數)",
            CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🍚 碳水減半 / 飯吃一半 (-50% 碳水)
        if (payload.action === 'halveCarbs') {
          const logs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
          if (logs.length > 0) {
            const lastMeal = logs[logs.length - 1];
            const oldCarbs = Number(lastMeal.carbs) || 60;
            const newCarbs = Math.round(oldCarbs / 2);
            const savedCals = (oldCarbs - newCarbs) * 4;
            const newCals = Math.max(0, (Number(lastMeal.calories) || 0) - savedCals);
            const updateFields = {
              carbs: newCarbs,
              calories: newCals,
              comment: (lastMeal.comment || '') + (isEn ? ' (🍚 Halved rice / -50% carbs)' : ' (🍚 飯量已減半 -50% 碳水)')
            };
            const updatedMeal = updateOrSaveMealLog(userId, updateFields, userGistId, GITHUB_PAT, props);
            recordSystemLog('碳水減半', userId, payload.name || lastMeal.dish_name, `碳水 ${oldCarbs}g ➔ ${newCarbs}g (-${savedCals} kcal)`, `回傳今日總結卡片：已將【${lastMeal.dish_name}】碳水減半扣除 ${savedCals} kcal`);
            const summaryFlex = generateDailySummaryFlex(userId, updatedMeal, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }
        }

        // 💾 查看今日總結
        if (payload.action === 'save') {
          console.log(`💾 [查看今日總結] 用戶: ${userId}`);
          const todayLogs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
          let totCal = 0, totPro = 0, totWat = 0;
          todayLogs.forEach(l => { totCal += Number(l.calories)||0; totPro += Number(l.protein)||0; totWat += Number(l.water)||0; });
          recordSystemLog('查看總結', userId, payload.name || '今日總結', `累計: ${totCal}卡 / ${totPro}g蛋 / ${totWat}ml水`, `回傳今日總結卡片 (共 ${todayLogs.length} 餐 · 累計 ${totCal} kcal · ${totPro}g 蛋 · ${totWat}ml 水)`);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 📅 選擇歷史日期 (LINE 原生 datetimepicker)
        if (payload.action === 'pickDate' || (event.postback.params && event.postback.params.date)) {
          const targetDate = (event.postback.params && event.postback.params.date) || payload.date;
          if (targetDate) {
            console.log(`📅 [選擇歷史日期] ${targetDate} 用戶: ${userId}`);
            recordSystemLog('選擇日期', userId, targetDate, '', `回傳 ${targetDate} 歷史飲食總結卡片`);
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, targetDate);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }
        }

        // 📋 管理紀錄 (當日或歷史日期)
        if (payload.action === 'manageMeals' || payload.action === 'manage') {
          const targetDate = payload.date || null;
          const page = parseInt(payload.page, 10) || 1;
          console.log(`📋 [管理紀錄] 日期: ${targetDate || '今日'} 頁: ${page} 用戶: ${userId}`);
          recordSystemLog('管理清單', userId, targetDate ? `管理 ${targetDate}` : '點擊管理紀錄', '', `回傳餐點管理面板卡片 (${targetDate || '今日'} p${page})`);
          const mgmtFlex = generateManageMealsFlex(userId, targetDate, LIFF_ID, userGistId, props, userLang, page);
          replyFlexMessage(replyToken, mgmtFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🔍 查看餐點 AI 營養詳情 (方案 B 原生卡片)
        if (payload.action === 'mealInfo' || payload.action === 'detail' || payload.action === 'showMealInfo') {
          const targetId = payload.id;
          const targetDate = payload.date || null;
          console.log(`🔍 [查看餐點詳情] ID: ${targetId} 日期: ${targetDate || '今日'} 用戶: ${userId}`);
          recordSystemLog('查看餐點詳情', userId, `ID: ${targetId}`, '', '回傳 AI 營養詳情卡片 (方案 B 原生卡片)');
          const infoFlex = generateMealInfoFlex(userId, targetId, targetDate, LIFF_ID, userGistId, props, userLang);
          replyFlexMessage(replyToken, infoFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🍞 切換碳水與脂肪追蹤開關
        if (payload.action === 'toggleCarbsFat') {
          const currentGoals = getUserGoals(userId, props, userGistId);
          const newEnable = !currentGoals.show_carbs_fat;
          setUserCarbsFatToggle(userId, newEnable, userGistId, GITHUB_PAT, props);
          const toggleLabel = newEnable ? (isEn ? '🍞 Carbs & Fat tracking ON' : '🍞 已開啟碳水與脂肪追蹤') : (isEn ? '🥑 Carbs & Fat tracking OFF' : '🥑 已關閉碳水與脂肪追蹤');
          recordSystemLog('切換碳水追蹤', userId, toggleLabel, '', `回傳今日總結：碳水追蹤已${newEnable ? '開啟' : '關閉'}`);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 📈 查看 7 日趨勢週報
        if (payload.action === 'viewWeeklyTrends' || payload.action === 'weeklyTrends') {
          console.log(`📈 [查看週報] 用戶: ${userId}`);
          recordSystemLog('週報趨勢', userId, '點擊7日週報', '', '回傳近 7 日飲食趨勢與熱量分析卡片');
          const weeklyFlex = generateWeeklyTrendsFlex(userId, LIFF_ID, userGistId, props, userLang);
          replyFlexMessage(replyToken, weeklyFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 💧 快速補水
        if (payload.action === 'quickWater') {
          const amount = Number(payload.amount) || 500;
          const meal = {
            id: Date.now(),
            date: getTodayDateString(),
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
            dish_name: isEn ? `💧 Drink Water ${amount}ml` : `💧 喝水 ${amount}ml`,
            calories: 0,
            protein: 0,
            water: amount,
            comment: isEn ? '💧 Fast Hydration Log' : '💧 快速補水打卡'
          };
          console.log(`💧 [快速補水] +${amount}ml 用戶: ${userId}`);
          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
          const todayLogs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
          let totWat = 0;
          todayLogs.forEach(l => { totWat += Number(l.water)||0; });
          recordSystemLog('快速喝水', userId, `喝水 ${amount}ml`, `+${amount}ml`, `回傳補水卡片：已記錄補水 +${amount}ml (今日累計 ${totWat}ml)`);
          const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // ⭐ 加入常用餐點
        if (payload.action === 'saveFavorite') {
          const favItem = {
            id: Date.now(),
            dish_name: payload.name || (isEn ? 'Favorite Meal' : '常用餐點'),
            calories: Number(payload.cal) || 0,
            protein: Number(payload.pro) || 0,
            water: Number(payload.wat) || 0
          };
          console.log(`⭐ [加入常用] ${favItem.dish_name} | ${favItem.calories} kcal`);
          recordSystemLog('加入常用', userId, favItem.dish_name, `${favItem.calories}卡 / ${favItem.protein}g蛋`, `回傳收藏卡片：【${favItem.dish_name}】(${favItem.calories} kcal) 已加入常用清單`);
          saveUserFavorite(userId, favItem, userGistId, GITHUB_PAT, props);
          const favAddedFlex = generateFavoriteAddedFlex(favItem, LIFF_ID, userGistId, userLang);
          replyFlexMessage(replyToken, favAddedFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // ⚡ 一鍵記錄常用餐點
        if (payload.action === 'quickLogFavorite') {
          const meal = {
            id: Date.now(),
            date: getTodayDateString(),
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
            dish_name: payload.name ? decodeURIComponent(payload.name) : (isEn ? 'Favorite Meal' : '常用餐點'),
            calories: Number(payload.cal) || 0,
            protein: Number(payload.pro) || 0,
            water: Number(payload.wat) || 0,
            comment: isEn ? '⭐ Favorite Quick Log' : '⭐ 常用快捷記錄'
          };
          console.log(`⚡ [一鍵記錄常用] ${meal.dish_name} | ${meal.calories} kcal`);
          recordSystemLog('快捷記錄', userId, meal.dish_name, `${meal.calories}卡 / ${meal.protein}g蛋 / ${meal.water}ml水`, `回傳總結卡片：已快捷記錄【${meal.dish_name}】(${meal.calories} kcal)`);
          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
          const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
          attachMealMultiplierQuickReply(summaryFlex, meal, userId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 刪除單筆餐點
        if (payload.action === 'deleteMeal') {
          const targetDate = payload.date || null;
          console.log(`🗑️ [刪除單筆餐點] 日期: ${targetDate || '今日'} 標識: ${payload.id || payload.index}`);
          const deletedMeal = deleteMealLog(userId, payload.id || payload.index, userGistId, GITHUB_PAT, props, targetDate);
          const mealName = (deletedMeal && deletedMeal.dish_name) ? deletedMeal.dish_name : (payload.id || payload.index);
          recordSystemLog('刪除餐點', userId, `餐點: ${mealName} (${targetDate || '今日'})`, '', `回傳總結卡片：已刪除指定紀錄 (${mealName})`);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, targetDate);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 移除常用餐點
        if (payload.action === 'deleteFavorite') {
          console.log(`🗑️ [移除常用] 標識: ${payload.favId || payload.name}`);
          recordSystemLog('移除常用', userId, `標識: ${payload.favId || payload.name}`, '', `回傳更新後清單：已自常用庫移除「${payload.favId || payload.name}」`);
          deleteUserFavorite(userId, payload.favId || payload.name, userGistId, GITHUB_PAT, props);
          if (payload.returnView === 'manage') {
            const mgmtFavFlex = generateManageFavoritesFlex(userId, LIFF_ID, userGistId, props, userLang, payload.page);
            replyFlexMessage(replyToken, mgmtFavFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          } else {
            const page = Number(payload.page) || 1;
            const favListFlex = generateFavoritesCarouselFlex(userId, LIFF_ID, userGistId, props, page);
            replyFlexMessage(replyToken, favListFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          }
          continue;
        }

        // ↕️ 常用餐點換順序 (上移 / 下移 / 置頂)
        if (payload.action === 'moveFavorite' || payload.action === 'reorderFavorite') {
          const favId = payload.favId || payload.name;
          const dir = payload.dir || 'up';
          console.log(`↕️ [常用換順序] 標識: ${favId}, 方向: ${dir}`);
          reorderUserFavorites(userId, favId, dir, userGistId, GITHUB_PAT, props);
          recordSystemLog('常用換順序', userId, `${favId} (${dir})`, '', `已更新常用餐點排列順序 (${dir})`);
          if (payload.returnView === 'carousel') {
            const page = Number(payload.page) || 1;
            const favListFlex = generateFavoritesCarouselFlex(userId, LIFF_ID, userGistId, props, page);
            replyFlexMessage(replyToken, favListFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          } else {
            const mgmtFavFlex = generateManageFavoritesFlex(userId, LIFF_ID, userGistId, props, userLang, payload.page);
            replyFlexMessage(replyToken, mgmtFavFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          }
          continue;
        }

        // 📄 常用餐點輪播翻頁
        if (payload.action === 'favPage' || payload.action === 'favCarousel' || payload.action === 'openFavorites') {
          const page = Number(payload.page) || 1;
          console.log(`📄 [常用翻頁] 用戶: ${userId}, 頁碼: ${page}`);
          recordSystemLog('常用翻頁', userId, `第 ${page} 頁`, '', `回傳常用餐點輪播卡片 (第 ${page} 頁)`);
          const favListFlex = generateFavoritesCarouselFlex(userId, LIFF_ID, userGistId, props, page);
          replyFlexMessage(replyToken, favListFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 📋 常用餐點管理面板
        if (payload.action === 'manageFavorites') {
          console.log(`📋 [常用餐點管理] 用戶: ${userId}`);
          recordSystemLog('常用管理', userId, '常用管理面板', '', '回傳常用餐點管理卡片');
          const page = Number(payload.page) || 1;
          const mgmtFavFlex = generateManageFavoritesFlex(userId, LIFF_ID, userGistId, props, userLang, page);
          replyFlexMessage(replyToken, mgmtFavFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 清空今日確認
        if (payload.action === 'clearTodayConfirm') {
          const confirmFlex = generateClearConfirmFlex(LIFF_ID, userGistId, userLang);
          replyFlexMessage(replyToken, confirmFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 確定清空今日
        if (payload.action === 'clearToday') {
          console.log(`🗑️ [清空今日] 用戶: ${userId}`);
          recordSystemLog('清空今日', userId, '清空今日所有紀錄', '', '回傳總結卡片：已清空今日所有餐點紀錄');
          clearTodayLogs(userId, userGistId, GITHUB_PAT, props);
          const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
          replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🚨 徹底銷毀所有個人資料
        if (payload.action === 'destroyAllData') {
          console.log(`🚨 [徹底銷毀帳號資料] 用戶: ${userId}`);
          purgeAllUserData(userId, userGistId, GITHUB_PAT, props);
          const purgeReply = isEn
            ? "🗑️ All your meal logs, body targets, favorite items and private cloud Gist have been permanently deleted and unlinked.\nThank you for using Daily Diet! You can restart anytime by sending a photo or text message! 🐼"
            : "🗑️ 您的所有飲食紀錄、體態目標、常用餐點庫及專屬雲端 Gist 已徹底銷毀並解除綁定。\n\n感謝您的使用，若未來需重新記錄，隨時傳送照片或訊息即可重新啟用！🐼";
          recordSystemLog('銷毀所有資料', userId, '使用者要求徹底銷毀所有資料', '', `回傳訊息：${purgeReply.slice(0, 100)}`);
          replyTextMessage(replyToken, purgeReply, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🗑️ 撤回這筆紀錄
        if (payload.action === 'cancel') {
          if (payload.id || payload.name) {
            deleteMealLog(userId, payload.id || payload.name, userGistId, GITHUB_PAT, props);
            const cancelMsg = isEn
              ? "👌 Successfully cancelled and removed this meal record. Feel free to send new photos or text anytime! 🐼"
              : "👌 已成功為您撤回並刪除此筆餐點紀錄。您可以隨時再傳送照片或文字！🐼";
            recordSystemLog('撤回紀錄', userId, payload.name || payload.id, '', `回傳訊息：${cancelMsg}`);
            replyTextMessage(replyToken, cancelMsg, CHANNEL_ACCESS_TOKEN, userId, props);
          } else {
            const cancelMsg = isEn ? "👌 Cancelled. You can send photos or messages anytime! 🐼" : "👌 已取消此操作。您可以隨時再傳送照片或文字！🐼";
            recordSystemLog('撤回紀錄', userId, '取消操作', '', `回傳訊息：${cancelMsg}`);
            replyTextMessage(replyToken, cancelMsg, CHANNEL_ACCESS_TOKEN, userId, props);
          }
          continue;
        }
      }

      // 💬 Case 2: 用戶發送訊息 (圖片或文字)
      else if (event.type === 'message') {
        // 📸 照片辨識
        if (event.message.type === 'image') {
          currentOperation = '傳送餐點照片進行 AI 分析';
          currentUserInput = `照片 Message ID: ${event.message.id}`;
          sendLineLoadingAnimation(userId, CHANNEL_ACCESS_TOKEN, 25);
          const messageId = event.message.id;
          console.log(`📸 [收到餐點照片] Message ID: ${messageId}`);
          const imageBlob = getLineImageBlob(messageId, CHANNEL_ACCESS_TOKEN);
          if (!imageBlob) {
            replyTextMessage(replyToken, isEn ? '⚠️ Could not download photo from LINE. Please try again!' : '⚠️ 無法自 LINE 下載照片，請稍候再傳一次！', CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }
          const imgBytes = imageBlob.getBytes();
          if (imgBytes.length > 5 * 1024 * 1024) {
            const sizeMb = (imgBytes.length / (1024 * 1024)).toFixed(1);
            const sizeWarn = isEn
              ? `📸 Photo is too large (${sizeMb} MB, exceeds 5MB limit). Please send a standard quality or cropped photo! 🐼`
              : `📸 照片檔案過大（約 ${sizeMb} MB，超過 5MB 上限），為避免辨識超時或失敗，請嘗試以標準畫質傳送或稍微裁切後再傳一次喔！🐼`;
            replyTextMessage(replyToken, sizeWarn, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }
          const base64Image = Utilities.base64Encode(imgBytes);

          // 📸 24 小時迷你雲端縮圖同步 (方案 B 原生詳情卡片專用，預設防護關閉)
          let uploadedImageUrl = null;
          try {
            uploadedImageUrl = uploadTempMealPhoto(imageBlob, props);
          } catch (imgErr) {
            console.warn("⚠️ 雲端縮圖同步失敗:", imgErr);
          }

          const analysis = analyzeMealWithGemini(base64Image, GEMINI_API_KEY, userId, props, userGistId, GITHUB_PAT);
          console.log(`🤖 [照片 AI 辨識結果]`, JSON.stringify(analysis));

          const usedModel = analysis.model_used || 'Gemini';

          // ⏰ 檢查是否處於進食窗口之外 (斷食提醒)
          const userGoals = getUserGoals(userId, props, userGistId);
          if (userGoals.fasting_enabled && isOutsideEatingWindow(new Date(), userGoals.fasting_start, userGoals.fasting_end)) {
            const fastingNotice = isEn
              ? `\n\n⏰ Notice: You're outside your eating window (${userGoals.fasting_start}~${userGoals.fasting_end}). This meal broke your fast!`
              : `\n\n⏰ 提醒：目前為斷食時段（設定窗口 ${userGoals.fasting_start} ~ ${userGoals.fasting_end}），此餐已打破斷食喔！`;
            if (analysis.panda_comment) {
              analysis.panda_comment += fastingNotice;
            } else {
              analysis.panda_comment = fastingNotice.trim();
            }
          }

          const meal = {
            id: Date.now(),
            date: getTodayDateString(),
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
            dish_name: analysis.dish_name || (isEn ? 'Meal' : '美味餐點'),
            calories: Number(analysis.calories) || 0,
            protein: Number(analysis.protein) || 0,
            carbs: Number(analysis.carbs) || 0,
            fat: Number(analysis.fat) || 0,
            water: Number(analysis.water) || 0,
            breakdown: analysis.breakdown || [],
            calculation_note: analysis.calculation_note || '',
            comment: analysis.panda_comment || '',
            baseDishName: analysis.dish_name || (isEn ? 'Meal' : '美味餐點'),
            baseCalories: Number(analysis.calories) || 0,
            baseProtein: Number(analysis.protein) || 0,
            baseCarbs: Number(analysis.carbs) || 0,
            baseFat: Number(analysis.fat) || 0,
            baseWater: Number(analysis.water) || 0,
            multiplier: 1,
            model_used: usedModel,
            image_url: uploadedImageUrl
          };

          saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
          const fallbackNote = (analysis.failed_attempts && analysis.failed_attempts.length > 0)
            ? ` (前序 ${analysis.failed_attempts.length} 次重試)`
            : '';
          recordSystemLog(
            '照片辨識', 
            userId, 
            `傳送照片 (ID: ${messageId})`, 
            `[${usedModel}${fallbackNote}] ${analysis.dish_name} (${analysis.calories}卡 / ${analysis.protein}g蛋 / ${analysis.water || 0}ml水)`, 
            `[模型: ${usedModel}] 回傳確認卡片：【${analysis.dish_name}】${analysis.calories} kcal · ${analysis.protein}g 蛋 · ${analysis.carbs || 0}g 碳 · ${analysis.fat || 0}g 脂${analysis.panda_comment ? ' · 教練：「' + analysis.panda_comment + '」' : ''}`
          );
          replyMealConfirmCard(replyToken, meal, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId, props);
          continue;
        }

        // 🎙️ 語音訊息 (Audio Message - 語音轉文字後無縫串接所有指令與飲食分析)
        if (event.message.type === 'audio') {
          currentOperation = '傳送語音訊息進行 AI 語音轉文字';
          currentUserInput = `語音 Message ID: ${event.message.id}`;
          sendLineLoadingAnimation(userId, CHANNEL_ACCESS_TOKEN, 25);
          const messageId = event.message.id;
          console.log(`🎙️ [收到用戶語音] Message ID: ${messageId}`);

          let transcribedText = '';
          try {
            const audioBlob = getLineAudioBlob(messageId, CHANNEL_ACCESS_TOKEN);
            const contentType = audioBlob.getContentType() || 'audio/mp4';
            const base64Audio = Utilities.base64Encode(audioBlob.getBytes());
            transcribedText = transcribeAudioWithGemini(base64Audio, contentType, GEMINI_API_KEY);
            console.log(`🎙️ [語音轉錄結果] "${transcribedText}"`);
          } catch (audioErr) {
            console.error("🚨 語音下載或辨識失敗:", audioErr);
            recordSystemLog('語音辨識異常', userId, `語音 ID: ${messageId}`, '', `語音下載或辨識失敗: ${audioErr.message}`);
          }

          if (!transcribedText || !transcribedText.trim()) {
            recordSystemLog('語音辨識', userId, `語音 ID: ${messageId}`, '無可辨識語音內容', '回傳重試提示');
            const noVoiceMsg = (userLang === 'en')
              ? "🎙️ Sorry, Panda Coach couldn't hear that clearly. Please try speaking again or send text directly! 🐼"
              : "🎙️ 抱歉，熊貓教練沒有聽清楚您的語音內容～請再說一次，或直接輸入文字記錄喔！🐼✨";
            replyTextMessage(replyToken, noVoiceMsg, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          recordSystemLog('語音辨識', userId, `語音 ID: ${messageId}`, transcribedText, `語音轉錄成功：「${transcribedText}」，自動執行對應功能`);

          // 🔄 無縫轉交文字處理分支
          event.message.type = 'text';
          event.message.text = transcribedText.trim();
          event._isAudioInput = true;
          event._rawAudioText = transcribedText.trim();
        }

        // 💬 文字訊息 (亦承接由語音轉錄而來的文字指令)
        if (event.message.type === 'text') {
          const userText = event.message.text.trim();
          currentOperation = '傳送文字訊息';
          currentUserInput = userText;
          console.log(`💬 [收到用戶文字] "${userText}"`);

          // 🆔 查詢當前用戶 LINE User ID
          if (userText === '我的id' || userText === '我的ID' || userText === '我的userid' || userText === '用戶id' || userText.toLowerCase() === 'userid' || userText.toLowerCase() === 'my id' || userText.toLowerCase() === 'uid') {
            const idMsg = isEn
              ? `🆔 Your LINE User ID:\n${userId}\n\n(Tap & hold to copy)`
              : `🆔 您的專屬 LINE User ID：\n${userId}\n\n💡 提示：長按即可複製此 ID，可用於維護者測試推播或連動設定！`;
            recordSystemLog('查詢用戶ID', userId, userText, userId, '回傳當前用戶 LINE User ID');
            replyTextMessage(replyToken, idMsg, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🚀 查看新功能 / 更新公告
          if (userText === '新功能' || userText === '更新' || userText === '更新通知' || userText === '更新說明' || userText === '最新功能' || userText === '功能更新' || userText.toLowerCase() === 'whatsnew' || userText.toLowerCase() === "what's new" || userText.toLowerCase() === 'news') {
            recordSystemLog('查看新功能通知', userId, userText, '', '回傳最新版本功能升級卡片');
            const announceFlex = generateFeatureAnnouncementFlex(userId, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, announceFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🌐 雙語切換 (支援中文/英文雙向切換)
          if (userText === '切換語言' || userText === '換語言' || userText === '語言' || userText === '雙語' || userText.toLowerCase() === 'language' || userText.toLowerCase() === 'switch language') {
            const curLang = getUserLanguage(userId, props, userGistId, GITHUB_PAT);
            recordSystemLog('切換語言', userId, userText, curLang, '回傳語言選擇卡片 (繁體中文/English)');
            const langFlex = generateLanguageSelectionFlex(userId, LIFF_ID, userGistId, curLang);
            replyFlexMessage(replyToken, langFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          if (userText.toLowerCase() === 'english' || userText === '英文' || userText === '切換英文' || userText === '切換成英文') {
            setUserLanguage(userId, 'en', userGistId, GITHUB_PAT, props);
            switchUserRichMenuByLanguage(userId, 'en', props);
            recordSystemLog('切換語言', userId, userText, 'en', '回傳提示：已成功切換為英文，並更新圖文選單');
            replyTextMessage(replyToken, "🌐 Language switched to English! 🐼✨\nFrom now on, Panda Coach will analyze your meals, calculate nutrition, and reply in English!\nYour Rich Menu has also been updated to English.\n\n(Tip: Type \"中文\" anytime to switch back to Chinese)", CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          if (userText === '中文' || userText === '繁體中文' || userText.toLowerCase() === 'chinese' || userText === '切換中文' || userText === '切換成中文') {
            setUserLanguage(userId, 'zh', userGistId, GITHUB_PAT, props);
            switchUserRichMenuByLanguage(userId, 'zh', props);
            recordSystemLog('切換語言', userId, userText, 'zh', '回傳提示：已成功切換為繁體中文，並更新圖文選單');
            replyTextMessage(replyToken, "🌐 語言已成功切換為繁體中文！ 🐼✨\n熊貓教練將會以繁體中文為您分析飲食與計算營養囉！\n圖文選單也已為您切換為繁體中文。\n\n（隨時輸入「English」可切換為英文）", CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🎭 切換教練性格
          if (userText === '切換性格' || userText === '挑選性格' || userText === '選擇性格' || userText === '挑選教練性格' || userText === '換性格' || userText === '改性格' || userText === '換教練' || userText === '教練性格' || userText === '性格' || userText === '教練' || userText === '多重性格' || userText.toLowerCase() === 'persona') {
            recordSystemLog('切換性格', userId, userText, '', '回傳教練性格選擇卡片 (傲嬌/溫柔/魔鬼)');
            const personaFlex = generatePersonaSelectionFlex(userId, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, personaFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          if (userText.startsWith('切換') || userText.startsWith('換成') || userText.startsWith('模式') || userText.startsWith('設定性格') || userText.includes('教練')) {
            let targetPersona = '';
            if (userText.includes('溫柔') || userText.includes('天使') || userText.includes('治癒')) targetPersona = 'gentle';
            else if (userText.includes('鐵血') || userText.includes('魔鬼') || userText.includes('熱血') || userText.includes('斯巴達')) targetPersona = 'hardcore';
            else if (userText.includes('傲嬌') || userText.includes('毒舌') || userText.includes('預設')) targetPersona = 'tsundere';

            if (targetPersona) {
              setUserPersona(userId, targetPersona, userGistId, GITHUB_PAT, props);
              const personaNamesZh = { tsundere: '傲嬌毒舌教練 🐼😡', gentle: '治癒天使 🐼🥰', hardcore: '魔鬼士官長 🐼🔥' };
              const personaNamesEn = { tsundere: 'Tsundere Coach 🐼😡', gentle: 'Healing Angel 🐼🥰', hardcore: 'Drill Sergeant 🐼🔥' };
              const pName = isEn ? (personaNamesEn[targetPersona] || targetPersona) : (personaNamesZh[targetPersona] || targetPersona);
              const replyMsg = isEn
                ? `🎭 Successfully switched Panda Coach persona to 【${pName}】!\nSend a meal photo or food name to test it out 🐼✨`
                : `🎭 已成功將教練性格切換為【${pName}】！\n快傳送照片或打字測試看看吧 🐼✨`;
              recordSystemLog('切換性格', userId, targetPersona, '', `回傳提示：${replyMsg.slice(0, 100)}`);
              replyTextMessage(replyToken, replyMsg, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 🐛 問題回報 / Bug Report / 意見反饋 (直接在 LINE 聊天室回報，並發送信件給開發團隊)
          const reportPrefixRegex = /^(?:問題回報|bug\s*report|回報|bug|問題|建議|反饋|報錯)[\s:：、,]*(.*)$/is;
          const reportMatch = userText.match(reportPrefixRegex);
          if (reportMatch) {
            const issueDetails = (reportMatch[1] || '').trim();
            if (!issueDetails) {
              const promptMsg = isEn
                ? "🐛 【Bug Report】\nPlease include your issue or suggestion after 'Bug:'!\nExample: `Bug: The protein count seems off` 🐼"
                : "🐛 【問題與建議回報】\n請在「回報」後方加上您的問題或建議說明喔！\n例如：`回報 雞胸肉蛋白質計算有誤差` 🐼";
              replyTextMessage(replyToken, promptMsg, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }

            console.log(`🐛 [收到問題回報] 用戶 ${userId}: ${issueDetails}`);

            const persona = getUserPersona(userId, props, userGistId, GITHUB_PAT);
            const userDisplayName = getUserDisplayName(userId, CHANNEL_ACCESS_TOKEN, props) || `LINE用戶 (${userId.slice(-6)})`;

            // 🚀 1. 發送郵件通報 (雙重機制：GAS 原生 MailApp 直送 + Web3Forms 備援)
            const sendResult = sendBugReportNotification({
              userId,
              userName: userDisplayName,
              issueDetails,
              userLang,
              persona,
              userGistId,
              props
            });

            // 🚀 2. LINE 管理員專屬即時推播通知 (手機秒震動彈出卡片)
            notifyAdminViaLine({
              reporterName: userDisplayName,
              reporterId: userId,
              content: issueDetails,
              userLang: userLang,
              props: props,
              accessToken: CHANNEL_ACCESS_TOKEN
            });

            const isSuccess = sendResult.success;
            const logNote = isSuccess 
              ? `已成功記錄用戶問題回報並寄出通知信件 (${sendResult.recipients || 'hi@winnie-lin.space'})` 
              : `已記錄用戶問題回報，但郵件寄送失敗: ${sendResult.error || '未授權或阻擋'}`;

            recordSystemLog('問題回報', userId, issueDetails, '', `回傳確認卡片：${logNote}`);

            const ackFlex = generateBugReportAckFlex(issueDetails, isSuccess, userLang);
            replyFlexMessage(replyToken, ackFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 💡 說明 / 指令 / 教學 / 歡迎 / 功能清單
          if (userText === '說明' || userText.toLowerCase() === 'help' || userText.toLowerCase() === 'guide' || userText === '使用說明' || userText === '開始' || userText === '教學' || userText === '免責聲明' || userText === '歡迎' || userText === '指令' || userText === '功能' || userText === '功能清單' || userText === '全部功能' || userText === '操作說明' || userText === '指南') {
            recordSystemLog('使用說明', userId, userText, '', '回傳操作說明與功能手冊卡片');
            const helpFlex = generateCommandMenuFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, helpFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🚀 建立/更新原生相機圖文選單
          if (userText === '更新相機選單' || userText === '設定相機選單' || userText === '更新選單' || userText === '部署選單' || userText === '新選單' || userText === '換選單' || userText === '重整選單') {
            recordSystemLog('部署選單', userId, userText, '', '觸發原生相機圖文選單部署並回傳通知');
            try {
              const richMenuId = setupNativeCameraRichMenu(CHANNEL_ACCESS_TOKEN, LIFF_ID, props);
              let enRichMenuId = '';
              try {
                enRichMenuId = setupEnglishNativeCameraRichMenu(CHANNEL_ACCESS_TOKEN, LIFF_ID, props);
              } catch (eErr) {
                console.warn('部署英文選單失敗:', eErr);
              }
              const repMsg = isEn
                ? `🎉 Dual Native Camera Rich Menus deployed successfully!\n\n🇨🇳 Chinese Menu ID: ${richMenuId}\n🇺🇸 English Menu ID: ${enRichMenuId || 'Active'}\n\n📸 Top-left button is bound to LINE Native Camera!\nWhen switching languages, the Rich Menu adapts automatically 🐼✨`
                : `🎉 【原生相機圖文選單】已成功建立！\n\n🇨🇳 中文選單 ID: ${richMenuId}\n🇺🇸 英文選單 ID: ${enRichMenuId || '已建立'}\n\n📸 左上角已綁定 LINE 原生相機動作，點擊直接開相機！\n當切換語言至 English 時，系統會自動將圖文選單切換至英文版本 🐼✨\n\n💡 若手機尚未更新畫面：請關閉並重新打開此 LINE 聊天室即可！`;
              replyTextMessage(replyToken, repMsg, CHANNEL_ACCESS_TOKEN, userId, props);
            } catch (err) {
              replyTextMessage(replyToken, `❌ 部署圖文選單失敗：${err.message}`, CHANNEL_ACCESS_TOKEN, userId, props);
            }
            continue;
          }

          // 📸 拍照記帳導引
          if (userText === '拍照' || userText === '拍照辨識' || userText === '拍照記帳' || userText === '拍餐點' || userText.toLowerCase() === 'camera' || userText.toLowerCase() === 'ai camera') {
            const cameraGuideText = isEn
              ? "📸 Please tap the 【📷 Open Camera】button below to take a photo, or choose from your album! AI Panda will analyze calories and nutrients immediately! 🐼✨"
              : "📸 請點擊下方快捷按鈕【📷 開啟相機】直接拍照，或從【🖼️ 挑選照片】選取餐點傳送！AI 熊貓立刻為您分析熱量與營養素！🐼✨";
            recordSystemLog('拍照引導', userId, userText, '', `回傳指引提示：${cameraGuideText.slice(0, 100)}`);
            const cameraQuickReply = {
              items: [
                {
                  type: "action",
                  action: {
                    type: "camera",
                    label: isEn ? "📷 Open Camera" : "📷 開啟相機"
                  }
                },
                {
                  type: "action",
                  action: {
                    type: "cameraRoll",
                    label: isEn ? "🖼️ Camera Roll" : "🖼️ 挑選照片"
                  }
                }
              ]
            };
            replyTextMessage(replyToken, cameraGuideText, CHANNEL_ACCESS_TOKEN, userId, props, cameraQuickReply);
            continue;
          }

          // 🍞 開啟/關閉碳水與脂肪追蹤
          const isEnableCarbs = userText === '開啟碳水' || userText === '記錄碳水' || userText === '開啟碳水與糖' || userText === '顯示碳水' || userText === '碳水追蹤' || userText.toLowerCase() === 'enable carbs' || userText.toLowerCase() === 'track carbs' || userText.toLowerCase() === 'show carbs';
          const isDisableCarbs = userText === '關閉碳水' || userText === '隱藏碳水' || userText === '不記錄碳水' || userText === '關閉碳水與糖' || userText === '關閉碳水脂肪' || userText.toLowerCase() === 'disable carbs' || userText.toLowerCase() === 'hide carbs';
          if (isEnableCarbs || isDisableCarbs) {
            const enable = isEnableCarbs;
            setUserCarbsFatToggle(userId, enable, userGistId, GITHUB_PAT, props);
            const toggleLabel = enable ? (isEn ? '🍞 Carbs & Fat tracking is now ON!' : '🍞 已開啟碳水與脂肪追蹤！') : (isEn ? '🥑 Carbs & Fat tracking is now OFF.' : '🥑 已關閉碳水與脂肪追蹤。');
            recordSystemLog('切換碳水追蹤', userId, userText, toggleLabel, `回傳今日總結：碳水追蹤已${enable ? '開啟' : '關閉'}`);
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 查詢今日總結
          if (userText === '今天' || userText === '總結' || userText === '統計' || userText === '今日' || userText === '今日總結' || userText.toLowerCase() === 'summary' || userText.toLowerCase() === 'today' || userText.toLowerCase() === 'daily summary') {
            const todayLogs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
            let totCal = 0, totPro = 0, totWat = 0;
            todayLogs.forEach(l => { totCal += Number(l.calories)||0; totPro += Number(l.protein)||0; totWat += Number(l.water)||0; });
            recordSystemLog('查詢總結', userId, userText, `累計: ${totCal}卡 / ${totPro}g蛋 / ${totWat}ml水`, `回傳今日總結卡片 (共 ${todayLogs.length} 餐 · 累計 ${totCal} kcal · ${totPro}g 蛋 · ${totWat}ml 水)`);
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🔍 查詢餐點詳細 INFO (支援: 詳細、詳情、info、detail、詳細 1、詳細 早餐、詳細 Mee Soto 等)
          const detailMatch = userText.match(/^(?:詳細|詳情|info|detail)(?:\s+(.+))?$/i);
          if (detailMatch) {
            const targetQuery = detailMatch[1] ? detailMatch[1].trim() : 'latest';
            console.log(`🔍 [文字查詢餐點詳情] 查詢: ${targetQuery} 用戶: ${userId}`);
            recordSystemLog('查詢餐點詳情', userId, userText, `目標: ${targetQuery}`, '回傳 AI 營養詳情卡片 (方案 B 原生卡片)');
            const infoFlex = generateMealInfoFlex(userId, targetQuery, null, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, infoFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📊 查詢 7 日趨勢與歷史週報
          if (userText === '週報' || userText === '趨勢' || userText === '圖表' || userText === '歷史' || userText === '歷史紀錄' || userText === '戰報' || userText === '7天' || userText === '七天' || userText === '分析' || userText.toLowerCase() === 'weekly' || userText.toLowerCase() === 'trend') {
            recordSystemLog('週報趨勢', userId, userText, '', '回傳近 7 日趨勢歷史週報與熱量統計卡片');
            const weeklyFlex = generateWeeklyTrendsFlex(userId, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, weeklyFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📅 查詢昨日/前天歷史紀錄
          if (userText === '昨天' || userText === '昨日' || userText.toLowerCase() === 'yesterday') {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const dateStr = Utilities.formatDate(yesterday, "Asia/Taipei", "yyyy-MM-dd");
            recordSystemLog('查詢歷史', userId, userText, dateStr, `回傳昨日 (${dateStr}) 歷史飲食總結卡片`);
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, dateStr);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          if (userText === '前天') {
            const dayBefore = new Date(Date.now() - 48 * 60 * 60 * 1000);
            const dateStr = Utilities.formatDate(dayBefore, "Asia/Taipei", "yyyy-MM-dd");
            recordSystemLog('查詢歷史', userId, userText, dateStr, `回傳前天 (${dateStr}) 歷史飲食總結卡片`);
            const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, dateStr);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📅 查詢指定歷史日期 (例如: "2026-09-03", "9/3", "9月3日")
          const dateMatch = userText.match(/^(?:查|歷史|紀錄)?\s*(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/) ||
                            userText.match(/^(?:查|歷史|紀錄)?\s*(\d{1,2})[-/.月](\d{1,2})日?$/);
          if (dateMatch) {
            const now = new Date();
            let year = now.getFullYear();
            let month = 0;
            let day = 0;
            if (dateMatch.length === 4) {
              year = parseInt(dateMatch[1]);
              month = parseInt(dateMatch[2]);
              day = parseInt(dateMatch[3]);
            } else if (dateMatch.length === 3) {
              month = parseInt(dateMatch[1]);
              day = parseInt(dateMatch[2]);
            }
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
              const mm = String(month).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const targetDateStr = `${year}-${mm}-${dd}`;
              recordSystemLog('查詢歷史日期', userId, userText, targetDateStr, `回傳指定日期 (${targetDateStr}) 歷史飲食總結卡片`);
              const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props, targetDateStr);
              replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 💧 快速喝水打卡 (例如: "喝水 500", "喝水 250ml", "+500水", "water 500", "water")
          const waterMatch = userText.match(/^(?:喝水|補水)\s*(\d{2,4})?\s*(?:ml|cc|水)?$/i) 
            || userText.match(/^\+(\d{2,4})\s*(?:ml|cc|水)?$/i) 
            || userText.match(/^(\d{2,4})\s*(?:ml|cc)\s*(?:水)?$/i)
            || userText.match(/^(?:water|drink\s*water)\s*(\d{2,4})?\s*(?:ml|cc)?$/i)
            || userText.match(/^\+?(\d{2,4})\s*(?:ml|cc)?\s*water$/i);
          if (waterMatch || userText === '喝水' || userText === '補水' || userText.toLowerCase() === 'water') {
            const amount = (waterMatch && waterMatch[1]) ? Number(waterMatch[1]) : 500;

            const lastWaterKey = `LAST_WATER_${userId}`;
            const lastWaterTime = Number(props.getProperty(lastWaterKey) || 0);
            const nowMs = Date.now();
            if (nowMs - lastWaterTime < 15000) {
              const dupText = isEn
                ? `💧 Hydration was already logged just now! Please take a sip and log again later 🐼✨\n(You just added ${amount}ml water)`
                : `💧 剛剛已為您記錄過喝水囉！請稍候再打卡 🐼✨\n（您剛才已補充 ${amount}ml 水分）`;
              replyTextMessage(replyToken, dupText, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
            props.setProperty(lastWaterKey, String(nowMs));

            const meal = {
              id: Date.now(),
              date: getTodayDateString(),
              time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
              dish_name: isEn ? `💧 Drink Water ${amount}ml` : `💧 喝水 ${amount}ml`,
              calories: 0,
              protein: 0,
              water: amount,
              comment: isEn ? '💧 Fast Hydration Log' : '💧 快速補水打卡'
            };
            saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
            const todayLogs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
            let totWat = 0;
            todayLogs.forEach(l => { totWat += Number(l.water)||0; });
            recordSystemLog('文字喝水', userId, userText, `+${amount}ml 水分`, `回傳補水卡片：已記錄補水 +${amount}ml (今日累計 ${totWat}ml)`);
            const summaryFlex = generateDailySummaryFlex(userId, meal, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // ⚖️ 體重打卡記錄 (例如: "體重 65.2", "量體重 64.5kg", "weight 65.2", "65.5kg", "體重: 60")
          const weightMatch = userText.match(/^(?:體重|量體重|測體重|weight|w)[\s:：]*(\d{2,3}(?:\.\d{1,2})?)\s*(?:kg|公斤)?$/i)
            || userText.match(/^(\d{2,3}(?:\.\d{1,2})?)\s*(?:kg|公斤)$/i);
          if (weightMatch) {
            const weightVal = parseFloat(weightMatch[1]);
            if (weightVal >= 25 && weightVal <= 300) {
              const dateStr = getTodayDateString();
              let weightRes = { weight: weightVal, date: dateStr };
              if (typeof saveWeightLog === 'function') {
                weightRes = saveWeightLog(userId, weightVal, dateStr, userGistId, GITHUB_PAT, props);
              }
              const logDiffText = weightRes.diff != null ? ` (${weightRes.diff > 0 ? '+' : ''}${weightRes.diff} kg)` : '';
              recordSystemLog('文字記錄體重', userId, userText, `${weightVal} kg${logDiffText}`, '回傳體重確認卡片');
              const weightFlex = generateWeightConfirmFlex(userId, weightRes, LIFF_ID, userGistId, props, userLang);
              replyFlexMessage(replyToken, weightFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 💩 便便打卡記錄 (例如: "排便", "大便", "便便", "便便打卡", "💩", "poop", "上廁所")
          const poopMatch = userText.match(/^(?:排便|大便|便便|便便打卡|便便紀錄|上廁所|poop|pooped|💩)(?:\s*(.+))?$/i);
          if (poopMatch) {
            let poopRes = { timestamp: Date.now() };
            if (typeof savePoopLog === 'function') {
              poopRes = savePoopLog(userId, Date.now(), userGistId, GITHUB_PAT, props);
            }
            const intervalDesc = poopRes.elapsedHours != null ? `間隔 ${poopRes.elapsedHours} 小時` : '初次打卡';
            recordSystemLog('文字排便打卡', userId, userText, intervalDesc, '回傳排便確認卡片');
            const poopFlex = generatePoopConfirmFlex(userId, poopRes, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, poopFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📈 體態與排便圖表 / 趨勢 (例如: "體重趨勢", "體重紀錄", "體重圖表", "排便紀錄", "便便紀錄", "體態紀錄", "體重曲線", "weight chart", "poop chart")
          const trendMatch = userText.match(/^(?:體重趨勢|體重紀錄|體重記錄|體重圖表|體態趨勢|體態紀錄|排便紀錄|排便記錄|便便紀錄|便便記錄|排便趨勢|體重曲線|看體重|weight\s*(?:chart|trend|history)|poop\s*(?:chart|trend|history))$/i);
          const isJustWeight = /^(?:體重|量體重|我的體重|weight)$/i.test(userText);
          if (trendMatch || isJustWeight) {
            recordSystemLog('文字查看體重排便趨勢', userId, userText, '', '回傳體重與排便趨勢圖表卡片');
            const chartFlex = generateWeightPoopChartFlex(userId, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, chartFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // ☁️ 手動綁定既有的 GitHub Gist ID
          if (userText.startsWith('綁定') || userText.startsWith('連動') || userText.toLowerCase().startsWith('gist') || userText.toLowerCase().startsWith('bind')) {
            const cleanGistId = userText.replace(/^(?:綁定|連動|gist|bind)\s*/i, '').replace(/^(?:id)?[:：\s]*/i, '').trim();
            const isGistFormatValid = cleanGistId && (typeof isValidGistId === 'function' ? isValidGistId(cleanGistId) : /^[0-9a-zA-Z]{8,64}$/.test(cleanGistId));
            if (cleanGistId && isGistFormatValid) {
              props.setProperty(`USER_GIST_${userId}`, cleanGistId);
              recordSystemLog('綁定Gist', userId, userText, cleanGistId, `回傳綁定成功訊息：已成功連動個人 Gist 雲端庫 (${cleanGistId})`);
              
              let extraMsg = '';
              let favCount = 0;
              let lineDisplayName = '';
              try {
                lineDisplayName = getUserDisplayName(userId, CHANNEL_ACCESS_TOKEN, props) || '';
                if (lineDisplayName && !lineDisplayName.startsWith('LINE用戶')) {
                  props.setProperty(`USER_NAME_${userId}`, lineDisplayName);
                }
              } catch (ne) {}

              if (GITHUB_PAT) {
                try {
                  const gistUrl = `https://api.github.com/gists/${cleanGistId}`;
                  const getRes = UrlFetchApp.fetch(gistUrl, {
                    headers: { 'Authorization': `Bearer ${GITHUB_PAT}`, 'Accept': 'application/vnd.github+json' },
                    muteHttpExceptions: true
                  });
                  if (getRes.getResponseCode() === 200) {
                    const content = JSON.parse(getRes.getContentText()).files?.['daily-diet-backup.json']?.content;
                    if (content) {
                      const backupData = JSON.parse(content);
                      let needGistUpdate = false;
                      if (backupData.settings) {
                        const cal = backupData.settings.find(s => s.key === 'calorie_goal' || s.key === 'user_calories')?.value;
                        const pro = backupData.settings.find(s => s.key === 'protein_goal' || s.key === 'user_protein')?.value;
                        const wat = backupData.settings.find(s => s.key === 'water_goal' || s.key === 'user_water')?.value;
                        if (cal) props.setProperty(`CALORIE_GOAL_${userId}`, String(cal));
                        if (pro) props.setProperty(`PROTEIN_GOAL_${userId}`, String(pro));
                        if (wat) props.setProperty(`WATER_GOAL_${userId}`, String(wat));
                      }
                      if (backupData.favorites && Array.isArray(backupData.favorites) && backupData.favorites.length > 0) {
                        props.setProperty(`FAVORITES_${userId}`, JSON.stringify(backupData.favorites));
                        favCount = backupData.favorites.length;
                      }
                      // 👤 同步使用者名稱統一為 LINE 名稱 (若有)
                      if (lineDisplayName && !lineDisplayName.startsWith('LINE用戶')) {
                        backupData.localStorage = backupData.localStorage || {};
                        backupData.localStorage.user_name = lineDisplayName;
                        backupData.localStorage.line_user_name = lineDisplayName;
                        needGistUpdate = true;
                      }
                      if (needGistUpdate) {
                        try {
                          UrlFetchApp.fetch(gistUrl, {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${GITHUB_PAT}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
                            payload: JSON.stringify({
                              files: {
                                'daily-diet-backup.json': {
                                  content: JSON.stringify(backupData, null, 2)
                                }
                              }
                            }),
                            muteHttpExceptions: true
                          });
                        } catch (ue) {
                          console.warn("Gist 名稱反寫失敗:", ue);
                        }
                      }
                      extraMsg = isEn 
                        ? `\n👤 User name synced to your LINE name: "${lineDisplayName || 'User'}"\n📦 Synced Web logs, nutrition targets & ${favCount} favorite meals in real-time!`
                        : `\n👤 使用者名稱已同步為您的 LINE 名稱：「${lineDisplayName || 'LINE 用戶'}」\n📦 已偵測到您在 Web 端的歷史紀錄、體態目標與 ${favCount} 筆常用餐點，已全面即時連動！`;
                    }
                  }
                } catch (e) {
                  console.error("Gist 同步失敗:", e);
                }
              }

              const bindReply = isEn
                ? `🎉 Congratulations! Successfully linked your LINE account to Gist Cloud:\n🔑 Gist ID: ${cleanGistId}${extraMsg}\n\nType "Favorites" or "Goals" anytime in LINE to use your custom Web data! 🐼✨`
                : `🎉 恭喜！已成功將您的 LINE 帳號連動至 Gist 雲端庫：\n🔑 Gist ID: ${cleanGistId}${extraMsg}\n\n現在在 LINE 輸入「常用」或「目標」，隨時都能取用您在 Web 建立的自訂常用餐點！🐼✨`;
              replyTextMessage(replyToken, bindReply, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            } else if (cleanGistId) {
              const invalidGistReply = isEn
                ? "⚠️ Invalid Gist ID format! GitHub Gist IDs must be alphanumeric strings (e.g. 9a48b4604260...). Please check and try again! 🐼"
                : "⚠️ Gist ID 格式不正確！GitHub Gist ID 必須為純英數字組成的雜湊字串（例如 9a48b4604260...），不能包含路徑符號或特殊字元，請確認後重新輸入！🐼";
              replyTextMessage(replyToken, invalidGistReply, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 開啟選單 (帶個人專屬 Gist ID)
          if (userText === '選單' || userText === 'App' || userText === '主選單' || userText === '日記' || userText.toLowerCase() === 'menu' || userText.toLowerCase() === 'app') {
            const appUrl = `https://liff.line.me/${LIFF_ID}?userId=${userId}${userGistId ? `&gistId=${userGistId}` : ''}`;
            recordSystemLog('開啟App', userId, userText, '', `回傳 App 連結訊息：${appUrl}`);
            const appReply = isEn
              ? `🐼 Tap to open your Personal Diet Diary (auto-synced with cloud):\n${appUrl}`
              : `🐼 點擊開啟您的個人飲食日記（已自動連動個人雲端）：\n${appUrl}`;
            replyTextMessage(replyToken, appReply, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📋 管理今日紀錄
          if (userText === '管理' || userText === '管理紀錄' || userText === '紀錄管理' || userText === '清單' || userText === '今日清單' || userText === '紀錄' || userText.toLowerCase() === 'manage') {
            recordSystemLog('管理清單', userId, userText, '', '回傳餐點管理面板卡片 (今日)');
            const mgmtFlex = generateManageMealsFlex(userId, getTodayDateString(), LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, mgmtFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // ⭐ 常用餐點與補水輪播庫 (Carousel)
          if (userText === '常用' || userText === '快捷' || userText === '收藏' || userText === '常用清單' || userText === '我的常用' || userText === '常用餐點' || userText === '快捷輪播' || userText.toLowerCase() === 'favorites' || userText.toLowerCase() === 'favorite' || userText.toLowerCase() === 'fav') {
            recordSystemLog('常用輪播', userId, userText, '', '回傳常用餐點與補水快捷輪播卡片');
            const favCarousel = generateFavoritesCarouselFlex(userId, LIFF_ID, userGistId, props);
            replyFlexMessage(replyToken, favCarousel, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 📋 常用餐點管理面板 (例如: "常用管理", "管理常用", "常用庫管理")
          if (
            userText === '常用管理' || 
            userText === '管理常用' || 
            userText === '常用庫管理' || 
            userText === '管理常用庫' || 
            userText === '常用清單管理' ||
            userText.toLowerCase() === 'manage fav' ||
            userText.toLowerCase() === 'manage favorites' ||
            userText.toLowerCase() === 'fav manager'
          ) {
            recordSystemLog('常用管理', userId, userText, '', '回傳常用餐點管理面板卡片');
            const mgmtFavFlex = generateManageFavoritesFlex(userId, LIFF_ID, userGistId, props, userLang);
            replyFlexMessage(replyToken, mgmtFavFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // ⭐ 新增或調整常用餐點 (例如: "加常用 拿鐵 150卡 8蛋 350水", "改常用 拿鐵 180卡 10蛋", "調整常用 ...")
          if (
            userText.startsWith('加常用') || 
            userText.startsWith('新增常用') || 
            userText.startsWith('加入常用') || 
            userText.startsWith('收藏常用') || 
            userText.startsWith('改常用') || 
            userText.startsWith('調整常用') || 
            userText.startsWith('修改常用') || 
            userText.startsWith('編輯常用') || 
            userText.toLowerCase().startsWith('add fav') ||
            userText.toLowerCase().startsWith('edit fav') ||
            userText.toLowerCase().startsWith('update fav')
          ) {
            const isEdit = userText.startsWith('改') || userText.startsWith('調') || userText.startsWith('編') || userText.startsWith('修') || userText.toLowerCase().startsWith('edit') || userText.toLowerCase().startsWith('update');
            const cleanStr = userText.replace(/^(?:加常用|新增常用|加入常用|收藏常用|改常用|調整常用|修改常用|編輯常用|add\s*fav(?:orite)?|edit\s*fav(?:orite)?|update\s*fav(?:orite)?)\s*/i, '').trim();

            let calories = 0;
            let protein = 0;
            let water = 0;

            // 1. 卡路里: e.g. 150卡, 150kcal, 熱量150
            const calMatch = cleanStr.match(/熱量\s*[:：]?\s*(\d+)/i) || cleanStr.match(/(\d+)\s*(?:kcal|cal|大卡|卡)/i);
            if (calMatch) calories = Number(calMatch[1]);

            // 2. 蛋白質: e.g. 蛋白質1.2, 蛋白質: 8, 8g, 8克, 8蛋
            const proMatch = cleanStr.match(/蛋白質\s*[:：]?\s*(\d+(?:\.\d+)?)/i) || cleanStr.match(/(\d+(?:\.\d+)?)\s*(?:g|克|蛋|pro(?:tein)?)/i);
            if (proMatch) protein = Number(proMatch[1]);

            // 3. 水分: e.g. 水分50, 350ml, 350cc, 350水
            const watMatch = cleanStr.match(/(?:水分|飲水|水)\s*[:：]?\s*(\d+)/i) || cleanStr.match(/(\d+)\s*(?:ml|cc|水|水分|wat(?:er)?)/i);
            if (watMatch) water = Number(watMatch[1]);

            // 4. 清理數值與單位，取得乾淨餐點名稱（防止「蛋」、「水」殘留粘在名稱上）
            let dishName = cleanStr
              .replace(/熱量\s*[:：]?\s*\d+\s*(?:kcal|cal|大卡|卡)?/gi, '')
              .replace(/(\d+)\s*(?:kcal|cal|大卡|卡)/gi, '')
              .replace(/蛋白質\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:g|克|蛋)?/gi, '')
              .replace(/(\d+(?:\.\d+)?)\s*(?:g|克|蛋|pro(?:tein)?)/gi, '')
              .replace(/(?:水分|飲水|水)\s*[:：]?\s*\d+\s*(?:ml|cc)?/gi, '')
              .replace(/(\d+)\s*(?:ml|cc|水|水分|wat(?:er)?)/gi, '')
              .replace(/[,\/，、|]+/g, ' ')
              .trim();

            dishName = dishName.replace(/\s+(?:卡|蛋|水|克|g|ml|cc)\s*$/gi, '').replace(/\s*蛋\s*水$/gi, '').trim() || (isEn ? 'Favorite Meal' : '常用餐點');

            const favItem = {
              id: Date.now(),
              dish_name: dishName,
              calories: calories,
              protein: protein,
              water: water
            };

            recordSystemLog(isEdit ? '調整常用' : '文字加常用', userId, userText, `${favItem.dish_name} (${favItem.calories}卡 / ${favItem.protein}g蛋 / ${favItem.water}ml水)`, `回傳常用收藏卡片：【${favItem.dish_name}】(${favItem.calories} kcal) ${isEdit ? '已成功調整數值' : '已加入常用庫'}`);
            saveUserFavorite(userId, favItem, userGistId, GITHUB_PAT, props);
            const favAddedFlex = generateFavoriteAddedFlex(favItem, LIFF_ID, userGistId, userLang, isEdit);
            replyFlexMessage(replyToken, favAddedFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🗑️ 文字指令：刪除/移除常用餐點 (例如: "刪除常用 美式咖啡" 或單純輸入 "刪除常用")
          if (
            userText.startsWith('刪除常用') || 
            userText.startsWith('移除常用') || 
            userText.startsWith('丟棄常用') || 
            userText.toLowerCase().startsWith('del fav') || 
            userText.toLowerCase().startsWith('delete fav') ||
            userText.toLowerCase().startsWith('remove fav')
          ) {
            const targetName = userText.replace(/^(?:刪除常用|移除常用|丟棄常用|del\s*fav(?:orite)?|delete\s*fav(?:orite)?|remove\s*fav(?:orite)?)\s*/i, '').trim();
            if (targetName) {
              recordSystemLog('文字移除常用', userId, userText, targetName, `回傳常用輪播：已自常用庫移除「${targetName}」`);
              deleteUserFavorite(userId, targetName, userGistId, GITHUB_PAT, props);
              const favListFlex = generateFavoritesCarouselFlex(userId, LIFF_ID, userGistId, props);
              replyFlexMessage(replyToken, favListFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            } else {
              recordSystemLog('常用管理', userId, userText, '', '回傳常用餐點管理面板供點擊刪除');
              const mgmtFavFlex = generateManageFavoritesFlex(userId, LIFF_ID, userGistId, props, userLang);
              replyFlexMessage(replyToken, mgmtFavFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // ↕️ 文字指令：常用餐點換順序 (例如: "常用置頂 拿鐵", "常用上移 拿鐵", "常用下移 拿鐵", "置頂常用 拿鐵")
          if (
            userText.startsWith('常用置頂') || userText.startsWith('置頂常用') ||
            userText.startsWith('常用上移') || userText.startsWith('上移常用') ||
            userText.startsWith('常用下移') || userText.startsWith('下移常用') ||
            userText.startsWith('常用前移') || userText.startsWith('常用後移')
          ) {
            let dir = 'top';
            if (userText.includes('上移') || userText.includes('前移')) dir = 'up';
            else if (userText.includes('下移') || userText.includes('後移')) dir = 'down';
            else if (userText.includes('置頂')) dir = 'top';

            const targetName = userText.replace(/^(?:常用置頂|置頂常用|常用上移|上移常用|常用下移|下移常用|常用前移|常用後移)\s*/i, '').trim();
            if (targetName) {
              reorderUserFavorites(userId, targetName, dir, userGistId, GITHUB_PAT, props);
              recordSystemLog('常用換順序', userId, `${targetName} (${dir})`, '', `已將「${targetName}」常用順序調整 (${dir})`);
              const mgmtFavFlex = generateManageFavoritesFlex(userId, LIFF_ID, userGistId, props, userLang);
              replyFlexMessage(replyToken, mgmtFavFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // 🚨 徹底銷毀所有個人資料
          if (userText === '刪除所有資料' || userText === '清除所有資料' || userText === '銷毀所有資料' || userText === '刪除帳號' || userText === '重設資料' || userText === '清空全部') {
            const destroyFlex = generateClearConfirmFlex(LIFF_ID, userGistId, userLang);
            replyFlexMessage(replyToken, destroyFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🗑️ 刪除最後一筆 / 刪除指定餐點
          if (userText === '刪除最後一筆' || userText === '刪除上一筆' || userText === '刪除最後' || userText === '復原' || userText === '撤銷' || userText === '刪除' || userText.toLowerCase() === 'undo' || userText.toLowerCase() === 'delete last') {
            const deleted = deleteMealLog(userId, 'last', userGistId, GITHUB_PAT, props);
            const noLogMsg = isEn ? "🐼 No meal logs recorded today to delete!" : "🐼 今天目前沒有任何飲食紀錄可以刪除喔！";
            recordSystemLog('文字刪除', userId, userText, '', deleted ? '回傳今日總結卡片 (已刪除最後一筆紀錄)' : `回傳提示：${noLogMsg}`);
            if (deleted) {
              const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
              replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            } else {
              replyTextMessage(replyToken, noLogMsg, CHANNEL_ACCESS_TOKEN, userId, props);
            }
            continue;
          }

          if (userText.startsWith('刪除') || userText.startsWith('移除') || userText.toLowerCase().startsWith('delete')) {
            const targetName = userText.replace(/^(?:刪除|移除|delete)\s*/i, '').trim();
            if (targetName) {
              const deleted = deleteMealLog(userId, targetName, userGistId, GITHUB_PAT, props);
              const notFoundMsg = isEn ? `🐼 Cannot find any meal log named "${targetName}" today.` : `🐼 找不到今日名稱為「${targetName}」的餐點紀錄。`;
              recordSystemLog('文字刪除', userId, userText, `目標: ${targetName}`, deleted ? `回傳今日總結卡片 (已刪除「${targetName}」)` : `回傳提示：${notFoundMsg}`);
              if (deleted) {
                const summaryFlex = generateDailySummaryFlex(userId, null, LIFF_ID, userGistId, props);
                replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              } else {
                replyTextMessage(replyToken, notFoundMsg, CHANNEL_ACCESS_TOKEN, userId, props);
              }
              continue;
            }
          }

          // 🎯 1. 查看目前飲食目標 (例如: "目標", "我的目標", "查看目標", "目前目標", "goals")
          if (userText === '目標' || userText === '我的目標' || userText === '查看目標' || userText === '目前目標' || userText === '每日目標' || userText.toLowerCase() === 'goals' || userText.toLowerCase() === 'goal') {
            const goals = getUserGoals(userId, props, userGistId);
            recordSystemLog('查看目標', userId, userText, `${goals.calories}卡 / ${goals.protein}g蛋 / ${goals.water}ml水`, `回傳目標卡片：每日熱量 ${goals.calories} kcal · 蛋白質 ${goals.protein}g · 水分 ${goals.water}ml`);
            const goalFlex = generateCurrentGoalFlex(userId, goals, LIFF_ID, userGistId, userLang);
            replyFlexMessage(replyToken, goalFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // ⏰ 1.5 查看/設定進食窗口 (例如: "進食窗口", "進食時間", "斷食", "斷食時間", "斷食時段", "窗口", "fasting")
          if (
            userText === '進食窗口' || 
            userText === '進食時間' || 
            userText === '斷食' || 
            userText === '斷食時間' || 
            userText === '斷食時段' || 
            userText === '窗口' || 
            userText.toLowerCase() === 'fasting' || 
            userText.toLowerCase() === 'fasting window' ||
            userText.toLowerCase() === 'eating window'
          ) {
            const goals = getUserGoals(userId, props, userGistId);
            const isOutside = goals.fasting_enabled ? isOutsideEatingWindow(new Date(), goals.fasting_start, goals.fasting_end) : false;
            let statusText = '';
            if (isEn) {
              statusText = goals.fasting_enabled 
                ? `⏰ Eating Window Status (16:8 Fasting):\n\n` +
                  `• Status: Enabled ✅\n` +
                  `• Eating Window: ${goals.fasting_start} ~ ${goals.fasting_end}\n` +
                  `• Current: ${isOutside ? '⏳ FASTING (Outside window)' : '🍽️ EATING (Inside window)'}\n\n` +
                  `💡 Tip: To adjust times, open "Settings" in the Web App — changes sync to LINE automatically!`
                : `⏰ Eating Window Status:\n\n` +
                  `• Status: Disabled ⚪\n` +
                  `• Recommended: 12:00 ~ 20:00 (16:8)\n\n` +
                  `💡 Tip: Open "Settings" in the Web App to enable Eating Window and track fasting intervals!`;
            } else {
              statusText = goals.fasting_enabled 
                ? `⏰ 16:8 進食窗口狀態：\n\n` +
                  `• 功能狀態：已開啟 ✅\n` +
                  `• 進食窗口：${goals.fasting_start} ~ ${goals.fasting_end}\n` +
                  `• 當前狀態：${isOutside ? '⏳ 斷食中 (非進食時段)' : '🍽️ 進食中 (進食時段內)'}\n\n` +
                  `💡 提示：如需調整進食時段或開關，點擊「⚙️ 設定」前往 Web 端調整，將自動即時同步至 LINE！`
                : `⏰ 16:8 進食窗口狀態：\n\n` +
                  `• 功能狀態：未開啟 ⚪\n` +
                  `• 建議時段：12:00 ~ 20:00 (16:8 輕斷食)\n\n` +
                  `💡 提示：點擊「⚙️ 設定」即可開啟進食窗口模式，享有斷食狀態提醒！`;
            }
            recordSystemLog('查詢進食窗口', userId, userText, `${goals.fasting_enabled ? '已開啟' : '未開啟'} (${goals.fasting_start}~${goals.fasting_end})`, `回傳進食窗口狀態提示`);
            replyTextMessage(replyToken, statusText, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🎯 2. 設定目標導引
          const isGoalGuideRequest = userText === '設定目標' ||
            userText === '改目標' ||
            userText === '修改目標' ||
            userText === '調整目標' ||
            userText === '目標設定' ||
            userText === '推薦目標' ||
            userText === '目標推薦' ||
            userText === '智能目標' ||
            userText === '體態目標' ||
            userText === '如何設定目標' ||
            userText.toLowerCase() === 'set goal' ||
            ((userText.startsWith('改目標') || userText.startsWith('設定目標') || userText.startsWith('修改目標')) && !/\d+/.test(userText));

          if (isGoalGuideRequest) {
            recordSystemLog('目標推薦導引', userId, userText, '', '回傳 AI 體態目標推薦導引卡片');
            const guideFlex = generateGoalGuideFlex(userId, LIFF_ID, userGistId, userLang);
            replyFlexMessage(replyToken, guideFlex, CHANNEL_ACCESS_TOKEN, userId, props);
            continue;
          }

          // 🎯 3. 設定/修改體態目標與客製化建議
          const isGoalUpdate = userText.startsWith('改目標') ||
            userText.startsWith('設定目標') ||
            userText.startsWith('修改目標') ||
            userText.startsWith('調整目標') ||
            userText.toLowerCase().startsWith('set goal') ||
            (userText.includes('目標') && (userText.includes('減脂') || userText.includes('增肌') || userText.includes('減重') || userText.includes('維持') || userText.includes('卡') || userText.includes('kcal'))) ||
            ((userText.includes('身高') || userText.includes('體重') || userText.toLowerCase().includes('cm') || userText.toLowerCase().includes('kg')) && (userText.includes('減脂') || userText.includes('增肌') || userText.includes('減重') || userText.includes('維持') || userText.includes('建議')));

          if (isGoalUpdate) {
            sendLineLoadingAnimation(userId, CHANNEL_ACCESS_TOKEN, 15);
            recordSystemLog('體態目標', userId, userText, '計算BMR/TDEE中', '正在呼叫 AI 計算體態目標與個人化教練建議');
            handleGoalSettingWithAI(replyToken, userId, userText, userGistId, GITHUB_PAT, props, LIFF_ID, CHANNEL_ACCESS_TOKEN, GEMINI_API_KEY, userLang);
            continue;
          }

          // 🔢 整份倍數調整 (支援: 兩倍, 雙倍, 一半, 半份, 吃一半, 整份兩倍, 0.5x, 1.5倍, 改 2倍, double, half, x0.5 等)
          let detectedMultiplier = null;
          const cleanText = userText.trim().toLowerCase();
          
          if (/^(?:change\s+)?(?:to\s+)?(half|0\.5x|x0\.5)(?:\s+portion)?$/i.test(cleanText) ||
              /^(?:改|修改|改成|吃)?\s*(?:整份)?(一半|半份|0\.5倍)(?:份量)?$/.test(userText)) {
            detectedMultiplier = 0.5;
          } else if (/^(?:change\s+)?(?:to\s+)?(double|2x|x2)(?:\s+portion)?$/i.test(cleanText) ||
              /^(?:改|修改|改成|吃)?\s*(?:整份)?(兩倍|双倍|雙倍|二倍|大份|加大|2倍)(?:份量)?$/.test(userText)) {
            detectedMultiplier = 2.0;
          } else if (/^(?:change\s+)?(?:to\s+)?(1\.5x|x1\.5)(?:\s+portion)?$/i.test(cleanText) ||
              /^(?:改|修改|改成)?\s*(?:整份)?1\.5倍(?:份量)?$/.test(userText)) {
            detectedMultiplier = 1.5;
          } else if (/^(?:change\s+)?(?:to\s+)?(1x|1\.0x|normal)(?:\s+portion)?$/i.test(cleanText) ||
              /^(?:改|修改|改成)?\s*(?:整份)?(?:1倍|1\.0倍|原份|正常|原份量)$/.test(userText)) {
            detectedMultiplier = 1.0;
          } else {
            const numMatch = userText.match(/^(?:改|修改|改成|change)?\s*(?:to\s+)?(?:x|X)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:倍|x|X)?(?:的)?(?:份量)?$/i);
            if (numMatch && numMatch[1]) {
              const parsedVal = parseFloat(numMatch[1]);
              const hasKeyword = /倍|x|X|改|change/i.test(userText);
              if (!isNaN(parsedVal) && parsedVal >= 0.1 && parsedVal <= 10 && (hasKeyword || userText.length <= 4)) {
                detectedMultiplier = parsedVal;
              }
            }
          }

          if (detectedMultiplier !== null) {
            const m = detectedMultiplier;
            const todayStr = getTodayDateString();
            const logs = getTodayLogs(userId, todayStr, props, userGistId);
            if (logs.length > 0) {
              const lastMeal = logs[logs.length - 1];
              const baseCal = Number(lastMeal.baseCalories) || Number(lastMeal.calories) || 0;
              const basePro = (lastMeal.baseProtein !== undefined && !isNaN(Number(lastMeal.baseProtein))) ? Number(lastMeal.baseProtein) : (Number(lastMeal.protein) || 0);
              const baseCarb = (lastMeal.baseCarbs !== undefined && !isNaN(Number(lastMeal.baseCarbs))) ? Number(lastMeal.baseCarbs) : (Number(lastMeal.carbs) || 0);
              const baseFat = (lastMeal.baseFat !== undefined && !isNaN(Number(lastMeal.baseFat))) ? Number(lastMeal.baseFat) : (Number(lastMeal.fat) || 0);
              const baseWat = (lastMeal.baseWater !== undefined && !isNaN(Number(lastMeal.baseWater))) ? Number(lastMeal.baseWater) : (Number(lastMeal.water) || 0);
              const baseName = (lastMeal.baseDishName || lastMeal.dish_name || (isEn ? 'Meal' : '餐點'))
                .replace(/^[0-9]+(?:\.[0-9]+)?(?:倍的|x\s*)/i, '')
                .replace(/\s*\(.*倍.*份量\)/g, '')
                .trim();

              const newCal = Math.round(baseCal * m);
              const newPro = Number((basePro * m).toFixed(1));
              const newCarb = Number((baseCarb * m).toFixed(1));
              const newFat = Number((baseFat * m).toFixed(1));
              const newWat = Math.round(baseWat * m);
              const newName = m === 1 ? baseName : (isEn ? `${m}x ${baseName}` : `${m}倍的${baseName}`);

              const baseBreakdown = (lastMeal.baseBreakdown && Array.isArray(lastMeal.baseBreakdown) && lastMeal.baseBreakdown.length > 0)
                ? lastMeal.baseBreakdown
                : (lastMeal.breakdown && Array.isArray(lastMeal.breakdown) ? lastMeal.breakdown : []);

              const scaledBreakdown = baseBreakdown.map(item => ({
                ...item,
                calories: Math.round((item.calories || 0) * m),
                protein: Number(((item.protein || 0) * m).toFixed(1))
              }));

              const updateFields = {
                id: lastMeal.id,
                dish_name: newName,
                calories: newCal,
                protein: newPro,
                carbs: newCarb,
                fat: newFat,
                water: newWat,
                breakdown: scaledBreakdown.length > 0 ? scaledBreakdown : lastMeal.breakdown,
                baseBreakdown: baseBreakdown.length > 0 ? baseBreakdown : undefined,
                comment: (lastMeal.comment ? lastMeal.comment.replace(/\s*\(.*倍.*份量\)/g, '').replace(/\s*\(.*x portion\)/gi, '') : '') + (m === 1 ? '' : (isEn ? ` (${m}x portion)` : ` (${m}倍份量)`)),
                baseDishName: baseName,
                baseCalories: baseCal,
                baseProtein: basePro,
                baseCarbs: baseCarb,
                baseFat: baseFat,
                baseWater: baseWat,
                multiplier: m
              };

              const updatedMeal = updateOrSaveMealLog(userId, updateFields, userGistId, GITHUB_PAT, props);
              recordSystemLog('文字倍數調整', userId, userText, `${newName} (${newCal}卡 / ${newPro}g蛋)`, `回傳調整卡片：【${newName}】${newCal} kcal · ${newPro}g 蛋 (${m}倍份量)`);
              replyMealConfirmCard(replyToken, updatedMeal, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          // ✏️ 直接文字修改餐點數值 (例如: "改 600卡 30蛋 500水" 或 "Change 600cal 30pro")
          if (userText.startsWith('改') || userText.startsWith('修改') || userText.startsWith('改成') || userText.toLowerCase().startsWith('change')) {
            const isHalveCarbs = userText.includes('碳水減半') || userText.includes('飯減半') || userText.includes('飯吃一半') || userText.includes('半碗飯');

            const calMatch = userText.match(/(\d+)\s*(?:kcal|cal|卡|大卡)/i) || (userText.includes('熱量') ? userText.match(/熱量\s*(\d+)/i) : null);
            const proMatch = userText.match(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:蛋|蛋白質|pro(?:tein)?)/i) || (userText.includes('蛋白質') ? userText.match(/蛋白質\s*(\d+(?:\.\d+)?)/i) : null);
            const carbsMatch = userText.match(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:碳|碳水|醣|carb(?:s)?)/i) || (userText.includes('碳水') ? userText.match(/碳水\s*(\d+(?:\.\d+)?)/i) : null);
            const fatMatch = userText.match(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:脂|脂肪|油|fat)/i) || (userText.includes('脂肪') ? userText.match(/脂肪\s*(\d+(?:\.\d+)?)/i) : null);
            const watMatch = userText.match(/(\d+)\s*(?:ml|cc|水|水分|wat(?:er)?)/i) || (userText.includes('水分') ? userText.match(/水分\s*(\d+)/i) : null);

            let cleanName = userText.replace(/^(?:改|修改|改成|change)\s*/i, '')
              .replace(/碳水減半|飯減半|飯吃一半|半碗飯/g, '')
              .replace(/(\d+)\s*(?:kcal|cal|卡|大卡)/gi, '')
              .replace(/(?:熱量)?\s*(\d+)\s*(?:kcal|cal|卡|大卡)?/gi, '')
              .replace(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:蛋|蛋白質|pro(?:tein)?)/gi, '')
              .replace(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:碳|碳水|醣|carb(?:s)?)/gi, '')
              .replace(/(\d+(?:\.\d+)?)\s*(?:g|克)?\s*(?:脂|脂肪|油|fat)/gi, '')
              .replace(/(\d+)\s*(?:ml|cc|水|水分|wat(?:er)?)/gi, '')
              .trim();

            const updateFields = {};
            if (cleanName && cleanName !== '熱量' && cleanName !== '蛋白質' && cleanName !== '水分' && cleanName !== '碳水' && cleanName !== '脂肪') {
              updateFields.dish_name = cleanName;
            }
            if (calMatch) updateFields.calories = Number(calMatch[1]);
            if (proMatch) updateFields.protein = Number(proMatch[1]);
            if (carbsMatch) updateFields.carbs = Number(carbsMatch[1]);
            if (fatMatch) updateFields.fat = Number(fatMatch[1]);
            if (watMatch) updateFields.water = Number(watMatch[1]);

            if (isHalveCarbs) {
              const logs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
              if (logs.length > 0) {
                const lastMeal = logs[logs.length - 1];
                const oldCarbs = Number(lastMeal.carbs) || 60;
                const newCarbs = Math.round(oldCarbs / 2);
                updateFields.carbs = newCarbs;
                const savedCals = (oldCarbs - newCarbs) * 4;
                if (!calMatch) {
                  updateFields.calories = Math.max(0, (Number(lastMeal.calories) || 0) - savedCals);
                }
                updateFields.comment = (lastMeal.comment || '') + (isEn ? ' (🍚 Halved rice / -50% carbs)' : ' (🍚 飯/碳水已減半 -50%)');
              }
            } else if (!calMatch && (carbsMatch || fatMatch || proMatch)) {
              const logs = getTodayLogs(userId, getTodayDateString(), props, userGistId);
              if (logs.length > 0) {
                const lastMeal = logs[logs.length - 1];
                const p = updateFields.protein !== undefined ? updateFields.protein : (Number(lastMeal.protein) || 0);
                const c = updateFields.carbs !== undefined ? updateFields.carbs : (Number(lastMeal.carbs) || 0);
                const f = updateFields.fat !== undefined ? updateFields.fat : (Number(lastMeal.fat) || 0);
                if (c > 0 || f > 0 || p > 0) {
                  updateFields.calories = Math.round(p * 4 + c * 4 + f * 9);
                }
              }
            }

            if (Object.keys(updateFields).length > 0) {
              const updatedMeal = updateOrSaveMealLog(userId, updateFields, userGistId, GITHUB_PAT, props);
              recordSystemLog('修改數值', userId, userText, `${updatedMeal.dish_name} (${updatedMeal.calories}卡 / ${updatedMeal.protein}g蛋 / ${updatedMeal.carbs || 0}g碳)`, `回傳今日總結卡片：已更新【${updatedMeal.dish_name}】數值`);
              const summaryFlex = generateDailySummaryFlex(userId, updatedMeal, LIFF_ID, userGistId, props);
              replyFlexMessage(replyToken, summaryFlex, CHANNEL_ACCESS_TOKEN, userId, props);
              continue;
            }
          }

          sendLineLoadingAnimation(userId, CHANNEL_ACCESS_TOKEN, 15);

          // 📅 歷史日期補記前綴解析 (支援: 補記 2026-09-07 牛肉麵 / 補記 9/7 牛肉麵 / 補記 昨天 雞胸便當 / 昨天 牛肉麵 600卡)
          let targetMealDate = getTodayDateString();
          let cleanFoodInput = userText;

          const yesterdayStr = Utilities.formatDate(new Date(Date.now() - 86400000), "Asia/Taipei", "yyyy-MM-dd");
          const dayBeforeYesterdayStr = Utilities.formatDate(new Date(Date.now() - 86400000 * 2), "Asia/Taipei", "yyyy-MM-dd");

          if (/^(?:補記|補錄|記錄|新增)?\s*昨天\s+/i.test(userText)) {
            targetMealDate = yesterdayStr;
            cleanFoodInput = userText.replace(/^(?:補記|補錄|記錄|新增)?\s*昨天\s+/i, '').trim();
          } else if (/^(?:補記|補錄|記錄|新增)?\s*前天\s+/i.test(userText)) {
            targetMealDate = dayBeforeYesterdayStr;
            cleanFoodInput = userText.replace(/^(?:補記|補錄|記錄|新增)?\s*前天\s+/i, '').trim();
          } else {
            const fullDateMatch = userText.match(/^(?:補記|補錄|記錄|新增)?\s*(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?\s+(.+)$/i);
            const shortDateMatch = userText.match(/^(?:補記|補錄|記錄|新增)?\s*(\d{1,2})[-/.月](\d{1,2})日?\s+(.+)$/i);
            if (fullDateMatch) {
              const y = fullDateMatch[1];
              const m = String(fullDateMatch[2]).padStart(2, '0');
              const d = String(fullDateMatch[3]).padStart(2, '0');
              targetMealDate = `${y}-${m}-${d}`;
              cleanFoodInput = fullDateMatch[4].trim();
            } else if (shortDateMatch) {
              const nowY = new Date().getFullYear();
              const m = String(shortDateMatch[1]).padStart(2, '0');
              const d = String(shortDateMatch[2]).padStart(2, '0');
              targetMealDate = `${nowY}-${m}-${d}`;
              cleanFoodInput = shortDateMatch[3].trim();
            }
          }

          const analysis = parseTextWithGemini(cleanFoodInput || userText, GEMINI_API_KEY, userId, props, userGistId, GITHUB_PAT);
          const usedModel = analysis.model_used || 'Gemini';
          const fallbackNote = (analysis.failed_attempts && analysis.failed_attempts.length > 0)
            ? ` (前序 ${analysis.failed_attempts.length} 次重試)`
            : '';

          if (analysis.is_food === false) {
            const defaultReply = isEn 
              ? "Hello! I am your AI Panda Nutrition Coach 🐼. Send me a meal photo or type a food name anytime, and I'll calculate calories and nutrients for you!"
              : "哈囉！我是您的 AI 熊貓飲食教練 🐼，隨時傳送餐點照片或輸入食物名稱，我來幫您計算熱量與記錄！";
            let finalReply = analysis.reply || defaultReply;
            if (isEn && /[\u4e00-\u9fa5]/.test(finalReply)) {
              finalReply = defaultReply;
            }
            if (event._isAudioInput) {
              finalReply = `🎙️ 聽到了：「${event._rawAudioText}」\n\n${finalReply}`;
            }
            recordSystemLog(event._isAudioInput ? '語音對話' : '日常對話', userId, event._isAudioInput ? `🎙️ 語音: "${userText}"` : userText, `[${usedModel}${fallbackNote}] 非食物訊息`, `[模型: ${usedModel}] 回傳文字：${finalReply}`);
            replyTextMessage(replyToken, finalReply, CHANNEL_ACCESS_TOKEN, userId, props);
          } else {
            // ⏰ 檢查是否處於進食窗口之外 (斷食提醒)
            const userGoals = getUserGoals(userId, props, userGistId);
            if (userGoals.fasting_enabled && isOutsideEatingWindow(new Date(), userGoals.fasting_start, userGoals.fasting_end)) {
              const fastingNotice = isEn
                ? `\n\n⏰ Notice: You're outside your eating window (${userGoals.fasting_start}~${userGoals.fasting_end}). This meal broke your fast!`
                : `\n\n⏰ 提醒：目前為斷食時段（設定窗口 ${userGoals.fasting_start} ~ ${userGoals.fasting_end}），此餐已打破斷食喔！`;
              if (analysis.panda_comment) {
                analysis.panda_comment += fastingNotice;
              } else {
                analysis.panda_comment = fastingNotice.trim();
              }
            }

            const meal = {
              id: Date.now(),
              date: targetMealDate,
              time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }),
              dish_name: analysis.dish_name || (isEn ? 'Meal' : '美味餐點'),
              calories: Number(analysis.calories) || 0,
              protein: Number(analysis.protein) || 0,
              carbs: Number(analysis.carbs) || 0,
              fat: Number(analysis.fat) || 0,
              water: Number(analysis.water) || 0,
              breakdown: analysis.breakdown || [],
              calculation_note: analysis.calculation_note || '',
              comment: (event._isAudioInput && analysis.panda_comment)
                ? `🎙️「${event._rawAudioText}」\n${analysis.panda_comment}`
                : (analysis.panda_comment || ''),
              baseDishName: analysis.dish_name || (isEn ? 'Meal' : '美味餐點'),
              baseCalories: Number(analysis.calories) || 0,
              baseProtein: Number(analysis.protein) || 0,
              baseCarbs: Number(analysis.carbs) || 0,
              baseFat: Number(analysis.fat) || 0,
              baseWater: Number(analysis.water) || 0,
              multiplier: 1,
              model_used: usedModel
            };

            saveMealLog(userId, meal, userGistId, GITHUB_PAT, props);
            const isHistorical = targetMealDate !== getTodayDateString();
            const logType = event._isAudioInput ? '語音記餐' : (isHistorical ? '補記歷史' : '文字辨識');
            const logInput = event._isAudioInput ? `🎙️ 語音: "${userText}"` : userText;
            recordSystemLog(
              logType, 
              userId, 
              logInput, 
              `[${usedModel}${fallbackNote}] ${analysis.dish_name} (${analysis.calories}卡 / ${analysis.protein}g蛋 / ${analysis.water || 0}ml水)${isHistorical ? ' ➔ ' + targetMealDate : ''}`, 
              `[模型: ${usedModel}] 回傳確認卡片：【${analysis.dish_name}】${analysis.calories} kcal · ${analysis.protein}g 蛋 · ${analysis.carbs || 0}g 碳 · ${analysis.fat || 0}g 脂 (${targetMealDate})`
            );
            replyMealConfirmCard(replyToken, meal, LIFF_ID, userGistId, CHANNEL_ACCESS_TOKEN, userId, props);
          }
        }
      }
    }
  } catch (err) {
    console.error("處理請求時發生錯誤:", err);
    recordSystemLog('系統異常', currentUserId || 'system', err.message || err.toString(), '', '異常報警');
    
    sendErrorAlertToWeb3Forms({
      error: err,
      userId: currentUserId,
      operation: currentOperation,
      userInput: currentUserInput,
      source: 'LINE Bot / GAS doPost'
    });

    if (currentReplyToken && currentToken) {
      try {
        replyTextMessage(currentReplyToken, `⚠️ 熊貓教練提示 / Panda Coach Notice:\n\n${err.message || err.toString()}`, currentToken);
      } catch (replyErr) { }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================================
// 🚨 4. 系統異常與問題回報自動郵件通報模組
// ========================================================

/**
 * 📧 發送用戶問題回報通知 (優先使用 Google Apps Script 原生 MailApp 直送信箱，突破 Web3Forms 免費版伺服端限制)
 */
function sendBugReportNotification(params) {
  const { userId, userName, issueDetails, userLang, persona, userGistId, props } = params;
  const timeStr = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
  const isEn = (userLang === 'en');
  const isGeneric = (typeof isGenericUserId === 'function') ? isGenericUserId(userName) : (!userName || ['web_user', 'default_user', 'web_client'].includes(userName));
  const displayUserName = (!userName || isGeneric) ? '未具名訪客' : userName;
  const displayUserId = (!userId || (typeof isGenericUserId === 'function' ? isGenericUserId(userId) : false))
    ? '未登入/Web訪客'
    : (userId.startsWith('U') ? `LINE 用戶 (${userId.slice(-6)})` : userId.slice(-8));

  const subject = `[Daily-Diet LINE] ${isEn ? 'Bug Report' : '問題回報'} - ${displayUserName}`;

  const textBody = [
    `【Daily-Diet 熊貓教練 用戶問題與反饋回報】`,
    `========================================`,
    `⏰ 回報時間：${timeStr} (台灣時間 UTC+8)`,
    `👤 用戶暱稱：${displayUserName}`,
    `🆔 用戶標識：${displayUserId}`,
    `🌐 語言環境：${userLang || 'zh'}`,
    `🎭 教練性格：${persona || 'tsundere'}`,
    `📂 雲端備份：${userGistId ? '已建立專屬備份' : '未建立'}`,
    `========================================`,
    `📝 問題與建議內容：`,
    `${issueDetails}`,
    `========================================`,
    `本信件由 Daily-Diet 系統自動發送至開發團隊。`
  ].join('\n');

  let mailSuccess = false;
  let errorDetail = '';
  let targetEmailStr = '';

  // 1. Google Apps Script 原生 MailApp / GmailApp 直送信箱
  try {
    const candidateEmails = [
      props && props.getProperty('ADMIN_EMAIL'),
      props && props.getProperty('DEVELOPER_EMAIL'),
      (typeof DEFAULT_ADMIN_EMAIL !== 'undefined' && DEFAULT_ADMIN_EMAIL) || 'hi@winnie-lin.space'
    ];
    try {
      const effectiveUser = Session.getEffectiveUser().getEmail();
      if (effectiveUser && effectiveUser.includes('@')) {
        candidateEmails.push(effectiveUser);
      }
    } catch (e) {}

    const validEmails = [...new Set(candidateEmails.filter(Boolean))];
    if (validEmails.length > 0) {
      targetEmailStr = validEmails.join(',');
      try {
        MailApp.sendEmail({
          to: targetEmailStr,
          subject: subject,
          body: textBody
        });
        console.log(`📧 [MailApp] 已成功將問題回報寄送至開發者信箱: ${targetEmailStr}`);
        mailSuccess = true;
      } catch (mailErr) {
        console.warn(`⚠️ [MailApp] 失敗，嘗試 GmailApp 備援:`, mailErr);
        errorDetail = mailErr.message || String(mailErr);
        try {
          GmailApp.sendEmail(targetEmailStr, subject, textBody);
          console.log(`📧 [GmailApp] 已成功將問題回報寄送至開發者信箱: ${targetEmailStr}`);
          mailSuccess = true;
          errorDetail = '';
        } catch (gErr) {
          console.warn(`⚠️ [GmailApp] 亦失敗:`, gErr);
          errorDetail = `MailApp: ${errorDetail} | GmailApp: ${gErr.message || String(gErr)}`;
        }
      }
    }
  } catch (err) {
    errorDetail = err.message || String(err);
    console.warn(`⚠️ [郵件模組異常]:`, err);
  }

  // 2. 備援：嘗試 Web3Forms (若日後升級 Pro 或支援時亦可接收)
  try {
    const web3Res = UrlFetchApp.fetch('https://api.web3forms.com/submit', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        access_key: '72d7f10c-b6c8-42f2-9c40-fc5fac45cad0',
        subject: subject,
        message: textBody,
        from_name: `Daily Diet (${displayUserName})`,
        device: 'LINE Messaging API / Chat'
      }),
      muteHttpExceptions: true
    });
    const resCode = web3Res.getResponseCode();
    let resJson = {};
    try { resJson = JSON.parse(web3Res.getContentText()); } catch (pErr) {}
    if (resCode === 200 && resJson.success === true) {
      mailSuccess = true;
      console.log(`📧 [Web3Forms] 成功透過 Web3Forms 提交問題回報`);
    }
  } catch (web3Err) {
    console.warn('Web3Forms 提交失敗 (免費版限制伺服端呼叫):', web3Err);
  }

  return {
    success: mailSuccess,
    error: errorDetail,
    recipients: targetEmailStr
  };
}

/**
 * 👑 向系統管理員之 LINE 個人帳號即時發送推播通知卡片 (免開信箱、免被去重，0 秒掌握)
 */
function notifyAdminViaLine(params) {
  const { reporterName, reporterId, content, userLang, props, accessToken } = params;
  try {
    const adminSuffix = (typeof MASTER_ADMIN_LINE_SUFFIX !== 'undefined' && MASTER_ADMIN_LINE_SUFFIX) || '497c66';
    const adminLineId = (props && props.getProperty('ADMIN_LINE_USER_ID')) || '';
    if (!adminLineId || !adminLineId.endsWith(adminSuffix) || !accessToken) {
      console.log('ℹ️ ADMIN_LINE_USER_ID 非授權管理員或未設定，略過 LINE 管理員推播');
      return;
    }

    const timeStr = Utilities.formatDate(new Date(), "Asia/Taipei", "HH:mm:ss");
    const adminFlex = {
      type: "flex",
      altText: `🚨 [用戶問題回報] ${reporterName}: ${content.slice(0, 30)}`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#18181B",
          paddingAll: "14px",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "🚨 用戶問題與意見回報",
                  weight: "bold",
                  size: "sm",
                  color: "#FDE047",
                  flex: 1
                },
                {
                  type: "text",
                  text: timeStr,
                  size: "xxs",
                  color: "#A1A1AA",
                  align: "end"
                }
              ]
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "14px",
          contents: [
            {
              type: "box",
              layout: "vertical",
              spacing: "xs",
              contents: [
                {
                  type: "text",
                  text: `👤 回報用戶：${reporterName} (${reporterId ? reporterId.slice(-6) : '未知'})`,
                  size: "xs",
                  weight: "bold",
                  color: "#27272A"
                },
                {
                  type: "text",
                  text: `🌐 用戶語言：${userLang || 'zh'}`,
                  size: "xxs",
                  color: "#71717A"
                }
              ]
            },
            {
              type: "box",
              layout: "vertical",
              backgroundColor: "#FEF2F2",
              borderColor: "#FECACA",
              borderWidth: "1.5px",
              cornerRadius: "8px",
              paddingAll: "10px",
              contents: [
                {
                  type: "text",
                  text: "📝 回報內容：",
                  size: "xxs",
                  color: "#991B1B",
                  weight: "bold"
                },
                {
                  type: "text",
                  text: content,
                  size: "xs",
                  color: "#18181B",
                  weight: "bold",
                  wrap: true,
                  margin: "xs"
                }
              ]
            }
          ]
        }
      }
    };

    pushFlexMessage(adminLineId, adminFlex, accessToken, props);
    console.log(`📱 [LINE 推播] 成功發送回報通知至管理員 LINE (${adminLineId.slice(-6)})`);
  } catch (err) {
    console.warn('⚠️ [LINE 管理員推播失敗]:', err);
  }
}

function sendErrorAlertToWeb3Forms(info) {
  try {
    const props = PropertiesService.getScriptProperties();
    const timeStr = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
    const channelToken = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');

    const error = info.error || {};
    const errMessage = error.message || error.toString() || '未知異常';
    const errStack = error.stack || (typeof error === 'object' ? JSON.stringify(error) : '');
    const userId = info.userId || 'system';

    const errSignature = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, `${userId}_${errMessage}`));
    const lastAlertKey = `LAST_ALERT_${errSignature.slice(0, 20)}`;
    const lastAlertTime = Number(props.getProperty(lastAlertKey) || 0);
    const nowMs = Date.now();
    if (nowMs - lastAlertTime < 60000) {
      console.log(`⏳ 60秒內已通報過相同異常，略過發送: ${errMessage}`);
      return;
    }
    props.setProperty(lastAlertKey, String(nowMs));

    let userName = '未知用戶';
    if (userId && userId !== 'system' && userId !== 'default_user' && userId !== 'web_user') {
      userName = getUserDisplayName(userId, channelToken, props) || `LINE用戶 (${userId.slice(-6)})`;
    } else {
      userName = info.userName || '系統背景 / Web訪客';
    }

    const operation = info.operation || '未記錄之操作';
    const userInput = info.userInput || info.userText || '無輸入內容';
    const source = info.source || 'Daily-Diet 伺服端';

    const subject = `🚨 [Daily-Diet 系統異常] ${userName} | ${errMessage.slice(0, 40)}`;

    const maskedUserId = (!userId || userId === 'system' || userId === 'default_user' || userId === 'web_user')
      ? '系統/Web訪客'
      : (userId.startsWith('U') ? `LINE用戶 (#${userId.slice(-6)})` : `訪客 (#${userId.slice(-6)})`);

    const cleanUserInput = String(userInput).replace(/([?&](?:token|pass|password|key|adminKey|secret)=)[^&\s]+/gi, '$1***REDACTED***');

    const messageContent = [
      `🚨 【Daily-Diet 熊貓教練系統異常自動通報】`,
      `----------------------------------------`,
      `⏰ 發生時間：${timeStr} (台灣時間 GMT+8)`,
      `👤 相關用戶：${userName}`,
      `🆔 用戶識別碼：${maskedUserId}`,
      `🕹️ 執行操作：${operation}`,
      `💬 用戶輸入內容：${cleanUserInput}`,
      `🌐 觸發來源：${source}`,
      `----------------------------------------`,
      `❌ 錯誤訊息：`,
      `${errMessage}`,
      errStack ? `\n📜 呼叫堆疊 (Stack Trace)：\n${errStack}` : ''
    ].join('\n');

    // 1. Google 原生 MailApp 直送開發者信箱
    try {
      const candidateEmails = [
        props && props.getProperty('ADMIN_EMAIL'),
        props && props.getProperty('DEVELOPER_EMAIL'),
        (typeof DEFAULT_ADMIN_EMAIL !== 'undefined' && DEFAULT_ADMIN_EMAIL) || 'hi@winnie-lin.space'
      ];
      try {
        const effectiveUser = Session.getEffectiveUser().getEmail();
        if (effectiveUser && effectiveUser.includes('@')) candidateEmails.push(effectiveUser);
      } catch (e) {}
      const validEmails = [...new Set(candidateEmails.filter(Boolean))];
      if (validEmails.length > 0) {
        MailApp.sendEmail({
          to: validEmails.join(','),
          subject: subject,
          body: messageContent
        });
        console.log(`📧 [MailApp] 成功寄送異常報告至開發者信箱: ${validEmails.join(',')}`);
      }
    } catch (mailErr) {
      console.warn("⚠️ [MailApp] 發送異常郵件失敗:", mailErr);
    }

    // 2. Web3Forms 備援
    try {
      UrlFetchApp.fetch('https://api.web3forms.com/submit', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          access_key: '72d7f10c-b6c8-42f2-9c40-fc5fac45cad0',
          subject: subject,
          from_name: '🐼 Daily-Diet 異常監控小幫手',
          time: timeStr,
          user_name: userName,
          user_id: maskedUserId,
          operation: operation,
          error_message: errMessage,
          message: messageContent
        }),
        muteHttpExceptions: true
      });
    } catch (alertErr) {
      console.warn("⚠️ 發送 Web3Forms 錯誤回報失敗:", alertErr);
    }
  } catch (err) {
    console.warn("⚠️ 處理異常通報失敗:", err);
  }
}


/**
 * 🛡️ 發送維護者登入安全通知 (呈現為後台安全驗證審核通知，不作為系統異常)
 */
function sendMaintainerLoginNotification(info) {
  try {
    const props = PropertiesService.getScriptProperties();
    const timeStr = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
    const userName = info.userName || '系統維護者';
    const ip = info.ip || '未知 IP';
    const location = info.location || '未知位置';
    const device = info.device || '未知裝置';
    const browser = info.browser || '';
    const os = info.os || '';
    const source = info.source || 'Web 維護者後台 (#/admin)';

    // 避免短時間內重複觸發 (30 秒防抖)
    const alertKey = `LAST_LOGIN_ALERT_${userName}_${ip}`;
    const lastAlertTime = Number(props.getProperty(alertKey) || 0);
    const nowMs = Date.now();
    if (nowMs - lastAlertTime < 30000) {
      console.log(`⏳ 30秒內已發送過登入通知，略過重複發送: ${userName} (${ip})`);
      return;
    }
    props.setProperty(alertKey, String(nowMs));

    const envParts = [];
    if (os) envParts.push(os);
    if (browser) envParts.push(browser);
    const envSummary = envParts.length > 0 ? envParts.join(' · ') : '未知環境';
    const deviceDetail = device && device !== '未知裝置' ? ` (螢幕規格: ${device})` : '';

    const subject = `🛡️ [Daily-Diet 安全通知] 維護者 ${userName} 成功登入後台`;

    const messageContent = [
      `🛡️ 【Daily-Diet 熊貓教練維護者登入安全通知】`,
      `----------------------------------------`,
      `⏰ 登入時間：${timeStr} (台灣時間 GMT+8)`,
      `👤 維護者身分：${userName}`,
      `🌐 登入 IP：${ip} (${location})`,
      `💻 登入環境：${envSummary}${deviceDetail}`,
      `🕹️ 執行操作：後台維護者身分驗證與登入`,
      `🧭 觸發來源：${source}`,
      `----------------------------------------`,
      `✅ 驗證狀態：維護者身分驗證成功，通行憑證已核發。`,
      `💡 安全提醒：此通知為系統安全審核紀錄。若非您本人操作，請儘速檢查維護密鑰與帳號權限。`
    ].join('\n');

    // 1. Google 原生 MailApp 直送開發者信箱
    try {
      const candidateEmails = [
        props && props.getProperty('ADMIN_EMAIL'),
        props && props.getProperty('DEVELOPER_EMAIL'),
        (typeof DEFAULT_ADMIN_EMAIL !== 'undefined' && DEFAULT_ADMIN_EMAIL) || 'hi@winnie-lin.space'
      ];
      try {
        const effectiveUser = Session.getEffectiveUser().getEmail();
        if (effectiveUser && effectiveUser.includes('@')) candidateEmails.push(effectiveUser);
      } catch (e) {}
      const validEmails = [...new Set(candidateEmails.filter(Boolean))];
      if (validEmails.length > 0) {
        MailApp.sendEmail({
          to: validEmails.join(','),
          subject: subject,
          body: messageContent
        });
        console.log(`📧 [MailApp] 成功寄送維護者登入安全通知至: ${validEmails.join(',')}`);
      }
    } catch (mailErr) {
      console.warn("⚠️ [MailApp] 發送登入安全通知郵件失敗:", mailErr);
    }

    // 2. Web3Forms 備援
    try {
      UrlFetchApp.fetch('https://api.web3forms.com/submit', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          access_key: '72d7f10c-b6c8-42f2-9c40-fc5fac45cad0',
          subject: subject,
          from_name: '🛡️ Daily-Diet 安全守門員',
          time: timeStr,
          user_name: userName,
          ip: ip,
          location: location,
          environment: `${envSummary}${deviceDetail}`,
          operation: '維護者後台登入',
          status: '驗證成功',
          message: messageContent
        }),
        muteHttpExceptions: true
      });
    } catch (alertErr) {
      console.warn("⚠️ 發送 Web3Forms 登入安全回報失敗:", alertErr);
    }
  } catch (err) {
    console.warn("⚠️ 處理登入安全通報失敗:", err);
  }
}

function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!rawBody || !signature || !channelSecret) return false;
  try {
    const byteSignature = Utilities.computeHmacSha256Signature(rawBody, channelSecret);
    const calculatedSignature = Utilities.base64Encode(byteSignature);
    return calculatedSignature === signature;
  } catch (err) {
    console.error("🚨 [簽章校驗例外]:", err);
    return false;
  }
}

/**
 * 🧪 在 Google Apps Script 編輯器手動執行此函式以完成一次性郵件發送權限授權
 */
function testMailAuthorization() {
  const testEmail = (typeof DEFAULT_ADMIN_EMAIL !== 'undefined' && DEFAULT_ADMIN_EMAIL) || 'hi@winnie-lin.space';
  MailApp.sendEmail({
    to: testEmail,
    subject: '🐼 Daily-Diet 郵件權限授權測試信',
    body: '恭喜！若您收到這封信，代表 Google Apps Script 的 MailApp 寄信權限已完全授權成功！'
  });
  console.log('✅ 測試信已寄出至: ' + testEmail);
  return 'SUCCESS';
}
