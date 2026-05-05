import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest } from "@/lib/arcadePoints";
import { playSound } from "@/lib/sounds";

interface Props { userCode: string; userName: string; }

const W = 360, H = 540;
const GRAVITY = 0.42;
const JUMP = -7.2;
const PIPE_GAP_START = 165;
const PIPE_W = 64;
const GROUND_H = 60;
const SPAWN_FRAMES = 95;

interface Pipe { x: number; gapY: number; gap: number; passed: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }

export const FlappyGame = ({ userCode, userName }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arcade-best-flappy") || "0") || 0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    y: H/2, v: 0, rot: 0,
    pipes: [] as Pipe[],
    particles: [] as Particle[],
    clouds: [] as { x: number; y: number; s: number; sp: number }[],
    groundOff: 0,
    frame: 0, score: 0, alive: true, speed: 2.6,
    flash: 0,
  });
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const reset = () => {
    stateRef.current = {
      y: H/2, v: 0, rot: 0,
      pipes: [],
      particles: [],
      clouds: [
        { x: 60,  y: 80,  s: 1.0, sp: 0.3 },
        { x: 200, y: 140, s: 0.7, sp: 0.25 },
        { x: 320, y: 60,  s: 0.85, sp: 0.35 },
      ],
      groundOff: 0,
      frame: 0, score: 0, alive: true, speed: 2.6,
      flash: 0,
    };
    setScore(0);
    setGameOver(false);
  };

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (!s.alive || pausedRef.current) return;
    s.v = JUMP;
    // feather particles
    for (let i = 0; i < 4; i++) {
      s.particles.push({
        x: 80 - 6, y: s.y + 4,
        vx: -1 - Math.random() * 1.5,
        vy: -0.5 + Math.random(),
        life: 25, color: "#fffbe8", size: 2 + Math.random() * 2,
      });
    }
    playSound("click");
  }, []);

  const start = () => { reset(); setRunning(true); setPaused(false); };

  const togglePause = () => { if (running && !gameOver) setPaused(p => !p); };

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let lastT = performance.now();

    const drawBird = (x: number, y: number, rot: number, frame: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath(); ctx.ellipse(2, 16, 14, 4, 0, 0, Math.PI*2); ctx.fill();
      // body gradient
      const bg = ctx.createRadialGradient(-2, -2, 2, 0, 0, 16);
      bg.addColorStop(0, "#fde68a");
      bg.addColorStop(1, "#f59e0b");
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
      // wing flap
      const wf = Math.sin(frame * 0.4) * 4;
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.ellipse(-3, 2 + wf, 8, 5, -0.3, 0, Math.PI*2);
      ctx.fill();
      // beak
      ctx.fillStyle = "#ef6c00";
      ctx.beginPath();
      ctx.moveTo(11, -1); ctx.lineTo(20, 1); ctx.lineTo(11, 4); ctx.closePath();
      ctx.fill();
      // eye
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(6, -4, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(7, -4, 2, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    };

    const drawPipe = (p: Pipe) => {
      const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
      grad.addColorStop(0, "#166534");
      grad.addColorStop(0.4, "#22c55e");
      grad.addColorStop(0.6, "#86efac");
      grad.addColorStop(1, "#15803d");
      ctx.fillStyle = grad;
      // top
      ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
      // bottom
      ctx.fillRect(p.x, p.gapY + p.gap, PIPE_W, H - p.gapY - p.gap - GROUND_H);
      // caps
      ctx.fillStyle = "#14532d";
      ctx.fillRect(p.x - 4, p.gapY - 18, PIPE_W + 8, 18);
      ctx.fillRect(p.x - 4, p.gapY + p.gap, PIPE_W + 8, 18);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(p.x + 6, 0, 4, p.gapY - 18);
      ctx.fillRect(p.x + 6, p.gapY + p.gap + 18, 4, H - p.gapY - p.gap - GROUND_H - 18);
    };

    const drawBg = (frame: number) => {
      // sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#38bdf8");
      sky.addColorStop(0.6, "#7dd3fc");
      sky.addColorStop(1, "#bae6fd");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // sun
      ctx.fillStyle = "rgba(255, 240, 180, 0.85)";
      ctx.beginPath(); ctx.arc(W - 60, 70, 28, 0, Math.PI*2); ctx.fill();
      // clouds
      const s = stateRef.current;
      for (const c of s.clouds) {
        c.x -= c.sp;
        if (c.x < -60) c.x = W + 30;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(c.x, c.y, 14*c.s, 0, Math.PI*2);
        ctx.arc(c.x + 14*c.s, c.y - 4*c.s, 12*c.s, 0, Math.PI*2);
        ctx.arc(c.x + 26*c.s, c.y, 14*c.s, 0, Math.PI*2);
        ctx.fill();
      }
      // distant hills
      ctx.fillStyle = "#86efac";
      ctx.beginPath();
      ctx.moveTo(0, H - GROUND_H);
      for (let x = 0; x <= W; x += 30) {
        const y = H - GROUND_H - 20 - Math.sin((x + frame*0.2) * 0.04) * 10;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H - GROUND_H); ctx.closePath(); ctx.fill();
    };

    const drawGround = () => {
      const s = stateRef.current;
      ctx.fillStyle = "#a16207";
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      ctx.fillStyle = "#65a30d";
      ctx.fillRect(0, H - GROUND_H, W, 10);
      ctx.fillStyle = "#854d0e";
      const off = Math.floor(s.groundOff) % 24;
      for (let x = -off; x < W; x += 24) {
        ctx.fillRect(x, H - GROUND_H + 10, 12, 4);
      }
    };

    const tick = (t: number) => {
      const dt = Math.min(32, t - lastT); lastT = t;
      const s = stateRef.current;

      if (pausedRef.current) {
        drawBg(s.frame);
        for (const p of s.pipes) drawPipe(p);
        drawGround();
        drawBird(80, s.y, s.rot, s.frame);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff"; ctx.font = "bold 36px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("⏸ הושהה", W/2, H/2);
        raf = requestAnimationFrame(tick);
        return;
      }

      s.frame++;
      s.v += GRAVITY;
      s.y += s.v;
      s.rot = Math.max(-0.5, Math.min(1.4, s.v * 0.08));
      s.speed = Math.min(4.6, 2.6 + s.score * 0.04);
      s.groundOff += s.speed;

      const gap = Math.max(120, PIPE_GAP_START - s.score * 1.5);
      if (s.frame % SPAWN_FRAMES === 0) {
        const gapY = 60 + Math.random() * (H - GROUND_H - 120 - gap);
        s.pipes.push({ x: W, gapY, gap, passed: false });
      }
      s.pipes.forEach(p => p.x -= s.speed);
      s.pipes = s.pipes.filter(p => p.x + PIPE_W > -10);

      // particles
      s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life--; });
      s.particles = s.particles.filter(p => p.life > 0);

      // collisions
      const birdX = 80, birdR = 12;
      if (s.y + birdR > H - GROUND_H) { s.y = H - GROUND_H - birdR; s.alive = false; }
      if (s.y - birdR < 0) { s.y = birdR; s.v = 0; }
      for (const p of s.pipes) {
        if (birdX + birdR > p.x && birdX - birdR < p.x + PIPE_W) {
          if (s.y - birdR < p.gapY || s.y + birdR > p.gapY + p.gap) { s.alive = false; s.flash = 8; }
        }
        if (!p.passed && p.x + PIPE_W < birdX) {
          p.passed = true;
          s.score++;
          setScore(s.score);
          // sparkle
          for (let i = 0; i < 6; i++) {
            s.particles.push({
              x: birdX, y: s.y, vx: (Math.random()-0.5)*3, vy: -Math.random()*3,
              life: 30, color: "#fde047", size: 2 + Math.random()*2,
            });
          }
          playSound("correct");
        }
      }

      // draw
      drawBg(s.frame);
      for (const p of s.pipes) drawPipe(p);
      drawGround();
      // particles
      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawBird(birdX, s.y, s.rot, s.frame);

      // score big
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.font = "bold 44px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(String(s.score), W/2 + 2, 70);
      ctx.fillStyle = "#fff";
      ctx.fillText(String(s.score), W/2, 68);
      ctx.restore();

      if (s.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${s.flash/10})`;
        ctx.fillRect(0,0,W,H); s.flash--;
      }

      if (!s.alive) {
        const finalScore = s.score;
        setRunning(false);
        setGameOver(true);
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
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); flap(); }
      if (e.code === "KeyP") togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  return (
    <Card className="p-4 flex flex-col items-center gap-3" dir="rtl">
      <div className="flex gap-4 text-sm w-full justify-between">
        <span>ציון: <b>{score}</b></span>
        <span>שיא: <b>{best}</b></span>
        {running && !gameOver && (
          <Button size="sm" variant="outline" onClick={togglePause}>{paused ? "▶️ המשך" : "⏸ השהה"}</Button>
        )}
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W} height={H}
          onMouseDown={flap}
          onTouchStart={(e) => { e.preventDefault(); flap(); }}
          className="rounded-lg border-2 border-primary/30 cursor-pointer touch-none max-w-full shadow-xl"
          style={{ aspectRatio: `${W}/${H}` }}
        />
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 rounded-lg animate-fade-in">
            <div className="bg-card p-5 rounded-2xl text-center shadow-2xl border-2 border-primary/40">
              <div className="text-3xl mb-1">🎯 נגמר המשחק</div>
              <div className="text-lg">ציון: <b>{score}</b></div>
              <div className="text-sm text-muted-foreground">שיא: {best}</div>
              <Button onClick={start} className="mt-3 w-full">🔁 שחק שוב</Button>
            </div>
          </div>
        )}
        {!running && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-sky-400/40 to-sky-600/40 rounded-lg">
            <Button onClick={start} size="lg" className="shadow-2xl">▶️ התחל לשחק</Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">לחץ/הקש על המסך או רווח כדי לקפוץ • P להשהיה</p>
    </Card>
  );
};
