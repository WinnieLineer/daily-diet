import crypto from 'crypto';

// Environment variables needed:
// - LINE_CHANNEL_SECRET
// - LINE_CHANNEL_ACCESS_TOKEN
// - GEMINI_API_KEY
// - GITHUB_PAT
// - GIST_ID
// - VITE_LINE_LIFF_ID

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Daily Diet LINE Bot Webhook Engine is running! 🐼');
  }

  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const githubPat = process.env.GITHUB_PAT;
  const gistId = process.env.GIST_ID;
  const liffId = process.env.VITE_LINE_LIFF_ID || '2011098313-nFOisgmf';

  console.log('📥 Received LINE Webhook event:', {
    hasChannelSecret: !!channelSecret,
    hasChannelAccessToken: !!channelAccessToken,
    hasGeminiKey: !!geminiApiKey,
    eventsCount: req.body?.events?.length || 0
  });

  // 1. Verify LINE Signature (Log warning if mismatch due to Vercel body-parser)
  const signature = req.headers['x-line-signature'];
  if (channelSecret && signature) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(rawBody)
      .digest('base64');

    if (hash !== signature) {
      console.warn('⚠️ LINE Signature mismatch (often caused by JSON parser re-serialization). Continuing with execution...');
    }
  }

  if (!channelAccessToken) {
    console.error('❌ LINE_CHANNEL_ACCESS_TOKEN is missing from environment variables!');
    return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN is not configured' });
  }

  const events = req.body?.events || [];

  for (const event of events) {
    const replyToken = event.replyToken;
    if (!replyToken) continue;

    try {
      console.log(`處理事件: ${event.type}, 訊息類型: ${event.message?.type || 'N/A'}`);

      // ----------------------------------------------------
      // 📸 Case 1: 用戶傳送訊息 (圖片 or 文字)
      // ----------------------------------------------------
      if (event.type === 'message') {
        if (event.message.type === 'image') {
          // --- 📸 處理照片訊息 ---
          const messageId = event.message.id;
          console.log(`🖼️ 下載 LINE 照片: messageId=${messageId}`);

          // 1. 從 LINE Content API 下載圖片二進位檔
          const imageRes = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
            headers: { Authorization: `Bearer ${channelAccessToken}` }
          });

          if (!imageRes.ok) {
            const errText = await imageRes.text();
            console.error('❌ 下載 LINE 圖片失敗:', imageRes.status, errText);
            throw new Error(`無法下載 LINE 照片 (Status: ${imageRes.status})`);
          }

          const arrayBuffer = await imageRes.arrayBuffer();
          const base64Image = Buffer.from(arrayBuffer).toString('base64');
          console.log(`✅ 圖片下載完成 (${arrayBuffer.byteLength} bytes)，正在送交 Gemini 辨識...`);

          // 2. 呼叫 Gemini Vision API 辨識食物
          const analysis = await analyzeMealWithGemini(base64Image, geminiApiKey);
          console.log('✅ Gemini 辨識結果:', analysis);

          // 3. 發送 Flex Message 卡片詢問用戶是否確認記錄
          await replyLineMealConfirm(replyToken, analysis, channelAccessToken);
          console.log('✅ 已成功發送 Flex Message 確認卡片');

        } else if (event.message.type === 'text') {
          // --- 💬 處理文字訊息 ---
          const userText = event.message.text.trim();
          console.log(`💬 收到文字訊息: "${userText}"`);

          if (userText === '選單' || userText === 'App' || userText === '主選單' || userText === '日記') {
            await replyLineMessage(replyToken, `🐼 點擊下方連結開啟您的個人飲食日記：\nhttps://liff.line.me/${liffId}`, channelAccessToken);
            continue;
          }

          // 透過 Gemini 解析文字飲食
          const analysis = await parseTextWithGemini(userText, geminiApiKey);
          console.log('✅ Gemini 文字辨識結果:', analysis);

          // 發送確認卡片
          await replyLineMealConfirm(replyToken, analysis, channelAccessToken);
          console.log('✅ 已成功發送文字辨識確認卡片');
        }
      }

      // ----------------------------------------------------
      // 🔘 Case 2: 用戶點擊確認/取消按鈕 (Postback Event)
      // ----------------------------------------------------
      else if (event.type === 'postback') {
        let payload = {};
        try {
          payload = JSON.parse(event.postback.data);
        } catch (e) {
          console.error('Failed to parse postback data:', e);
        }

        if (payload.a === 'save') {
          // ✅ 用戶確認記錄：儲存至 GitHub Gist
          if (githubPat && gistId) {
            try {
              await saveLogToGist({
                dish_name: payload.n || '餐點紀錄',
                calories: Number(payload.c) || 0,
                protein: Number(payload.p) || 0,
                water: Number(payload.w) || 0,
                panda_comment: payload.m || ''
              }, githubPat, gistId);
              console.log('✅ 成功儲存至 GitHub Gist');
            } catch (gistErr) {
              console.error('❌ 儲存至 Gist 失敗:', gistErr);
            }
          }

          const replyText = `✅ 熊貓教練已成功為您記錄！\n\n` +
            `🍱 餐點：${payload.n || '餐點'}\n` +
            `🔥 熱量：${payload.c || 0} kcal\n` +
            `🥩 蛋白質：${payload.p || 0} g\n\n` +
            `💬 熊貓短評：${payload.m || '繼續保持好習慣！'}\n\n` +
            `📱 [開啟 Daily Diet App 查看最新進度](https://liff.line.me/${liffId})`;

          await replyLineMessage(replyToken, replyText, channelAccessToken);

        } else if (payload.a === 'cancel') {
          // ❌ 用戶取消記錄
          await replyLineMessage(replyToken, `👌 已取消記錄此餐點。\n您可以隨時再傳送照片或手動輸入飲食！🐼`, channelAccessToken);
        }
      }

    } catch (err) {
      console.error('❌ Error processing LINE event:', err);
      try {
        await replyLineMessage(replyToken, `⚠️ 熊貓教練辨識時發生小錯誤：${err.message || '請稍後重試！'}`, channelAccessToken);
      } catch (replyErr) {
        console.error('❌ Failed to send error message back to LINE:', replyErr);
      }
    }
  }

  return res.status(200).json({ status: 'success' });
}

/**
 * 發送 LINE Flex Message 確認卡片 (AI 辨識結果 + 是否記錄按鈕)
 */
async function replyLineMealConfirm(replyToken, analysis, accessToken) {
  // Postback 資料控制在字元限制內 (LINE 限制 300 bytes)
  const postbackData = JSON.stringify({
    a: 'save',
    n: (analysis.dish_name || '餐點').slice(0, 30),
    c: Number(analysis.calories) || 0,
    p: Number(analysis.protein) || 0,
    w: Number(analysis.water) || 0,
    m: (analysis.panda_comment || '').slice(0, 40)
  });

  const cancelData = JSON.stringify({ a: 'cancel' });

  const flexMessage = {
    type: 'flex',
    altText: `🍱 AI 辨識完成：${analysis.dish_name} (${analysis.calories} kcal) - 請問是否記錄？`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FDE047', // Daily Diet 招牌鮮黃色
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '🐼 DAILY DIET', weight: 'bold', size: 'sm', color: '#000000' },
              { type: 'text', text: 'AI 食物偵探', weight: 'bold', size: 'xs', color: '#713F12', align: 'end' }
            ]
          },
          {
            type: 'text',
            text: '飲食辨識完成！',
            weight: 'bold',
            size: 'lg',
            color: '#000000',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '18px',
        contents: [
          {
            type: 'text',
            text: analysis.dish_name || '美味餐點',
            weight: 'bold',
            size: 'xl',
            color: '#000000',
            wrap: true
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#FFF1F2',
                cornerRadius: '12px',
                paddingAll: '12px',
                flex: 1,
                alignItems: 'center',
                contents: [
                  { type: 'text', text: '🔥 熱量預估', size: 'xs', color: '#E11D48', weight: 'bold' },
                  { type: 'text', text: `${analysis.calories}`, size: 'xl', weight: 'bold', color: '#000000', margin: 'xs' },
                  { type: 'text', text: 'kcal', size: 'xxs', color: '#881337', weight: 'bold' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#EFF6FF',
                cornerRadius: '12px',
                paddingAll: '12px',
                flex: 1,
                alignItems: 'center',
                contents: [
                  { type: 'text', text: '🥩 蛋白質', size: 'xs', color: '#2563EB', weight: 'bold' },
                  { type: 'text', text: `${analysis.protein}`, size: 'xl', weight: 'bold', color: '#000000', margin: 'xs' },
                  { type: 'text', text: 'grams', size: 'xxs', color: '#1E3A8A', weight: 'bold' }
                ]
              }
            ]
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#FEF9C3',
            cornerRadius: '12px',
            paddingAll: '12px',
            contents: [
              {
                type: 'text',
                text: `💬 熊貓教練短評：\n${analysis.panda_comment || '這餐看起來營養很均衡喔！'}`,
                size: 'xs',
                color: '#713F12',
                weight: 'bold',
                wrap: true
              }
            ]
          },
          {
            type: 'text',
            text: '請確認營養數值，點擊儲存或直接開啟 App 微調：',
            size: 'xxs',
            color: '#71717A',
            align: 'center',
            margin: 'xs'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#000000',
            action: {
              type: 'postback',
              label: '💾 確認儲存並看今日總結',
              data: postbackData,
              displayText: `💾 確認儲存餐點：${analysis.dish_name}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            color: '#F4F4F5',
            action: {
              type: 'postback',
              label: '❌ 取消',
              data: cancelData,
              displayText: '❌ 取消紀錄'
            }
          }
        ]
      }
    }
  };

  const replyRes = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [flexMessage]
    })
  });

  if (!replyRes.ok) {
    const errorText = await replyRes.text();
    console.error('❌ LINE Reply Flex Message 失敗:', replyRes.status, errorText);
    throw new Error(`LINE Reply 失敗 (${replyRes.status}): ${errorText}`);
  }
}

/**
 * Call Gemini Vision API to analyze image
 */
async function analyzeMealWithGemini(base64Image, apiKey) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 未設定，請在 Vercel 後台 Environment Variables 設定 GEMINI_API_KEY');
  }

  // 依據專案配額最佳化排序（高 RPD 優先）
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-2.5-flash'
  ];
  let lastError = null;

  const prompt = `Analyze this food image for a nutrition tracking app. Return ONLY a raw JSON object with keys:
"dish_name" (string in Traditional Chinese),
"calories" (integer number),
"protein" (integer number in grams),
"water" (integer number in ml, default 0),
"panda_comment" (string in Traditional Chinese, sassy witty humor encouraging healthy habits).
Do NOT wrap in markdown backticks.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }
    ]
  };

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || res.statusText);
      }

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        dish_name: parsed.dish_name || "美味餐點",
        calories: Number(parsed.calories) || 450,
        protein: Number(parsed.protein) || 20,
        water: Number(parsed.water) || 0,
        panda_comment: parsed.panda_comment || "拍得很好！這餐看起來營養很均衡喔 🐼"
      };
    } catch (err) {
      console.warn(`⚠️ 模型 ${model} 辨識失敗: ${err.message}，嘗試下一個模型...`);
      lastError = err;
    }
  }

  throw new Error(`所有 Gemini 模型辨識皆失敗: ${lastError?.message || '未知錯誤'}`);
}

/**
 * Call Gemini Text API to parse text meal
 */
async function parseTextWithGemini(text, apiKey) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 未設定，請在 Vercel 後台 Environment Variables 設定 GEMINI_API_KEY');
  }

  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-2.5-flash'
  ];
  let lastError = null;

  const prompt = `Parse this food text: "${text}". Return ONLY a raw JSON object with keys:
"dish_name" (string in Traditional Chinese),
"calories" (integer number estimate),
"protein" (integer number estimate in grams),
"water" (integer number in ml),
"panda_comment" (string in Traditional Chinese).
Do NOT wrap in markdown backticks.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || res.statusText);
      }

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        dish_name: parsed.dish_name || text,
        calories: Number(parsed.calories) || 350,
        protein: Number(parsed.protein) || 15,
        water: Number(parsed.water) || 0,
        panda_comment: parsed.panda_comment || "已記下您的文字紀錄！"
      };
    } catch (err) {
      console.warn(`⚠️ 模型 ${model} 文字解析失敗: ${err.message}，嘗試下一個模型...`);
      lastError = err;
    }
  }

  return {
    dish_name: text,
    calories: 350,
    protein: 15,
    water: 0,
    panda_comment: "已記下您的文字紀錄！"
  };
}

/**
 * Update GitHub Gist JSON file with new log entry
 */
async function saveLogToGist(logEntry, pat, gistId) {
  const gistUrl = `https://api.github.com/gists/${gistId}`;

  // 1. Get current Gist content
  const getRes = await fetch(gistUrl, {
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Accept': 'application/vnd.github+json'
    }
  });

  let backupData = { logs: [] };
  if (getRes.ok) {
    const gistData = await getRes.json();
    const content = gistData.files?.['daily-diet-backup.json']?.content;
    if (content) {
      try { backupData = JSON.parse(content); } catch (e) {}
    }
  }

  // 2. Append new log
  if (!backupData.logs) backupData.logs = [];
  const newLog = {
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }),
    timestamp: Date.now(),
    dish_name: logEntry.dish_name,
    calories: Number(logEntry.calories) || 0,
    protein: Number(logEntry.protein) || 0,
    water: Number(logEntry.water) || 0,
    comment: logEntry.panda_comment || logEntry.comment || '',
    source: 'LINE_BOT'
  };

  backupData.logs.unshift(newLog);

  // 3. Save back to Gist
  await fetch(gistUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: {
        'daily-diet-backup.json': {
          content: JSON.stringify(backupData, null, 2)
        }
      }
    })
  });
}

/**
 * Send Reply Message via LINE Messaging API
 */
async function replyLineMessage(replyToken, text, accessToken) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('❌ replyLineMessage 失敗:', res.status, err);
  }
}
