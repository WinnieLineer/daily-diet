import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Primary model and fallback
const PRIMARY_MODEL = "gemma-4-31b-it";
const FALLBACK_MODEL = "gemini-3.1-flash-lite-preview";

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
 * Get the current model name.
 * If we previously fell back today (UTC-8), keep using fallback.
 * At midnight UTC-8, reset to primary.
 */
function getCurrentModel() {
  const today = getUTC8DateString();
  const savedDate = localStorage.getItem('ai_fallback_date');
  const savedModel = localStorage.getItem('ai_fallback_model');
  // Only use fallback if date matches today AND the saved model matches current config
  if (savedDate === today && savedModel === FALLBACK_MODEL) {
    return FALLBACK_MODEL;
  }
  // New day, model config changed, or no fallback — reset and use primary
  localStorage.removeItem('ai_fallback_date');
  localStorage.removeItem('ai_fallback_model');
  return PRIMARY_MODEL;
}

/**
 * Switch to fallback model and remember for the rest of the day (UTC-8).
 */
function switchToFallback() {
  const today = getUTC8DateString();
  localStorage.setItem('ai_fallback_date', today);
  localStorage.setItem('ai_fallback_model', FALLBACK_MODEL);
  console.warn(`⚡ Switched to fallback model: ${FALLBACK_MODEL} until UTC-8 midnight`);
  return FALLBACK_MODEL;
}

/**
 * Retry helper with fallback on 429/503.
 * On 429, immediately switches to fallback model for the rest of the day.
 * On 503, retries with backoff, then falls back to the other model.
 * @param {Function} fnFactory - Takes a model name, returns a Promise
 * @param {number} maxRetries - Max retries for 503
 */
async function withRetryAndFallback(fnFactory, maxRetries = 2) {
  let lastError;

  // Try up to 2 rounds: primary model, then fallback
  for (let round = 0; round < 2; round++) {
    const modelName = getCurrentModel();

    for (let n = 0; n <= maxRetries; n++) {
      try {
        return await fnFactory(modelName);
      } catch (error) {
        lastError = error;
        const is429 = error.message?.includes("429") ||
                      error.message?.includes("Resource has been exhausted") ||
                      error.message?.includes("Too Many Requests") ||
                      error.message?.includes("RESOURCE_EXHAUSTED");
        const is503 = error.message?.includes("503") ||
                      error.message?.includes("Overloaded") ||
                      error.message?.includes("Service Unavailable");

        if (is429) {
          console.warn(`🚫 Model ${modelName} hit 429 rate limit.`);
          if (modelName !== FALLBACK_MODEL) {
            switchToFallback();
            break; // break inner retry loop → outer loop picks up fallback
          }
          console.error("❌ Fallback model also rate-limited.");
          throw error;
        }

        if (is503 && n < maxRetries) {
          const waitTime = Math.pow(2, n) * 1000;
          console.warn(`⏳ Model ${modelName} overloaded (503). Retrying in ${waitTime}ms... (${n + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // 503 retries exhausted → also try fallback model
        if (is503 && modelName !== FALLBACK_MODEL) {
          console.warn(`🔄 Model ${modelName} still 503 after retries, switching to ${FALLBACK_MODEL}`);
          switchToFallback();
          break;
        }

        throw error;
      }
    }
  }
  throw lastError;
}

export async function analyzeFoodImage(base64Image, language = 'zh') {
  if (!API_KEY) {
    throw new Error("Missing Gemini API Key");
  }

  return withRetryAndFallback((modelName) => {
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: { temperature: 0 }
    });

    const langDisplay = language === 'zh' ? 'Traditional Chinese' : 'English';
    const customPrompt = `Analyze this food image. Estimate calories and protein (g). Return strictly a JSON object in ${langDisplay} with exactly these fields:
{
  "dish_name": string,       // Food name
  "calories": number,        // Estimated total calories (kcal)
  "protein": number,         // Estimated total protein (g)
  "water": number,           // Estimated water intake (ml)
  "description": string,     // A short food description
  "fun_fact": string,        // An interesting and useful food health/nutrition fact (serious, under 50 words)
  "roast": string            // A humorous and slightly sarcastic remark, like a witty friend (funny, under 50 words)
}
Only return the JSON object, no markdown, no explanation.`;

    return model.generateContent([
      customPrompt,
      {
        inlineData: {
          data: base64Image.split(',')[1],
          mimeType: "image/jpeg",
        },
      },
    ]).then(async (result) => {
      const response = await result.response;
      const text = response.text();
      
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse Gemini response:", text);
        throw new Error("無法解析 AI 回應，請再試一次。");
      }
    });
  });
}

export async function suggestGoals(weight) {
  if (!API_KEY) throw new Error("Missing Gemini API Key");

  return withRetryAndFallback((modelName) => {
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: { temperature: 0 }
    });
    const prompt = `My current weight is ${weight} kg. Based on this, suggest a daily calorie goal (kcal), protein goal (g), and water intake goal (ml) for a healthy diet. 
    Notes: 
    - Calorie: approx weight * 30
    - Protein: approx weight * 1.5
    - Water: approx weight * 35 (ml)
    Return strictly a JSON object: { "calories": number, "protein": number, "water": number }.`;

    return model.generateContent(prompt).then(async (result) => {
      const response = await result.response;
      const text = response.text();

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch (e) {
        console.error("Failed to parse goals:", text);
        return { 
          calories: Math.round(weight * 30), 
          protein: Math.round(weight * 1.5),
          water: Math.round(weight * 35)
        };
      }
    });
  });
}

/**
 * Dynamic AI-powered Panda Advice
 */
export async function getPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, language = 'zh') {
  if (!API_KEY) return getLocalPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, language);

  try {
    return await withRetryAndFallback((modelName) => {
      const model = genAI.getGenerativeModel({ 
        model: modelName
      });
      
      const calStatus = (calories / calorieGoal) * 100;
      const proStatus = (protein / proteinGoal) * 100;
      const watStatus = (water / waterGoal) * 100;
      
      const langDisplay = language === 'zh' ? 'Traditional Chinese' : 'English';
      
      const prompt = `Calories: ${calories}/${calorieGoal} (${calStatus.toFixed(0)}%)
Protein: ${protein}/${proteinGoal} (${proStatus.toFixed(0)}%)
Water: ${water}/${waterGoal} (${watStatus.toFixed(0)}%)

You are a sarcastic Panda Coach. Comment on their worst metric.
Output EXACTLY a JSON object with a single key "comment", containing ONE short sentence (max 15 words) in ${langDisplay}.`;

      return model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.8, 
          maxOutputTokens: 60,
          responseMimeType: "application/json"
        }
      }).then(async (result) => {
        const response = await result.response;
        const text = response.text().trim();
        
        let comment = "";
        try {
          const parsed = JSON.parse(text);
          comment = parsed.comment || "吃飽飽才有力氣減肥啦！🐼";
        } catch (e) {
          console.error("Failed to parse Panda Advice JSON:", text);
          comment = "吃飽飽才有力氣減肥啦！🐼";
        }

        // Hard truncate just in case
        const maxLen = language === 'zh' ? 50 : 120;
        if (comment.length > maxLen) {
          comment = comment.slice(0, maxLen) + '…';
        }
        return comment;
      });
    });
  } catch (err) {
    console.error("Dynamic advice failed, falling back to local:", err);
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
      over_cal: "哎呀，今天吃得有點熱情喔！明天再努力調整吧！🐼"
    },
    en: {
      low_water: "Drink more water! Your body is thirsty 💧",
      zero_cal: "Don't be shy, eat something! 🐼",
      low_cal: "Halfway there, a little more won't hurt! 🐼",
      mid_cal: "Almost at the goal, you're doing great! 🐼",
      goal_reached: "Perfect! You're a diet expert today! 🐼",
      over_cal: "Oops, a bit too enthusiastic today! Let's adjust tomorrow! 🐼"
    }
  }[language];
  
  if (waterPercent < 40) return advice.low_water;
  if (calPercent === 0) return advice.zero_cal;
  if (calPercent < 50) return advice.low_cal;
  if (calPercent < 90) return advice.mid_cal;
  if (calPercent <= 100) return advice.goal_reached;
  return advice.over_cal;
}
