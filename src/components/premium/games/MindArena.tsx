import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";

interface Puzzle {
  question: string;
  hint: string;
  answer: string;
  difficulty: "hard" | "expert" | "elite";
  category: "logic" | "crypto" | "hacker" | "code";
  points: number;
  timeLimit: number;
}

const PUZZLES: Puzzle[] = [
  // Logic puzzles
  { question: "אם 2+3=10, 7+2=63, 6+5=66, 8+4=?", hint: "חשוב על כפל ואז חיבור", answer: "96", difficulty: "hard", category: "logic", points: 100, timeLimit: 60 },
  { question: "יש לי 6 פנים, 21 עיניים, ואני תמיד מתגלגל. מה אני?", hint: "משחק שולחן", answer: "קוביה", difficulty: "hard", category: "logic", points: 80, timeLimit: 45 },
  { question: "מה מגיע פעם בדקה, פעמיים ברגע, ואף פעם לא באלף שנים?", hint: "חשוב על אותיות", answer: "ר", difficulty: "expert", category: "logic", points: 150, timeLimit: 60 },
  { question: "01001000 01001001 — מה ההודעה?", hint: "קוד בינארי ל-ASCII", answer: "HI", difficulty: "elite", category: "hacker", points: 200, timeLimit: 90 },
  // Crypto riddles
  { question: "מה שווה 1 BTC בדולרים (בערך)? כתוב ספרה ראשונה בלבד", hint: "עשרות אלפים", answer: "9", difficulty: "hard", category: "crypto", points: 80, timeLimit: 30 },
  { question: "מי יצר את ביטקוין? (שם משפחה)", hint: "שם יפני", answer: "נקמוטו", difficulty: "hard", category: "crypto", points: 100, timeLimit: 45 },
  { question: "מה שם הטכנולוגיה שמאחורי ביטקוין?", hint: "שרשרת", answer: "בלוקצ'יין", difficulty: "expert", category: "crypto", points: 120, timeLimit: 45 },
  // Hacker codes
  { question: "ROT13: 'URYYB' — מה המילה המקורית?", hint: "הזז 13 אותיות", answer: "HELLO", difficulty: "expert", category: "hacker", points: 150, timeLimit: 60 },
  { question: "בקוד מורס: .- -... = ?", hint: "שתי אותיות", answer: "AB", difficulty: "elite", category: "hacker", points: 200, timeLimit: 60 },
  // Secret codes
  { question: "1=A, 2=B, 3=C... מה זה: 8-5-12-12-15?", hint: "מילה באנגלית", answer: "HELLO", difficulty: "hard", category: "code", points: 100, timeLimit: 60 },
  { question: "אם APPLE=50, GRAPE=50, LEMON=?", hint: "סכום ערכי אותיות (A=1)", answer: "54", difficulty: "elite", category: "code", points: 250, timeLimit: 90 },
  { question: "פתור: √(144) × √(25) = ?", hint: "שורשים פשוטים", answer: "60", difficulty: "hard", category: "logic", points: 80, timeLimit: 30 },
];

const STORAGE_KEY = "mind-arena-state";

interface ArenaState {
  totalPoints: number;
  solved: string[];
  badges: string[];
}

export const MindArena = () => {
  const [state, setState] = useState<ArenaState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { return JSON.parse(saved); } catch {}
    return { totalPoints: 0, solved: [], badges: [] };
  });
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [phase, setPhase] = useState<"menu" | "playing" | "result">("menu");

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  useEffect(() => {
    if (phase === "playing" && timeLeft > 0) {
      const t = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setResult("wrong");
            setPhase("result");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [phase, timeLeft]);

  const startPuzzle = (puzzle: Puzzle) => {
    playPremiumSound("gameStart");
    setCurrentPuzzle(puzzle);
    setAnswer("");
    setShowHint(false);
    setResult(null);
    setTimeLeft(puzzle.timeLimit);
    setPhase("playing");
  };

  const submitAnswer = () => {
    if (!currentPuzzle) return;
    const isCorrect = answer.trim().toLowerCase() === currentPuzzle.answer.toLowerCase() ||
      answer.trim() === currentPuzzle.answer;

    if (isCorrect) {
      playPremiumSound("specialSuccess");
      setResult("correct");
      const newPoints = state.totalPoints + currentPuzzle.points;
      const newSolved = [...state.solved, currentPuzzle.question];
      const newBadges = [...state.badges];

      if (newSolved.length >= 5 && !newBadges.includes("brain")) newBadges.push("brain");
      if (newSolved.length >= 10 && !newBadges.includes("elite")) newBadges.push("elite");
      if (currentPuzzle.difficulty === "elite" && !newBadges.includes("hacker")) newBadges.push("hacker");

      setState({ totalPoints: newPoints, solved: newSolved, badges: newBadges });
    } else {
      playSound("error");
      setResult("wrong");
    }
    setPhase("result");
  };

  const unsolved = PUZZLES.filter(p => !state.solved.includes(p.question));
  const diffColor = (d: string) => d === "elite" ? "text-red-400" : d === "expert" ? "text-purple-400" : "text-yellow-400";
  const catIcon = (c: string) => c === "logic" ? "🧩" : c === "crypto" ? "₿" : c === "hacker" ? "💻" : "🔐";

  if (phase === "menu") {
    return (
      <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-purple-400">🧠 אליפות המוחות: חידות עילית</h3>
          <p className="text-sm text-muted-foreground">נקודות: {state.totalPoints} | נפתרו: {state.solved.length}/{PUZZLES.length}</p>
        </div>

        {state.badges.length > 0 && (
          <div className="flex gap-2 justify-center">
            {state.badges.includes("brain") && <Badge className="bg-yellow-500/20 text-yellow-400">🧠 מוח חד</Badge>}
            {state.badges.includes("elite") && <Badge className="bg-purple-500/20 text-purple-400">👑 עילית</Badge>}
            {state.badges.includes("hacker") && <Badge className="bg-red-500/20 text-red-400">💻 האקר</Badge>}
          </div>
        )}

        <div className="space-y-2">
          {unsolved.length === 0 ? (
            <Card><CardContent className="py-8 text-center">
              <p className="text-2xl font-bold text-yellow-400">🏆 פתרת את כל החידות!</p>
              <p className="text-muted-foreground mt-2">סה"כ נקודות: {state.totalPoints}</p>
            </CardContent></Card>
          ) : (
            unsolved.map((p, i) => (
              <button
                key={i}
                onClick={() => startPuzzle(p)}
                className="w-full text-right p-4 rounded-xl border-2 border-border hover:border-purple-500/40 transition-all bg-card"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg ml-2">{catIcon(p.category)}</span>
                    <span className="font-medium">{p.question.slice(0, 40)}...</span>
                  </div>
                  <div className="text-left">
                    <span className={`text-sm font-bold ${diffColor(p.difficulty)}`}>
                      {p.difficulty === "elite" ? "עילית" : p.difficulty === "expert" ? "מומחה" : "קשה"}
                    </span>
                    <div className="text-xs text-muted-foreground">{p.points} נק' | {p.timeLimit}ש'</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

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
            <Button onClick={() => setPhase("menu")} className="w-full">חזרה לתפריט</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto" dir="rtl">
      <Card className="animate-fade-in border-purple-500/30">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{catIcon(currentPuzzle?.category || "")} חידה</CardTitle>
            <span className={`font-bold text-lg ${timeLeft < 10 ? "text-red-400 animate-pulse" : ""}`}>
              ⏱️ {timeLeft}ש'
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 bg-muted/50 rounded-xl text-center">
            <p className="text-xl font-bold leading-relaxed">{currentPuzzle?.question}</p>
          </div>

          {showHint && (
            <div className="p-3 bg-yellow-500/10 rounded-lg text-center text-sm animate-fade-in">
              💡 רמז: {currentPuzzle?.hint}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="התשובה שלך..."
              className="flex-1 text-lg text-center"
              onKeyDown={(e) => { if (e.key === "Enter") submitAnswer(); }}
            />
            <Button onClick={submitAnswer} disabled={!answer.trim()}>שלח</Button>
          </div>

          <div className="flex gap-2">
            {!showHint && (
              <Button variant="ghost" onClick={() => setShowHint(true)} className="flex-1 text-sm">
                💡 רמז
              </Button>
            )}
            <Button variant="ghost" onClick={() => setPhase("menu")} className="flex-1 text-sm">
              חזרה
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
