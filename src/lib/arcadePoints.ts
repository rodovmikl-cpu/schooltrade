// Helpers for arcade game points (used by keif converter)
const KEYS = ["flappy", "runner", "idle", "snake", "puzzle2048"];

export const setArcadeBest = (gameKey: string, score: number) => {
  try {
    const k = `arcade-best-${gameKey}`;
    const cur = parseInt(localStorage.getItem(k) || "0", 10) || 0;
    if (score > cur) localStorage.setItem(k, String(Math.floor(score)));
  } catch {}
};

export const getArcadeBest = (gameKey: string): number => {
  try { return parseInt(localStorage.getItem(`arcade-best-${gameKey}`) || "0", 10) || 0; } catch { return 0; }
};

export const getArcadeTotalPoints = (): number => {
  return KEYS.reduce((sum, k) => sum + getArcadeBest(k), 0);
};
