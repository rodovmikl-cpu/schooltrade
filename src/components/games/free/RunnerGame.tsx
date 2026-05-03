import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest } from "@/lib/arcadePoints";
import { playSound } from "@/lib/sounds";

interface Props { userCode: string; userName: string; }

const W = 480, H = 240;
const GROUND = H - 30;
const GRAVITY = 0.7;
const JUMP = -12;

export const RunnerGame = ({ userCode, userName }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arcade-best-runner") || "0") || 0);
  const [running, setRunning] = useState(false);
  const stRef = useRef({ x: 60, y: GROUND - 30, vy: 0, onGround: true, obstacles: [] as { x: number; w: number; h: number }[], coins: [] as { x: number; y: number; got: boolean }[], frame: 0, score: 0, speed: 5, alive: true });

  const jump = () => {
    const s = stRef.current;
    if (!s.alive) return;
    if (s.onGround) { s.vy = JUMP; s.onGround = false; playSound("click"); }
  };

  const start = () => {
    stRef.current = { x: 60, y: GROUND - 30, vy: 0, onGround: true, obstacles: [], coins: [], frame: 0, score: 0, speed: 5, alive: true };
    setScore(0);
    setRunning(true);
  };

  useEffect(() => {
    if (!running) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    let raf = 0;
    const loop = () => {
      const s = stRef.current;
      s.frame++;
      s.score = Math.floor(s.frame / 5);
      setScore(s.score);
      s.speed = Math.min(12, 5 + s.score * 0.01);

      s.vy += GRAVITY;
      s.y += s.vy;
      if (s.y >= GROUND - 30) { s.y = GROUND - 30; s.vy = 0; s.onGround = true; }

      if (s.frame % Math.max(40, 90 - Math.floor(s.score / 50)) === 0) {
        const h = 25 + Math.random() * 30;
        s.obstacles.push({ x: W, w: 20 + Math.random() * 20, h });
      }
      if (s.frame % 70 === 0) {
        s.coins.push({ x: W, y: GROUND - 70 - Math.random() * 60, got: false });
      }
      s.obstacles.forEach(o => o.x -= s.speed);
      s.coins.forEach(c => c.x -= s.speed);
      s.obstacles = s.obstacles.filter(o => o.x + o.w > 0);
      s.coins = s.coins.filter(c => c.x > -20 && !c.got);

      // collisions
      const px = s.x, py = s.y, pw = 24, ph = 30;
      for (const o of s.obstacles) {
        if (px + pw > o.x && px < o.x + o.w && py + ph > GROUND - o.h) { s.alive = false; }
      }
      for (const c of s.coins) {
        if (!c.got && Math.abs(c.x - (px + pw/2)) < 14 && Math.abs(c.y - (py + ph/2)) < 14) {
          c.got = true; s.score += 10; setScore(s.score); playSound("correct");
        }
      }

      // draw
      ctx.fillStyle = "#1e293b"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#475569"; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = "#ef4444";
      for (const o of s.obstacles) ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
      ctx.fillStyle = "#facc15";
      for (const c of s.coins) { ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle = "#3b82f6"; ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`Score: ${s.score}`, 10, 24);

      if (!s.alive) {
        setRunning(false);
        setArcadeBest("runner", s.score);
        const nb = Math.max(best, s.score);
        setBest(nb);
        if (s.score > 0) submitScore("runner", userCode, userName, s.score);
        playSound("error");
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, best, userCode, userName]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Card className="p-4 flex flex-col items-center gap-3" dir="rtl">
      <div className="flex gap-4 text-sm"><span>ציון: <b>{score}</b></span><span>שיא: <b>{best}</b></span></div>
      <canvas
        ref={canvasRef}
        width={W} height={H}
        onMouseDown={jump}
        onTouchStart={(e) => { e.preventDefault(); jump(); }}
        className="rounded-lg border-2 border-primary/30 cursor-pointer touch-none max-w-full"
        style={{ aspectRatio: `${W}/${H}` }}
      />
      {!running && <Button onClick={start} className="w-full">{score > 0 ? "🔁 שחק שוב" : "▶️ התחל"}</Button>}
      <p className="text-xs text-muted-foreground text-center">לחץ/הקש כדי לקפוץ. אסוף מטבעות, התחמק ממכשולים</p>
    </Card>
  );
};
