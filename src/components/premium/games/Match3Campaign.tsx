import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { playSound } from "@/lib/sounds";

const SIZE = 8;
const COLORS = ["🍎", "🍋", "🍇", "🍊", "🫐", "🍓"];

type Grid = (string | null)[][];

const makeGrid = (): Grid => {
  const g: Grid = [];
  for (let r = 0; r < SIZE; r++) {
    g.push([]);
    for (let c = 0; c < SIZE; c++) {
      let v: string;
      do { v = COLORS[Math.floor(Math.random() * COLORS.length)]; }
      while ((c >= 2 && g[r][c - 1] === v && g[r][c - 2] === v) ||
             (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v));
      g[r].push(v);
    }
  }
  return g;
};

const findMatches = (g: Grid): boolean[][] => {
  const m: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE - 2; c++) {
      const v = g[r][c];
      if (v && v === g[r][c + 1] && v === g[r][c + 2]) {
        m[r][c] = m[r][c + 1] = m[r][c + 2] = true;
      }
    }
  }
  for (let c = 0; c < SIZE; c++) {
    for (let r = 0; r < SIZE - 2; r++) {
      const v = g[r][c];
      if (v && v === g[r + 1][c] && v === g[r + 2][c]) {
        m[r][c] = m[r + 1][c] = m[r + 2][c] = true;
      }
    }
  }
  return m;
};

const collapse = (g: Grid): Grid => {
  const ng: Grid = g.map(r => [...r]);
  for (let c = 0; c < SIZE; c++) {
    const col: string[] = [];
    for (let r = SIZE - 1; r >= 0; r--) if (ng[r][c]) col.push(ng[r][c] as string);
    for (let r = SIZE - 1; r >= 0; r--) {
      ng[r][c] = col.shift() ?? COLORS[Math.floor(Math.random() * COLORS.length)];
    }
  }
  return ng;
};

const LEVELS = [
  { goal: 500, moves: 20, name: "מתחיל" },
  { goal: 900, moves: 22, name: "מתקדם" },
  { goal: 1500, moves: 25, name: "מומחה" },
  { goal: 2500, moves: 28, name: "אלוף" },
];

export const Match3Campaign = () => {
  const [grid, setGrid] = useState<Grid>(makeGrid);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [movesLeft, setMovesLeft] = useState(LEVELS[0].moves);
  const [status, setStatus] = useState<"play" | "won" | "lost">("play");

  const target = LEVELS[level];

  const trigger = async (g: Grid): Promise<{ g: Grid; gained: number }> => {
    let cur = g;
    let gained = 0;
    let chain = 1;
    while (true) {
      const m = findMatches(cur);
      const count = m.flat().filter(Boolean).length;
      if (count === 0) break;
      gained += count * 10 * chain;
      chain++;
      cur = cur.map((row, r) => row.map((v, c) => (m[r][c] ? null : v)));
      await new Promise(res => setTimeout(res, 200));
      setGrid(cur);
      cur = collapse(cur);
      await new Promise(res => setTimeout(res, 200));
      setGrid(cur);
    }
    return { g: cur, gained };
  };

  const swap = async (r1: number, c1: number, r2: number, c2: number) => {
    if (status !== "play") return;
    const ng = grid.map(r => [...r]);
    [ng[r1][c1], ng[r2][c2]] = [ng[r2][c2], ng[r1][c1]];
    if (findMatches(ng).flat().every(v => !v)) {
      setGrid(ng);
      setTimeout(() => setGrid(grid), 250);
      playSound("tab");
      return;
    }
    setGrid(ng);
    playSound("enter");
    const result = await trigger(ng);
    setGrid(result.g);
    setScore(s => {
      const ns = s + result.gained;
      const newMoves = movesLeft - 1;
      setMovesLeft(newMoves);
      if (ns >= target.goal) {
        setStatus("won");
      } else if (newMoves <= 0) {
        setStatus("lost");
      }
      return ns;
    });
  };

  const onCell = (r: number, c: number) => {
    if (status !== "play") return;
    if (!selected) { setSelected([r, c]); return; }
    const [sr, sc] = selected;
    if (sr === r && sc === c) { setSelected(null); return; }
    if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
      swap(sr, sc, r, c);
      setSelected(null);
    } else {
      setSelected([r, c]);
    }
  };

  const reset = () => {
    setGrid(makeGrid());
    setSelected(null);
    setScore(0);
    setMovesLeft(LEVELS[level].moves);
    setStatus("play");
  };

  const nextLevel = () => {
    const nl = Math.min(level + 1, LEVELS.length - 1);
    setLevel(nl);
    setGrid(makeGrid());
    setSelected(null);
    setScore(0);
    setMovesLeft(LEVELS[nl].moves);
    setStatus("play");
    playSound("enter");
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-pink-950 to-rose-900 border-rose-500/40" dir="rtl">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h3 className="text-xl font-bold text-rose-300">🧩 קמפיין Match-3</h3>
        <div className="flex gap-3 text-sm flex-wrap">
          <span className="text-yellow-400">ניקוד: {score}/{target.goal}</span>
          <span className="text-cyan-400">מהלכים: {movesLeft}</span>
          <span className="text-purple-300">שלב {level + 1}: {target.name}</span>
        </div>
      </div>
      <div className="relative">
        <div className="grid gap-1 p-2 bg-black/40 rounded-lg" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
          {grid.map((row, r) => row.map((v, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => onCell(r, c)}
              className={`aspect-square flex items-center justify-center text-2xl rounded transition-all ${selected && selected[0] === r && selected[1] === c ? "bg-yellow-400/40 scale-110 ring-2 ring-yellow-400" : "bg-white/10 hover:bg-white/20"}`}
            >
              {v}
            </button>
          )))}
        </div>
        {status !== "play" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg gap-3">
            <div className={`text-2xl font-bold ${status === "won" ? "text-green-400" : "text-red-400"}`}>
              {status === "won" ? "🏆 ניצחת!" : "😢 נגמרו המהלכים"}
            </div>
            <div className="text-yellow-400">ניקוד: {score}</div>
            <div className="flex gap-2">
              <Button onClick={reset} variant="outline">נסה שוב</Button>
              {status === "won" && level < LEVELS.length - 1 && (
                <Button onClick={nextLevel} className="bg-rose-500 hover:bg-rose-600">שלב הבא</Button>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">לחץ על שתי תיבות סמוכות כדי להחליף ביניהן</p>
    </Card>
  );
};
