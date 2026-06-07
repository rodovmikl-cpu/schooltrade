import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { playSound } from "@/lib/sounds";

interface Plat { x: number; y: number; w: number; h: number; }
interface Coin { x: number; y: number; taken: boolean; }

const LEVELS: { plats: Plat[]; coins: Coin[]; goal: { x: number; y: number }; spawn: { x: number; y: number } }[] = [
  { plats: [{ x: 0, y: 370, w: 640, h: 30 }, { x: 150, y: 290, w: 100, h: 14 }, { x: 320, y: 240, w: 100, h: 14 }, { x: 480, y: 190, w: 100, h: 14 }], coins: [{ x: 180, y: 260, taken: false }, { x: 350, y: 210, taken: false }, { x: 510, y: 160, taken: false }], goal: { x: 600, y: 160 }, spawn: { x: 30, y: 330 } },
  { plats: [{ x: 0, y: 370, w: 200, h: 30 }, { x: 280, y: 370, w: 120, h: 30 }, { x: 480, y: 370, w: 160, h: 30 }, { x: 120, y: 280, w: 80, h: 14 }, { x: 260, y: 220, w: 80, h: 14 }, { x: 400, y: 160, w: 80, h: 14 }, { x: 540, y: 100, w: 100, h: 14 }], coins: [{ x: 150, y: 250, taken: false }, { x: 290, y: 190, taken: false }, { x: 430, y: 130, taken: false }, { x: 580, y: 70, taken: false }], goal: { x: 600, y: 70 }, spawn: { x: 20, y: 330 } },
  { plats: [{ x: 0, y: 370, w: 100, h: 30 }, { x: 180, y: 320, w: 80, h: 14 }, { x: 320, y: 270, w: 60, h: 14 }, { x: 440, y: 220, w: 60, h: 14 }, { x: 320, y: 160, w: 60, h: 14 }, { x: 180, y: 100, w: 80, h: 14 }, { x: 500, y: 80, w: 120, h: 14 }], coins: [{ x: 210, y: 290, taken: false }, { x: 470, y: 190, taken: false }, { x: 350, y: 130, taken: false }, { x: 560, y: 50, taken: false }], goal: { x: 600, y: 50 }, spawn: { x: 20, y: 330 } },
];

export const PlatformerGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState(0);
  const [coins, setCoins] = useState(0);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    let lvl = level;
    let data = JSON.parse(JSON.stringify(LEVELS[lvl]));
    const p = { x: data.spawn.x, y: data.spawn.y, vx: 0, vy: 0, w: 22, h: 28, onGround: false };
    const keys: Record<string, boolean> = {};
    const kd = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault(); };
    const ku = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    let raf = 0;
    let localCoins = 0;

    const loop = () => {
      // physics
      const accel = 0.6, maxSp = 4, friction = 0.85, gravity = 0.7, jump = -12;
      if (keys["a"] || keys["arrowleft"]) p.vx -= accel;
      if (keys["d"] || keys["arrowright"]) p.vx += accel;
      p.vx = Math.max(-maxSp, Math.min(maxSp, p.vx * friction + (keys["a"] || keys["arrowleft"] ? -accel : 0) + (keys["d"] || keys["arrowright"] ? accel : 0)));
      if ((keys["w"] || keys["arrowup"] || keys[" "]) && p.onGround) { p.vy = jump; p.onGround = false; playSound("tab"); }
      p.vy += gravity;
      p.x += p.vx;
      // horizontal collisions
      data.plats.forEach((pl: Plat) => {
        if (p.x < pl.x + pl.w && p.x + p.w > pl.x && p.y < pl.y + pl.h && p.y + p.h > pl.y) {
          if (p.vx > 0) p.x = pl.x - p.w;
          else if (p.vx < 0) p.x = pl.x + pl.w;
          p.vx = 0;
        }
      });
      p.y += p.vy;
      p.onGround = false;
      data.plats.forEach((pl: Plat) => {
        if (p.x < pl.x + pl.w && p.x + p.w > pl.x && p.y < pl.y + pl.h && p.y + p.h > pl.y) {
          if (p.vy > 0) { p.y = pl.y - p.h; p.vy = 0; p.onGround = true; }
          else if (p.vy < 0) { p.y = pl.y + pl.h; p.vy = 0; }
        }
      });
      if (p.y > H) { p.x = data.spawn.x; p.y = data.spawn.y; p.vx = 0; p.vy = 0; }
      if (p.x < 0) p.x = 0;
      if (p.x + p.w > W) p.x = W - p.w;

      // coins
      data.coins.forEach((c: Coin) => {
        if (!c.taken && Math.hypot(c.x - (p.x + 11), c.y - (p.y + 14)) < 18) {
          c.taken = true; localCoins++; setCoins(localCoins);
          playSound("enter");
        }
      });

      // goal
      if (Math.hypot(data.goal.x - (p.x + 11), data.goal.y - (p.y + 14)) < 22) {
        if (lvl < LEVELS.length - 1) {
          lvl++;
          setLevel(lvl);
          data = JSON.parse(JSON.stringify(LEVELS[lvl]));
          p.x = data.spawn.x; p.y = data.spawn.y; p.vx = 0; p.vy = 0;
        } else {
          setWon(true); setRunning(false); return;
        }
      }

      // draw
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#1a1a3e"); grad.addColorStop(1, "#3a1a5e");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      // stars
      ctx.fillStyle = "#fff8";
      for (let i = 0; i < 30; i++) ctx.fillRect((i * 73) % W, (i * 41) % H, 1, 1);
      // plats
      data.plats.forEach((pl: Plat) => {
        ctx.fillStyle = "#4a2e5e";
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.fillStyle = "#7a4e8e";
        ctx.fillRect(pl.x, pl.y, pl.w, 4);
      });
      // coins
      data.coins.forEach((c: Coin) => {
        if (c.taken) return;
        ctx.fillStyle = "#ffd700";
        ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, 7); ctx.fill();
        ctx.strokeStyle = "#fff8"; ctx.lineWidth = 2; ctx.stroke();
      });
      // goal
      ctx.fillStyle = "#0f0";
      ctx.beginPath(); ctx.arc(data.goal.x, data.goal.y, 14, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("★", data.goal.x, data.goal.y + 4);
      // player
      ctx.fillStyle = "#00C853";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#fff"; ctx.fillRect(p.x + 5, p.y + 8, 4, 4); ctx.fillRect(p.x + 13, p.y + 8, 4, 4);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [running, level]);

  const start = () => { setLevel(0); setCoins(0); setWon(false); setRunning(true); playSound("enter"); };

  return (
    <Card className="p-4 bg-gradient-to-br from-indigo-950 to-purple-900 border-purple-500/40" dir="rtl">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-bold text-purple-400">⬛ פלטפורמר</h3>
        <div className="flex gap-3 text-sm">
          <span className="text-yellow-400">🪙 {coins}</span>
          <span className="text-cyan-400">שלב {level + 1}/{LEVELS.length}</span>
        </div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={640} height={400} className="w-full rounded-lg border border-purple-500/30" />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg gap-3">
            {won && <div className="text-2xl font-bold text-green-400">🏆 ניצחת! מטבעות: {coins}</div>}
            <Button onClick={start} className="bg-purple-500 hover:bg-purple-600">
              {won ? "שחק שוב" : "התחל"}
            </Button>
            <p className="text-xs text-muted-foreground">חצים/WASD לתנועה • רווח/למעלה לקפיצה</p>
          </div>
        )}
      </div>
    </Card>
  );
};
