/**
 * 🎙️ PhoneVoice - Smart Natural Neural Voice Engine & Selector
 * 
 * Solves the infamous "Google 小姐" robotic voice issue by:
 * 1. Ranking and prioritizing real human/neural voices:
 *    - Edge/Windows: Microsoft Natural voices (HsiaoChen, Yunxi, Yunjian, Xiaoxiao)
 *    - Apple/macOS/iOS: Siri & Enhanced natural voices (Meijia 美佳, Sandy, Shelley, Flo, Sinji 善芝)
 *    - Android: Neural WaveNet / Samsung Natural voices
 * 2. Explicitly demoting / blacklisting old robotic voices (Google 國語, Google 普通話)
 * 3. Matching persona characteristics (Tsundere: Crisp lively; Gentle: Warm soothing; Hardcore: Strong masculine)
 * 4. Storing and respecting user-selected voice preferences
 */

const PREFERRED_VOICE_KEY = 'panda_preferred_voice_name';

export function getStoredVoiceName() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(PREFERRED_VOICE_KEY);
}

export function setStoredVoiceName(name) {
  if (typeof localStorage === 'undefined') return;
  if (name) {
    localStorage.setItem(PREFERRED_VOICE_KEY, name);
  } else {
    localStorage.removeItem(PREFERRED_VOICE_KEY);
  }
}

/**
 * Calculate naturalness score for a SpeechSynthesisVoice
 */
function scoreVoice(voice, isEn, persona = 'tsundere') {
  let score = 0;
  const name = (voice.name || '').toLowerCase();
  const uri = (voice.voiceURI || '').toLowerCase();
  const lang = (voice.lang || '').toLowerCase();

  // 1. Language Relevance
  if (isEn) {
    if (lang.startsWith('en')) score += 100;
    if (lang === 'en-us') score += 50;
  } else {
    if (lang.startsWith('zh') || lang.includes('cmn') || lang.includes('tw') || lang.includes('hk') || lang.includes('cn')) {
      score += 100;
    }
    // Taiwan accent preference for natural local experience
    if (lang.includes('tw') || name.includes('taiwan') || name.includes('台灣') || name.includes('臺灣')) {
      score += 300;
    }
  }

  // 2. High-Tech Neural / Natural / Premium Indicators (Highest Priority!)
  const isNeural = /natural|neural|enhanced|premium|online|siri/i.test(name + ' ' + uri);
  if (isNeural) {
    score += 1200;
  }

  // 3. Microsoft Natural Neural voices (Edge / Windows 11 / Mac Edge) - Studio Grade!
  if (/hsiaochen|yunxi|yunjian|xiaoxiao|yunyang|xiaoyi/i.test(name)) {
    score += 1000;
  }

  // 4. Apple Natural System Voices (macOS / iOS) - Natural Human Recordings!
  if (/meijia|mei-jia|sinji|sin-ji|sandy|shelley|flo|eddy/i.test(name)) {
    score += 800;
  }

  // 5. Persona Voice Style Matching
  if (persona === 'hardcore') {
    // Prefer male voices
    if (/male|yunxi|yunjian|eddy|reed|rocko|danny|grandpa|kangkang/i.test(name)) {
      score += 400;
    }
  } else {
    // Tsundere or Gentle: Prefer natural female voices
    if (/female|hsiaochen|xiaoxiao|meijia|mei-jia|sandy|shelley|flo|sinji|sin-ji/i.test(name)) {
      score += 400;
    }
  }

  // 6. ❌ PENALTY for Infamous Robotic "Google 小姐" Voices
  // Google's 2011 standard synthetic voice is famously robotic and monotone
  if ((/google.*(國語|普通話|chinese)/i.test(name) || /google.*zh/i.test(name)) && !isNeural) {
    score -= 800; // Strong penalty to push below any human/natural voice
  }

  // Penalty for default basic Ting-Ting
  if ((name === 'tingting' || name === 'ting-ting') && !isNeural) {
    score -= 300;
  }

  return score;
}

/**
 * Get all available voices sorted by naturalness and quality
 */
export function getSortedVoices(isEn = false, persona = 'tsundere') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return [];

  const filtered = voices.filter(v => {
    const lang = (v.lang || '').toLowerCase();
    if (isEn) return lang.startsWith('en');
    return lang.startsWith('zh') || lang.includes('cmn') || lang.includes('tw') || lang.includes('hk') || lang.includes('cn');
  });

  return filtered
    .map(v => ({
      voice: v,
      score: scoreVoice(v, isEn, persona),
      isNatural: /natural|neural|enhanced|premium|online|siri|meijia|hsiaochen|yunxi|yunjian|xiaoxiao/i.test(v.name)
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Pick the absolute best voice (respecting user preference if set)
 */
export function getBestVoice(isEn = false, persona = 'tsundere') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  // Check if user has explicitly saved a preference
  const preferredName = getStoredVoiceName();
  if (preferredName) {
    const matched = voices.find(v => v.name === preferredName);
    if (matched) return matched;
  }

  const sorted = getSortedVoices(isEn, persona);
  if (sorted.length > 0) {
    return sorted[0].voice;
  }

  // Extreme fallback
  return voices[0] || null;
}

/**
 * Preprocess text for natural conversational speech
 * - Strips emojis and markdown
 * - Replaces multiple exclamation marks with calm cadence
 * - Inserts natural punctuation pauses
 */
export function formatSpeechText(rawText) {
  if (!rawText) return '';
  return rawText
    // Remove emojis
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Remove markdown formatting
    .replace(/[*#_~`[\]()]/g, '')
    // Replace continuous punctuation
    .replace(/!{2,}/g, '！')
    .replace(/\?{2,}/g, '？')
    .replace(/\.{2,}/g, '…')
    .trim();
}
