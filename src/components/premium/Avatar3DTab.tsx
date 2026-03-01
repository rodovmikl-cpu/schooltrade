import { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import * as THREE from "three";

// ── Configurable options ──
const SKIN_TONES = ["#FFDBB4", "#EDB98A", "#D08B5B", "#AE5D29", "#694D3D", "#3B2219"];
const EYE_COLORS = ["#4A90D9", "#2ECC71", "#8B4513", "#1A1A2E", "#9B59B6", "#2C3E50"];
const HAIR_COLORS = ["#1A1A2E", "#8B4513", "#DAA520", "#C0392B", "#E67E22", "#ECF0F1"];
const HAIR_STYLES = ["קצר", "ארוך", "מוהיקן", "קרח"];
const FACE_SHAPES = ["עגול", "אובלי", "מרובע", "משולש"];
const EYE_SHAPES = ["שקדי", "עגול", "גדול"];
const NOSE_TYPES = ["רגיל", "קטן", "רחב"];
const MOUTH_TYPES = ["חיוך", "רגיל", "רחב"];
const SHIRT_COLORS = ["#3498DB", "#E74C3C", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C", "#FFFFFF", "#2C3E50"];
const EFFECTS = ["ללא", "זוהר", "ניצוצות", "אורה"];

interface AvatarConfig {
  skinTone: string;
  eyeColor: string;
  hairColor: string;
  hairStyle: number;
  faceShape: number;
  eyeShape: number;
  noseType: number;
  mouthType: number;
  shirtColor: string;
  effect: number;
}

const defaultConfig: AvatarConfig = {
  skinTone: SKIN_TONES[0],
  eyeColor: EYE_COLORS[0],
  hairColor: HAIR_COLORS[0],
  hairStyle: 0,
  faceShape: 0,
  eyeShape: 0,
  noseType: 0,
  mouthType: 0,
  shirtColor: SHIRT_COLORS[0],
  effect: 0,
};

// ── 3D Avatar Model ──
function AvatarModel({ config }: { config: AvatarConfig }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    // Idle breathing
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
    // Subtle sway
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
  });

  const headScaleX = config.faceShape === 0 ? 1 : config.faceShape === 1 ? 0.9 : config.faceShape === 2 ? 1.05 : 0.95;
  const headScaleY = config.faceShape === 0 ? 1 : config.faceShape === 1 ? 1.15 : config.faceShape === 2 ? 0.95 : 1.05;
  const eyeScale = config.eyeShape === 2 ? 0.14 : 0.1;

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 1, 16]} />
        <meshStandardMaterial color={config.shirtColor} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.2, 12]} />
        <meshStandardMaterial color={config.skinTone} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.35, 0]} scale={[headScaleX, headScaleY, 1]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color={config.skinTone} />
      </mesh>

      {/* Eyes */}
      {[-0.13, 0.13].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.4, 0.35]}>
            <sphereGeometry args={[eyeScale, 16, 16]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[x, 0.4, 0.38]}>
            <sphereGeometry args={[eyeScale * 0.55, 12, 12]} />
            <meshStandardMaterial color={config.eyeColor} />
          </mesh>
          <mesh position={[x, 0.4, 0.4]}>
            <sphereGeometry args={[eyeScale * 0.25, 8, 8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      ))}

      {/* Nose */}
      <mesh position={[0, 0.3, 0.38]}>
        <sphereGeometry args={[config.noseType === 1 ? 0.04 : config.noseType === 2 ? 0.07 : 0.05, 12, 12]} />
        <meshStandardMaterial color={config.skinTone} />
      </mesh>

      {/* Mouth */}
      <mesh position={[0, 0.18, 0.36]} rotation={[0.2, 0, 0]}>
        <torusGeometry args={[config.mouthType === 2 ? 0.1 : 0.07, 0.02, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#C0392B" />
      </mesh>

      {/* Hair */}
      {config.hairStyle !== 3 && (
        <mesh position={[0, config.hairStyle === 1 ? 0.6 : 0.65, config.hairStyle === 2 ? 0.05 : -0.05]}>
          <sphereGeometry args={[
            config.hairStyle === 0 ? 0.42 : config.hairStyle === 1 ? 0.44 : 0.2,
            24, 24,
            0, Math.PI * 2,
            0, config.hairStyle === 2 ? Math.PI * 0.4 : Math.PI * 0.55
          ]} />
          <meshStandardMaterial color={config.hairColor} />
        </mesh>
      )}

      {/* Effect: glow */}
      {config.effect === 1 && (
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial color="#FFD700" transparent opacity={0.12} />
        </mesh>
      )}

      {/* Effect: aura */}
      {config.effect === 3 && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#9B59B6" transparent opacity={0.06} wireframe />
        </mesh>
      )}
    </group>
  );
}

// ── Color Picker Row ──
function ColorRow({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1.5 flex-wrap">
        {colors.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-full border-2 transition-all ${value === c ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

function OptionRow({ label, options, value, onChange }: { label: string; options: string[]; value: number; onChange: (i: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o, i) => (
          <Button
            key={o}
            size="sm"
            variant={value === i ? "default" : "outline"}
            className="text-xs h-7 px-2"
            onClick={() => onChange(i)}
          >
            {o}
          </Button>
        ))}
      </div>
    </div>
  );
}

export const Avatar3DTab = () => {
  const [config, setConfig] = useState<AvatarConfig>(() => {
    const saved = localStorage.getItem("avatar3d_config");
    return saved ? JSON.parse(saved) : defaultConfig;
  });

  const update = (partial: Partial<AvatarConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem("avatar3d_config", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">🧍 אווטאר תלת־ממדי</h2>
        <p className="text-sm text-muted-foreground">עצב את הדמות שלך</p>
      </div>

      {/* 3D Canvas */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 h-[320px] bg-gradient-to-b from-muted/30 to-muted/10">
          <Canvas camera={{ position: [0, 0.2, 2.5], fov: 40 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 5, 2]} intensity={1} />
            <pointLight position={[-2, 3, 4]} intensity={0.5} color="#FFD700" />
            <Suspense fallback={null}>
              <AvatarModel config={config} />
              <Environment preset="studio" />
            </Suspense>
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 1.8}
            />
          </Canvas>
        </CardContent>
      </Card>

      {/* Customization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <p className="font-semibold text-sm">🧑 פנים</p>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-3">
            <ColorRow label="גוון עור" colors={SKIN_TONES} value={config.skinTone} onChange={v => update({ skinTone: v })} />
            <ColorRow label="צבע עיניים" colors={EYE_COLORS} value={config.eyeColor} onChange={v => update({ eyeColor: v })} />
            <OptionRow label="צורת פנים" options={FACE_SHAPES} value={config.faceShape} onChange={v => update({ faceShape: v })} />
            <OptionRow label="צורת עיניים" options={EYE_SHAPES} value={config.eyeShape} onChange={v => update({ eyeShape: v })} />
            <OptionRow label="סוג אף" options={NOSE_TYPES} value={config.noseType} onChange={v => update({ noseType: v })} />
            <OptionRow label="סוג פה" options={MOUTH_TYPES} value={config.mouthType} onChange={v => update({ mouthType: v })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <p className="font-semibold text-sm">👔 סגנון</p>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-3">
            <ColorRow label="צבע שיער" colors={HAIR_COLORS} value={config.hairColor} onChange={v => update({ hairColor: v })} />
            <OptionRow label="תסרוקת" options={HAIR_STYLES} value={config.hairStyle} onChange={v => update({ hairStyle: v })} />
            <ColorRow label="צבע חולצה" colors={SHIRT_COLORS} value={config.shirtColor} onChange={v => update({ shirtColor: v })} />
            <OptionRow label="אפקט" options={EFFECTS} value={config.effect} onChange={v => update({ effect: v })} />
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" className="w-full" onClick={() => { update(defaultConfig); }}>
        🔄 איפוס לברירת מחדל
      </Button>
    </div>
  );
};
