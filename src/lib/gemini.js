import { db } from "../db";

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3-flash',
  'gemini-2.5-flash'
];

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxmQC8f0NxOKRAIuLTSTVC-Vinf9lmU0cnb1akR5oKUEYD-3h7XjFV8Zm_LPkv_kdQo/exec';

function getPersonaInstruction() {
  const activePersona = typeof localStorage !== 'undefined' ? localStorage.getItem('panda_active_persona') || 'tsundere' : 'tsundere';
  
  if (activePersona === 'gentle') {
    return `Persona style: Sweet, gentle, supportive, and healing partner (無比溫柔、體貼、溫馨且鼓勵感滿滿的療癒小幫手). Praise user, show empathy, encourage with warm tone. Never use harsh words.`;
  }
  if (activePersona === 'hardcore') {
    return `Persona style: Fiery, energetic, hardcore gym personal trainer (熱血、鐵血健身教練). Shout at them, use gym slang ('動起來！', '再一下！'), push strictly like a drill sergeant.`;
  }
  // Default is 'tsundere'
  return `Persona style: Tsundere Elite Registered Dietitian. Witty, professional, sarcastic and tsundere (毒舌且傲嬌，口嫌體正直，犀利吐槽但給予專家建議與貼心叮嚀).`;
}

function sanitizeKey(key) {
  if (!key) return null;
  let clean = key.trim();
  clean = clean.replace(/^bearer\s+/i, '').trim();
  return clean;
}

const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GROK_KEY;

async function getApiKey() {
  let apiKey = sanitizeKey(DEFAULT_API_KEY);

  try {
    const userKeyEntry = await db.settings.get('user_api_key');
    let userKey = userKeyEntry ? userKeyEntry.value : null;
    userKey = sanitizeKey(userKey);
    if (userKey && !userKey.startsWith('gsk_')) {
      apiKey = userKey;
    }
  } catch (e) {}

  if (apiKey && apiKey.startsWith('gsk_')) {
    apiKey = null;
  }

  return apiKey;
}

/**
 * Call Gemini REST API with multi-model cascade
 */
async function callGeminiDirect(payload, apiKey) {
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errText = await res.text();
        console.warn(`[Gemini API] Model ${model} failed (${res.status}):`, errText);
        lastError = new Error(`Gemini ${model} failed: ${res.status}`);
      }
    } catch (err) {
      console.warn(`[Gemini API] Model ${model} network error:`, err);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini models exhausted");
}

const WEB_AI_SECRET = "DD_WEB_AI_SECURE_KEY_2026";

function createWebAIPayload(data) {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 10);
  const signatureRaw = `DD_AI_${timestamp}_${nonce}_${WEB_AI_SECRET}`;
  const appToken = btoa(signatureRaw).substring(0, 32);

  return {
    ...data,
    client: 'daily-diet-web',
    timestamp,
    nonce,
    appToken
  };
}

/**
 * Fallback to GAS Server Proxy (which holds master Gemini quota)
 */
async function callGasProxy(action, data) {
  console.log(`📡 [AI Service] Routing to GAS Backend Proxy for action: ${action}`);
  const payload = createWebAIPayload(data);
  const res = await fetch(`${GAS_API_URL}?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`GAS Proxy failed with status: ${res.status}`);
  }

  const json = await res.json();
  if (json.status === 'error') {
    throw new Error(json.message || 'GAS Proxy error');
  }
  return json.data || json.text || json;
}

/**
 * Analyze food image using Gemini Vision (or GAS fallback)
 */
export async function analyzeFoodImage(base64Image, context = {}, language = 'zh') {
  const { calories, calorieGoal, protein, proteinGoal, foodLogs = [], userName = '', userInstructions = '' } = context;
  const now = new Date();
  const currentHour = now.getHours();
  const timeContext = currentHour < 5 ? 'Deep Night' :
    currentHour < 10 ? 'Morning' :
      currentHour < 14 ? 'Lunch Time' :
        currentHour < 17 ? 'Afternoon' :
          currentHour < 21 ? 'Dinner' : 'Night';
  const foodStrip = foodLogs.map(l => l.dish_name).join(', ');
  const langDisplay = language === 'zh' ? 'Traditional Chinese' : 'English';

  const customPrompt = `You are a professional nutrition expert panda. Analyze this food image. Return STRICTLY a raw JSON object. NO MARKDOWN.
${getPersonaInstruction()}
Priority: Read packaging text, labels, or menu signs for accuracy.
USER SPECIFIC INSTRUCTION: ${userInstructions || "None - Use standard visual analysis"}
If NO FOOD is detected: Return dish_name indicating no food, 0 for all numbers, and a sarcastic roast.

Output all text fields in ${langDisplay}.
Required Schema:
{
  "dish_name": "<Accurate name in ${langDisplay}>",
  "calories": <integer calories in kcal>,
  "protein": <integer protein in grams>,
  "carbs": <integer carbohydrates in grams>,
  "fat": <integer total fat in grams>,
  "water": <integer liquid intake in ml, e.g. 500 for soup/drink, or 0 if dry food>,
  "description": "<Brief nutritional overview in ${langDisplay}>",
  "fun_fact": "<Science-based nutritional fact in ${langDisplay}>",
  "roast": "<Sarcastic but expert nutritional roast in ${langDisplay}>",
  "panda_comment": "<Professional evaluation with 1 actionable tip, max 35 words in ${langDisplay}>"
}
Context: ${timeContext}, User: ${userName || 'User'}, Cal:${calories || 0}/${calorieGoal || 2000}, Pro:${protein || 0}/${proteinGoal || 100}
History Today: ${foodStrip || 'None'}`;

  // Clean raw base64 data
  const rawBase64 = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;

  const apiKey = await getApiKey();

  // 1. Try Direct Gemini Call if key exists
  if (apiKey) {
    try {
      const payload = {
        contents: [{
          parts: [
            { text: customPrompt },
            { inline_data: { mime_type: "image/jpeg", data: rawBase64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json"
        }
      };

      const rawText = await callGeminiDirect(payload, apiKey);
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed && !parsed.dish_name) {
        parsed.dish_name = language === 'zh' ? "美味餐點" : "Delicious Meal";
      }
      return parsed;
    } catch (err) {
      console.warn("Direct Gemini failed, attempting GAS backend proxy...", err);
    }
  }

  // 2. Fallback to GAS Server Proxy
  try {
    const proxyResult = await callGasProxy('analyzeMeal', {
      image: rawBase64,
      context,
      language
    });
    return proxyResult;
  } catch (gasErr) {
    console.error("All AI Recognition methods failed:", gasErr);
    throw new Error(language === 'zh' ? "AI 辨識暫時繁忙，請稍後重試 🐼" : "AI analysis temporarily busy, please try again 🐼");
  }
}

/**
 * Estimate food nutrition from a text-only prompt using Gemini
 */
export async function analyzeFoodText(textInstruction, context = {}, language = 'zh') {
  const { calories, calorieGoal, protein, proteinGoal, foodLogs = [], userName = '' } = context;
  const now = new Date();
  const currentHour = now.getHours();
  const timeContext = currentHour < 5 ? 'Deep Night' :
    currentHour < 10 ? 'Morning' :
      currentHour < 14 ? 'Lunch Time' :
        currentHour < 17 ? 'Afternoon' :
          currentHour < 21 ? 'Dinner' : 'Night';
  const foodStrip = foodLogs.map(l => l.dish_name).join(', ');
  const langDisplay = language === 'zh' ? 'Traditional Chinese' : 'English';

  const customPrompt = `You are a professional nutrition expert panda. The user has entered: "${textInstruction}".
Analyze this meal and estimate its nutritional facts. Return STRICTLY a raw JSON object. NO MARKDOWN.
${getPersonaInstruction()}

Output all text fields in ${langDisplay}.
Required Schema:
{
  "dish_name": "<Accurate name in ${langDisplay}>",
  "calories": <integer calories in kcal>,
  "protein": <integer protein in grams>,
  "carbs": <integer carbohydrates in grams>,
  "fat": <integer total fat in grams>,
  "water": <integer liquid intake in ml, e.g. 500 for soup/beverage, or 0 if dry food>,
  "description": "<Brief nutritional overview in ${langDisplay}>",
  "fun_fact": "<Science-based nutritional fact in ${langDisplay}>",
  "roast": "<Sarcastic but expert nutritional roast in ${langDisplay}>",
  "panda_comment": "<Professional evaluation with 1 actionable tip, max 35 words in ${langDisplay}>"
}
Context: ${timeContext}, User: ${userName || 'User'}, Cal:${calories || 0}/${calorieGoal || 2000}, Pro:${protein || 0}/${proteinGoal || 100}
History Today: ${foodStrip || 'None'}`;

  const apiKey = await getApiKey();

  if (apiKey) {
    try {
      const payload = {
        contents: [{
          parts: [{ text: customPrompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json"
        }
      };

      const rawText = await callGeminiDirect(payload, apiKey);
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed && !parsed.dish_name) {
        parsed.dish_name = language === 'zh' ? "美味餐點" : "Delicious Meal";
      }
      return parsed;
    } catch (err) {
      console.warn("Direct Gemini text analysis failed, attempting GAS backend proxy...", err);
    }
  }

  try {
    const proxyResult = await callGasProxy('analyzeText', {
      text: textInstruction,
      context,
      language
    });
    return proxyResult;
  } catch (gasErr) {
    console.error("Text analysis failed:", gasErr);
    throw new Error(language === 'zh' ? "文字辨識暫時繁忙，請稍後重試 🐼" : "Text analysis temporarily busy, please try again 🐼");
  }
}

/**
 * Suggest daily nutrition goals based on weight
 */
export async function suggestGoals(weight) {
  const apiKey = await getApiKey();
  if (apiKey) {
    try {
      const prompt = `User weight: ${weight} kg. Suggest daily calorie goal (kcal), protein (g), and water (ml). Return strictly JSON: { "calories": number, "protein": number, "water": number }`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      };
      const raw = await callGeminiDirect(payload, apiKey);
      return JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {}
  }

  return {
    calories: Math.round(weight * 30),
    protein: Math.round(weight * 1.5),
    water: Math.round(weight * 35)
  };
}

/**
 * Get Panda Coach advice
 */
export async function getPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, foodLogs = [], language = 'zh', userName = '') {
  if (typeof calories === 'string') {
    const customPrompt = `${getPersonaInstruction()}\n\nTask: ${calories}`;
    return await completeText(customPrompt);
  }

  try {
    const calStatus = (calories / (calorieGoal || 2000)) * 100;
    const foodStrip = foodLogs.map(l => l.dish_name).join(', ');
    const langDisplay = language === 'zh' ? 'Traditional Chinese' : 'English';

    const prompt = `${getPersonaInstruction()}
    Status: Cal:${calories}/${calorieGoal}(${calStatus.toFixed(0)}%), Pro:${protein}/${proteinGoal}g, Water:${water}/${waterGoal}ml. User: ${userName || 'User'}.
    History Today: ${foodStrip || 'None'}
    Task: Expert evaluation + 1 specific tip. Tone: Evidence-based, expert, matching selected persona. Max 45 words.
    STRICT: Output ONLY the evaluation sentence in ${langDisplay}. NO JSON. NO MARKDOWN.`;

    return await completeText(prompt);
  } catch (err) {
    return getLocalPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, language);
  }
}

/**
 * Generic text completion with Gemini
 */
export async function completeText(prompt, options = {}) {
  const apiKey = await getApiKey();
  if (apiKey) {
    try {
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      };
      const text = await callGeminiDirect(payload, apiKey);
      return text.trim().split('\n').pop().replace(/\(.*?\)|（.*?）/g, '').replace(/^["'「]+|["'」]+$/g, '').trim();
    } catch (e) {
      console.warn("Direct completeText failed, using fallback...", e);
    }
  }

  try {
    const proxyResult = await callGasProxy('completeText', { prompt });
    return String(proxyResult).trim().split('\n').pop().replace(/\(.*?\)|（.*?）/g, '').replace(/^["'「]+|["'」]+$/g, '').trim();
  } catch (e) {
    return "繼續保持健康飲控節奏喔！🐼✨";
  }
}

function getLocalPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, language = 'zh') {
  const calPercent = (calories / (calorieGoal || 2000)) * 100;
  const waterPercent = (water / (waterGoal || 2000)) * 100;
  const advice = {
    zh: { low_water: "多喝點水啦！身體都枯竭了 💧", zero_cal: "別害羞，快吃點東西補補！🐼", low_cal: "進度才一半，再吃一點點沒關係的！🐼", mid_cal: "接近目標了，你是最棒的！🐼", goal_reached: "完美達標！今天你就是飲食達人！🐼", over_cal: "哎呀，今天吃得有點熱情喔！🐼" },
    en: { low_water: "Drink more water! Your body is thirsty 💧", zero_cal: "Don't be shy, eat something! 🐼", low_cal: "Halfway there, a little more won't hurt! 🐼", mid_cal: "Almost at the goal, you're doing great! 🐼", goal_reached: "Perfect! You're a diet expert today! 🐼", over_cal: "Oops, a bit too enthusiastic today! 🐼" }
  }[language];
  if (waterPercent < 40) return advice.low_water;
  if (calPercent === 0) return advice.zero_cal;
  if (calPercent < 50) return advice.low_cal;
  if (calPercent < 90) return advice.mid_cal;
  if (calPercent <= 100) return advice.goal_reached;
  return advice.over_cal;
}
