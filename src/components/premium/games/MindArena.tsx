import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";
import { DailyQuestPanel } from "@/components/premium/DailyQuestPanel";
import { updateQuestProgress } from "@/lib/dailyQuests";

interface Puzzle {
  question: string;
  hint: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard" | "elite";
  category: "logic" | "crypto" | "hacker" | "code" | "pattern";
  points: number;
  timeLimit: number;
}

const ALL_PUZZLES: Puzzle[] = [
  // Easy
  { question: "כמה זה 12 × 12?", hint: "חשוב על תריסר", answer: "144", difficulty: "easy", category: "logic", points: 30, timeLimit: 30 },
  { question: "מה מספר האותיות ב-HELLO?", hint: "ספור", answer: "5", difficulty: "easy", category: "code", points: 25, timeLimit: 20 },
  { question: "2, 4, 6, 8, ?", hint: "דפוס פשוט", answer: "10", difficulty: "easy", category: "pattern", points: 20, timeLimit: 20 },
  { question: "מה ההפך של 'חם'?", hint: "טמפרטורה", answer: "קר", difficulty: "easy", category: "logic", points: 20, timeLimit: 15 },
  { question: "1+1 בבינארי = ?", hint: "לא 2", answer: "10", difficulty: "easy", category: "hacker", points: 30, timeLimit: 25 },
  // Medium
  { question: "אם 2+3=10, 7+2=63, 6+5=66, 8+4=?", hint: "כפל ואז חיבור", answer: "96", difficulty: "medium", category: "logic", points: 60, timeLimit: 45 },
  { question: "יש לי 6 פנים, 21 עיניים. מה אני?", hint: "משחק שולחן", answer: "קוביה", difficulty: "medium", category: "logic", points: 50, timeLimit: 40 },
  { question: "פתור: √(144) × √(25) = ?", hint: "שורשים פשוטים", answer: "60", difficulty: "medium", category: "logic", points: 50, timeLimit: 30 },
  { question: "1=A, 2=B... מה זה 8-5-12-12-15?", hint: "מילה באנגלית", answer: "HELLO", difficulty: "medium", category: "code", points: 65, timeLimit: 50 },
  { question: "3, 5, 8, 13, 21, ?", hint: "סדרה מפורסמת", answer: "34", difficulty: "medium", category: "pattern", points: 55, timeLimit: 35 },
  { question: "מי יצר את ביטקוין? (שם משפחה)", hint: "שם יפני", answer: "נקמוטו", difficulty: "medium", category: "crypto", points: 60, timeLimit: 40 },
  // Hard
  { question: "מה מגיע פעם בדקה, פעמיים ברגע, ולא באלף שנים?", hint: "אותיות", answer: "ר", difficulty: "hard", category: "logic", points: 100, timeLimit: 60 },
  { question: "מה שם הטכנולוגיה שמאחורי ביטקוין?", hint: "שרשרת", answer: "בלוקצ'יין", difficulty: "hard", category: "crypto", points: 90, timeLimit: 45 },
  { question: "ROT13: 'URYYB' — מה המילה?", hint: "הזז 13 אותיות", answer: "HELLO", difficulty: "hard", category: "hacker", points: 120, timeLimit: 60 },
  { question: "1, 1, 2, 3, 5, 8, 13, 21, 34, ?", hint: "פיבונאצ'י", answer: "55", difficulty: "hard", category: "pattern", points: 100, timeLimit: 40 },
  { question: "A=1... אם APPLE=50, GRAPE=50, LEMON=?", hint: "סכום ערכי אותיות", answer: "54", difficulty: "hard", category: "code", points: 130, timeLimit: 75 },
  // Elite
  { question: "01001000 01001001 — מה ההודעה?", hint: "בינארי ל-ASCII", answer: "HI", difficulty: "elite", category: "hacker", points: 200, timeLimit: 90 },
  { question: "בקוד מורס: .- -... = ?", hint: "שתי אותיות", answer: "AB", difficulty: "elite", category: "hacker", points: 200, timeLimit: 60 },
  { question: "x² - 5x + 6 = 0. מצא את x (הגדול)", hint: "פירוק לגורמים", answer: "3", difficulty: "elite", category: "logic", points: 180, timeLimit: 60 },
  { question: "SHA-256 מפיק כמה ביטים?", hint: "השם אומר הכל", answer: "256", difficulty: "elite", category: "hacker", points: 160, timeLimit: 30 },
  { question: "2, 6, 14, 30, 62, ?", hint: "×2+2", answer: "126", difficulty: "elite", category: "pattern", points: 220, timeLimit: 60 },
];

// Daily & weekly puzzle generation
const getDaySeed = () => {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
};
const getWeekSeed = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / (7 * 86400000));
};

const seededRand = (seed: number) => {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
};

const getDailyPuzzle = (): Puzzle => {
  const r = seededRand(getDaySeed());
  const idx = Math.floor(r() * ALL_PUZZLES.length);
  return { ...ALL_PUZZLES[idx], points: ALL_PUZZLES[idx].points * 2 };
};

const getWeeklyElite = (): Puzzle => {
  const r = seededRand(getWeekSeed());
  const elites = ALL_PUZZLES.filter(p => p.difficulty === "elite");
  return { ...elites[Math.floor(r() * elites.length)], points: elites[0].points * 3, timeLimit: 120 };
};

type Difficulty = "easy" | "medium" | "hard" | "elite";
const DIFFICULTIES: { key: Difficulty; label: string; color: string; emoji: string }[] = [
  { key: "easy", label: "קל", color: "text-green-400 border-green-500/40", emoji: "🟢" },
  { key: "medium", label: "בינוני", color: "text-yellow-400 border-yellow-500/40", emoji: "🟡" },
  { key: "hard", label: "קשה", color: "text-orange-400 border-orange-500/40", emoji: "🟠" },
  { key: "elite", label: "עילית", color: "text-red-400 border-red-500/40", emoji: "🔴" },
];

const STORAGE_KEY = "mind-arena-state";

interface ArenaState {
  totalPoints: number;
  solved: string[];
  badges: string[];
  level: number;
  xp: number;
  xpToNext: number;
}

export const MindArena = () => {
  const [state, setState] = useState<ArenaState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        return {
          totalPoints: p.totalPoints || 0, solved: p.solved || [], badges: p.badges || [],
          level: p.level || 1, xp: p.xp || 0, xpToNext: p.xpToNext || 200,
        };
      } catch {}
    }
    return { totalPoints: 0, solved: [], badges: [], level: 1, xp: 0, xpToNext: 200 };
  });
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [phase, setPhase] = useState<"menu" | "difficulty" | "playing" | "result" | "daily" | "weekly">("menu");
  const [showBadge, setShowBadge] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  useEffect(() => {
    if (phase === "playing" && timeLeft > 0) {
      const t = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { setResult("wrong"); setPhase("result"); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [phase, timeLeft]);

  const addXP = (amount: number, s: ArenaState): ArenaState => {
    let xp = s.xp + amount;
    let level = s.level;
    let xpToNext = s.xpToNext;
    const badges = [...s.badges];
    while (xp >= xpToNext) { xp -= xpToNext; level++; xpToNext = Math.floor(xpToNext * 1.3); playPremiumSound("levelUp"); }
    if (s.solved.length >= 5 && !badges.includes("brain")) { badges.push("brain"); setShowBadge("🧠 מוח חד"); }
    if (s.solved.length >= 15 && !badges.includes("genius")) { badges.push("genius"); setShowBadge("💡 גאון"); }
    if (s.solved.filter(q => ALL_PUZZLES.find(p => p.question === q)?.difficulty === "elite").length >= 3 && !badges.includes("hacker")) { badges.push("hacker"); setShowBadge("💻 האקר"); }
    if (level >= 5 && !badges.includes("master")) { badges.push("master"); setShowBadge("👑 מאסטר"); }
    return { ...s, xp, level, xpToNext, badges };
  };

  const startPuzzle = (puzzle: Puzzle) => {
    playPremiumSound("gameStart");
    setCurrentPuzzle(puzzle); setAnswer(""); setShowHint(false); setResult(null);
    setTimeLeft(puzzle.timeLimit); setPhase("playing");
  };

  const submitAnswer = () => {
    if (!currentPuzzle) return;
    const isCorrect = answer.trim().toLowerCase() === currentPuzzle.answer.toLowerCase() || answer.trim() === currentPuzzle.answer;
    if (isCorrect) {
      playPremiumSound("specialSuccess");
      setResult("correct");
      updateQuestProgress("mindArena", `mindArena-${getDaySeed()}-0`, 1);
      setState(prev => {
        let next = { ...prev, totalPoints: prev.totalPoints + currentPuzzle.points, solved: [...prev.solved, currentPuzzle.question] };
        return addXP(currentPuzzle.points / 3, next);
      });
    } else {
      playSound("error");
      setResult("wrong");
    }
    setPhase("result");
  };

  const getPuzzlesForDifficulty = (d: Difficulty) => ALL_PUZZLES.filter(p => p.difficulty === d && !state.solved.includes(p.question));
  const catIcon = (c: string) => c === "logic" ? "🧩" : c === "crypto" ? "₿" : c === "hacker" ? "💻" : c === "pattern" ? "🔢" : "🔐";

  // Menu
  if (phase === "menu") {
    const daily = getDailyPuzzle();
    const dailySolved = state.solved.includes(daily.question);
    const weekly = getWeeklyElite();
    const weeklySolved = state.solved.includes(weekly.question);

    return (
      <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-purple-400">🧠 אליפות המוחות: חידות עילית</h3>
          <p className="text-sm text-muted-foreground">רמה {state.level} | נקודות: {state.totalPoints} | נפתרו: {state.solved.length}/{ALL_PUZZLES.length}</p>
        </div>

        {/* XP Bar */}
        <div className="px-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>רמה {state.level}</span>
            <span>{state.xp}/{state.xpToNext} XP</span>
          </div>
          <Progress value={(state.xp / state.xpToNext) * 100} className="h-2" />
        </div>

        {showBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-card border-2 border-purple-500/50 rounded-2xl p-6 text-center animate-scale-in shadow-2xl">
              <div className="text-4xl mb-2">{showBadge.split(" ")[0]}</div>
              <p className="text-lg font-bold text-purple-400">תג חדש!</p>
              <p className="font-medium">{showBadge}</p>
            </div>
          </div>
        )}

        {state.badges.length > 0 && (
          <div className="flex gap-2 justify-center flex-wrap">
            {state.badges.includes("brain") && <Badge className="bg-yellow-500/20 text-yellow-400">🧠 מוח חד</Badge>}
            {state.badges.includes("genius") && <Badge className="bg-blue-500/20 text-blue-400">💡 גאון</Badge>}
            {state.badges.includes("hacker") && <Badge className="bg-red-500/20 text-red-400">💻 האקר</Badge>}
            {state.badges.includes("master") && <Badge className="bg-purple-500/20 text-purple-400">👑 מאסטר</Badge>}
          </div>
        )}

        <DailyQuestPanel gameKey="mindArena" />

        {/* Daily & Weekly */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => !dailySolved && startPuzzle(daily)} disabled={dailySolved}
            className={`p-4 rounded-xl border-2 text-center transition-all ${dailySolved ? "border-green-500/30 opacity-60" : "border-primary/40 hover:border-primary bg-primary/5"}`}>
            <div className="text-2xl mb-1">📅</div>
            <div className="font-bold text-sm">חידה יומית</div>
            <div className="text-xs text-muted-foreground">×2 נקודות</div>
            {dailySolved && <span className="text-green-400 text-xs">✅</span>}
          </button>
          <button onClick={() => !weeklySolved && startPuzzle(weekly)} disabled={weeklySolved}
            className={`p-4 rounded-xl border-2 text-center transition-all ${weeklySolved ? "border-green-500/30 opacity-60" : "border-red-500/40 hover:border-red-500 bg-red-500/5"}`}>
            <div className="text-2xl mb-1">🏆</div>
            <div className="font-bold text-sm">אתגר שבועי</div>
            <div className="text-xs text-muted-foreground">×3 נקודות | עילית</div>
            {weeklySolved && <span className="text-green-400 text-xs">✅</span>}
          </button>
        </div>

        {/* Difficulty selection */}
        <p className="text-sm font-bold text-muted-foreground">בחר רמת קושי:</p>
        <div className="grid grid-cols-2 gap-3">
          {DIFFICULTIES.map(d => {
            const count = getPuzzlesForDifficulty(d.key).length;
            const total = ALL_PUZZLES.filter(p => p.difficulty === d.key).length;
            return (
              <button key={d.key} onClick={() => { setSelectedDifficulty(d.key); setPhase("difficulty"); }}
                className={`p-4 rounded-xl border-2 ${d.color} bg-card hover:scale-[1.02] transition-all text-center`}>
                <div className="text-2xl mb-1">{d.emoji}</div>
                <div className="font-bold">{d.label}</div>
                <div className="text-xs text-muted-foreground">{total - count}/{total} נפתרו</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Difficulty puzzle list
  if (phase === "difficulty" && selectedDifficulty) {
    const puzzles = getPuzzlesForDifficulty(selectedDifficulty);
    const diffInfo = DIFFICULTIES.find(d => d.key === selectedDifficulty)!;
    return (
      <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
        <button onClick={() => setPhase("menu")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <span>←</span> חזרה
        </button>
        <h3 className="text-xl font-bold text-center">{diffInfo.emoji} חידות — {diffInfo.label}</h3>
        {puzzles.length === 0 ? (
          <Card><CardContent className="py-8 text-center">
            <p className="text-xl font-bold text-green-400">🎉 פתרת את כל החידות ברמה זו!</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {puzzles.map((p, i) => (
              <button key={i} onClick={() => startPuzzle(p)}
                className="w-full text-right p-4 rounded-xl border-2 border-border hover:border-purple-500/40 transition-all bg-card">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg ml-2">{catIcon(p.category)}</span>
                    <span className="font-medium">{p.question.slice(0, 40)}...</span>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">{p.points} נק' | {p.timeLimit}ש'</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Result
  if (phase === "result" && currentPuzzle) {
    return (
      <div className="max-w-lg mx-auto" dir="rtl">
        <Card className="animate-scale-in">
          <CardContent className="py-8 text-center space-y-4">
            <div className="text-5xl">{result === "correct" ? "🎉" : "😔"}</div>
            <p className={`text-2xl font-bold ${result === "correct" ? "text-green-400" : "text-red-400"}`}>
              {result === "correct" ? "נכון!" : "לא נכון"}
            </p>
            <p className="text-muted-foreground">התשובה: {currentPuzzle.answer}</p>
            {result === "correct" && <p className="text-primary font-bold">+{currentPuzzle.points} נקודות!</p>}
            <Button onClick={() => setPhase(selectedDifficulty ? "difficulty" : "menu")} className="w-full">חזרה</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing
  return (
    <div className="max-w-lg mx-auto" dir="rtl">
      <Card className="animate-fade-in border-purple-500/30">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{catIcon(currentPuzzle?.category || "")} חידה</CardTitle>
            <span className={`font-bold text-lg ${timeLeft < 10 ? "text-red-400 animate-pulse" : ""}`}>⏱️ {timeLeft}ש'</span>
          </div>
          {currentPuzzle && (
            <Badge variant="outline" className={DIFFICULTIES.find(d => d.key === currentPuzzle.difficulty)?.color}>
              {DIFFICULTIES.find(d => d.key === currentPuzzle.difficulty)?.label}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 bg-muted/50 rounded-xl text-center">
            <p className="text-xl font-bold leading-relaxed">{currentPuzzle?.question}</p>
          </div>
          {showHint && (
            <div className="p-3 bg-yellow-500/10 rounded-lg text-center text-sm animate-fade-in">💡 רמז: {currentPuzzle?.hint}</div>
          )}
          <div className="flex gap-2">
            <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="התשובה שלך..." className="flex-1 text-lg text-center"
              onKeyDown={(e) => { if (e.key === "Enter") submitAnswer(); }} />
            <Button onClick={submitAnswer} disabled={!answer.trim()}>שלח</Button>
          </div>
          <div className="flex gap-2">
            {!showHint && <Button variant="ghost" onClick={() => setShowHint(true)} className="flex-1 text-sm">💡 רמז</Button>}
            <Button variant="ghost" onClick={() => setPhase(selectedDifficulty ? "difficulty" : "menu")} className="flex-1 text-sm">חזרה</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
