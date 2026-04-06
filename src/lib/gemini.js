import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export async function analyzeFoodImage(base64Image) {
  if (!API_KEY) {
    throw new Error("Missing Gemini API Key");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-lite" });

  const customPrompt = `Analyze this food image. Estimate calories and protein (g). Return strictly a JSON object in Traditional Chinese: { "dish_name": string, "calories": number, "protein": number, "description": string }.`;

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
  
  // Extract JSON from the response text (it might be wrapped in markdown code blocks)
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

export function getPandaAdvice(calories, calorieGoal, protein, proteinGoal) {
  const calPercent = (calories / calorieGoal) * 100;
  
  if (calPercent === 0) return "別害羞，快吃點東西補補！🐼";
  if (calPercent < 50) return "進度才一半，再吃一點點沒關係的！🐼";
  if (calPercent < 90) return "接近目標了，你是最棒的！🐼";
  if (calPercent <= 100) return "完美達標！今天你就是飲食達人！🐼";
  return "哎呀，今天吃得有點熱情喔！明天再努力調整吧！🐼";
}
