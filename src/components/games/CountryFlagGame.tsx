import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Difficulty = "easy" | "medium" | "hard";

interface Country {
  name: string;
  code: string;
  difficulty: Difficulty;
}

const COUNTRIES: Country[] = [
  // Easy - common countries
  { name: "ישראל", code: "IL", difficulty: "easy" },
  { name: "ארצות הברית", code: "US", difficulty: "easy" },
  { name: "בריטניה", code: "GB", difficulty: "easy" },
  { name: "צרפת", code: "FR", difficulty: "easy" },
  { name: "גרמניה", code: "DE", difficulty: "easy" },
  { name: "ספרד", code: "ES", difficulty: "easy" },
  { name: "איטליה", code: "IT", difficulty: "easy" },
  { name: "יפן", code: "JP", difficulty: "easy" },
  { name: "סין", code: "CN", difficulty: "easy" },
  { name: "ברזיל", code: "BR", difficulty: "easy" },
  { name: "קנדה", code: "CA", difficulty: "easy" },
  { name: "אוסטרליה", code: "AU", difficulty: "easy" },
  { name: "רוסיה", code: "RU", difficulty: "easy" },
  { name: "הודו", code: "IN", difficulty: "easy" },
  { name: "מקסיקו", code: "MX", difficulty: "easy" },
  { name: "טורקיה", code: "TR", difficulty: "easy" },
  { name: "דרום קוריאה", code: "KR", difficulty: "easy" },
  { name: "ארגנטינה", code: "AR", difficulty: "easy" },
  { name: "מצרים", code: "EG", difficulty: "easy" },
  { name: "שוודיה", code: "SE", difficulty: "easy" },
  { name: "נורבגיה", code: "NO", difficulty: "easy" },
  { name: "שוויץ", code: "CH", difficulty: "easy" },
  { name: "יוון", code: "GR", difficulty: "easy" },
  { name: "פולין", code: "PL", difficulty: "easy" },
  { name: "הולנד", code: "NL", difficulty: "easy" },
  // Medium - less common
  { name: "פורטוגל", code: "PT", difficulty: "medium" },
  { name: "אוקראינה", code: "UA", difficulty: "medium" },
  { name: "תאילנד", code: "TH", difficulty: "medium" },
  { name: "וייטנאם", code: "VN", difficulty: "medium" },
  { name: "אינדונזיה", code: "ID", difficulty: "medium" },
  { name: "פקיסטן", code: "PK", difficulty: "medium" },
  { name: "ניגריה", code: "NG", difficulty: "medium" },
  { name: "קולומביה", code: "CO", difficulty: "medium" },
  { name: "צ'ילה", code: "CL", difficulty: "medium" },
  { name: "פרו", code: "PE", difficulty: "medium" },
  { name: "אירלנד", code: "IE", difficulty: "medium" },
  { name: "פינלנד", code: "FI", difficulty: "medium" },
  { name: "דנמרק", code: "DK", difficulty: "medium" },
  { name: "צ'כיה", code: "CZ", difficulty: "medium" },
  { name: "רומניה", code: "RO", difficulty: "medium" },
  { name: "קרואטיה", code: "HR", difficulty: "medium" },
  { name: "מרוקו", code: "MA", difficulty: "medium" },
  { name: "ניו זילנד", code: "NZ", difficulty: "medium" },
  { name: "פיליפינים", code: "PH", difficulty: "medium" },
  { name: "מלזיה", code: "MY", difficulty: "medium" },
  { name: "קניה", code: "KE", difficulty: "medium" },
  { name: "אתיופיה", code: "ET", difficulty: "medium" },
  { name: "סרביה", code: "RS", difficulty: "medium" },
  { name: "בולגריה", code: "BG", difficulty: "medium" },
  { name: "הונגריה", code: "HU", difficulty: "medium" },
  // Hard - rare / lesser known
  { name: "בהוטן", code: "BT", difficulty: "hard" },
  { name: "לאוס", code: "LA", difficulty: "hard" },
  { name: "מיאנמר", code: "MM", difficulty: "hard" },
  { name: "מדגסקר", code: "MG", difficulty: "hard" },
  { name: "מוזמביק", code: "MZ", difficulty: "hard" },
  { name: "פנמה", code: "PA", difficulty: "hard" },
  { name: "בוליביה", code: "BO", difficulty: "hard" },
  { name: "פרגוואי", code: "PY", difficulty: "hard" },
  { name: "אורוגוואי", code: "UY", difficulty: "hard" },
  { name: "סלובניה", code: "SI", difficulty: "hard" },
  { name: "אסטוניה", code: "EE", difficulty: "hard" },
  { name: "לטביה", code: "LV", difficulty: "hard" },
  { name: "ליטא", code: "LT", difficulty: "hard" },
  { name: "אלבניה", code: "AL", difficulty: "hard" },
  { name: "מונגוליה", code: "MN", difficulty: "hard" },
  { name: "נפאל", code: "NP", difficulty: "hard" },
  { name: "קמבודיה", code: "KH", difficulty: "hard" },
  { name: "סנגל", code: "SN", difficulty: "hard" },
  { name: "גאנה", code: "GH", difficulty: "hard" },
  { name: "טוגו", code: "TG", difficulty: "hard" },
  { name: "סורינאם", code: "SR", difficulty: "hard" },
  { name: "טונגה", code: "TO", difficulty: "hard" },
  { name: "פיג'י", code: "FJ", difficulty: "hard" },
  { name: "מאוריציוס", code: "MU", difficulty: "hard" },
  { name: "ברוניי", code: "BN", difficulty: "hard" },
];

const getFlagUrl = (code: string) => `https://flagcdn.com/w320/${code.toLowerCase()}.png`;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const CountryFlagGame = () => {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [hearts, setHearts] = useState(3);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => {
    return parseInt(localStorage.getItem("flagGameBestStreak") || "0", 10);
  });
  const [currentCountry, setCurrentCountry] = useState<Country | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const [usedCodes, setUsedCodes] = useState<Set<string>>(new Set());

  const getPool = useCallback((diff: Difficulty) => {
    if (diff === "easy") return COUNTRIES.filter(c => c.difficulty === "easy");
    if (diff === "medium") return COUNTRIES.filter(c => c.difficulty === "easy" || c.difficulty === "medium");
    return COUNTRIES;
  }, []);

  const generateRound = useCallback((diff: Difficulty, used: Set<string>) => {
    const pool = getPool(diff);
    const available = pool.filter(c => !used.has(c.code));
    const source = available.length >= 4 ? available : pool;
    
    const correct = source[Math.floor(Math.random() * source.length)];
    const wrongPool = COUNTRIES.filter(c => c.code !== correct.code);
    const wrongs = shuffle(wrongPool).slice(0, 3).map(c => c.name);
    const allOptions = shuffle([correct.name, ...wrongs]);

    setCurrentCountry(correct);
    setOptions(allOptions);
    setSelected(null);
    setShowResult(false);
    setUsedCodes(prev => new Set([...prev, correct.code]));
  }, [getPool]);

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setHearts(3);
    setStreak(0);
    setGameOver(false);
    setNewRecord(false);
    setUsedCodes(new Set());
    generateRound(diff, new Set());
  };

  const handleAnswer = (answer: string) => {
    if (showResult || !currentCountry) return;
    setSelected(answer);
    setShowResult(true);

    const correct = answer === currentCountry.name;

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        localStorage.setItem("flagGameBestStreak", String(newStreak));
        setNewRecord(true);
      }
    } else {
      const newHearts = hearts - 1;
      setHearts(newHearts);
      if (newHearts <= 0) {
        setTimeout(() => setGameOver(true), 1200);
        return;
      }
    }

    setTimeout(() => {
      if (difficulty) generateRound(difficulty, usedCodes);
    }, 1200);
  };

  // Menu
  if (!difficulty || gameOver) {
    return (
      <div className="max-w-lg mx-auto space-y-6 text-center" dir="rtl">
        <h2 className="text-3xl font-bold">🌍 משחק המדינות</h2>
        <p className="text-muted-foreground">זהה את הדגל ובחר את המדינה הנכונה</p>

        {gameOver && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-6 space-y-3">
              <p className="text-4xl">💔</p>
              <p className="text-xl font-bold">הפסדת!</p>
              <p className="text-muted-foreground">הרצף שלך: {streak} תשובות נכונות</p>
              {newRecord && (
                <p className="text-primary font-bold animate-pulse">🏆 שיא חדש!</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-6 space-y-2">
            <p className="font-medium">🏆 השיא שלך: <span className="text-primary font-bold">{bestStreak}</span></p>
          </CardContent>
        </Card>

        <p className="font-semibold">בחר רמת קושי:</p>
        <div className="grid grid-cols-3 gap-3">
          <Button onClick={() => startGame("easy")} variant="outline" className="flex-col h-auto py-4 border-green-500/40 hover:bg-green-500/10">
            <span className="text-xl">😊</span>
            <span>קל</span>
          </Button>
          <Button onClick={() => startGame("medium")} variant="outline" className="flex-col h-auto py-4 border-yellow-500/40 hover:bg-yellow-500/10">
            <span className="text-xl">🤔</span>
            <span>בינוני</span>
          </Button>
          <Button onClick={() => startGame("hard")} variant="outline" className="flex-col h-auto py-4 border-red-500/40 hover:bg-red-500/10">
            <span className="text-xl">🔥</span>
            <span>קשה</span>
          </Button>
        </div>
      </div>
    );
  }

  if (!currentCountry) return null;

  return (
    <div className="max-w-lg mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => { setDifficulty(null); setGameOver(false); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← חזרה לתפריט
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">רצף: <span className="text-primary font-bold">{streak}</span></span>
          <div className="flex gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={`text-lg transition-all duration-300 ${i < hearts ? "opacity-100 scale-100" : "opacity-30 scale-75"}`}>
                ❤️
              </span>
            ))}
          </div>
        </div>
      </div>

      {newRecord && (
        <div className="text-center text-primary font-bold animate-pulse text-sm">
          🏆 שיא חדש! {bestStreak}
        </div>
      )}

      {/* Flag */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 flex items-center justify-center bg-muted/30" style={{ minHeight: 200 }}>
          <img
            src={getFlagUrl(currentCountry.code)}
            alt="דגל"
            className="max-h-48 w-auto object-contain p-4"
            style={{ animation: "fadeSlideIn 0.3s ease-out" }}
          />
        </CardContent>
      </Card>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          let cls = "border-border hover:border-primary/50";
          if (showResult) {
            if (opt === currentCountry.name) cls = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
            else if (opt === selected) cls = "border-destructive bg-destructive/10 text-destructive";
            else cls = "opacity-50";
          }
          return (
            <Button
              key={opt}
              variant="outline"
              className={`h-auto py-3 px-4 text-base transition-all duration-300 ${cls}`}
              onClick={() => handleAnswer(opt)}
              disabled={showResult}
            >
              {opt}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
