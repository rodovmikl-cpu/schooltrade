import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";

interface Car {
  id: string;
  name: string;
  speed: number;
  acceleration: number;
  handling: number;
  rarity: "common" | "rare" | "legendary" | "secret";
  price: number;
  emoji: string;
}

interface RaceResult {
  position: number;
  time: number;
  reward: number;
}

const CARS: Car[] = [
  { id: "c1", name: "רוח מדברית", speed: 60, acceleration: 50, handling: 70, rarity: "common", price: 0, emoji: "🚗" },
  { id: "c2", name: "ברק כחול", speed: 75, acceleration: 65, handling: 60, rarity: "common", price: 5000, emoji: "🏎️" },
  { id: "c3", name: "נמר לילה", speed: 85, acceleration: 80, handling: 75, rarity: "rare", price: 20000, emoji: "🐆" },
  { id: "c4", name: "פניקס אדום", speed: 92, acceleration: 88, handling: 85, rarity: "rare", price: 50000, emoji: "🔥" },
  { id: "c5", name: "דרקון טיטניום", speed: 97, acceleration: 95, handling: 90, rarity: "legendary", price: 150000, emoji: "🐉" },
  { id: "c6", name: "צל הרוח", speed: 100, acceleration: 100, handling: 95, rarity: "legendary", price: 500000, emoji: "👻" },
  { id: "c7", name: "???", speed: 100, acceleration: 100, handling: 100, rarity: "secret", price: 2000000, emoji: "⚡" },
];

const TRACKS = [
  { name: "מסלול העיר", difficulty: 1, reward: 1000 },
  { name: "כביש ההרים", difficulty: 2, reward: 3000 },
  { name: "חוף הזהב", difficulty: 3, reward: 5000 },
  { name: "מנהרת הסוד", difficulty: 4, reward: 10000 },
  { name: "אליפות VIP", difficulty: 5, reward: 25000 },
];

const STORAGE_KEY = "digital-drift-state";

interface DriftState {
  balance: number;
  ownedCars: string[];
  selectedCar: string;
  totalPoints: number;
  wins: number;
  upgrades: Record<string, { speed: number; accel: number; handling: number }>;
}

export const DigitalDrift = () => {
  const [state, setState] = useState<DriftState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { return JSON.parse(saved); } catch {}
    return { balance: 5000, ownedCars: ["c1"], selectedCar: "c1", totalPoints: 0, wins: 0, upgrades: {} };
  });
  const [tab, setTab] = useState<"garage" | "race" | "shop">("race");
  const [racing, setRacing] = useState(false);
  const [raceProgress, setRaceProgress] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);
  const [selectedTrack, setSelectedTrack] = useState(0);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const getCurrentCar = () => {
    const car = CARS.find(c => c.id === state.selectedCar) || CARS[0];
    const upg = state.upgrades[car.id] || { speed: 0, accel: 0, handling: 0 };
    return {
      ...car,
      speed: Math.min(100, car.speed + upg.speed),
      acceleration: Math.min(100, car.acceleration + upg.accel),
      handling: Math.min(100, car.handling + upg.handling),
    };
  };

  const startRace = () => {
    const track = TRACKS[selectedTrack];
    const car = getCurrentCar();
    playPremiumSound("gameStart");
    setRacing(true);
    setRaceProgress(0);
    setOpponentProgress(0);
    setRaceResult(null);

    const carScore = (car.speed + car.acceleration + car.handling) / 3;
    const opponentScore = 50 + track.difficulty * 10 + Math.random() * 15;

    let progress = 0;
    let oProgress = 0;
    const interval = setInterval(() => {
      const playerStep = (carScore / 100) * (2 + Math.random() * 2);
      const opStep = (opponentScore / 100) * (2 + Math.random() * 2);
      progress = Math.min(100, progress + playerStep);
      oProgress = Math.min(100, oProgress + opStep);
      setRaceProgress(progress);
      setOpponentProgress(oProgress);

      if (progress >= 100 || oProgress >= 100) {
        clearInterval(interval);
        const won = progress >= oProgress;
        const reward = won ? track.reward : Math.floor(track.reward * 0.2);

        if (won) playPremiumSound("win");
        else playSound("error");

        setRaceResult({ position: won ? 1 : 2, time: 0, reward });
        setState(prev => ({
          ...prev,
          balance: prev.balance + reward,
          totalPoints: prev.totalPoints + reward,
          wins: won ? prev.wins + 1 : prev.wins,
        }));
        setTimeout(() => setRacing(false), 500);
      }
    }, 100);
  };

  const buyCar = (car: Car) => {
    if (state.balance < car.price || state.ownedCars.includes(car.id)) return;
    playPremiumSound("specialSuccess");
    setState(prev => ({
      ...prev,
      balance: prev.balance - car.price,
      ownedCars: [...prev.ownedCars, car.id],
    }));
  };

  const upgradeStat = (stat: "speed" | "accel" | "handling") => {
    const cost = 2000;
    if (state.balance < cost) return;
    playSound("click");
    setState(prev => {
      const current = prev.upgrades[prev.selectedCar] || { speed: 0, accel: 0, handling: 0 };
      if (current[stat] >= 20) return prev;
      return {
        ...prev,
        balance: prev.balance - cost,
        upgrades: { ...prev.upgrades, [prev.selectedCar]: { ...current, [stat]: current[stat] + 2 } },
      };
    });
  };

  const car = getCurrentCar();
  const rarityColor = (r: string) => r === "secret" ? "text-red-400" : r === "legendary" ? "text-yellow-400" : r === "rare" ? "text-blue-400" : "text-muted-foreground";

  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-orange-400">🏁 זירת הדריפט הדיגיטלית</h3>
        <p className="text-sm text-muted-foreground">💰 ${state.balance.toLocaleString()} | 🏆 ניצחונות: {state.wins}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["race", "garage", "shop"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)} className="flex-1">
            {t === "race" ? "🏁 מרוץ" : t === "garage" ? "🔧 מוסך" : "🛒 חנות"}
          </Button>
        ))}
      </div>

      {tab === "race" && (
        <div className="space-y-4">
          <Card className="border-orange-500/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{car.emoji}</span>
                <div>
                  <p className="font-bold">{car.name}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>⚡{car.speed}</span>
                    <span>🚀{car.acceleration}</span>
                    <span>🎯{car.handling}</span>
                  </div>
                </div>
              </div>

              {racing ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">אתה {car.emoji}</p>
                    <Progress value={raceProgress} className="h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">יריב 🏎️</p>
                    <Progress value={opponentProgress} className="h-4" />
                  </div>
                </div>
              ) : raceResult ? (
                <div className="text-center py-4 animate-scale-in">
                  <p className={`text-2xl font-bold ${raceResult.position === 1 ? "text-yellow-400" : "text-muted-foreground"}`}>
                    {raceResult.position === 1 ? "🏆 ניצחון!" : "😔 הפסד"}
                  </p>
                  <p className="text-primary">+${raceResult.reward.toLocaleString()}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium">בחר מסלול:</p>
                  {TRACKS.map((track, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedTrack(i)}
                      className={`w-full text-right p-2 rounded-lg border transition-all text-sm ${
                        selectedTrack === i ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      {track.name} — {track.reward.toLocaleString()}$ {"⭐".repeat(track.difficulty)}
                    </button>
                  ))}
                  <Button onClick={startRace} className="w-full mt-2">🏁 התחל מרוץ!</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "garage" && (
        <div className="space-y-3">
          <p className="font-medium">הרכבים שלך:</p>
          {CARS.filter(c => state.ownedCars.includes(c.id)).map(c => (
            <div key={c.id} className={`p-3 rounded-xl border-2 ${state.selectedCar === c.id ? "border-primary" : "border-border"}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{c.emoji}</span>
                  <span className={`font-bold ${rarityColor(c.rarity)}`}>{c.name}</span>
                </div>
                <Button size="sm" variant={state.selectedCar === c.id ? "default" : "outline"} onClick={() => setState(p => ({ ...p, selectedCar: c.id }))}>
                  {state.selectedCar === c.id ? "נבחר" : "בחר"}
                </Button>
              </div>
              {state.selectedCar === c.id && (
                <div className="mt-3 space-y-2">
                  {(["speed", "accel", "handling"] as const).map(stat => {
                    const upg = state.upgrades[c.id] || { speed: 0, accel: 0, handling: 0 };
                    const label = stat === "speed" ? "מהירות" : stat === "accel" ? "תאוצה" : "שליטה";
                    return (
                      <div key={stat} className="flex items-center gap-2 text-sm">
                        <span className="w-16">{label}</span>
                        <Progress value={stat === "speed" ? c.speed + upg.speed : stat === "accel" ? c.acceleration + upg.accel : c.handling + upg.handling} className="flex-1 h-2" />
                        <Button size="sm" variant="ghost" onClick={() => upgradeStat(stat)} disabled={state.balance < 2000 || upg[stat] >= 20}>
                          +2 ($2K)
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "shop" && (
        <div className="space-y-3">
          {CARS.map(c => {
            const owned = state.ownedCars.includes(c.id);
            return (
              <div key={c.id} className={`p-3 rounded-xl border-2 ${owned ? "border-green-500/30 opacity-60" : "border-border"}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{c.emoji}</span>
                    <div>
                      <span className={`font-bold ${rarityColor(c.rarity)}`}>{c.rarity === "secret" ? "רכב סודי" : c.name}</span>
                      <div className="text-xs text-muted-foreground">⚡{c.speed} 🚀{c.acceleration} 🎯{c.handling}</div>
                    </div>
                  </div>
                  {owned ? (
                    <span className="text-green-400 text-sm">✓ בבעלותך</span>
                  ) : (
                    <Button size="sm" onClick={() => buyCar(c)} disabled={state.balance < c.price}>
                      ${c.price.toLocaleString()}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
