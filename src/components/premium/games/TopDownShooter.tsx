import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { playSound } from "@/lib/sounds";

interface Entity { x: number; y: number; vx: number; vy: number; r: number; hp?: number; type?: string; life?: number; }

export const TopDownShooter = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const keys: Record<string, boolean> = {};
    const mouse = { x: W / 2, y: H / 2, down: false };
    const player: Entity = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 14, hp: 100 };
    let bullets: Entity[] = [];
    let enemies: Entity[] = [];
    let particles: Entity[] = [];
    let lastShot = 0;
    let waveNum = 1;
    let kills = 0;
    let localScore = 0;

    const spawnWave = (n: number) => {
      const count = 4 + n * 2;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 350;
        enemies.push({
          x: W / 2 + Math.cos(angle) * dist,
          y: H / 2 + Math.sin(angle) * dist,
          vx: 0, vy: 0, r: 12 + Math.random() * 6,
          hp: 2 + Math.floor(n / 2),
        });
      }
    };
    spawnWave(1);

    const onKey = (e: KeyboardEvent, v: boolean) => { keys[e.key.toLowerCase()] = v; };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    const mm = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (W / r.width);
      mouse.y = (e.clientY - r.top) * (H / r.height);
    };
    const md = () => { mouse.down = true; };
    const mu = () => { mouse.down = false; };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    canvas.addEventListener("mousemove", mm);
    canvas.addEventListener("mousedown", md);
    canvas.addEventListener("mouseup", mu);

    let raf = 0;
    const loop = (t: number) => {
      // input
      const speed = 3;
      let dx = 0, dy = 0;
      if (keys["w"] || keys["arrowup"]) dy -= 1;
      if (keys["s"] || keys["arrowdown"]) dy += 1;
      if (keys["a"] || keys["arrowleft"]) dx -= 1;
      if (keys["d"] || keys["arrowright"]) dx += 1;
      const len = Math.hypot(dx, dy) || 1;
      player.x = Math.max(player.r, Math.min(W - player.r, player.x + (dx / len) * speed));
      player.y = Math.max(player.r, Math.min(H - player.r, player.y + (dy / len) * speed));

      // shoot
      if (mouse.down && t - lastShot > 130) {
        lastShot = t;
        const ang = Math.atan2(mouse.y - player.y, mouse.x - player.x);
        bullets.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8, r: 4, life: 60 });
        playSound("tab");
      }

      // bullets
      bullets = bullets.filter(b => {
        b.x += b.vx; b.y += b.vy; b.life! -= 1;
        return b.life! > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H;
      });

      // enemies
      enemies.forEach(e => {
        const ang = Math.atan2(player.y - e.y, player.x - e.x);
        const sp = 1 + waveNum * 0.15;
        e.x += Math.cos(ang) * sp;
        e.y += Math.sin(ang) * sp;
      });

      // collisions
      enemies.forEach(e => {
        bullets.forEach(b => {
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) {
            e.hp! -= 1;
            b.life = 0;
            for (let i = 0; i < 4; i++) particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, r: 2, life: 20 });
          }
        });
        if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r) {
          player.hp! -= 0.5;
        }
      });
      const survivors: Entity[] = [];
      enemies.forEach(e => {
        if (e.hp! > 0) survivors.push(e);
        else { kills++; localScore += 10; }
      });
      enemies = survivors;

      particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.life! -= 1; return p.life! > 0; });

      if (enemies.length === 0) {
        waveNum++;
        setWave(waveNum);
        spawnWave(waveNum);
        localScore += 50;
      }

      setScore(localScore);

      // draw
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);
      // grid
      ctx.strokeStyle = "#1a1a3a";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      particles.forEach(p => { ctx.fillStyle = `rgba(255,180,0,${p.life! / 20})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); });

      enemies.forEach(e => {
        ctx.fillStyle = "#ff3355";
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      });

      bullets.forEach(b => {
        ctx.fillStyle = "#ffdd44";
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      });

      // player
      const ang = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(ang);
      ctx.fillStyle = "#00C853";
      ctx.beginPath(); ctx.arc(0, 0, player.r, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(player.r - 4, -3, 14, 6);
      ctx.restore();

      // HUD
      ctx.fillStyle = "#000a";
      ctx.fillRect(10, 10, 200, 20);
      ctx.fillStyle = "#00C853";
      ctx.fillRect(10, 10, 200 * Math.max(0, player.hp!) / 100, 20);
      ctx.strokeStyle = "#fff"; ctx.strokeRect(10, 10, 200, 20);

      if (player.hp! <= 0) {
        setGameOver(true);
        setRunning(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      canvas.removeEventListener("mousemove", mm);
      canvas.removeEventListener("mousedown", md);
      canvas.removeEventListener("mouseup", mu);
    };
  }, [running]);

  const start = () => { setScore(0); setWave(1); setGameOver(false); setRunning(true); playSound("enter"); };

  return (
    <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 border-cyan-500/40" dir="rtl">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-bold text-cyan-400">🔫 יורה מלמעלה</h3>
        <div className="flex gap-3 text-sm">
          <span className="text-yellow-400">ניקוד: {score}</span>
          <span className="text-red-400">גל: {wave}</span>
        </div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={640} height={400} className="w-full rounded-lg border border-cyan-500/30 bg-black cursor-crosshair" />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg gap-3">
            {gameOver && <div className="text-2xl font-bold text-red-400">המשחק נגמר! ניקוד: {score}</div>}
            <Button onClick={start} className="bg-cyan-500 hover:bg-cyan-600">
              {gameOver ? "שחק שוב" : "התחל משחק"}
            </Button>
            <p className="text-xs text-muted-foreground">WASD לתנועה • עכבר לכיוון • לחיצה לירי</p>
          </div>
        )}
      </div>
    </Card>
  );
};
