import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest } from "@/lib/arcadePoints";
import { playSound } from "@/lib/sounds";

interface Props { userCode: string; userName: string; }

const W = 360, H = 540;
const GRAVITY = 0.5;
const JUMP = -8;
const PIPE_GAP = 150;
const PIPE_W = 60;

export const FlappyGame = ({ userCode, userName }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arcade-best-flappy") || "0") || 0);
  const [running, setRunning] = useState(false);
  const stateRef = useRef({ y: H/2, v: 0, pipes: [] as { x: number; gapY: number; passed: boolean }[], frame: 0, score: 0, alive: true, speed: 2.5 });

  const reset = () => {
    stateRef.current = { y: H/2, v: 0, pipes: [], frame: 0, score: 0, alive: true, speed: 2.5 };
    setScore(0);
  };

  const flap = () => {
    if (!stateRef.current.alive) return;
    stateRef.current.v = JUMP;
    playSound("click");
  };

  const start = () => { reset(); setRunning(true); };

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const tick = () => {
      const s = stateRef.current;
      s.frame++;
      s.v += GRAVITY;
      s.y += s.v;
      s.speed = Math.min(5, 2.5 + s.score * 0.05);

      if (s.frame % 90 === 0) {
        const gapY = 80 + Math.random() * (H - 160 - PIPE_GAP);
        s.pipes.push({ x: W, gapY, passed: false });
      }
      s.pipes.forEach(p => p.x -= s.speed);
      s.pipes = s.pipes.filter(p => p.x + PIPE_W > 0);

      // collisions
      const birdX = 80, birdR = 14;
      if (s.y < 0 || s.y > H - 20) s.alive = false;
      for (const p of s.pipes) {
        if (birdX + birdR > p.x && birdX - birdR < p.x + PIPE_W) {
          if (s.y - birdR < p.gapY || s.y + birdR > p.gapY + PIPE_GAP) s.alive = false;
        }
        if (!p.passed && p.x + PIPE_W < birdX) {
          p.passed = true;
          s.score++;
          setScore(s.score);
          playSound("correct");
        }
      }

      // draw
      ctx.fillStyle = "#0ea5e9";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#84cc16";
      ctx.fillRect(0, H - 20, W, 20);
      ctx.fillStyle = "#22c55e";
      for (const p of s.pipes) {
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
        ctx.fillRect(p.x, p.gapY + PIPE_GAP, PIPE_W, H - p.gapY - PIPE_GAP - 20);
      }
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(birdX, s.y, birdR, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(birdX + 5, s.y - 4, 3, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(s.score), W/2, 50);

      if (!s.alive) {
        setRunning(false);
        const finalScore = s.score;
        setArcadeBest("flappy", finalScore);
        const newBest = Math.max(best, finalScore);
        setBest(newBest);
        if (finalScore > 0) submitScore("flappy", userCode, userName, finalScore);
        playSound("error");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, best, userCode, userName]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); flap(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Card className="p-4 flex flex-col items-center gap-3" dir="rtl">
      <div className="flex gap-4 text-sm">
        <span>ציון: <b>{score}</b></span>
        <span>שיא: <b>{best}</b></span>
      </div>
      <canvas
        ref={canvasRef}
        width={W} height={H}
        onMouseDown={flap}
        onTouchStart={(e) => { e.preventDefault(); flap(); }}
        className="rounded-lg border-2 border-primary/30 cursor-pointer touch-none max-w-full"
        style={{ aspectRatio: `${W}/${H}` }}
      />
      {!running && (
        <Button onClick={start} className="w-full">{score > 0 ? "🔁 שחק שוב" : "▶️ התחל"}</Button>
      )}
      <p className="text-xs text-muted-foreground text-center">לחץ/הקש על המסך או רווח כדי לקפוץ</p>
    </Card>
  );
};
