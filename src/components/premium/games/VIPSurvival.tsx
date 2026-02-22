import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";
import { DailyQuestPanel } from "@/components/premium/DailyQuestPanel";
import { updateQuestProgress } from "@/lib/dailyQuests";

interface Player {
  hp: number; maxHp: number; attack: number; defense: number;
  level: number; xp: number; loot: string[]; ability: string | null;
}

interface Enemy {
  name: string; emoji: string; hp: number; maxHp: number;
  attack: number; defense: number; reward: number; lootDrop?: string;
}

const ABILITIES = ["🔥 מגן אש", "⚡ ברק", "❄️ קפאון", "💚 ריפוי", "💀 מכת מוות"];

const ENEMIES: Omit<Enemy, "hp" | "maxHp">[] = [
  { name: "שלד חלש", emoji: "💀", attack: 5, defense: 2, reward: 50, lootDrop: "🗡️ חרב ברזל" },
  { name: "גובלין פראי", emoji: "👹", attack: 8, defense: 4, reward: 100, lootDrop: "🛡️ מגן עץ" },
  { name: "זאב צללים", emoji: "🐺", attack: 12, defense: 6, reward: 200 },
  { name: "אביר שחור", emoji: "⚔️", attack: 18, defense: 10, reward: 400, lootDrop: "💎 יהלום" },
  { name: "דרקון אש", emoji: "🐉", attack: 25, defense: 15, reward: 800, lootDrop: "👑 כתר הדרקון" },
  { name: "בוס האפלה", emoji: "😈", attack: 35, defense: 20, reward: 1500, lootDrop: "⭐ כוכב הנצח" },
];

const STORAGE_KEY = "vip-survival-state";

interface SurvivalState {
  totalPoints: number; highestLevel: number; totalWins: number;
  lootCollection: string[]; globalLevel: number; globalXp: number;
  globalXpToNext: number; badges: string[];
}

export const VIPSurvival = () => {
  const [savedState, setSavedState] = useState<SurvivalState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        return {
          totalPoints: p.totalPoints || 0, highestLevel: p.highestLevel || 0,
          totalWins: p.totalWins || 0, lootCollection: p.lootCollection || [],
          globalLevel: p.globalLevel || 1, globalXp: p.globalXp || 0,
          globalXpToNext: p.globalXpToNext || 400, badges: p.badges || [],
        };
      } catch {}
    }
    return { totalPoints: 0, highestLevel: 0, totalWins: 0, lootCollection: [], globalLevel: 1, globalXp: 0, globalXpToNext: 400, badges: [] };
  });
  const [player, setPlayer] = useState<Player | null>(null);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [phase, setPhase] = useState<"menu" | "battle" | "reward" | "dead">("menu");
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [earnedPoints, setEarnedPoints] = useState(0);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState)); }, [savedState]);

  const startArena = () => {
    playPremiumSound("gameStart");
    const ability = ABILITIES[Math.floor(Math.random() * ABILITIES.length)];
    setPlayer({ hp: 100, maxHp: 100, attack: 15, defense: 8, level: 1, xp: 0, loot: [], ability });
    setEarnedPoints(0);
    setBattleLog([`🎮 האליפות מתחילה! כישרון מיוחד: ${ability}`]);
    spawnEnemy(1);
    setPhase("battle");
    setTurn("player");
  };

  const spawnEnemy = (level: number) => {
    const idx = Math.min(level - 1, ENEMIES.length - 1);
    const template = ENEMIES[idx];
    const hp = 20 + level * 15;
    setEnemy({ ...template, hp, maxHp: hp });
    setBattleLog(prev => [...prev, `${template.emoji} ${template.name} מופיע!`]);
  };

  const playerAttack = () => {
    if (!player || !enemy || turn !== "player") return;
    playSound("click");
    const damage = Math.max(1, player.attack - enemy.defense + Math.floor(Math.random() * 8));
    const newEnemyHp = Math.max(0, enemy.hp - damage);
    setEnemy({ ...enemy, hp: newEnemyHp });
    setBattleLog(prev => [...prev, `⚔️ אתה מכה! ${damage} נזק`]);

    if (newEnemyHp <= 0) {
      playPremiumSound("reward");
      const reward = enemy.reward;
      const loot = enemy.lootDrop;
      setEarnedPoints(prev => prev + reward);
      updateQuestProgress("vipSurvival", `vipSurvival-${new Date().getFullYear() * 10000 + (new Date().getMonth()+1) * 100 + new Date().getDate()}-0`, 1);
      setBattleLog(prev => [...prev, `🎉 ${enemy.name} הובס! +${reward} נק'${loot ? ` | לוט: ${loot}` : ""}`]);
      setPlayer(prev => {
        if (!prev) return prev;
        const newXp = prev.xp + reward;
        const levelUp = newXp >= prev.level * 200;
        if (levelUp) playPremiumSound("levelUp");
        return {
          ...prev, xp: levelUp ? 0 : newXp, level: levelUp ? prev.level + 1 : prev.level,
          hp: levelUp ? prev.maxHp + 20 : Math.min(prev.maxHp, prev.hp + 15),
          maxHp: levelUp ? prev.maxHp + 20 : prev.maxHp,
          attack: levelUp ? prev.attack + 3 : prev.attack,
          defense: levelUp ? prev.defense + 2 : prev.defense,
          loot: loot ? [...prev.loot, loot] : prev.loot,
        };
      });
      if (player.level >= ENEMIES.length) {
        setPhase("reward"); playPremiumSound("win");
      } else {
        setTimeout(() => spawnEnemy((player?.level || 1) + 1), 1000);
      }
      return;
    }
    setTurn("enemy");
    setTimeout(() => {
      if (!player) return;
      const eDamage = Math.max(1, enemy.attack - player.defense + Math.floor(Math.random() * 6));
      const newPlayerHp = Math.max(0, player.hp - eDamage);
      setPlayer(prev => prev ? { ...prev, hp: newPlayerHp } : prev);
      setBattleLog(prev => [...prev, `${enemy.emoji} ${enemy.name} מכה! ${eDamage} נזק`]);
      if (newPlayerHp <= 0) { setPhase("dead"); playSound("error"); } else { setTurn("player"); }
    }, 800);
  };

  const useAbility = () => {
    if (!player || !enemy || turn !== "player") return;
    playPremiumSound("specialSuccess");
    if (player.ability?.includes("ריפוי")) {
      setPlayer(prev => prev ? { ...prev, hp: Math.min(prev.maxHp, prev.hp + 30), ability: null } : prev);
      setBattleLog(prev => [...prev, `💚 ריפוי! +30 חיים`]);
    } else {
      const damage = player.attack * 2;
      const newEnemyHp = Math.max(0, enemy.hp - damage);
      setEnemy({ ...enemy, hp: newEnemyHp });
      setPlayer(prev => prev ? { ...prev, ability: null } : prev);
      setBattleLog(prev => [...prev, `${player.ability} ${damage} נזק מיוחד!`]);
      if (newEnemyHp <= 0) {
        playPremiumSound("reward");
        setEarnedPoints(prev => prev + enemy.reward);
        setBattleLog(prev => [...prev, `🎉 ${enemy.name} הובס!`]);
        setTimeout(() => spawnEnemy((player?.level || 1) + 1), 1000);
        return;
      }
    }
    setTurn("enemy");
    setTimeout(() => {
      const eDamage = Math.max(1, enemy.attack - (player?.defense || 0) + Math.floor(Math.random() * 6));
      setPlayer(prev => prev ? { ...prev, hp: Math.max(0, prev.hp - eDamage) } : prev);
      setBattleLog(prev => [...prev, `${enemy.emoji} תקיפה! ${eDamage} נזק`]);
      setTurn("player");
    }, 800);
  };

  const finishArena = () => {
    setSavedState(prev => {
      let next = {
        ...prev,
        totalPoints: prev.totalPoints + earnedPoints,
        highestLevel: Math.max(prev.highestLevel, player?.level || 0),
        totalWins: prev.totalWins + 1,
        lootCollection: [...new Set([...prev.lootCollection, ...(player?.loot || [])])],
      };
      // Add global XP
      let xp = next.globalXp + earnedPoints / 3;
      let lvl = next.globalLevel;
      let xpn = next.globalXpToNext;
      const badges = [...next.badges];
      while (xp >= xpn) { xp -= xpn; lvl++; xpn = Math.floor(xpn * 1.3); }
      if (lvl >= 3 && !badges.includes("warrior")) badges.push("warrior");
      if (lvl >= 5 && !badges.includes("champion")) badges.push("champion");
      if (next.totalWins >= 10 && !badges.includes("legend")) badges.push("legend");
      return { ...next, globalXp: Math.floor(xp), globalLevel: lvl, globalXpToNext: xpn, badges };
    });
    setPhase("menu");
  };

  if (phase === "menu") {
    return (
      <div className="space-y-4 max-w-lg mx-auto" dir="rtl">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-red-400">⚔️ אתגר ההישרדות VIP</h3>
          <p className="text-sm text-muted-foreground">רמה {savedState.globalLevel} | נקודות: {savedState.totalPoints} | ניצחונות: {savedState.totalWins}</p>
        </div>

        <div className="px-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>רמה {savedState.globalLevel}</span>
            <span>{savedState.globalXp}/{savedState.globalXpToNext} XP</span>
          </div>
          <Progress value={(savedState.globalXp / savedState.globalXpToNext) * 100} className="h-2" />
        </div>

        {savedState.badges.length > 0 && (
          <div className="flex gap-2 justify-center flex-wrap">
            {savedState.badges.includes("warrior") && <Badge className="bg-red-500/20 text-red-400">⚔️ לוחם</Badge>}
            {savedState.badges.includes("champion") && <Badge className="bg-yellow-500/20 text-yellow-400">🏆 אלוף</Badge>}
            {savedState.badges.includes("legend") && <Badge className="bg-purple-500/20 text-purple-400">👑 אגדה</Badge>}
          </div>
        )}

        <DailyQuestPanel gameKey="vipSurvival" />

        {savedState.lootCollection.length > 0 && (
          <Card className="border-yellow-500/30">
            <CardContent className="py-3 text-center">
              <p className="text-sm font-medium mb-1">🎒 אוסף לוט:</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {savedState.lootCollection.map((l, i) => <Badge key={i} variant="outline">{l}</Badge>)}
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={startArena} className="w-full py-6 text-lg bg-gradient-to-r from-red-600 to-orange-600">⚔️ התחל אליפות!</Button>

        <Card>
          <CardContent className="py-4 text-sm space-y-2">
            <p className="font-bold">📋 חוקי הזירה:</p>
            <p>• הלחם נגד אויבים ברצף עולה</p>
            <p>• כל ניצחון נותן נקודות ולוט</p>
            <p>• עלה רמות כדי להתחזק</p>
            <p>• כישרון מיוחד חד-פעמי לכל אליפות</p>
            <p>• הגיע לבוס הסופי כדי לנצח!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "reward" || phase === "dead") {
    return (
      <div className="max-w-lg mx-auto" dir="rtl">
        <Card className={`animate-scale-in ${phase === "reward" ? "border-yellow-500/30" : "border-red-500/30"}`}>
          <CardContent className="py-8 text-center space-y-4">
            <div className="text-5xl">{phase === "reward" ? "🏆" : "💀"}</div>
            <p className={`text-2xl font-bold ${phase === "reward" ? "text-yellow-400" : "text-red-400"}`}>
              {phase === "reward" ? "ניצחון גדול!" : "נפלת בקרב"}
            </p>
            <p className="text-lg">נקודות שנצברו: <strong className="text-primary">{earnedPoints}</strong></p>
            {player?.loot && player.loot.length > 0 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {player.loot.map((l, i) => <Badge key={i}>{l}</Badge>)}
              </div>
            )}
            <Button onClick={finishArena} className="w-full">סיום ושמירה</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4" dir="rtl">
      <div className="flex gap-3">
        <Card className="flex-1 border-green-500/30">
          <CardContent className="py-2 text-center text-sm">
            <p className="font-bold">אתה (רמה {player?.level})</p>
            <Progress value={((player?.hp || 0) / (player?.maxHp || 100)) * 100} className="h-2 my-1" />
            <p className="text-xs">{player?.hp}/{player?.maxHp} ❤️</p>
          </CardContent>
        </Card>
        <Card className="flex-1 border-red-500/30">
          <CardContent className="py-2 text-center text-sm">
            <p className="font-bold">{enemy?.emoji} {enemy?.name}</p>
            <Progress value={((enemy?.hp || 0) / (enemy?.maxHp || 100)) * 100} className="h-2 my-1" />
            <p className="text-xs">{enemy?.hp}/{enemy?.maxHp} ❤️</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-3">
          <div className="h-28 overflow-y-auto space-y-1 text-sm">
            {battleLog.slice(-6).map((l, i) => (
              <p key={i} className="text-muted-foreground" style={{ animation: "fadeSlideIn 0.2s ease-out" }}>{l}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={playerAttack} disabled={turn !== "player"} className="flex-1 py-4">⚔️ תקוף</Button>
        <Button onClick={useAbility} disabled={turn !== "player" || !player?.ability} variant="outline" className="flex-1 py-4">
          {player?.ability || "כישרון (נגמר)"}
        </Button>
      </div>
      <div className="text-center text-xs text-muted-foreground">נקודות: {earnedPoints} | {turn === "player" ? "תורך!" : "תור היריב..."}</div>
    </div>
  );
};
