import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest } from "@/lib/arcadePoints";
import { playSound } from "@/lib/sounds";

interface Props { userCode: string; userName: string; }

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
const N = 20, CELL = 18;

export const SnakeArcadeGame = ({ userCode, userName }: Props) => {
  const cvs = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arcade-best-snake") || "0") || 0);
  const stRef = useRef({ snake: [{x:10,y:10}], dir: "RIGHT" as Dir, nextDir: "RIGHT" as Dir, food: {x:15,y:10}, alive: true, score: 0, tick: 150 });

  const newFood = (snake: {x:number;y:number}[]) => {
    let f; do { f = { x: Math.floor(Math.random()*N), y: Math.floor(Math.random()*N) }; }
    while (snake.some(s => s.x===f.x && s.y===f.y));
    return f;
  };

  const start = () => {
    stRef.current = { snake: [{x:10,y:10}], dir: "RIGHT", nextDir: "RIGHT", food: {x:15,y:10}, alive: true, score: 0, tick: 150 };
    setScore(0); setRunning(true);
  };

  const setDir = useCallback((d: Dir) => {
    const cur = stRef.current.dir;
    if ((d==="UP"&&cur==="DOWN")||(d==="DOWN"&&cur==="UP")||(d==="LEFT"&&cur==="RIGHT")||(d==="RIGHT"&&cur==="LEFT")) return;
    stRef.current.nextDir = d;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") setDir("UP");
      else if (e.key === "ArrowDown") setDir("DOWN");
      else if (e.key === "ArrowLeft") setDir("LEFT");
      else if (e.key === "ArrowRight") setDir("RIGHT");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDir]);

  useEffect(() => {
    if (!running) return;
    const ctx = cvs.current!.getContext("2d")!;
    let id: any;
    const tick = () => {
      const s = stRef.current;
      s.dir = s.nextDir;
      const head = { ...s.snake[0] };
      if (s.dir==="UP") head.y--; else if (s.dir==="DOWN") head.y++; else if (s.dir==="LEFT") head.x--; else head.x++;
      if (head.x<0||head.y<0||head.x>=N||head.y>=N||s.snake.some(b=>b.x===head.x&&b.y===head.y)) { s.alive=false; }
      if (s.alive) {
        s.snake.unshift(head);
        if (head.x===s.food.x && head.y===s.food.y) {
          s.score += 10; setScore(s.score); playSound("correct");
          s.food = newFood(s.snake);
          s.tick = Math.max(60, s.tick - 3);
        } else s.snake.pop();
      }
      // draw
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0,0,N*CELL,N*CELL);
      ctx.fillStyle = "#ef4444"; ctx.fillRect(s.food.x*CELL+2, s.food.y*CELL+2, CELL-4, CELL-4);
      s.snake.forEach((p,i) => { ctx.fillStyle = i===0 ? "#22c55e" : "#16a34a"; ctx.fillRect(p.x*CELL+1, p.y*CELL+1, CELL-2, CELL-2); });

      if (!s.alive) {
        setRunning(false);
        setArcadeBest("snake", s.score);
        setBest(b => Math.max(b, s.score));
        if (s.score > 0) submitScore("snake", userCode, userName, s.score);
        playSound("error");
        return;
      }
      id = setTimeout(tick, s.tick);
    };
    id = setTimeout(tick, stRef.current.tick);
    return () => clearTimeout(id);
  }, [running, userCode, userName]);

  // touch swipe
  const touchRef = useRef({ x: 0, y: 0 });
  const onTouchStart = (e: React.TouchEvent) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? "RIGHT" : "LEFT");
    else setDir(dy > 0 ? "DOWN" : "UP");
  };

  return (
    <Card className="p-4 flex flex-col items-center gap-3" dir="rtl">
      <div className="flex gap-4 text-sm"><span>ציון: <b>{score}</b></span><span>שיא: <b>{best}</b></span></div>
      <canvas ref={cvs} width={N*CELL} height={N*CELL}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        className="rounded-lg border-2 border-primary/30 touch-none max-w-full" style={{ aspectRatio: 1 }} />
      <div className="grid grid-cols-3 gap-1 sm:hidden w-40">
        <div></div><Button size="sm" onClick={() => setDir("UP")}>▲</Button><div></div>
        <Button size="sm" onClick={() => setDir("LEFT")}>◀</Button>
        <Button size="sm" onClick={() => setDir("DOWN")}>▼</Button>
        <Button size="sm" onClick={() => setDir("RIGHT")}>▶</Button>
      </div>
      {!running && <Button onClick={start} className="w-full">{score>0 ? "🔁 שחק שוב" : "▶️ התחל"}</Button>}
    </Card>
  );
};
