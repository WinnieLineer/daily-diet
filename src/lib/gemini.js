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
 * REST helper for Gemini when using OAuth token
 */
async function callGeminiRest(modelName, token, body) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "AI API Error");
  }
  return await res.json();
}

/**
 * Get the Google AI instance with dynamic key loading.
 */
async function getGenAI() {
  // OAuth for Gemini via generativelanguage.googleapis.com is restricted.
  // We will use API Keys for AI features.
  /*
  const token = getAccessToken();
  if (token) {
    ...
  }
  */

  const userKeyEntry = await db.settings.get('user_api_key');
  const apiKey = (userKeyEntry && userKeyEntry.value) || DEFAULT_API_KEY;

  if (!genAIInstance || currentKey !== apiKey) {
    if (!apiKey) throw new Error("Missing Gemini API Key. Please provide it in settings or environment.");
    genAIInstance = new GoogleGenerativeAI(apiKey);
    currentKey = apiKey;
  }
  return genAIInstance;
}

/**
 * Get the current date string in UTC-8 / PST (Google API rate limit reset timezone)
 */
function getUTC8DateString() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const pstMs = utcMs - 8 * 3600000;
  const pstDate = new Date(pstMs);
  return `${pstDate.getFullYear()}-${String(pstDate.getMonth() + 1).padStart(2, '0')}-${String(pstDate.getDate()).padStart(2, '0')}`;
}

/**
 * Get the current model name based on status.
 */
/**
 * Get the current starting index for the fallback chain.
 */
function getCurrentModelIndex() {
  const today = getUTC8DateString();
  const savedDate = localStorage.getItem('ai_fallback_date');
  const savedIndex = parseInt(localStorage.getItem('ai_fallback_index') || '0');

  if (savedDate === today) {
    return savedIndex;
  }
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
 * Retry helper with fallback on 429/503.
 */
async function withRetryAndFallback(fnFactory, maxRetries = 2) {
  let lastError;
  let chainIndex = getCurrentModelIndex();
  
  while (chainIndex < FALLBACK_CHAIN.length) {
    const modelName = FALLBACK_CHAIN[chainIndex];
    for (let n = 0; n <= maxRetries; n++) {
      try {
        const aiProvider = await getGenAI();
        return await fnFactory(modelName, aiProvider);
      } catch (error) {
        lastError = error;
        const errMsg = error.message || "";
        const is429 = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
        const is503 = errMsg.includes("503") || errMsg.includes("Overloaded") || errMsg.includes("Service Unavailable");

        if (is429) {
          chainIndex = moveToNextModel(chainIndex);
          if (chainIndex >= FALLBACK_CHAIN.length) throw error;
          break; // Try next model in chain
        }

        if (is503 && n < maxRetries) {
          const waitTime = Math.pow(2, n) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (is503) {
          chainIndex = moveToNextModel(chainIndex);
          if (chainIndex >= FALLBACK_CHAIN.length) throw error;
          break;
        }
        throw error;
      }
    }
  }
  throw lastError;
}

export async function analyzeFoodImage(base64Image, context = {}, language = 'zh', userName = '') {
  return withRetryAndFallback((modelName, genAI) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature: 0 }
    });

    const { calories, calorieGoal, protein, proteinGoal, water, waterGoal, foodLogs = [], userName = '', userInstructions = '' } = context;
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

    return model.generateContent({
      contents: [{ role: "user", parts: [{ text: customPrompt }, {
        inlineData: {
          data: base64Image.split(',')[1],
          mimeType: "image/jpeg",
        },
      }] }],
      generationConfig: { 
        temperature: 0,
        maxOutputTokens: 500,
        responseMimeType: "application/json" // 🚀 Force JSON engine (much faster)
      }
    }).then(async (result) => {
      const response = await result.response;
      const text = response.text();
      try {
        // Robust parsing: Find the last JSON block in case of thoughts or markdown
        const lastBrace = text.lastIndexOf('}');
        const firstBrace = text.lastIndexOf('{', lastBrace);
        if (lastBrace !== -1 && firstBrace !== -1) {
          const jsonString = text.substring(firstBrace, lastBrace + 1);
          return JSON.parse(jsonString);
        }
        return JSON.parse(text);
      } catch (e) {
        console.error("Parse Error. Raw text:", text);
        const errMap = { zh: "無法解析 AI 回應，請再試一次。", en: "Failed to parse AI response. Please try again." };
        throw new Error(errMap[language] || errMap.en);
      }
    });
  });
}

export async function suggestGoals(weight) {
  return withRetryAndFallback((modelName, genAI) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature: 0 }
    });
    const prompt = `My current weight is ${weight} kg. Based on this, suggest a daily calorie goal (kcal), protein goal (g), and water intake goal (ml) for a healthy diet. 
    Return strictly a JSON object: { "calories": number, "protein": number, "water": number }.`;

    return model.generateContent(prompt).then(async (result) => {
      const response = await result.response;
      const text = response.text();
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch (e) {
        return {
          calories: Math.round(weight * 30),
          protein: Math.round(weight * 1.5),
          water: Math.round(weight * 35)
        };
      }
    });
  });
}

export async function getPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, foodLogs = [], language = 'zh', userName = '') {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const timeContext = currentHour < 5 ? 'Deep Night' : 
                        currentHour < 10 ? 'Morning' : 
                        currentHour < 14 ? 'Lunch Time' : 
                        currentHour < 17 ? 'Afternoon' : 
                        currentHour < 21 ? 'Dinner' : 'Night';

    const foodStrip = foodLogs.map(l => l.dish_name).join(', ');

    return await withRetryAndFallback((modelName, genAI) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const calStatus = (calories / calorieGoal) * 100;
      const proStatus = (protein / proteinGoal) * 100;
      const watStatus = (water / waterGoal) * 100;
      const langDisplay = language === 'zh' ? 'Traditional Chinese' : 'English';
      
      const prompt = `Persona: Elite Registered Dietitian (RD) and Sports Nutritionist. You are witty, slightly sarcastic, but deeply professional and science-based.
Status: Cal:${calories}/${calorieGoal}(${calStatus.toFixed(0)}%), Pro:${protein}/${proteinGoal}g, Water:${water}/${waterGoal}ml. User: ${userName || 'User'}.
History (Today): ${foodStrip || 'None'}
Task: Provide an expert nutritional evaluation with exactly one specific, actionable professional suggestion based on the status.
Tone: Evidence-based, expert, yet engagingly witty. Occasionally address the user by name (${userName}) naturally.
Constraint: Max 35 words.
STRICT: Output only the evaluation sentence in ${langDisplay}. NO JSON. NO MARKDOWN. NO PREAMBLE.`;

      return model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.8,
          maxOutputTokens: 100, 
        }
      }).then(async (result) => {
        const response = await result.response;
        // 🚀 Upgrade: Filter out 'thought' parts and join actual text parts
        const parts = response.candidates[0].content.parts;
        const actualText = parts
          .filter(p => !p.thought)
          .map(p => p.text)
          .join('')
          .trim();
        
        // Final cleanup: remove potential AI artifacts or outer quotes
        return actualText.split('\n').pop().replace(/^["'「]+|["'」]+$/g, '').trim();
      });
    });
  } catch (err) {
    return getLocalPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, language);
  }
}

function getLocalPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, language = 'zh') {
  const calPercent = (calories / calorieGoal) * 100;
  const waterPercent = (water / waterGoal) * 100;

  const advice = {
    zh: {
      low_water: "多喝點水啦！身體都枯竭了 💧",
      zero_cal: "別害羞，快吃點東西補補！🐼",
      low_cal: "進度才一半，再吃一點點沒關係的！🐼",
      mid_cal: "接近目標了，你是最棒的！🐼",
      goal_reached: "完美達標！今天你就是飲食達人！🐼",
      over_cal: "哎呀，今天吃得有點熱情喔！🐼"
    },
    en: {
      low_water: "Drink more water! Your body is thirsty 💧",
      zero_cal: "Don't be shy, eat something! 🐼",
      low_cal: "Halfway there, a little more won't hurt! 🐼",
      mid_cal: "Almost at the goal, you're doing great! 🐼",
      goal_reached: "Perfect! You're a diet expert today! 🐼",
      over_cal: "Oops, a bit too enthusiastic today! 🐼"
    }
  }[language];

  if (waterPercent < 40) return advice.low_water;
  if (calPercent === 0) return advice.zero_cal;
  if (calPercent < 50) return advice.low_cal;
  if (calPercent < 90) return advice.mid_cal;
  if (calPercent <= 100) return advice.goal_reached;
  return advice.over_cal;
}
