// Minimal UI sound system using Web Audio API
// Generates soft, clean tones similar to iPhone/Duolingo sounds

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

const resume = async () => {
  const ctx = getCtx();
  if (ctx.state === "suspended") await ctx.resume();
};

export const setSoundEnabled = (v: boolean) => { soundEnabled = v; };
export const isSoundEnabled = () => soundEnabled;

const playTone = async (
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gainPeak = 0.15,
  fadeOut = true,
) => {
  if (!soundEnabled) return;
  try {
    await resume();
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + 0.01);
    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.05);
  } catch {
    // silently ignore audio errors
  }
};

const playChord = async (freqs: number[], duration: number, gain = 0.1) => {
  for (const f of freqs) {
    await playTone(f, duration, "sine", gain);
  }
};

export type SoundType =
  | "click"
  | "tab"
  | "success"
  | "error"
  | "correct"
  | "incorrect"
  | "convert"
  | "hover"
  | "enter"
  | "pageLoad";

export const playSound = (type: SoundType) => {
  switch (type) {
    case "click":
      playTone(880, 0.08, "sine", 0.1);
      break;
    case "tab":
      playTone(660, 0.12, "sine", 0.12);
      break;
    case "hover":
      playTone(1200, 0.04, "sine", 0.05);
      break;
    case "success":
      (async () => {
        await playTone(523, 0.1, "sine", 0.12);
        setTimeout(() => playTone(659, 0.1, "sine", 0.12), 80);
        setTimeout(() => playTone(784, 0.2, "sine", 0.14), 160);
      })();
      break;
    case "error":
      (async () => {
        await playTone(220, 0.15, "sine", 0.12);
        setTimeout(() => playTone(180, 0.2, "sine", 0.1), 100);
      })();
      break;
    case "correct":
      (async () => {
        await playTone(660, 0.08, "sine", 0.12);
        setTimeout(() => playTone(880, 0.15, "sine", 0.14), 60);
      })();
      break;
    case "incorrect":
      playTone(200, 0.25, "sine", 0.1);
      break;
    case "convert":
      (async () => {
        await playTone(440, 0.08, "sine", 0.1);
        setTimeout(() => playTone(554, 0.08, "sine", 0.1), 60);
        setTimeout(() => playTone(659, 0.08, "sine", 0.1), 120);
        setTimeout(() => playTone(880, 0.3, "sine", 0.15), 200);
      })();
      break;
    case "enter":
      (async () => {
        await playTone(392, 0.1, "sine", 0.08);
        setTimeout(() => playTone(523, 0.15, "sine", 0.1), 80);
      })();
      break;
    case "pageLoad":
      (async () => {
        await playTone(330, 0.1, "sine", 0.06);
        setTimeout(() => playTone(440, 0.1, "sine", 0.06), 100);
        setTimeout(() => playTone(554, 0.15, "sine", 0.08), 200);
      })();
      break;
  }
};
