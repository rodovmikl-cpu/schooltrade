import { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { playSound } from "@/lib/sounds";

/* ============================================================
   ⚔️ זירת ההישרדות — Premium Vampire-Survivors-like
   Canvas-rendered, deep progression, no placeholders.
   ============================================================ */

type Vec = { x: number; y: number };

interface Enemy {
  id: number;
  pos: Vec;
  hp: number; maxHp: number;
  speed: number; dmg: number;
  radius: number;
  kind: "bat" | "skeleton" | "wolf" | "wraith" | "golem" | "boss";
  xpVal: number; goldVal: number;
  flash: number;
  knock: Vec;
  attackCd: number;
  color: string;
  emoji: string;
}

interface Projectile {
  id: number;
  pos: Vec;
  vel: Vec;
  life: number;
  dmg: number;
  radius: number;
  pierce: number;
  hit: Set<number>;
  kind: "magic" | "arrow" | "fire" | "ice" | "lightning" | "orb";
  color: string;
}

interface Particle {
  pos: Vec; vel: Vec; life: number; max: number;
  size: number; color: string; shrink: boolean;
}

interface XPGem { pos: Vec; value: number; pulse: number; }
interface Pickup { pos: Vec; kind: "heart" | "magnet" | "bomb"; pulse: number; }
interface FloatText { pos: Vec; text: string; life: number; color: string; vy: number; }

interface WeaponDef {
  id: string; name: string; emoji: string; desc: string;
  cooldown: number;       // ms between shots
  baseDmg: number;
  projSpeed: number;
  pierce: number;
  count: number;          // projectiles per shot
  kind: Projectile["kind"];
  area?: boolean;
}

interface OwnedWeapon { def: WeaponDef; level: number; lastShot: number; }

interface Upgrade {
  id: string; name: string; desc: string; emoji: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  apply: (s: GameState) => void;
  repeatable?: boolean;
  maxLevel?: number;
  curLevel?: number;
}

interface GameState {
  hp: number; maxHp: number;
  speed: number;
  pickupRadius: number;
  cdr: number;            // 0..0.6 cooldown reduction
  dmgMult: number;
  projSpeedMult: number;
  pierceBonus: number;
  countBonus: number;
  regen: number;          // hp/sec
  armor: number;          // flat reduction
  lifesteal: number;      // 0..1
  crit: number;           // chance
  critMult: number;
  xpMult: number;
  goldMult: number;
  magnet: boolean;
  weapons: OwnedWeapon[];
}

/* ---------- Weapon definitions ---------- */
const WEAPONS: WeaponDef[] = [
  { id: "wand",     name: "שרביט קסם",   emoji: "✨", desc: "פרויקטיל קסם מהיר",        cooldown: 700,  baseDmg: 14, projSpeed: 520, pierce: 0, count: 1, kind: "magic" },
  { id: "bow",      name: "קשת מהירה",   emoji: "🏹", desc: "חצים חודרים",                cooldown: 850,  baseDmg: 18, projSpeed: 620, pierce: 2, count: 1, kind: "arrow" },
  { id: "fire",     name: "כדור אש",     emoji: "🔥", desc: "פיצוץ אש בטווח",             cooldown: 1300, baseDmg: 30, projSpeed: 380, pierce: 0, count: 1, kind: "fire", area: true },
  { id: "ice",      name: "קסם קרח",     emoji: "❄️", desc: "מאט אויבים",                  cooldown: 1100, baseDmg: 12, projSpeed: 460, pierce: 3, count: 1, kind: "ice" },
  { id: "lightning",name: "ברק",         emoji: "⚡", desc: "ברק שמכה במטרה אקראית",     cooldown: 1500, baseDmg: 40, projSpeed: 999, pierce: 0, count: 1, kind: "lightning" },
  { id: "orb",      name: "כדור מסתובב", emoji: "🌀", desc: "כדור מקיף אותך",              cooldown: 0,    baseDmg: 22, projSpeed: 0,   pierce: 99, count: 2, kind: "orb" },
];

/* ---------- Upgrades pool ---------- */
const upgradePool = (state: GameState): Upgrade[] => {
  const pool: Upgrade[] = [];

  // Weapon adds / level-ups
  WEAPONS.forEach(w => {
    const owned = state.weapons.find(o => o.def.id === w.id);
    if (!owned && state.weapons.length < 6) {
      pool.push({
        id: `new_${w.id}`, name: `🆕 ${w.emoji} ${w.name}`, desc: w.desc,
        rarity: "rare", emoji: w.emoji,
        apply: s => s.weapons.push({ def: w, level: 1, lastShot: 0 }),
      });
    } else if (owned && owned.level < 8) {
      pool.push({
        id: `up_${w.id}`, name: `${w.emoji} ${w.name} +${owned.level + 1}`,
        desc: "+25% נזק, +1 פרויקטיל בכל 3 רמות",
        rarity: owned.level >= 5 ? "epic" : "common", emoji: w.emoji,
        apply: s => { const o = s.weapons.find(x => x.def.id === w.id)!; o.level += 1; },
      });
    }
  });

  // Stat upgrades
  const stats: Upgrade[] = [
    { id: "dmg",      name: "⚔️ נזק +15%",       desc: "כל הנשק חזק יותר",   rarity: "common", emoji: "⚔️", apply: s => { s.dmgMult *= 1.15; }, repeatable: true },
    { id: "spd",      name: "🏃 מהירות +12%",    desc: "תנועה מהירה יותר",   rarity: "common", emoji: "🏃", apply: s => { s.speed *= 1.12; }, repeatable: true },
    { id: "cdr",      name: "⏱️ קצב ירי +10%",   desc: "פחות זמן בין יריות", rarity: "common", emoji: "⏱️", apply: s => { s.cdr = Math.min(0.65, s.cdr + 0.1); }, repeatable: true },
    { id: "hp",       name: "❤️ חיים +25",       desc: "מקסימום ועוד 25 חיים", rarity: "common", emoji: "❤️", apply: s => { s.maxHp += 25; s.hp = Math.min(s.maxHp, s.hp + 25); }, repeatable: true },
    { id: "regen",    name: "💚 התחדשות +1/ש׳", desc: "מתחדש לאורך זמן",    rarity: "rare",   emoji: "💚", apply: s => { s.regen += 1; }, repeatable: true },
    { id: "armor",    name: "🛡️ שריון +2",       desc: "פחות נזק נכנס",      rarity: "rare",   emoji: "🛡️", apply: s => { s.armor += 2; }, repeatable: true },
    { id: "pickup",   name: "🧲 רדיוס איסוף +30%", desc: "אוסף ג׳מים מרחוק", rarity: "common", emoji: "🧲", apply: s => { s.pickupRadius *= 1.3; }, repeatable: true },
    { id: "xp",       name: "🌟 ניסיון +20%",    desc: "מקבל יותר XP",       rarity: "rare",   emoji: "🌟", apply: s => { s.xpMult *= 1.2; }, repeatable: true },
    { id: "gold",     name: "💰 זהב +25%",       desc: "יותר זהב מאויבים",  rarity: "rare",   emoji: "💰", apply: s => { s.goldMult *= 1.25; }, repeatable: true },
    { id: "crit",     name: "💥 קריטי +8%",      desc: "סיכוי לקריטי",        rarity: "epic",  emoji: "💥", apply: s => { s.crit = Math.min(0.7, s.crit + 0.08); }, repeatable: true },
    { id: "critmult", name: "💢 כוח קריטי +50%", desc: "קריטי חזק יותר",     rarity: "epic",  emoji: "💢", apply: s => { s.critMult += 0.5; }, repeatable: true },
    { id: "pierce",   name: "➡️ חדירה +1",        desc: "פרויקטילים עוברים אויבים", rarity: "epic", emoji: "➡️", apply: s => { s.pierceBonus += 1; }, repeatable: true },
    { id: "count",    name: "✳️ פרויקטילים +1", desc: "עוד יריה בכל ירי",   rarity: "epic",  emoji: "✳️", apply: s => { s.countBonus += 1; }, repeatable: true },
    { id: "leech",    name: "🩸 ערפדות +5%",     desc: "החזרת חיים מנזק",    rarity: "legendary", emoji: "🩸", apply: s => { s.lifesteal = Math.min(0.3, s.lifesteal + 0.05); }, repeatable: true },
  ];
  pool.push(...stats);
  return pool;
};

const pickThreeUpgrades = (state: GameState): Upgrade[] => {
  const pool = upgradePool(state);
  const out: Upgrade[] = [];
  const weights = { common: 50, rare: 28, epic: 16, legendary: 6 };
  for (let i = 0; i < 3 && pool.length; i++) {
    const total = pool.reduce((a, u) => a + weights[u.rarity], 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= weights[pool[j].rarity];
      if (r <= 0) { idx = j; break; }
    }
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
};

/* ---------- Enemy templates ---------- */
const enemyTemplate = (time: number, isBoss: boolean): Omit<Enemy, "id" | "pos" | "knock" | "flash" | "attackCd"> => {
  const scale = 1 + time / 90; // hp scales over time (in seconds)
  if (isBoss) {
    return {
      hp: 800 * scale, maxHp: 800 * scale, speed: 55, dmg: 18,
      radius: 36, kind: "boss", xpVal: 80, goldVal: 50,
      color: "#a855f7", emoji: "👹",
    };
  }
  const roll = Math.random();
  if (time > 240 && roll < 0.08) return { hp: 220 * scale, maxHp: 220 * scale, speed: 38, dmg: 12, radius: 26, kind: "golem", xpVal: 18, goldVal: 8, color: "#78716c", emoji: "🪨" };
  if (time > 120 && roll < 0.25) return { hp: 90 * scale, maxHp: 90 * scale, speed: 78, dmg: 7, radius: 16, kind: "wraith", xpVal: 9, goldVal: 4, color: "#06b6d4", emoji: "👻" };
  if (time > 60 && roll < 0.45) return { hp: 60 * scale, maxHp: 60 * scale, speed: 95, dmg: 6, radius: 17, kind: "wolf", xpVal: 6, goldVal: 3, color: "#a16207", emoji: "🐺" };
  if (roll < 0.7) return { hp: 35 * scale, maxHp: 35 * scale, speed: 65, dmg: 5, radius: 15, kind: "skeleton", xpVal: 4, goldVal: 2, color: "#e5e7eb", emoji: "💀" };
  return { hp: 18 * scale, maxHp: 18 * scale, speed: 110, dmg: 4, radius: 12, kind: "bat", xpVal: 3, goldVal: 1, color: "#7c3aed", emoji: "🦇" };
};

/* ---------- Persistent meta ---------- */
const META_KEY = "arena_survival_meta_v2";
type Meta = { gold: number; bestTime: number; bestKills: number; runs: number; perks: Record<string, number> };
const loadMeta = (): Meta => {
  try { const r = JSON.parse(localStorage.getItem(META_KEY) || ""); return { gold: 0, bestTime: 0, bestKills: 0, runs: 0, perks: {}, ...r }; }
  catch { return { gold: 0, bestTime: 0, bestKills: 0, runs: 0, perks: {} }; }
};
const saveMeta = (m: Meta) => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch {} };

const META_PERKS: { id: string; name: string; desc: string; emoji: string; cost: (lvl: number) => number; max: number; effect: string }[] = [
  { id: "hp",    name: "ליבה חיונית",    desc: "+15 HP מקסימלי",     emoji: "❤️", cost: l => 60 * (l + 1), max: 8, effect: "+15 HP" },
  { id: "dmg",   name: "אומנות קרב",     desc: "+8% נזק התחלתי",      emoji: "⚔️", cost: l => 80 * (l + 1), max: 8, effect: "+8% DMG" },
  { id: "spd",   name: "רגלי רוח",       desc: "+5% מהירות התחלתית",  emoji: "🏃", cost: l => 70 * (l + 1), max: 6, effect: "+5% SPD" },
  { id: "xp",    name: "מוח חד",         desc: "+10% XP",             emoji: "🌟", cost: l => 90 * (l + 1), max: 6, effect: "+10% XP" },
  { id: "gold",  name: "מציאת אוצרות",   desc: "+15% זהב",            emoji: "💰", cost: l => 90 * (l + 1), max: 6, effect: "+15% GOLD" },
  { id: "magnet",name: "מגנט מולד",      desc: "רדיוס איסוף +40%",   emoji: "🧲", cost: l => 100 * (l + 1), max: 4, effect: "+40% PICKUP" },
];

/* ============================================================ */
export const VIPSurvival = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [meta, setMeta] = useState<Meta>(() => loadMeta());
  const [screen, setScreen] = useState<"menu" | "shop" | "play" | "over">("menu");

  // HUD state
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, xp: 0, xpNext: 10, level: 1, time: 0, kills: 0, gold: 0 });
  const [paused, setPaused] = useState(false);
  const [choices, setChoices] = useState<Upgrade[] | null>(null);
  const [endStats, setEndStats] = useState<{ time: number; kills: number; gold: number; level: number } | null>(null);
  const [starterWeapon, setStarterWeapon] = useState<string>("wand");

  const stateRef = useRef<{
    state: GameState;
    enemies: Enemy[];
    projs: Projectile[];
    particles: Particle[];
    gems: XPGem[];
    pickups: Pickup[];
    floats: FloatText[];
    player: { pos: Vec; angle: number; flash: number; invuln: number };
    cam: Vec;
    keys: Set<string>;
    move: Vec;            // joystick or kb vector
    nextId: number;
    time: number;         // game seconds
    spawnAcc: number;
    bossTimer: number;
    xp: number; xpNext: number; level: number;
    kills: number; gold: number;
    shake: number;
    lastFrame: number;
    running: boolean;
    pendingLevels: number;
  } | null>(null);

  /* ---------- Setup canvas ---------- */
  const fitCanvas = useCallback(() => {
    const cvs = canvasRef.current; const wrap = containerRef.current;
    if (!cvs || !wrap) return;
    const w = wrap.clientWidth;
    const h = Math.min(640, Math.max(420, Math.floor(w * 0.62)));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = w * dpr; cvs.height = h * dpr;
    cvs.style.width = w + "px"; cvs.style.height = h + "px";
    const ctx = cvs.getContext("2d"); if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    fitCanvas();
    const ro = new ResizeObserver(fitCanvas);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [fitCanvas]);

  /* ---------- Input ---------- */
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      stateRef.current?.keys.add(e.key.toLowerCase());
      if (e.key === " " || e.key === "Escape") { e.preventDefault(); setPaused(p => !p); }
    };
    const up = (e: KeyboardEvent) => stateRef.current?.keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  /* ---------- Joystick (mobile) ---------- */
  const joyRef = useRef<{ active: boolean; cx: number; cy: number; dx: number; dy: number }>({ active: false, cx: 0, cy: 0, dx: 0, dy: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]; const r = (e.target as HTMLElement).getBoundingClientRect();
    joyRef.current = { active: true, cx: t.clientX - r.left, cy: t.clientY - r.top, dx: 0, dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!joyRef.current.active) return;
    const t = e.touches[0]; const r = (e.target as HTMLElement).getBoundingClientRect();
    let dx = (t.clientX - r.left) - joyRef.current.cx;
    let dy = (t.clientY - r.top) - joyRef.current.cy;
    const m = Math.hypot(dx, dy) || 1; const max = 50;
    if (m > max) { dx = dx * max / m; dy = dy * max / m; }
    joyRef.current.dx = dx / max; joyRef.current.dy = dy / max;
  };
  const onTouchEnd = () => { joyRef.current.active = false; joyRef.current.dx = 0; joyRef.current.dy = 0; };

  /* ---------- Start game ---------- */
  const startRun = useCallback(() => {
    playSound("enter");
    const base: GameState = {
      hp: 100, maxHp: 100, speed: 175, pickupRadius: 80, cdr: 0, dmgMult: 1,
      projSpeedMult: 1, pierceBonus: 0, countBonus: 0, regen: 0, armor: 0,
      lifesteal: 0, crit: 0.05, critMult: 2, xpMult: 1, goldMult: 1, magnet: false,
      weapons: [],
    };
    // Apply meta perks
    const p = meta.perks;
    base.maxHp += (p.hp || 0) * 15; base.hp = base.maxHp;
    base.dmgMult *= 1 + (p.dmg || 0) * 0.08;
    base.speed *= 1 + (p.spd || 0) * 0.05;
    base.xpMult *= 1 + (p.xp || 0) * 0.10;
    base.goldMult *= 1 + (p.gold || 0) * 0.15;
    base.pickupRadius *= 1 + (p.magnet || 0) * 0.40;

    const starter = WEAPONS.find(w => w.id === starterWeapon) || WEAPONS[0];
    base.weapons.push({ def: starter, level: 1, lastShot: 0 });

    stateRef.current = {
      state: base,
      enemies: [], projs: [], particles: [], gems: [], pickups: [], floats: [],
      player: { pos: { x: 0, y: 0 }, angle: 0, flash: 0, invuln: 0 },
      cam: { x: 0, y: 0 },
      keys: new Set(),
      move: { x: 0, y: 0 },
      nextId: 1, time: 0, spawnAcc: 0, bossTimer: 60,
      xp: 0, xpNext: 10, level: 1, kills: 0, gold: 0,
      shake: 0, lastFrame: performance.now(), running: true, pendingLevels: 0,
    };
    setHud({ hp: base.hp, maxHp: base.maxHp, xp: 0, xpNext: 10, level: 1, time: 0, kills: 0, gold: 0 });
    setPaused(false); setChoices(null); setEndStats(null);
    setScreen("play");
  }, [meta, starterWeapon]);

  /* ---------- Game loop ---------- */
  useEffect(() => {
    if (screen !== "play") return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      tick();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, paused, choices]);

  const tick = () => {
    const R = stateRef.current; const cvs = canvasRef.current; if (!R || !cvs) return;
    const ctx = cvs.getContext("2d"); if (!ctx) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - R.lastFrame) / 1000);
    R.lastFrame = now;

    const cssW = cvs.clientWidth, cssH = cvs.clientHeight;
    if (!paused && !choices && R.running) {
      update(dt, cssW, cssH);
    }
    render(ctx, cssW, cssH);

    // HUD sync (throttled enough by React batching)
    setHud(h => {
      const s = R.state;
      if (h.hp === s.hp && h.maxHp === s.maxHp && h.xp === R.xp && h.xpNext === R.xpNext && h.level === R.level && Math.floor(h.time) === Math.floor(R.time) && h.kills === R.kills && h.gold === R.gold) return h;
      return { hp: s.hp, maxHp: s.maxHp, xp: R.xp, xpNext: R.xpNext, level: R.level, time: R.time, kills: R.kills, gold: R.gold };
    });

    // Surface level-up choices
    if (R.pendingLevels > 0 && !choices) {
      const c = pickThreeUpgrades(R.state);
      if (c.length) { setChoices(c); playSound("success"); }
      R.pendingLevels -= 1;
    }
  };

  const update = (dt: number, cssW: number, cssH: number) => {
    const R = stateRef.current!; const S = R.state; const P = R.player;
    R.time += dt;

    /* --- input vector --- */
    let mx = 0, my = 0;
    if (R.keys.has("arrowup") || R.keys.has("w")) my -= 1;
    if (R.keys.has("arrowdown") || R.keys.has("s")) my += 1;
    if (R.keys.has("arrowleft") || R.keys.has("a")) mx -= 1;
    if (R.keys.has("arrowright") || R.keys.has("d")) mx += 1;
    if (joyRef.current.active) { mx = joyRef.current.dx; my = joyRef.current.dy; }
    const ml = Math.hypot(mx, my) || 1;
    if (ml > 1) { mx /= ml; my /= ml; }

    P.pos.x += mx * S.speed * dt;
    P.pos.y += my * S.speed * dt;
    if (mx || my) P.angle = Math.atan2(my, mx);

    /* --- camera smooth follow with shake --- */
    R.cam.x += (P.pos.x - R.cam.x) * Math.min(1, dt * 8);
    R.cam.y += (P.pos.y - R.cam.y) * Math.min(1, dt * 8);
    if (R.shake > 0) R.shake = Math.max(0, R.shake - dt * 30);

    /* --- regen --- */
    if (S.regen > 0) S.hp = Math.min(S.maxHp, S.hp + S.regen * dt);
    if (P.invuln > 0) P.invuln -= dt;
    if (P.flash > 0) P.flash -= dt;

    /* --- spawn enemies --- */
    R.spawnAcc += dt;
    const spawnRate = Math.max(0.12, 0.9 - R.time * 0.006);
    while (R.spawnAcc > spawnRate) {
      R.spawnAcc -= spawnRate;
      spawnEnemy(R, cssW, cssH, false);
    }
    R.bossTimer -= dt;
    if (R.bossTimer <= 0) {
      spawnEnemy(R, cssW, cssH, true);
      R.bossTimer = 60;
      R.floats.push({ pos: { x: P.pos.x, y: P.pos.y - 60 }, text: "⚠️ בוס מתקרב!", life: 2, color: "#ef4444", vy: -20 });
    }

    /* --- weapons firing --- */
    S.weapons.forEach(w => {
      if (w.def.kind === "orb") return; // handled below
      const cd = w.def.cooldown * (1 - S.cdr) * (1 - (w.level - 1) * 0.05);
      if (R.time * 1000 - w.lastShot >= cd) {
        w.lastShot = R.time * 1000;
        fireWeapon(R, w);
      }
    });

    /* --- orbiting orbs --- */
    const orbWeapon = S.weapons.find(w => w.def.kind === "orb");
    if (orbWeapon) {
      const total = orbWeapon.def.count + Math.floor((orbWeapon.level - 1) / 2) + S.countBonus;
      // ensure orbs exist
      const existingOrbs = R.projs.filter(p => p.kind === "orb");
      while (existingOrbs.length < total) {
        const idx = existingOrbs.length;
        R.projs.push({
          id: R.nextId++, pos: { ...P.pos }, vel: { x: 0, y: 0 },
          life: 9999, dmg: 0, radius: 18, pierce: 999, hit: new Set(),
          kind: "orb", color: "#fbbf24",
        });
        existingOrbs.push(R.projs[R.projs.length - 1]);
      }
      existingOrbs.forEach((o, i) => {
        const a = R.time * 3.5 + (i / total) * Math.PI * 2;
        const r = 90 + orbWeapon.level * 6;
        o.pos.x = P.pos.x + Math.cos(a) * r;
        o.pos.y = P.pos.y + Math.sin(a) * r;
        o.dmg = orbWeapon.def.baseDmg * (1 + (orbWeapon.level - 1) * 0.25) * S.dmgMult;
        // reset hits every 0.5s so they can hit again
        if (Math.floor(R.time * 2) !== Math.floor((R.time - dt) * 2)) o.hit.clear();
      });
    }

    /* --- update projectiles --- */
    for (let i = R.projs.length - 1; i >= 0; i--) {
      const p = R.projs[i];
      if (p.kind !== "orb") {
        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;
        p.life -= dt;
        if (p.life <= 0) { R.projs.splice(i, 1); continue; }
      }
      // collisions
      for (let j = R.enemies.length - 1; j >= 0; j--) {
        const e = R.enemies[j];
        if (p.hit.has(e.id)) continue;
        const dx = e.pos.x - p.pos.x, dy = e.pos.y - p.pos.y;
        if (dx * dx + dy * dy < (e.radius + p.radius) * (e.radius + p.radius)) {
          p.hit.add(e.id);
          const crit = Math.random() < S.crit;
          const dmg = p.dmg * (crit ? S.critMult : 1);
          e.hp -= dmg;
          e.flash = 0.12;
          // knockback
          const m = Math.hypot(dx, dy) || 1;
          e.knock.x += (dx / m) * 80;
          e.knock.y += (dy / m) * 80;
          // lifesteal
          if (S.lifesteal > 0) S.hp = Math.min(S.maxHp, S.hp + dmg * S.lifesteal);
          // float text
          R.floats.push({ pos: { x: e.pos.x, y: e.pos.y - e.radius }, text: crit ? `${Math.round(dmg)}!` : `${Math.round(dmg)}`, life: 0.7, color: crit ? "#fbbf24" : "#fff", vy: -40 });
          // hit particles
          for (let k = 0; k < (crit ? 10 : 5); k++) {
            R.particles.push({
              pos: { ...e.pos }, vel: { x: (Math.random() - 0.5) * 220, y: (Math.random() - 0.5) * 220 },
              life: 0.4, max: 0.4, size: 2 + Math.random() * 2, color: p.color, shrink: true,
            });
          }
          // area / fire splash
          if (p.kind === "fire") {
            for (let k = 0; k < 24; k++) {
              R.particles.push({
                pos: { ...e.pos }, vel: { x: (Math.random() - 0.5) * 380, y: (Math.random() - 0.5) * 380 },
                life: 0.6, max: 0.6, size: 4, color: "#fb923c", shrink: true,
              });
            }
            // AoE damage
            R.enemies.forEach(e2 => {
              if (e2.id === e.id) return;
              const ddx = e2.pos.x - e.pos.x, ddy = e2.pos.y - e.pos.y;
              if (ddx * ddx + ddy * ddy < 80 * 80) {
                e2.hp -= dmg * 0.6; e2.flash = 0.1;
              }
            });
            R.shake = Math.max(R.shake, 6);
          }
          if (p.kind === "ice") { e.speed = Math.max(20, e.speed * 0.5); }
          if (p.kind === "lightning") R.shake = Math.max(R.shake, 4);

          if (p.pierce <= 0 && p.kind !== "orb") { R.projs.splice(i, 1); break; }
          p.pierce -= 1;
        }
      }
    }

    /* --- update enemies --- */
    for (let i = R.enemies.length - 1; i >= 0; i--) {
      const e = R.enemies[i];
      const dx = P.pos.x - e.pos.x, dy = P.pos.y - e.pos.y;
      const m = Math.hypot(dx, dy) || 1;
      e.pos.x += (dx / m) * e.speed * dt + e.knock.x * dt;
      e.pos.y += (dy / m) * e.speed * dt + e.knock.y * dt;
      e.knock.x *= 0.85; e.knock.y *= 0.85;
      if (e.flash > 0) e.flash -= dt;
      e.attackCd -= dt;

      // collision with player
      if (m < e.radius + 14 && e.attackCd <= 0 && P.invuln <= 0) {
        const dmg = Math.max(1, e.dmg - S.armor);
        S.hp -= dmg;
        e.attackCd = 0.7;
        P.invuln = 0.5; P.flash = 0.25;
        R.shake = Math.max(R.shake, 10);
        R.floats.push({ pos: { x: P.pos.x, y: P.pos.y - 30 }, text: `-${dmg}`, life: 0.8, color: "#ef4444", vy: -40 });
        if (S.hp <= 0) endRun();
      }

      // death
      if (e.hp <= 0) {
        R.kills += 1;
        R.gold += Math.round(e.goldVal * S.goldMult);
        // gem
        R.gems.push({ pos: { ...e.pos }, value: Math.round(e.xpVal * S.xpMult), pulse: 0 });
        // chance pickups
        const drop = Math.random();
        if (drop < 0.04) R.pickups.push({ pos: { ...e.pos }, kind: "heart", pulse: 0 });
        else if (drop < 0.07) R.pickups.push({ pos: { ...e.pos }, kind: "magnet", pulse: 0 });
        else if (drop < 0.085) R.pickups.push({ pos: { ...e.pos }, kind: "bomb", pulse: 0 });
        // death burst
        for (let k = 0; k < (e.kind === "boss" ? 60 : 14); k++) {
          R.particles.push({
            pos: { ...e.pos }, vel: { x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400 },
            life: 0.7, max: 0.7, size: 2 + Math.random() * 3, color: e.color, shrink: true,
          });
        }
        if (e.kind === "boss") {
          R.shake = Math.max(R.shake, 18);
          R.floats.push({ pos: { ...e.pos }, text: "👑 בוס מובס!", life: 2, color: "#fbbf24", vy: -30 });
          // boss drops extras
          for (let k = 0; k < 5; k++) R.gems.push({ pos: { x: e.pos.x + (Math.random() - 0.5) * 40, y: e.pos.y + (Math.random() - 0.5) * 40 }, value: 20, pulse: 0 });
          R.pickups.push({ pos: { ...e.pos }, kind: "heart", pulse: 0 });
        }
        R.enemies.splice(i, 1);
      }
    }

    /* --- gems & pickups --- */
    for (let i = R.gems.length - 1; i >= 0; i--) {
      const g = R.gems[i];
      g.pulse += dt;
      const dx = P.pos.x - g.pos.x, dy = P.pos.y - g.pos.y;
      const d = Math.hypot(dx, dy);
      if (d < S.pickupRadius || S.magnet) {
        const pull = S.magnet ? 600 : 320;
        g.pos.x += (dx / (d || 1)) * pull * dt;
        g.pos.y += (dy / (d || 1)) * pull * dt;
      }
      if (d < 18) {
        R.xp += g.value;
        while (R.xp >= R.xpNext) {
          R.xp -= R.xpNext;
          R.level += 1;
          R.xpNext = Math.round(10 + R.level * 6 + R.level * R.level * 0.5);
          R.pendingLevels += 1;
        }
        R.gems.splice(i, 1);
      }
    }
    for (let i = R.pickups.length - 1; i >= 0; i--) {
      const p = R.pickups[i]; p.pulse += dt;
      const dx = P.pos.x - p.pos.x, dy = P.pos.y - p.pos.y;
      const d = Math.hypot(dx, dy);
      if (d < 22) {
        if (p.kind === "heart") { S.hp = Math.min(S.maxHp, S.hp + 30); R.floats.push({ pos: { ...p.pos }, text: "+30 HP", life: 1, color: "#22c55e", vy: -40 }); }
        if (p.kind === "magnet") { S.magnet = true; setTimeout(() => { if (stateRef.current) stateRef.current.state.magnet = false; }, 1000); }
        if (p.kind === "bomb") {
          R.shake = Math.max(R.shake, 20);
          R.enemies.forEach(e => { e.hp -= 80; e.flash = 0.2; });
          for (let k = 0; k < 80; k++) R.particles.push({ pos: { ...P.pos }, vel: { x: (Math.random() - 0.5) * 700, y: (Math.random() - 0.5) * 700 }, life: 0.8, max: 0.8, size: 4, color: "#fbbf24", shrink: true });
          R.floats.push({ pos: { ...p.pos }, text: "💣 פיצוץ!", life: 1, color: "#fbbf24", vy: -40 });
        }
        R.pickups.splice(i, 1);
      }
    }

    /* --- particles, floats --- */
    for (let i = R.particles.length - 1; i >= 0; i--) {
      const p = R.particles[i];
      p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt;
      p.vel.x *= 0.92; p.vel.y *= 0.92;
      p.life -= dt;
      if (p.life <= 0) R.particles.splice(i, 1);
    }
    for (let i = R.floats.length - 1; i >= 0; i--) {
      const f = R.floats[i];
      f.pos.y += f.vy * dt;
      f.vy *= 0.94;
      f.life -= dt;
      if (f.life <= 0) R.floats.splice(i, 1);
    }
  };

  const spawnEnemy = (R: NonNullable<typeof stateRef.current>, cssW: number, cssH: number, boss: boolean) => {
    const a = Math.random() * Math.PI * 2;
    const dist = Math.max(cssW, cssH) * 0.7;
    const pos: Vec = { x: R.player.pos.x + Math.cos(a) * dist, y: R.player.pos.y + Math.sin(a) * dist };
    const tpl = enemyTemplate(R.time, boss);
    R.enemies.push({
      id: R.nextId++, pos, knock: { x: 0, y: 0 }, flash: 0, attackCd: 0,
      ...tpl,
    });
  };

  const fireWeapon = (R: NonNullable<typeof stateRef.current>, w: OwnedWeapon) => {
    const S = R.state; const P = R.player;
    // target: nearest enemy
    let nearest: Enemy | null = null; let nd = Infinity;
    for (const e of R.enemies) {
      const d = (e.pos.x - P.pos.x) ** 2 + (e.pos.y - P.pos.y) ** 2;
      if (d < nd) { nd = d; nearest = e; }
    }
    if (!nearest) return;
    const baseAngle = Math.atan2(nearest.pos.y - P.pos.y, nearest.pos.x - P.pos.x);
    const lvl = w.level;
    const count = w.def.count + Math.floor((lvl - 1) / 3) + S.countBonus;
    const dmg = w.def.baseDmg * (1 + (lvl - 1) * 0.25) * S.dmgMult;
    const speed = w.def.projSpeed * S.projSpeedMult;
    const pierce = w.def.pierce + S.pierceBonus + Math.floor((lvl - 1) / 4);
    const colorMap: Record<Projectile["kind"], string> = {
      magic: "#a78bfa", arrow: "#fbbf24", fire: "#fb923c", ice: "#67e8f9", lightning: "#fde047", orb: "#fbbf24",
    };

    if (w.def.kind === "lightning") {
      // teleport bolt to nearest, plus 2 chain targets
      const targets: Enemy[] = [nearest];
      const pool = R.enemies.filter(e => e !== nearest);
      for (let i = 0; i < 2 && pool.length; i++) {
        const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        targets.push(t);
      }
      targets.forEach(t => {
        R.projs.push({
          id: R.nextId++, pos: { ...t.pos }, vel: { x: 0, y: 0 },
          life: 0.05, dmg, radius: 24, pierce: 1, hit: new Set(),
          kind: "lightning", color: colorMap.lightning,
        });
        for (let k = 0; k < 20; k++) R.particles.push({ pos: { ...t.pos }, vel: { x: (Math.random() - 0.5) * 500, y: (Math.random() - 0.5) * 500 }, life: 0.3, max: 0.3, size: 3, color: "#fde047", shrink: true });
      });
      return;
    }

    for (let i = 0; i < count; i++) {
      const spread = count > 1 ? (i / (count - 1) - 0.5) * 0.35 * count : 0;
      const a = baseAngle + spread;
      R.projs.push({
        id: R.nextId++, pos: { ...P.pos }, vel: { x: Math.cos(a) * speed, y: Math.sin(a) * speed },
        life: 2.2, dmg, radius: w.def.kind === "fire" ? 12 : 8, pierce, hit: new Set(),
        kind: w.def.kind, color: colorMap[w.def.kind],
      });
    }
  };

  const endRun = () => {
    const R = stateRef.current; if (!R) return;
    R.running = false;
    playSound("error");
    // update meta
    const m = { ...meta };
    m.gold += R.gold;
    m.bestTime = Math.max(m.bestTime, Math.floor(R.time));
    m.bestKills = Math.max(m.bestKills, R.kills);
    m.runs += 1;
    setMeta(m); saveMeta(m);
    setEndStats({ time: Math.floor(R.time), kills: R.kills, gold: R.gold, level: R.level });
    setTimeout(() => setScreen("over"), 600);
  };

  /* ---------- Renderer ---------- */
  const render = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const R = stateRef.current!; const P = R.player;
    // shake
    const sx = (Math.random() - 0.5) * R.shake;
    const sy = (Math.random() - 0.5) * R.shake;

    // background gradient
    const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h));
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // ground grid (parallax)
    ctx.save();
    ctx.translate(w / 2 + sx, h / 2 + sy);
    ctx.translate(-R.cam.x, -R.cam.y);
    const grid = 60;
    const ox = Math.floor((R.cam.x - w) / grid) * grid;
    const oy = Math.floor((R.cam.y - h) / grid) * grid;
    ctx.strokeStyle = "rgba(99,102,241,0.08)";
    ctx.lineWidth = 1;
    for (let x = ox; x < R.cam.x + w; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, R.cam.y - h); ctx.lineTo(x, R.cam.y + h); ctx.stroke();
    }
    for (let y = oy; y < R.cam.y + h; y += grid) {
      ctx.beginPath(); ctx.moveTo(R.cam.x - w, y); ctx.lineTo(R.cam.x + w, y); ctx.stroke();
    }

    // pickup radius ring
    ctx.beginPath();
    ctx.arc(P.pos.x, P.pos.y, R.state.pickupRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(167,139,250,0.15)";
    ctx.stroke();

    // gems
    R.gems.forEach(g => {
      const s = 6 + Math.sin(g.pulse * 6) * 1.5;
      ctx.fillStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(g.pos.x, g.pos.y, s, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });

    // pickups
    R.pickups.forEach(p => {
      const s = 14 + Math.sin(p.pulse * 5) * 2;
      ctx.font = `${s * 1.5}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(p.kind === "heart" ? "❤️" : p.kind === "magnet" ? "🧲" : "💣", p.pos.x, p.pos.y);
    });

    // enemies
    R.enemies.forEach(e => {
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath(); ctx.ellipse(e.pos.x, e.pos.y + e.radius * 0.7, e.radius * 0.8, e.radius * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      // body
      ctx.fillStyle = e.flash > 0 ? "#fff" : e.color;
      ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2); ctx.fill();
      // emoji
      ctx.font = `${e.radius * 1.5}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(e.emoji, e.pos.x, e.pos.y);
      // hp bar
      if (e.hp < e.maxHp) {
        const bw = e.radius * 2;
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(e.pos.x - bw / 2, e.pos.y - e.radius - 8, bw, 4);
        ctx.fillStyle = e.kind === "boss" ? "#a855f7" : "#ef4444"; ctx.fillRect(e.pos.x - bw / 2, e.pos.y - e.radius - 8, bw * (e.hp / e.maxHp), 4);
      }
    });

    // projectiles
    R.projs.forEach(p => {
      ctx.shadowColor = p.color; ctx.shadowBlur = 14;
      ctx.fillStyle = p.color;
      if (p.kind === "lightning") {
        ctx.strokeStyle = p.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2); ctx.stroke();
        // jagged line from sky
        ctx.beginPath();
        let lx = p.pos.x, ly = p.pos.y - 200;
        ctx.moveTo(lx, ly);
        for (let i = 0; i < 6; i++) { lx += (Math.random() - 0.5) * 20; ly += 35; ctx.lineTo(lx, ly); }
        ctx.stroke();
      } else if (p.kind === "fire") {
        ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === "orb") {
        ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    });

    // particles
    R.particles.forEach(p => {
      const t = p.life / p.max;
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      const s = p.shrink ? p.size * t : p.size;
      ctx.fillRect(p.pos.x - s / 2, p.pos.y - s / 2, s, s);
    });
    ctx.globalAlpha = 1;

    // player
    ctx.save();
    ctx.translate(P.pos.x, P.pos.y);
    ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 16;
    ctx.fillStyle = P.flash > 0 ? "#fff" : "#22d3ee";
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🛡️", 0, 0);
    // direction
    ctx.rotate(P.angle);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(10, -4); ctx.lineTo(10, 4); ctx.fill();
    ctx.restore();

    // floating texts
    R.floats.forEach(f => {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(f.text, f.pos.x, f.pos.y);
    });
    ctx.globalAlpha = 1;

    ctx.restore();

    // vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  };

  /* ---------- Upgrade pick ---------- */
  const pickUpgrade = (u: Upgrade) => {
    const R = stateRef.current; if (!R) return;
    u.apply(R.state);
    playSound("convert");
    setChoices(null);
  };

  /* ---------- Meta shop ---------- */
  const buyPerk = (id: string) => {
    const def = META_PERKS.find(p => p.id === id)!;
    const lvl = meta.perks[id] || 0;
    if (lvl >= def.max) return;
    const cost = def.cost(lvl);
    if (meta.gold < cost) { playSound("error"); return; }
    const m = { ...meta, gold: meta.gold - cost, perks: { ...meta.perks, [id]: lvl + 1 } };
    setMeta(m); saveMeta(m); playSound("success");
  };

  /* ============================================================ */
  /* UI                                                              */
  /* ============================================================ */

  const rarityColor = (r: Upgrade["rarity"]) =>
    r === "legendary" ? "from-amber-500/30 to-yellow-600/20 border-amber-400"
    : r === "epic" ? "from-fuchsia-500/30 to-purple-600/20 border-fuchsia-400"
    : r === "rare" ? "from-sky-500/30 to-blue-600/20 border-sky-400"
    : "from-slate-500/20 to-slate-700/10 border-slate-400";

  if (screen === "menu") {
    return (
      <div dir="rtl" className="space-y-4">
        <Card className="p-6 bg-gradient-to-br from-red-950 via-purple-950 to-slate-950 border-2 border-red-500/40 text-center">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-l from-red-400 via-amber-400 to-purple-400">⚔️ זירת ההישרדות</h1>
          <p className="text-muted-foreground mt-2">שרוד גלים אינסופיים, שדרג נשק, הבס בוסים והפוך לאגדה</p>
          <div className="grid grid-cols-3 gap-3 mt-5 text-sm">
            <div className="rounded-xl bg-black/40 p-3"><div className="opacity-70">🏆 שיא זמן</div><div className="text-xl font-bold">{Math.floor(meta.bestTime / 60)}:{(meta.bestTime % 60).toString().padStart(2, "0")}</div></div>
            <div className="rounded-xl bg-black/40 p-3"><div className="opacity-70">💀 שיא הריגות</div><div className="text-xl font-bold">{meta.bestKills}</div></div>
            <div className="rounded-xl bg-black/40 p-3"><div className="opacity-70">💰 זהב</div><div className="text-xl font-bold text-amber-400">{meta.gold}</div></div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="font-bold mb-2">🎯 בחר נשק התחלתי</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {WEAPONS.filter(w => ["wand", "bow", "fire", "ice", "orb"].includes(w.id)).map(w => (
              <button key={w.id} onClick={() => { playSound("click"); setStarterWeapon(w.id); }}
                className={`p-3 rounded-xl border-2 transition text-right ${starterWeapon === w.id ? "border-amber-400 bg-amber-500/10" : "border-border bg-card hover:border-primary/50"}`}>
                <div className="text-2xl">{w.emoji}</div>
                <div className="font-bold text-sm">{w.name}</div>
                <div className="text-xs text-muted-foreground">{w.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button onClick={startRun} size="lg" className="flex-1 bg-gradient-to-l from-red-600 to-amber-600 hover:opacity-90 text-white font-bold text-lg">⚔️ התחל קרב</Button>
          <Button onClick={() => { playSound("tab"); setScreen("shop"); }} size="lg" variant="outline" className="font-bold">🏪 חנות</Button>
        </div>
      </div>
    );
  }

  if (screen === "shop") {
    return (
      <div dir="rtl" className="space-y-4">
        <Card className="p-4 flex items-center justify-between bg-gradient-to-l from-amber-950 to-slate-950 border-amber-500/40">
          <div>
            <h2 className="text-2xl font-black">🏪 חנות שדרוגים קבועים</h2>
            <p className="text-sm text-muted-foreground">שדרוגים נשמרים בין ריצות</p>
          </div>
          <div className="text-2xl font-bold text-amber-400">💰 {meta.gold}</div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {META_PERKS.map(p => {
            const lvl = meta.perks[p.id] || 0;
            const maxed = lvl >= p.max;
            const cost = p.cost(lvl);
            const can = !maxed && meta.gold >= cost;
            return (
              <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="text-2xl">{p.emoji}</span><span className="font-bold">{p.name}</span></div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                  <div className="text-xs mt-1">רמה: <b>{lvl}/{p.max}</b> · אפקט: <b className="text-amber-400">{p.effect}</b></div>
                </div>
                <Button disabled={!can} onClick={() => buyPerk(p.id)} className={can ? "bg-amber-600 hover:bg-amber-700" : ""}>
                  {maxed ? "מקסימום" : `💰 ${cost}`}
                </Button>
              </Card>
            );
          })}
        </div>
        <Button onClick={() => { playSound("tab"); setScreen("menu"); }} variant="outline" className="w-full">← חזרה</Button>
      </div>
    );
  }

  if (screen === "over" && endStats) {
    return (
      <div dir="rtl" className="space-y-4">
        <Card className="p-6 bg-gradient-to-br from-red-950 to-slate-950 border-red-500/40 text-center">
          <div className="text-5xl mb-2">💀</div>
          <h2 className="text-3xl font-black text-red-400">הזירה ניצחה</h2>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl bg-black/40 p-3"><div className="opacity-70 text-sm">⏱️ זמן</div><div className="text-2xl font-bold">{Math.floor(endStats.time / 60)}:{(endStats.time % 60).toString().padStart(2, "0")}</div></div>
            <div className="rounded-xl bg-black/40 p-3"><div className="opacity-70 text-sm">💀 הריגות</div><div className="text-2xl font-bold">{endStats.kills}</div></div>
            <div className="rounded-xl bg-black/40 p-3"><div className="opacity-70 text-sm">📈 רמה</div><div className="text-2xl font-bold">{endStats.level}</div></div>
            <div className="rounded-xl bg-black/40 p-3"><div className="opacity-70 text-sm">💰 זהב הושג</div><div className="text-2xl font-bold text-amber-400">+{endStats.gold}</div></div>
          </div>
        </Card>
        <div className="flex gap-3">
          <Button onClick={startRun} size="lg" className="flex-1 bg-gradient-to-l from-red-600 to-amber-600 text-white font-bold">⚔️ ריצה נוספת</Button>
          <Button onClick={() => { playSound("tab"); setScreen("shop"); }} size="lg" variant="outline">🏪 חנות</Button>
          <Button onClick={() => { playSound("tab"); setScreen("menu"); }} size="lg" variant="outline">תפריט</Button>
        </div>
      </div>
    );
  }

  /* PLAY screen */
  const mm = Math.floor(hud.time / 60), ss = Math.floor(hud.time % 60);
  return (
    <div dir="rtl" className="space-y-3">
      {/* HUD top */}
      <Card className="p-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex-1">
            <div className="flex justify-between mb-1"><span>❤️ {Math.ceil(hud.hp)}/{hud.maxHp}</span><span className="opacity-60">רמה {hud.level}</span></div>
            <Progress value={(hud.hp / hud.maxHp) * 100} className="h-2" />
            <Progress value={(hud.xp / hud.xpNext) * 100} className="h-1 mt-1" />
          </div>
          <div className="text-center min-w-[68px]">
            <div className="text-xs opacity-70">⏱️ זמן</div>
            <div className="font-mono font-bold">{mm}:{ss.toString().padStart(2, "0")}</div>
          </div>
          <div className="text-center min-w-[60px]">
            <div className="text-xs opacity-70">💀</div>
            <div className="font-bold">{hud.kills}</div>
          </div>
          <div className="text-center min-w-[60px]">
            <div className="text-xs opacity-70">💰</div>
            <div className="font-bold text-amber-400">{hud.gold}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setPaused(p => !p)}>{paused ? "▶️" : "⏸️"}</Button>
        </div>
      </Card>

      {/* Canvas */}
      <div ref={containerRef} className="relative rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-black select-none">
        <canvas ref={canvasRef} className="block w-full" />
        {/* Touch joystick area */}
        <div
          className="absolute inset-0 sm:hidden"
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          style={{ touchAction: "none" }}
        />
        {/* Pause overlay */}
        {paused && !choices && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
            <div className="text-3xl font-black">⏸️ הקרב מושהה</div>
            <Button onClick={() => setPaused(false)} className="bg-amber-600">המשך</Button>
            <Button variant="outline" onClick={endRun}>סיים ריצה</Button>
          </div>
        )}
        {/* Level-up overlay */}
        {choices && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 backdrop-blur-md p-4">
            <div className="text-3xl font-black text-amber-400 animate-pulse">🌟 עלית רמה!</div>
            <div className="text-sm opacity-80">בחר שדרוג</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
              {choices.map((u, i) => (
                <button key={i} onClick={() => pickUpgrade(u)}
                  className={`p-4 rounded-2xl border-2 bg-gradient-to-br ${rarityColor(u.rarity)} text-right hover:scale-105 transition-transform`}>
                  <div className="text-3xl">{u.emoji}</div>
                  <div className="font-bold mt-1">{u.name}</div>
                  <div className="text-xs opacity-80 mt-1">{u.desc}</div>
                  <div className="text-[10px] mt-2 uppercase tracking-wider opacity-70">
                    {u.rarity === "legendary" ? "אגדי" : u.rarity === "epic" ? "אפי" : u.rarity === "rare" ? "נדיר" : "רגיל"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center">WASD / חיצים לתנועה · רווח להשהיה · במובייל גע במסך לג'ויסטיק</div>
    </div>
  );
};
