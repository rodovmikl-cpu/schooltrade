import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest } from "@/lib/arcadePoints";
import { playSound } from "@/lib/sounds";

interface Props { userCode: string; userName: string; }

type Grid = number[][];
const SIZE = 4;

const empty = (): Grid => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

const cloneG = (g: Grid): Grid => g.map(r => r.slice());

const addRandom = (g: Grid): Grid => {
  const empties: [number, number][] = [];
  g.forEach((row, i) => row.forEach((v, j) => { if (v === 0) empties.push([i, j]); }));
  if (!empties.length) return g;
  const [i, j] = empties[Math.floor(Math.random() * empties.length)];
  const ng = cloneG(g);
  ng[i][j] = Math.random() < 0.9 ? 2 : 4;
  return ng;
};

const slideRow = (row: number[]): { row: number[]; gained: number } => {
  let arr = row.filter(v => v !== 0);
  let gained = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i+1]) { arr[i] *= 2; gained += arr[i]; arr[i+1] = 0; }
  }
  arr = arr.filter(v => v !== 0);
  while (arr.length < SIZE) arr.push(0);
  return { row: arr, gained };
};

const move = (g: Grid, dir: "L" | "R" | "U" | "D"): { grid: Grid; gained: number; moved: boolean } => {
  let gained = 0;
  let ng = cloneG(g);
  const transpose = (m: Grid) => m[0].map((_, c) => m.map(r => r[c]));
  if (dir === "U") ng = transpose(ng);
  if (dir === "D") ng = transpose(ng).map(r => r.reverse());
  if (dir === "R") ng = ng.map(r => r.slice().reverse());
  ng = ng.map(r => { const { row, gained: gn } = slideRow(r); gained += gn; return row; });
  if (dir === "R") ng = ng.map(r => r.reverse());
  if (dir === "D") ng = transpose(ng.map(r => r.reverse()));
  if (dir === "U") ng = transpose(ng);
  const moved = JSON.stringify(ng) !== JSON.stringify(g);
  return { grid: ng, gained, moved };
};

const isOver = (g: Grid): boolean => {
  for (const dir of ["L","R","U","D"] as const) if (move(g, dir).moved) return false;
  return true;
};

const has2048 = (g: Grid) => g.some(r => r.some(v => v >= 2048));

const styleFor = (v: number): { bg: string; fg: string; size: string } => {
  const map: Record<number, { bg: string; fg: string }> = {
    0:    { bg: "rgba(238,228,218,0.25)", fg: "#776e65" },
    2:    { bg: "#eee4da", fg: "#776e65" },
    4:    { bg: "#ede0c8", fg: "#776e65" },
    8:    { bg: "#f2b179", fg: "#fff" },
    16:   { bg: "#f59563", fg: "#fff" },
    32:   { bg: "#f67c5f", fg: "#fff" },
    64:   { bg: "#f65e3b", fg: "#fff" },
    128:  { bg: "#edcf72", fg: "#fff" },
    256:  { bg: "#edcc61", fg: "#fff" },
    512:  { bg: "#edc850", fg: "#fff" },
    1024: { bg: "#edc53f", fg: "#fff" },
    2048: { bg: "#edc22e", fg: "#fff" },
  };
  const s = map[v] || { bg: "#3c3a32", fg: "#fff" };
  const size = v >= 1024 ? "text-base sm:text-xl" : v >= 128 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl";
  return { ...s, size };
};

export const Puzzle2048Game = ({ userCode, userName }: Props) => {
  const [grid, setGrid] = useState<Grid>(() => addRandom(addRandom(empty())));
  const [prev, setPrev] = useState<{ grid: Grid; score: number } | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arcade-best-puzzle2048") || "0") || 0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const submittedRef = useRef(0);

  const reset = () => {
    setGrid(addRandom(addRandom(empty())));
    setScore(0); setOver(false); setWon(false); setPrev(null);
    submittedRef.current = 0;
  };

  const undo = () => {
    if (!prev) return;
    setGrid(prev.grid);
    setScore(prev.score);
    setOver(false);
    setPrev(null);
    playSound("click");
  };

  const apply = useCallback((dir: "L"|"R"|"U"|"D") => {
    if (over) return;
    setGrid(g => {
      const { grid: ng, gained, moved } = move(g, dir);
      if (!moved) return g;
      setPrev({ grid: g, score });
      const withRand = addRandom(ng);
      setScore(s => {
        const ns = s + gained;
        if (ns > best) setBest(ns);
        return ns;
      });
      setPopKey(k => k + 1);
      if (gained > 0) playSound("correct");
      if (!won && has2048(withRand)) { setWon(true); playSound("success"); }
      if (isOver(withRand)) { setOver(true); playSound("error"); }
      return withRand;
    });
  }, [over, best, score, won]);

  useEffect(() => {
    if (over && score > 0 && score > submittedRef.current) {
      setArcadeBest("puzzle2048", score);
      submitScore("puzzle2048", userCode, userName, score);
      submittedRef.current = score;
    }
  }, [over, score, userCode, userName]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); apply("L"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); apply("R"); }
      else if (e.key === "ArrowUp") { e.preventDefault(); apply("U"); }
      else if (e.key === "ArrowDown") { e.preventDefault(); apply("D"); }
      else if (e.key === "z" || e.key === "Z") undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [apply]);

  const touchRef = useRef({ x: 0, y: 0 });
  const onTouchStart = (e: React.TouchEvent) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) apply(dx > 0 ? "R" : "L");
    else apply(dy > 0 ? "D" : "U");
  };

  return (
    <Card className="p-4 space-y-4" dir="rtl">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center text-sm">
        <div className="font-bold mb-1">כיצד לשחק:</div>
        <div className="text-muted-foreground">החלק את הלוח כדי לאחד מספרים זהים ולהגיע ל-2048</div>
      </div>
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <div className="flex gap-2">
          <div className="bg-muted rounded-lg px-3 py-1 text-center min-w-16">
            <div className="text-[10px] text-muted-foreground">ניקוד</div>
            <div className="font-bold">{score}</div>
          </div>
          <div className="bg-muted rounded-lg px-3 py-1 text-center min-w-16">
            <div className="text-[10px] text-muted-foreground">שיא</div>
            <div className="font-bold">{best}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={undo} disabled={!prev}>↩️ בטל</Button>
          <Button size="sm" variant="outline" onClick={reset}>🔁 התחל מחדש</Button>
        </div>
      </div>
      <div className="relative max-w-md mx-auto w-full">
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{ background: "#bbada0" }}
          className="rounded-xl p-2 grid grid-cols-4 gap-2 touch-none select-none aspect-square"
        >
          {grid.flatMap((row, i) => row.map((v, j) => {
            const st = styleFor(v);
            return (
              <div key={`${i}-${j}-${popKey}`}
                style={{ background: st.bg, color: st.fg }}
                className={`flex items-center justify-center rounded-lg font-bold ${st.size} shadow-sm transition-all duration-150 ${v !== 0 ? "animate-scale-in" : ""}`}>
                {v !== 0 ? v : ""}
              </div>
            );
          }))}
        </div>
        {(over || won) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl animate-fade-in">
            <div className="bg-card p-5 rounded-2xl text-center shadow-2xl border-2 border-primary/40">
              <div className="text-3xl mb-1">{won && !over ? "🏆 ניצחת!" : "🎯 נגמר"}</div>
              <div>ציון: <b>{score}</b></div>
              <div className="text-xs text-muted-foreground">שיא: {best}</div>
              <div className="flex gap-2 mt-3">
                {won && !over && <Button variant="outline" onClick={() => setWon(false)}>המשך לשחק</Button>}
                <Button onClick={reset}>🔁 משחק חדש</Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 sm:hidden max-w-[180px] mx-auto">
        <div></div><Button size="sm" onClick={() => apply("U")}>▲</Button><div></div>
        <Button size="sm" onClick={() => apply("L")}>◀</Button>
        <Button size="sm" onClick={() => apply("D")}>▼</Button>
        <Button size="sm" onClick={() => apply("R")}>▶</Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">החלק או חיצים • Z לביטול • שלב מספרים זהים להגיע ל-2048!</p>
    </Card>
  );
};
