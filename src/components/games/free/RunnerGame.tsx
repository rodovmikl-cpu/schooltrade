import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest, getArcadeBest } from "@/lib/arcadePoints";

/**
 * Subway Surfers-style endless runner built with React Three Fiber.
 * - Rigged humanoid character (Three.js RobotExpressive, MIT licensed)
 * - 3 lanes, jump, slide, infinite world with chunk recycling
 * - Detailed multi-mesh trains (body, windows, headlights, wheels)
 * - Coins in chains and arcs, particles on pickup
 * - Dynamic follow camera with tilt + FOV pulse
 * - Touch swipe + keyboard controls, Hebrew RTL UI
 */

interface Props { userCode: string; userName: string; }

const LANES = [-2.2, 0, 2.2] as const;
const ROBOT_URL = "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb";
useGLTF.preload(ROBOT_URL);

type State = {
  lane: number;            // 0,1,2
  targetX: number;
  y: number;
  vy: number;
  sliding: number;         // remaining slide time
  speed: number;
  distance: number;
  coins: number;
  score: number;
  dead: boolean;
  started: boolean;
  invuln: number;
  tilt: number;
};

const initState = (): State => ({
  lane: 1, targetX: 0, y: 0, vy: 0, sliding: 0,
  speed: 14, distance: 0, coins: 0, score: 0,
  dead: false, started: false, invuln: 0, tilt: 0,
});

// ---------- Character (rigged GLB w/ animations) ----------
function Character({ stateRef }: { stateRef: React.MutableRefObject<State> }) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(ROBOT_URL) as any;
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const actions = useMemo(() => {
    const m: Record<string, THREE.AnimationAction> = {};
    animations.forEach((c: THREE.AnimationClip) => { m[c.name] = mixer.clipAction(c); });
    return m;
  }, [animations, mixer]);
  const currentRef = useRef<string>("");

  useEffect(() => {
    cloned.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  }, [cloned]);

  const play = (name: string, opts: { loop?: boolean; fade?: number; speed?: number } = {}) => {
    const { loop = true, fade = 0.2, speed = 1 } = opts;
    const a = actions[name]; if (!a) return;
    if (currentRef.current === name) { a.timeScale = speed; return; }
    const prev = actions[currentRef.current];
    a.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    a.clampWhenFinished = !loop;
    a.timeScale = speed;
    a.fadeIn(fade).play();
    if (prev) prev.fadeOut(fade);
    currentRef.current = name;
  };

  useFrame((_, dt) => {
    const s = stateRef.current;
    mixer.update(dt);
    if (s.dead) play("Death", { loop: false, fade: 0.15 });
    else if (!s.started) play("Idle");
    else if (s.y > 0.05) play("Jump", { loop: false, fade: 0.1, speed: 1.2 });
    else if (s.sliding > 0) play("ThumbsUp", { loop: false, fade: 0.1 });
    else play("Running", { speed: Math.min(2.2, 1 + s.speed / 28) });

    const g = group.current; if (!g) return;
    // smooth lane
    g.position.x += (s.targetX - g.position.x) * Math.min(1, dt * 14);
    g.position.y = s.y;
    // tilt while switching lanes
    const tilt = (s.targetX - g.position.x) * 0.18;
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, tilt, 0.2);
    // slide squash
    const squash = s.sliding > 0 ? 0.55 : 1;
    g.scale.y += (squash - g.scale.y) * Math.min(1, dt * 14);
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      <primitive object={cloned} scale={0.32} rotation={[0, Math.PI, 0]} position={[0, 0, 0]} />
    </group>
  );
}

// ---------- Detailed train ----------
function Train({ position, color = "#cc2233" }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      {/* body */}
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[1.7, 2.1, 9]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.35} />
      </mesh>
      {/* roof rail */}
      <mesh position={[0, 2.18, 0]}>
        <boxGeometry args={[1.75, 0.06, 9.05]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* windows - left/right strips */}
      {[-0.86, 0.86].map((x, i) => (
        <mesh key={i} position={[x, 1.55, 0]}>
          <boxGeometry args={[0.04, 0.55, 8]} />
          <meshStandardMaterial color="#ffe27a" emissive="#ffd24a" emissiveIntensity={0.9} />
        </mesh>
      ))}
      {/* dark window panes between */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={"w"+i} position={[-0.86, 1.55, -3.6 + i * 1.05]}>
          <boxGeometry args={[0.03, 0.5, 0.7]} />
          <meshStandardMaterial color="#0c1622" />
        </mesh>
      ))}
      {/* headlights */}
      <mesh position={[0, 1.0, 4.55]}>
        <boxGeometry args={[1.4, 0.25, 0.1]} />
        <meshStandardMaterial color="#fff8dd" emissive="#fff2b0" emissiveIntensity={1.6} />
      </mesh>
      <pointLight position={[0, 1.2, 5.2]} color="#fff2b0" intensity={1.2} distance={14} />
      {/* tail */}
      <mesh position={[0, 1.0, -4.55]}>
        <boxGeometry args={[1.4, 0.18, 0.08]} />
        <meshStandardMaterial color="#ff3344" emissive="#ff2233" emissiveIntensity={1} />
      </mesh>
      {/* skirts */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[1.78, 0.3, 8.8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* wheels */}
      {[-3, -1, 1, 3].flatMap((z) => [-0.78, 0.78].map((x) => (
        <mesh key={`${x}_${z}`} position={[x, 0.25, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 0.18, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      )))}
    </group>
  );
}

function Barrier({ position }: { position: [number, number, number] }) {
  // low barrier you must slide under (placed at height to clip standing player)
  return (
    <group position={position}>
      <mesh castShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[1.9, 0.3, 0.4]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={0.4} />
      </mesh>
      {[-0.9, 0.9].map((x, i) => (
        <mesh key={i} position={[x, 0.75, 0]}>
          <boxGeometry args={[0.1, 1.5, 0.1]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
    </group>
  );
}

function Ramp({ position }: { position: [number, number, number] }) {
  return (
    <mesh castShadow position={position} rotation={[-Math.PI / 9, 0, 0]}>
      <boxGeometry args={[1.9, 0.2, 1.6]} />
      <meshStandardMaterial color="#fb923c" />
    </mesh>
  );
}

function Coin({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 5; });
  return (
    <mesh ref={ref} position={position} castShadow>
      <torusGeometry args={[0.28, 0.1, 12, 24]} />
      <meshStandardMaterial color="#ffd54a" emissive="#ffb000" emissiveIntensity={0.7} metalness={0.9} roughness={0.25} />
    </mesh>
  );
}

// ---------- World chunks ----------
type Obstacle =
  | { id: number; kind: "train"; lane: number; z: number; color: string; length: number }
  | { id: number; kind: "barrier"; lane: number; z: number }
  | { id: number; kind: "ramp"; lane: number; z: number };

type CoinT = { id: number; lane: number; z: number; y: number };

let _id = 1;
const nid = () => _id++;

function buildChunk(zStart: number): { obs: Obstacle[]; coins: CoinT[] } {
  const obs: Obstacle[] = [];
  const coins: CoinT[] = [];
  const colors = ["#cc2233", "#2266cc", "#229955", "#7733aa", "#dd7722"];
  // 5 obstacle slots per chunk (chunk ~ 60u)
  for (let i = 0; i < 5; i++) {
    const z = zStart - i * 12 - 8;
    const r = Math.random();
    if (r < 0.55) {
      // train (long, blocks one lane)
      const lane = Math.floor(Math.random() * 3);
      obs.push({ id: nid(), kind: "train", lane, z, color: colors[(Math.random() * colors.length) | 0], length: 9 });
      // coin arc above the train
      if (Math.random() < 0.55) {
        for (let k = -3; k <= 3; k++) {
          const arcY = 2.9 + Math.cos((k / 3) * (Math.PI / 2)) * 0.4;
          coins.push({ id: nid(), lane, z: z + k * 0.9, y: arcY });
        }
      }
    } else if (r < 0.8) {
      const lane = Math.floor(Math.random() * 3);
      obs.push({ id: nid(), kind: "barrier", lane, z });
    } else {
      const lane = Math.floor(Math.random() * 3);
      obs.push({ id: nid(), kind: "ramp", lane, z });
    }
    // coin chain in a random free lane
    const chainLane = Math.floor(Math.random() * 3);
    const conflict = obs.some(o => o.kind === "train" && o.lane === chainLane && Math.abs(o.z - z) < 6);
    if (!conflict) {
      for (let k = 0; k < 5; k++) coins.push({ id: nid(), lane: chainLane, z: z - 1.2 + k * 0.7, y: 0.7 });
    }
  }
  return { obs, coins };
}

// ---------- Ground / environment ----------
function GroundTile({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      {/* asphalt */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[8.5, 20]} />
        <meshStandardMaterial color="#2b2f3a" roughness={0.95} />
      </mesh>
      {/* rails */}
      {LANES.map((x, i) => (
        <group key={i} position={[x, 0.02, 0]}>
          <mesh><boxGeometry args={[0.08, 0.05, 20]} /><meshStandardMaterial color="#9aa3b0" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0.6, 0, 0]}><boxGeometry args={[0.08, 0.05, 20]} /><meshStandardMaterial color="#9aa3b0" metalness={0.6} roughness={0.4} /></mesh>
          {/* sleepers */}
          {Array.from({ length: 12 }).map((_, k) => (
            <mesh key={k} position={[0.3, -0.01, -9.2 + k * 1.7]}>
              <boxGeometry args={[1.2, 0.06, 0.4]} />
              <meshStandardMaterial color="#5a3a1f" />
            </mesh>
          ))}
        </group>
      ))}
      {/* side walls */}
      <mesh position={[-4.7, 0.7, 0]} castShadow><boxGeometry args={[0.4, 1.4, 20]} /><meshStandardMaterial color="#3a3f4a" /></mesh>
      <mesh position={[4.7, 0.7, 0]} castShadow><boxGeometry args={[0.4, 1.4, 20]} /><meshStandardMaterial color="#3a3f4a" /></mesh>
      {/* buildings */}
      {[-7, 7].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh castShadow position={[0, 4, 0]}>
            <boxGeometry args={[3, 8, 18]} />
            <meshStandardMaterial color={i ? "#3b4252" : "#434c5e"} />
          </mesh>
          {/* windows */}
          {Array.from({ length: 8 }).map((_, k) =>
            Array.from({ length: 3 }).map((__, r) => (
              <mesh key={`${k}-${r}`} position={[x > 0 ? -1.51 : 1.51, 1.5 + r * 2, -8 + k * 2.2]}>
                <boxGeometry args={[0.05, 0.8, 0.9]} />
                <meshStandardMaterial color="#ffe27a" emissive="#ffd24a" emissiveIntensity={Math.random() > 0.4 ? 0.8 : 0.05} />
              </mesh>
            ))
          )}
        </group>
      ))}
      {/* street lamps */}
      {[-10, 10].map(zo => (
        <group key={zo} position={[-4.5, 0, zo]}>
          <mesh position={[0, 2.4, 0]}><boxGeometry args={[0.1, 4.8, 0.1]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0.4, 4.7, 0]}><boxGeometry args={[0.9, 0.12, 0.12]} /><meshStandardMaterial color="#222" /></mesh>
          <pointLight position={[0.8, 4.6, 0]} color="#ffd28a" intensity={1.1} distance={10} />
        </group>
      ))}
    </group>
  );
}

// ---------- Main scene ----------
function Scene({ stateRef, onDie, onCoin }: { stateRef: React.MutableRefObject<State>; onDie: () => void; onCoin: () => void }) {
  const { camera } = useThree();
  const playerZ = 0;
  const [chunks, setChunks] = useState(() => {
    const arr: { z: number; obs: Obstacle[]; coins: CoinT[] }[] = [];
    for (let i = 0; i < 5; i++) {
      const z = -i * 60 - 20;
      const c = buildChunk(z);
      arr.push({ z, ...c });
    }
    return arr;
  });
  const worldRef = useRef<THREE.Group>(null!);
  const worldZ = useRef(0);
  const tilesRef = useRef<number[]>(Array.from({ length: 8 }, (_, i) => -i * 20));

  useFrame((_, dt) => {
    const s = stateRef.current;
    if (!s.started || s.dead) {
      camera.position.lerp(new THREE.Vector3(0, 3.2, 7), 0.08);
      camera.lookAt(0, 1.2, 0);
      return;
    }
    // physics
    if (s.y > 0 || s.vy > 0) {
      s.vy -= 26 * dt;
      s.y += s.vy * dt;
      if (s.y <= 0) { s.y = 0; s.vy = 0; }
    }
    if (s.sliding > 0) s.sliding = Math.max(0, s.sliding - dt);
    if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);

    // advance world
    s.speed = Math.min(34, s.speed + dt * 0.35);
    const move = s.speed * dt;
    worldZ.current += move;
    s.distance += move;
    s.score = Math.floor(s.distance) + s.coins * 5;

    // recycle ground tiles
    tilesRef.current = tilesRef.current.map(z => {
      const eff = z + worldZ.current;
      if (eff > 30) return z - 8 * 20;
      return z;
    });

    // recycle chunks
    setChunks(prev => prev.map(ch => {
      const eff = ch.z + worldZ.current;
      if (eff > 40) {
        const newZ = ch.z - 60 * prev.length;
        const c = buildChunk(newZ);
        return { z: newZ, ...c };
      }
      return ch;
    }));

    if (worldRef.current) worldRef.current.position.z = worldZ.current;

    // collisions
    for (const ch of chunks) {
      for (const o of ch.obs) {
        const ez = o.z + worldZ.current;
        if (Math.abs(ez - playerZ) > 5) continue;
        if (o.lane !== s.lane) continue;
        if (o.kind === "train") {
          if (ez > playerZ - o.length / 2 && ez < playerZ + o.length / 2) {
            // can run on top if jumped onto it
            if (s.y < 2.0 && s.invuln <= 0) { onDie(); s.dead = true; return; }
          }
        } else if (o.kind === "barrier") {
          if (Math.abs(ez - playerZ) < 0.6 && s.sliding <= 0 && s.y < 1.2 && s.invuln <= 0) { onDie(); s.dead = true; return; }
        } else if (o.kind === "ramp") {
          if (Math.abs(ez - playerZ) < 0.9 && s.y < 0.4) {
            s.vy = 9; // launch
            s.invuln = 0.2;
          }
        }
      }
      // coin pickup
      ch.coins = ch.coins.filter(c => {
        const cz = c.z + worldZ.current;
        if (Math.abs(cz - playerZ) < 0.7 && c.lane === s.lane && Math.abs(c.y - (s.y + 0.7)) < 0.9) {
          s.coins += 1; onCoin(); return false;
        }
        return cz < 6; // remove passed
      });
    }

    // camera follow + tilt
    const targetX = (s.targetX) * 0.35;
    const desired = new THREE.Vector3(targetX, 3.4 + (s.y * 0.15), 7);
    camera.position.lerp(desired, Math.min(1, dt * 6));
    camera.lookAt(targetX * 0.3, 1.2 + s.y * 0.4, -2);
    (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, 60 + (s.speed - 14) * 0.6, 0.05);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  });

  return (
    <>
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#aac8ff", "#221a14", 0.5]} />
      <directionalLight position={[8, 14, 6]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]}>
        <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.5, 50]} />
      </directionalLight>
      <fog attach="fog" args={["#0a0f1a", 22, 70]} />

      <Character stateRef={stateRef} />

      <group ref={worldRef}>
        {tilesRef.current.map((z, i) => <GroundTile key={i} z={z} />)}
        {chunks.flatMap(ch => [
          ...ch.obs.map(o => {
            const pos: [number, number, number] = [LANES[o.lane], 0, o.z];
            if (o.kind === "train") return <Train key={o.id} position={pos} color={o.color} />;
            if (o.kind === "barrier") return <Barrier key={o.id} position={pos} />;
            return <Ramp key={o.id} position={pos} />;
          }),
          ...ch.coins.map(c => <Coin key={c.id} position={[LANES[c.lane], c.y, c.z]} />),
        ])}
      </group>
    </>
  );
}

// ---------- Audio (WebAudio, no external assets) ----------
const useSfx = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const ctx = () => ctxRef.current ?? (ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)());
  const blip = (freq: number, dur = 0.08, type: OscillatorType = "square", gain = 0.06) => {
    try {
      const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = gain; g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
    } catch {}
  };
  return {
    coin: () => blip(1180, 0.08, "triangle", 0.07),
    jump: () => blip(420, 0.12, "sine", 0.08),
    slide: () => blip(220, 0.15, "sawtooth", 0.05),
    crash: () => { blip(140, 0.25, "square", 0.12); setTimeout(() => blip(90, 0.3, "sawtooth", 0.1), 80); },
  };
};

// ---------- Main component ----------
export const RunnerGame = ({ userCode, userName }: Props) => {
  const stateRef = useRef<State>(initState());
  const [, force] = useState(0);
  const tick = () => force(n => n + 1);
  const [best, setBest] = useState<number>(() => getArcadeBest("runner"));
  const sfx = useSfx();
  const submittedRef = useRef(false);

  const start = () => {
    stateRef.current = initState();
    stateRef.current.started = true;
    submittedRef.current = false;
    tick();
  };

  const onDie = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    sfx.crash();
    const final = stateRef.current.score;
    if (final > 0) {
      submitScore("runner", userCode, userName, final);
      setArcadeBest("runner", final);
      setBest(b => Math.max(b, final));
    }
    setTimeout(tick, 100);
  };

  const onCoin = () => { sfx.coin(); };

  // input
  useEffect(() => {
    const goLane = (d: -1 | 1) => {
      const s = stateRef.current; if (!s.started || s.dead) return;
      s.lane = Math.max(0, Math.min(2, s.lane + d));
      s.targetX = LANES[s.lane];
    };
    const jump = () => {
      const s = stateRef.current; if (!s.started || s.dead) return;
      if (s.y <= 0.01) { s.vy = 11; sfx.jump(); }
    };
    const slide = () => {
      const s = stateRef.current; if (!s.started || s.dead) return;
      if (s.sliding <= 0) { s.sliding = 0.7; sfx.slide(); if (s.y > 0) s.vy = -8; }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") goLane(-1);
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") goLane(1);
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") jump();
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") slide();
    };
    window.addEventListener("keydown", onKey);

    let sx = 0, sy = 0, st = 0;
    const ts = (e: TouchEvent) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); };
    const te = (e: TouchEvent) => {
      const t = e.changedTouches[0]; const dx = t.clientX - sx; const dy = t.clientY - sy;
      if (Date.now() - st > 600) return;
      if (Math.abs(dx) < 22 && Math.abs(dy) < 22) { jump(); return; }
      if (Math.abs(dx) > Math.abs(dy)) (dx > 0 ? goLane(1) : goLane(-1));
      else (dy > 0 ? slide() : jump());
    };
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchend", te, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", ts);
      window.removeEventListener("touchend", te);
    };
  }, [sfx]);

  // HUD refresh
  useEffect(() => {
    const id = setInterval(tick, 120);
    return () => clearInterval(id);
  }, []);

  const s = stateRef.current;

  return (
    <div dir="rtl" className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="px-3 py-1.5 rounded-full bg-card border border-border">ניקוד: <span className="font-bold text-primary">{s.score}</span></div>
        <div className="px-3 py-1.5 rounded-full bg-card border border-border">🪙 {s.coins}</div>
        <div className="px-3 py-1.5 rounded-full bg-card border border-border">שיא: <span className="font-bold text-accent">{best}</span></div>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border-2 border-primary/30 bg-black shadow-lg" style={{ aspectRatio: "4 / 3", maxHeight: "75vh" }}>
        <Canvas shadows camera={{ position: [0, 3.4, 7], fov: 62 }} dpr={[1, 1.6]} gl={{ antialias: true, powerPreference: "high-performance" }}>
          <color attach="background" args={["#0a0f1a"]} />
          <Suspense fallback={null}>
            <Scene stateRef={stateRef} onDie={onDie} onCoin={onCoin} />
          </Suspense>
        </Canvas>

        {/* Overlay */}
        {(!s.started || s.dead) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl max-w-sm">
              <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300 mb-2">
                {s.dead ? "המשחק נגמר" : "Subway Surfers"}
              </h3>
              {s.dead && (
                <div className="text-white/80 mb-3">
                  ניקוד: <span className="font-bold text-amber-300">{s.score}</span> · 🪙 {s.coins}
                </div>
              )}
              <button onClick={start} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold hover:scale-105 transition">
                {s.dead ? "שחק שוב" : "התחל משחק ▶"}
              </button>
              <p className="text-xs text-white/60 mt-3">חיצים / WASD · רווח לקפיצה · מטה להחלקה · החלקה במסך</p>
            </div>
          </div>
        )}

        {/* Touch controls */}
        <div className="absolute bottom-3 inset-x-3 flex justify-between pointer-events-none md:hidden">
          <div className="grid grid-cols-3 gap-2 pointer-events-auto">
            <button onTouchStart={() => { const s = stateRef.current; s.lane = Math.max(0, s.lane - 1); s.targetX = LANES[s.lane]; }} className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 text-white text-xl backdrop-blur">⬅</button>
            <button onTouchStart={() => { const s = stateRef.current; if (s.y <= 0.01) { s.vy = 11; sfx.jump(); } }} className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 text-white text-xl backdrop-blur">⬆</button>
            <button onTouchStart={() => { const s = stateRef.current; s.lane = Math.min(2, s.lane + 1); s.targetX = LANES[s.lane]; }} className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 text-white text-xl backdrop-blur">➡</button>
            <div />
            <button onTouchStart={() => { const s = stateRef.current; if (s.sliding <= 0) { s.sliding = 0.7; sfx.slide(); if (s.y > 0) s.vy = -8; } }} className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 text-white text-xl backdrop-blur">⬇</button>
            <div />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">מרוצה אינסופית · המהירות עולה עם הזמן · אסוף מטבעות והימנע מרכבות וגדרות</p>
    </div>
  );
};
