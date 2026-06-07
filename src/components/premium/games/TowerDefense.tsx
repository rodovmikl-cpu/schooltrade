import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { playSound } from "@/lib/sounds";

// Path-based tower defense
const PATH = [
  { x: 0, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 280 },
  { x: 440, y: 280 }, { x: 440, y: 140 }, { x: 640, y: 140 },
];

interface Enemy { x: number; y: number; seg: number; hp: number; maxHp: number; speed: number; reward: number; }
interface Tower { x: number; y: number; range: number; dmg: number; cd: number; lastShot: number; level: number; }
interface Bullet { x: number; y: number; tx: number; ty: number; dmg: number; target: Enemy; }

export const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gold, setGold] = useState(120);
  const [lives, setLives] = useState(20);
  const [wave, setWave] = useState(1);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const stateRef = useRef({ gold: 120, lives: 20, wave: 1, towers: [] as Tower[], enemies: [] as Enemy[], bullets: [] as Bullet[], spawning: false, spawnQueue: 0, lastSpawn: 0, waveActive: false });

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const S = stateRef.current;

    const placeTower = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX - r.left) * (W / r.width);
      const my = (e.clientY - r.top) * (H / r.height);
      // not on path
      for (let i = 0; i < PATH.length - 1; i++) {
        const a = PATH[i], b = PATH[i + 1];
        const minX = Math.min(a.x, b.x) - 25, maxX = Math.max(a.x, b.x) + 25;
        const minY = Math.min(a.y, b.y) - 25, maxY = Math.max(a.y, b.y) + 25;
        if (mx > minX && mx < maxX && my > minY && my < maxY) return;
      }
      if (S.gold < 50) return;
      // upgrade existing
      const ex = S.towers.find(t => Math.hypot(t.x - mx, t.y - my) < 22);
      if (ex) {
        const cost = 40 * ex.level;
        if (S.gold >= cost) {
          S.gold -= cost;
          ex.level++;
          ex.dmg += 6;
          ex.range += 10;
          ex.cd = Math.max(200, ex.cd - 50);
          setGold(S.gold);
          playSound("enter");
        }
        return;
      }
      S.gold -= 50;
      S.towers.push({ x: mx, y: my, range: 100, dmg: 10, cd: 700, lastShot: 0, level: 1 });
      setGold(S.gold);
      playSound("tab");
    };
    canvas.addEventListener("click", placeTower);

    const startWave = () => {
      S.waveActive = true;
      S.spawnQueue = 6 + S.wave * 2;
      S.lastSpawn = 0;
    };

    let raf = 0;
    let t0 = performance.now();
    const loop = (t: number) => {
      const dt = t - t0; t0 = t;

      if (S.waveActive && S.spawnQueue > 0 && t - S.lastSpawn > 700) {
        S.lastSpawn = t;
        S.spawnQueue--;
        const hp = 20 + S.wave * 12;
        S.enemies.push({ x: PATH[0].x, y: PATH[0].y, seg: 0, hp, maxHp: hp, speed: 0.8 + S.wave * 0.05, reward: 8 + S.wave });
      }

      // move enemies
      const alive: Enemy[] = [];
      S.enemies.forEach(e => {
        if (e.seg >= PATH.length - 1) {
          S.lives -= 1;
          setLives(S.lives);
          return;
        }
        const a = PATH[e.seg], b = PATH[e.seg + 1];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        e.x += Math.cos(ang) * e.speed * (dt / 16);
        e.y += Math.sin(ang) * e.speed * (dt / 16);
        if (Math.hypot(b.x - e.x, b.y - e.y) < 5) { e.seg++; e.x = b.x; e.y = b.y; }
        if (e.hp > 0) alive.push(e);
        else { S.gold += e.reward; setGold(S.gold); }
      });
      S.enemies = alive;

      // towers shoot
      S.towers.forEach(tw => {
        if (t - tw.lastShot < tw.cd) return;
        const target = S.enemies.find(e => Math.hypot(e.x - tw.x, e.y - tw.y) < tw.range);
        if (target) {
          tw.lastShot = t;
          S.bullets.push({ x: tw.x, y: tw.y, tx: target.x, ty: target.y, dmg: tw.dmg, target });
        }
      });

      // bullets
      S.bullets = S.bullets.filter(b => {
        const ang = Math.atan2(b.target.y - b.y, b.target.x - b.x);
        b.x += Math.cos(ang) * 6; b.y += Math.sin(ang) * 6;
        if (Math.hypot(b.target.x - b.x, b.target.y - b.y) < 8) {
          b.target.hp -= b.dmg;
          return false;
        }
        return true;
      });

      if (S.waveActive && S.spawnQueue === 0 && S.enemies.length === 0) {
        S.waveActive = false;
        S.wave++;
        S.gold += 40;
        setWave(S.wave);
        setGold(S.gold);
        setTimeout(startWave, 2000);
      }

      // draw
      ctx.fillStyle = "#1a2e1a";
      ctx.fillRect(0, 0, W, H);
      // path
      ctx.strokeStyle = "#6b4423"; ctx.lineWidth = 40; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(PATH[0].x, PATH[0].y);
      PATH.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.strokeStyle = "#8b5a2b"; ctx.lineWidth = 36; ctx.stroke();

      // towers
      S.towers.forEach(tw => {
        ctx.fillStyle = "#444";
        ctx.beginPath(); ctx.arc(tw.x, tw.y, 18, 0, 7); ctx.fill();
        ctx.fillStyle = ["#888", "#4af", "#fa4", "#f4f"][Math.min(tw.level - 1, 3)];
        ctx.beginPath(); ctx.arc(tw.x, tw.y, 12, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(String(tw.level), tw.x, tw.y + 3);
      });

      // enemies
      S.enemies.forEach(e => {
        ctx.fillStyle = "#c33";
        ctx.beginPath(); ctx.arc(e.x, e.y, 10, 0, 7); ctx.fill();
        ctx.fillStyle = "#000"; ctx.fillRect(e.x - 12, e.y - 18, 24, 4);
        ctx.fillStyle = "#0f0"; ctx.fillRect(e.x - 12, e.y - 18, 24 * (e.hp / e.maxHp), 4);
      });

      // bullets
      S.bullets.forEach(b => { ctx.fillStyle = "#ff0"; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill(); });

      if (S.lives <= 0) {
        setGameOver(true);
        setRunning(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    startWave();
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("click", placeTower);
    };
  }, [running]);

  const start = () => {
    stateRef.current = { gold: 120, lives: 20, wave: 1, towers: [], enemies: [], bullets: [], spawning: false, spawnQueue: 0, lastSpawn: 0, waveActive: false };
    setGold(120); setLives(20); setWave(1); setGameOver(false); setRunning(true);
    playSound("enter");
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-500/40" dir="rtl">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h3 className="text-xl font-bold text-emerald-400">🧱 הגנת המגדלים</h3>
        <div className="flex gap-3 text-sm">
          <span className="text-yellow-400">💰 {gold}</span>
          <span className="text-red-400">❤️ {lives}</span>
          <span className="text-cyan-400">🌊 גל {wave}</span>
        </div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={640} height={400} className="w-full rounded-lg border border-emerald-500/30 cursor-pointer" />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg gap-3">
            {gameOver && <div className="text-2xl font-bold text-red-400">נכבשת! גל: {wave}</div>}
            <Button onClick={start} className="bg-emerald-500 hover:bg-emerald-600">
              {gameOver ? "שחק שוב" : "התחל משחק"}
            </Button>
            <p className="text-xs text-muted-foreground">לחץ כדי לבנות מגדל (50💰) • לחץ שוב על מגדל לשדרוג</p>
          </div>
        )}
      </div>
    </Card>
  );
};
