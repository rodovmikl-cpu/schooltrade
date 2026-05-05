import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest } from "@/lib/arcadePoints";
import { playSound } from "@/lib/sounds";

interface Props { userCode: string; userName: string; }

const W = 480, H = 240;
const GROUND = H - 30;
const GRAVITY = 0.8;
const JUMP = -12.5;
const PLAYER_W = 26, PLAYER_H = 32;

interface Obs { x: number; w: number; h: number; type: "cactus" | "rock"; }
interface Coin { x: number; y: number; got: boolean; spin: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; }

export const RunnerGame = ({ userCode, userName }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arcade-best-runner") || "0") || 0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const stRef = useRef({
    x: 60, y: GROUND - PLAYER_H, vy: 0,
    onGround: true, jumps: 0,
    obstacles: [] as Obs[],
    coins: [] as Coin[],
    particles: [] as Particle[],
    bgFar: 0, bgMid: 0, bgGround: 0,
    frame: 0, score: 0, coinsCollected: 0,
    speed: 5, alive: true, sliding: 0,
  });

  const jump = useCallback(() => {
    const s = stRef.current;
    if (!s.alive || pausedRef.current) return;
    if (s.jumps < 2) {
      s.vy = JUMP * (s.jumps === 0 ? 1 : 0.85);
      s.onGround = false;
      s.jumps++;
      playSound("click");
      // dust
      if (s.jumps === 1) {
        for (let i = 0; i < 5; i++) {
          s.particles.push({ x: s.x, y: GROUND, vx: -1 - Math.random(), vy: -Math.random()*1.5, life: 20, color: "#d6d3d1" });
        }
      }
    }
  }, []);

  const start = () => {
    stRef.current = {
      x: 60, y: GROUND - PLAYER_H, vy: 0,
      onGround: true, jumps: 0,
      obstacles: [], coins: [], particles: [],
      bgFar: 0, bgMid: 0, bgGround: 0,
      frame: 0, score: 0, coinsCollected: 0,
      speed: 5, alive: true, sliding: 0,
    };
    setScore(0); setCoinsCollected(0); setGameOver(false);
    setRunning(true); setPaused(false);
  };
  const togglePause = () => { if (running && !gameOver) setPaused(p => !p); };

  useEffect(() => {
    if (!running) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    let raf = 0;

    const drawBg = () => {
      const s = stRef.current;
      // sky gradient (day-evening blend depending on score)
      const t = Math.min(1, s.score / 800);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, `rgb(${Math.round(30 + (255-30)*(1-t))}, ${Math.round(64 + (180-64)*(1-t))}, ${Math.round(175 + (90-175)*(1-t))})`);
      sky.addColorStop(1, `rgb(${Math.round(125 + (255-125)*(1-t))}, ${Math.round(140 + (210-140)*(1-t))}, ${Math.round(200 + (170-200)*(1-t))})`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // sun/moon
      ctx.fillStyle = t > 0.5 ? "#fef3c7" : "#fde047";
      ctx.beginPath(); ctx.arc(W - 50, 40, 18, 0, Math.PI*2); ctx.fill();

      // far mountains
      s.bgFar = (s.bgFar + s.speed * 0.15) % W;
      ctx.fillStyle = "#475569";
      for (let off = -s.bgFar; off < W; off += W) {
        ctx.beginPath();
        ctx.moveTo(off, GROUND);
        for (let i = 0; i <= 12; i++) {
          ctx.lineTo(off + (W/12)*i, GROUND - 60 - Math.sin(i*1.2)*30 - (i%3)*15);
        }
        ctx.lineTo(off + W, GROUND); ctx.closePath(); ctx.fill();
      }
      // mid hills
      s.bgMid = (s.bgMid + s.speed * 0.4) % W;
      ctx.fillStyle = "#334155";
      for (let off = -s.bgMid; off < W; off += W) {
        ctx.beginPath();
        ctx.moveTo(off, GROUND);
        for (let i = 0; i <= 8; i++) {
          ctx.lineTo(off + (W/8)*i, GROUND - 30 - Math.sin(i*1.7+1)*20);
        }
        ctx.lineTo(off + W, GROUND); ctx.closePath(); ctx.fill();
      }
    };

    const drawGround = () => {
      const s = stRef.current;
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.strokeStyle = "#64748b"; ctx.lineWidth = 2;
      s.bgGround = (s.bgGround + s.speed) % 30;
      ctx.beginPath();
      for (let x = -s.bgGround; x < W; x += 30) {
        ctx.moveTo(x, GROUND + 12); ctx.lineTo(x + 18, GROUND + 12);
      }
      ctx.stroke();
    };

    const drawPlayer = () => {
      const s = stRef.current;
      // shadow
      const groundDist = (GROUND - (s.y + PLAYER_H));
      const shadowScale = Math.max(0.4, 1 - groundDist / 100);
      ctx.fillStyle = `rgba(0,0,0,${0.35 * shadowScale})`;
      ctx.beginPath(); ctx.ellipse(s.x + PLAYER_W/2, GROUND, 16 * shadowScale, 4 * shadowScale, 0, 0, Math.PI*2); ctx.fill();
      // body
      const grad = ctx.createLinearGradient(s.x, s.y, s.x, s.y + PLAYER_H);
      grad.addColorStop(0, "#60a5fa");
      grad.addColorStop(1, "#1e40af");
      ctx.fillStyle = grad;
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(s.x + r, s.y);
      ctx.arcTo(s.x + PLAYER_W, s.y, s.x + PLAYER_W, s.y + PLAYER_H, r);
      ctx.arcTo(s.x + PLAYER_W, s.y + PLAYER_H, s.x, s.y + PLAYER_H, r);
      ctx.arcTo(s.x, s.y + PLAYER_H, s.x, s.y, r);
      ctx.arcTo(s.x, s.y, s.x + PLAYER_W, s.y, r);
      ctx.closePath(); ctx.fill();
      // face
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(s.x + 18, s.y + 10, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(s.x + 19, s.y + 10, 2, 0, Math.PI*2); ctx.fill();
      // legs (running animation)
      if (s.onGround) {
        const swing = Math.sin(s.frame * 0.5) * 4;
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(s.x + 4, s.y + PLAYER_H - 2, 6, 4 + swing);
        ctx.fillRect(s.x + PLAYER_W - 10, s.y + PLAYER_H - 2, 6, 4 - swing);
      }
    };

    const drawObs = (o: Obs) => {
      if (o.type === "cactus") {
        ctx.fillStyle = "#15803d";
        ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
        ctx.fillRect(o.x - 5, GROUND - o.h * 0.6, 5, o.h * 0.3);
        ctx.fillRect(o.x + o.w, GROUND - o.h * 0.7, 5, o.h * 0.3);
        ctx.fillStyle = "#166534";
        ctx.fillRect(o.x + 2, GROUND - o.h, 3, o.h);
      } else {
        ctx.fillStyle = "#78716c";
        ctx.beginPath(); ctx.ellipse(o.x + o.w/2, GROUND - o.h/2, o.w/2, o.h/2, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#a8a29e";
        ctx.beginPath(); ctx.ellipse(o.x + o.w/2 - 3, GROUND - o.h/2 - 2, o.w/3, o.h/3, 0, 0, Math.PI*2); ctx.fill();
      }
    };

    const drawCoin = (c: Coin) => {
      const w = Math.abs(Math.cos(c.spin)) * 10 + 2;
      const grad = ctx.createLinearGradient(c.x - w, c.y, c.x + w, c.y);
      grad.addColorStop(0, "#fbbf24"); grad.addColorStop(0.5, "#fde047"); grad.addColorStop(1, "#fbbf24");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, w, 10, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#a16207"; ctx.lineWidth = 1; ctx.stroke();
    };

    const loop = () => {
      const s = stRef.current;
      if (pausedRef.current) {
        drawBg(); drawGround();
        for (const o of s.obstacles) drawObs(o);
        for (const c of s.coins) if (!c.got) drawCoin(c);
        drawPlayer();
        ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0,0,W,H);
        ctx.fillStyle = "#fff"; ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("⏸ הושהה", W/2, H/2);
        raf = requestAnimationFrame(loop); return;
      }
      s.frame++;
      s.score = Math.floor(s.frame / 4) + s.coinsCollected * 10;
      setScore(s.score);
      s.speed = Math.min(11, 5 + s.frame * 0.0015);

      s.vy += GRAVITY;
      s.y += s.vy;
      if (s.y >= GROUND - PLAYER_H) {
        if (!s.onGround) {
          // landing dust
          for (let i = 0; i < 4; i++) {
            s.particles.push({ x: s.x + PLAYER_W/2, y: GROUND, vx: (Math.random()-0.5)*2, vy: -Math.random(), life: 18, color: "#d6d3d1" });
          }
        }
        s.y = GROUND - PLAYER_H; s.vy = 0; s.onGround = true; s.jumps = 0;
      }

      // spawning
      const spawn = Math.max(45, 100 - Math.floor(s.score / 30));
      if (s.frame % spawn === 0) {
        const isRock = Math.random() < 0.35;
        const h = isRock ? 18 + Math.random()*10 : 28 + Math.random() * 22;
        const w = isRock ? 28 + Math.random()*14 : 18 + Math.random() * 10;
        s.obstacles.push({ x: W + 20, w, h, type: isRock ? "rock" : "cactus" });
      }
      if (s.frame % 75 === 0) {
        const cy = GROUND - 50 - Math.random() * 70;
        s.coins.push({ x: W + 20, y: cy, got: false, spin: 0 });
      }
      s.obstacles.forEach(o => o.x -= s.speed);
      s.coins.forEach(c => { c.x -= s.speed; c.spin += 0.2; });
      s.obstacles = s.obstacles.filter(o => o.x + o.w > -10);
      s.coins = s.coins.filter(c => c.x > -20 && !c.got);

      // particles
      s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; });
      s.particles = s.particles.filter(p => p.life > 0);

      // collisions (slim hitbox)
      const px = s.x + 4, py = s.y + 3, pw = PLAYER_W - 8, ph = PLAYER_H - 6;
      for (const o of s.obstacles) {
        if (px + pw > o.x + 2 && px < o.x + o.w - 2 && py + ph > GROUND - o.h + 2) { s.alive = false; }
      }
      for (const c of s.coins) {
        if (!c.got && Math.abs(c.x - (px + pw/2)) < 14 && Math.abs(c.y - (py + ph/2)) < 14) {
          c.got = true; s.coinsCollected++; setCoinsCollected(s.coinsCollected); playSound("correct");
          for (let i = 0; i < 8; i++) {
            s.particles.push({ x: c.x, y: c.y, vx: (Math.random()-0.5)*4, vy: -Math.random()*3, life: 24, color: "#fde047" });
          }
        }
      }

      // draw
      drawBg(); drawGround();
      for (const o of s.obstacles) drawObs(o);
      for (const c of s.coins) if (!c.got) drawCoin(c);
      // particles
      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life / 24);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawPlayer();
      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(8, 8, 130, 26);
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`ציון ${s.score}  🪙 ${s.coinsCollected}`, 14, 26);

      if (!s.alive) {
        setRunning(false);
        setGameOver(true);
        setArcadeBest("runner", s.score);
        const nb = Math.max(best, s.score); setBest(nb);
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
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
      if (e.code === "KeyP") togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  return (
    <Card className="p-4 flex flex-col items-center gap-3" dir="rtl">
      <div className="flex gap-4 text-sm w-full justify-between">
        <span>ציון: <b>{score}</b></span>
        <span>🪙 <b>{coinsCollected}</b></span>
        <span>שיא: <b>{best}</b></span>
        {running && !gameOver && <Button size="sm" variant="outline" onClick={togglePause}>{paused ? "▶️" : "⏸"}</Button>}
      </div>
      <div className="relative w-full">
        <canvas
          ref={canvasRef}
          width={W} height={H}
          onMouseDown={jump}
          onTouchStart={(e) => { e.preventDefault(); jump(); }}
          className="rounded-lg border-2 border-primary/30 cursor-pointer touch-none w-full shadow-xl"
          style={{ aspectRatio: `${W}/${H}` }}
        />
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 rounded-lg animate-fade-in">
            <div className="bg-card p-5 rounded-2xl text-center shadow-2xl border-2 border-primary/40">
              <div className="text-2xl mb-1">💥 התנגשת!</div>
              <div className="text-base">ציון: <b>{score}</b> · 🪙 {coinsCollected}</div>
              <div className="text-xs text-muted-foreground">שיא: {best}</div>
              <Button onClick={start} className="mt-3 w-full">🔁 שחק שוב</Button>
            </div>
          </div>
        )}
        {!running && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-700/40 to-slate-900/40 rounded-lg">
            <Button onClick={start} size="lg" className="shadow-2xl">▶️ התחל ריצה</Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">לחץ/הקש כדי לקפוץ • קפיצה כפולה זמינה • אסוף מטבעות</p>
    </Card>
  );
};
