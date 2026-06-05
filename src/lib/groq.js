import { db } from "../db";
import { Groq } from 'groq-sdk';

function getPersonaInstruction() {
  const activePersona = typeof localStorage !== 'undefined' ? localStorage.getItem('panda_active_persona') || 'tsundere' : 'tsundere';
  
  if (activePersona === 'gentle') {
    return `Persona style: Sweet, gentle, incredibly supportive, and healing partner (無比溫柔、體貼、溫馨且鼓勵感滿滿的療癒小幫手). Praise the user for recording, show empathy, and encourage them with a warm, caring tone. NEVER use harsh or mean words, and write your roast/comment in a supportive, comforting way.`;
  }
  if (activePersona === 'hardcore') {
    return `Persona style: Fiery, energetic, hardcore gym personal trainer (熱血、鐵血健身教練). Shout at them (use exclamation marks like '動起來！', '再一下！', '給我加油！'), use fitness/gym slang, and push them aggressively to hit their protein, carb, fat, and water targets. Roast them strictly like a drill sergeant.`;
  }
  // Default is 'tsundere'
  return `Persona style: Tsundere Elite Registered Dietitian. Witty, professional, highly sarcastic and tsundere (毒舌且傲嬌，口嫌體正直，雖然犀利吐槽但給予專家建議與貼心叮嚀).`;
}

// Fallback / default values
const DEFAULT_API_KEY = import.meta.env.VITE_GROK_KEY;

// Models requested by the user
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL = "qwen/qwen3-32b";

/**
 * Get the API key (user-provided in IndexedDB or from env)
 */
async function getApiKey() {
  const userKeyEntry = await db.settings.get('user_api_key');
  let userKey = userKeyEntry ? userKeyEntry.value : null;
  
  // If the key doesn't start with 'gsk_', it's a legacy key (like SiliconFlow). We ignore it to fallback to VITE_GROK_KEY.
  if (userKey && !userKey.trim().startsWith('gsk_')) {
    userKey = null;
  }

  const apiKey = (userKey && userKey.trim()) || DEFAULT_API_KEY;

  if (!apiKey) {
    throw new Error("Missing Groq API Key. Please provide it in settings or environment.");
  }
  return apiKey;
}

/**
 * Get configured Groq client instance
 */
async function getGroqClient() {
  const apiKey = await getApiKey();
  return new Groq({
    apiKey,
    dangerouslyAllowBrowser: true
  });
}

/**
 * Call Groq chat completions API
 */
async function callGroq(modelName, messages, options = {}) {
  const { temperature = 0, maxTokens = 500, jsonMode = false } = options;
  
  const client = await getGroqClient();

  const body = {
    model: modelName,
    messages,
    temperature,
    max_completion_tokens: maxTokens,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  console.log(`🚀 [AI Service] Calling Groq: ${modelName}`);

  const completion = await client.chat.completions.create(body);
  const text = completion.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty AI response");

  return text;
}

/**
 * Analyze food image using Groq vision model.
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
  const customPrompt = `STRICT: DIRECT JSON ONLY. NO PREAMBLE. 
${getPersonaInstruction()}
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

  // Build base64 image URL for Groq vision
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

  const text = await callGroq(VISION_MODEL, messages, {
    temperature: 0,
    maxTokens: 1024, // Use 1024 as in user example for completions output token limit
  });

  try {
    const lastBrace = text.lastIndexOf('}');
    const firstBrace = text.indexOf('{');
    let parsed;
    if (lastBrace !== -1 && firstBrace !== -1) {
      parsed = JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } else {
      parsed = JSON.parse(text);
    }
    if (parsed && !parsed.dish_name) {
      parsed.dish_name = language === 'zh' ? "未偵測到食物" : "No food detected";
    }
    return parsed;
  } catch (e) {
    console.error("Parse Error. Raw text:", text);
    throw new Error(language === 'zh' ? "無法解析 AI 回應。" : "Failed to parse AI response.");
  }
}

/**
 * Estimate food nutrition from a text-only prompt (e.g. McDonald's Big Mac) using Groq.
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
  const customPrompt = `STRICT: DIRECT JSON ONLY. NO PREAMBLE. NO FENCED CODEBLOCKS.
${getPersonaInstruction()}
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

  const text = await callGroq(TEXT_MODEL, [
    { role: 'user', content: customPrompt }
  ], {
    temperature: 0.2,
    maxTokens: 1024,
    jsonMode: true
  });

  try {
    const lastBrace = text.lastIndexOf('}');
    const firstBrace = text.indexOf('{');
    let parsed;
    if (lastBrace !== -1 && firstBrace !== -1) {
      parsed = JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } else {
      parsed = JSON.parse(text);
    }
    if (parsed && !parsed.dish_name) {
      parsed.dish_name = language === 'zh' ? "未偵測到食物" : "No food detected";
    }
    return parsed;
  } catch (e) {
    console.error("Parse Error. Raw text:", text);
    throw new Error(language === 'zh' ? "無法解析 AI 回應。" : "Failed to parse AI response.");
  }
}

/**
 * Suggest daily nutrition goals based on weight.
 */
export async function suggestGoals(weight) {
  const messages = [
    {
      role: 'user',
      content: `My weight is ${weight} kg. Suggest daily calorie goal (kcal), protein (g), and water (ml). Return strictly a JSON object: { "calories": number, "protein": number, "water": number }.`
    }
  ];

  try {
    const text = await callGroq(TEXT_MODEL, messages, {
      temperature: 0,
      maxTokens: 200,
    });

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
}

/**
 * Get Panda Coach advice.
 */
export async function getPandaAdvice(calories, calorieGoal, protein, proteinGoal, water, waterGoal, foodLogs = [], language = 'zh', userName = '') {
  // Overload: If the first argument is a string, treat it as a raw prompt
  if (typeof calories === 'string') {
    // Prepend active persona style to color custom prompt tasks
    const customPrompt = `${getPersonaInstruction()}\n\nTask: ${calories}`;
    return await completeText(customPrompt, { temperature: 0.3, maxTokens: 1024 });
  }

  try {
    const calStatus = (calories / calorieGoal) * 100;
    const foodStrip = foodLogs.map(l => l.dish_name).join(', ');
    const langDisplay = language === 'zh' ? 'Traditional Chinese' : 'English';

    const prompt = `${getPersonaInstruction()}
    Status: Cal:${calories}/${calorieGoal}(${calStatus.toFixed(0)}%), Pro:${protein}/${proteinGoal}g, Water:${water}/${waterGoal}ml. User: ${userName || 'User'}.
    History: ${foodStrip || 'None'}
    Task: Expert evaluation + 1 specific tip. Tone: Evidence-based, expert, matching the selected persona style. Max 45 words.
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
  const messages = [{ role: 'user', content: prompt }];
  const text = await callGroq(TEXT_MODEL, messages, options);
  // Clean up: Remove any word counts or metadata in brackets like (26字)
  const cleaned = text.trim().split('\n').pop().replace(/\(.*?\)|（.*?）/g, '').replace(/^["'「]+|["'」]+$/g, '').trim();
  return cleaned;
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
