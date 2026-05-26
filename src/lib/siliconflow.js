import { db } from "../db";

// Fallback values
const DEFAULT_API_KEY = import.meta.env.VITE_SILICONFLOW_API_KEY;
const API_BASE = "https://api.siliconflow.com/v1/chat/completions";

// Vision-capable models (for image analysis)
const VISION_MODELS = [
  "Qwen/Qwen3.6-35B-A3B",
  "Qwen/Qwen3.6-27B",
  "Qwen/Qwen3.5-122B-A10B",
];

// Text-only models (for advice / goal suggestions)
const TEXT_MODELS = [
  "deepseek-ai/DeepSeek-V3"
];

/**
 * Get the API key (user-provided or env)
 */
async function getApiKey() {
  const userKeyEntry = await db.settings.get('user_api_key');
  const userKey = userKeyEntry ? userKeyEntry.value : null;
  const apiKey = (userKey && userKey.trim()) || DEFAULT_API_KEY;

  if (!apiKey) throw new Error("Missing SiliconFlow API Key. Please provide it in settings or environment.");
  return apiKey;
}

/**
 * Call SiliconFlow chat completions API
 */
async function callSiliconFlow(apiKey, modelName, messages, options = {}) {
  const { temperature = 0, maxTokens = 500, jsonMode = false } = options;

  const body = {
    model: modelName,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };

  // SiliconFlow supports JSON mode via response_format
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  console.log(`🚀 [AI Service] Calling SiliconFlow: ${modelName}`);

  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || errData.message || response.statusText;
    throw new Error(`AI API Error (${response.status}): ${errMsg}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty AI response");

  return text;
}

/**
 * Retry helper with model fallback on 429/503/500.
 */
async function withRetryAndFallback(modelChain, fnFactory, maxRetries = 2) {
  let lastError;
  const apiKey = await getApiKey();

  for (let chainIndex = 0; chainIndex < modelChain.length; chainIndex++) {
    const modelName = modelChain[chainIndex];
    for (let n = 0; n <= maxRetries; n++) {
      try {
        return await fnFactory(apiKey, modelName);
      } catch (error) {
        lastError = error;
        const errMsg = error.message || "";
        const is429 = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("rate");
        const is503 = errMsg.includes("503") || errMsg.includes("Overloaded") || errMsg.includes("Service Unavailable");
        const is500 = errMsg.includes("500") || errMsg.includes("Internal Server Error");

        // 500 → switch model immediately
        if (is500) {
          console.warn(`[AI Service] Model ${modelName} returned 500. Switching...`);
          break;
        }

        // 429/503 → retry with backoff, then switch model
        if ((is429 || is503) && n < maxRetries) {
          const waitTime = Math.pow(2, n) * 2000;
          console.warn(`[AI Service] Rate limited. Waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (is429 || is503) {
          console.warn(`[AI Service] Exhausted retries for ${modelName}. Switching...`);
          break;
        }

        throw error;
      }
    }
  }
  throw lastError;
}

/**
 * Analyze food image using SiliconFlow vision model.
 */
export async function analyzeFoodImage(base64Image, context = {}, language = 'zh') {
  return withRetryAndFallback(VISION_MODELS, async (apiKey, modelName) => {
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
If NO FOOD is detected: Still return a JSON object with dish_name indicating no food was detected, 0 for all numbers, and a sarcastic roast about missing food.

CRITICAL: Output all text fields in ${langDisplay}.
- dish_name: Accurate name.
- description: Brief nutritional overview.
- fun_fact: Science-based nutritional fact.
- roast: Sarcastic but expert-level nutritional burn.
- panda_comment: Professional nutritionist's evaluation with one actionable tip (Max 35 words).
- carbs: Estimated carbohydrates in grams (g) as a number.
- fat: Estimated fat in grams (g) as a number.

Context: ${timeContext}, User: ${userName || 'User'}, Cal:${calories}/${calorieGoal}, Pro:${protein}/${proteinGoal}
History (Already eaten today): ${foodStrip || 'None'}

Schema: {dish_name, calories, protein, water, carbs, fat, description, fun_fact, roast, panda_comment}
STRICT: Occasionally use the user's name (${userName}) naturally in the roast or panda_comment.`;

    // Build base64 image URL for SiliconFlow vision
    const imageData = base64Image.startsWith('data:')
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageData,
              detail: 'low'
            }
          },
          {
            type: 'text',
            text: customPrompt
          }
        ]
      }
    ];

    const text = await callSiliconFlow(apiKey, modelName, messages, {
      temperature: 0,
      maxTokens: 4096,
    });

    try {
      const lastBrace = text.lastIndexOf('}');
      const firstBrace = text.indexOf('{');
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

/**
 * Estimate food nutrition from a text-only prompt (e.g. McDonald's Big Mac) using DeepSeek-V3.
 */
export async function analyzeFoodText(textInstruction, context = {}, language = 'zh') {
  return withRetryAndFallback(TEXT_MODELS, async (apiKey, modelName) => {
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
    const customPrompt = `STRICT: DIRECT JSON ONLY. NO PREAMBLE. NO FENCED CODEBLOCKS.
Persona: Elite Registered Dietitian.
Task: The user has typed a meal description or product name. Analyze it and estimate its calories, protein, water, carbs, and fat content.
USER INPUT: "${textInstruction}"

CRITICAL Rules:
- If a specific brand or item is named (e.g., "麥當勞大麥克", "7-11茶葉蛋"), find or estimate the exact standard nutritional facts for this specific item.
- Output all text fields in ${langDisplay}.
- dish_name: Accurate name.
- description: Brief nutritional overview.
- fun_fact: Science-based nutritional fact.
- roast: Sarcastic but expert-level nutritional burn.
- panda_comment: Professional nutritionist's evaluation with one actionable tip (Max 35 words).
- carbs: Estimated carbohydrates in grams (g) as a number.
- fat: Estimated fat in grams (g) as a number.

Context: ${timeContext}, User: ${userName || 'User'}, Cal:${calories}/${calorieGoal}, Pro:${protein}/${proteinGoal}
History (Already eaten today): ${foodStrip || 'None'}

Schema: {dish_name, calories, protein, water, carbs, fat, description, fun_fact, roast, panda_comment}
STRICT: Occasionally use the user's name (${userName}) naturally in the roast or panda_comment.`;

    const text = await callSiliconFlow(apiKey, modelName, [
      { role: 'user', content: customPrompt }
    ], {
      temperature: 0.2,
      maxTokens: 1024,
      jsonMode: true
    });

    try {
      const lastBrace = text.lastIndexOf('}');
      const firstBrace = text.indexOf('{');
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

/**
 * Suggest daily nutrition goals based on weight.
 */
export async function suggestGoals(weight) {
  return withRetryAndFallback(TEXT_MODELS, async (apiKey, modelName) => {
    const messages = [
      {
        role: 'user',
        content: `My weight is ${weight} kg. Suggest daily calorie goal (kcal), protein (g), and water (ml). Return strictly a JSON object: { "calories": number, "protein": number, "water": number }.`
      }
    ];

    const text = await callSiliconFlow(apiKey, modelName, messages, {
      temperature: 0,
      maxTokens: 200,
    });

    try {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      }
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

/**
 * Get Panda Coach advice.
 */
export async function getPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, foodLogs = [], language = 'zh', userName = '') {
  // Overload: If the first argument is a string, treat it as a raw prompt
  if (typeof calories === 'string') {
    // Increase to 1024 to accommodate reasoning chain-of-thought tokens + final output
    // Lower temperature to 0.3 for instruct models to ensure clean and correct Traditional Chinese outputs
    return await completeText(calories, { temperature: 0.3, maxTokens: 1024 });
  }

  try {
    const calStatus = (calories / calorieGoal) * 100;
    const foodStrip = foodLogs.map(l => l.dish_name).join(', ');
    const langDisplay = language === 'zh' ? 'Traditional Chinese' : 'English';

    const prompt = `Persona: Elite Dietitian RD. Witty, professional, science-based.
    Status: Cal:${calories}/${calorieGoal}(${calStatus.toFixed(0)}%), Pro:${protein}/${proteinGoal}g, Water:${water}/${waterGoal}ml. User: ${userName || 'User'}.
    History: ${foodStrip || 'None'}
    Task: Expert evaluation + 1 specific tip. Tone: Evidence-based, expert, witty. Max 35 words.
    STRICT: Output ONLY the evaluation sentence in ${langDisplay}. NO JSON.`;

    return await completeText(prompt, {
      temperature: 0.3,
      maxTokens: 1024,
    });
  } catch (err) {
    return getLocalPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, language);
  }
}

/**
 * Generic text completion
 */
export async function completeText(prompt, options = {}) {
  return await withRetryAndFallback(TEXT_MODELS, async (apiKey, modelName) => {
    const messages = [{ role: 'user', content: prompt }];
    const text = await callSiliconFlow(apiKey, modelName, messages, options);
    // Clean up: Remove any word counts or metadata in brackets like (26字)
    const cleaned = text.trim().split('\n').pop().replace(/\(.*?\)|（.*?）/g, '').replace(/^["'「]+|["'」]+$/g, '').trim();
    return cleaned;
  });
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
