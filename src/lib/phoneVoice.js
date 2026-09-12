/**
 * 🎙️ PhoneVoice - Smart Natural Neural Voice Engine & Selector
 * 
 * Optimized for natural, human-like voice synthesis:
 * 1. Prioritizes authentic human recordings and neural TTS:
 *    - Microsoft Natural voices (HsiaoChen, Yunxi, Yunjian, Xiaoxiao)
 *    - Apple High-Fidelity voices (Meijia 美佳, Sandy 珊蒂, Shelley, Flo, Eddy)
 *    - Google 國語（臺灣）with natural pacing
 * 2. Strongly demotes legacy robotic/scratchy voices:
 *    - Microsoft Hanhan (Windows 7 robot)
 *    - Ting-Ting (legacy OS X basic synth)
 * 3. Keeps pitch at strictly 1.0 (prevents metallic chipmunk vocoder distortion)
 * 4. Inserts conversational breath pauses via natural punctuation
 * 5. Persists user preference for voice and speech rate
 */

const PREFERRED_VOICE_KEY = 'panda_preferred_voice_name';
const PREFERRED_RATE_KEY = 'panda_preferred_speech_rate';

export function getStoredVoiceName() {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(PREFERRED_VOICE_KEY);
  } catch (e) {
    return null;
  }
}

export function setStoredVoiceName(name) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (name) {
      localStorage.setItem(PREFERRED_VOICE_KEY, name);
    } else {
      localStorage.removeItem(PREFERRED_VOICE_KEY);
    }
  } catch (e) {}
}

export function getStoredSpeechRate() {
  if (typeof localStorage === 'undefined') return 0.96;
  try {
    const saved = localStorage.getItem(PREFERRED_RATE_KEY);
    return saved ? Number(saved) : 0.96;
  } catch (e) {
    return 0.96;
  }
}

export function setStoredSpeechRate(rate) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PREFERRED_RATE_KEY, String(rate));
  } catch (e) {}
}

/**
 * Calculate naturalness score for a SpeechSynthesisVoice
 */
function scoreVoice(voice, isEn = false, persona = 'tsundere') {
  let score = 0;
  const name = (voice.name || '').toLowerCase();
  const uri = (voice.voiceURI || '').toLowerCase();
  const lang = (voice.lang || '').toLowerCase();

  // 1. Language Relevance
  if (isEn) {
    if (lang.startsWith('en')) score += 200;
    if (lang === 'en-us' || lang === 'en_us') score += 100;
  } else {
    if (lang.startsWith('zh') || lang.includes('cmn') || lang.includes('tw') || lang.includes('hk') || lang.includes('cn')) {
      score += 200;
    }
    // Taiwan accent preference for authentic local warmth
    if (lang.includes('tw') || name.includes('taiwan') || name.includes('台灣') || name.includes('臺灣')) {
      score += 400;
    }
  }

  // 2. High-Tech Neural / Natural / Premium Indicators (Highest Priority!)
  const isNeural = /natural|neural|enhanced|premium|online|siri/i.test(name + ' ' + uri);
  if (isNeural) {
    score += 1500;
  }

  // 3. Microsoft Natural Neural voices (Edge / Windows 11 / Mac Edge) - Studio Grade!
  if (/hsiaochen|yunxi|yunjian|xiaoxiao|yunyang|xiaoyi/i.test(name)) {
    score += 1200;
  }

  // 4. Apple Natural System Voices (macOS / iOS) - Human Recordings!
  if (/meijia|mei-jia|sandy|shelley|flo|eddy/i.test(name)) {
    score += 1000;
  }

  // 5. Google 國語（臺灣）is remote cloud-synthesized and sounds clean if paced well
  if (/google.*(國語|taiwan|台灣|臺灣)/i.test(name)) {
    score += 600;
  }

  // 6. Persona Voice Style Matching
  if (persona === 'hardcore') {
    if (/male|yunxi|yunjian|eddy|reed|rocko|danny|grandpa|kangkang/i.test(name)) {
      score += 300;
    }
  } else {
    // Tsundere or Gentle: Prefer natural female voices
    if (/female|hsiaochen|xiaoxiao|meijia|mei-jia|sandy|shelley|flo/i.test(name)) {
      score += 300;
    }
  }

  // 7. ❌ Strong Penalty for Legacy Scratchy Robotic Synthesizers
  // Microsoft Hanhan is the 2003 monotone robotic voice from Windows XP
  if (/hanhan/i.test(name) && !isNeural) {
    score -= 1000;
  }

  // Basic Ting-Ting is OS X 10.7 low-bitrate synth
  if (/ting-ting|tingting/i.test(name) && !isNeural) {
    score -= 800;
  }

  // Basic Sin-ji without enhanced
  if (/sin-ji|sinji/i.test(name) && !isNeural) {
    score -= 400;
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
      isNatural: /natural|neural|enhanced|premium|online|siri|meijia|hsiaochen|yunxi|yunjian|xiaoxiao|sandy|shelley/i.test(v.name)
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

  // Fallback to any Chinese or default voice
  const zhVoice = voices.find(v => (v.lang || '').toLowerCase().startsWith('zh'));
  return zhVoice || voices[0] || null;
}

/**
 * Preprocess text for natural conversational speech
 * - Strips emojis and markdown
 * - Eliminates quotes and robotic braces
 * - Inserts natural punctuation pauses for human breathing cadence
 */
export function formatSpeechText(rawText) {
  if (!rawText) return '';
  let text = String(rawText)
    // Remove emojis & symbols
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Remove markdown formatting & quotes
    .replace(/[*#_~`[\]()]/g, '')
    .replace(/["'「」『』]/g, '')
    // Standardize punctuation to conversational rhythm
    .replace(/!+/g, '！')
    .replace(/\?+/g, '？')
    .replace(/\.{2,}/g, '…')
    .trim();

  // Insert gentle space after commas and periods to help browser TTS breathe naturally
  text = text.replace(/([，。！？…])/g, '$1 ');

  return text;
}
