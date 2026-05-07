import { useEffect, useRef, useState, useCallback, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { RoundedBox, Sparkles, Stars, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Official three.js example model — animated rigged character with built-in
// animations: "Running", "Jump", "Idle", "Death", "Walking", "Dance", etc.
const ROBOT_URL = "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb";
useGLTF.preload(ROBOT_URL);
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitScore } from "@/components/games/Leaderboard";
import { setArcadeBest } from "@/lib/arcadePoints";
import { playSound } from "@/lib/sounds";

interface Props { userCode: string; userName: string; }

// === Game Constants ===
const LANES = [-2.2, 0, 2.2];
const PLAYER_Z = 4;          // player stays here, world moves toward camera
const SPAWN_Z = -90;
const DESPAWN_Z = 8;
const GRAVITY = -38;
const JUMP_V = 14;
const SLIDE_TIME = 0.55;
const LANE_LERP = 14;

type ObstacleKind = "barrier" | "train" | "lowbar";
interface Obstacle { id: number; lane: number; z: number; kind: ObstacleKind; }
interface Coin { id: number; lane: number; z: number; got: boolean; }

interface SharedState {
  lane: number;
  laneX: number;
  y: number;
  vy: number;
  sliding: number;
  speed: number;
  distance: number;
  coins: number;
  alive: boolean;
  paused: boolean;
  obstacles: Obstacle[];
  coinsArr: Coin[];
  spawnTimer: number;
  coinTimer: number;
  nextId: number;
  onCrash?: () => void;
  onCoin?: () => void;
}

// === Player Character (real animated GLTF: three.js RobotExpressive) ===
const Player = ({ state }: { state: React.MutableRefObject<SharedState> }) => {
  const group = useRef<THREE.Group>(null!);
  const gltf = useGLTF(ROBOT_URL) as any;

  // Clone scene so multiple mounts don't share transforms
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    s.traverse((o: any) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; }
    });
    return s;
  }, [gltf.scene]);

  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const actions = useMemo(() => {
    const map: Record<string, THREE.AnimationAction> = {};
    (gltf.animations as THREE.AnimationClip[]).forEach((clip) => {
      map[clip.name] = mixer.clipAction(clip);
    });
    return map;
  }, [gltf.animations, mixer]);

  const currentRef = useRef<string>("");
  const playAction = (name: string, opts: { loop?: boolean; fade?: number; timeScale?: number } = {}) => {
    const { loop = true, fade = 0.2, timeScale = 1 } = opts;
    const next = actions[name];
    if (!next || currentRef.current === name) return;
    const prev = actions[currentRef.current];
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    next.timeScale = timeScale;
    next.fadeIn(fade).play();
    if (prev && prev !== next) prev.fadeOut(fade);
    currentRef.current = name;
  };

  useEffect(() => {
    // Start running
    playAction("Running", { timeScale: 1.3 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useFrame((_, dt) => {
    const s = state.current;
    if (!group.current) return;
    mixer.update(dt);
    group.current.position.x = s.laneX;
    group.current.position.y = s.y;
    group.current.position.z = PLAYER_Z;

    // animation state machine
    if (!s.alive) {
      playAction("Death", { loop: false, fade: 0.15 });
    } else if (s.y > 0.05 || s.vy > 0) {
      playAction("Jump", { loop: false, fade: 0.1, timeScale: 1.4 });
    } else if (s.sliding > 0) {
      // no built-in slide — squash + use Idle
      playAction("Idle", { fade: 0.05, timeScale: 2 });
    } else {
      playAction("Running", { fade: 0.15, timeScale: Math.min(2, 1 + s.speed / 30) });
    }

    // squash for slide
    const sliding = s.sliding > 0;
    const targetY = sliding ? 0.45 : 1;
    scene.scale.y += (targetY - scene.scale.y) * Math.min(1, dt * 14);
    scene.scale.x = scene.scale.z = 1;
    scene.position.y = sliding ? -0.25 : 0;

    // tilt during lane change
    const targetX = (s.lane === 0 ? -2.2 : s.lane === 1 ? 0 : 2.2);
    const dx = targetX - s.laneX;
    group.current.rotation.z = THREE.MathUtils.clamp(-dx * 0.12, -0.25, 0.25);
    group.current.rotation.y = Math.PI; // face the camera/forward
  });

  return (
    <group ref={group}>
      <primitive object={scene} scale={0.45} position={[0, 0, 0]} />
      {/* shadow disk */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <circleGeometry args={[0.7, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} />
      </mesh>
    </group>
  );
};

// === Track / Rails ===
const Track = ({ offset }: { offset: React.MutableRefObject<number> }) => {
  const ties = useRef<THREE.InstancedMesh>(null!);
  const tmp = new THREE.Object3D();
  const COUNT = 60;
  useFrame(() => {
    const o = offset.current;
    for (let i = 0; i < COUNT; i++) {
      const z = ((i * 2 + o) % (COUNT * 2)) - COUNT * 2 + 8;
      tmp.position.set(0, -0.98, z);
      tmp.rotation.set(0, 0, 0);
      tmp.updateMatrix();
      ties.current.setMatrixAt(i, tmp.matrix);
    }
    ties.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[200, 400]} />
        <meshStandardMaterial color="#3a3f4b" roughness={1} />
      </mesh>
      {/* track base */}
      <mesh position={[0, -0.99, -50]} receiveShadow>
        <boxGeometry args={[7.2, 0.02, 200]} />
        <meshStandardMaterial color="#5b4636" roughness={1} />
      </mesh>
      {/* lane dividers (rails) */}
      {[-1.1, 1.1].map((x, i) => (
        <mesh key={i} position={[x, -0.92, -50]} castShadow>
          <boxGeometry args={[0.12, 0.06, 200]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
      {/* outer rails */}
      {[-3.3, 3.3].map((x, i) => (
        <mesh key={i} position={[x, -0.92, -50]} castShadow>
          <boxGeometry args={[0.12, 0.06, 200]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
      {/* wooden ties (instanced) */}
      <instancedMesh ref={ties} args={[undefined, undefined, COUNT]}>
        <boxGeometry args={[6.6, 0.08, 0.6]} />
        <meshStandardMaterial color="#3b2a1a" roughness={1} />
      </instancedMesh>
    </group>
  );
};

// === Scenery (buildings, lamps) ===
const Scenery = ({ offset }: { offset: React.MutableRefObject<number> }) => {
  const left = useRef<THREE.Group>(null!);
  const right = useRef<THREE.Group>(null!);
  useFrame(() => {
    const o = offset.current;
    [left, right].forEach((g) => {
      g.current.children.forEach((c, i) => {
        const base = i * 14;
        let z = ((base + o) % 140) - 100;
        c.position.z = z;
      });
    });
  });
  const buildings = Array.from({ length: 10 });
  return (
    <>
      <group ref={left} position={[-7, 0, 0]}>
        {buildings.map((_, i) => (
          <group key={i}>
            <RoundedBox args={[3, 4 + (i % 3) * 1.5, 3]} radius={0.1} smoothness={2} position={[0, 1 + (i % 3) * 0.75, 0]} castShadow receiveShadow>
              <meshStandardMaterial color={i % 2 ? "#475569" : "#64748b"} roughness={0.85} />
            </RoundedBox>
            {/* windows */}
            {Array.from({ length: 6 }).map((__, w) => (
              <mesh key={w} position={[1.51, 0.6 + w * 0.55, 0]}>
                <planeGeometry args={[0.3, 0.3]} />
                <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={0.6} />
              </mesh>
            ))}
            {/* lamp */}
            <mesh position={[3.5, 1.5, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 3]} />
              <meshStandardMaterial color="#222" />
            </mesh>
            <pointLight position={[3.5, 3, 0]} intensity={0.6} distance={6} color="#fde68a" />
          </group>
        ))}
      </group>
      <group ref={right} position={[7, 0, 0]}>
        {buildings.map((_, i) => (
          <group key={i}>
            <RoundedBox args={[3, 4 + ((i + 1) % 3) * 1.5, 3]} radius={0.1} smoothness={2} position={[0, 1 + ((i + 1) % 3) * 0.75, 0]} castShadow receiveShadow>
              <meshStandardMaterial color={i % 2 ? "#52525b" : "#71717a"} roughness={0.85} />
            </RoundedBox>
            {Array.from({ length: 6 }).map((__, w) => (
              <mesh key={w} position={[-1.51, 0.6 + w * 0.55, 0]}>
                <planeGeometry args={[0.3, 0.3]} />
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
              </mesh>
            ))}
            <mesh position={[-3.5, 1.5, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 3]} />
              <meshStandardMaterial color="#222" />
            </mesh>
            <pointLight position={[-3.5, 3, 0]} intensity={0.6} distance={6} color="#fde68a" />
          </group>
        ))}
      </group>
    </>
  );
};

// === Obstacles & coins rendering ===
const ObstaclesAndCoins = ({ state }: { state: React.MutableRefObject<SharedState> }) => {
  const group = useRef<THREE.Group>(null!);
  const coinGroup = useRef<THREE.Group>(null!);
  const [, force] = useState(0);
  useFrame((_, dt) => {
    const s = state.current;
    if (s.paused || !s.alive) return;
    // spawn obstacles
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0) {
      s.spawnTimer = Math.max(0.55, 1.4 - s.distance / 800);
      const lane = Math.floor(Math.random() * 3);
      const r = Math.random();
      const kind: ObstacleKind = r < 0.3 ? "train" : r < 0.65 ? "barrier" : "lowbar";
      s.obstacles.push({ id: s.nextId++, lane, z: SPAWN_Z, kind });
    }
    // spawn coin trains
    s.coinTimer -= dt;
    if (s.coinTimer <= 0) {
      s.coinTimer = 1.0;
      const lane = Math.floor(Math.random() * 3);
      for (let i = 0; i < 5; i++) s.coinsArr.push({ id: s.nextId++, lane, z: SPAWN_Z - i * 2, got: false });
    }
    // move
    s.obstacles.forEach((o) => (o.z += s.speed * dt));
    s.coinsArr.forEach((c) => (c.z += s.speed * dt));
    s.obstacles = s.obstacles.filter((o) => o.z < DESPAWN_Z);
    s.coinsArr = s.coinsArr.filter((c) => c.z < DESPAWN_Z && !c.got);

    // collision
    const playerLane = Math.round((s.laneX + 2.2) / 2.2);
    for (const o of s.obstacles) {
      if (o.lane !== playerLane) continue;
      if (Math.abs(o.z - PLAYER_Z) < 1.0) {
        const isJumping = s.y > 0.6;
        const isSliding = s.sliding > 0;
        if (o.kind === "barrier" && (isJumping || isSliding)) continue;
        if (o.kind === "lowbar" && isSliding) continue;
        // train: any tall — only avoidable via lane change
        if (o.kind === "train") { /* always hit */ }
        if (o.kind === "lowbar" && isJumping) { /* hits head */ }
        s.alive = false;
        s.onCrash?.();
      }
    }
    for (const c of s.coinsArr) {
      if (c.got) continue;
      if (c.lane !== playerLane) continue;
      if (Math.abs(c.z - PLAYER_Z) < 0.9 && s.y < 1.6) {
        c.got = true; s.coins++; s.onCoin?.();
      }
    }
    // animate coins spin
    coinGroup.current?.children.forEach((m) => { (m as THREE.Mesh).rotation.y += dt * 6; });
    force((n) => (n + 1) % 1000000);
  });

  const s = state.current;
  return (
    <>
      <group ref={group}>
        {s.obstacles.map((o) => {
          const x = LANES[o.lane];
          if (o.kind === "train") {
            return (
              <group key={o.id} position={[x, 0, o.z]}>
                <RoundedBox args={[1.7, 2.4, 4.5]} radius={0.18} smoothness={3} position={[0, 0.2, 0]} castShadow>
                  <meshStandardMaterial color="#dc2626" metalness={0.4} roughness={0.4} />
                </RoundedBox>
                <RoundedBox args={[1.5, 0.5, 4.2]} radius={0.1} smoothness={2} position={[0, 0.85, 0]}>
                  <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={0.25} />
                </RoundedBox>
                <mesh position={[0, -0.5, 2.3]}>
                  <planeGeometry args={[1.4, 0.4]} />
                  <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.6} />
                </mesh>
              </group>
            );
          }
          if (o.kind === "barrier") {
            return (
              <group key={o.id} position={[x, -0.5, o.z]}>
                <RoundedBox args={[1.6, 0.9, 0.4]} radius={0.06} smoothness={2} castShadow>
                  <meshStandardMaterial color="#f97316" roughness={0.5} />
                </RoundedBox>
                {[-0.4, 0, 0.4].map((dx, i) => (
                  <mesh key={i} position={[dx, 0, 0.21]}>
                    <planeGeometry args={[0.3, 0.6]} />
                    <meshStandardMaterial color="#0f172a" />
                  </mesh>
                ))}
              </group>
            );
          }
          // lowbar — overhead barrier (slide under)
          return (
            <group key={o.id} position={[x, 1.2, o.z]}>
              <RoundedBox args={[1.8, 0.35, 0.5]} radius={0.06} smoothness={2} castShadow>
                <meshStandardMaterial color="#facc15" />
              </RoundedBox>
              {[-0.7, 0.7].map((dx, i) => (
                <mesh key={i} position={[dx, -1, 0]}>
                  <cylinderGeometry args={[0.07, 0.07, 2]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
              ))}
            </group>
          );
        })}
      </group>
      <group ref={coinGroup}>
        {s.coinsArr.map((c) => (
          <mesh key={c.id} position={[LANES[c.lane], 0.4, c.z]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.08, 24]} />
            <meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={0.7} metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </>
  );
};

// === Main game scene ===
const GameScene = ({ state, trackOffset, onTick }: {
  state: React.MutableRefObject<SharedState>;
  trackOffset: React.MutableRefObject<number>;
  onTick: () => void;
}) => {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 3.2, 9);
    camera.lookAt(0, 1, 0);
  }, [camera]);

  useFrame((_, dt) => {
    const s = state.current;
    if (s.paused || !s.alive) return;
    s.speed = Math.min(34, 14 + s.distance * 0.005);
    s.distance += s.speed * dt;
    trackOffset.current = (trackOffset.current + s.speed * dt) % (60 * 2);

    // lane lerp
    const targetX = LANES[s.lane];
    s.laneX += (targetX - s.laneX) * Math.min(1, dt * LANE_LERP);

    // jump physics
    if (s.y > 0 || s.vy !== 0) {
      s.vy += GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.y < 0) { s.y = 0; s.vy = 0; }
    }
    if (s.sliding > 0) s.sliding -= dt;

    // subtle camera bob
    camera.position.x += (s.laneX * 0.25 - camera.position.x) * Math.min(1, dt * 6);
    camera.position.y = 3.2 + Math.sin(performance.now() * 0.008) * 0.05;

    onTick();
  });

  return (
    <>
      <color attach="background" args={["#0b1220"]} />
      <fog attach="fog" args={["#0b1220", 25, 80]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#a5d8ff", "#1e293b", 0.6]} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <Stars radius={80} depth={30} count={1500} factor={3} fade speed={0.5} />
      <Track offset={trackOffset} />
      <Scenery offset={trackOffset} />
      <Player state={state} />
      <ObstaclesAndCoins state={state} />
      <Sparkles count={40} scale={[14, 6, 30]} position={[0, 3, -10]} size={2} speed={0.3} color="#fde68a" />
    </>
  );
};

export const RunnerGame = ({ userCode, userName }: Props) => {
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("arcade-best-runner") || "0") || 0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const state = useRef<SharedState>({
    lane: 1, laneX: 0, y: 0, vy: 0, sliding: 0,
    speed: 14, distance: 0, coins: 0, alive: true, paused: false,
    obstacles: [], coinsArr: [], spawnTimer: 1.2, coinTimer: 0.8, nextId: 1,
  });
  const trackOffset = useRef(0);

  const start = useCallback(() => {
    state.current = {
      lane: 1, laneX: 0, y: 0, vy: 0, sliding: 0,
      speed: 14, distance: 0, coins: 0, alive: true, paused: false,
      obstacles: [], coinsArr: [], spawnTimer: 1.2, coinTimer: 0.8, nextId: 1,
      onCrash: () => {
        const s = state.current;
        const finalScore = Math.floor(s.distance) + s.coins * 5;
        setScore(finalScore);
        setRunning(false); setGameOver(true);
        setArcadeBest("runner", finalScore);
        setBest((b) => Math.max(b, finalScore));
        if (finalScore > 0) submitScore("runner", userCode, userName, finalScore);
        playSound("error");
      },
      onCoin: () => playSound("correct"),
    };
    trackOffset.current = 0;
    setScore(0); setCoins(0); setGameOver(false); setPaused(false); setRunning(true);
  }, [userCode, userName]);

  const onTick = useCallback(() => {
    const s = state.current;
    setScore(Math.floor(s.distance) + s.coins * 5);
    setCoins(s.coins);
  }, []);

  const moveLane = useCallback((dir: -1 | 1) => {
    const s = state.current;
    if (!s.alive || s.paused) return;
    const nl = Math.max(0, Math.min(2, s.lane + dir));
    if (nl !== s.lane) { s.lane = nl; playSound("click"); }
  }, []);
  const jump = useCallback(() => {
    const s = state.current;
    if (!s.alive || s.paused) return;
    if (s.y <= 0.01 && s.sliding <= 0) { s.vy = JUMP_V; playSound("click"); }
  }, []);
  const slide = useCallback(() => {
    const s = state.current;
    if (!s.alive || s.paused) return;
    if (s.y <= 0.01 && s.sliding <= 0) { s.sliding = SLIDE_TIME; playSound("click"); }
  }, []);
  const togglePause = useCallback(() => {
    if (!running || gameOver) return;
    state.current.paused = !state.current.paused;
    setPaused(state.current.paused);
  }, [running, gameOver]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running) return;
      if (e.code === "ArrowLeft") { e.preventDefault(); moveLane(-1); }
      else if (e.code === "ArrowRight") { e.preventDefault(); moveLane(1); }
      else if (e.code === "ArrowUp" || e.code === "Space") { e.preventDefault(); jump(); }
      else if (e.code === "ArrowDown") { e.preventDefault(); slide(); }
      else if (e.code === "KeyP") togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moveLane, jump, slide, togglePause, running]);

  const touchRef = useRef({ x: 0, y: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const TH = 24;
    if (Math.abs(dx) < TH && Math.abs(dy) < TH) { jump(); return; }
    if (Math.abs(dx) > Math.abs(dy)) moveLane(dx > 0 ? 1 : -1);
    else if (dy < 0) jump(); else slide();
  };

  return (
    <Card className="p-4 flex flex-col items-center gap-3" dir="rtl">
      <div className="flex gap-4 text-sm w-full justify-between items-center flex-wrap">
        <span>ניקוד: <b>{score}</b></span>
        <span>🪙 <b>{coins}</b></span>
        <span>שיא: <b>{best}</b></span>
        {running && !gameOver && (
          <Button size="sm" variant="outline" onClick={togglePause}>
            {paused ? "▶️ המשך" : "⏸ השהה"}
          </Button>
        )}
      </div>
      <div
        className="relative w-full rounded-lg overflow-hidden border-2 border-primary/30 shadow-2xl select-none touch-none"
        style={{ aspectRatio: "16/10" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {running && (
          <Canvas shadows dpr={[1, 1.6]} camera={{ fov: 60, near: 0.1, far: 200 }}>
            <Suspense fallback={null}>
              <GameScene state={state} trackOffset={trackOffset} onTick={onTick} />
            </Suspense>
          </Canvas>
        )}
        {!running && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-800 via-slate-900 to-black">
            <div className="text-center space-y-3">
              <div className="text-3xl">🏃‍♂️ ריצה אינסופית</div>
              <Button onClick={start} size="lg" className="shadow-2xl">▶️ התחל ריצה</Button>
              <div className="text-xs text-muted-foreground">החלק לכיוונים • למעלה לקפיצה • למטה להחלקה</div>
            </div>
          </div>
        )}
        {paused && running && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 animate-fade-in">
            <div className="text-2xl font-bold text-white">⏸ הושהה</div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 animate-fade-in">
            <div className="bg-card p-5 rounded-2xl text-center shadow-2xl border-2 border-primary/40 min-w-[220px]">
              <div className="text-2xl mb-2">💥 התנגשת!</div>
              <div className="mb-1">ניקוד: <b>{score}</b></div>
              <div className="mb-1">🪙 מטבעות: <b>{coins}</b></div>
              <div className="text-xs text-muted-foreground mb-3">שיא: {best}</div>
              <Button onClick={start} className="w-full">🔁 נסה שוב</Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs sm:hidden">
        <Button variant="outline" onClick={() => moveLane(-1)}>◀ שמאל</Button>
        <div className="grid grid-rows-2 gap-1">
          <Button variant="outline" onClick={jump}>▲ קפיצה</Button>
          <Button variant="outline" onClick={slide}>▼ החלקה</Button>
        </div>
        <Button variant="outline" onClick={() => moveLane(1)}>ימין ▶</Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        החלק שמאל/ימין להחלפת מסלול • למעלה לקפיצה • למטה להחלקה • אסוף מטבעות והימנע מרכבות, מחסומים ומוטות
      </p>
    </Card>
  );
};
