import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest } from "@/lib/arcadePoints";
import { playSound } from "@/lib/sounds";

interface Props { userCode: string; userName: string; }

interface Upgrade { id: string; name: string; emoji: string; baseCost: number; basePower: number; level: number; type: "click" | "auto"; }

const KEY = (uc: string) => `idle-clicker-${uc}`;

const INITIAL: Upgrade[] = [
  { id: "finger", name: "אצבע חזקה", emoji: "👆", baseCost: 10, basePower: 1, level: 0, type: "click" },
  { id: "glove", name: "כפפה", emoji: "🧤", baseCost: 50, basePower: 5, level: 0, type: "click" },
  { id: "auto1", name: "עוזר", emoji: "🤖", baseCost: 100, basePower: 1, level: 0, type: "auto" },
  { id: "auto2", name: "מפעל", emoji: "🏭", baseCost: 1000, basePower: 10, level: 0, type: "auto" },
  { id: "auto3", name: "מעבדה", emoji: "🧪", baseCost: 10000, basePower: 100, level: 0, type: "auto" },
];

const cost = (u: Upgrade) => Math.floor(u.baseCost * Math.pow(1.15, u.level));

export const IdleClickerGame = ({ userCode, userName }: Props) => {
  const [coins, setCoins] = useState(0);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(INITIAL);
  const [submittedAt, setSubmittedAt] = useState(0);
  const [pop, setPop] = useState<{ id: number; x: number; y: number; v: number }[]>([]);
  const popId = useRef(0);

  const clickPower = upgrades.filter(u => u.type === "click").reduce((s, u) => s + u.basePower * u.level, 0) + 1;
  const autoPower = upgrades.filter(u => u.type === "auto").reduce((s, u) => s + u.basePower * u.level, 0);

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY(userCode));
      if (raw) {
        const p = JSON.parse(raw);
        setCoins(p.coins || 0);
        if (p.upgrades) setUpgrades(p.upgrades);
      }
    } catch {}
  }, [userCode]);

  // save
  useEffect(() => {
    try { localStorage.setItem(KEY(userCode), JSON.stringify({ coins, upgrades })); } catch {}
  }, [coins, upgrades, userCode]);

  // auto income tick (10/sec)
  useEffect(() => {
    const id = setInterval(() => setCoins(c => c + autoPower / 10), 100);
    return () => clearInterval(id);
  }, [autoPower]);

  // submit best score every 30s if grew significantly
  useEffect(() => {
    const id = setInterval(() => {
      const cur = Math.floor(coins);
      if (cur > submittedAt && cur >= 100) {
        setArcadeBest("idle", cur);
        submitScore("idle", userCode, userName, cur);
        setSubmittedAt(cur);
      }
    }, 30000);
    return () => clearInterval(id);
  }, [coins, submittedAt, userCode, userName]);

  const click = (e: React.MouseEvent) => {
    setCoins(c => c + clickPower);
    playSound("click");
    const id = ++popId.current;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPop(p => [...p, { id, x: e.clientX - rect.left, y: e.clientY - rect.top, v: clickPower }]);
    setTimeout(() => setPop(p => p.filter(x => x.id !== id)), 800);
  };

  const buy = (id: string) => {
    setUpgrades(prev => prev.map(u => {
      if (u.id !== id) return u;
      const c = cost(u);
      if (coins < c) return u;
      setCoins(co => co - c);
      playSound("success");
      return { ...u, level: u.level + 1 };
    }));
  };

  return (
    <Card className="p-4 space-y-4" dir="rtl">
      <div className="text-center">
        <div className="text-3xl font-bold">🍪 {Math.floor(coins).toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">+{clickPower}/לחיצה · +{autoPower}/שנייה</div>
      </div>
      <div className="flex justify-center">
        <button
          onClick={click}
          className="relative w-40 h-40 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-7xl shadow-2xl active:scale-95 transition-transform select-none touch-none"
        >
          🍪
          {pop.map(p => (
            <span key={p.id} className="absolute font-bold text-amber-100 text-xl pointer-events-none animate-fade-out"
              style={{ left: p.x, top: p.y, animation: "floatUp 0.8s ease-out forwards" }}>
              +{p.v}
            </span>
          ))}
        </button>
      </div>
      <style>{`@keyframes floatUp { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-50px);opacity:0} }`}</style>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground">שדרוגים</h3>
        {upgrades.map(u => {
          const c = cost(u);
          const can = coins >= c;
          return (
            <button key={u.id} disabled={!can} onClick={() => buy(u.id)}
              className={`w-full text-right p-3 rounded-lg border-2 flex justify-between items-center transition-all ${can ? "border-primary/40 hover:bg-primary/10" : "border-border opacity-60"}`}>
              <div>
                <div className="font-bold">{u.emoji} {u.name} <span className="text-xs text-muted-foreground">לבל {u.level}</span></div>
                <div className="text-xs text-muted-foreground">{u.type === "click" ? `+${u.basePower} ללחיצה` : `+${u.basePower}/שנייה`}</div>
              </div>
              <div className="text-sm font-bold">{c.toLocaleString()} 🍪</div>
            </button>
          );
        })}
      </div>

      <Button variant="outline" className="w-full" onClick={() => {
        const cur = Math.floor(coins);
        if (cur > 0) { submitScore("idle", userCode, userName, cur); setArcadeBest("idle", cur); setSubmittedAt(cur); playSound("success"); }
      }}>📤 שלח שיא לטבלה</Button>
    </Card>
  );
};
