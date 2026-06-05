import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { playPremiumSound } from "@/lib/premiumSounds";
import { playSound } from "@/lib/sounds";
import { DailyQuestPanel } from "@/components/premium/DailyQuestPanel";
import { updateQuestProgress } from "@/lib/dailyQuests";

interface Weapon {
  id: string; name: string; emoji: string; desc: string;
  attackBonus: number; defenseBonus: number; critBonus: number; comboBonus: number;
}

const WEAPONS: Weapon[] = [
  { id: "sword", name: "חרב הברק",   emoji: "⚔️", desc: "מאוזנת — נזק גבוה, קומבו טוב",   attackBonus: 6, defenseBonus: 2, critBonus: 0.05, comboBonus: 0 },
  { id: "bow",   name: "קשת הצללים", emoji: "🏹", desc: "קריטיים תכופים, הגנה נמוכה",      attackBonus: 3, defenseBonus: 0, critBonus: 0.15, comboBonus: 1 },
  { id: "staff", name: "מטה הקסם",   emoji: "🔮", desc: "כישרונות חזקים, מגן עוצמתי",      attackBonus: 2, defenseBonus: 5, critBonus: 0.02, comboBonus: 0 },
];

interface Perk { id: string; name: string; emoji: string; desc: string; apply: (p: Player) => Player; }

const PERKS: Perk[] = [
  { id: "atk",    name: "כוח גולמי",  emoji: "💪", desc: "+6 התקפה",                 apply: p => ({ ...p, attack: p.attack + 6 }) },
  { id: "def",    name: "שריון פלדה", emoji: "🛡️", desc: "+5 הגנה",                   apply: p => ({ ...p, defense: p.defense + 5 }) },
  { id: "hp",     name: "חיוניות",    emoji: "❤️", desc: "+30 חיים מקסימליים",        apply: p => ({ ...p, maxHp: p.maxHp + 30, hp: p.hp + 30 }) },
  { id: "regen",  name: "התחדשות",    emoji: "✨", desc: "ריפוי מלא + שיקוי",          apply: p => ({ ...p, hp: p.maxHp, potions: p.potions + 1 }) },
  { id: "crit",   name: "עין הנמר",   emoji: "🎯", desc: "+10% סיכוי קריטי",          apply: p => ({ ...p, critBoost: (p.critBoost || 0) + 0.10 }) },
  { id: "vamp",   name: "ערפד",       emoji: "🩸", desc: "ספיגת חיים 25% מנזק",       apply: p => ({ ...p, lifesteal: (p.lifesteal || 0) + 0.25 }) },
  { id: "cdr",    name: "זריזות",     emoji: "⚡", desc: "כישרונות חוזרים מהר יותר",  apply: p => ({ ...p, abilities: p.abilities.map(a => ({ ...a, cooldown: Math.max(1, a.cooldown - 1) })) }) },
  { id: "shield", name: "מגן אלוהי",  emoji: "🌟", desc: "+25 מגן התחלתי",            apply: p => ({ ...p, shield: p.shield + 25 }) },
];

interface Player {
  hp: number; maxHp: number; attack: number; defense: number;
  level: number; xp: number; loot: string[];
  abilities: { name: string; emoji: string; type: "damage" | "heal" | "shield"; power: number; cooldown: number; currentCd: number }[];
  shield: number; combo: number; potions: number;
  weapon: Weapon;
  critBoost?: number; lifesteal?: number;
}

interface Enemy {
  name: string; emoji: string; hp: number; maxHp: number;
  attack: number; defense: number; reward: number; lootDrop?: string;
  special?: string; isBoss?: boolean;
}

const ENEMIES: (Omit<Enemy, "hp" | "maxHp"> & { baseHp: number })[] = [
  { name: "עכביש צללים", emoji: "🕷️", baseHp: 30, attack: 6, defense: 2, reward: 60, lootDrop: "🗡️ סכין עכביש" },
  { name: "שלד לוחם", emoji: "💀", baseHp: 45, attack: 9, defense: 4, reward: 100, lootDrop: "🛡️ מגן עצמות" },
  { name: "גובלין פראי", emoji: "👹", baseHp: 55, attack: 12, defense: 5, reward: 150 },
  { name: "זאב צללים", emoji: "🐺", baseHp: 70, attack: 15, defense: 7, reward: 200, lootDrop: "💎 יהלום כחול" },
  { name: "גולם אבן", emoji: "🪨", baseHp: 100, attack: 10, defense: 15, reward: 250, special: "הגנה גבוהה" },
  { name: "אביר שחור", emoji: "⚔️", baseHp: 90, attack: 20, defense: 10, reward: 350, lootDrop: "⚔️ חרב שחורה", special: "מכה כפולה" },
  { name: "מכשפה אפלה", emoji: "🧙‍♀️", baseHp: 80, attack: 25, defense: 6, reward: 400, special: "ריפוי עצמי" },
  { name: "דרקון אש", emoji: "🐉", baseHp: 150, attack: 28, defense: 15, reward: 600, lootDrop: "👑 כתר הדרקון", special: "נשיפת אש", isBoss: true },
  { name: "שדון הלילה", emoji: "😈", baseHp: 130, attack: 32, defense: 12, reward: 800, lootDrop: "🔮 כדור קסם", special: "גניבת חיים" },
  { name: "בוס האפלה", emoji: "💀", baseHp: 240, attack: 38, defense: 22, reward: 1800, lootDrop: "⭐ כוכב הנצח", special: "זעם סופי", isBoss: true },
];

const ABILITY_SETS = [
  [
    { name: "ברק", emoji: "⚡", type: "damage" as const, power: 25, cooldown: 3, currentCd: 0 },
    { name: "ריפוי", emoji: "💚", type: "heal" as const, power: 35, cooldown: 4, currentCd: 0 },
    { name: "מגן", emoji: "🛡️", type: "shield" as const, power: 20, cooldown: 3, currentCd: 0 },
  ],
  [
    { name: "להבה", emoji: "🔥", type: "damage" as const, power: 35, cooldown: 4, currentCd: 0 },
    { name: "רוח", emoji: "🌪️", type: "damage" as const, power: 20, cooldown: 2, currentCd: 0 },
    { name: "שיקוי", emoji: "🧪", type: "heal" as const, power: 25, cooldown: 3, currentCd: 0 },
  ],
  [
    { name: "קפאון", emoji: "❄️", type: "shield" as const, power: 30, cooldown: 3, currentCd: 0 },
    { name: "מכת מוות", emoji: "💀", type: "damage" as const, power: 45, cooldown: 5, currentCd: 0 },
    { name: "תפילה", emoji: "✨", type: "heal" as const, power: 40, cooldown: 5, currentCd: 0 },
  ],
];

const STORAGE_KEY = "vip-survival-v3";

interface SurvivalState {
  totalPoints: number; highestLevel: number; totalWins: number;
  lootCollection: string[]; globalLevel: number; globalXp: number;
  globalXpToNext: number; badges: string[]; bestCombo: number;
  unlockedWeapons: string[];
}

interface FloatingDmg { id: number; value: string; kind: "normal" | "crit" | "heal" | "shield"; side: "player" | "enemy"; }

export const VIPSurvival = () => {
  const [savedState, setSavedState] = useState<SurvivalState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        return {
          totalPoints: p.totalPoints || 0, highestLevel: p.highestLevel || 0, totalWins: p.totalWins || 0,
          lootCollection: p.lootCollection || [], globalLevel: p.globalLevel || 1, globalXp: p.globalXp || 0,
          globalXpToNext: p.globalXpToNext || 400, badges: p.badges || [], bestCombo: p.bestCombo || 0,
          unlockedWeapons: p.unlockedWeapons || ["sword"],
        };
      } catch { /* */ }
    }
    return { totalPoints: 0, highestLevel: 0, totalWins: 0, lootCollection: [], globalLevel: 1, globalXp: 0, globalXpToNext: 400, badges: [], bestCombo: 0, unlockedWeapons: ["sword"] };
  });
  const [player, setPlayer] = useState<Player | null>(null);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [phase, setPhase] = useState<"menu" | "weaponSelect" | "battle" | "perkChoice" | "reward" | "dead">("menu");
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [floatingDmgs, setFloatingDmgs] = useState<FloatingDmg[]>([]);
  const [shake, setShake] = useState<"" | "fx-shake" | "fx-shake-strong">("");
  const [enemyShake, setEnemyShake] = useState(false);
  const [enemyHitFlash, setEnemyHitFlash] = useState(false);
  const [playerHitFlash, setPlayerHitFlash] = useState(false);
  const [defeatBurst, setDefeatBurst] = useState(false);
  const [perkChoices, setPerkChoices] = useState<Perk[]>([]);
  const dmgIdRef = useRef(0);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState)); }, [savedState]);

  const addFloating = (value: string, kind: FloatingDmg["kind"], side: FloatingDmg["side"]) => {
    const id = ++dmgIdRef.current;
    setFloatingDmgs(prev => [...prev, { id, value, kind, side }]);
    setTimeout(() => setFloatingDmgs(prev => prev.filter(d => d.id !== id)), 900);
  };

  const triggerShake = (strong = false) => {
    setShake(strong ? "fx-shake-strong" : "fx-shake");
    setTimeout(() => setShake(""), strong ? 480 : 320);
  };

  const openWeaponSelect = () => {
    playPremiumSound("gameStart");
    setPhase("weaponSelect");
  };

  const startArena = (weapon: Weapon) => {
    playPremiumSound("gameStart");
    const abilitySet = ABILITY_SETS[Math.floor(Math.random() * ABILITY_SETS.length)];
    setPlayer({
      hp: 120, maxHp: 120,
      attack: 18 + weapon.attackBonus,
      defense: 10 + weapon.defenseBonus,
      level: 1, xp: 0, loot: [],
      abilities: abilitySet.map(a => ({ ...a })),
      shield: 0, combo: weapon.comboBonus, potions: 2,
      weapon, critBoost: weapon.critBonus, lifesteal: 0,
    });
    setEarnedPoints(0);
    setEnemyIndex(0);
    setBattleLog([`🎮 האליפות מתחילה! נשק: ${weapon.emoji} ${weapon.name}`]);
    spawnEnemy(0);
    setPhase("battle");
    setTurn("player");
  };

  const spawnEnemy = (idx: number) => {
    const i = Math.min(idx, ENEMIES.length - 1);
    const template = ENEMIES[i];
    const scale = 1 + idx * 0.15;
    const hp = Math.floor(template.baseHp * scale);
    setEnemy({
      ...template, hp, maxHp: hp,
      attack: Math.floor(template.attack * scale),
      defense: Math.floor(template.defense * scale),
      reward: Math.floor(template.reward * scale),
    });
    setBattleLog(prev => [...prev, `${template.emoji} ${template.name} מופיע!${template.isBoss ? " 👑 בוס!" : ""}${template.special ? ` (${template.special})` : ""}`]);
    if (template.isBoss) { playPremiumSound("specialSuccess"); triggerShake(true); }
  };

  const enemyTurn = useCallback(() => {
    if (!player || !enemy) return;
    setTimeout(() => {
      setPlayer(prev => {
        if (!prev) return prev;
        let eDamage = Math.max(1, enemy.attack - prev.defense + Math.floor(Math.random() * 8) - 3);
        if (enemy.special === "מכה כפולה" && Math.random() < 0.3) {
          eDamage *= 2;
          setBattleLog(p => [...p, `${enemy.emoji} מכה כפולה! ${eDamage} נזק!`]);
        } else if (enemy.special === "נשיפת אש" && Math.random() < 0.25) {
          eDamage = Math.floor(eDamage * 1.5);
          setBattleLog(p => [...p, `${enemy.emoji} 🔥 נשיפת אש! ${eDamage} נזק!`]);
        } else if (enemy.special === "גניבת חיים" && Math.random() < 0.3) {
          setEnemy(e => e ? { ...e, hp: Math.min(e.maxHp, e.hp + Math.floor(eDamage * 0.5)) } : e);
          setBattleLog(p => [...p, `${enemy.emoji} גונב חיים! ${eDamage} נזק`]);
        } else if (enemy.special === "ריפוי עצמי" && Math.random() < 0.25) {
          setEnemy(e => e ? { ...e, hp: Math.min(e.maxHp, e.hp + 20) } : e);
          setBattleLog(p => [...p, `${enemy.emoji} ✨ ריפוי עצמי +20`]);
        } else {
          setBattleLog(p => [...p, `${enemy.emoji} תקיפה! ${eDamage} נזק`]);
        }
        let actualDamage = eDamage;
        let newShield = prev.shield;
        if (newShield > 0) {
          const absorbed = Math.min(newShield, eDamage);
          actualDamage -= absorbed;
          newShield -= absorbed;
          if (absorbed > 0) {
            setBattleLog(p => [...p, `🛡️ מגן ספג ${absorbed} נזק!`]);
            addFloating(`-${absorbed}`, "shield", "player");
          }
        }
        if (actualDamage > 0) {
          addFloating(`-${actualDamage}`, "normal", "player");
          setPlayerHitFlash(true);
          setTimeout(() => setPlayerHitFlash(false), 360);
          triggerShake();
          playSound("error");
        }
        const newHp = Math.max(0, prev.hp - actualDamage);
        if (newHp <= 0) { setPhase("dead"); playPremiumSound("specialSuccess"); }
        setTurn("player");
        const updatedAbilities = prev.abilities.map(a => ({ ...a, currentCd: Math.max(0, a.currentCd - 1) }));
        return { ...prev, hp: newHp, shield: newShield, abilities: updatedAbilities, combo: 0 };
      });
    }, 700);
  }, [enemy, player]);

  const offerPerkChoice = () => {
    const choices: Perk[] = [];
    const pool = [...PERKS];
    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(idx, 1)[0]);
    }
    setPerkChoices(choices);
    setPhase("perkChoice");
    playPremiumSound("levelUp");
  };

  const handleEnemyDefeat = useCallback(() => {
    if (!enemy || !player) return;
    playPremiumSound("reward");
    setDefeatBurst(true);
    setTimeout(() => setDefeatBurst(false), 700);
    triggerShake(enemy.isBoss);
    const comboBonus = Math.floor(player.combo * 20);
    const reward = enemy.reward + comboBonus;
    setEarnedPoints(prev => prev + reward);
    updateQuestProgress("vipSurvival", `vipSurvival-${new Date().getFullYear() * 10000 + (new Date().getMonth()+1) * 100 + new Date().getDate()}-0`, 1);
    const loot = enemy.lootDrop;
    setBattleLog(prev => [...prev, `🎉 ${enemy.name} הובס! +${reward} נק'${loot ? ` | לוט: ${loot}` : ""}${comboBonus > 0 ? ` | בונוס קומבו: +${comboBonus}` : ""}`]);

    let leveledUp = false;
    setPlayer(prev => {
      if (!prev) return prev;
      const newXp = prev.xp + reward;
      const levelUp = newXp >= prev.level * 200;
      if (levelUp) leveledUp = true;
      return {
        ...prev, xp: levelUp ? 0 : newXp, level: levelUp ? prev.level + 1 : prev.level,
        hp: levelUp ? prev.maxHp + 25 : Math.min(prev.maxHp, prev.hp + 20),
        maxHp: levelUp ? prev.maxHp + 25 : prev.maxHp,
        loot: loot ? [...prev.loot, loot] : prev.loot,
        combo: 0,
      };
    });

    const nextIdx = enemyIndex + 1;
    if (nextIdx >= ENEMIES.length) {
      setTimeout(() => { setPhase("reward"); playPremiumSound("win"); }, 500);
    } else {
      setEnemyIndex(nextIdx);
      setTimeout(() => {
        if (leveledUp) offerPerkChoice();
        else spawnEnemy(nextIdx);
      }, 900);
    }
  }, [enemy, player, enemyIndex]);

  const choosePerk = (perk: Perk) => {
    playPremiumSound("sparkle");
    setPlayer(prev => prev ? perk.apply(prev) : prev);
    setBattleLog(prev => [...prev, `${perk.emoji} ${perk.name} נבחר! (${perk.desc})`]);
    setPhase("battle");
    spawnEnemy(enemyIndex);
  };

  const playerAttack = () => {
    if (!player || !enemy || turn !== "player") return;
    playSound("click");
    const critChance = Math.min(0.5, (player.combo * 0.05) + (player.critBoost || 0));
    const isCrit = Math.random() < critChance;
    const baseDamage = Math.max(1, player.attack - enemy.defense + Math.floor(Math.random() * 10) - 3);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    const newEnemyHp = Math.max(0, enemy.hp - damage);
    setEnemy(e => e ? { ...e, hp: newEnemyHp } : e);
    setEnemyShake(true); setEnemyHitFlash(true);
    setTimeout(() => { setEnemyShake(false); setEnemyHitFlash(false); }, 360);
    addFloating(isCrit ? `${damage}!` : `${damage}`, isCrit ? "crit" : "normal", "enemy");
    if (isCrit) { triggerShake(); playPremiumSound("sparkle"); }
    if (player.lifesteal && player.lifesteal > 0) {
      const heal = Math.floor(damage * player.lifesteal);
      if (heal > 0) {
        setPlayer(prev => prev ? { ...prev, hp: Math.min(prev.maxHp, prev.hp + heal) } : prev);
        addFloating(`+${heal}`, "heal", "player");
      }
    }
    setBattleLog(prev => [...prev, `⚔️ ${isCrit ? "קריטי! " : ""}${damage} נזק${player.combo > 0 ? ` | קומבו ×${player.combo + 1}` : ""}`]);
    setPlayer(prev => prev ? { ...prev, combo: prev.combo + 1 } : prev);
    if (newEnemyHp <= 0) { handleEnemyDefeat(); return; }
    setTurn("enemy");
    enemyTurn();
  };

  const useAbility = (abilityIdx: number) => {
    if (!player || !enemy || turn !== "player") return;
    const ability = player.abilities[abilityIdx];
    if (ability.currentCd > 0) return;
    playPremiumSound("specialSuccess");
    const staffBoost = player.weapon.id === "staff" ? 1.3 : 1;
    if (ability.type === "damage") {
      const damage = Math.floor((ability.power + player.attack * 0.3) * staffBoost);
      const newEnemyHp = Math.max(0, enemy.hp - damage);
      setEnemy(e => e ? { ...e, hp: newEnemyHp } : e);
      setEnemyShake(true); setEnemyHitFlash(true);
      setTimeout(() => { setEnemyShake(false); setEnemyHitFlash(false); }, 360);
      addFloating(`${damage}`, "crit", "enemy");
      triggerShake();
      setBattleLog(prev => [...prev, `${ability.emoji} ${ability.name}! ${damage} נזק!`]);
      setPlayer(prev => prev ? { ...prev, abilities: prev.abilities.map((a, i) => i === abilityIdx ? { ...a, currentCd: a.cooldown } : a) } : prev);
      if (newEnemyHp <= 0) { handleEnemyDefeat(); return; }
    } else if (ability.type === "heal") {
      const heal = Math.floor(ability.power * staffBoost);
      setPlayer(prev => prev ? { ...prev, hp: Math.min(prev.maxHp, prev.hp + heal), abilities: prev.abilities.map((a, i) => i === abilityIdx ? { ...a, currentCd: a.cooldown } : a) } : prev);
      addFloating(`+${heal}`, "heal", "player");
      setBattleLog(prev => [...prev, `${ability.emoji} ${ability.name}! +${heal} חיים`]);
    } else if (ability.type === "shield") {
      const sh = Math.floor(ability.power * staffBoost);
      setPlayer(prev => prev ? { ...prev, shield: prev.shield + sh, abilities: prev.abilities.map((a, i) => i === abilityIdx ? { ...a, currentCd: a.cooldown } : a) } : prev);
      addFloating(`+${sh}`, "shield", "player");
      setBattleLog(prev => [...prev, `${ability.emoji} ${ability.name}! +${sh} מגן`]);
    }
    setTurn("enemy");
    enemyTurn();
  };

  const usePotion = () => {
    if (!player || turn !== "player" || player.potions <= 0) return;
    playSound("correct");
    const heal = Math.floor(player.maxHp * 0.4);
    setPlayer(prev => prev ? { ...prev, hp: Math.min(prev.maxHp, prev.hp + heal), potions: prev.potions - 1 } : prev);
    addFloating(`+${heal}`, "heal", "player");
    setBattleLog(prev => [...prev, `🧪 שיקוי! +${heal} חיים`]);
    setTurn("enemy");
    enemyTurn();
  };

  const finishArena = () => {
    setSavedState(prev => {
      let next = {
        ...prev,
        totalPoints: prev.totalPoints + earnedPoints,
        highestLevel: Math.max(prev.highestLevel, player?.level || 0),
        totalWins: phase === "reward" ? prev.totalWins + 1 : prev.totalWins,
        lootCollection: [...new Set([...prev.lootCollection, ...(player?.loot || [])])],
        bestCombo: Math.max(prev.bestCombo, player?.combo || 0),
      };
      let xp = next.globalXp + earnedPoints / 3;
      let lvl = next.globalLevel;
      let xpn = next.globalXpToNext;
      const badges = [...next.badges];
      const unlocked = [...next.unlockedWeapons];
      while (xp >= xpn) { xp -= xpn; lvl++; xpn = Math.floor(xpn * 1.3); }
      if (lvl >= 3 && !badges.includes("warrior")) badges.push("warrior");
      if (lvl >= 5 && !badges.includes("champion")) badges.push("champion");
      if (next.totalWins >= 10 && !badges.includes("legend")) badges.push("legend");
      if (next.bestCombo >= 5 && !badges.includes("combo")) badges.push("combo");
      if (lvl >= 2 && !unlocked.includes("bow")) unlocked.push("bow");
      if (lvl >= 4 && !unlocked.includes("staff")) unlocked.push("staff");
      return { ...next, globalXp: Math.floor(xp), globalLevel: lvl, globalXpToNext: xpn, badges, unlockedWeapons: unlocked };
    });
    setPhase("menu");
  };

  // ========== MENU ==========
  if (phase === "menu") {
    return (
      <div className="space-y-4 max-w-lg mx-auto" dir="rtl">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-red-400">⚔️ אתגר ההישרדות VIP</h3>
          <p className="text-sm text-muted-foreground">רמה {savedState.globalLevel} | נקודות: {savedState.totalPoints} | ניצחונות: {savedState.totalWins} | שיא קומבו: {savedState.bestCombo}</p>
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
            {savedState.badges.includes("combo") && <Badge className="bg-cyan-500/20 text-cyan-400">🔥 קומבו</Badge>}
          </div>
        )}
        <DailyQuestPanel gameKey="vipSurvival" />
        {savedState.lootCollection.length > 0 && (
          <Card className="border-yellow-500/30">
            <CardContent className="py-3 text-center">
              <p className="text-sm font-medium mb-1">🎒 אוסף לוט ({savedState.lootCollection.length}):</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {savedState.lootCollection.map((l, i) => <Badge key={i} variant="outline">{l}</Badge>)}
              </div>
            </CardContent>
          </Card>
        )}
        <Button onClick={openWeaponSelect} className="w-full py-6 text-lg bg-gradient-to-r from-red-600 to-orange-600">⚔️ התחל אליפות!</Button>
        <Card>
          <CardContent className="py-4 text-sm space-y-2">
            <p className="font-bold">📋 חוקי הזירה:</p>
            <p>• בחר נשק לפני קרב — נפתחים בעלייה ברמה גלובלית</p>
            <p>• הלחם נגד 10 אויבים בקושי עולה (כולל 2 בוסים)</p>
            <p>• בכל עלייה ברמה — בחר perk מ-3 אפשרויות</p>
            <p>• קומבו רצוף מגדיל סיכוי לקריטי ×2 נזק</p>
            <p>• 2 שיקויים לכל אליפות (40% חיים)</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== WEAPON SELECT ==========
  if (phase === "weaponSelect") {
    return (
      <div className="max-w-lg mx-auto space-y-4" dir="rtl">
        <h3 className="text-xl font-bold text-center text-red-400">בחר נשק לקרב</h3>
        <div className="space-y-3">
          {WEAPONS.map((w, i) => {
            const unlocked = savedState.unlockedWeapons.includes(w.id);
            return (
              <button
                key={w.id}
                disabled={!unlocked}
                onClick={() => startArena(w)}
                className={`fx-perk w-full text-right p-4 rounded-xl border-2 transition-all ${unlocked ? "border-red-500/40 bg-gradient-to-br from-red-500/10 to-orange-500/5 hover:scale-[1.02] hover:border-red-400" : "border-muted bg-muted/20 opacity-50 cursor-not-allowed"}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{w.emoji}</div>
                  <div className="flex-1">
                    <div className="font-bold text-lg">{w.name} {!unlocked && "🔒"}</div>
                    <div className="text-sm text-muted-foreground">{w.desc}</div>
                    <div className="text-xs mt-1 text-orange-400">
                      +{w.attackBonus} התקפה • +{w.defenseBonus} הגנה • +{Math.floor(w.critBonus * 100)}% קריטי
                    </div>
                    {!unlocked && <div className="text-xs text-red-400 mt-1">נפתח ברמה גלובלית {w.id === "bow" ? 2 : 4}</div>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <Button variant="outline" onClick={() => setPhase("menu")} className="w-full">חזרה</Button>
      </div>
    );
  }

  // ========== PERK CHOICE ==========
  if (phase === "perkChoice") {
    return (
      <div className="max-w-lg mx-auto space-y-4" dir="rtl">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-yellow-400 fx-crit-pop">⭐ עלית לרמה {player?.level}!</h3>
          <p className="text-sm text-muted-foreground">בחר שדרוג להמשך הקרב</p>
        </div>
        <div className="space-y-3">
          {perkChoices.map((perk, i) => (
            <button
              key={perk.id}
              onClick={() => choosePerk(perk)}
              className="fx-perk w-full text-right p-4 rounded-xl border-2 border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 hover:scale-[1.02] hover:border-yellow-400 transition-all"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="text-4xl">{perk.emoji}</div>
                <div className="flex-1">
                  <div className="font-bold text-lg">{perk.name}</div>
                  <div className="text-sm text-muted-foreground">{perk.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ========== RESULT ==========
  if (phase === "reward" || phase === "dead") {
    return (
      <div className="max-w-lg mx-auto" dir="rtl">
        <Card className={`animate-scale-in ${phase === "reward" ? "border-yellow-500/30" : "border-red-500/30"}`}>
          <CardContent className="py-8 text-center space-y-4">
            <div className="text-6xl fx-crit-pop">{phase === "reward" ? "🏆" : "💀"}</div>
            <p className={`text-2xl font-bold ${phase === "reward" ? "text-yellow-400" : "text-red-400"}`}>
              {phase === "reward" ? "ניצחון גדול!" : "נפלת בקרב"}
            </p>
            <p className="text-lg">נקודות: <strong className="text-primary">{earnedPoints}</strong></p>
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

  // ========== BATTLE ==========
  return (
    <div className={`max-w-lg mx-auto space-y-3 ${shake}`} dir="rtl">
      <div className="flex gap-3">
        <Card className={`flex-1 border-green-500/30 relative overflow-hidden ${playerHitFlash ? "fx-hit-flash" : ""}`}>
          <CardContent className="py-2 text-center text-sm">
            <p className="font-bold">{player?.weapon.emoji} אתה (רמה {player?.level})</p>
            <Progress value={((player?.hp || 0) / (player?.maxHp || 100)) * 100} className="h-2 my-1" />
            <p className="text-xs">{player?.hp}/{player?.maxHp} ❤️ {player?.shield ? `| 🛡️${player.shield}` : ""}</p>
            {floatingDmgs.filter(d => d.side === "player").map(d => (
              <span key={d.id} className={`fx-dmg ${d.kind}`}>{d.value}</span>
            ))}
          </CardContent>
        </Card>
        <Card className={`flex-1 border-red-500/30 relative overflow-hidden ${enemyHitFlash ? "fx-hit-flash" : ""} ${enemyShake ? "fx-enemy-shake" : ""}`}>
          <CardContent className="py-2 text-center text-sm">
            <p className="font-bold">{enemy?.emoji} {enemy?.name}{enemy?.isBoss && " 👑"}</p>
            <Progress value={((enemy?.hp || 0) / (enemy?.maxHp || 100)) * 100} className="h-2 my-1" />
            <p className="text-xs">{enemy?.hp}/{enemy?.maxHp} ❤️</p>
            {enemy?.special && <p className="text-xs text-orange-400">{enemy.special}</p>}
            {floatingDmgs.filter(d => d.side === "enemy").map(d => (
              <span key={d.id} className={`fx-dmg ${d.kind}`}>{d.value}</span>
            ))}
            {defeatBurst && <span className="fx-burst" />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-3">
          <div className="h-24 overflow-y-auto space-y-1 text-sm">
            {battleLog.slice(-6).map((l, i) => (
              <p key={i} className="text-muted-foreground" style={{ animation: "fadeSlideIn 0.2s ease-out" }}>{l}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Button onClick={playerAttack} disabled={turn !== "player"} className="flex-1 py-3">
            ⚔️ תקוף {player && player.combo > 0 ? `(×${player.combo + 1})` : ""}
          </Button>
          <Button onClick={usePotion} disabled={turn !== "player" || !player?.potions} variant="outline" className="py-3">
            🧪 {player?.potions || 0}
          </Button>
        </div>
        <div className="flex gap-2">
          {player?.abilities.map((ability, i) => (
            <Button key={i} onClick={() => useAbility(i)} disabled={turn !== "player" || ability.currentCd > 0}
              variant="outline" className="flex-1 py-3 text-xs">
              {ability.emoji} {ability.name} {ability.currentCd > 0 ? `(${ability.currentCd})` : ""}
            </Button>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        אויב {enemyIndex + 1}/{ENEMIES.length} | נקודות: {earnedPoints} | {turn === "player" ? "תורך!" : "תור היריב..."}
      </div>
    </div>
  );
};
