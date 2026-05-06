import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db";
import { getAccessToken } from "./googleAuth";

// Fallback values
const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const FALLBACK_CHAIN = [
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash"
];

let genAIInstance = null;
let currentKey = null;

/**
 * Get the Google AI instance with dynamic key loading.
 */
async function getGenAI() {
  const userKeyEntry = await db.settings.get('user_api_key');
  const apiKey = (userKeyEntry && userKeyEntry.value) || DEFAULT_API_KEY;

  if (!genAIInstance || currentKey !== apiKey) {
    if (!apiKey) throw new Error("Missing Gemini API Key. Please provide it in settings or environment.");
    console.log("🔑 [AI Service] Initializing GoogleGenerativeAI with key:", apiKey.substring(0, 8) + "...");
    // Try to specify API version if standard v1beta fails for specific models
    genAIInstance = new GoogleGenerativeAI(apiKey);
    currentKey = apiKey;
  }
  return genAIInstance;
}

/**
 * Get the current date string in UTC-8 / PST
 */
function getUTC8DateString() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const pstMs = utcMs - 8 * 3600000;
  const pstDate = new Date(pstMs);
  return `${pstDate.getFullYear()}-${String(pstDate.getMonth() + 1).padStart(2, '0')}-${String(pstDate.getDate()).padStart(2, '0')}`;
}

/**
 * Get the current starting index for the fallback chain.
 */
function getCurrentModelIndex() {
  const today = getUTC8DateString();
  const savedDate = localStorage.getItem('ai_fallback_date');
  const savedIndex = parseInt(localStorage.getItem('ai_fallback_index') || '0');

  if (savedDate === today) return savedIndex;
  return 0;
}

/**
 * Move to the next model in the chain for the rest of the day.
 */
function moveToNextModel(currentIndex) {
  if (currentIndex >= FALLBACK_CHAIN.length - 1) return currentIndex;
  const nextIndex = currentIndex + 1;
  const today = getUTC8DateString();
  localStorage.setItem('ai_fallback_date', today);
  localStorage.setItem('ai_fallback_index', nextIndex.toString());
  console.warn(`⚡ Switched to next fallback model: ${FALLBACK_CHAIN[nextIndex]} until UTC-8 midnight`);
  return nextIndex;
}

/**
 * Unified Helper to run Gemini tasks via either REST (OAuth) or SDK (API Key)
 */
async function runGeminiTask(modelName, genAI, oauthToken, config) {
  const { contents, generationConfig } = config;
  
  if (oauthToken) {
    // 🚀 REST API Mode (OAuth) - High Speed
    console.log(`🚀 [AI Service] Hitting API via REST (OAuth): ${modelName}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${oauthToken}`
      },
      body: JSON.stringify({ contents, generationConfig })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        throw new Error("OAuth Token Expired or Invalid Scope. Please re-login to Google.");
      }
      throw new Error(`AI API Error (${response.status}): ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty AI response");
    return text;
  } else {
    // 🔑 SDK Mode (API Key) - Limited Speed
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig
    });

    // Map parts for SDK
    const parts = contents[0].parts.map(p => {
      if (p.inlineData) return { inlineData: p.inlineData };
      return p.text;
    });

    const result = await model.generateContent(parts);
    const response = await result.response;
    return response.text();
  }
}

/**
 * Retry helper with fallback on 429/503.
 */
async function withRetryAndFallback(fnFactory, maxRetries = 2) {
  let lastError;
  const oauthToken = getAccessToken();
  
  // Differentiate model selection based on login status
  const modelChain = oauthToken ? FALLBACK_CHAIN : ["gemma-4-31b-it"];
  let chainIndex = oauthToken ? getCurrentModelIndex() : 0;
  
  while (chainIndex < modelChain.length) {
    const modelName = modelChain[chainIndex];
    for (let n = 0; n <= maxRetries; n++) {
      try {
        const genAI = oauthToken ? null : await getGenAI();
        return await fnFactory(modelName, genAI, oauthToken);
      } catch (error) {
        lastError = error;
        const errMsg = error.message || "";
        const is429 = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
        const is503 = errMsg.includes("503") || errMsg.includes("Overloaded") || errMsg.includes("Service Unavailable");

        if (is429 && oauthToken) {
          chainIndex = moveToNextModel(chainIndex);
          if (chainIndex >= modelChain.length) throw error;
          break; 
        }

        if (is503 && n < maxRetries) {
          const waitTime = Math.pow(2, n) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (is503 && oauthToken) {
          chainIndex = moveToNextModel(chainIndex);
          if (chainIndex >= modelChain.length) throw error;
          break;
        }
        throw error;
      }
    }
    // For unlogged users, we only have one model, so if it fails, it fails.
    if (!oauthToken) break;
  }
  throw lastError;
}

export async function analyzeFoodImage(base64Image, context = {}, language = 'zh') {
  return withRetryAndFallback(async (modelName, genAI, oauthToken) => {
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
    const customPrompt = `STRICT: DIRECT JSON ONLY. NO PREAMBLE. 
Persona: Elite Registered Dietitian.
Priority: Read packaging text, labels, or menu signs for accuracy.
USER SPECIFIC INSTRUCTION (IMPORTANT): ${userInstructions || "None - Use standard visual analysis"}
If NO FOOD is detected: Still return a JSON object with dish_name: "No food detected", 0 for all numbers, and a sarcastic roast about missing food.

CRITICAL: Output all text fields in ${langDisplay}.
- dish_name: Accurate name.
- description: Brief nutritional overview.
- fun_fact: Science-based nutritional fact.
- roast: Sarcastic but expert-level nutritional burn.
- panda_comment: Professional nutritionist's evaluation with one actionable tip (Max 35 words).

Context: ${timeContext}, User: ${userName || 'User'}, Cal:${calories}/${calorieGoal}, Pro:${protein}/${proteinGoal}
History (Already eaten today): ${foodStrip || 'None'}

Schema: {dish_name, calories, protein, water, description, fun_fact, roast, panda_comment}
STRICT: Occasionally use the user's name (${userName}) naturally in the roast or panda_comment.`;

    const text = await runGeminiTask(modelName, genAI, oauthToken, {
      contents: [{
        parts: [
          { text: customPrompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] } }
        ]
      }],
      generationConfig: { 
        temperature: 0,
        maxOutputTokens: 500,
        responseMimeType: "application/json" 
      }
    });

    try {
      const lastBrace = text.lastIndexOf('}');
      const firstBrace = text.lastIndexOf('{', lastBrace);
      if (lastBrace !== -1 && firstBrace !== -1) {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      }
      return JSON.parse(text);
    } catch (e) {
      console.error("Parse Error. Raw text:", text);
      throw new Error(language === 'zh' ? "無法解析 AI 回應。" : "Failed to parse AI response.");
    }
  });
}

export async function suggestGoals(weight) {
  return withRetryAndFallback(async (modelName, genAI, oauthToken) => {
    const text = await runGeminiTask(modelName, genAI, oauthToken, {
      contents: [{ parts: [{ text: `My weight is ${weight} kg. Suggest daily calorie goal (kcal), protein (g), and water (ml). Return strictly a JSON object: { "calories": number, "protein": number, "water": number }.` }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" }
    });
    try {
      return JSON.parse(text);
    } catch (e) {
      return {
        calories: Math.round(weight * 30),
        protein: Math.round(weight * 1.5),
        water: Math.round(weight * 35)
      };
    }
  });
}

export async function getPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, foodLogs = [], language = 'zh', userName = '') {
  try {
    const calStatus = (calories / calorieGoal) * 100;
    const foodStrip = foodLogs.map(l => l.dish_name).join(', ');
    const langDisplay = language === 'zh' ? 'Traditional Chinese' : 'English';
    
    const prompt = `Persona: Elite Dietitian RD. Witty, professional, science-based.
Status: Cal:${calories}/${calorieGoal}(${calStatus.toFixed(0)}%), Pro:${protein}/${proteinGoal}g, Water:${water}/${waterGoal}ml. User: ${userName || 'User'}.
History: ${foodStrip || 'None'}
Task: Expert evaluation + 1 specific tip. Tone: Evidence-based, expert, witty. Max 35 words.
STRICT: Output ONLY the evaluation sentence in ${langDisplay}. NO JSON.`;

    return await withRetryAndFallback(async (modelName, genAI, oauthToken) => {
      const text = await runGeminiTask(modelName, genAI, oauthToken, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 100 }
      });
      // 🚀 Clean up: Remove any word counts or metadata in brackets like (26字)
      const cleaned = text.split('\n').pop().replace(/\(.*?\)|（.*?）/g, '').replace(/^["'「]+|["'」]+$/g, '').trim();
      return cleaned;
    });
  } catch (err) {
    return getLocalPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, language);
  }
}

function getLocalPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, language = 'zh') {
  const calPercent = (calories / calorieGoal) * 100;
  const waterPercent = (water / waterGoal) * 100;
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
