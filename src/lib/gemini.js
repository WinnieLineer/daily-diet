import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const GOAL_PI_MODEL = "gemini-3.1-flash-lite-preview";

export async function analyzeFoodImage(base64Image) {
  if (!API_KEY) {
    throw new Error("Missing Gemini API Key");
  }
  const model = genAI.getGenerativeModel({ 
    model: GOAL_PI_MODEL,
    generationConfig: { temperature: 0 }
  });

  const customPrompt = `Analyze this food image. Estimate calories and protein (g). Return strictly a JSON object in Traditional Chinese with exactly these fields:
{
  "dish_name": string,       // 食物名稱
  "calories": number,        // 估計總熱量（kcal）
  "protein": number,         // 估計總蛋白質（g）
  "description": string,     // 一句簡短的食物描述
  "fun_fact": string,        // 一句有趣又實用的食物健康/營養小知識（認真的，50字以內）
  "roast": string            // 一句幽默又賤的吐槽，像嘴賤朋友在旁邊碎念（要好笑，50字以內）
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
}

export async function suggestGoals(weight) {
  if (!API_KEY) throw new Error("Missing Gemini API Key");
  const model = genAI.getGenerativeModel({ 
    model: GOAL_PI_MODEL,
    generationConfig: { temperature: 0 }
  });
  const prompt = `My current weight is ${weight} kg. Based on this, suggest a daily calorie goal (kcal) and protein goal (g) for a healthy diet. Return strictly a JSON object: { "calories": number, "protein": number }.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (e) {
    console.error("Failed to parse goals:", text);
    // Fallback logic
    return { calories: Math.round(weight * 30), protein: Math.round(weight * 1.5) };
  }
}

export function getPandaAdvice(calories, calorieGoal, protein, proteinGoal) {
  const calPercent = (calories / calorieGoal) * 100;
  
  if (calPercent === 0) return "別害羞，快吃點東西補補！🐼";
  if (calPercent < 50) return "進度才一半，再吃一點點沒關係的！🐼";
  if (calPercent < 90) return "接近目標了，你是最棒的！🐼";
  if (calPercent <= 100) return "完美達標！今天你就是飲食達人！🐼";
  return "哎呀，今天吃得有點熱情喔！明天再努力調整吧！🐼";
}

