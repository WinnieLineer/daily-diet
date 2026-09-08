/**
 * 📞 PhoneAudio - Web Audio API Telecom Sound Synthesizer
 * Provides authentic, zero-asset, real-time telephone sound effects:
 * - PSTN Ringback tone (撥號嘟嘟聲)
 * - Call Connected chime (接通提示音)
 * - Call Disconnect / Busy tone (掛斷提示音)
 * - Speech Acknowledgment chirp (對方接收提示音)
 * - Thinking subtle pulse (思考脈衝音)
 */

let audioCtx = null;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * 🔔 Play Telephone Ringback Tone (嘟... 嘟...)
 * Standard North America/Taiwan PSTN: 440Hz + 480Hz dual tone
 * Plays 1.2s ON, 2.0s OFF, repeating
 * Returns { stop: () => void }
 */
export function playRinging() {
  const ctx = getAudioContext();
  if (!ctx) return { stop: () => {} };

  let isPlaying = true;
  let activeNodes = [];
  let ringTimeout = null;

  const playOneRing = () => {
    if (!isPlaying) return;
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.value = 440; // 440 Hz
      osc2.type = 'sine';
      osc2.frequency.value = 480; // 480 Hz

      // Smooth envelope to avoid pops
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.08);
      gainNode.gain.setValueAtTime(0.12, now + 1.2);
      gainNode.gain.linearRampToValueAtTime(0, now + 1.3);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);

      activeNodes = [osc1, osc2, gainNode];

      // Schedule next ring
      ringTimeout = setTimeout(() => {
        if (isPlaying) playOneRing();
      }, 3200);
    } catch (e) {
      console.warn("Ring sound error:", e);
    }
  };

  playOneRing();

  return {
    stop: () => {
      isPlaying = false;
      if (ringTimeout) clearTimeout(ringTimeout);
      activeNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) {}
      });
      activeNodes = [];
    }
  };
}

/**
 * 📲 Play Call Connected Chime (接通提示音)
 * Realistic line relay click + crisp upward melodic chime (D5 -> A5)
 */
export function playConnected() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Line pickup mechanical switch click (filtered short impulse)
    const oscClick = ctx.createOscillator();
    const gainClick = ctx.createGain();
    oscClick.type = 'triangle';
    oscClick.frequency.setValueAtTime(150, now);
    oscClick.frequency.exponentialRampToValueAtTime(40, now + 0.04);
    gainClick.gain.setValueAtTime(0.2, now);
    gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    oscClick.connect(gainClick);
    gainClick.connect(ctx.destination);
    oscClick.start(now);
    oscClick.stop(now + 0.04);

    // 2. Upward two-tone chime (587Hz -> 880Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const chimeGain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now + 0.06); // D5
    osc1.frequency.setValueAtTime(880.00, now + 0.16); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.16); // Harmonic overtone D6

    chimeGain.gain.setValueAtTime(0, now + 0.06);
    chimeGain.gain.linearRampToValueAtTime(0.18, now + 0.10);
    chimeGain.gain.setValueAtTime(0.18, now + 0.18);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc1.connect(chimeGain);
    osc2.connect(chimeGain);
    chimeGain.connect(ctx.destination);

    osc1.start(now + 0.06);
    osc2.start(now + 0.16);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("Connected chime error:", e);
  }
}

/**
 * 🛑 Play Call Disconnect / Busy Tone (掛斷提示音)
 * 3 short busy beeps (480Hz + 620Hz) + receiver click
 */
export function playHangup() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Play 3 fast busy beeps (120ms on, 100ms off)
    for (let i = 0; i < 3; i++) {
      const startTime = now + (i * 0.22);
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.value = 480;
      osc2.type = 'sine';
      osc2.frequency.value = 620;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.14, startTime + 0.02);
      gain.gain.setValueAtTime(0.14, startTime + 0.12);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.14);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + 0.15);
      osc2.stop(startTime + 0.15);
    }
  } catch (e) {
    console.warn("Hangup tone error:", e);
  }
}

/**
 * 📻 Play Speech Acknowledgment Chirp (對方收到提示音)
 * Subtle radio/telecom 'Roger' chirp when user finishes speaking
 */
export function playAcknowledge() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.08);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.warn("Acknowledge chirp error:", e);
  }
}

/**
 * 💭 Play Thinking Pulse (思考中微弱脈衝音)
 * Soft 520Hz sine ping (0.05 vol)
 */
export function playThinkingPulse() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch (e) {}
}
