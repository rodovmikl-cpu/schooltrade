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

const addRandom = (g: Grid): Grid => {
  const empties: [number, number][] = [];
  g.forEach((row, i) => row.forEach((v, j) => { if (v === 0) empties.push([i, j]); }));
  if (!empties.length) return g;
  const [i, j] = empties[Math.floor(Math.random() * empties.length)];
  const ng = g.map(r => r.slice());
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
  let ng = g.map(r => r.slice());
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

const colorFor = (v: number) => {
  const map: Record<number, string> = {
    0: "bg-muted/30",
    2: "bg-amber-100 text-amber-900",
    4: "bg-amber-200 text-amber-900",
    8: "bg-orange-300 text-white",
    16: "bg-orange-400 text-white",
    32: "bg-orange-500 text-white",
    64: "bg-red-500 text-white",
    128: "bg-yellow-400 text-white",
    256: "bg-yellow-500 text-white",
    512: "bg-yellow-600 text-white",
    1024: "bg-emerald-500 text-white",
    2048: "bg-emerald-600 text-white",
  };
  return map[v] || "bg-purple-700 text-white";
};

export const Puzzle2048Game = ({ userCode, userName }: Props) => {
  const [grid, setGrid] = useState<Grid>(() => addRandom(addRandom(empty())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arcade-best-puzzle2048") || "0") || 0);
  const [over, setOver] = useState(false);
  const submittedRef = useRef(0);

  const reset = () => { setGrid(addRandom(addRandom(empty()))); setScore(0); setOver(false); submittedRef.current = 0; };

  const apply = useCallback((dir: "L"|"R"|"U"|"D") => {
    if (over) return;
    setGrid(g => {
      const { grid: ng, gained, moved } = move(g, dir);
      if (!moved) return g;
      const withRand = addRandom(ng);
      setScore(s => {
        const ns = s + gained;
        if (ns > best) { setBest(ns); }
        return ns;
      });
      if (gained > 0) playSound("correct");
      if (isOver(withRand)) {
        setOver(true);
        playSound("error");
      }
      return withRand;
    });
  }, [over, best]);

  // submit on game over or when reaching milestones
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
      <div className="flex justify-between items-center">
        <div className="text-sm">ציון: <b>{score}</b></div>
        <div className="text-sm">שיא: <b>{best}</b></div>
        <Button size="sm" variant="outline" onClick={reset}>🔁 משחק חדש</Button>
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="bg-muted/40 rounded-xl p-2 grid grid-cols-4 gap-2 touch-none select-none aspect-square max-w-md mx-auto w-full"
      >
        {grid.flatMap((row, i) => row.map((v, j) => (
          <div key={`${i}-${j}`}
            className={`flex items-center justify-center rounded-lg font-bold text-xl sm:text-2xl transition-all duration-150 ${colorFor(v)}`}>
            {v !== 0 ? v : ""}
          </div>
        )))}
      </div>
      {over && (
        <div className="text-center text-destructive font-bold animate-fade-in">
          🎯 נגמר המשחק! ציון סופי: {score}
        </div>
      )}
      <div className="grid grid-cols-3 gap-1 sm:hidden max-w-[180px] mx-auto">
        <div></div><Button size="sm" onClick={() => apply("U")}>▲</Button><div></div>
        <Button size="sm" onClick={() => apply("L")}>◀</Button>
        <Button size="sm" onClick={() => apply("D")}>▼</Button>
        <Button size="sm" onClick={() => apply("R")}>▶</Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">החלק או השתמש בחיצים. שלב מספרים זהים כדי להגיע ל-2048!</p>
    </Card>
  );
};
