import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";

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
    title: "🕵️ משימת הצללים",
    description: "מישהו מדליף מידע מהארגון. מצא את הבוגד לפני שיהיה מאוחר מדי.",
    role: "detective",
    objectives: [
      { text: "חקור את 3 החשודים", completed: false },
      { text: "מצא ראיות", completed: false },
      { text: "חשוף את הבוגד", completed: false },
    ],
    reward: 500,
    difficulty: "normal",
    choices: [
      { text: "חקור את המשרד של אלון", outcome: "מצאת מסמך חשוד בתוך מגירה נעולה!", success: true, points: 100 },
      { text: "עקוב אחרי דנה אחרי העבודה", outcome: "דנה הלכה ישר הביתה. לא חשודה.", success: false, points: 20 },
      { text: "בדוק את המחשב של יוסי", outcome: "מצאת תכתובת מייל מחשידה!", success: true, points: 150 },
      { text: "האשם את אלון - יש ראיות!", outcome: "צדקת! אלון היה המדליף! 🎉", success: true, points: 250 },
    ],
  },
  {
    title: "💻 פריצת הכספת",
    description: "כספת דיגיטלית נעולה מכילה מידע קריטי. פרוץ את ההגנות.",
    role: "hacker",
    objectives: [
      { text: "עקוף את הפיירוול", completed: false },
      { text: "פענח את הסיסמה", completed: false },
      { text: "הורד את הקבצים", completed: false },
    ],
    reward: 800,
    difficulty: "hard",
    choices: [
      { text: "נסה brute force", outcome: "נחסמת! המערכת זיהתה את הניסיון.", success: false, points: 10 },
      { text: "חפש backdoor בקוד", outcome: "מצאת פרצה בשורה 442!", success: true, points: 200 },
      { text: "השתמש בהנדסה חברתית", outcome: "הצלחת לקבל רמז לסיסמה!", success: true, points: 150 },
      { text: "הפעל את הכלי הסודי", outcome: "הכספת נפתחה! המשימה הושלמה! 🔓", success: true, points: 300 },
    ],
  },
  {
    title: "🌍 המרוץ בין היבשות",
    description: "מידע מסווג נגנב. עקוב אחרי הגנב דרך 5 ערים.",
    role: "agent",
    objectives: [
      { text: "מצא רמזים בפריז", completed: false },
      { text: "עקוב לטוקיו", completed: false },
      { text: "תפוס את הגנב", completed: false },
    ],
    reward: 1000,
    difficulty: "extreme",
    choices: [
      { text: "טוס לפריז ראשון", outcome: "מצאת רמז: הגנב נסע מזרחה!", success: true, points: 100 },
      { text: "בדוק מצלמות אבטחה", outcome: "זיהית את הגנב במסכה!", success: true, points: 200 },
      { text: "ארגן מארב בטוקיו", outcome: "הגנב הגיע! פעולה!", success: true, points: 250 },
      { text: "רדוף והתעמת", outcome: "תפסת את הגנב! המשימה הושלמה! 🏆", success: true, points: 450 },
    ],
  },
  {
    title: "🔮 סוד הארגון",
    description: "ארגון מסתורי פועל מתחת לאף של כולם. חדור לשורותיו.",
    role: "spy",
    objectives: [
      { text: "מצא דרך כניסה", completed: false },
      { text: "בנה אמון", completed: false },
      { text: "גלה את התוכנית", completed: false },
    ],
    reward: 1200,
    difficulty: "extreme",
    choices: [
      { text: "השתמש בזהות מזויפת", outcome: "התקבלת כחבר חדש!", success: true, points: 200 },
      { text: "מצא בן ברית מבפנים", outcome: "מצאת מישהו שמוכן לעזור!", success: true, points: 250 },
      { text: "גנוב מסמכים מהמנהיג", outcome: "קיבלת גישה לתוכנית המלאה!", success: true, points: 350 },
      { text: "דווח ועצור את הארגון", outcome: "הארגון נחשף! אתה גיבור! 🌟", success: true, points: 400 },
    ],
  },
];

const STORAGE_KEY = "shadow-missions-state";

export const ShadowMissions = () => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [missionPoints, setMissionPoints] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTotalPoints(parsed.totalPoints || 0);
        setCompletedMissions(parsed.completedMissions || []);
      } catch {}
    }
  }, []);

  const save = (pts: number, completed: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ totalPoints: pts, completedMissions: completed }));
  };

  const startMission = (mission: Omit<Mission, "id">) => {
    playPremiumSound("gameStart");
    setActiveMission({ ...mission, id: mission.title });
    setStep(0);
    setLog([]);
    setMissionPoints(0);
  };

  const makeChoice = (choice: Mission["choices"][0]) => {
    playSound(choice.success ? "correct" : "incorrect");
    setLog(prev => [...prev, `> ${choice.text}`, choice.outcome]);
    setMissionPoints(prev => prev + choice.points);
    setStep(prev => prev + 1);

    if (step >= (activeMission?.choices.length || 4) - 1) {
      // Mission complete
      setTimeout(() => {
        playPremiumSound("win");
        const newTotal = totalPoints + missionPoints + choice.points + (activeMission?.reward || 0);
        const newCompleted = [...completedMissions, activeMission?.title || ""];
        setTotalPoints(newTotal);
        setCompletedMissions(newCompleted);
        save(newTotal, newCompleted);
      }, 500);
    }
  };

  const roleIcon = (r: string) => r === "spy" ? "🕵️" : r === "detective" ? "🔍" : r === "hacker" ? "💻" : "🕶️";
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

            {/* Log */}
            {log.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm max-h-32 overflow-y-auto">
                {log.map((l, i) => (
                  <p key={i} className={l.startsWith(">") ? "text-primary font-medium" : "text-muted-foreground"}>
                    {l}
                  </p>
                ))}
              </div>
            )}

            <p className="text-center font-medium">מה תעשה?</p>

            <Button
              onClick={() => makeChoice(activeMission.choices[step])}
              className="w-full py-4 text-lg"
              style={{ animation: "fadeSlideIn 0.3s ease-out" }}
            >
              {activeMission.choices[step].text}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              נקודות עד כה: {missionPoints}
            </div>
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
        <p className="text-sm text-muted-foreground">נקודות: {totalPoints} | הושלמו: {completedMissions.length}/{MISSIONS.length}</p>
      </div>

      <div className="space-y-3">
        {MISSIONS.map((m, i) => {
          const done = completedMissions.includes(m.title);
          return (
            <button
              key={i}
              onClick={() => !done && startMission(m)}
              disabled={done}
              className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                done ? "border-green-500/30 bg-green-500/5 opacity-60" : "border-border hover:border-cyan-500/40 bg-card"
              }`}
            >
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
