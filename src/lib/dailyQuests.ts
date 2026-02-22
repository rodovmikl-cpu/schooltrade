// Daily Quest & Event System for Premium Games

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: number;
  type: "kill" | "earn" | "trade" | "solve" | "complete";
  emoji: string;
}

export interface DailyEvent {
  id: string;
  title: string;
  description: string;
  bonusMultiplier: number;
  emoji: string;
}

// Seed-based pseudo-random for deterministic daily content
const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

const getDaySeed = () => {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
};

const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
};

// Quest templates per game
const QUEST_TEMPLATES: Record<string, Omit<DailyQuest, "id" | "target" | "reward">[]> = {
  cryptoEmpire: [
    { title: "סוחר יומי", description: "קנה מניות", type: "trade", emoji: "📈" },
    { title: "צייד NFT", description: "רכוש NFT", type: "trade", emoji: "🎨" },
    { title: "מגנט כסף", description: "הרוויח דולרים", type: "earn", emoji: "💰" },
    { title: "משקיע אמיץ", description: "קנה מניה אגדית", type: "trade", emoji: "⭐" },
    { title: "שליט השוק", description: "בצע עסקאות", type: "complete", emoji: "👑" },
  ],
  mindArena: [
    { title: "פותר חידות", description: "פתור חידות", type: "solve", emoji: "🧩" },
    { title: "מומחה לוגיקה", description: "פתור חידה קשה", type: "solve", emoji: "🧠" },
    { title: "שובר קודים", description: "פענח קודים", type: "solve", emoji: "🔐" },
    { title: "אלוף הזמן", description: "פתור בזמן קצר", type: "complete", emoji: "⏱️" },
    { title: "גאון יומי", description: "השג ניקוד מושלם", type: "earn", emoji: "💡" },
  ],
  shadowMissions: [
    { title: "סוכן יומי", description: "השלם משימה", type: "complete", emoji: "🕵️" },
    { title: "צייד בוגדים", description: "חשוף בוגד", type: "complete", emoji: "🔍" },
    { title: "האקר מומחה", description: "פרוץ מערכת", type: "complete", emoji: "💻" },
    { title: "מרגל עילית", description: "השלם ללא טעויות", type: "complete", emoji: "🌟" },
    { title: "אספן מודיעין", description: "אסוף ראיות", type: "earn", emoji: "📋" },
  ],
  vipSurvival: [
    { title: "לוחם יומי", description: "הבס אויבים", type: "kill", emoji: "⚔️" },
    { title: "אספן לוט", description: "אסוף פריטים", type: "earn", emoji: "🎒" },
    { title: "שורד", description: "הגיע לרמה", type: "complete", emoji: "💪" },
    { title: "גיבור הזירה", description: "נצח בזירה", type: "complete", emoji: "🏆" },
    { title: "לוחם אמיץ", description: "הבס בוס", type: "kill", emoji: "😈" },
  ],
};

const EVENT_POOL: Omit<DailyEvent, "id" | "bonusMultiplier">[] = [
  { title: "⚡ שעת הזהב", description: "כל התגמולים מוכפלים!", emoji: "⚡" },
  { title: "🌟 יום העילית", description: "אתגרים מיוחדים עם פרסים כפולים", emoji: "🌟" },
  { title: "🔥 מרוץ נגד הזמן", description: "השלם משימות בזמן מוגבל לפרס מיוחד", emoji: "🔥" },
  { title: "💎 ציד האוצרות", description: "מצא אוצרות נסתרים לבונוס ענק", emoji: "💎" },
  { title: "🏆 טורניר יומי", description: "התחרה ברמת הקושי הגבוהה ביותר", emoji: "🏆" },
  { title: "🎭 יום המסכות", description: "משימות מסתוריות עם פרסים נדירים", emoji: "🎭" },
  { title: "👑 אתגר המלך", description: "השלם את האתגר הקשה ביותר", emoji: "👑" },
];

export const getDailyQuests = (gameKey: string, count = 3): DailyQuest[] => {
  const seed = getDaySeed() + gameKey.length * 1000;
  const rand = seededRandom(seed);
  const templates = QUEST_TEMPLATES[gameKey] || QUEST_TEMPLATES.cryptoEmpire;
  const dayProgress = getDayOfYear() % 30; // Difficulty scales over month

  const selected: DailyQuest[] = [];
  const used = new Set<number>();

  for (let i = 0; i < count; i++) {
    let idx: number;
    do { idx = Math.floor(rand() * templates.length); } while (used.has(idx) && used.size < templates.length);
    used.add(idx);
    const t = templates[idx];

    const difficultyScale = 1 + dayProgress * 0.1;
    const baseTarget = Math.floor((3 + rand() * 7) * difficultyScale);
    const baseReward = Math.floor((50 + rand() * 150) * difficultyScale);

    selected.push({
      ...t,
      id: `${gameKey}-${getDaySeed()}-${i}`,
      target: baseTarget,
      reward: baseReward,
    });
  }
  return selected;
};

export const getDailyEvent = (): DailyEvent => {
  const seed = getDaySeed();
  const rand = seededRandom(seed);
  const idx = Math.floor(rand() * EVENT_POOL.length);
  const event = EVENT_POOL[idx];
  return {
    ...event,
    id: `event-${seed}`,
    bonusMultiplier: 1.5 + rand() * 1,
  };
};

export const getQuestProgress = (gameKey: string, questId: string): number => {
  const key = `quest-progress-${gameKey}-${getDaySeed()}`;
  try {
    const data = JSON.parse(localStorage.getItem(key) || "{}");
    return data[questId] || 0;
  } catch { return 0; }
};

export const updateQuestProgress = (gameKey: string, questId: string, amount: number) => {
  const key = `quest-progress-${gameKey}-${getDaySeed()}`;
  try {
    const data = JSON.parse(localStorage.getItem(key) || "{}");
    data[questId] = (data[questId] || 0) + amount;
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
};

export const getTimeUntilReset = (): { hours: number; minutes: number; seconds: number } => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow.getTime() - now.getTime();
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
};
