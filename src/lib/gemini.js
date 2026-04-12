import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const GOAL_PI_MODEL = "gemini-3.1-flash-lite-preview";

/**
 * Exponential Backoff helper
 * @param {Function} fn - The async function to retry
 * @param {number} maxRetries - Maximum number of retries
 */
async function withRetry(fn, maxRetries = 3) {
  let lastError;
  for (let n = 0; n <= maxRetries; n++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // 503 is often "Service Unavailable" or "Overloaded"
      // We also check for broad "fetch" or "network" errors which might be 503s in disguise
      const isOverloaded = error.message?.includes("503") || 
                           error.message?.includes("Overloaded") || 
                           error.message?.includes("Service Unavailable");
      
      if (isOverloaded && n < maxRetries) {
        const waitTime = Math.pow(2, n) * 1000;
        console.warn(`Gemini overloaded (503). Retrying in ${waitTime}ms... (Attempt ${n + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function analyzeFoodImage(base64Image, language = 'zh') {
  if (!API_KEY) {
    throw new Error("Missing Gemini API Key");
  }

  return withRetry(async () => {
    const model = genAI.getGenerativeModel({ 
      model: GOAL_PI_MODEL,
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

    const result = await model.generateContent([
      customPrompt,
      {
        inlineData: {
          data: base64Image.split(',')[1],
          mimeType: "image/jpeg",
        },
      },
    ]);

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
}

export async function suggestGoals(weight) {
  if (!API_KEY) throw new Error("Missing Gemini API Key");

  return withRetry(async () => {
    const model = genAI.getGenerativeModel({ 
      model: GOAL_PI_MODEL,
      generationConfig: { temperature: 0 }
    });
    const prompt = `My current weight is ${weight} kg. Based on this, suggest a daily calorie goal (kcal), protein goal (g), and water intake goal (ml) for a healthy diet. 
    Notes: 
    - Calorie: approx weight * 30
    - Protein: approx weight * 1.5
    - Water: approx weight * 35 (ml)
    Return strictly a JSON object: { "calories": number, "protein": number, "water": number }.`;

    const result = await model.generateContent(prompt);
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
}

/**
 * Dynamic AI-powered Panda Advice
 */
export async function getPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, language = 'zh') {
  if (!API_KEY) return getLocalPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, language);

  try {
    return await withRetry(async () => {
      const model = genAI.getGenerativeModel({ 
        model: GOAL_PI_MODEL,
        generationConfig: { temperature: 0.8 } // A bit of creativity
      });
      
      const calStatus = (calories / calorieGoal) * 100;
      const proStatus = (protein / proteinGoal) * 100;
      const watStatus = (water / waterGoal) * 100;
      
      const langDisplay = language === 'zh' ? 'Traditional Chinese' : 'English';
      
      const prompt = `You are a witty, slightly sarcastic, but helpful Panda Coach for a fitness app. 
      Today's Stats for the user:
      - Calories: ${calories}/${calorieGoal} kcal (${calStatus.toFixed(1)}%)
      - Protein: ${protein}/${proteinGoal} g (${proStatus.toFixed(1)}%)
      - Water: ${water}/${waterGoal} ml (${watStatus.toFixed(1)}%)
      
      Give a ONE-SENTENCE, PUNCHY, and CHARACTER-DRIVEN comment in ${langDisplay} about their progress. 
      Be supportive if they are doing well, and wittily firm if they are lacking. 
      Mention specific metrics if they are particularly good or bad.
      Do not use more than 20 words.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim().replace(/^"|"$/g, '');
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
