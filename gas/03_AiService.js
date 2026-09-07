/**
 * ========================================================
 * 03_AiService.js - Gemini AI 辨識、語意分析、體態目標與防盜刷
 * ========================================================
 */

// ========================================================
// 🎭 教練性格與語氣提示字元
// ========================================================

function getPersonaInstruction(persona, lang = 'zh') {
  const isEn = lang === 'en';
  if (persona === 'gentle') {
    return isEn
      ? `Persona Style: Sweet, gentle, supportive, and healing partner panda. Praise the user warmly, show great empathy, encourage them with a tender tone, and never use harsh words.`
      : `Persona Style: 溫柔療癒小幫手熊貓。語氣無比溫柔、體貼、溫馨且鼓勵感滿滿，誇獎用戶，充滿同理心，絕不使用嚴厲批評字眼。`;
  }
  if (persona === 'hardcore') {
    return isEn
      ? `Persona Style: Fiery, energetic, hardcore gym personal trainer panda. Push strictly like an intense fitness coach, use fitness slang ('Let's move!', 'Burn off those excess calories!', 'One more set!'), and demand strict discipline.`
      : `Persona Style: 熱血鐵血健身教練熊貓。嚴格督促如魔鬼士官長，使用健身熱血用語（'動起來！'、'把熱量燃燒掉！'、'再一組！'），要求嚴格自律。`;
  }
  // 預設: 傲嬌毒舌 (tsundere)
  return isEn
    ? `Persona Style: Tsundere Elite Registered Dietitian panda. Witty, slightly sharp-tongued, sarcastic, but genuinely caring deep down (tough love; gives a witty critique followed by 1 actionable, expert nutritional improvement tip).`
    : `Persona Style: 傲嬌毒舌菁英營養師熊貓。機智毒舌但專業，口嫌體正直，犀利吐槽但給予專家飲食建議與 1 個具體改善叮嚀。`;
}

function generateFallbackComment(dishName, calories, protein, persona = 'tsundere', lang = 'zh') {
  if (lang === 'en') {
    if (persona === 'gentle') {
      if (calories > 700) return `That was quite a hearty meal! Drink plenty of water and enjoy some greens next meal 🐼💚`;
      if (protein >= 25) return `Great protein boost! You're taking wonderful care of your body today, keep it up 🐼✨`;
      if (calories < 300) return `A light meal! Remember to stay hydrated and grab a healthy snack if you feel hungry 🐼🌸`;
      return `Logged "${dishName}" for you! Enjoy every bite and remember to stay hydrated 🐼`;
    }
    if (persona === 'hardcore') {
      if (calories > 700) return `Over ${calories} kcal! Drop and give me squats to burn that excess energy off! 🔥💪`;
      if (protein >= 25) return `${protein}g protein! That's what I'm talking about—fueling those muscles! 🏋️‍♂️`;
      if (calories < 300) return `Eating like a bird won't give you gym power! Fuel up with real protein next meal! 👊`;
      return `Logged! Now don't just sit on the couch—time to move! 🔥`;
    }
    // tsundere
    if (calories > 700) return `Whoa, ${calories} kcal?! Drink some water and redeem yourself with veggies next meal! 🐼`;
    if (protein >= 25) return `${protein}g protein... acceptable. But don't think you can slack off on sweets now! 🐼`;
    if (calories < 300) return `Barely eating? You want to lose muscle? Eat real food next time! 🐼`;
    return `Fine, I logged "${dishName}" for you. Don't forget your veggies and water! 🐼`;
  }

  if (persona === 'gentle') {
    if (calories > 700) return `這餐份量很充足呢！記得多喝水幫助代謝，下一餐可以多吃點綠色蔬菜喔 🐼💚`;
    if (protein >= 25) return `蛋白質補充得很棒呢！你今天也很用心照顧自己的身體，繼續加油喔 🐼✨`;
    if (calories < 300) return `吃得比較輕量呢，如果容易餓記得隨時補充健康小點心與水分喔 🐼🌸`;
    return `已經為你記錄好「${dishName}」囉！每一餐都要好好享受，記得補充水分 🐼`;
  }
  if (persona === 'hardcore') {
    if (calories > 700) return `熱量破 ${calories} 大卡了！等下給我深蹲跳繩把多餘熱量全部燃燒掉！🔥💪`;
    if (protein >= 25) return `蛋白質有 ${protein}g 非常到位！肌肉正在修復生長，繼續保持這個訓練強度！🏋️‍♂️`;
    if (calories < 300) return `吃這麼少哪來的力氣重訓？下一餐給我把優質碳水和蛋白質補齊！👊`;
    return `紀錄完畢！吃飽了就別躺在沙發上偷懶，準備動起來！🔥`;
  }
  // tsundere (預設)
  if (calories > 700) return `熱量居然飆到 ${calories} 大卡…哼，等下別忘了多喝水，下一餐多吃點青菜贖罪！🐼`;
  if (protein >= 25) return `蛋白質有 ${protein}g 算你過關啦，可別以為這樣就能放肆偷吃甜點喔！🐼`;
  if (calories < 300) return `吃這麼少是想成仙嗎？小心掉肌肉，下一餐給我好好吃正餐！🐼`;
  return `哼，勉強幫你記下「${dishName}」了，下一餐記得多補充點蔬菜跟水分！🐼`;
}

// ========================================================
// 📸 Gemini 多模態照片辨識
// ========================================================

function analyzeMealWithGemini(base64Image, apiKey, userId, props, userGistId, pat) {
  const models = (typeof PRIMARY_GEMINI_MODELS !== 'undefined' && PRIMARY_GEMINI_MODELS.length) 
    ? PRIMARY_GEMINI_MODELS 
    : ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.7-flash'];

  const userPersona = getUserPersona(userId, props, userGistId, pat);
  const userLang = getUserLanguage(userId, props, userGistId, pat);
  const isEn = userLang === 'en';
  const personaInstruction = getPersonaInstruction(userPersona, userLang);

  const langDirective = isEn 
    ? `🚨 STRICT MULTILINGUAL MANDATE: The user interface is strictly set to ENGLISH.
ALL fields ("dish_name", "breakdown", "calculation_note", "panda_comment") MUST be written 100% in natural ENGLISH.
DO NOT use any Chinese characters (neither Traditional nor Simplified), even if the food in the photo is Taiwanese, Chinese, Japanese, or Asian, or contains Chinese packaging. Translate all food names and concepts to English (e.g. "Braised Pork Rice with Boiled Egg", "Fried Chicken Cutlet Bento").
- "dish_name": English name of the meal.
- "breakdown": item names and portion estimates strictly in English.
- "calculation_note": full calculation formula strictly in English (e.g. Fried chicken ~380 kcal + White rice ~220 kcal = 600 kcal).
- "panda_comment": strictly under 35 English words, in your designated persona style, entirely in English.`
    : `LANGUAGE REQUIREMENT: Output strictly in TRADITIONAL CHINESE (繁體中文).
- "dish_name": 餐點名稱 (繁體中文).
- "breakdown": 食材名稱與份量估算 (繁體中文).
- "calculation_note": 計算公式簡述 (繁體中文，例如: 炸雞腿1支約380卡 + 白飯1碗約220卡 + 炒高麗菜約50卡 = 總計650卡).
- "panda_comment": 繁體中文 35 字以內，符合性格設定。`;

  const schemaBlock = isEn
    ? `{
  "dish_name": "Meal Name in English",
  "calories": <integer calories in kcal, 0 if unknown>,
  "protein": <integer protein in grams, 0 if unknown>,
  "carbs": <integer estimated carbohydrates in grams, 0 if unknown>,
  "fat": <integer estimated total fat in grams, 0 if unknown>,
  "water": <integer estimated water/liquid intake in ml, e.g. 500 for soup/beverage, or 0 if dry food>,
  "breakdown": [
    {
      "name": "Item name in English (e.g. Grilled chicken breast, Steamed broccoli)",
      "portion": "Estimated portion in English (e.g. 1 breast ~180g, 1 cup ~120g)",
      "calories": <integer calories in kcal>,
      "protein": <integer protein in grams>
    }
  ],
  "calculation_note": "Calculation process in English (e.g. Grilled chicken 260 kcal + Broccoli 35 kcal = 295 kcal)",
  "panda_comment": "<Concise, witty, critical nutritional evaluation matching selected persona in English, max 35 words>"
}`
    : `{
  "dish_name": "餐點名稱 (繁體中文)",
  "calories": <integer calories in kcal, 0 if unknown>,
  "protein": <integer protein in grams, 0 if unknown>,
  "carbs": <integer estimated carbohydrates in grams, 0 if unknown>,
  "fat": <integer estimated total fat in grams, 0 if unknown>,
  "water": <integer estimated water/liquid intake in ml, e.g. 500 for soup/beverage, or 0 if dry food>,
  "breakdown": [
    {
      "name": "食材/餐點品項名稱 (e.g. 炸雞腿, 白飯, 炒青菜)",
      "portion": "估計份量 (e.g. 1 支約 180g, 1 碗約 160g)",
      "calories": <integer calories in kcal>,
      "protein": <integer protein in grams>
    }
  ],
  "calculation_note": "計算過程簡述 (繁體中文, e.g. 炸雞腿1支約380卡 + 白飯1碗約220卡 + 炒高麗菜約50卡 = 總計650卡)",
  "panda_comment": "<Concise, witty, critical nutritional evaluation matching selected persona in Traditional Chinese, max 35 characters>"
}`;

  const prompt = `You are a professional nutrition expert panda. Analyze this food image. Return STRICTLY a raw JSON object. NO MARKDOWN.
${personaInstruction}
${langDirective}

CRITICAL NUTRITIONAL EVALUATION RULES FOR "panda_comment":
1. NEVER give generic polite compliments. Never say generic "looks balanced" unless the meal truly contains high dietary fiber/vegetables, lean quality protein, and unprocessed complex carbs.
2. Critically inspect the meal:
   - High oil / deep-fried / greasy / high sodium: roast the grease/sodium in character, warn about excess fat calories, and demand drinking water.
   - High refined sugar / dessert / sweet beverage: roast the blood sugar spike and lack of satiety.
   - Heavy carbs with little protein/veg: point out the muscle-wasting protein deficit and lack of fiber.
   - High protein: acknowledge the good protein intake in character, but check if veggies/fiber are missing.
   - If truly balanced: praise specific good components.
3. Provide EXACTLY 1 actionable, practical improvement tip for the next meal or rest of the day.

Required Schema:
${schemaBlock}`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json"
    }
  };

  let lastError = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      if (res.getResponseCode() !== 200) {
        if (typeof recordAiUsage === 'function') recordAiUsage(model, false, props, `HTTP ${res.getResponseCode()}: ${res.getContentText().slice(0, 100)}`, { userId: userId, operation: '照片辨識' });
        throw new Error(res.getContentText());
      }

      const data = JSON.parse(res.getContentText());
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (typeof recordAiUsage === 'function') recordAiUsage(model, true, props);

      const dishName = parsed.dish_name || (isEn ? "Delicious Meal" : "美味餐點");
      const cal = Number(parsed.calories) || 0;
      const pro = Number(parsed.protein) || 0;
      const carbs = Number(parsed.carbs) || 0;
      const fat = Number(parsed.fat) || 0;
      const water = Number(parsed.water) || 0;
      const breakdown = Array.isArray(parsed.breakdown) ? parsed.breakdown : [];
      let calculationNote = parsed.calculation_note || '';
      if (isEn && /[\u4e00-\u9fa5]/.test(calculationNote)) {
        calculationNote = `${dishName} ~${cal} kcal, ${pro}g protein`;
      }
      let comment = (parsed.panda_comment && parsed.panda_comment.trim()) ? parsed.panda_comment.trim() : '';
      if (isEn && /[\u4e00-\u9fa5]/.test(comment)) {
        console.warn("⚠️ [AiService] Detected Chinese in panda_comment under English mode! Sanitizing to English fallback:", comment);
        comment = generateFallbackComment(dishName, cal, pro, userPersona, 'en');
      }
      if (!comment) {
        comment = generateFallbackComment(dishName, cal, pro, userPersona, userLang);
      }

      return {
        dish_name: dishName,
        calories: cal,
        protein: pro,
        carbs: carbs,
        fat: fat,
        water: water,
        breakdown: breakdown,
        calculation_note: calculationNote,
        panda_comment: comment
      };
    } catch (err) {
      lastError = err;
      if (typeof recordAiUsage === 'function') recordAiUsage(model, false, props, err.message, { userId: userId, operation: '照片辨識' });
    }
  }
  throw new Error(`Gemini 辨識失敗：${lastError?.message || '未知錯誤'}`);
}

// ========================================================
// 💬 Gemini 文字/語音輸入自然語言分析
// ========================================================

function parseTextWithGemini(text, apiKey, userId, props, userGistId, pat) {
  const models = (typeof PRIMARY_GEMINI_MODELS !== 'undefined' && PRIMARY_GEMINI_MODELS.length) 
    ? PRIMARY_GEMINI_MODELS 
    : ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.7-flash'];

  const userPersona = getUserPersona(userId, props, userGistId, pat);
  const userLang = getUserLanguage(userId, props, userGistId, pat);
  const isEn = userLang === 'en';
  const personaInstruction = getPersonaInstruction(userPersona, userLang);

  const langDirective = isEn 
    ? `🚨 STRICT MULTILINGUAL MANDATE: The user interface is strictly set to ENGLISH.
ALL fields ("dish_name", "breakdown", "calculation_note", "panda_comment", "reply") MUST be written 100% in natural ENGLISH.
DO NOT use any Chinese characters, even if the user typed in Chinese (e.g. if user typed "排骨便當", translate to "Pork Chop Bento" and evaluate in English).
- "dish_name": English name of the meal.
- "breakdown": item names and portion estimates strictly in English.
- "calculation_note": full calculation formula strictly in English.
- "panda_comment": strictly under 35 English words, in your designated persona style, entirely in English.
- "reply": strictly in English, matching selected persona.`
    : `LANGUAGE REQUIREMENT: Output strictly in TRADITIONAL CHINESE (繁體中文).
- "dish_name": 餐點名稱 (繁體中文).
- "breakdown": 食材名稱與份量估算 (繁體中文).
- "calculation_note": 計算過程簡述 (繁體中文，例如: 陽春麵1碗約350卡 + 滷蛋1顆約75卡 = 總計425卡).
- "panda_comment": 繁體中文 35 字以內，符合性格設定。`;

  const prompt = isEn
    ? `You are a professional nutrition expert panda for a diet tracking app. Analyze this user message: "${text}".
${personaInstruction}
${langDirective}

Determine if the user is describing food, a drink, or a meal they ate/drank.

If it IS food/meal/drink:
Return ONLY raw JSON:
{
  "is_food": true,
  "dish_name": "Meal Name in English",
  "calories": <integer estimated calories in kcal, 0 if unknown>,
  "protein": <integer estimated protein in grams, 0 if unknown>,
  "carbs": <integer estimated carbohydrates in grams, 0 if unknown>,
  "fat": <integer estimated total fat in grams, 0 if unknown>,
  "water": <integer estimated liquid/water intake in ml, e.g. 500 for coffee/tea/water/soup, or 0 if dry food>,
  "breakdown": [
    {
      "name": "Item name in English",
      "portion": "Estimated portion in English (e.g. 1 bowl ~200g)",
      "calories": <integer calories in kcal>,
      "protein": <integer protein in grams>
    }
  ],
  "calculation_note": "Calculation formula in English (e.g. 1 chicken breast ~220 kcal + salad ~60 kcal = total 280 kcal)",
  "panda_comment": "<Critical, witty nutritional evaluation with 1 actionable tip matching selected persona in English, max 35 words. DO NOT generically say balanced unless truly balanced with greens and lean protein>"
}

If it is NOT food (e.g. "XD", laughter, greetings "hello", questions, casual chat):
Return ONLY raw JSON:
{
  "is_food": false,
  "reply": "A friendly, witty Panda reply in English matching selected persona (${userPersona}), reminding the user they can send food photos or type what they ate to log it 🐼"
}
Do NOT wrap in markdown backticks.`
    : `You are a professional nutrition expert panda for a diet tracking app. Analyze this user message: "${text}".
${personaInstruction}
${langDirective}

Determine if the user is describing food, a drink, or a meal they ate/drank.

If it IS food/meal/drink:
Return ONLY raw JSON:
{
  "is_food": true,
  "dish_name": "餐點名稱 (Traditional Chinese)",
  "calories": <integer estimated calories in kcal, 0 if unknown>,
  "protein": <integer estimated protein in grams, 0 if unknown>,
  "carbs": <integer estimated carbohydrates in grams, 0 if unknown>,
  "fat": <integer estimated total fat in grams, 0 if unknown>,
  "water": <integer estimated liquid/water intake in ml, e.g. 500 for coffee/tea/water/soup, or 0 if dry food>,
  "breakdown": [
    {
      "name": "食材/餐點品項名稱 (e.g. 滷蛋, 陽春麵)",
      "portion": "估計份量 (e.g. 1 顆約 50g, 1 碗約 200g)",
      "calories": <integer calories in kcal>,
      "protein": <integer protein in grams>
    }
  ],
  "calculation_note": "計算過程簡述 (e.g. 陽春麵1碗約350卡 + 滷蛋1顆約75卡 = 總計425卡)",
  "panda_comment": "<Critical, witty nutritional evaluation with 1 actionable tip matching selected persona in Traditional Chinese, max 35 characters. DO NOT generically say 營養均衡 unless truly balanced with greens and lean protein>"
}

If it is NOT food (e.g. "XD", laughter, greetings "你好", questions, casual chat):
Return ONLY raw JSON:
{
  "is_food": false,
  "reply": "符合選擇性格（${userPersona}）的繁體中文親切幽默回覆，並提醒可以傳送照片或輸入吃了什麼來記錄 🐼"
}
Do NOT wrap in markdown backticks.`;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, response_mime_type: "application/json" } }),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (typeof recordAiUsage === 'function') recordAiUsage(model, true, props);

        if (parsed.is_food === false) {
          let defaultReply = '';
          if (isEn) {
            defaultReply = userPersona === 'gentle' 
              ? "Hello! I'm your healing nutrition panda 🐼🥰 What delicious food did you have today? Send a photo or tell me what you ate anytime!" 
              : userPersona === 'hardcore' 
              ? "Hey! I'm your drill sergeant panda 🐼🔥 Confess what you ate right now, don't even think about sneaking junk food!" 
              : "Hey there! I'm your AI Panda Coach 🐼 Send meal photos or type what you ate, and I'll keep your nutrition on track!";
          } else {
            defaultReply = userPersona === 'gentle' 
              ? "你好呀～我是你的治癒系熊貓小夥伴 🐼🥰 今天吃了什麼好吃的呢？隨時傳送照片或跟我說喔！" 
              : userPersona === 'hardcore' 
              ? "看什麼看！我是你的魔鬼體態教練熊貓 🐼🔥 還不快點把剛剛吃了什麼如實報上來，休想偷吃垃圾食物！" 
              : "哈囉！我是熊貓飲食小教練 🐼 傳送餐點照片或告訴我吃了什麼，我就能幫你秒速記帳喔！";
          }
          let replyText = (parsed.reply && parsed.reply.trim()) ? parsed.reply.trim() : defaultReply;
          if (isEn && /[\u4e00-\u9fa5]/.test(replyText)) {
            console.warn("⚠️ [AiService] AI returned Chinese chat reply under English mode! Sanitizing to English default reply.");
            replyText = defaultReply;
          }
          return {
            is_food: false,
            reply: replyText
          };
        }

        const dishName = parsed.dish_name || (isEn ? "Meal" : "餐點");
        const cal = Number(parsed.calories) || 0;
        const pro = Number(parsed.protein) || 0;
        const carbs = Number(parsed.carbs) || 0;
        const fat = Number(parsed.fat) || 0;
        const water = Number(parsed.water) || 0;
        const breakdown = Array.isArray(parsed.breakdown) ? parsed.breakdown : [];
        let calculationNote = parsed.calculation_note || '';
        if (isEn && /[\u4e00-\u9fa5]/.test(calculationNote)) {
          calculationNote = `${dishName}: ${cal} kcal, ${pro}g protein`;
        }
        let comment = (parsed.panda_comment && parsed.panda_comment.trim()) ? parsed.panda_comment.trim() : '';
        if (isEn && /[\u4e00-\u9fa5]/.test(comment)) {
          console.warn("⚠️ [AiService] AI returned Chinese comment in text analysis under English mode! Sanitizing to English fallback:", comment);
          comment = generateFallbackComment(dishName, cal, pro, userPersona, 'en');
        }
        if (!comment) {
          comment = generateFallbackComment(dishName, cal, pro, userPersona, userLang);
        }

        return {
          is_food: true,
          dish_name: dishName,
          calories: cal,
          protein: pro,
          carbs: carbs,
          fat: fat,
          water: water,
          breakdown: breakdown,
          calculation_note: calculationNote,
          panda_comment: comment
        };
      } else {
        if (typeof recordAiUsage === 'function') recordAiUsage(model, false, props, `HTTP ${res.getResponseCode()}: ${res.getContentText().slice(0, 100)}`, { userId: userId, operation: '文字記餐' });
      }
    } catch (e) {
      if (typeof recordAiUsage === 'function') recordAiUsage(model, false, props, e.message, { userId: userId, operation: '文字記餐' });
      console.warn("文字辨識解析失敗:", e);
    }
  }

  return {
    is_food: false,
    reply: isEn 
      ? "Panda Coach is having a bit of hiccups 🐼 Please try again in a moment, or send a meal photo!"
      : "熊貓教練剛剛稍微恍神了一下 🐼 請再跟我說一次你吃了什麼，或者直接傳送食物照片給我！"
  };
}

// ========================================================
// 🎯 AI 體態評估與目標推薦
// ========================================================

function handleGoalSettingWithAI(replyToken, userId, userText, userGistId, pat, props, liffId, channelAccessToken, apiKey, lang) {
  const models = (typeof PRIMARY_GEMINI_MODELS !== 'undefined' && PRIMARY_GEMINI_MODELS.length) 
    ? PRIMARY_GEMINI_MODELS 
    : ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.7-flash'];

  const userLang = lang || getUserLanguage(userId, props, userGistId, pat);
  const isEn = userLang === 'en';

  const prompt = isEn 
    ? `You are an expert fitness and nutrition coach panda for a diet tracking app.
The user is sending a message to set/adjust their diet goals or asking for body transformation advice: "${userText}".

Analyze the message to extract or estimate:
- gender ("Male" or "Female", default "Male")
- height (cm, default 170)
- weight (kg, default 65)
- age (years, default 28)
- goal_type: "Fat Loss", "Muscle Gain", "Maintenance", "Fast Cut"
- If user directly gave numerical targets (e.g. 1800 cal 120 pro 2500 water), respect those targets.

Scientific Formulas:
- BMR = 10 * weight + 6.25 * height - 5 * age + (gender === 'Male' ? 5 : -161)
- TDEE = Math.round(BMR * 1.375) (assuming moderate activity)
- Target Calories: 
    Fat Loss: TDEE - 400 ~ 500 kcal
    Muscle Gain: TDEE + 300 ~ 400 kcal
    Maintenance: TDEE
- Target Protein:
    Fat Loss: Math.round(weight * 2.0) g
    Muscle Gain: Math.round(weight * 2.0) g
    Maintenance: Math.round(weight * 1.6) g
- Target Water: Math.round(weight * 35) ml
- panda_advice: English, warm, professional Panda Coach personalized advice (60-100 words), explaining the calorie deficit/surplus, protein and water priorities, and expected progress.

Return ONLY a raw JSON object with keys:
{
  "calories": <integer>,
  "protein": <integer>,
  "water": <integer>,
  "goal_type": "Fat Loss / Muscle Gain / Maintenance",
  "summary": "175cm / 70kg / Male ➔ Fat Loss",
  "bmr": <integer>,
  "tdee": <integer>,
  "panda_advice": "Based on your 70kg weight and fat loss goal, we've planned a 450 kcal daily deficit with 140g protein to preserve muscle. Remember to drink 2500ml water daily to boost metabolism! 🐼"
}
Do NOT wrap in markdown backticks.`
    : `You are an expert fitness and nutrition coach panda for a diet tracking app.
The user is sending a message to set/adjust their diet goals or asking for body transformation advice: "${userText}".

Analyze the message to extract or estimate:
- gender ("男" or "女", default "男")
- height (cm, default 170)
- weight (kg, default 65)
- age (years, default 28)
- goal_type: "減脂" (fat loss), "增肌" (muscle gain), "維持體態" (maintain/recomp), "極速減脂" (fast cut)
- If user directly gave numerical targets (e.g. 1800卡 120蛋 2500水), respect those targets.

Scientific Formulas:
- BMR = 10 * weight + 6.25 * height - 5 * age + (gender === '男' ? 5 : -161)
- TDEE = Math.round(BMR * 1.375) (assuming moderate activity)
- Target Calories: 
    減脂: TDEE - 400 ~ 500 kcal
    增肌: TDEE + 300 ~ 400 kcal
    維持: TDEE
- Target Protein:
    減脂: Math.round(weight * 2.0) g
    增肌: Math.round(weight * 2.0) g
    維持: Math.round(weight * 1.6) g
- Target Water: Math.round(weight * 35) ml
- panda_advice: 繁體中文，溫暖專業的熊貓教練個人化建議（約 60-100 字），說明針對其體型與目標規劃的熱量缺口/盈餘、蛋白質與水分攝取重點、以及預期的體型變化方向。

Return ONLY a raw JSON object with keys:
{
  "calories": <integer>,
  "protein": <integer>,
  "water": <integer>,
  "goal_type": "減脂 / 增肌 / 維持體態",
  "summary": "175cm / 70kg / 男 ➔ 減脂雕塑",
  "bmr": <integer>,
  "tdee": <integer>,
  "panda_advice": "針對您的體重 70kg 與減脂需求，規劃每日熱量缺口約 450 kcal，同時拉高蛋白質至 140g 保留肌肉量。記得每天喝足 2500ml 水分加速代謝喔！🐼"
}
Do NOT wrap in markdown backticks.`;

  for (let i = 0; i < models.length; i++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${models[i]}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (typeof recordAiUsage === 'function') recordAiUsage(models[i], true, props);

        const calories = Number(parsed.calories) || DEFAULT_CALORIE_GOAL;
        const protein = Number(parsed.protein) || DEFAULT_PROTEIN_GOAL;
        const water = Number(parsed.water) || DEFAULT_WATER_GOAL;

        if (isEn && /[\u4e00-\u9fa5]/.test(parsed.panda_advice || '')) {
          console.warn("⚠️ [AiService] AI returned Chinese goal advice under English mode! Replacing with English advice.");
          parsed.panda_advice = `Based on your goal, we've planned a daily intake of ${calories} kcal and ${protein}g protein. Drink ${water}ml water daily to fuel your transformation! 🐼💪`;
        }

        props.setProperty(`CALORIE_GOAL_${userId}`, String(calories));
        props.setProperty(`PROTEIN_GOAL_${userId}`, String(protein));
        props.setProperty(`WATER_GOAL_${userId}`, String(water));

        if (pat && userGistId) {
          try {
            syncGoalsToUserGist({ calories, protein, water }, pat, userGistId);
          } catch (e) {
            console.error("同步目標至 Gist 失敗:", e);
          }
        }

        const goalFlex = generateGoalSettingFlex(parsed, calories, protein, water, liffId, userGistId, userLang);
        replyFlexMessage(replyToken, goalFlex, channelAccessToken, userId, props);
        return true;
      } else {
        if (typeof recordAiUsage === 'function') recordAiUsage(models[i], false, props, `HTTP ${res.getResponseCode()}: ${res.getContentText().slice(0, 100)}`, { userId: userId, operation: '目標推薦' });
      }
    } catch (e) {
      if (typeof recordAiUsage === 'function') recordAiUsage(models[i], false, props, e.message, { userId: userId, operation: '目標推薦' });
      console.error("設定目標失敗:", e);
    }
  }

  const fallbackMsg = isEn
    ? "🐼 Panda Coach Tip: Please tell me your height, weight, gender and goal, e.g.:\n'Set goal 175cm 70kg male fat loss'\nor enter numerical targets directly:\n'Set goal 1800cal 120pro 2500water'"
    : "🐼 熊貓教練提示：請輸入您的身高、體重、性別與目標，例如：\n「改目標 175cm 70kg 男 減脂」\n或直接輸入：「改目標 1800卡 120蛋 2500水」";

  replyTextMessage(replyToken, fallbackMsg, channelAccessToken);
  return false;
}

// ========================================================
// 🌐 Web App 跨端 AI 代理 (Full Nutrition Recognition)
// ========================================================

function analyzeMealWithGeminiFull(base64Image, apiKey, context, language) {
  const models = (typeof PRIMARY_GEMINI_MODELS !== 'undefined' && PRIMARY_GEMINI_MODELS.length) 
    ? PRIMARY_GEMINI_MODELS 
    : ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.7-flash'];

  const langDisplay = language === 'en' ? 'English' : 'Traditional Chinese';
  const prompt = `Analyze this food image. Return STRICTLY a raw JSON object with keys:
"dish_name" (${langDisplay} string),
"calories" (integer kcal),
"protein" (integer grams),
"carbs" (integer carbohydrates grams),
"fat" (integer total fat grams),
"water" (integer liquid ml, 0 if dry food),
"breakdown" (array of objects, each with "name", "portion", "calories", "protein"),
"calculation_note" (string formula in ${langDisplay}),
"description" (${langDisplay} nutritional overview),
"fun_fact" (${langDisplay} science fact),
"roast" (${langDisplay} sarcastic burn),
"panda_comment" (${langDisplay} professional tip, max 35 words).
No markdown backticks.`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json"
    }
  };

  let lastError = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        if (typeof recordAiUsage === 'function') recordAiUsage(model, true);
        return JSON.parse(cleanJson);
      } else {
        if (typeof recordAiUsage === 'function') recordAiUsage(model, false, null, `HTTP ${res.getResponseCode()}: ${res.getContentText().slice(0, 100)}`);
      }
    } catch (err) {
      lastError = err;
      if (typeof recordAiUsage === 'function') recordAiUsage(model, false, null, err.message);
    }
  }
  throw new Error(`Gemini Vision analysis failed: ${lastError?.message || 'Unknown'}`);
}

function parseTextWithGeminiFull(text, apiKey, context, language) {
  const models = (typeof PRIMARY_GEMINI_MODELS !== 'undefined' && PRIMARY_GEMINI_MODELS.length) 
    ? PRIMARY_GEMINI_MODELS 
    : ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.7-flash'];

  const langDisplay = language === 'en' ? 'English' : 'Traditional Chinese';
  const prompt = `You are an expert nutritionist panda. Analyze: "${text}".
Return STRICTLY a raw JSON object with keys:
"dish_name" (${langDisplay}),
"calories" (integer kcal),
"protein" (integer grams),
"carbs" (integer carbohydrates grams),
"fat" (integer total fat grams),
"water" (integer liquid ml),
"description" (${langDisplay}),
"fun_fact" (${langDisplay}),
"roast" (${langDisplay}),
"panda_comment" (${langDisplay}).
No markdown backticks.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json"
    }
  };

  let lastError = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        if (typeof recordAiUsage === 'function') recordAiUsage(model, true);
        return JSON.parse(cleanJson);
      } else {
        if (typeof recordAiUsage === 'function') recordAiUsage(model, false, null, `HTTP ${res.getResponseCode()}: ${res.getContentText().slice(0, 100)}`);
      }
    } catch (err) {
      lastError = err;
      if (typeof recordAiUsage === 'function') recordAiUsage(model, false, null, err.message);
    }
  }
  throw new Error(`Gemini Text analysis failed: ${lastError?.message || 'Unknown'}`);
}

function generateGeminiText(prompt, apiKey) {
  const models = (typeof PRIMARY_GEMINI_MODELS !== 'undefined' && PRIMARY_GEMINI_MODELS.length) 
    ? PRIMARY_GEMINI_MODELS 
    : ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.7-flash'];

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3 }
  };
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        if (typeof recordAiUsage === 'function') recordAiUsage(model, true);
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        if (typeof recordAiUsage === 'function') recordAiUsage(model, false, null, `HTTP ${res.getResponseCode()}: ${res.getContentText().slice(0, 100)}`);
      }
    } catch (e) {
      if (typeof recordAiUsage === 'function') recordAiUsage(model, false, null, e.message);
    }
  }
  return '繼續保持健康飲控節奏喔！🐼✨';
}

// ========================================================
// 🛡️ Web App 安全簽章校驗
// ========================================================

function verifyWebAIRequest(data, e) {
  const WEB_AI_SECRET = "DD_WEB_AI_SECURE_KEY_2026";
  const client = data?.client || e?.parameter?.client;
  const timestamp = Number(data?.timestamp || e?.parameter?.timestamp);
  const nonce = data?.nonce || e?.parameter?.nonce;
  const appToken = data?.appToken || e?.parameter?.appToken;

  if (client !== 'daily-diet-web' || !timestamp || !nonce || !appToken) {
    return { valid: false, reason: '缺少專屬授權權杖 (Missing Client Token)' };
  }

  const now = Date.now();
  if (Math.abs(now - timestamp) > 300000) {
    return { valid: false, reason: '請求權杖已過期 (Expired Timestamp)' };
  }

  const signatureRaw = `DD_AI_${timestamp}_${nonce}_${WEB_AI_SECRET}`;
  const expectedToken = Utilities.base64Encode(signatureRaw).substring(0, 32);
  if (appToken !== expectedToken) {
    return { valid: false, reason: '防偽簽章校驗失敗 (Invalid Signature)' };
  }

  try {
    const cache = CacheService.getScriptCache();
    const rateKey = `RATE_AI_${String(nonce).substring(0, 4)}`;
    const currentCount = Number(cache.get(rateKey) || 0);
    if (currentCount > 30) {
      return { valid: false, reason: '調用頻率過高，請稍候 (Rate Limit Exceeded)' };
    }
    cache.put(rateKey, String(currentCount + 1), 60);
  } catch (err) {}

  return { valid: true };
}
