import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest } from "@/lib/arcadePoints";
import { playSound } from "@/lib/sounds";

interface Props { userCode: string; userName: string; }

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
const N = 20, CELL = 18;
const W = N * CELL, H = N * CELL;

interface FxParticle { x: number; y: number; vx: number; vy: number; life: number; }

export const SnakeArcadeGame = ({ userCode, userName }: Props) => {
  const cvs = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arcade-best-snake") || "0") || 0);
  const pausedRef = useRef(false); pausedRef.current = paused;

  const stRef = useRef({
    snake: [{x:10,y:10}], dir: "RIGHT" as Dir,
    dirQueue: [] as Dir[],
    food: {x:15,y:10}, alive: true, score: 0, tick: 140,
    eatPulse: 0, particles: [] as FxParticle[],
  });

  const newFood = (snake: {x:number;y:number}[]) => {
    let f; do { f = { x: Math.floor(Math.random()*N), y: Math.floor(Math.random()*N) }; }
    while (snake.some(s => s.x===f.x && s.y===f.y));
    return f;
  };

  const start = () => {
    stRef.current = {
      snake: [{x:10,y:10},{x:9,y:10},{x:8,y:10}],
      dir: "RIGHT", dirQueue: [],
      food: {x:15,y:10}, alive: true, score: 0, tick: 140,
      eatPulse: 0, particles: [],
    };
    setScore(0); setGameOver(false); setRunning(true); setPaused(false);
  };

  const setDir = useCallback((d: Dir) => {
    const s = stRef.current;
    const last = s.dirQueue[s.dirQueue.length - 1] || s.dir;
    if ((d==="UP"&&last==="DOWN")||(d==="DOWN"&&last==="UP")||(d==="LEFT"&&last==="RIGHT")||(d==="RIGHT"&&last==="LEFT")) return;
    if (d === last) return;
    if (s.dirQueue.length < 2) s.dirQueue.push(d);
  }, []);

  const togglePause = () => { if (running && !gameOver) setPaused(p => !p); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") setDir("UP");
      else if (e.key === "ArrowDown") setDir("DOWN");
      else if (e.key === "ArrowLeft") setDir("LEFT");
      else if (e.key === "ArrowRight") setDir("RIGHT");
      else if (e.code === "KeyP") togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDir]);

  useEffect(() => {
    if (!running) return;
    const ctx = cvs.current!.getContext("2d")!;
    let id: any;

    const draw = () => {
      const s = stRef.current;
      // bg gradient + checker grid
      const bg = ctx.createLinearGradient(0,0,W,H);
      bg.addColorStop(0, "#0b1220"); bg.addColorStop(1, "#1e293b");
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if ((x+y) % 2 === 0) ctx.fillRect(x*CELL, y*CELL, CELL, CELL);
      }
      // food (apple) with pulse
      const pulse = 1 + Math.sin(Date.now()*0.006) * 0.08;
      const fx = s.food.x*CELL + CELL/2, fy = s.food.y*CELL + CELL/2;
      ctx.fillStyle = "#dc2626";
      ctx.beginPath(); ctx.arc(fx, fy, (CELL/2 - 2) * pulse, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(fx - 1, fy - CELL/2, 2, 4);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath(); ctx.arc(fx - 2, fy - 2, 2, 0, Math.PI*2); ctx.fill();
      // snake
      s.snake.forEach((p, i) => {
        const isHead = i === 0;
        const t = i / Math.max(1, s.snake.length);
        const r = isHead ? 92 : Math.round(34 + (1-t)*30);
        const g = isHead ? 220 : Math.round(160 + (1-t)*40);
        const b = isHead ? 130 : 80;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        const px = p.x*CELL, py = p.y*CELL;
        const rad = 4;
        ctx.beginPath();
        ctx.moveTo(px+rad, py);
        ctx.arcTo(px+CELL, py, px+CELL, py+CELL, rad);
        ctx.arcTo(px+CELL, py+CELL, px, py+CELL, rad);
        ctx.arcTo(px, py+CELL, px, py, rad);
        ctx.arcTo(px, py, px+CELL, py, rad);
        ctx.closePath(); ctx.fill();
        if (isHead) {
          // eyes based on direction
          ctx.fillStyle = "#fff";
          let ex1 = px+5, ey1 = py+5, ex2 = px+CELL-5, ey2 = py+5;
          if (s.dir === "DOWN")  { ey1 = ey2 = py+CELL-5; }
          if (s.dir === "LEFT")  { ex1 = ex2 = px+5; ey1 = py+5; ey2 = py+CELL-5; }
          if (s.dir === "RIGHT") { ex1 = ex2 = px+CELL-5; ey1 = py+5; ey2 = py+CELL-5; }
          ctx.beginPath(); ctx.arc(ex1, ey1, 2.4, 0, Math.PI*2); ctx.arc(ex2, ey2, 2.4, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(ex1, ey1, 1.2, 0, Math.PI*2); ctx.arc(ex2, ey2, 1.2, 0, Math.PI*2); ctx.fill();
        }
      });
      // particles
      s.particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / 25);
        ctx.fillStyle = "#fca5a5";
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    const tick = () => {
      const s = stRef.current;
      if (pausedRef.current) {
        draw();
        ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0,0,W,H);
        ctx.fillStyle = "#fff"; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("⏸ הושהה", W/2, H/2);
        id = setTimeout(tick, 100); return;
      }
      if (s.dirQueue.length) s.dir = s.dirQueue.shift()!;
      const head = { ...s.snake[0] };
      if (s.dir==="UP") head.y--; else if (s.dir==="DOWN") head.y++; else if (s.dir==="LEFT") head.x--; else head.x++;
      if (head.x<0||head.y<0||head.x>=N||head.y>=N||s.snake.some(b=>b.x===head.x&&b.y===head.y)) { s.alive=false; }
      if (s.alive) {
        s.snake.unshift(head);
        if (head.x===s.food.x && head.y===s.food.y) {
          s.score += 10; setScore(s.score); playSound("correct");
          // burst
          for (let i = 0; i < 10; i++) {
            s.particles.push({
              x: s.food.x*CELL + CELL/2, y: s.food.y*CELL + CELL/2,
              vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 25,
            });
          }
          s.food = newFood(s.snake);
          s.tick = Math.max(55, s.tick - 4);
        } else s.snake.pop();
      }
      // update particles
      s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
      s.particles = s.particles.filter(p => p.life > 0);

      draw();
      if (!s.alive) {
        setRunning(false); setGameOver(true);
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
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? "RIGHT" : "LEFT");
    else setDir(dy > 0 ? "DOWN" : "UP");
  };

  return (
    <Card className="p-4 flex flex-col items-center gap-3" dir="rtl">
      <div className="flex gap-4 text-sm w-full justify-between">
        <span>ציון: <b>{score}</b></span>
        <span>שיא: <b>{best}</b></span>
        {running && !gameOver && <Button size="sm" variant="outline" onClick={togglePause}>{paused ? "▶️" : "⏸"}</Button>}
      </div>
      <div className="relative">
        <canvas ref={cvs} width={W} height={H}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          className="rounded-lg border-2 border-primary/30 touch-none max-w-full shadow-xl" style={{ aspectRatio: 1 }} />
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg animate-fade-in">
            <div className="bg-card p-5 rounded-2xl text-center shadow-2xl border-2 border-primary/40">
              <div className="text-2xl mb-1">🐍 נגמר!</div>
              <div>ציון: <b>{score}</b></div>
              <div className="text-xs text-muted-foreground">שיא: {best}</div>
              <Button onClick={start} className="mt-3 w-full">🔁 שחק שוב</Button>
            </div>
          </div>
        )}
        {!running && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
            <Button onClick={start} size="lg" className="shadow-2xl">▶️ התחל</Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 sm:hidden w-44">
        <div></div><Button size="sm" onClick={() => setDir("UP")}>▲</Button><div></div>
        <Button size="sm" onClick={() => setDir("LEFT")}>◀</Button>
        <Button size="sm" onClick={() => setDir("DOWN")}>▼</Button>
        <Button size="sm" onClick={() => setDir("RIGHT")}>▶</Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">החלק או חיצים • P להשהיה</p>
    </Card>
  );
};
