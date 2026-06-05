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
  { id: "sword",  name: "חרב הברק",   emoji: "⚔️", desc: "מאוזנת — נזק גבוה, קומבו טוב",       attackBonus: 6, defenseBonus: 2, critBonus: 0.05, comboBonus: 0 },
  { id: "bow",    name: "קשת הצללים", emoji: "🏹", desc: "קריטיים תכופים, הגנה נמוכה",          attackBonus: 3, defenseBonus: 0, critBonus: 0.15, comboBonus: 1 },
  { id: "staff",  name: "מטה הקסם",   emoji: "🔮", desc: "כישרונות חזקים יותר, מגן עוצמתי",     attackBonus: 2, defenseBonus: 5, critBonus: 0.02, comboBonus: 0 },
];

interface Perk { id: string; name: string; emoji: string; desc: string; apply: (p: Player) => Player; }

const PERKS: Perk[] = [
  { id: "atk",     name: "כוח גולמי",    emoji: "💪", desc: "+6 התקפה",                     apply: p => ({ ...p, attack: p.attack + 6 }) },
  { id: "def",     name: "שריון פלדה",   emoji: "🛡️", desc: "+5 הגנה",                       apply: p => ({ ...p, defense: p.defense + 5 }) },
  { id: "hp",     name: "חיוניות",      emoji: "❤️", desc: "+30 חיים מקסימליים",            apply: p => ({ ...p, maxHp: p.maxHp + 30, hp: p.hp + 30 }) },
  { id: "regen",   name: "התחדשות",      emoji: "✨", desc: "ריפוי מלא + 1 שיקוי",          apply: p => ({ ...p, hp: p.maxHp, potions: p.potions + 1 }) },
  { id: "crit",    name: "עין הנמר",     emoji: "🎯", desc: "+10% סיכוי קריטי",              apply: p => ({ ...p, critBoost: (p.critBoost || 0) + 0.10 }) },
  { id: "vamp",    name: "ערפד",         emoji: "🩸", desc: "ספיגת חיים 25% מנזק",          apply: p => ({ ...p, lifesteal: (p.lifesteal || 0) + 0.25 }) },
  { id: "cdr",     name: "זריזות",       emoji: "⚡", desc: "כישרונות חוזרים מהר יותר",     apply: p => ({ ...p, abilities: p.abilities.map(a => ({ ...a, cooldown: Math.max(1, a.cooldown - 1) })) }) },
  { id: "shield",  name: "מגן אלוהי",    emoji: "🌟", desc: "+25 מגן התחלתי",                apply: p => ({ ...p, shield: p.shield + 25 }) },
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
  { name: "אביר שחור", emoji: "⚔️", baseHp: 90, attack: 20, defense: 10, reward: 350, lootDrop: "⚔️ חרב שחורה", special: "מכה כ