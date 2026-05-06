import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest } from "@/lib/arcadePoints";
import { playSound } from "@/lib/sounds";

interface Props { userCode: string; userName: string; }

// Pseudo-3D 3-lane endless runner (Subway Surfers style)
const W = 480, H = 320;
const HORIZON = 90;       // vanishing point Y
const GROUND_Y = H - 20;  // bottom of track
const LANE_X = [-1, 0, 1];// left, center, right
const ROAD_W_TOP = 60;
const ROAD_W_BOTTOM = 440;

// Project a world point (laneOffset in [-1,1], depth z in [0,1] where 0=near, 1=far) to screen
const project = (lane: number, z: number) => {
  // perspective scale: near=1, far ~ 0.18
  const scale = 1 - z * 0.82;
  const roadW = ROAD_W_TOP + (ROAD_W_BOTTOM - ROAD_W_TOP) * (1 - z);
  const cx = W / 2;
  const x = cx + lane * (roadW / 2) * 0.66;
  const y = HORIZON + (GROUND_Y - HORIZON) * (1 - z);
  return { x, y, scale };
};

interface Obstacle { lane: number; z: number; type: "barrier" | "train"; }
interface Coin { lane: number; z: number; got: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; }

export const RunnerGame = ({ userCode, userName }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arcade-best-runner") || "0") || 0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const stRef = useRef({
    lane: 1,            // 0,1,2
    laneT: 1,           // animated lane (-1..1 visually)
    targetLane: 1,
    jumpY: 0,           // 0 ground, negative = up
    jumpV: 0,
    sliding: 0,         // frames remaining
    obstacles: [] as Obstacle[],
    coins: [] as Coin[],
    particles: [] as Particle[],
    speed: 0.018,       // depth units/frame
    frame: 0,
    score: 0,
    coinsCollected: 0,
    alive: true,
    roadOffset: 0,
  });

  const start = () => {
    stRef.current = {
      lane: 1, laneT: 1, targetLane: 1,
      jumpY: 0, jumpV: 0, sliding: 0,
      obstacles: [], coins: [], particles: [],
      speed: 0.018, frame: 0, score: 0, coinsCollected: 0, alive: true, roadOffset: 0,
    };
    setScore(0); setCoins(0); setGameOver(false); setRunning(true); setPaused(false);
  };
  const togglePause = () => { if (running && !gameOver) setPaused(p => !p); };

  const moveLane = useCallback((dir: -1 | 1) => {
    const s = stRef.current;
    if (!s.alive || pausedRef.current) return;
    const nl = Math.max(0, Math.min(2, s.targetLane + dir));
    if (nl !== s.targetLane) { s.targetLane = nl; playSound("click"); }
  }, []);

  const jump = useCallback(() => {
    const s = stRef.current;
    if (!s.alive || pausedRef.current) return;
    if (s.jumpY === 0 && s.sliding === 0) {
      s.jumpV = -10; playSound("click");
    }
  }, []);

  const slide = useCallback(() => {
    const s = stRef.current;
    if (!s.alive || pausedRef.current) return;
    if (s.jumpY === 0 && s.sliding === 0) {
      s.sliding = 35; playSound("click");
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    let raf = 0;

    const drawSky = () => {
      const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
      g.addColorStop(0, "#1e3a8a"); g.addColorStop(1, "#fb923c");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, HORIZON);
      // distant city
      ctx.fillStyle = "#0f172a";
      for (let i = 0; i < 14; i++) {
        const bx = i * 36, bh = 18 + ((i * 53) % 35);
        ctx.fillRect(bx, HORIZON - bh, 30, bh);
      }
    };

    const drawRoad = (offset: number) => {
      // ground
      ctx.fillStyle = "#1f2937"; ctx.fillRect(0, HORIZON, W, H - HORIZON);
      // road trapezoid
      ctx.fillStyle = "#374151";
      ctx.beginPath();
      ctx.moveTo(W/2 - ROAD_W_TOP/2, HORIZON);
      ctx.lineTo(W/2 + ROAD_W_TOP/2, HORIZON);
      ctx.lineTo(W/2 + ROAD_W_BOTTOM/2, GROUND_Y);
      ctx.lineTo(W/2 - ROAD_W_BOTTOM/2, GROUND_Y);
      ctx.closePath(); ctx.fill();

      // lane lines
      ctx.strokeStyle = "#6b7280"; ctx.lineWidth = 2;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(W/2 + sgn * ROAD_W_TOP/6, HORIZON);
        ctx.lineTo(W/2 + sgn * ROAD_W_BOTTOM/6, GROUND_Y);
        ctx.stroke();
      }
      // dashed center stripes (perspective)
      for (let i = 0; i < 12; i++) {
        const z = ((i / 12) + offset) % 1;
        const p1 = project(0, z);
        const p2 = project(0, Math.min(1, z + 0.04));
        ctx.strokeStyle = "rgba(250,204,21,0.85)";
        ctx.lineWidth = Math.max(1, 4 * (1 - z));
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      }
      // rails on sides (subway feel)
      ctx.strokeStyle = "#94a3b8";
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(W/2 + sgn * ROAD_W_TOP/2, HORIZON);
        ctx.lineTo(W/2 + sgn * ROAD_W_BOTTOM/2, GROUND_Y);
        ctx.lineWidth = 2; ctx.stroke();
      }
    };

    const drawObstacle = (o: Obstacle) => {
      const p = project(LANE_X[o.lane], o.z);
      if (o.type === "barrier") {
        const w = 38 * p.scale, h = 26 * p.scale;
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(p.x - w/2, p.y - h, w, h);
        ctx.fillStyle = "#fff";
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(p.x - w/2 + i*(w/3) + 2, p.y - h + 4, w/3 - 4, 4);
        }
      } else {
        // train: tall block spanning some depth
        const w = 46 * p.scale, h = 70 * p.scale;
        const grad = ctx.createLinearGradient(p.x - w/2, 0, p.x + w/2, 0);
        grad.addColorStop(0, "#1d4ed8"); grad.addColorStop(0.5, "#3b82f6"); grad.addColorStop(1, "#1d4ed8");
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - w/2, p.y - h, w, h);
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(p.x - w/2 + 4, p.y - h + 6, w - 8, h * 0.18);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(p.x - w/2, p.y - 4, w, 4);
      }
    };

    const drawCoin = (c: Coin, frame: number) => {
      const p = project(LANE_X[c.lane], c.z);
      const r = 7 * p.scale;
      const w = Math.abs(Math.cos(frame * 0.2 + c.z * 5)) * r + 2;
      const grad = ctx.createLinearGradient(p.x - w, 0, p.x + w, 0);
      grad.addColorStop(0, "#b45309"); grad.addColorStop(0.5, "#fde047"); grad.addColorStop(1, "#b45309");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 22 * p.scale, w, r, 0, 0, Math.PI * 2); ctx.fill();
    };

    const drawPlayer = (s: typeof stRef.current) => {
      // player always near (z=0.02)
      const p = project(s.laneT - 1, 0.02);
      const baseY = p.y;
      const isSliding = s.sliding > 0;
      const w = 28, hFull = 44, hSlide = 22;
      const h = isSliding ? hSlide : hFull;
      const y = baseY + s.jumpY;
      // shadow
      const shadowScale = Math.max(0.4, 1 - (-s.jumpY) / 80);
      ctx.fillStyle = `rgba(0,0,0,${0.4 * shadowScale})`;
      ctx.beginPath(); ctx.ellipse(p.x, baseY, 18 * shadowScale, 4 * shadowScale, 0, 0, Math.PI*2); ctx.fill();
      // body
      const grad = ctx.createLinearGradient(p.x, y - h, p.x, y);
      grad.addColorStop(0, "#fbbf24"); grad.addColorStop(1, "#b45309");
      ctx.fillStyle = grad;
      ctx.beginPath();
      const r = 6;
      const x0 = p.x - w/2, y0 = y - h;
      ctx.moveTo(x0 + r, y0);
      ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
      ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
      ctx.arcTo(x0, y0 + h, x0, y0, r);
      ctx.arcTo(x0, y0, x0 + w, y0, r);
      ctx.closePath(); ctx.fill();
      // head
      if (!isSliding) {
        ctx.fillStyle = "#fcd34d";
        ctx.beginPath(); ctx.arc(p.x, y - h - 6, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#111";
        ctx.fillRect(p.x - 3, y - h - 7, 2, 2);
        ctx.fillRect(p.x + 1, y - h - 7, 2, 2);
      }
      // legs
      if (!isSliding && s.jumpY === 0) {
        const swing = Math.sin(s.frame * 0.5) * 4;
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(p.x - 8, y, 6, 6 + swing);
        ctx.fillRect(p.x + 2, y, 6, 6 - swing);
      }
    };

    const loop = () => {
      const s = stRef.current;
      if (pausedRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0,0,W,H);
        ctx.fillStyle = "#fff"; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("⏸ הושהה", W/2, H/2);
        raf = requestAnimationFrame(loop); return;
      }
      s.frame++;
      s.speed = Math.min(0.045, 0.018 + s.frame * 0.000012);
      s.score = Math.floor(s.frame / 3) + s.coinsCollected * 5;
      setScore(s.score);

      // lane interpolation
      s.laneT += (s.targetLane - s.laneT) * 0.22;

      // jump physics
      if (s.jumpV !== 0 || s.jumpY < 0) {
        s.jumpY += s.jumpV;
        s.jumpV += 0.55;
        if (s.jumpY >= 0) { s.jumpY = 0; s.jumpV = 0; }
      }
      if (s.sliding > 0) s.sliding--;

      s.roadOffset = (s.roadOffset + s.speed) % 1;

      // spawn obstacles
      const spawnEvery = Math.max(28, 60 - Math.floor(s.frame / 200));
      if (s.frame % spawnEvery === 0) {
        const lane = Math.floor(Math.random() * 3);
        const type: "barrier" | "train" = Math.random() < 0.45 ? "train" : "barrier";
        s.obstacles.push({ lane, z: 1, type });
      }
      if (s.frame % 40 === 0) {
        const lane = Math.floor(Math.random() * 3);
        // string of coins
        for (let i = 0; i < 4; i++) s.coins.push({ lane, z: Math.min(1, 1 + i * 0.06), got: false });
      }

      // advance depth
      s.obstacles.forEach(o => o.z -= s.speed);
      s.coins.forEach(c => c.z -= s.speed);
      s.obstacles = s.obstacles.filter(o => o.z > -0.05);
      s.coins = s.coins.filter(c => c.z > -0.05 && !c.got);

      // collisions when in player z range
      const playerLane = Math.round(s.laneT);
      for (const o of s.obstacles) {
        if (o.z < 0.06 && o.z > -0.02 && o.lane === playerLane) {
          const isJumping = s.jumpY < -10;
          const isSliding = s.sliding > 0;
          if (o.type === "barrier" && isSliding) continue;
          if (o.type === "barrier" && isJumping) continue;
          if (o.type === "train" && (isSliding || isJumping)) {
            // trains are tall — only sliding helps if low train; here all trains are tall, sliding doesn't help
            // but allow nothing — collision
          }
          s.alive = false;
          for (let i = 0; i < 18; i++) {
            const p = project(LANE_X[playerLane], 0.02);
            s.particles.push({ x: p.x, y: p.y - 20, vx: (Math.random()-0.5)*6, vy: -Math.random()*5, life: 30, color: "#f87171" });
          }
        }
      }
      for (const c of s.coins) {
        if (!c.got && c.z < 0.06 && c.z > -0.02 && c.lane === playerLane && s.jumpY > -28) {
          c.got = true; s.coinsCollected++; setCoins(s.coinsCollected); playSound("correct");
          const p = project(LANE_X[c.lane], 0.02);
          for (let i = 0; i < 6; i++) {
            s.particles.push({ x: p.x, y: p.y - 22, vx: (Math.random()-0.5)*3, vy: -Math.random()*3, life: 22, color: "#fde047" });
          }
        }
      }

      // particles
      s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--; });
      s.particles = s.particles.filter(p => p.life > 0);

      // draw
      drawSky();
      drawRoad(s.roadOffset);
      // far → near
      const sorted = [...s.obstacles, ...s.coins].sort((a, b) => b.z - a.z);
      for (const item of sorted) {
        if ("type" in item) drawObstacle(item);
        else drawCoin(item, s.frame);
      }
      drawPlayer(s);
      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(8, 8, 150, 28);
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`ציון ${s.score}  🪙 ${s.coinsCollected}`, 14, 27);

      if (!s.alive) {
        setRunning(false); setGameOver(true);
        setArcadeBest("runner", s.score);
        setBest(b => Math.max(b, s.score));
        if (s.score > 0) submitScore("runner", userCode, userName, s.score);
        playSound("error");
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, userCode, userName]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft")  { e.preventDefault(); moveLane(-1); }
      else if (e.code === "ArrowRight") { e.preventDefault(); moveLane(1); }
      else if (e.code === "ArrowUp" || e.code === "Space") { e.preventDefault(); jump(); }
      else if (e.code === "ArrowDown") { e.preventDefault(); slide(); }
      else if (e.code === "KeyP") togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moveLane, jump, slide]);

  // touch
  const touchRef = useRef({ x: 0, y: 0, t: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const TH = 24;
    if (Math.abs(dx) < TH && Math.abs(dy) < TH) { jump(); return; }
    if (Math.abs(dx) > Math.abs(dy)) moveLane(dx > 0 ? 1 : -1);
    else if (dy < 0) jump(); else slide();
  };

  return (
    <Card className="p-4 flex flex-col items-center gap-3" dir="rtl">
      <div className="flex gap-4 text-sm w-full justify-between items-center flex-wrap">
        <span>ניקוד: <b>{score}</b></span>
        <span>🪙 <b>{coins}</b></span>
        <span>שיא: <b>{best}</b></span>
        {running && !gameOver && <Button size="sm" variant="outline" onClick={togglePause}>{paused ? "▶️" : "⏸"}</Button>}
      </div>
      <div className="relative w-full">
        <canvas
          ref={canvasRef}
          width={W} height={H}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="rounded-lg border-2 border-primary/30 touch-none w-full shadow-xl select-none"
          style={{ aspectRatio: `${W}/${H}` }}
        />
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 rounded-lg animate-fade-in">
            <div className="bg-card p-5 rounded-2xl text-center shadow-2xl border-2 border-primary/40">
              <div className="text-2xl mb-1">💥 התנגשת!</div>
              <div>ניקוד: <b>{score}</b> · 🪙 {coins}</div>
              <div className="text-xs text-muted-foreground">שיא: {best}</div>
              <Button onClick={start} className="mt-3 w-full">🔁 נסה שוב</Button>
            </div>
          </div>
        )}
        {!running && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-700/40 to-slate-900/40 rounded-lg">
            <Button onClick={start} size="lg" className="shadow-2xl">▶️ התחל ריצה</Button>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs sm:hidden">
        <Button variant="outline" onClick={() => moveLane(-1)}>◀ שמאל</Button>
        <div className="grid grid-rows-2 gap-1">
          <Button variant="outline" onClick={jump}>▲ קפיצה</Button>
          <Button variant="outline" onClick={slide}>▼ החלקה</Button>
        </div>
        <Button variant="outline" onClick={() => moveLane(1)}>ימין ▶</Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        החלק שמאל/ימין להחלפת מסלול • למעלה לקפיצה • למטה להחלקה • אסוף מטבעות והימנע מרכבות ומחסומים
      </p>
    </Card>
  );
};
