import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";
import { DailyQuestPanel } from "@/components/premium/DailyQuestPanel";
import { updateQuestProgress } from "@/lib/dailyQuests";

interface Mission {
  id: string;
  title: string;
  description: string;
  role: "spy" | "detective" | "hacker" | "agent";
  objectives: { text: string; completed: boolean }[];
  reward: number;
  difficulty: "normal" | "hard" | "extreme";
  choices: { text: string; outcome: string; success: boolean; points: number }[];
}

const MISSIONS: Omit<Mission, "id">[] = [
  {
    title: "🕵️ משימת הצללים", description: "מישהו מדליף מידע מהארגון. מצא את הבוגד.", role: "detective",
    objectives: [{ text: "חקור את 3 החשודים", completed: false }, { text: "מצא ראיות", completed: false }, { text: "חשוף את הבוגד", completed: false }],
    reward: 500, difficulty: "normal",
    choices: [
      { text: "חקור את המשרד של אלון", outcome: "מצאת מסמך חשוד בתוך מגירה נעולה!", success: true, points: 100 },
      { text: "עקוב אחרי דנה אחרי העבודה", outcome: "דנה הלכה ישר הביתה. לא חשודה.", success: false, points: 20 },
      { text: "בדוק את המחשב של יוסי", outcome: "מצאת תכתובת מייל מחשידה!", success: true, points: 150 },
      { text: "האשם את אלון — יש ראיות!", outcome: "צדקת! אלון היה המדליף! 🎉", success: true, points: 250 },
    ],
  },
  {
    title: "💻 פריצת הכספת", description: "כספת דיגיטלית נעולה מכילה מידע קריטי.", role: "hacker",
    objectives: [{ text: "עקוף את הפיירוול", completed: false }, { text: "פענח את הסיסמה", completed: false }, { text: "הורד את הקבצים", completed: false }],
    reward: 800, difficulty: "hard",
    choices: [
      { text: "נסה brute force", outcome: "נחסמת! המערכת זיהתה את הניסיון.", success: false, points: 10 },
      { text: "חפש backdoor בקוד", outcome: "מצאת פרצה בשורה 442!", success: true, points: 200 },
      { text: "השתמש בהנדסה חברתית", outcome: "הצלחת לקבל רמז לסיסמה!", success: true, points: 150 },
      { text: "הפעל את הכלי הסודי", outcome: "הכספת נפתחה! המשימה הושלמה! 🔓", success: true, points: 300 },
    ],
  },
  {
    title: "🌍 המרוץ בין היבשות", description: "מידע מסווג נגנב. עקוב אחרי הגנב.", role: "agent",
    objectives: [{ text: "מצא רמזים בפריז", completed: false }, { text: "עקוב לטוקיו", completed: false }, { text: "תפוס את הגנב", completed: false }],
    reward: 1000, difficulty: "extreme",
    choices: [
      { text: "טוס לפריז ראשון", outcome: "מצאת רמז: הגנב נסע מזרחה!", success: true, points: 100 },
      { text: "בדוק מצלמות אבטחה", outcome: "זיהית את הגנב במסכה!", success: true, points: 200 },
      { text: "ארגן מארב בטוקיו", outcome: "הגנב הגיע! פעולה!", success: true, points: 250 },
      { text: "רדוף והתעמת", outcome: "תפסת את הגנב! המשימה הושלמה! 🏆", success: true, points: 450 },
    ],
  },
  {
    title: "🔮 סוד הארגון", description: "ארגון מסתורי פועל מתחת לאף של כולם.", role: "spy",
    objectives: [{ text: "מצא דרך כניסה", completed: false }, { text: "בנה אמון", completed: false }, { text: "גלה את התוכנית", completed: false }],
    reward: 1200, difficulty: "extreme",
    choices: [
      { text: "השתמש בזהות מזויפת", outcome: "התקבלת כחבר חדש!", success: true, points: 200 },
      { text: "מצא בן ברית מבפנים", outcome: "מצאת מישהו שמוכן לעזור!", success: true, points: 250 },
      { text: "גנוב מסמכים מהמנהיג", outcome: "קיבלת גישה לתוכנית המלאה!", success: true, points: 350 },
      { text: "דווח ועצור את הארגון", outcome: "הארגון נחשף! אתה גיבור! 🌟", success: true, points: 400 },
    ],
  },
];

const STORAGE_KEY = "shadow-missions-state";

interface SavedState {
  totalPoints: number;
  completedMissions: string[];
  level: number;
  xp: number;
  xpToNext: number;
  badges: string[];
}

export const ShadowMissions = () => {
  const [state, setState] = useState<SavedState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        return { totalPoints: p.totalPoints || 0, completedMissions: p.completedMissions || [], level: p.level || 1, xp: p.xp || 0, xpToNext: p.xpToNext || 300, badges: p.badges || [] };
      } catch {}
    }
    return { totalPoints: 0, completedMissions: [], level: 1, xp: 0, xpToNext: 300, badges: [] };
  });
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [missionPoints, setMissionPoints] = useState(0);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const addXP = (amount: number, s: SavedState): SavedState => {
    let xp = s.xp + amount;
    let level = s.level;
    let xpToNext = s.xpToNext;
    const badges = [...s.badges];
    while (xp >= xpToNext) {
      xp -= xpToNext;
      level++;
      xpToNext = Math.floor(xpToNext * 1.3);
      playPremiumSound("levelUp");
    }
    if (level >= 3 && !badges.includes("agent")) badges.push("agent");
    if (level >= 5 && !badges.includes("elite")) badges.push("elite");
    return { ...s, xp, level, xpToNext, badges };
  };

  const startMission = (mission: Omit<Mission, "id">) => {
    playPremiumSound("gameStart");
    setActiveMission({ ...mission, id: mission.title });
    setStep(0); setLog([]); setMissionPoints(0);
  };

  const makeChoice = (choice: Mission["choices"][0]) => {
    playSound(choice.success ? "correct" : "incorrect");
    setLog(prev => [...prev, `> ${choice.text}`, choice.outcome]);
    setMissionPoints(prev => prev + choice.points);
    setStep(prev => prev + 1);
    updateQuestProgress("shadowMissions", `shadowMissions-${new Date().getFullYear() * 10000 + (new Date().getMonth()+1) * 100 + new Date().getDate()}-0`, 1);

    if (step >= (activeMission?.choices.length || 4) - 1) {
      setTimeout(() => {
        playPremiumSound("win");
        const earned = missionPoints + choice.points + (activeMission?.reward || 0);
        setState(prev => {
          let next = { ...prev, totalPoints: prev.totalPoints + earned, completedMissions: [...prev.completedMissions, activeMission?.title || ""] };
          return addXP(earned / 5, next);
        });
      }, 500);
    }
  };

  const diffColor = (d: string) => d === "extreme" ? "text-red-400" : d === "hard" ? "text-orange-400" : "text-green-400";

  if (activeMission && step < activeMission.choices.length) {
    return (
      <div className="max-w-lg mx-auto space-y-4" dir="rtl">
        <Card className="border-cyan-500/30">
          <CardContent className="py-6 space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-bold">{activeMission.title}</h3>
              <p className="text-sm text-muted-foreground">שלב {step + 1}/{activeMission.choices.length}</p>
            </div>
            {log.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm max-h-32 overflow-y-auto">
                {log.map((l, i) => <p key={i} className={l.startsWith(">") ? "text-primary font-medium" : "text-muted-foreground"}>{l}</p>)}
              </div>
            )}
            <p className="text-center font-medium">מה תעשה?</p>
            <Button onClick={() => makeChoice(activeMission.choices[step])} className="w-full py-4 text-lg" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
              {activeMission.choices[step].text}
            </Button>
            <div className="text-center text-sm text-muted-foreground">נקודות עד כה: {missionPoints}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeMission && step >= activeMission.choices.length) {
    return (
      <div className="max-w-lg mx-auto" dir="rtl">
        <Card className="animate-scale-in border-green-500/30">
          <CardContent className="py-8 text-center space-y-4">
            <div className="text-5xl">🏆</div>
            <p className="text-2xl font-bold text-green-400">משימה הושלמה!</p>
            <p className="text-lg">+{missionPoints + (activeMission.reward || 0)} נקודות</p>
            <Button onClick={() => setActiveMission(null)} className="w-full">חזרה למשימות</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-cyan-400">🕶️ משימות צללים אונליין</h3>
        <p className="text-sm text-muted-foreground">רמה {state.level} | נקודות: {state.totalPoints} | הושלמו: {state.completedMissions.length}/{MISSIONS.length}</p>
      </div>

      {/* XP Bar */}
      <div className="px-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>רמה {state.level}</span>
          <span>{state.xp}/{state.xpToNext} XP</span>
        </div>
        <Progress value={(state.xp / state.xpToNext) * 100} className="h-2" />
      </div>

      {state.badges.length > 0 && (
        <div className="flex gap-2 justify-center">
          {state.badges.includes("agent") && <Badge className="bg-cyan-500/20 text-cyan-400">🕵️ סוכן</Badge>}
          {state.badges.includes("elite") && <Badge className="bg-purple-500/20 text-purple-400">👑 עילית</Badge>}
        </div>
      )}

      <DailyQuestPanel gameKey="shadowMissions" />

      <div className="space-y-3">
        {MISSIONS.map((m, i) => {
          const done = state.completedMissions.includes(m.title);
          return (
            <button key={i} onClick={() => !done && startMission(m)} disabled={done}
              className={`w-full text-right p-4 rounded-xl border-2 transition-all ${done ? "border-green-500/30 bg-green-500/5 opacity-60" : "border-border hover:border-cyan-500/40 bg-card"}`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold">{m.title}</span>
                  <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                </div>
                <div className="text-left">
                  <Badge variant="outline" className={diffColor(m.difficulty)}>
                    {m.difficulty === "extreme" ? "קיצוני" : m.difficulty === "hard" ? "קשה" : "רגיל"}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">{m.reward} נק'</div>
                  {done && <span className="text-green-400 text-xs">✓ הושלם</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
