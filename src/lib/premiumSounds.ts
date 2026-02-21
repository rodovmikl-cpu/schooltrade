// Premium-exclusive sound effects - cinematic quality
let audioCtx: AudioContext | null = null;

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

const playNote = async (freq: number, dur: number, type: OscillatorType = "sine", gain = 0.12, delay = 0) => {
  try {
    await resume();
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(0, ctx.currentTime + delay);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur + 0.05);
  } catch { /* silent */ }
};

export type PremiumSoundType =
  | "reward"
  | "levelUp"
  | "specialSuccess"
  | "gameStart"
  | "win"
  | "premiumAura"
  | "sparkle"
  | "doubleReward";

export const playPremiumSound = (type: PremiumSoundType) => {
  switch (type) {
    case "reward":
      // Magical ascending arpeggio
      playNote(523, 0.12, "sine", 0.1, 0);
      playNote(659, 0.12, "sine", 0.1, 0.08);
      playNote(784, 0.12, "sine", 0.12, 0.16);
      playNote(1047, 0.25, "sine", 0.15, 0.24);
      playNote(1319, 0.3, "triangle", 0.08, 0.35);
      break;

    case "levelUp":
      // Epic fanfare
      playNote(392, 0.15, "sine", 0.1, 0);
      playNote(523, 0.15, "sine", 0.1, 0.1);
      playNote(659, 0.15, "sine", 0.12, 0.2);
      playNote(784, 0.2, "sine", 0.14, 0.3);
      playNote(1047, 0.4, "triangle", 0.1, 0.45);
      playNote(784, 0.15, "sine", 0.08, 0.55);
      playNote(1047, 0.5, "sine", 0.15, 0.65);
      break;

    case "specialSuccess":
      // Shimmering success chord
      playNote(440, 0.2, "sine", 0.08, 0);
      playNote(554, 0.2, "sine", 0.08, 0);
      playNote(659, 0.2, "sine", 0.08, 0);
      playNote(880, 0.3, "triangle", 0.06, 0.15);
      playNote(1108, 0.4, "sine", 0.1, 0.25);
      playNote(1319, 0.5, "sine", 0.12, 0.4);
      break;

    case "gameStart":
      // Cinematic intro
      playNote(262, 0.2, "sine", 0.06, 0);
      playNote(330, 0.15, "sine", 0.08, 0.15);
      playNote(392, 0.15, "sine", 0.1, 0.25);
      playNote(523, 0.3, "sine", 0.12, 0.35);
      playNote(659, 0.2, "triangle", 0.08, 0.5);
      playNote(784, 0.4, "sine", 0.14, 0.6);
      break;

    case "win":
      // Victory fanfare with harmony
      playNote(523, 0.12, "sine", 0.1, 0);
      playNote(659, 0.12, "sine", 0.1, 0);
      playNote(784, 0.12, "sine", 0.1, 0.1);
      playNote(1047, 0.15, "sine", 0.12, 0.2);
      playNote(784, 0.1, "sine", 0.08, 0.35);
      playNote(1047, 0.15, "sine", 0.12, 0.42);
      playNote(1319, 0.5, "triangle", 0.1, 0.55);
      playNote(1047, 0.5, "sine", 0.12, 0.55);
      break;

    case "premiumAura":
      // Soft ethereal glow sound
      playNote(880, 0.4, "sine", 0.04, 0);
      playNote(1108, 0.5, "sine", 0.03, 0.1);
      playNote(1319, 0.6, "triangle", 0.03, 0.2);
      break;

    case "sparkle":
      // Quick sparkle
      playNote(2000, 0.06, "sine", 0.06, 0);
      playNote(2400, 0.06, "sine", 0.05, 0.04);
      playNote(3000, 0.08, "sine", 0.04, 0.08);
      break;

    case "doubleReward":
      // Double ding!
      playNote(880, 0.1, "sine", 0.12, 0);
      playNote(1108, 0.15, "sine", 0.14, 0.08);
      playNote(880, 0.1, "sine", 0.12, 0.2);
      playNote(1108, 0.15, "sine", 0.14, 0.28);
      playNote(1319, 0.3, "triangle", 0.1, 0.4);
      break;
  }
};
